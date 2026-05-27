"""
services/proxy_manager.py
프록시 풀 관리

기능:
  - proxy_pool 테이블에서 활성 프록시 라운드로빈 선택
  - Playwright proxy 파라미터 형태 변환
  - fail_count 관리 (3회 이상 자동 비활성화)
  - last_used_at 갱신
"""

from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Optional

from supabase import Client


class ProxyManager:
    """
    proxy_pool 테이블 기반 프록시 풀 관리자.

    사용 예:
        manager = ProxyManager(db=get_db())
        proxy_cfg = manager.get_playwright_proxy(user_id, proxy_id)
    """

    FAIL_THRESHOLD = 3   # 이 횟수 이상 실패 시 자동 비활성화

    def __init__(self, db: Client):
        self.db = db

    # ─────────────────────────────────────────────────────────
    # 프록시 선택
    # ─────────────────────────────────────────────────────────

    def get_proxy(
        self,
        user_id: str,
        proxy_id: Optional[str] = None,
    ) -> Optional[dict]:
        """
        사용할 프록시 행을 반환합니다.
        - proxy_id 지정 시: 해당 프록시 (비활성 상태여도 반환, 호출자가 판단)
        - 미지정 시: 라운드로빈 (last_used_at 가장 오래된 활성 프록시)
        반환값: proxy_pool 행 dict, 없으면 None
        """
        if proxy_id:
            result = (
                self.db.table("proxy_pool")
                .select("*")
                .eq("id", proxy_id)
                .eq("user_id", user_id)
                .limit(1)
                .execute()
            )
        else:
            result = (
                self.db.table("proxy_pool")
                .select("*")
                .eq("user_id", user_id)
                .eq("is_active", True)
                .order("last_used_at", desc=False, nullsfirst=True)
                .limit(1)
                .execute()
            )

        if not result.data:
            return None
        return result.data[0]

    def get_playwright_proxy(
        self,
        user_id: str,
        proxy_id: Optional[str] = None,
    ) -> Optional[dict]:
        """
        Playwright launch(proxy=...) 에 전달할 dict 반환.
        프록시 없음 → None (직접 연결)

        반환 형태:
            {
                "server":   "http://host:port",
                "username": "user",   # 인증 있는 경우
                "password": "pass",
            }
        """
        row = self.get_proxy(user_id, proxy_id)
        if not row:
            return None
        return self._parse_proxy_url(row["proxy_url"])

    @staticmethod
    def _parse_proxy_url(proxy_url: str) -> dict:
        """
        "http://user:pass@host:port" → Playwright proxy dict
        "socks5://host:port" → { server: "socks5://host:port" }
        """
        # 인증 정보 포함 여부 파악
        pattern = re.compile(
            r"(?P<scheme>[a-z0-9+]+)://"
            r"(?:(?P<user>[^:@]+):(?P<pw>[^@]+)@)?"
            r"(?P<host>[^:]+):(?P<port>\d+)"
        )
        m = pattern.match(proxy_url)
        if not m:
            return {"server": proxy_url}

        scheme = m.group("scheme")
        host   = m.group("host")
        port   = m.group("port")
        user   = m.group("user")
        pw     = m.group("pw")

        server = f"{scheme}://{host}:{port}"
        result: dict = {"server": server}
        if user:
            result["username"] = user
        if pw:
            result["password"] = pw
        return result

    # ─────────────────────────────────────────────────────────
    # 성공 / 실패 처리
    # ─────────────────────────────────────────────────────────

    def mark_success(self, proxy_id: str) -> None:
        """프록시 성공: fail_count 초기화, last_used_at 갱신."""
        self.db.table("proxy_pool").update(
            {
                "fail_count":    0,
                "last_used_at":  datetime.now(timezone.utc).isoformat(),
            }
        ).eq("id", proxy_id).execute()

    def mark_failed(self, proxy_id: str) -> None:
        """
        프록시 실패: fail_count 증가.
        FAIL_THRESHOLD 이상이면 is_active=false 로 자동 비활성화.
        """
        # 현재 fail_count 조회
        result = (
            self.db.table("proxy_pool")
            .select("fail_count")
            .eq("id", proxy_id)
            .single()
            .execute()
        )
        if not result.data:
            return

        new_count = (result.data.get("fail_count") or 0) + 1
        update: dict = {"fail_count": new_count}
        if new_count >= self.FAIL_THRESHOLD:
            update["is_active"] = False

        self.db.table("proxy_pool").update(update).eq("id", proxy_id).execute()

    # ─────────────────────────────────────────────────────────
    # 프록시 CRUD (라우터에서 직접 호출)
    # ─────────────────────────────────────────────────────────

    def list_proxies(self, user_id: str) -> list[dict]:
        result = (
            self.db.table("proxy_pool")
            .select("id, proxy_url, proxy_type, label, is_active, fail_count, last_used_at, created_at")
            .eq("user_id", user_id)
            .order("created_at", desc=False)
            .execute()
        )
        return result.data

    def add_proxy(
        self,
        user_id: str,
        proxy_url: str,
        proxy_type: str = "http",
        label: Optional[str] = None,
    ) -> dict:
        result = (
            self.db.table("proxy_pool")
            .insert(
                {
                    "user_id":    user_id,
                    "proxy_url":  proxy_url,
                    "proxy_type": proxy_type,
                    "label":      label,
                    "is_active":  True,
                    "fail_count": 0,
                }
            )
            .execute()
        )
        return result.data[0]

    def delete_proxy(self, proxy_id: str, user_id: str) -> bool:
        self.db.table("proxy_pool").delete().eq("id", proxy_id).eq("user_id", user_id).execute()
        return True

    async def test_proxy(self, proxy_id: str, user_id: str, target_url: str) -> dict:
        """Playwright로 프록시 실제 접속 테스트."""
        import time

        row = self.get_proxy(user_id, proxy_id)
        if not row:
            return {"success": False, "error": "프록시를 찾을 수 없습니다."}

        proxy_cfg = self._parse_proxy_url(row["proxy_url"])
        start = time.monotonic()

        try:
            from playwright.async_api import async_playwright
            async with async_playwright() as p:
                browser = await p.chromium.launch(
                    headless=True,
                    proxy=proxy_cfg,
                    args=["--no-sandbox"],
                )
                page = await browser.new_page()
                resp = await page.goto(target_url, timeout=20_000)
                latency_ms = int((time.monotonic() - start) * 1000)
                await browser.close()

                if resp and resp.ok:
                    self.mark_success(proxy_id)
                    return {"success": True, "latency_ms": latency_ms}
                return {"success": False, "error": f"HTTP {resp.status if resp else 'N/A'}"}

        except Exception as e:
            self.mark_failed(proxy_id)
            return {"success": False, "error": str(e)}
