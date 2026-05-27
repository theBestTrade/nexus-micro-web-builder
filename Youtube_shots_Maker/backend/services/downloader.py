"""
services/downloader.py
무워터마크 영상 다운로더 (도우인 / 샤오홍수)

동작 방식:
  1. 검색 (search_videos):
     - Playwright + 저장된 계정 쿠키로 플랫폼 검색 페이지 접근
     - 네트워크 응답 인터셉트로 구조화된 검색 결과 추출
     - 결과를 videos 테이블에 저장 후 반환
  2. 다운로드 (download_video):
     - 플랫폼 API로 무워터마크 다운로드 URL 획득
     - httpx 스트림 다운로드 → 로컬 /tmp 임시 저장
     - Supabase Storage 업로드 후 /tmp 파일 삭제
     - videos.status, file_path 갱신
"""

from __future__ import annotations

import asyncio
import logging
import math
import os
import random
import re
import tempfile
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
from uuid import uuid4

import aiofiles
import httpx
from supabase import Client

from models.video import (
    SourcePlatformEnum,
    TrackEnum,
    VideoSearchItem,
    VideoStatusEnum,
)
from services.proxy_manager import ProxyManager

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────
# 상수
# ─────────────────────────────────────────────────────────────

DOUYIN_SEARCH_URL    = "https://www.douyin.com/search/{keyword}?type=video&source=normal_search"
DOUYIN_AWEME_API     = "https://www.iesdouyin.com/aweme/v1/web/aweme/detail/?aweme_id={aweme_id}&version_code=190500&version_name=19.5.0&aid=1128"

XHS_SEARCH_URL       = "https://www.xiaohongshu.com/search_result?keyword={keyword}&source=web_search_result_notes&type=51"
XHS_API_HOST         = "https://edith.xiaohongshu.com"

STORAGE_BUCKET       = "videos"
MIN_VIDEO_HEIGHT     = 720     # 최소 해상도 (px)
MAX_VIDEO_SIZE_BYTES = 500 * 1024 * 1024   # 500 MB

COMMON_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/120.0.0.0 Safari/537.36"
)


# ─────────────────────────────────────────────────────────────
# 유틸
# ─────────────────────────────────────────────────────────────

def _parse_count(text: str) -> int:
    """'1.2万', '3.4w', '5678' 등 → 정수 변환."""
    if not text:
        return 0
    text = text.strip().replace(",", "")
    m = re.search(r"([\d.]+)\s*([万wW千kK]?)", text)
    if not m:
        return 0
    num  = float(m.group(1))
    unit = m.group(2).lower()
    if unit in ("万", "w"):
        return int(num * 10_000)
    if unit in ("千", "k"):
        return int(num * 1_000)
    return int(num)


def _viral_score(likes: int, shares: int, comments: int = 0) -> int:
    """바이럴 스코어 계산 (0-100, 로그 스케일)."""
    weighted = likes * 1 + shares * 5 + comments * 2
    if weighted <= 0:
        return 0
    return min(100, int(math.log10(weighted + 1) * 22))


def _random_delay(lo: float = 1.5, hi: float = 4.0) -> float:
    return random.uniform(lo, hi)


# ─────────────────────────────────────────────────────────────
# VideoDownloader
# ─────────────────────────────────────────────────────────────

