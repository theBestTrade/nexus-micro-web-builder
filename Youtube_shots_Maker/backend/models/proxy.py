"""
models/proxy.py
프록시 관리 — Pydantic 스키마 (Phase 3)
"""

from __future__ import annotations

import re
from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, field_validator


# ─────────────────────────────────────────────────────────────
# 요청 스키마
# ─────────────────────────────────────────────────────────────

class AddProxyRequest(BaseModel):
    proxy_url: str
    proxy_type: Literal["http", "https", "socks5"] = "http"
    label: Optional[str] = None

    @field_validator("proxy_url")
    @classmethod
    def validate_proxy_url(cls, v: str) -> str:
        # 기본 형식 검증: scheme://[user:pass@]host:port
        pattern = r"^(https?|socks5)://.*:\d{1,5}$"
        if not re.match(pattern, v.rstrip("/")):
            raise ValueError(
                "proxy_url 형식 오류. 예: http://user:pass@host:8080"
            )
        return v


class TestProxyRequest(BaseModel):
    proxy_id: str
    target_url: str = "https://www.google.com"


# ─────────────────────────────────────────────────────────────
# 응답 스키마
# ─────────────────────────────────────────────────────────────

class ProxyResponse(BaseModel):
    id: str
    user_id: str
    proxy_url_masked: str         # 패스워드 마스킹 후 반환
    proxy_type: str
    label: Optional[str] = None
    is_active: bool
    last_used_at: Optional[datetime] = None
    fail_count: int
    created_at: datetime


class TestProxyResponse(BaseModel):
    success: bool
    latency_ms: Optional[int] = None
    error: Optional[str] = None
