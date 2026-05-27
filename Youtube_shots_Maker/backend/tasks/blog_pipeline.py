"""
tasks/blog_pipeline.py
Track D: 네이버 블로그 파이프라인 — Celery 비동기 태스크

태스크 목록:
  generate_blog_post_task  — Claude API로 블로그 포스트 HTML 생성
  publish_blog_post_task   — Playwright로 네이버 블로그 자동 등록

스테이지:
  download → stt → generate_blog → attach_commerce → upload_images → publish_blog
  (download, stt는 Phase 1/2 공유)
"""

from __future__ import annotations

import asyncio
import logging
from typing import Optional

from tasks.workers import celery_app
from database.client import get_db
from services.blog_writer import BlogWriterService
from services.naver_blog import NaverBlogService
from services.proxy_manager import ProxyManager

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────
# 헬퍼
# ─────────────────────────────────────────────────────────────

def _run_async(coro):
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


def _retry_countdown(retries: int) -> int:
    return 30 * (2 ** retries)


def _update_blog_status(db, blog_post_id: str, **kwargs) -> None:
    """blog_posts 레코드 상태 업데이트."""
    db.table("blog_posts").update(kwargs).eq("id", blog_post_id).execute()


# ─────────────────────────────────────────────────────────────
# Task 1: 블로그 포스트 생성 (Claude API)
# ─────────────────────────────────────────────────────────────

@celery_app.task(
    bind=True,
    name="tasks.blog_pipeline.generate_blog_post_task",
    max_retries=2,
    default_retry_delay=60,
    acks_late=True,
)
def generate_blog_post_task(
    self,
    blog_post_id: str,
    user_id: str,
    style: str = "review",
):
    """
    blog_posts 레코드의 video_id → script 조회 → Claude로 본문 생성.
    생성 완료 후 blog_posts에 title_ko, body_html, tags 저장.
    """
    db = get_db()
    _update_blog_status(db, blog_post_id, status="generating", generate_task_id=self.request.id)

    try:
        # 블로그 포스트 조회
        post_res = (
            db.table("blog_posts")
            .select("video_id, script_id, commerce_links")
            .eq("id", blog_post_id)
            .single()
            .execute()
        )
        if not post_res.data:
            raise ValueError(f"blog_post 없음: {blog_post_id}")

        post = post_res.data
        script_id = post.get("script_id")
        video_id  = post.get("video_id")

        # 대본 조회: script_id 우선, 없으면 video_id의 최신 스크립트
        if script_id:
            script_q = (
                db.table("scripts")
                .select("adapted_script, raw_stt")
                .eq("id", script_id)
                .single()
                .execute()
            )
        else:
            script_q = (
                db.table("scripts")
                .select("adapted_script, raw_stt")
                .eq("video_id", video_id)
                .order("created_at", desc=True)
                .limit(1)
                .execute()
            )

        script_row = (script_q.data[0] if isinstance(script_q.data, list) else script_q.data) or {}
        script_text = (
            script_row.get("adapted_script")
            or script_row.get("raw_stt")
            or ""
        )
        if not script_text:
            raise ValueError("대본(adapted_script / raw_stt)이 없습니다.")

        # 커머스 링크 준비
        commerce_links = post.get("commerce_links") or {}
        commerce_link = (
            commerce_links.get("naver_shopping")
            or commerce_links.get("coupang")
            or commerce_links.get("smartstore")
            or None
        )

        # Claude API로 블로그 생성
        writer  = BlogWriterService()
        result  = writer.generate(script_text, style=style, commerce_link=commerce_link)

        # DB 저장
        _update_blog_status(
            db,
            blog_post_id,
            status    = "ready",
            title_ko  = result["title_ko"],
            body_html = result["body_html"],
            tags      = result["tags"],
            error_msg = None,
        )

        logger.info("블로그 포스트 생성 완료: %s", blog_post_id)
        return {"blog_post_id": blog_post_id, "status": "ready"}

    except Exception as exc:
        logger.exception("블로그 생성 실패 [%s]: %s", blog_post_id, exc)
        retry_count = self.request.retries
        if retry_count < self.max_retries:
            _update_blog_status(db, blog_post_id, status="generating")
            raise self.retry(exc=exc, countdown=_retry_countdown(retry_count))
        else:
            _update_blog_status(db, blog_post_id, status="failed", error_msg=str(exc))
            raise


# ─────────────────────────────────────────────────────────────
# Task 2: 네이버 블로그 발행 (Playwright)
# ─────────────────────────────────────────────────────────────

@celery_app.task(
    bind=True,
    name="tasks.blog_pipeline.publish_blog_post_task",
    max_retries=1,
    default_retry_delay=120,
    acks_late=True,
)
def publish_blog_post_task(
    self,
    blog_post_id: str,
    account_id: str,
    user_id: str,
    proxy_id: Optional[str] = None,
):
    """
    blog_posts 레코드 → Playwright로 네이버 블로그 스마트에디터에 자동 등록.
    성공 시 naver_post_url 저장, status='published'.
    """
    from datetime import datetime, timezone

    db = get_db()
    _update_blog_status(
        db, blog_post_id,
        status           = "publishing",
        publish_task_id  = self.request.id,
        publish_account_id = account_id,
    )

    try:
        # 블로그 포스트 조회
        post_res = (
            db.table("blog_posts")
            .select("title_ko, body_html, tags, commerce_links")
            .eq("id", blog_post_id)
            .single()
            .execute()
        )
        if not post_res.data:
            raise ValueError(f"blog_post 없음: {blog_post_id}")

        post = post_res.data

        # 커머스 링크 교체 (body_html에 {{COMMERCE_LINK}} 있으면 치환)
        commerce_links = post.get("commerce_links") or {}
        body_html = post["body_html"]
        if commerce_links and "{{COMMERCE_LINK}}" in body_html:
            from services.blog_writer import BlogWriterService
            body_html = BlogWriterService().attach_commerce_links(body_html, commerce_links)

        # 프록시 조회
        proxy_url: Optional[str] = None
        if proxy_id:
            proxy_res = (
                db.table("proxy_pool")
                .select("proxy_url, is_active")
                .eq("id", proxy_id)
                .eq("is_active", True)
                .single()
                .execute()
            )
            if proxy_res.data:
                proxy_url = proxy_res.data["proxy_url"]

        # 네이버 블로그 자동 등록
        naver_svc = NaverBlogService(db)
        post_url  = _run_async(
            naver_svc.publish(
                account_id = account_id,
                user_id    = user_id,
                title_ko   = post["title_ko"],
                body_html  = body_html,
                tags       = post.get("tags") or [],
                proxy_url  = proxy_url,
            )
        )

        # 성공
        _update_blog_status(
            db,
            blog_post_id,
            status         = "published",
            naver_post_url = post_url,
            published_at   = datetime.now(timezone.utc).isoformat(),
            error_msg      = None,
        )

        logger.info("네이버 블로그 발행 완료: %s → %s", blog_post_id, post_url)
        return {"blog_post_id": blog_post_id, "naver_post_url": post_url}

    except Exception as exc:
        logger.exception("블로그 발행 실패 [%s]: %s", blog_post_id, exc)

        # 네이버 계정 상태 갱신
        naver_svc_fallback = NaverBlogService(db)
        naver_svc_fallback._update_account_health(account_id, "error")

        _update_blog_status(db, blog_post_id, status="failed", error_msg=str(exc))

        retry_count = self.request.retries
        if retry_count < self.max_retries:
            raise self.retry(exc=exc, countdown=_retry_countdown(retry_count))
        raise
