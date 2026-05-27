"""
routers/proxy.py
프록시 관리 API — Phase 3

엔드포인트:
  GET    /api/proxy/list        — 프록시 목록
  POST   /api/proxy/add         — 프록시 추가
  DELETE /api/proxy/{proxy_id}  — 프록시 삭제
  POST   /api/proxy/test        — 프록시 연결 테스트 (Playwright)
"""

from __future__ import annotations

import logging
import re
import time
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status

from core.auth import get_current_user_id
from database.client import get_db
from models.proxy import AddProxyRequest, ProxyResponse, TestProxyRequest, TestProxyResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/proxy", tags=["proxy"])


# ─────────────────────────────────────────────────────────────
# 내부 유틸
# ─────────────────────────────────────────────────────────────

def _mask_proxy_url(url: str) -> str:
    """http://user:pass@host:port → http://user:***@host:port"""
    return re.sub(r"(:)[^:@]+(@)", r"\1***\2", url)


def _row_to_response(row: dict) -> ProxyResponse:
    return ProxyResponse(
        id=row["id"],
        user_id=row["user_id"],
        proxy_url_masked=_mask_proxy_url(row["proxy_url"]),
        proxy_type=row["proxy_type"],
        label=row.get("label"),
        is_active=row["is_active"],
        last_used_at=row.get("last_used_at"),
        fail_count=row["fail_count"],
        created_at=row["created_at"],
    )


# ─────────────────────────────────────────────────────────────
# GET /api/proxy/list
# ─────────────────────────────────────────────────────────────

@router.get("/list", response_model=list[ProxyResponse])
async def list_proxies(
    user_id: str = Depends(get_current_user_id),
    db=Depends(get_db),
):
    res = (
        db.table("proxy_pool")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    return [_row_to_response(r) for r in (res.data or [])]


# ─────────────────────────────────────────────────────────────
# POST /api/proxy/add
# ─────────────────────────────────────────────────────────────

@router.post("/add", response_model=ProxyResponse, status_code=status.HTTP_201_CREATED)
async def add_proxy(
    body: AddProxyRequest,
    user_id: str = Depends(get_current_user_id),
    db=Depends(get_db),
):
    insert_data = {
        "user_id":    user_id,
        "proxy_url":  body.proxy_url,
        "proxy_type": body.proxy_type,
        "label":      body.label,
        "is_active":  True,
        "fail_count": 0,
    }
    res = db.table("proxy_pool").insert(insert_data).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="프록시 저장에 실패했습니다.")
    return _row_to_response(res.data[0])


# ─────────────────────────────────────────────────────────────
# DELETE /api/proxy/{proxy_id}
# ─────────────────────────────────────────────────────────────

@router.delete("/{proxy_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_proxy(
    proxy_id: str,
    user_id: str = Depends(get_current_user_id),
    db=Depends(get_db),
):
    res = (
        db.table("proxy_pool")
        .delete()
        .eq("id", proxy_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="프록시를 찾을 수 없습니다.")


# ─────────────────────────────────────────────────────────────
# POST /api/proxy/test — Playwright로 연결 테스트
# ─────────────────────────────────────────────────────────────

@router.post("/test", response_model=TestProxyResponse)
async def test_proxy(
    body: TestProxyRequest,
    user_id: str = Depends(get_current_user_id),
    db=Depends(get_db),
):
    # 프록시 조회
    res = (
        db.table("proxy_pool")
        .select("id, proxy_url, is_active")
        .eq("id", body.proxy_id)
        .eq("user_id", user_id)
        .single()
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="프록시를 찾을 수 없습니다.")

    proxy_row = res.data
    proxy_url = proxy_row["proxy_url"]

    # Playwright 연결 테스트
    try:
        from playwright.async_api import async_playwright

        start = time.monotonic()
        async with async_playwright() as p:
            browser = await p.chromium.launch(
                headless=True,
                proxy={"server": proxy_url},
            )
            ctx = await browser.new_context()
            page = await ctx.new_page()
            await page.goto(body.target_url, timeout=15_000)
            await browser.close()

        latency_ms = int((time.monotonic() - start) * 1000)

        # 성공 → fail_count 초기화, last_used_at 갱신
        db.table("proxy_pool").update(
            {"fail_count": 0, "is_active": True, "last_used_at": "NOW()"}
        ).eq("id", body.proxy_id).execute()

        return TestProxyResponse(success=True, latency_ms=latency_ms)

    except Exception as exc:
        logger.warning("프록시 테스트 실패 [%s]: %s", proxy_url, exc)

        # 실패 → fail_count 증가, 3회 이상 자동 비활성화
        fail_count = int(
            (
                db.table("proxy_pool")
                .select("fail_count")
                .eq("id", body.proxy_id)
                .single()
                .execute()
            ).data.get("fail_count", 0) or 0
        ) + 1
        db.table("proxy_pool").update(
            {
                "fail_count": fail_count,
                "is_active": fail_count < 3,
            }
        ).eq("id", body.proxy_id).execute()

        return TestProxyResponse(success=False, error=str(exc))
