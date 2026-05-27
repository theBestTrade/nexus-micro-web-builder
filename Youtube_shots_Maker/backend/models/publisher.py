"""
models/publisher.py
Publisher Matrix — Pydantic 스키마 (Phase 3)
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional
from pydantic import BaseModel


# ─────────────────────────────────────────────────────────────
# 요청 스키마
# ─────────────────────────────────────────────────────────────

class PublishTarget(BaseModel):
    account_id: str
    scheduled_at: Optional[datetime] = None   # None → 즉시 배포


class SchedulePublishRequest(BaseModel):
    script_id: str
    publish_targets: list[PublishTarget]
    commerce_link: Optional[str] = None
    proxy_id: Optional[str] = None


class GeoMetadataRequest(BaseModel):
    script_id: str


# ─────────────────────────────────────────────────────────────
# GEO 메타데이터
# ─────────────────────────────────────────────────────────────

class FaqItem(BaseModel):
    question: str
    answer: str


class GeoMetadataResponse(BaseModel):
    title: str
    description: str
    tags: list[str]
    context_summary: str
    faq_schema: list[FaqItem]


# ─────────────────────────────────────────────────────────────
# 응답 스키마
# ─────────────────────────────────────────────────────────────

class SchedulePublishResponse(BaseModel):
    job_ids: list[str]


class PublishJobResponse(BaseModel):
    id: str
    video_id: Optional[str] = None
    script_id: Optional[str] = None
    publish_account_id: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    published_at: Optional[datetime] = None
    status: str
    platform_video_id: Optional[str] = None
    commerce_link: Optional[str] = None
    geo_metadata: Optional[dict] = None
    error_msg: Optional[str] = None
    created_at: datetime
    # 계정 정보 (JOIN)
    account_alias: Optional[str] = None
    account_platform: Optional[str] = None
    account_display_name: Optional[str] = None
