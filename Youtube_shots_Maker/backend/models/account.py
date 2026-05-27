"""
models/account.py
accounts 테이블 관련 Pydantic 스키마
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


# ─────────────────────────────────────────────────────────────
# Enum 정의
# ─────────────────────────────────────────────────────────────

class PlatformEnum(str, Enum):
    # 소싱 플랫폼
    DOUYIN      = "douyin"
    XIAOHONGSHU = "xiaohongshu"
    # 배포 채널
    YOUTUBE     = "youtube"
    INSTAGRAM   = "instagram"
    TIKTOK      = "tiktok"
    NAVER_BLOG  = "naver_blog"
    # 커머스
    NAVER_SHOPPING_CONNECT = "naver_shopping_connect"
    COUPANG_PARTNERS       = "coupang_partners"
    SMARTSTORE             = "smartstore"


class HealthStatusEnum(str, Enum):
    UNKNOWN        = "unknown"
    HEALTHY        = "healthy"
    COOKIE_EXPIRED = "cookie_expired"
    TOKEN_EXPIRED  = "token_expired"
    BANNED         = "banned"
    ERROR          = "error"


# 플랫폼 유형 분류 (내부 로직용)
CREDENTIAL_PLATFORMS = {
    PlatformEnum.DOUYIN,
    PlatformEnum.XIAOHONGSHU,
    PlatformEnum.NAVER_BLOG,
}
OAUTH_PLATFORMS = {
    PlatformEnum.YOUTUBE,
    PlatformEnum.INSTAGRAM,
    PlatformEnum.TIKTOK,
}
COMMERCE_PLATFORMS = {
    PlatformEnum.NAVER_SHOPPING_CONNECT,
    PlatformEnum.COUPANG_PARTNERS,
    PlatformEnum.SMARTSTORE,
}


# ─────────────────────────────────────────────────────────────
# Request 스키마
# ─────────────────────────────────────────────────────────────

class AccountCreate(BaseModel):
    """계정 생성 요청"""
    platform: PlatformEnum
    alias: str = Field(..., min_length=1, max_length=50, description="사용자 지정 별명")

    # 공통 (선택)
    display_name:        Optional[str] = None
    avatar_url:          Optional[str] = None
    platform_account_id: Optional[str] = None
    is_default:          Optional[bool] = None

    # OAuth 계정 (youtube / instagram / tiktok)
    access_token:     Optional[str] = None
    refresh_token:    Optional[str] = None
    token_expires_at: Optional[datetime] = None

    # 자격증명 계정 (naver_blog / douyin / xiaohongshu)
    login_id: Optional[str] = Field(None, description="로그인 ID (서버에서 암호화 저장)")
    login_pw: Optional[str] = Field(None, description="로그인 PW (서버에서 암호화 저장)")

    # 커머스 계정 (naver_shopping_connect / coupang_partners / smartstore)
    partner_id:    Optional[str] = None
    affiliate_url: Optional[str] = None
    api_key:       Optional[str] = Field(None, description="API Key (서버에서 암호화 저장)")
    api_secret:    Optional[str] = Field(None, description="API Secret (서버에서 암호화 저장)")

    @field_validator("alias")
    @classmethod
    def strip_alias(cls, v: str) -> str:
        return v.strip()


class AccountUpdate(BaseModel):
    """계정 수정 요청 (부분 업데이트)"""
    alias:        Optional[str] = Field(None, min_length=1, max_length=50)
    display_name: Optional[str] = None
    avatar_url:   Optional[str] = None
    is_default:   Optional[bool] = None
    is_active:    Optional[bool] = None

    # 자격증명 업데이트
    login_id:  Optional[str] = None
    login_pw:  Optional[str] = None

    # OAuth 업데이트
    access_token:     Optional[str] = None
    refresh_token:    Optional[str] = None
    token_expires_at: Optional[datetime] = None

    # 커머스 업데이트
    partner_id:    Optional[str] = None
    affiliate_url: Optional[str] = None
    api_key:       Optional[str] = None
    api_secret:    Optional[str] = None


# ─────────────────────────────────────────────────────────────
# Response 스키마
# ─────────────────────────────────────────────────────────────

class AccountResponse(BaseModel):
    """계정 응답 (민감 정보 제외)"""
    id:                  UUID
    user_id:             UUID
    platform:            PlatformEnum
    alias:               str
    display_name:        Optional[str]
    avatar_url:          Optional[str]
    platform_account_id: Optional[str]

    # OAuth 상태 (토큰 원문 제외)
    token_expires_at: Optional[datetime]

    # 커머스
    partner_id:    Optional[str]
    affiliate_url: Optional[str]

    # 상태
    is_default:    bool
    is_active:     bool
    last_used_at:  Optional[datetime]
    health_status: HealthStatusEnum

    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AccountListResponse(BaseModel):
    """계정 목록 응답"""
    accounts: list[AccountResponse]
    total: int


# ─────────────────────────────────────────────────────────────
# Cookie 스키마
# ─────────────────────────────────────────────────────────────

class CookieStatus(BaseModel):
    """쿠키 상태 응답 (원문 미포함)"""
    account_id:   UUID
    refreshed_at: Optional[datetime]
    expires_at:   Optional[datetime]
    health_status: HealthStatusEnum
    has_cookie:   bool


# ─────────────────────────────────────────────────────────────
# Connection Test 스키마
# ─────────────────────────────────────────────────────────────

class ConnectionTestResult(BaseModel):
    """계정 연결 테스트 결과"""
    account_id:    UUID
    success:       bool
    health_status: HealthStatusEnum
    latency_ms:    Optional[int] = None
    message:       Optional[str] = None
    error:         Optional[str] = None


# ─────────────────────────────────────────────────────────────
# Cookie Refresh 스키마
# ─────────────────────────────────────────────────────────────

class CookieRefreshResult(BaseModel):
    """쿠키 갱신 결과"""
    account_id: UUID
    success:    bool
    expires_at: Optional[datetime] = None
    message:    Optional[str] = None
    error:      Optional[str] = None
