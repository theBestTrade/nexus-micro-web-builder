"""
tasks/pipeline.py
영상 다운로드 Celery 파이프라인

태스크 목록:
  download_video_task         — 영상 무워터마크 다운로드 (Phase 1 핵심)
  refresh_expiring_cookies_task — 만료 임박 쿠키 자동 갱신 (Celery Beat)
"""

from __future__ import annotations

import asyncio
import json
import logging
import random
import time
from datetime import datetime, timezone, timedelta
from typing import Optional

from celery import Task

from database.client import get_db
from services.downloader import VideoDownloader
from services.proxy_manager import ProxyManager
from tasks.workers import celery_app

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────
# 헬퍼: 이벤트 루프 재사용
# ─────────────────────────────────────────────────────────────

def _run_async(coro):
    """Celery 동기 컨텍스트에서 async 코루틴을 안전하게 실행."""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_closed():
            raise RuntimeError
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    return loop.run_until_complete(coro)


# ─────────────────────────────────────────────────────────────
# Task 1: 영상 다운로드
# ─────────────────────────────────────────────────────────────

@celery_app.task(
    bind=True,
    name="tasks.pipeline.download_video_task",
    max_retries=3,
    default_retry_delay=30,    # 30초 후 재시도
    acks_late=True,
)
def download_video_task(
    self: Task,
    video_id:   str,
    user_id:    str,
    account_id: Optional[str] = None,
    proxy_id:   Optional[str] = None,
) -> dict:
    """
    영상 무워터마크 다운로드 비동기 태스크.

    진행 상태:
      PENDING   → 큐 대기
      STARTED   → 다운로드 시작
      PROGRESS  → 다운로드 중 (meta: {progress: 0-100})
      SUCCESS   → 완료 (result: {file_path})
      FAILURE   → 실패 (exc: error)

    DB videos.status 도 함께 갱신합니다.
    """
    db            = get_db()
    proxy_manager = ProxyManager(db)
    downloader    = VideoDownloader(db, proxy_manager)

    # 레이트 리밋 회피: 랜덤 딜레이
    delay = random.uniform(2.0, 5.0)
    logger.info("[download] video_id=%s | 시작 전 %.1f초 대기", video_id, delay)
    time.sleep(delay)

    # 진행률 콜백: Celery meta 업데이트
    def progress_cb(pct: int):
        self.update_state(
            state="PROGRESS",
            meta={"progress": pct, "video_id": video_id},
        )

    try:
        result = _run_async(
            downloader.download_video(
                video_id   = video_id,
                user_id    = user_id,
                account_id = account_id,
                proxy_id   = proxy_id,
                progress_cb = progress_cb,
            )
        )
        logger.info("[download] 완료: video_id=%s | path=%s", video_id, result.get("file_path"))
        return result

    except Exception as exc:
        logger.exception("[download] 실패: video_id=%s", video_id)

        # Exponential backoff 재시도 (max 3회)
        retry_count = self.request.retries
        if retry_count < self.max_retries:
            backoff = 30 * (2 ** retry_count)   # 30s → 60s → 120s
            logger.info("[download] %d초 후 재시도 (%d/%d)", backoff, retry_count + 1, self.max_retries)
            raise self.retry(exc=exc, countdown=backoff)

        # 최종 실패: DB 상태 갱신
        try:
            db.table("videos").update(
                {"status": "sourced", "error_msg": f"최대 재시도 초과: {exc}"}
            ).eq("id", video_id).execute()
        except Exception:
            pass
        raise


# ─────────────────────────────────────────────────────────────
# Task 2: 만료 임박 쿠키 자동 갱신 (Celery Beat — 매일 새벽 3시)
# ─────────────────────────────────────────────────────────────

@celery_app.task(
    name="tasks.pipeline.refresh_expiring_cookies_task",
    ignore_result=True,
)
def refresh_expiring_cookies_task() -> None:
    """
    platform_cookies.expires_at 이 5일 이내인 계정의 쿠키를 자동 갱신.
    대상: naver_blog (Playwright 로그인 방식)
    """
    from services.account_manager import AccountManager

    db      = get_db()
    manager = AccountManager(db)
    now     = datetime.now(timezone.utc)
    cutoff  = (now + timedelta(days=5)).isoformat()

    # 만료 임박 계정 조회
    result = (
        db.table("platform_cookies")
        .select("account_id, expires_at, accounts(user_id, platform, is_active)")
        .lt("expires_at", cutoff)
        .execute()
    )

    for row in result.data:
        account    = row.get("accounts") or {}
        account_id = row["account_id"]
        user_id    = account.get("user_id")
        platform   = account.get("platform")
        is_active  = account.get("is_active", True)

        if not is_active or platform not in ("naver_blog",):
            continue

        logger.info("[cookie-refresh] account_id=%s platform=%s 갱신 시작", account_id, platform)
        try:
            _run_async(manager.refresh_cookie(account_id, user_id))
            logger.info("[cookie-refresh] 완료: account_id=%s", account_id)
        except Exception as e:
            logger.warning("[cookie-refresh] 실패: account_id=%s | %s", account_id, e)

        # 계정 간 딜레이
        time.sleep(random.uniform(3.0, 7.0))


