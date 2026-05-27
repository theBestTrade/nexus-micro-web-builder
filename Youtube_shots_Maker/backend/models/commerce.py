"""
models/commerce.py
Track B: 네이버쇼핑 커넥트 + 쿠팡 파트너스 — Pydantic 스키마 (Phase 5)
"""

from __future__ import annotations

from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel


# ─────────────────────────────────────────────────────────────
# 상품 검색
# ─────────────────────────────────────────────────────────────

class ProductSearchRequest(BaseModel):
    keyword: str
    category_id: Optional[str] = None
    limit: int = 10
    account_id: Optional[str] = None   # 미지정 시 naver_shopping_connect is_default


class ProductItem(BaseModel):
    product_id: str
    product_name: str
    price: int                          # 원 단위
    commission_rate: float              # %
    product_url: str
    thumbnail: Optional[str] = None
    category: Optional[str] = None
    brand: Optional[str] = None


class ProductSearchResponse(BaseModel):
    items: list[ProductItem]
    total: int
    keyword: str


# ─────────────────────────────────────────────────────────────
# 트래킹 URL
# ─────────────────────────────────────────────────────────────

class TrackingUrlRequest(BaseModel):
    video_id: str
    product_id: str
    account_id: Optional[str] = None
    sub_id: Optional[str] = None       # 채널별 구분자


class TrackingUrlResponse(BaseModel):
    tracking_url: str
    commission_rate: float
    product_name: str
    log_id: str                        # naver_shopping_logs.id


# ─────────────────────────────────────────────────────────────
# 수익 통계
# ─────────────────────────────────────────────────────────────

class StatsRequest(BaseModel):
    account_id: Optional[str] = None
    from_date: date
    to_date: date


class StatsItem(BaseModel):
    log_id: str
    product_id: Optional[str]
    product_name: Optional[str]
    tracking_url: Optional[str]
    commission_rate: float
    click_count: int
    conversion_count: int
    estimated_revenue: float
    logged_at: datetime


class CommerceSummaryResponse(BaseModel):
    """대시보드용 수익 요약"""
    total_clicks: int
    total_conversions: int
    total_revenue: float               # 원 단위
    active_products: int
    period_days: int


# ─────────────────────────────────────────────────────────────
# 커머스 링크 우선순위 유틸
# ─────────────────────────────────────────────────────────────

COMMERCE_PRIORITY = [
    "naver_shopping_connect",
    "coupang_partners",
    "smartstore",
]


def pick_best_commerce_url(commerce_links: dict | None) -> str | None:
    """
    COMMERCE_PRIORITY 순서로 첫 번째 유효한 URL 반환.
    naver_shopping > coupang > smartstore
    """
    if not commerce_links:
        return None
    for key in ("naver_shopping", "coupang", "smartstore"):
        url = commerce_links.get(key)
        if url:
            return url
    return None