class VideoDownloader:
    """
    도우인·샤오홍수 영상 검색 및 무워터마크 다운로드.

    사용 예:
        downloader = VideoDownloader(db=get_db(), proxy_manager=ProxyManager(db))
        videos = await downloader.search_videos(user_id, keyword, "douyin", "A", 10)
        await downloader.download_video(video_id, user_id)
    """

    def __init__(self, db: Client, proxy_manager: ProxyManager):
        self.db            = db
        self.proxy_manager = proxy_manager

    # ─────────────────────────────────────────────────────────
    # 공개 API: 검색
    # ─────────────────────────────────────────────────────────

    async def search_videos(
        self,
        user_id:    str,
        keyword:    str,
        platform:   str,
        track:      str,
        limit:      int             = 10,
        account_id: Optional[str]   = None,
        proxy_id:   Optional[str]   = None,
    ) -> list[dict]:
        """
        플랫폼 검색 → 결과를 videos 테이블에 저장 후 행 목록 반환.
        account_id 미지정 시 platform의 기본 계정 쿠키 사용.
        """
        # 계정 쿠키 획득
        cookies, resolved_account_id = await self._resolve_cookies(user_id, platform, account_id)
        proxy_cfg = self.proxy_manager.get_playwright_proxy(user_id, proxy_id) if proxy_id else None

        # 플랫폼별 검색
        if platform == SourcePlatformEnum.DOUYIN.value:
            items = await self._search_douyin(keyword, limit, cookies, proxy_cfg)
        elif platform == SourcePlatformEnum.XIAOHONGSHU.value:
            items = await self._search_xiaohongshu(keyword, limit, cookies, proxy_cfg)
        else:
            raise ValueError(f"지원하지 않는 플랫폼: {platform}")

        # DB 저장
        saved = []
        for item in items[:limit]:
            row = await self._upsert_video(user_id, resolved_account_id, track, item)
            saved.append(row)

        return saved

    # ─────────────────────────────────────────────────────────
    # 공개 API: 다운로드 (Celery task 에서 호출)
    # ─────────────────────────────────────────────────────────

    async def download_video(
        self,
        video_id:   str,
        user_id:    str,
        account_id: Optional[str] = None,
        proxy_id:   Optional[str] = None,
        progress_cb=None,           # Optional[Callable[[int], None]] — 진행률 콜백
    ) -> dict:
        """
        무워터마크 영상 다운로드 → Supabase Storage 업로드.
        진행 상태는 videos.status + download_task_id 로 추적.
        """
        video_row = await self._get_video(video_id, user_id)
        platform  = video_row["platform"]
        proxy_cfg = self.proxy_manager.get_playwright_proxy(user_id, proxy_id) if proxy_id else None

        # 상태: downloading
        await self._update_status(video_id, VideoStatusEnum.DOWNLOADING.value)
        if progress_cb:
            progress_cb(10)

        try:
            # 계정 쿠키
            cookies, _ = await self._resolve_cookies(user_id, platform, account_id)

            # 무워터마크 URL 획득
            if platform == SourcePlatformEnum.DOUYIN.value:
                download_url, meta = await self._get_douyin_download_url(
                    video_row["original_url"], cookies, proxy_cfg
                )
            elif platform == SourcePlatformEnum.XIAOHONGSHU.value:
                download_url, meta = await self._get_xhs_download_url(
                    video_row["original_url"], cookies, proxy_cfg
                )
            else:
                raise ValueError(f"지원하지 않는 플랫폼: {platform}")

            if progress_cb:
                progress_cb(25)

            # 화질 검증
            h = meta.get("height", 0)
            if h and h < MIN_VIDEO_HEIGHT:
                raise ValueError(f"해상도 부족: {h}px (최소 {MIN_VIDEO_HEIGHT}px 필요)")

            # 영상 다운로드 → /tmp
            tmp_path = await self._stream_download(download_url, proxy_cfg, progress_cb)
            if progress_cb:
                progress_cb(75)

            # 용량 검증
            file_size = os.path.getsize(tmp_path)
            if file_size > MAX_VIDEO_SIZE_BYTES:
                os.unlink(tmp_path)
                raise ValueError(f"파일 크기 초과: {file_size / 1024 / 1024:.1f}MB (최대 500MB)")

            # Supabase Storage 업로드
            storage_path = f"{user_id}/{video_id}.mp4"
            await self._upload_to_storage(tmp_path, storage_path)
            os.unlink(tmp_path)   # /tmp 정리
            if progress_cb:
                progress_cb(95)

            # DB 갱신 (downloaded)
            update_data: dict = {
                "status":    VideoStatusEnum.DOWNLOADED.value,
                "file_path": storage_path,
                "error_msg": None,
            }
            if meta.get("height"):  update_data["height"]       = meta["height"]
            if meta.get("width"):   update_data["width"]         = meta["width"]
            if meta.get("duration"): update_data["duration_sec"] = meta["duration"]
            if meta.get("thumbnail_url"): update_data["thumbnail_url"] = meta["thumbnail_url"]

            self.db.table("videos").update(update_data).eq("id", video_id).execute()
            if progress_cb:
                progress_cb(100)

            return {"success": True, "file_path": storage_path}

        except Exception as e:
            logger.exception("다운로드 실패: video_id=%s", video_id)
            self.db.table("videos").update(
                {"status": "sourced", "error_msg": str(e)}
            ).eq("id", video_id).execute()
            raise

    # ─────────────────────────────────────────────────────────
    # 내부: 도우인 검색
    # ─────────────────────────────────────────────────────────

    async def _search_douyin(
        self,
        keyword:   str,
        limit:     int,
        cookies:   list[dict],
        proxy_cfg: Optional[dict],
    ) -> list[VideoSearchItem]:
        """
        Playwright + 네트워크 인터셉트로 도우인 검색 결과 추출.
        도우인은 검색 XHR 응답에 구조화된 JSON을 반환합니다.
        """
        from playwright.async_api import async_playwright

        results: list[dict] = []

        async with async_playwright() as p:
            browser = await self._launch(p, proxy_cfg)
            context = await browser.new_context(
                viewport={"width": 1920, "height": 1080},
                user_agent=COMMON_UA,
            )
            if cookies:
                await context.add_cookies(cookies)

            page = await context.new_page()

            # 네트워크 응답 인터셉트: 검색 API 결과 캡처
            async def on_response(response):
                url = response.url
                # 도우인 검색 API 경로
                if "/aweme/v1/web/search/item/" in url or "/search/item/" in url:
                    try:
                        data = await response.json()
                        items = data.get("data", [])
                        for it in items:
                            aweme = it.get("aweme_info") or it.get("aweme") or it
                            self._parse_douyin_aweme(aweme, results)
                    except Exception:
                        pass

            page.on("response", on_response)

            search_url = DOUYIN_SEARCH_URL.format(keyword=keyword)
            await page.goto(search_url, wait_until="domcontentloaded", timeout=30_000)
            await page.wait_for_timeout(int(_random_delay(2.0, 4.0) * 1000))

            # 스크롤로 추가 결과 로드
            scrolls = max(1, (limit // 10) + 1)
            for _ in range(scrolls):
                await page.keyboard.press("End")
                await page.wait_for_timeout(int(_random_delay(1.5, 3.0) * 1000))

            # DOM 폴백: 인터셉트 결과가 부족하면 DOM에서 직접 추출
            if len(results) < limit:
                dom_items = await self._extract_douyin_dom(page, limit - len(results))
                results.extend(dom_items)

            await browser.close()

        return [self._dict_to_search_item(r, SourcePlatformEnum.DOUYIN) for r in results[:limit]]

    @staticmethod
    def _parse_douyin_aweme(aweme: dict, out: list) -> None:
        """도우인 aweme 객체 → 검색 결과 dict 파싱."""
        try:
            video    = aweme.get("video", {})
            stats    = aweme.get("statistics", {})
            aweme_id = aweme.get("aweme_id", "")
            if not aweme_id:
                return

            play_url = (
                video.get("play_addr", {}).get("url_list", [None])[0]
                or video.get("download_addr", {}).get("url_list", [None])[0]
                or ""
            )
            original_url = f"https://www.douyin.com/video/{aweme_id}"

            out.append({
                "aweme_id":     aweme_id,
                "original_url": original_url,
                "title_cn":     aweme.get("desc", ""),
                "thumbnail_url": video.get("cover", {}).get("url_list", [None])[0],
                "likes":        stats.get("digg_count", 0),
                "shares":       stats.get("share_count", 0),
                "comments":     stats.get("comment_count", 0),
                "duration_sec": video.get("duration", 0) // 1000,
                "width":        video.get("width", 0),
                "height":       video.get("height", 0),
            })
        except Exception:
            pass

    @staticmethod
    async def _extract_douyin_dom(page, limit: int) -> list[dict]:
        """DOM 직접 파싱 폴백 (인터셉트 실패 시)."""
        try:
            return await page.evaluate(f"""
                () => {{
                    const cards = document.querySelectorAll(
                        '[data-e2e="search-video-card"], .video-card, .search-result-card'
                    );
                    const results = [];
                    const parseCount = t => {{
                        if (!t) return 0;
                        const m = t.match(/([\\d.]+)\\s*([万wW]?)/);
                        if (!m) return 0;
                        const n = parseFloat(m[1]);
                        return m[2] ? Math.round(n * 10000) : Math.round(n);
                    }};
                    for (const card of Array.from(cards).slice(0, {limit})) {{
                        const a    = card.querySelector('a[href*="/video/"]');
                        const href = a ? a.href : '';
                        const m    = href.match(/\\/video\\/(\\d+)/);
                        if (!m) continue;
                        const aweme_id = m[1];
                        const title    = (card.querySelector(
                            '[class*="title"], [class*="text"], .video-desc'
                        ) || {{}}).textContent || '';
                        const img      = (card.querySelector('img') || {{}}).src || '';
                        const likeEl   = card.querySelector('[class*="like"], [class*="digg"]');
                        results.push({{
                            aweme_id,
                            original_url: `https://www.douyin.com/video/${{aweme_id}}`,
                            title_cn:     title.trim(),
                            thumbnail_url: img,
                            likes:        parseCount(likeEl ? likeEl.textContent : '0'),
                            shares: 0, comments: 0,
                        }});
                    }}
                    return results;
                }}
            """)
        except Exception:
            return []

    # ─────────────────────────────────────────────────────────
    # 내부: 샤오홍수 검색
    # ─────────────────────────────────────────────────────────

    async def _search_xiaohongshu(
        self,
        keyword:   str,
        limit:     int,
        cookies:   list[dict],
        proxy_cfg: Optional[dict],
    ) -> list[VideoSearchItem]:
        """
        Playwright로 샤오홍수 검색 → 비디오 노트 추출.
        """
        from playwright.async_api import async_playwright

        results: list[dict] = []

        async with async_playwright() as p:
            browser = await self._launch(p, proxy_cfg)
            context = await browser.new_context(
                viewport={"width": 1920, "height": 1080},
                user_agent=COMMON_UA,
            )
            if cookies:
                await context.add_cookies(cookies)

            page = await context.new_page()

            # 검색 API 응답 인터셉트
            async def on_response(response):
                if "/api/sns/web/v1/search/notes" in response.url:
                    try:
                        data = await response.json()
                        items = data.get("data", {}).get("items", [])
                        for it in items:
                            note = it.get("note_card") or it
                                # 비디오 타입만 (type=video)
                            if note.get("type") not in ("video", 2):
                                continue
                            self._parse_xhs_note(note, results)
                    except Exception:
                        pass

            page.on("response", on_response)

            search_url = XHS_SEARCH_URL.format(keyword=keyword)
            await page.goto(search_url, wait_until="domcontentloaded", timeout=30_000)
            await page.wait_for_timeout(int(_random_delay(2.0, 4.0) * 1000))

            # 스크롤
            for _ in range(max(1, limit // 10)):
                await page.keyboard.press("End")
                await page.wait_for_timeout(int(_random_delay(1.5, 3.0) * 1000))

            await browser.close()

        return [self._dict_to_search_item(r, SourcePlatformEnum.XIAOHONGSHU) for r in results[:limit]]

    @staticmethod
    def _parse_xhs_note(note: dict, out: list) -> None:
        """샤오홍수 노트 객체 파싱."""
        try:
            note_id = note.get("id") or note.get("note_id", "")
            if not note_id:
                return
            interact = note.get("interact_info", {})
            cover    = note.get("cover") or {}
            out.append({
                "original_url": f"https://www.xiaohongshu.com/explore/{note_id}",
                "title_cn":     note.get("display_title") or note.get("title", ""),
                "thumbnail_url": cover.get("url", ""),
                "likes":        _parse_count(interact.get("liked_count", "0")),
                "shares":       _parse_count(interact.get("share_count", "0")),
                "comments":     _parse_count(interact.get("comment_count", "0")),
            })
        except Exception:
            pass

    # ─────────────────────────────────────────────────────────
    # 내부: 도우인 다운로드 URL 획득
    # ─────────────────────────────────────────────────────────

    async def _get_douyin_download_url(
        self,
        original_url: str,
        cookies:      list[dict],
        proxy_cfg:    Optional[dict],
    ) -> tuple[str, dict]:
        """
        도우인 영상 무워터마크 다운로드 URL 획득.
        1차: iesdouyin API → 2차: yt-dlp 폴백
        """
        aweme_id = self._extract_douyin_id(original_url)
        if not aweme_id:
            raise ValueError(f"aweme_id 추출 실패: {original_url}")

        cookie_str = "; ".join(f"{c['name']}={c['value']}" for c in (cookies or []))
        headers = {
            "User-Agent": COMMON_UA,
            "Referer":    "https://www.douyin.com/",
            "Cookie":     cookie_str,
        }
        api_url = DOUYIN_AWEME_API.format(aweme_id=aweme_id)

        proxy_url = proxy_cfg.get("server") if proxy_cfg else None
        proxies   = {"all://": proxy_url} if proxy_url else None

        try:
            async with httpx.AsyncClient(headers=headers, proxies=proxies, timeout=30, follow_redirects=True) as client:
                resp = await client.get(api_url)
                resp.raise_for_status()
                data  = resp.json()
                aweme = data.get("aweme_detail", {})
                video = aweme.get("video", {})

                # 무워터마크 URL: download_addr 우선
                dl_list   = video.get("download_addr", {}).get("url_list", [])
                play_list = video.get("play_addr", {}).get("url_list", [])
                url = dl_list[0] if dl_list else (play_list[0] if play_list else None)

                if url:
                    stats = aweme.get("statistics", {})
                    meta  = {
                        "height":        video.get("height", 0),
                        "width":         video.get("width", 0),
                        "duration":      video.get("duration", 0) // 1000,
                        "thumbnail_url": video.get("cover", {}).get("url_list", [None])[0],
                    }
                    return url, meta
        except Exception as e:
            logger.warning("iesdouyin API 실패, yt-dlp 폴백 시도: %s", e)

        # 폴백: yt-dlp
        return await self._ytdlp_get_url(original_url, proxy_url)

    async def _get_xhs_download_url(
        self,
        original_url: str,
        cookies:      list[dict],
        proxy_cfg:    Optional[dict],
    ) -> tuple[str, dict]:
        """
        샤오홍수 영상 무워터마크 다운로드 URL 획득.
        Playwright로 영상 페이지 열고 video src 추출.
        """
        from playwright.async_api import async_playwright

        video_url: list[str] = []

        async with async_playwright() as p:
            browser = await self._launch(p, proxy_cfg)
            context = await browser.new_context(
                viewport={"width": 1920, "height": 1080},
                user_agent=COMMON_UA,
            )
            if cookies:
                await context.add_cookies(cookies)
            page = await context.new_page()

            # 비디오 URL을 네트워크에서 캡처
            async def capture(response):
                url = response.url
                if re.search(r"\.(mp4|m3u8|flv|ts)", url, re.I):
                    if url not in video_url:
                        video_url.append(url)

            page.on("response", capture)
            await page.goto(original_url, wait_until="networkidle", timeout=30_000)
            await page.wait_for_timeout(3000)
            await browser.close()

        if not video_url:
            # yt-dlp 폴백
            proxy_url = proxy_cfg.get("server") if proxy_cfg else None
            return await self._ytdlp_get_url(original_url, proxy_url)

        # mp4 URL 우선 선택
        mp4_urls = [u for u in video_url if ".mp4" in u.lower()]
        chosen   = mp4_urls[0] if mp4_urls else video_url[0]
        return chosen, {}

    # ─────────────────────────────────────────────────────────
    # 내부: yt-dlp 폴백
    # ─────────────────────────────────────────────────────────

    @staticmethod
    async def _ytdlp_get_url(video_url: str, proxy_url: Optional[str] = None) -> tuple[str, dict]:
        """yt-dlp로 다운로드 URL 추출 (info_dict만 가져옴)."""
        import yt_dlp

        ydl_opts: dict = {
            "quiet":           True,
            "skip_download":   True,
            "format":          "bestvideo[height>=720]+bestaudio/best",
            "no_warnings":     True,
        }
        if proxy_url:
            ydl_opts["proxy"] = proxy_url

        def _extract():
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(video_url, download=False)
                return info

        loop = asyncio.get_event_loop()
        info = await loop.run_in_executor(None, _extract)

        url = info.get("url") or (info.get("formats", [{}])[-1].get("url", ""))
        meta = {
            "height":    info.get("height", 0),
            "width":     info.get("width", 0),
            "duration":  info.get("duration", 0),
            "thumbnail_url": info.get("thumbnail"),
        }
        if not url:
            raise ValueError("yt-dlp: 다운로드 URL을 찾을 수 없습니다.")
        return url, meta

    # ─────────────────────────────────────────────────────────
    # 내부: 스트림 다운로드
    # ─────────────────────────────────────────────────────────

    @staticmethod
    async def _stream_download(
        url:       str,
        proxy_cfg: Optional[dict],
        progress_cb=None,
    ) -> str:
        """URL에서 /tmp로 스트림 다운로드. 임시 파일 경로 반환."""
        proxy_url = proxy_cfg.get("server") if proxy_cfg else None
        proxies   = {"all://": proxy_url} if proxy_url else None

        headers = {
            "User-Agent": COMMON_UA,
            "Referer":    "https://www.douyin.com/",
        }

        tmp_dir  = tempfile.gettempdir()
        tmp_path = os.path.join(tmp_dir, f"nomad_{uuid4().hex}.mp4")

        async with httpx.AsyncClient(
            headers=headers,
            proxies=proxies,
            timeout=120,
            follow_redirects=True,
        ) as client:
            async with client.stream("GET", url) as resp:
                resp.raise_for_status()
                total = int(resp.headers.get("content-length", 0))
                downloaded = 0

                async with aiofiles.open(tmp_path, "wb") as f:
                    async for chunk in resp.aiter_bytes(chunk_size=1024 * 512):  # 512KB chunks
                        await f.write(chunk)
                        downloaded += len(chunk)
                        if progress_cb and total:
                            pct = 25 + int(50 * downloaded / total)
                            progress_cb(min(74, pct))

        return tmp_path

    # ─────────────────────────────────────────────────────────
    # 내부: Supabase Storage 업로드
    # ─────────────────────────────────────────────────────────

    async def _upload_to_storage(self, local_path: str, storage_path: str) -> None:
        """로컬 파일을 Supabase Storage에 업로드."""
        async with aiofiles.open(local_path, "rb") as f:
            file_bytes = await f.read()

        loop = asyncio.get_event_loop()
        await loop.run_in_executor(
            None,
            lambda: self.db.storage.from_(STORAGE_BUCKET).upload(
                path=storage_path,
                file=file_bytes,
                file_options={"content-type": "video/mp4", "upsert": "true"},
            ),
        )

    # ─────────────────────────────────────────────────────────
    # 내부: DB 헬퍼
    # ─────────────────────────────────────────────────────────

    async def _upsert_video(
        self,
        user_id:    str,
        account_id: Optional[str],
        track:      str,
        item:       VideoSearchItem,
    ) -> dict:
        """검색 결과를 videos 테이블에 저장 (중복 URL 이면 업데이트)."""
        row: dict = {
            "user_id":             user_id,
            "sourcing_account_id": account_id,
            "platform":            item.platform.value,
            "track":               track,
            "original_url":        item.original_url,
            "thumbnail_url":       item.thumbnail_url,
            "title_cn":            item.title_cn,
            "viral_score":         item.viral_score,
            "likes":               item.likes,
            "shares":              item.shares,
            "comments":            item.comments,
            "duration_sec":        item.duration_sec,
            "status":              VideoStatusEnum.SOURCED.value,
        }
        result = (
            self.db.table("videos")
            .upsert(row, on_conflict="user_id,original_url")
            .execute()
        )
        return result.data[0]

    async def _get_video(self, video_id: str, user_id: str) -> dict:
        result = (
            self.db.table("videos")
            .select("*")
            .eq("id", video_id)
            .eq("user_id", user_id)
            .single()
            .execute()
        )
        if not result.data:
            raise ValueError(f"영상을 찾을 수 없습니다: {video_id}")
        return result.data

    async def _update_status(self, video_id: str, status: str, error: Optional[str] = None) -> None:
        update: dict = {"status": status}
        if error:
            update["error_msg"] = error
        self.db.table("videos").update(update).eq("id", video_id).execute()

    # ─────────────────────────────────────────────────────────
    # 내부: 쿠키 해결
    # ─────────────────────────────────────────────────────────

    async def _resolve_cookies(
        self,
        user_id:    str,
        platform:   str,
        account_id: Optional[str],
    ) -> tuple[list[dict], Optional[str]]:
        """
        account_id 로 쿠키 조회.
        미지정이면 해당 platform의 기본 계정 쿠키.
        쿠키 없어도 동작 가능 (일부 공개 콘텐츠).
        """
        resolved_id = account_id
        if not resolved_id:
            result = (
                self.db.table("accounts")
                .select("id")
                .eq("user_id", user_id)
                .eq("platform", platform)
                .eq("is_default", True)
                .limit(1)
                .execute()
            )
            if result.data:
                resolved_id = result.data[0]["id"]

        if not resolved_id:
            return [], None

        cookie_result = (
            self.db.table("platform_cookies")
            .select("cookies")
            .eq("account_id", resolved_id)
            .limit(1)
            .execute()
        )
        cookies = cookie_result.data[0]["cookies"] if cookie_result.data else []
        return cookies, resolved_id

    # ─────────────────────────────────────────────────────────
    # 내부: 유틸
    # ─────────────────────────────────────────────────────────

    @staticmethod
    def _extract_douyin_id(url: str) -> Optional[str]:
        """도우인 영상 URL에서 aweme_id 추출."""
        m = re.search(r"/video/(\d+)", url)
        return m.group(1) if m else None

    @staticmethod
    async def _launch(p, proxy_cfg: Optional[dict]):
        kwargs: dict = {
            "headless": True,
            "args": ["--no-sandbox", "--disable-dev-shm-usage", "--disable-blink-features=AutomationControlled"],
        }
        if proxy_cfg:
            kwargs["proxy"] = proxy_cfg
        return await p.chromium.launch(**kwargs)

    @staticmethod
    def _dict_to_search_item(d: dict, platform: SourcePlatformEnum) -> VideoSearchItem:
        likes    = d.get("likes", 0)
        shares   = d.get("shares", 0)
        comments = d.get("comments", 0)
        return VideoSearchItem(
            platform      = platform,
            original_url  = d.get("original_url", ""),
            title_cn      = d.get("title_cn") or d.get("title", ""),
            thumbnail_url = d.get("thumbnail_url"),
            likes         = likes,
            shares        = shares,
            comments      = comments,
            duration_sec  = d.get("duration_sec"),
            viral_score   = _viral_score(likes, shares, comments),
        )
