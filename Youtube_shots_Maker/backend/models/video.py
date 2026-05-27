"""
models/video.py
videos 테이블 + 소싱 API 관련 Pydantic 스키마
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


# ─────────────────────────────────────────────────────────────
# Enum
# ─────────────────────────────────────────────────────────────

class SourcePlatformEnum(str, Enum):
    DOUYIN      = "douyin"
    XIAOHONGSHU = "xiaohongshu"


class TrackEnum(str, Enum):
    A = "A"   # 중드 리컷 → 유튜브 광고
    B = "B"   # 쇼핑 리뷰 → 커머스
    D = "D"   # 블로그 전환


class VideoStatusEnum(str, Enum):
    SOURCED     = "sourced"
    DOWNLOADING = "downloading"
    DOWNLOADED  = "downloaded"
    PROCESSING  = "processing"
    READY       = "ready"
    PUBLISHED   = "published"


# ─────────────────────────────────────────────────────────────
# 검색 결과 (DB 저장 전 임시)
# ─────────────────────────────────────────────────────────────

class VideoSearchItem(BaseModel):
    """검색 결과 단건 (플랫폼에서 크롤링한 원시 데이터)"""
    platform:     SourcePlatformEnum
    original_url: str
    title_cn:     Optional[str] = None
    thumbnail_url: Optional[str] = None
    likes:        int = 0
    shares:       int = 0
    comments:     int = 0
    duration_sec: Optional[int] = None
    viral_score:  int = 0


# ─────────────────────────────────────────────────────────────
# Request 스키마
# ─────────────────────────────────────────────────────────────

class SourcingSearchRequest(BaseModel):
    """POST /api/sourcing/search 요청"""
    keyword:    str             = Field(..., min_length=1, description="검색 키워드")
    platform:   SourcePlatformEnum
    track:      TrackEnum
    limit:      int             = Field(default=10, ge=1, le=50)
    account_id: Optional[str]  = Field(None, description="소싱 계정 ID (미지정 시 platform 기본 계정)")
    proxy_id:   Optional[str]  = Field(None, description="사용할 프록시 ID")


class SourcingDownloadRequest(BaseModel):
    """POST /api/sourcing/download 요청"""
    video_id:   str
    account_id: Optional[str] = None
    proxy_id:   Optional[str] = None


# ─────────────────────────────────────────────────────────────
# Response 스키마
# ─────────────────────────────────────────────────────────────

class VideoResponse(BaseModel):
    """videos 테이블 행 응답"""
    id:                  UUID
    user_id:             UUID
    sourcing_account_id: Optional[UUID]
    platform:            SourcePlatformEnum
    track:               TrackEnum
    original_url:        str
    file_path:           Optional[str]
    thumbnail_url:       Optional[str]
    title_cn:            Optional[str]
    viral_score:         int
    likes:               int
    shares:              int
    comments:            int
    duration_sec:        Optional[int]
    width:               Optional[int]
    height:              Optional[int]
    status:              VideoStatusEnum
    download_task_id:    Optional[str]
    error_msg:           Optional[str]
    created_at:          datetime
    updated_at:          datetime

    model_config = {"from_attributes": True}


class SourcingSearchResponse(BaseModel):
    """POST /api/sourcing/search 응답"""
    videos: list[VideoResponse]
    total:  int
    keyword: str
    platform: SourcePlatformEnum


class SourcingDownloadResponse(BaseModel):
    """POST /api/sourcing/download 응답"""
    video_id: str
    task_id:  str
    status:   str = "queued"
    message:  str = "다운로드 큐에 등록되었습니다."


class TaskStatusResponse(BaseModel):
    """GET /api/sourcing/status/{task_id} 응답"""
    task_id:   str
    video_id:  Optional[str]
    status:    str                  # queued / downloading / downloaded / failed
    progress:  int = 0              # 0~100
    file_path: Optional[str] = None
    error:     Optional[str] = None
