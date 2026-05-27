"""
models/blog.py
Track D: 네이버 블로그 포스트 — Pydantic 스키마 (Phase 4)
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel


# ─────────────────────────────────────────────────────────────
# 요청 스키마
# ─────────────────────────────────────────────────────────────

class BlogGenerateRequest(BaseModel):
    video_id: str
    script_id: Optional[str] = None          # 없으면 해당 video_id의 최신 스크립트 사용
    style: Literal["review", "info", "story"] = "review"
    commerce_link: Optional[str] = None      # 생성 시 {{COMMERCE_LINK}} 교체


class BlogUpdateRequest(BaseModel):
    title_ko: Optional[str] = None
    body_html: Optional[str] = None
    tags: Optional[list[str]] = None
    commerce_links: Optional[dict] = None    # { coupang?, smartstore?, naver_shopping? }
    publish_account_id: Optional[str] = None


class BlogPublishRequest(BaseModel):
    blog_post_id: str
    account_id: str                          # naver_blog 계정 UUID
    scheduled_at: Optional[datetime] = None
    proxy_id: Optional[str] = None


# ─────────────────────────────────────────────────────────────
# 응답 스키마
# ─────────────────────────────────────────────────────────────

class BlogTaskResponse(BaseModel):
    task_id: str
    blog_post_id: str
    status: str
    message: str


class BlogPostResponse(BaseModel):
    id: str
    user_id: str
    video_id: Optional[str] = None
    script_id: Optional[str] = None
    publish_account_id: Optional[str] = None
    title_ko: str
    body_html: str
    thumbnail_path: Optional[str] = None
    tags: Optional[list[str]] = None
    commerce_links: Optional[dict] = None
    naver_post_url: Optional[str] = None
    status: str
    generate_task_id: Optional[str] = None
    publish_task_id: Optional[str] = None
    error_msg: Optional[str] = None
    published_at: Optional[datetime] = None
    created_at: datetime
    # 계정 정보 (JOIN)
    account_alias: Optional[str] = None
    account_display_name: Optional[str] = None


class BlogJobItem(BaseModel):
    """배포 작업 목록용 경량 응답"""
    blog_post_id: str
    title_ko: str
    status: str
    naver_post_url: Optional[str] = None
    published_at: Optional[datetime] = None
    error_msg: Optional[str] = None
    account_alias: Optional[str] = None
    account_display_name: Optional[str] = None


class BlogTaskStatusResponse(BaseModel):
    task_id: str
    blog_post_id: Optional[str] = None
    status: str
    progress: int
    result: Optional[dict] = None
    error: Optional[str] = None
