"""
routers/commerce.py
Track B: 네이버쇼핑 커넥트 커머스 API — Phase 5

엔드포인트:
  POST /api/commerce/naver-shopping/search   — 상품 키워드 검색
  POST /api/commerce/naver-shopping/link     — 트래킹 URL 생성
  GET  /api/commerce/naver-shopping/stats    — 수익 통계
  GET  /api/commerce/summary                 — 대시보드용 수익 요약
"""

from __future__ import annotations

import logging
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from core.auth import get_current_user_id
from database.client import get_db
from models.commerce import (
    CommerceSummaryResponse,
    ProductItem,
    ProductSearchRequest,
    ProductSearchResponse,
    StatsItem,
    TrackingUrlRequest,
    TrackingUrlResponse,
)
from services.naver_shopping import NaverShoppingConnectService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/commerce", tags=["commerce"])


# ─────────────────────────────────────────────────────────────
# 의존성
# ─────────────────────────────────────────────────────────────

def _svc(
    user_id: str = Depends(get_current_user_id),
    db=Depends(get_db),
) -> NaverShoppingConnectService:
    return NaverShoppingConnectService(db=db, user_id=user_id)


# ─────────────────────────────────────────────────────────────
# POST /api/commerce/naver-shopping/search
# ─────────────────────────────────────────────────────────────

@router.post("/naver-shopping/search", response_model=ProductSearchResponse)
async def search_products(
    body: ProductSearchRequest,
    svc: NaverShoppingConnectService = Depends(_svc),
):
    """
    키워드로 네이버쇼핑 커넥트 상품을 검색한다.
    API 키 미설정 시 Mock 데이터 반환 (개발/테스트용).
    """
    items = await svc.search_products(
        keyword     = body.keyword,
        account_id  = body.account_id,
        category_id = body.category_id,
        limit       = body.limit,
    )
    return ProductSearchResponse(
        items   = items,
        total   = len(items),
        keyword = body.keyword,
    )


# ─────────────────────────────────────────────────────────────
# POST /api/commerce/naver-shopping/link
# ─────────────────────────────────────────────────────────────

@router.post("/naver-shopping/link", response_model=TrackingUrlResponse)
async def generate_tracking_url(
    body: TrackingUrlRequest,
    user_id: str = Depends(get_current_user_id),
    db=Depends(get_db),
    svc: NaverShoppingConnectService = Depends(_svc),
):
    """
    상품 ID + 비디오 ID로 CPS 트래킹 URL을 생성한다.
    생성 이력은 naver_shopping_logs에 자동 기록.
    """
    # video 소유권 확인
    video_res = (
        db.table("videos")
        .select("id, track")
        .eq("id", body.video_id)
        .eq("user_id", user_id)
        .single()
        .execute()
    )
    if not video_res.data:
        raise HTTPException(status_code=404, detail="영상을 찾을 수 없습니다.")

    result = await svc.generate_tracking_url(
        product_id = body.product_id,
        video_id   = body.video_id,
        account_id = body.account_id,
        sub_id     = body.sub_id,
    )

    return TrackingUrlResponse(**result)


# ─────────────────────────────────────────────────────────────
# GET /api/commerce/naver-shopping/stats
# ─────────────────────────────────────────────────────────────

@router.get("/naver-shopping/stats", response_model=list[StatsItem])
async def get_stats(
    account_id: Optional[str] = Query(None),
    from_date: date  = Query(..., alias="from"),
    to_date:   date  = Query(..., alias="to"),
    svc: NaverShoppingConnectService = Depends(_svc),
):
    """
    날짜 범위 내 커머스 수익 통계를 반환한다.
    실제 API 연결 가능 시 실시간 데이터로 갱신 후 반환.
    """
    rows = await svc.get_stats(
        from_date  = from_date,
        to_date    = to_date,
        account_id = account_id,
    )
    return [
        StatsItem(
            log_id            = r["id"],
            product_id        = r.get("product_id"),
            product_name      = r.get("product_name"),
            tracking_url      = r.get("tracking_url"),
            commission_rate   = float(r.get("commission_rate") or 0),
            click_count       = r.get("click_count") or 0,
            conversion_count  = r.get("conversion_count") or 0,
            estimated_revenue = float(r.get("estimated_revenue") or 0),
            logged_at         = r["logged_at"],
        )
        for r in rows
    ]


# ─────────────────────────────────────────────────────────────
# GET /api/commerce/summary — 대시보드용 수익 요약
# ─────────────────────────────────────────────────────────────

@router.get("/summary", response_model=CommerceSummaryResponse)
async def get_commerce_summary(
    days: int = Query(30, ge=1, le=365),
    svc: NaverShoppingConnectService = Depends(_svc),
):
    """최근 N일간의 커머스 수익 요약 (대시보드 카드용)."""
    data = await svc.get_summary(days=days)
    return CommerceSummaryResponse(**data)
