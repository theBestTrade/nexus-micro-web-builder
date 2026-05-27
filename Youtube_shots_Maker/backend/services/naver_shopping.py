"""
services/naver_shopping.py
Track B: 네이버쇼핑 커넥트 CPS API 래퍼 (Phase 5)

공식 API: https://api.shopping.naver.com/connect/v1
인증: Authorization: Bearer {API_KEY} + X-Partner-Id: {PARTNER_ID}

⚠️  네이버쇼핑 커넥트 제휴사 신청 필요 (https://shopping.naver.com/connect)
    API 키 미설정 시 → 개발용 Mock 모드로 자동 전환
"""

from __future__ import annotations

import hashlib
import logging
import random
from datetime import date, datetime, timezone
from typing import Optional
from uuid import uuid4

import httpx
from supabase import Client

from core.config import get_settings
from models.commerce import ProductItem, COMMERCE_PRIORITY

logger = logging.getLogger(__name__)

_API_BASE = "https://api.shopping.naver.com/connect/v1"
_TIMEOUT  = 10.0   # 초


# ─────────────────────────────────────────────────────────────
# 내부 헬퍼
# ─────────────────────────────────────────────────────────────

def _get_account_creds(db: Client, account_id: str, user_id: str) -> dict:
    """naver_shopping_connect 계정의 API Key / Partner ID 조회."""
    from services.account_manager import AccountManager
    mgr = AccountManager(db)
    res = (
        db.table("accounts")
        .select("credentials_encrypted, partner_id")
        .eq("id", account_id)
        .eq("user_id", user_id)
        .single()
        .execute()
    )
    row = res.data or {}
    creds = mgr._decode_credentials(row.get("credentials_encrypted"))
    return {
        "api_key":    creds.get("api_key", ""),
        "partner_id": row.get("partner_id") or creds.get("partner_id", ""),
    }


def _default_account_id(db: Client, user_id: str) -> Optional[str]:
    """naver_shopping_connect의 기본 계정 ID 반환."""
    res = (
        db.table("accounts")
        .select("id")
        .eq("user_id", user_id)
        .eq("platform", "naver_shopping_connect")
        .eq("is_default", True)
        .eq("is_active", True)
        .limit(1)
        .execute()
    )
    return res.data[0]["id"] if res.data else None


# ─────────────────────────────────────────────────────────────
# Mock 데이터 (API 키 미설정 시 개발용)
# ─────────────────────────────────────────────────────────────

_MOCK_PRODUCTS = [
    {
        "product_id":      "NP001",
        "product_name":    "프리미엄 무선 이어폰 (노이즈캔슬링)",
        "price":           79900,
        "commission_rate": 3.5,
        "product_url":     "https://shopping.naver.com/product/NP001",
        "thumbnail":       None,
        "category":        "전자제품 > 이어폰",
        "brand":           "SoundMax",
    },
    {
        "product_id":      "NP002",
        "product_name":    "스마트 체중계 (앱 연동)",
        "price":           35900,
        "commission_rate": 4.0,
        "product_url":     "https://shopping.naver.com/product/NP002",
        "thumbnail":       None,
        "category":        "건강/뷰티 > 체중계",
        "brand":           "FitStar",
    },
    {
        "product_id":      "NP003",
        "product_name":    "휴대용 충전기 20000mAh",
        "price":           29900,
        "commission_rate": 3.0,
        "product_url":     "https://shopping.naver.com/product/NP003",
        "thumbnail":       None,
        "category":        "전자제품 > 보조배터리",
        "brand":           "PowerUp",
    },
    {
        "product_id":      "NP004",
        "product_name":    "쿨링 선풍기 미니 USB",
        "price":           15900,
        "commission_rate": 5.0,
        "product_url":     "https://shopping.naver.com/product/NP004",
        "thumbnail":       None,
        "category":        "가전 > 선풍기",
        "brand":           "CoolBreeze",
    },
    {
        "product_id":      "NP005",
        "product_name":    "무선 충전 패드 (15W 고속)",
        "price":           19900,
        "commission_rate": 4.5,
        "product_url":     "https://shopping.naver.com/product/NP005",
        "thumbnail":       None,
        "category":        "전자제품 > 충전기",
        "brand":           "ChargePro",
    },
]