# ─────────────────────────────────────────────────────────────
# Task 3: OAuth 토큰 만료 임박 확인 (매일 오전 9시)
# ─────────────────────────────────────────────────────────────

@celery_app.task(
    name="tasks.pipeline.check_expiring_tokens_task",
    ignore_result=True,
)
def check_expiring_tokens_task() -> None:
    """
    OAuth 토큰(access_token)이 7일 이내 만료되는 계정을 조회하여
    health_status → 'token_expired' 로 표시합니다.
    YouTube는 refresh_token 자동 갱신을 시도합니다.
    """
    db     = get_db()
    now    = datetime.now(timezone.utc)
    cutoff = (now + timedelta(days=7)).isoformat()

    result = (
        db.table("accounts")
        .select("id, user_id, platform, access_token, refresh_token, token_expires_at")
        .not_.is_("token_expires_at", "null")
        .lt("token_expires_at", cutoff)
        .eq("is_active", True)
        .execute()
    )

    for row in result.data:
        account_id    = row["id"]
        platform      = row["platform"]
        refresh_token = row.get("refresh_token")

        logger.info(
            "[token-check] 만료 임박: account_id=%s platform=%s expires=%s",
            account_id, platform, row.get("token_expires_at"),
        )

        # YouTube: refresh_token 으로 자동 재발급 시도
        if platform == "youtube" and refresh_token:
            try:
                import httpx as _httpx
                from core.config import get_settings
                settings = get_settings()

                resp = _run_async(
                    _httpx.AsyncClient(timeout=10).__aenter__()
                )
                # 동기 방식으로 간소화
                import urllib.request, urllib.parse
                data = urllib.parse.urlencode({
                    "client_id":     settings.youtube_client_id,
                    "client_secret": settings.youtube_client_secret,
                    "refresh_token": refresh_token,
                    "grant_type":    "refresh_token",
                }).encode()
                req = urllib.request.Request(
                    "https://oauth2.googleapis.com/token",
                    data=data,
                    headers={"Content-Type": "application/x-www-form-urlencoded"},
                )
                with urllib.request.urlopen(req, timeout=10) as r:
                    token_data = json.loads(r.read().decode())

                if "access_token" in token_data:
                    expires_in       = int(token_data.get("expires_in", 3600))
                    token_expires_at = (now + timedelta(seconds=expires_in)).isoformat()
                    db.table("accounts").update({
                        "access_token":    token_data["access_token"],
                        "token_expires_at": token_expires_at,
                        "health_status":   "healthy",
                    }).eq("id", account_id).execute()
                    logger.info("[token-check] YouTube 토큰 자동 갱신 완료: account_id=%s", account_id)
                    continue

            except Exception as e:
                logger.warning("[token-check] YouTube 자동 갱신 실패: account_id=%s | %s", account_id, e)

        # 자동 갱신 불가 → health_status 표시
        db.table("accounts").update(
            {"health_status": "token_expired"}
        ).eq("id", account_id).execute()

    logger.info("[token-check] 완료: %d개 계정 처리", len(result.data))


# ─────────────────────────────────────────────────────────────
# Task 4: 네이버쇼핑 커넥트 트래킹 URL 재생성 (매월 1일)
# ─────────────────────────────────────────────────────────────

@celery_app.task(
    name="tasks.pipeline.refresh_commerce_tracking_urls_task",
    ignore_result=True,
)
def refresh_commerce_tracking_urls_task() -> None:
    """
    naver_shopping_logs 에 등록된 트래킹 URL을 월 1회 재생성합니다.
    만료된 CPS 링크로 인한 수익 누락을 방지합니다.
    """
    import json as _json
    db  = get_db()
    now = datetime.now(timezone.utc)

    # 최근 60일 내 활성 로그 조회 (video_id + product_id 기준 중복 제거)
    cutoff = (now - timedelta(days=60)).isoformat()
    result = (
        db.table("naver_shopping_logs")
        .select("id, video_id, product_id, commerce_account_id")
        .gte("logged_at", cutoff)
        .not_.is_("product_id", "null")
        .not_.is_("video_id",   "null")
        .execute()
    )

    seen: set[tuple] = set()
    refreshed = 0

    for row in result.data:
        key = (row.get("video_id"), row.get("product_id"))
        if key in seen:
            continue
        seen.add(key)

        try:
            # video 소유자 조회
            video_res = (
                db.table("videos")
                .select("user_id")
                .eq("id", row["video_id"])
                .limit(1)
                .execute()
            )
            if not video_res.data:
                continue

            user_id    = video_res.data[0]["user_id"]
            account_id = row.get("commerce_account_id")

            from services.naver_shopping import NaverShoppingConnectService
            svc = NaverShoppingConnectService(db=db, user_id=user_id)

            result_url = _run_async(
                svc.generate_tracking_url(
                    product_id = row["product_id"],
                    video_id   = row["video_id"],
                    account_id = account_id,
                )
            )
            logger.info(
                "[commerce-refresh] 트래킹 URL 재생성: product_id=%s", row["product_id"]
            )
            refreshed += 1

        except Exception as e:
            logger.warning(
                "[commerce-refresh] 실패: product_id=%s | %s", row.get("product_id"), e
            )

        time.sleep(random.uniform(1.0, 3.0))

    logger.info("[commerce-refresh] 완료: %d개 URL 재생성", refreshed)
