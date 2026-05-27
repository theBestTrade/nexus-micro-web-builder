"""
services/channel_publisher.py
멀티채널 영상 배포 서비스

지원 플랫폼:
  - YouTube   → YouTube Data API v3 (Resumable Upload)
  - Instagram → Instagram Graph API (Reels Container → Publish 2단계)
  - TikTok    → TikTok Content API v2 (File Upload → Status polling)
  - Naver Blog → naver_blog.py 위임 (Playwright 스마트에디터)

배포 흐름:
  1. publish_jobs + accounts 조회
  2. Supabase Storage 에서 final_video_path 다운로드 → /tmp
  3. 플랫폼별 API 업로드
  4. publish_jobs.status = 'published', platform_video_id 저장
  5. 실패 시 publish_jobs.status = 'failed', error_msg 저장
  6. /tmp 임시 파일 정리

사용 예:
    publisher = ChannelPublisher(db=get_db())
    result    = await publisher.publish(job_id="...", user_id="...")
"""

from __future__ import annotations

import asyncio
import logging
import math
import os
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
from uuid import uuid4

import httpx
from supabase import Client

from core.config import get_settings
from services.account_manager import AccountManager

logger = logging.getLogger(__name__)

# ── Supabase Storage 버킷 ──────────────────────────────────────
FINALS_BUCKET = "finals"

# ── YouTube ───────────────────────────────────────────────────
YT_UPLOAD_BASE    = "https://www.googleapis.com/upload/youtube/v3/videos"
YT_VIDEOS_BASE    = "https://www.googleapis.com/youtube/v3/videos"
YT_CHUNK_SIZE     = 8 * 1024 * 1024   # 8 MB (YouTube 권장 최솟값)
YT_CATEGORY_ENTERTAINMENT = "24"      # 엔터테인먼트

# ── Instagram ─────────────────────────────────────────────────
IG_GRAPH_BASE     = "https://graph.instagram.com/v21.0"
IG_POLL_INTERVAL  = 5        # 초
IG_POLL_MAX_TRIES = 30       # 최대 2분 30초 대기

# ── TikTok ────────────────────────────────────────────────────
TIKTOK_INIT_URL   = "https://open.tiktokapis.com/v2/post/publish/video/init/"
TIKTOK_STATUS_URL = "https://open.tiktokapis.com/v2/post/publish/status/fetch/"
TIKTOK_CHUNK_SIZE = 10 * 1024 * 1024  # 10 MB
TIKTOK_POLL_MAX   = 30

# ── 공통 HTTP 타임아웃 ────────────────────────────────────────
HTTP_TIMEOUT = httpx.Timeout(connect=10, read=60, write=120, pool=10)


# ─────────────────────────────────────────────────────────────
# ChannelPublisher
# ─────────────────────────────────────────────────────────────