# ─────────────────────────────────────────────────────────────
# 메인 서비스
# ─────────────────────────────────────────────────────────────

class NaverShoppingConnectService:
    """
    네이버쇼핑 커넥트 CPS API 래퍼.
    API 키 미설정 → Mock 모드 (개발/테스트용).
    """

    def __init__(self, db: Client, user_id: str) -> None:
        self.db      = db
        self.user_id = user_id

    # ── 상품 검색 ──────────────────────────────────────────────

    async def search_products(
        self,
        keyword: str,
        account_id: Optional[str] = None,
        category_id: Optional[str] = None,
        limit: int = 10,
    ) -> list[ProductItem]:
        """키워드로 상품 검색. API 키 없으면 Mock 반환."""
        aid = account_id or _default_account_id(self.db, self.user_id)
        if not aid:
            return self._mock_search(keyword, limit)

        creds = _get_account_creds(self.db, aid, self.user_id)
        if not creds.get("api_key"):
            logger.info("API 키 미설정 → Mock 모드 (keyword=%s)", keyword)
            return self._mock_search(keyword, limit)

        params: dict = {"keyword": keyword, "limit": limit}
        if category_id:
            params["categoryId"] = category_id

        try:
            async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
                res = await client.get(
                    f"{_API_BASE}/products/search",
                    params=params,
                    headers={
                        "Authorization": f"Bearer {creds['api_key']}",
                        "X-Partner-Id":  creds["partner_id"],
                    },
                )
                res.raise_for_status()
                data = res.json()
                return [ProductItem(**p) for p in data.get("items", [])]
        except Exception as exc:
            logger.warning("네이버쇼핑 검색 실패 (Mock 폴백): %s", exc)
            return self._mock_search(keyword, limit)

    # ── 트래킹 URL 생성 ────────────────────────────────────────

    async def generate_tracking_url(
        self,
        product_id: str,
        video_id: str,
        account_id: Optional[str] = None,
        sub_id: Optional[str] = None,
    ) -> dict:
        """
        제품 ID + 비디오 ID로 트래킹 URL 생성.
        성공 시 naver_shopping_logs에 기록.
        """
        aid = account_id or _default_account_id(self.db, self.user_id)
        if not aid:
            return self._mock_tracking_url(product_id, video_id)

        creds = _get_account_creds(self.db, aid, self.user_id)
        if not creds.get("api_key"):
            return self._mock_tracking_url(product_id, video_id)

        try:
            async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
                body = {
                    "product_id": product_id,
                    "partner_id": creds["partner_id"],
                }
                if sub_id:
                    body["sub_id"] = sub_id

                res = await client.post(
                    f"{_API_BASE}/tracking-url",
                    json=body,
                    headers={
                        "Authorization": f"Bearer {creds['api_key']}",
                        "X-Partner-Id":  creds["partner_id"],
                    },
                )
                res.raise_for_status()
                data = res.json()
                tracking_url    = data.get("tracking_url", "")
                commission_rate = data.get("commission_rate", 0.0)
                product_name    = data.get("product_name", product_id)

        except Exception as exc:
            logger.warning("트래킹 URL 생성 실패 (Mock 폴백): %s", exc)
            result = self._mock_tracking_url(product_id, video_id)
            return result

        # DB 로그 저장
        log_id = self._save_log(
            account_id=aid, video_id=video_id, product_id=product_id,
            product_name=product_name, tracking_url=tracking_url,
            commission_rate=commission_rate,
        )

        return {
            "tracking_url":    tracking_url,
            "commission_rate": commission_rate,
            "product_name":    product_name,
            "log_id":          log_id,
        }

    # ── 수익 통계 ──────────────────────────────────────────────

    async def get_stats(
        self,
        from_date: date,
        to_date: date,
        account_id: Optional[str] = None,
    ) -> list[dict]:
        """DB naver_shopping_logs + 네이버쇼핑 API 결합 통계."""
        query = (
            self.db.table("naver_shopping_logs")
            .select("*")
            .eq("user_id", self.user_id)
            .gte("logged_at", from_date.isoformat())
            .lte("logged_at", to_date.isoformat())
            .order("logged_at", desc=True)
        )
        if account_id:
            query = query.eq("commerce_account_id", account_id)

        res = query.execute()
        rows = res.data or []

        # 실시간 통계 업데이트 시도 (API 연결 가능한 경우)
        # 실패해도 DB 데이터 반환
        try:
            if account_id:
                creds = _get_account_creds(self.db, account_id, self.user_id)
                if creds.get("api_key"):
                    await self._sync_stats_from_api(
                        creds, from_date, to_date, rows
                    )
        except Exception:
            pass

        return rows

    async def get_summary(self, days: int = 30) -> dict:
        """대시보드용 수익 요약 (최근 N일)."""
        from datetime import timedelta
        to_date   = date.today()
        from_date = to_date - timedelta(days=days)

        res = (
            self.db.table("naver_shopping_logs")
            .select("click_count, conversion_count, estimated_revenue, product_id")
            .eq("user_id", self.user_id)
            .gte("logged_at", from_date.isoformat())
            .execute()
        )
        rows = res.data or []

        total_clicks      = sum(r.get("click_count", 0) or 0 for r in rows)
        total_conversions = sum(r.get("conversion_count", 0) or 0 for r in rows)
        total_revenue     = sum(float(r.get("estimated_revenue", 0) or 0) for r in rows)
        unique_products   = len({r.get("product_id") for r in rows if r.get("product_id")})

        return {
            "total_clicks":      total_clicks,
            "total_conversions": total_conversions,
            "total_revenue":     total_revenue,
            "active_products":   unique_products,
            "period_days":       days,
        }

    # ─────────────────────────────────────────────────────────
    # 내부 헬퍼
    # ─────────────────────────────────────────────────────────

    def _save_log(
        self,
        account_id: str,
        video_id: str,
        product_id: str,
        product_name: str,
        tracking_url: str,
        commission_rate: float,
    ) -> str:
        res = self.db.table("naver_shopping_logs").insert({
            "user_id":            self.user_id,
            "commerce_account_id": account_id,
            "video_id":           video_id,
            "product_id":         product_id,
            "product_name":       product_name,
            "tracking_url":       tracking_url,
            "commission_rate":    commission_rate,
        }).execute()
        return res.data[0]["id"] if res.data else str(uuid4())

    @staticmethod
    def _mock_search(keyword: str, limit: int) -> list[ProductItem]:
        """키워드를 기반으로 Mock 상품 목록 반환."""
        results = []
        for p in _MOCK_PRODUCTS[:limit]:
            item = ProductItem(**p)
            # 키워드가 포함된 것처럼 이름 수정 (개발용)
            if keyword and keyword not in item.product_name:
                item = ProductItem(
                    **{**p, "product_name": f"{keyword} 관련 - {p['product_name']}"}
                )
            results.append(item)
        return results

    @staticmethod
    def _mock_tracking_url(product_id: str, video_id: str) -> dict:
        """Mock 트래킹 URL 생성."""
        unique = hashlib.md5(f"{product_id}:{video_id}".encode()).hexdigest()[:8]
        mock = next(
            (p for p in _MOCK_PRODUCTS if p["product_id"] == product_id),
            _MOCK_PRODUCTS[0],
        )
        return {
            "tracking_url":    f"https://shopping.naver.com/connect/track/{unique}",
            "commission_rate": mock["commission_rate"],
            "product_name":    mock["product_name"],
            "log_id":          str(uuid4()),
        }

    async def _sync_stats_from_api(
        self, creds: dict, from_date: date, to_date: date, rows: list
    ) -> None:
        """네이버 API에서 최신 통계를 가져와 DB 업데이트 (선택적)."""
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            res = await client.get(
                f"{_API_BASE}/stats",
                params={"from": from_date.isoformat(), "to": to_date.isoformat()},
                headers={
                    "Authorization": f"Bearer {creds['api_key']}",
                    "X-Partner-Id":  creds["partner_id"],
                },
            )
            res.raise_for_status()
            stats = res.json()
            # 실제 집계 데이터로 DB 업데이트
            for stat in stats:
                pid = stat.get("product_id")
                self.db.table("naver_shopping_logs").update({
                    "click_count":       stat.get("clicks", 0),
                    "conversion_count":  stat.get("conversions", 0),
                    "estimated_revenue": stat.get("revenue", 0),
                }).eq("product_id", pid).eq("user_id", self.user_id).execute()