class ChannelPublisher:
    """
    publish_jobs 레코드 한 건을 받아 해당 플랫폼으로 영상을 배포합니다.

    지원:
      youtube / instagram / tiktok / naver_blog
    """

    def __init__(self, db: Client):
        self.db      = db
        self.manager = AccountManager(db)
        self._settings = get_settings()

    # ─────────────────────────────────────────────────────────
    # 공개 API — publish()
    # ─────────────────────────────────────────────────────────

    async def publish(self, job_id: str, user_id: str) -> dict:
        """
        publish_jobs 레코드를 읽어 플랫폼별 업로드를 실행합니다.

        반환:
          { "job_id", "platform", "platform_video_id", "published_at" }
        """
        # ── 1) job 조회 ───────────────────────────────────────
        job = self._get_job(job_id, user_id)
        account_id = job.get("publish_account_id")
        if not account_id:
            raise ValueError("배포 계정이 지정되지 않았습니다.")

        # ── 2) 계정 조회 (내부 원본 — access_token 포함) ──────
        account_raw = self.manager._get_account_raw(account_id, user_id)
        platform    = account_raw["platform"]

        # ── 3) GEO 메타데이터 조합 ───────────────────────────
        meta = await self._build_meta(job, platform)

        # ── 4) 상태 → 'uploading' ────────────────────────────
        self._update_job(job_id, {"status": "uploading"})

        tmp_path: Optional[str] = None
        try:
            # ── 5) 영상 파일 다운로드 (naver_blog 제외) ───────
            final_video_path = job.get("final_video_path") or self._get_final_video_path(job)

            if platform != "naver_blog":
                tmp_path = await self._download_video(final_video_path)

            # ── 6) 플랫폼별 업로드 ───────────────────────────
            if platform == "youtube":
                platform_video_id = await self._publish_youtube(
                    account_raw, tmp_path, meta
                )
            elif platform == "instagram":
                video_url = self._get_public_url(final_video_path)
                platform_video_id = await self._publish_instagram(
                    account_raw, video_url, meta
                )
            elif platform == "tiktok":
                platform_video_id = await self._publish_tiktok(
                    account_raw, tmp_path, meta
                )
            elif platform == "naver_blog":
                platform_video_id = await self._publish_naver_blog(
                    account_raw, job, meta, user_id
                )
            else:
                raise ValueError(f"지원하지 않는 배포 플랫폼: {platform}")

            # ── 7) 성공 업데이트 ─────────────────────────────
            published_at = datetime.now(timezone.utc).isoformat()
            self._update_job(job_id, {
                "status":            "published",
                "platform_video_id": platform_video_id,
                "published_at":      published_at,
                "error_msg":         None,
            })
            self._update_account_used(account_id)

            logger.info(
                "[publish] 완료: job_id=%s platform=%s vid=%s",
                job_id, platform, platform_video_id,
            )
            return {
                "job_id":            job_id,
                "platform":          platform,
                "platform_video_id": platform_video_id,
                "published_at":      published_at,
            }

        except Exception as exc:
            err = str(exc)[:500]
            logger.exception("[publish] 실패: job_id=%s", job_id)
            self._update_job(job_id, {"status": "failed", "error_msg": err})
            raise

        finally:
            if tmp_path and os.path.exists(tmp_path):
                try:
                    os.unlink(tmp_path)
                except Exception:
                    pass

    # ─────────────────────────────────────────────────────────
    # YouTube Data API v3 — Resumable Upload
    # ─────────────────────────────────────────────────────────

    async def _publish_youtube(
        self,
        account: dict,
        video_path: str,
        meta: dict,
    ) -> str:
        """
        YouTube Resumable Upload 절차:
          1. 업로드 세션 초기화 → Location 헤더에서 upload_url 추출
          2. 파일을 8 MB 청크로 분할하여 PUT 전송
          3. 완료 응답에서 video_id 파싱

        Ref: https://developers.google.com/youtube/v3/guides/uploading_a_video
        """
        access_token = account.get("access_token", "")
        if not access_token:
            raise RuntimeError("YouTube access_token 이 없습니다.")

        file_size    = os.path.getsize(video_path)
        title        = meta.get("title", "NOMAD Short")[:100]
        description  = meta.get("description", "")[:5000]
        tags         = meta.get("tags", [])[:500]
        privacy      = "public"

        init_body = {
            "snippet": {
                "title":       title,
                "description": description,
                "tags":        tags,
                "categoryId":  YT_CATEGORY_ENTERTAINMENT,
            },
            "status": {
                "privacyStatus": privacy,
                "selfDeclaredMadeForKids": False,
            },
        }

        # ── 1) 업로드 세션 초기화 ─────────────────────────────
        init_url = f"{YT_UPLOAD_BASE}?uploadType=resumable&part=snippet,status"
        init_headers = {
            "Authorization":           f"Bearer {access_token}",
            "Content-Type":            "application/json; charset=UTF-8",
            "X-Upload-Content-Type":   "video/mp4",
            "X-Upload-Content-Length": str(file_size),
        }

        async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
            resp = await client.post(init_url, json=init_body, headers=init_headers)
            if resp.status_code not in (200, 201):
                raise RuntimeError(
                    f"YouTube 업로드 세션 초기화 실패: {resp.status_code} {resp.text[:300]}"
                )
            upload_url = resp.headers.get("Location")
            if not upload_url:
                raise RuntimeError("YouTube 업로드 URL(Location 헤더)을 받지 못했습니다.")

        # ── 2) 청크 업로드 ────────────────────────────────────
        video_id = await self._youtube_chunked_upload(
            upload_url, video_path, file_size, access_token
        )
        logger.info("[youtube] 업로드 완료: video_id=%s", video_id)
        return video_id

    async def _youtube_chunked_upload(
        self,
        upload_url: str,
        video_path: str,
        file_size:  int,
        access_token: str,
    ) -> str:
        """8 MB 청크로 파일을 분할해 YouTube Resumable Upload URI로 전송."""
        offset          = 0
        total_chunks    = math.ceil(file_size / YT_CHUNK_SIZE)
        video_id        = None

        with open(video_path, "rb") as f:
            chunk_idx = 0
            while offset < file_size:
                chunk_data  = f.read(YT_CHUNK_SIZE)
                chunk_end   = offset + len(chunk_data) - 1
                content_range = f"bytes {offset}-{chunk_end}/{file_size}"

                headers = {
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type":  "video/mp4",
                    "Content-Range": content_range,
                }

                # 마지막 청크에서 308 → 다음 청크, 200/201 → 완료
                async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
                    resp = await client.put(upload_url, content=chunk_data, headers=headers)

                logger.debug(
                    "[youtube] 청크 %d/%d 전송: status=%d",
                    chunk_idx + 1, total_chunks, resp.status_code,
                )

                if resp.status_code in (200, 201):
                    data     = resp.json()
                    video_id = data.get("id")
                    break
                elif resp.status_code == 308:
                    # Range 헤더에서 다음 오프셋 계산
                    range_hdr = resp.headers.get("Range", "")
                    if range_hdr:
                        offset = int(range_hdr.split("-")[-1]) + 1
                    else:
                        offset += len(chunk_data)
                else:
                    raise RuntimeError(
                        f"YouTube 청크 업로드 실패: status={resp.status_code} "
                        f"body={resp.text[:300]}"
                    )
                chunk_idx += 1

        if not video_id:
            raise RuntimeError("YouTube 업로드 완료 후 video_id를 받지 못했습니다.")
        return video_id

    # ─────────────────────────────────────────────────────────
    # Instagram Graph API — Reels 2단계 업로드
    # ─────────────────────────────────────────────────────────

    async def _publish_instagram(
        self,
        account: dict,
        video_url: str,
        meta: dict,
    ) -> str:
        """
        Instagram Reels 업로드 (2단계):
          1. POST /media  → creation_id
          2. 상태 폴링   → STATUS_CODE = FINISHED
          3. POST /media_publish → media_id

        Ref: https://developers.facebook.com/docs/instagram-api/guides/reels-posting
        """
        access_token  = account.get("access_token", "")
        ig_user_id    = account.get("platform_account_id", "")

        if not access_token:
            raise RuntimeError("Instagram access_token 이 없습니다.")
        if not ig_user_id:
            raise RuntimeError("Instagram user_id(platform_account_id)가 없습니다.")

        caption = meta.get("ig_caption") or meta.get("description") or meta.get("title", "")
        caption = caption[:2200]   # Instagram 캡션 최대 2200자

        # ── Step 1: Container 생성 ────────────────────────────
        container_url = f"{IG_GRAPH_BASE}/{ig_user_id}/media"
        container_body = {
            "media_type":    "REELS",
            "video_url":     video_url,
            "caption":       caption,
            "share_to_feed": True,
            "access_token":  access_token,
        }

        async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
            resp = await client.post(container_url, data=container_body)
            if resp.status_code != 200:
                raise RuntimeError(
                    f"Instagram 컨테이너 생성 실패: {resp.status_code} {resp.text[:300]}"
                )
            creation_id = resp.json().get("id")
            if not creation_id:
                raise RuntimeError("Instagram creation_id를 받지 못했습니다.")

        logger.info("[instagram] 컨테이너 생성: creation_id=%s", creation_id)

        # ── Step 2: 처리 완료 폴링 ────────────────────────────
        status_url = f"{IG_GRAPH_BASE}/{creation_id}"
        for attempt in range(IG_POLL_MAX_TRIES):
            await asyncio.sleep(IG_POLL_INTERVAL)
            async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
                resp = await client.get(
                    status_url,
                    params={
                        "fields":       "status_code,status",
                        "access_token": access_token,
                    },
                )
                if resp.status_code != 200:
                    logger.warning("[instagram] 폴링 실패 (무시): %s", resp.text[:100])
                    continue

                data        = resp.json()
                status_code = data.get("status_code", "")
                logger.debug("[instagram] 폴링 %d/%d: status_code=%s", attempt + 1, IG_POLL_MAX_TRIES, status_code)

                if status_code == "FINISHED":
                    break
                if status_code == "ERROR":
                    raise RuntimeError(
                        f"Instagram 영상 처리 오류: {data.get('status', '')}"
                    )
        else:
            raise TimeoutError("Instagram 영상 처리 타임아웃 (2분 30초 초과).")

        # ── Step 3: 게시 ─────────────────────────────────────
        publish_url  = f"{IG_GRAPH_BASE}/{ig_user_id}/media_publish"
        async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
            resp = await client.post(
                publish_url,
                data={"creation_id": creation_id, "access_token": access_token},
            )
            if resp.status_code != 200:
                raise RuntimeError(
                    f"Instagram 게시 실패: {resp.status_code} {resp.text[:300]}"
                )
            media_id = resp.json().get("id")

        logger.info("[instagram] 게시 완료: media_id=%s", media_id)
        return media_id

    # ─────────────────────────────────────────────────────────
    # TikTok Content API v2 — File Upload
    # ─────────────────────────────────────────────────────────

    async def _publish_tiktok(
        self,
        account: dict,
        video_path: str,
        meta: dict,
    ) -> str:
        """
        TikTok Content API v2 업로드 절차:
          1. POST /post/publish/video/init/  → upload_url, publish_id
          2. PUT  upload_url (청크 전송)
          3. GET  /post/publish/status/fetch/ 폴링 → PUBLISH_COMPLETE

        Ref: https://developers.tiktok.com/doc/content-posting-api-get-started
        """
        access_token = account.get("access_token", "")
        if not access_token:
            raise RuntimeError("TikTok access_token 이 없습니다.")

        file_size      = os.path.getsize(video_path)
        chunk_count    = math.ceil(file_size / TIKTOK_CHUNK_SIZE)
        title          = meta.get("title", "NOMAD Short")[:150]

        # ── Step 1: 업로드 초기화 ─────────────────────────────
        init_headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type":  "application/json; charset=UTF-8",
        }
        init_body = {
            "post_info": {
                "title":          title,
                "privacy_level":  "PUBLIC_TO_EVERYONE",
                "disable_duet":   False,
                "disable_comment": False,
                "disable_stitch": False,
                "video_cover_timestamp_ms": 1000,
            },
            "source_info": {
                "source":            "FILE_UPLOAD",
                "video_size":        file_size,
                "chunk_size":        TIKTOK_CHUNK_SIZE,
                "total_chunk_count": chunk_count,
            },
        }

        async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
            resp = await client.post(TIKTOK_INIT_URL, json=init_body, headers=init_headers)
            if resp.status_code != 200:
                raise RuntimeError(
                    f"TikTok 업로드 초기화 실패: {resp.status_code} {resp.text[:300]}"
                )
            resp_data  = resp.json().get("data", {})
            upload_url = resp_data.get("upload_url")
            publish_id = resp_data.get("publish_id")

        if not upload_url or not publish_id:
            raise RuntimeError("TikTok upload_url 또는 publish_id를 받지 못했습니다.")

        logger.info("[tiktok] 업로드 초기화: publish_id=%s chunks=%d", publish_id, chunk_count)

        # ── Step 2: 청크 업로드 ───────────────────────────────
        await self._tiktok_chunked_upload(upload_url, video_path, file_size, chunk_count)

        # ── Step 3: 처리 완료 폴링 ────────────────────────────
        status_headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type":  "application/json; charset=UTF-8",
        }
        for attempt in range(TIKTOK_POLL_MAX):
            await asyncio.sleep(5)
            async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
                resp = await client.post(
                    TIKTOK_STATUS_URL,
                    json={"publish_id": publish_id},
                    headers=status_headers,
                )
            if resp.status_code != 200:
                logger.warning("[tiktok] 상태 폴링 실패 (재시도): %s", resp.text[:100])
                continue

            status_data = resp.json().get("data", {})
            status      = status_data.get("status", "")
            logger.debug("[tiktok] 폴링 %d/%d: status=%s", attempt + 1, TIKTOK_POLL_MAX, status)

            if status == "PUBLISH_COMPLETE":
                tiktok_video_id = status_data.get("publicaly_available_post_id", [None])[0] or publish_id
                logger.info("[tiktok] 게시 완료: video_id=%s", tiktok_video_id)
                return str(tiktok_video_id)

            if status in ("FAILED", "CANCELLED"):
                fail_reason = status_data.get("fail_reason", "알 수 없음")
                raise RuntimeError(f"TikTok 영상 처리 실패: {fail_reason}")

        raise TimeoutError("TikTok 영상 처리 타임아웃 (2분 30초 초과).")

    async def _tiktok_chunked_upload(
        self,
        upload_url:  str,
        video_path:  str,
        file_size:   int,
        chunk_count: int,
    ) -> None:
        """TikTok upload_url로 10 MB 청크 PUT 전송."""
        chunk_idx = 0
        offset    = 0

        with open(video_path, "rb") as f:
            while True:
                chunk_data = f.read(TIKTOK_CHUNK_SIZE)
                if not chunk_data:
                    break

                chunk_end     = offset + len(chunk_data) - 1
                content_range = f"bytes {offset}-{chunk_end}/{file_size}"
                headers = {
                    "Content-Type":    "video/mp4",
                    "Content-Range":   content_range,
                    "Content-Length":  str(len(chunk_data)),
                }

                async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
                    resp = await client.put(upload_url, content=chunk_data, headers=headers)

                if resp.status_code not in (200, 201, 206):
                    raise RuntimeError(
                        f"TikTok 청크 {chunk_idx + 1}/{chunk_count} 업로드 실패: "
                        f"status={resp.status_code} body={resp.text[:200]}"
                    )

                logger.debug(
                    "[tiktok] 청크 %d/%d 전송: status=%d",
                    chunk_idx + 1, chunk_count, resp.status_code,
                )
                offset    += len(chunk_data)
                chunk_idx += 1

    # ─────────────────────────────────────────────────────────
    # Naver Blog — naver_blog.py 위임
    # ─────────────────────────────────────────────────────────

    async def _publish_naver_blog(
        self,
        account: dict,
        job:     dict,
        meta:    dict,
        user_id: str,
    ) -> str:
        """
        네이버 블로그는 blog_posts 레코드를 통해 naver_blog.py 서비스를 호출합니다.

        영상 단독 배포 시 썸네일 + GEO 메타 요약을 포스트 본문으로 자동 생성합니다.
        이미 blog_post_id 가 job에 연결된 경우 해당 포스트를 그대로 사용합니다.
        """
        from services.naver_blog import NaverBlogPublisher

        blog_post_id = job.get("blog_post_id")
        account_id   = account["id"]

        # blog_post_id 가 없는 경우: 영상 GEO 메타로 임시 포스트 생성
        if not blog_post_id:
            title       = meta.get("title", "NOMAD Short 리뷰")[:100]
            description = meta.get("description", "")
            tags        = meta.get("tags", [])[:10]
            body_html   = (
                f"<h2>{title}</h2>"
                f"<p>{description}</p>"
                + (f"<p>태그: {', '.join(tags)}</p>" if tags else "")
            )
            commerce_link = job.get("commerce_link")
            if commerce_link:
                body_html += f'<p><a href="{commerce_link}">👉 구매 링크</a></p>'

            # blog_posts 레코드 임시 생성
            res = self.db.table("blog_posts").insert({
                "user_id":          user_id,
                "video_id":         job.get("video_id"),
                "script_id":        job.get("script_id"),
                "publish_account_id": account_id,
                "title_ko":         title,
                "body_html":        body_html,
                "tags":             tags,
                "status":           "ready",
            }).execute()
            if not res.data:
                raise RuntimeError("임시 blog_posts 레코드 생성에 실패했습니다.")
            blog_post_id = res.data[0]["id"]

        # NaverBlogPublisher 호출
        publisher = NaverBlogPublisher(db=self.db)
        result    = await publisher.publish(
            blog_post_id = blog_post_id,
            account_id   = account_id,
            user_id      = user_id,
        )

        naver_post_url = result.get("naver_post_url", "")
        logger.info("[naver_blog] 게시 완료: url=%s", naver_post_url)
        return naver_post_url or blog_post_id

    # ─────────────────────────────────────────────────────────
    # 내부 헬퍼
    # ─────────────────────────────────────────────────────────

    def _get_job(self, job_id: str, user_id: str) -> dict:
        """publish_jobs 단일 조회 (script join 포함)."""
        res = (
            self.db.table("publish_jobs")
            .select(
                "*, "
                "scripts!script_id(final_video_path, adapted_script, geo_metadata)"
            )
            .eq("id", job_id)
            .eq("user_id", user_id)
            .single()
            .execute()
        )
        if not res.data:
            raise ValueError(f"publish_jobs를 찾을 수 없습니다: {job_id}")
        row    = dict(res.data)
        script = row.pop("scripts", None) or {}
        # 스크립트 필드를 job 레벨로 병합
        row["final_video_path"] = script.get("final_video_path")
        row["adapted_script"]   = script.get("adapted_script")
        row["geo_metadata"]     = row.get("geo_metadata") or script.get("geo_metadata") or {}
        return row

    def _get_final_video_path(self, job: dict) -> str:
        """job에서 final_video_path를 추출. 없으면 예외."""
        path = job.get("final_video_path")
        if not path:
            raise ValueError(
                "렌더링된 영상 경로(final_video_path)가 없습니다. "
                "먼저 Adaptation Studio에서 렌더링을 완료하세요."
            )
        return path

    async def _download_video(self, storage_path: str) -> str:
        """Supabase Storage finals 버킷에서 영상 다운로드 → /tmp 임시 파일 반환."""
        ext      = Path(storage_path).suffix or ".mp4"
        tmp_path = os.path.join(tempfile.gettempdir(), f"pub_{uuid4().hex}{ext}")
        loop     = asyncio.get_event_loop()

        def _dl():
            data = self.db.storage.from_(FINALS_BUCKET).download(storage_path)
            with open(tmp_path, "wb") as f:
                f.write(data)

        await loop.run_in_executor(None, _dl)
        logger.debug("[publish] 영상 다운로드 완료: %s → %s", storage_path, tmp_path)
        return tmp_path

    def _get_public_url(self, storage_path: str) -> str:
        """
        Supabase Storage 공개 URL 반환.
        Instagram 같이 원격 URL이 필요한 플랫폼에 사용.
        버킷이 공개(public)여야 합니다.
        """
        res = self.db.storage.from_(FINALS_BUCKET).get_public_url(storage_path)
        if isinstance(res, str):
            return res
        # supabase-py v2: PublicUrlResponse 객체
        if hasattr(res, "public_url"):
            return res.public_url
        raise RuntimeError(f"공개 URL 생성 실패: {res}")

    async def _build_meta(self, job: dict, platform: str) -> dict:
        """
        GEO 메타데이터를 플랫폼에 맞게 조합합니다.

        우선순위:
          1. publish_jobs.geo_metadata (수동 수정된 메타)
          2. scripts.geo_metadata (자동 생성)
          3. 기본값 (title = NOMAD Short)
        """
        geo   = job.get("geo_metadata") or {}
        title = geo.get("title") or "NOMAD Short"
        desc  = geo.get("description") or geo.get("context_summary") or ""
        tags  = geo.get("tags") or []

        # FAQ를 설명에 추가 (YouTube/블로그 SEO 최적화)
        faq_items = geo.get("faq_schema") or []
        if faq_items and platform in ("youtube", "naver_blog"):
            faq_block = "\n\n[FAQ]\n" + "\n".join(
                f"Q: {f.get('question', '')}\nA: {f.get('answer', '')}"
                for f in faq_items[:3]
            )
            desc = desc + faq_block

        # 커머스 링크 설명에 추가
        commerce_link = job.get("commerce_link")
        if commerce_link:
            desc = desc + f"\n\n👉 구매 링크: {commerce_link}"

        return {
            "title":       title,
            "description": desc,
            "tags":        tags,
            "ig_caption":  f"{title}\n\n{desc}"[:2200],
        }

    def _update_job(self, job_id: str, data: dict) -> None:
        """publish_jobs 상태 업데이트."""
        self.db.table("publish_jobs").update(data).eq("id", job_id).execute()

    def _update_account_used(self, account_id: str) -> None:
        """last_used_at 갱신."""
        self.db.table("accounts").update({
            "last_used_at":  datetime.now(timezone.utc).isoformat(),
            "health_status": "healthy",
        }).eq("id", account_id).execute()
