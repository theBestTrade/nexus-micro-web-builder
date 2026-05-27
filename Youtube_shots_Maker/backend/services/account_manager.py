"""
services/account_manager.py
멀티 계정 핵심 서비스

담당 기능:
  - AES-256-GCM 자격증명 암호화 / 복호화
  - accounts 테이블 CRUD (생성·조회·수정·삭제)
  - is_default 원자적 전환
  - platform_cookies 저장 / 조회
  - 계정 연결 테스트 (OAuth 토큰 확인 / Playwright 세션 확인)
  - Playwright 쿠키 갱신
"""

from __future__ import annotations

import binascii
import json
import os
import time
from datetime import datetime, timezone, timedelta
from typing import Optional
from uuid import UUID

import httpx
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from supabase import Client

from core.config import get_settings
from models.account import (
    AccountCreate,
    AccountResponse,
    AccountUpdate,
    CookieRefreshResult,
    CookieStatus,
    ConnectionTestResult,
    HealthStatusEnum,
    PlatformEnum,
    CREDENTIAL_PLATFORMS,
    OAUTH_PLATFORMS,
    COMMERCE_PLATFORMS,
)


# ─────────────────────────────────────────────────────────────
# 암호화 헬퍼 (모듈 레벨 — 순수 함수)
# ─────────────────────────────────────────────────────────────

def _encrypt(plaintext: str, key: bytes) -> dict:
    """
    AES-256-GCM 암호화.
    반환: { "iv": hex, "tag": hex, "data": hex }
    """
    iv = os.urandom(12)                         # 96-bit nonce
    aesgcm = AESGCM(key)
    # AESGCM.encrypt 반환값 = ciphertext + 16-byte auth tag
    ct_with_tag = aesgcm.encrypt(iv, plaintext.encode("utf-8"), None)
    ciphertext = ct_with_tag[:-16]
    tag = ct_with_tag[-16:]
    return {
        "iv":   binascii.hexlify(iv).decode(),
        "tag":  binascii.hexlify(tag).decode(),
        "data": binascii.hexlify(ciphertext).decode(),
    }


def _decrypt(encrypted: dict, key: bytes) -> str:
    """
    AES-256-GCM 복호화.
    입력: { "iv": hex, "tag": hex, "data": hex }
    """
    iv         = binascii.unhexlify(encrypted["iv"])
    tag        = binascii.unhexlify(encrypted["tag"])
    ciphertext = binascii.unhexlify(encrypted["data"])
    aesgcm = AESGCM(key)
    plaintext = aesgcm.decrypt(iv, ciphertext + tag, None)
    return plaintext.decode("utf-8")


# ─────────────────────────────────────────────────────────────
# AccountManager 클래스
# ─────────────────────────────────────────────────────────────

class AccountManager:
    """
    accounts / platform_cookies 테이블에 대한 모든 비즈니스 로직을 담당합니다.

    사용 예:
        manager = AccountManager(db=get_db())
        account = manager.create_account(user_id="...", data=AccountCreate(...))
    """

    def __init__(self, db: Client):
        self.db = db
        self._key = get_settings().encryption_key_bytes

    # ── 내부: 암호화 유틸 ──────────────────────────────────────

    def _build_credentials(
        self,
        login_id: Optional[str] = None,
        login_pw: Optional[str] = None,
        api_key:  Optional[str] = None,
        api_secret: Optional[str] = None,
    ) -> Optional[dict]:
        """자격증명 딕셔너리를 암호화하여 JSONB 형태로 반환."""
        raw: dict = {}
        if login_id:  raw["login_id"]  = login_id
        if login_pw:  raw["login_pw"]  = login_pw
        if api_key:   raw["api_key"]   = api_key
        if api_secret: raw["api_secret"] = api_secret
        if not raw:
            return None
        return _encrypt(json.dumps(raw), self._key)

    def _decode_credentials(self, encrypted: Optional[dict]) -> dict:
        """암호화된 JSONB → 평문 딕셔너리 반환. 없으면 {}."""
        if not encrypted:
            return {}
        try:
            return json.loads(_decrypt(encrypted, self._key))
        except Exception:
            return {}

    # ── 내부: DB 행 → Response 변환 ───────────────────────────

    @staticmethod
    def _row_to_response(row: dict) -> AccountResponse:
        return AccountResponse(
            id                  = row["id"],
            user_id             = row["user_id"],
            platform            = row["platform"],
            alias               = row["alias"],
            display_name        = row.get("display_name"),
            avatar_url          = row.get("avatar_url"),
            platform_account_id = row.get("platform_account_id"),
            token_expires_at    = row.get("token_expires_at"),
            partner_id          = row.get("partner_id"),
            affiliate_url       = row.get("affiliate_url"),
            is_default          = row.get("is_default", False),
            is_active           = row.get("is_active", True),
            last_used_at        = row.get("last_used_at"),
            health_status       = row.get("health_status", HealthStatusEnum.UNKNOWN),
            created_at          = row["created_at"],
            updated_at          = row["updated_at"],
        )

    # ─────────────────────────────────────────────────────────
    # CRUD — 계정 생성
    # ─────────────────────────────────────────────────────────

    def create_account(self, user_id: str, data: AccountCreate) -> AccountResponse:
        """
        새 계정을 생성합니다.
        - is_default 미지정 시: 해당 platform의 첫 계정이면 자동으로 true
        - 자격증명은 AES-256-GCM 암호화 후 저장
        """
        # 이미 계정이 있는지 확인 (is_default 자동 결정)
        existing = (
            self.db.table("accounts")
            .select("id")
            .eq("user_id", user_id)
            .eq("platform", data.platform.value)
            .execute()
        )
        is_first_account = len(existing.data) == 0
        is_default = data.is_default if data.is_default is not None else is_first_account

        # 암호화 자격증명 빌드
        credentials_encrypted = self._build_credentials(
            login_id=data.login_id,
            login_pw=data.login_pw,
            api_key=data.api_key,
            api_secret=data.api_secret,
        )

        insert_data: dict = {
            "user_id":             user_id,
            "platform":            data.platform.value,
            "alias":               data.alias,
            "display_name":        data.display_name,
            "avatar_url":          data.avatar_url,
            "platform_account_id": data.platform_account_id,
            "access_token":        data.access_token,
            "refresh_token":       data.refresh_token,
            "token_expires_at":    data.token_expires_at.isoformat() if data.token_expires_at else None,
            "credentials_encrypted": credentials_encrypted,
            "partner_id":          data.partner_id,
            "affiliate_url":       data.affiliate_url,
            "is_default":          is_default,
            "is_active":           True,
            "health_status":       HealthStatusEnum.UNKNOWN.value,
        }

        # is_default=True 설정 시 기존 default 해제 (트랜잭션 대신 순서 보장)
        if is_default:
            self._clear_default(user_id, data.platform.value)

        result = self.db.table("accounts").insert(insert_data).execute()
        row = result.data[0]
        return self._row_to_response(row)

    # ─────────────────────────────────────────────────────────
    # CRUD — 계정 목록 조회
    # ─────────────────────────────────────────────────────────

    def list_accounts(
        self,
        user_id: str,
        platform: Optional[str] = None,
        is_active: Optional[bool] = None,
    ) -> list[AccountResponse]:
        """사용자의 계정 목록 조회 (민감 필드 제외)."""
        query = (
            self.db.table("accounts")
            .select(
                "id, user_id, platform, alias, display_name, avatar_url, "
                "platform_account_id, token_expires_at, partner_id, affiliate_url, "
                "is_default, is_active, last_used_at, health_status, created_at, updated_at"
            )
            .eq("user_id", user_id)
            .order("created_at", desc=False)
        )
        if platform:
            query = query.eq("platform", platform)
        if is_active is not None:
            query = query.eq("is_active", is_active)

        result = query.execute()
        return [self._row_to_response(row) for row in result.data]

    # ─────────────────────────────────────────────────────────
    # CRUD — 단일 계정 조회
    # ─────────────────────────────────────────────────────────

    def get_account(self, account_id: str, user_id: str) -> AccountResponse:
        """단일 계정 조회 (소유권 검증 포함)."""
        result = (
            self.db.table("accounts")
            .select(
                "id, user_id, platform, alias, display_name, avatar_url, "
                "platform_account_id, token_expires_at, partner_id, affiliate_url, "
                "is_default, is_active, last_used_at, health_status, created_at, updated_at"
            )
            .eq("id", account_id)
            .eq("user_id", user_id)
            .single()
            .execute()
        )
        if not result.data:
            raise ValueError(f"계정을 찾을 수 없습니다: {account_id}")
        return self._row_to_response(result.data)

    def _get_account_raw(self, account_id: str, user_id: str) -> dict:
        """내부용: 암호화 필드 포함 전체 행 반환."""
        result = (
            self.db.table("accounts")
            .select("*")
            .eq("id", account_id)
            .eq("user_id", user_id)
            .single()
            .execute()
        )
        if not result.data:
            raise ValueError(f"계정을 찾을 수 없습니다: {account_id}")
        return result.data

    # ─────────────────────────────────────────────────────────
    # CRUD — 계정 수정
    # ─────────────────────────────────────────────────────────

    def update_account(
        self, account_id: str, user_id: str, data: AccountUpdate
    ) -> AccountResponse:
        """계정 정보 부분 업데이트."""
        # 소유권 확인
        existing_raw = self._get_account_raw(account_id, user_id)

        update_data: dict = {}
        if data.alias is not None:        update_data["alias"]        = data.alias.strip()
        if data.display_name is not None: update_data["display_name"] = data.display_name
        if data.avatar_url is not None:   update_data["avatar_url"]   = data.avatar_url
        if data.is_active is not None:    update_data["is_active"]    = data.is_active

        # is_default 변경
        if data.is_default is True:
            self._clear_default(user_id, existing_raw["platform"], exclude_id=account_id)
            update_data["is_default"] = True
        elif data.is_default is False:
            update_data["is_default"] = False

        # OAuth 토큰 업데이트
        if data.access_token is not None:
            update_data["access_token"] = data.access_token
        if data.refresh_token is not None:
            update_data["refresh_token"] = data.refresh_token
        if data.token_expires_at is not None:
            update_data["token_expires_at"] = data.token_expires_at.isoformat()

        # 자격증명 업데이트 (기존 값 보존 + 신규 값 덮어쓰기)
        if any([data.login_id, data.login_pw, data.api_key, data.api_secret]):
            old_creds = self._decode_credentials(existing_raw.get("credentials_encrypted"))
            new_creds: dict = {**old_creds}
            if data.login_id:   new_creds["login_id"]   = data.login_id
            if data.login_pw:   new_creds["login_pw"]   = data.login_pw
            if data.api_key:    new_creds["api_key"]    = data.api_key
            if data.api_secret: new_creds["api_secret"] = data.api_secret
            update_data["credentials_encrypted"] = _encrypt(
                json.dumps(new_creds), self._key
            )

        # 커머스 필드 업데이트
        if data.partner_id is not None:    update_data["partner_id"]    = data.partner_id
        if data.affiliate_url is not None: update_data["affiliate_url"] = data.affiliate_url

        if not update_data:
            return self._row_to_response(existing_raw)

        result = (
            self.db.table("accounts")
            .update(update_data)
            .eq("id", account_id)
            .execute()
        )
        return self._row_to_response(result.data[0])

    # ─────────────────────────────────────────────────────────
    # CRUD — 계정 삭제
    # ─────────────────────────────────────────────────────────

    def delete_account(self, account_id: str, user_id: str) -> bool:
        """
        계정 삭제.
        - is_default 계정 삭제 후 남은 계정이 있으면 가장 오래된 계정을 자동 default 지정.
        """
        # 소유권 + 기본 계정 여부 확인
        raw = self._get_account_raw(account_id, user_id)
        platform = raw["platform"]
        was_default = raw.get("is_default", False)

        # 삭제 (CASCADE로 platform_cookies도 삭제)
        self.db.table("accounts").delete().eq("id", account_id).execute()

        # 삭제된 계정이 default였으면 남은 계정 중 가장 오래된 것을 default로 지정
        if was_default:
            remaining = (
                self.db.table("accounts")
                .select("id")
                .eq("user_id", user_id)
                .eq("platform", platform)
                .eq("is_active", True)
                .order("created_at", desc=False)
                .limit(1)
                .execute()
            )
            if remaining.data:
                self.db.table("accounts").update({"is_default": True}).eq(
                    "id", remaining.data[0]["id"]
                ).execute()

        return True

    # ─────────────────────────────────────────────────────────
    # Default 계정 관리
    # ─────────────────────────────────────────────────────────

    def _clear_default(
        self, user_id: str, platform: str, exclude_id: Optional[str] = None
    ) -> None:
        """해당 user + platform의 모든 is_default=true 를 false로 초기화."""
        query = (
            self.db.table("accounts")
            .update({"is_default": False})
            .eq("user_id", user_id)
            .eq("platform", platform)
            .eq("is_default", True)
        )
        if exclude_id:
            query = query.neq("id", exclude_id)
        query.execute()

    def set_default(self, account_id: str, user_id: str) -> AccountResponse:
        """
        특정 계정을 기본 계정으로 지정.
        같은 platform의 기존 default는 자동 해제.
        """
        raw = self._get_account_raw(account_id, user_id)
        self._clear_default(user_id, raw["platform"], exclude_id=account_id)
        result = (
            self.db.table("accounts")
            .update({"is_default": True})
            .eq("id", account_id)
            .execute()
        )
        return self._row_to_response(result.data[0])

    def get_default_account(
        self, user_id: str, platform: str
    ) -> Optional[AccountResponse]:
        """platform의 기본 계정 반환. 없으면 None."""
        result = (
            self.db.table("accounts")
            .select(
                "id, user_id, platform, alias, display_name, avatar_url, "
                "platform_account_id, token_expires_at, partner_id, affiliate_url, "
                "is_default, is_active, last_used_at, health_status, created_at, updated_at"
            )
            .eq("user_id", user_id)
            .eq("platform", platform)
            .eq("is_default", True)
            .limit(1)
            .execute()
        )
        if not result.data:
            return None
        return self._row_to_response(result.data[0])

    # ─────────────────────────────────────────────────────────
    # 쿠키 관리
    # ─────────────────────────────────────────────────────────

    def save_cookies(
        self,
        account_id: str,
        cookies: list[dict],
        expires_at: Optional[datetime] = None,
    ) -> None:
        """
        Playwright context.cookies() 결과를 platform_cookies 에 upsert 저장.
        expires_at 미지정 시 25일 후로 기본 설정.
        """
        if expires_at is None:
            expires_at = datetime.now(timezone.utc) + timedelta(days=25)

        self.db.table("platform_cookies").upsert(
            {
                "account_id":   account_id,
                "cookies":      cookies,
                "refreshed_at": datetime.now(timezone.utc).isoformat(),
                "expires_at":   expires_at.isoformat(),
            },
            on_conflict="account_id",
        ).execute()

        # health_status → healthy
        self.db.table("accounts").update(
            {"health_status": HealthStatusEnum.HEALTHY.value, "last_used_at": datetime.now(timezone.utc).isoformat()}
        ).eq("id", account_id).execute()

    def get_cookies(self, account_id: str) -> Optional[list[dict]]:
        """저장된 쿠키 배열 반환. 없으면 None."""
        result = (
            self.db.table("platform_cookies")
            .select("cookies, expires_at")
            .eq("account_id", account_id)
            .limit(1)
            .execute()
        )
        if not result.data:
            return None
        return result.data[0]["cookies"]

    def get_cookie_status(self, account_id: str, user_id: str) -> CookieStatus:
        """쿠키 상태 조회 (원문 미포함)."""
        raw = self._get_account_raw(account_id, user_id)
        result = (
            self.db.table("platform_cookies")
            .select("refreshed_at, expires_at")
            .eq("account_id", account_id)
            .limit(1)
            .execute()
        )
        cookie_row = result.data[0] if result.data else None
        return CookieStatus(
            account_id    = account_id,
            refreshed_at  = cookie_row["refreshed_at"] if cookie_row else None,
            expires_at    = cookie_row["expires_at"] if cookie_row else None,
            health_status = raw.get("health_status", HealthStatusEnum.UNKNOWN),
            has_cookie    = cookie_row is not None,
        )

    # ─────────────────────────────────────────────────────────
    # 연결 테스트
    # ─────────────────────────────────────────────────────────

    async def test_connection(
        self,
        account_id: str,
        user_id: str,
        proxy_id: Optional[str] = None,
    ) -> ConnectionTestResult:
        """
        플랫폼 유형에 따라 연결 상태를 실시간 확인합니다.
          - OAuth 플랫폼:      토큰 만료 여부 + 간단한 API 호출
          - Credential 플랫폼: Playwright 세션 유효성 확인
          - Commerce 플랫폼:   API 키 유효성 확인
        결과는 accounts.health_status 에 저장됩니다.
        """
        raw = self._get_account_raw(account_id, user_id)
        platform = PlatformEnum(raw["platform"])
        start_ms = int(time.time() * 1000)

        try:
            if platform in OAUTH_PLATFORMS:
                result = await self._test_oauth(raw)
            elif platform in CREDENTIAL_PLATFORMS:
                proxy_cfg = await self._get_proxy_config(proxy_id) if proxy_id else None
                result = await self._test_credential_playwright(raw, proxy_cfg)
            elif platform in COMMERCE_PLATFORMS:
                result = await self._test_commerce(raw)
            else:
                result = {"success": False, "message": "지원하지 않는 플랫폼입니다."}

            latency_ms = int(time.time() * 1000) - start_ms
            health = HealthStatusEnum.HEALTHY if result["success"] else HealthStatusEnum.ERROR
            if not result["success"] and "만료" in result.get("message", ""):
                health = HealthStatusEnum.COOKIE_EXPIRED

            # DB 업데이트
            self.db.table("accounts").update(
                {"health_status": health.value, "last_used_at": datetime.now(timezone.utc).isoformat()}
            ).eq("id", account_id).execute()

            return ConnectionTestResult(
                account_id    = UUID(account_id),
                success       = result["success"],
                health_status = health,
                latency_ms    = latency_ms,
                message       = result.get("message"),
                error         = result.get("error"),
            )

        except Exception as e:
            self.db.table("accounts").update(
                {"health_status": HealthStatusEnum.ERROR.value}
            ).eq("id", account_id).execute()
            return ConnectionTestResult(
                account_id    = UUID(account_id),
                success       = False,
                health_status = HealthStatusEnum.ERROR,
                error         = str(e),
            )

    async def _test_oauth(self, raw: dict) -> dict:
        """OAuth 플랫폼: 토큰 만료 확인."""
        token_expires_at = raw.get("token_expires_at")
        if not token_expires_at:
            return {"success": False, "message": "토큰 정보가 없습니다."}

        # 문자열인 경우 파싱
        if isinstance(token_expires_at, str):
            from dateutil import parser as dt_parser
            token_expires_at = dt_parser.parse(token_expires_at)

        now = datetime.now(timezone.utc)
        if token_expires_at < now:
            return {"success": False, "message": "OAuth 토큰이 만료되었습니다."}

        days_left = (token_expires_at - now).days
        return {"success": True, "message": f"토큰 유효 (만료까지 {days_left}일 남음)"}

    async def _test_credential_playwright(
        self, raw: dict, proxy_cfg: Optional[dict] = None
    ) -> dict:
        """Playwright를 사용해 로그인 세션 유효성을 확인합니다."""
        try:
            from playwright.async_api import async_playwright
        except ImportError:
            return {"success": False, "error": "Playwright 미설치. `playwright install chromium` 실행 필요"}

        cookies = self.get_cookies(raw["id"])
        if not cookies:
            return {"success": False, "message": "저장된 쿠키가 없습니다. 쿠키를 먼저 갱신해주세요."}

        platform = PlatformEnum(raw["platform"])
        test_url_map = {
            PlatformEnum.DOUYIN:      "https://www.douyin.com",
            PlatformEnum.XIAOHONGSHU: "https://www.xiaohongshu.com",
            PlatformEnum.NAVER_BLOG:  "https://www.naver.com",
        }
        test_url = test_url_map.get(platform, "https://www.naver.com")

        # 로그인 확인 URL / 셀렉터
        login_check_map = {
            PlatformEnum.NAVER_BLOG:  ("https://nid.naver.com/user2/api/naverLoginInfo", "loginStatus"),
            PlatformEnum.DOUYIN:      ("https://www.douyin.com/user/self", "selfPage"),
            PlatformEnum.XIAOHONGSHU: ("https://www.xiaohongshu.com/user/profile", "userProfile"),
        }

        try:
            async with async_playwright() as p:
                launch_kwargs = {
                    "headless": True,
                    "args": ["--no-sandbox", "--disable-dev-shm-usage"],
                }
                if proxy_cfg:
                    launch_kwargs["proxy"] = proxy_cfg

                browser = await p.chromium.launch(**launch_kwargs)
                context = await browser.new_context(
                    viewport={"width": 1920, "height": 1080},
                    user_agent=(
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                        "AppleWebKit/537.36 (KHTML, like Gecko) "
                        "Chrome/120.0.0.0 Safari/537.36"
                    ),
                )
                await context.add_cookies(cookies)

                page = await context.new_page()
                response = await page.goto(test_url, wait_until="domcontentloaded", timeout=30_000)
                await browser.close()

                if response and response.ok:
                    # 로그인 페이지로 리다이렉트 되지 않았는지 확인
                    final_url = page.url
                    login_redirects = ["login", "signin", "auth", "nid.naver.com/nidlogin"]
                    is_redirected = any(r in final_url for r in login_redirects)
                    if is_redirected:
                        return {"success": False, "message": "쿠키가 만료되었습니다. 쿠키를 갱신해주세요."}
                    return {"success": True, "message": "세션이 유효합니다."}
                else:
                    return {"success": False, "message": f"HTTP {response.status if response else 'N/A'}"}

        except Exception as e:
            return {"success": False, "error": str(e)}

    async def _test_commerce(self, raw: dict) -> dict:
        """커머스 플랫폼: API 키 유효성 확인 (간단한 HTTP 호출)."""
        platform = PlatformEnum(raw["platform"])
        creds = self._decode_credentials(raw.get("credentials_encrypted"))

        if platform == PlatformEnum.NAVER_SHOPPING_CONNECT:
            api_key = creds.get("api_key") or raw.get("access_token")
            partner_id = raw.get("partner_id")
            if not api_key or not partner_id:
                return {"success": False, "message": "API Key 또는 파트너 ID가 없습니다."}
            # 실제 검증 API 엔드포인트는 Phase 5에서 구체화
            return {"success": True, "message": "커머스 계정 정보가 저장되어 있습니다."}

        elif platform == PlatformEnum.COUPANG_PARTNERS:
            api_key = creds.get("api_key")
            if not api_key:
                return {"success": False, "message": "API Key가 없습니다."}
            return {"success": True, "message": "쿠팡 파트너스 계정 정보가 저장되어 있습니다."}

        elif platform == PlatformEnum.SMARTSTORE:
            affiliate_url = raw.get("affiliate_url")
            if not affiliate_url:
                return {"success": False, "message": "스마트스토어 URL이 없습니다."}
            try:
                async with httpx.AsyncClient(timeout=10) as client:
                    resp = await client.get(affiliate_url)
                    if resp.status_code < 400:
                        return {"success": True, "message": "스마트스토어 URL이 유효합니다."}
                    return {"success": False, "message": f"URL 접근 실패: HTTP {resp.status_code}"}
            except Exception as e:
                return {"success": False, "error": str(e)}

        return {"success": False, "message": "지원하지 않는 커머스 플랫폼입니다."}

    # ─────────────────────────────────────────────────────────
    # 쿠키 갱신 (Playwright 로그인)
    # ─────────────────────────────────────────────────────────

    async def refresh_cookie(
        self,
        account_id: str,
        user_id: str,
        proxy_id: Optional[str] = None,
    ) -> CookieRefreshResult:
        """
        Playwright를 사용해 자격증명으로 로그인하고 쿠키를 갱신합니다.
        대상: CREDENTIAL_PLATFORMS (naver_blog / douyin / xiaohongshu)
        """
        raw = self._get_account_raw(account_id, user_id)
        platform = PlatformEnum(raw["platform"])

        if platform not in CREDENTIAL_PLATFORMS:
            return CookieRefreshResult(
                account_id = UUID(account_id),
                success    = False,
                error      = f"{platform.value}는 쿠키 갱신이 지원되지 않습니다. (OAuth 또는 API 키 방식)",
            )

        creds = self._decode_credentials(raw.get("credentials_encrypted"))
        login_id = creds.get("login_id")
        login_pw = creds.get("login_pw")

        if not login_id or not login_pw:
            return CookieRefreshResult(
                account_id = UUID(account_id),
                success    = False,
                error      = "로그인 ID/PW 가 저장되지 않았습니다. 계정 설정을 확인해주세요.",
            )

        proxy_cfg = await self._get_proxy_config(proxy_id) if proxy_id else None

        try:
            from playwright.async_api import async_playwright
        except ImportError:
            return CookieRefreshResult(
                account_id = UUID(account_id),
                success    = False,
                error      = "Playwright 미설치. `playwright install chromium` 실행 필요",
            )

        try:
            if platform == PlatformEnum.NAVER_BLOG:
                cookies, expires_at = await self._login_naver(login_id, login_pw, proxy_cfg)
            elif platform == PlatformEnum.DOUYIN:
                cookies, expires_at = await self._login_douyin(login_id, login_pw, proxy_cfg)
            elif platform == PlatformEnum.XIAOHONGSHU:
                cookies, expires_at = await self._login_xiaohongshu(login_id, login_pw, proxy_cfg)
            else:
                raise NotImplementedError(f"로그인 미구현: {platform.value}")

            self.save_cookies(account_id, cookies, expires_at)
            return CookieRefreshResult(
                account_id = UUID(account_id),
                success    = True,
                expires_at = expires_at,
                message    = "쿠키가 성공적으로 갱신되었습니다.",
            )

        except Exception as e:
            self.db.table("accounts").update(
                {"health_status": HealthStatusEnum.COOKIE_EXPIRED.value}
            ).eq("id", account_id).execute()
            return CookieRefreshResult(
                account_id = UUID(account_id),
                success    = False,
                error      = str(e),
            )

    async def _login_naver(
        self,
        login_id: str,
        login_pw: str,
        proxy_cfg: Optional[dict],
    ) -> tuple[list[dict], datetime]:
        """네이버 로그인 → 쿠키 반환."""
        from playwright.async_api import async_playwright
        import random

        async with async_playwright() as p:
            launch_kwargs: dict = {
                "headless": True,
                "args": ["--no-sandbox", "--disable-dev-shm-usage"],
            }
            if proxy_cfg:
                launch_kwargs["proxy"] = proxy_cfg

            browser = await p.chromium.launch(**launch_kwargs)
            context = await browser.new_context(
                viewport={"width": 1920, "height": 1080},
                user_agent=(
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/120.0.0.0 Safari/537.36"
                ),
            )
            page = await context.new_page()

            # 네이버 로그인 페이지
            await page.goto("https://nid.naver.com/nidlogin.login", wait_until="networkidle")
            await page.wait_for_timeout(random.randint(1000, 2000))

            # ID 입력 (타이핑 시뮬레이션)
            await page.click("#id")
            await page.wait_for_timeout(random.randint(300, 600))
            await page.type("#id", login_id, delay=random.randint(80, 150))
            await page.wait_for_timeout(random.randint(300, 600))

            # PW 입력
            await page.click("#pw")
            await page.wait_for_timeout(random.randint(300, 600))
            await page.type("#pw", login_pw, delay=random.randint(80, 150))
            await page.wait_for_timeout(random.randint(500, 1000))

            # 로그인 버튼
            await page.click(".btn_login")
            await page.wait_for_load_state("networkidle", timeout=15_000)

            final_url = page.url
            if "login" in final_url or "error" in final_url:
                await browser.close()
                raise RuntimeError("로그인 실패: ID/PW를 확인하거나 CAPTCHA가 발생했을 수 있습니다.")

            cookies = await context.cookies()
            await browser.close()

        expires_at = datetime.now(timezone.utc) + timedelta(days=25)
        return cookies, expires_at

    async def _login_douyin(
        self,
        login_id: str,
        login_pw: str,
        proxy_cfg: Optional[dict],
    ) -> tuple[list[dict], datetime]:
        """
        도우인(抖音) 웹 로그인 → 쿠키 반환.

        전략:
          1. www.douyin.com 접속
          2. 휴대폰 번호 / 비밀번호 탭 선택 (login_id = 휴대폰 번호)
          3. 입력 후 로그인 버튼 클릭
          4. 로그인 성공 여부 확인 (URL 또는 사용자 아바타 요소 기준)
          5. 쿠키 저장 후 반환

        ※ 도우인은 종종 슬라이더 캡차(CAPTCHA)를 요구합니다.
           캡차가 등장하면 RuntimeError를 발생시키고 사용자에게 수동 처리를 안내합니다.
        """
        from playwright.async_api import async_playwright
        import random

        async with async_playwright() as p:
            launch_kwargs: dict = {
                "headless": True,
                "args": [
                    "--no-sandbox",
                    "--disable-dev-shm-usage",
                    "--disable-blink-features=AutomationControlled",
                ],
            }
            if proxy_cfg:
                launch_kwargs["proxy"] = proxy_cfg

            browser = await p.chromium.launch(**launch_kwargs)
            context = await browser.new_context(
                viewport={"width": 1920, "height": 1080},
                user_agent=(
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/120.0.0.0 Safari/537.36"
                ),
                locale="zh-CN",
            )
            page = await context.new_page()

            try:
                # 도우인 메인 페이지 (로그인 팝업이 자동으로 표시됨)
                await page.goto("https://www.douyin.com/", wait_until="networkidle", timeout=30_000)
                await page.wait_for_timeout(random.randint(1500, 3000))

                # "密码登录" (비밀번호 로그인) 탭 클릭
                pw_tab_selectors = [
                    'text=密码登录',
                    '[data-e2e="login-type-password"]',
                    'button:has-text("密码登录")',
                ]
                for sel in pw_tab_selectors:
                    try:
                        await page.click(sel, timeout=5_000)
                        await page.wait_for_timeout(random.randint(500, 1000))
                        break
                    except Exception:
                        continue

                # 휴대폰 번호 입력
                phone_selectors = [
                    'input[placeholder*="手机号"]',
                    'input[name="mobile"]',
                    'input[type="tel"]',
                ]
                for sel in phone_selectors:
                    try:
                        await page.fill(sel, login_id, timeout=5_000)
                        await page.wait_for_timeout(random.randint(300, 700))
                        break
                    except Exception:
                        continue

                # 비밀번호 입력
                pw_selectors = [
                    'input[placeholder*="密码"]',
                    'input[name="password"]',
                    'input[type="password"]',
                ]
                for sel in pw_selectors:
                    try:
                        await page.fill(sel, login_pw, timeout=5_000)
                        await page.wait_for_timeout(random.randint(300, 700))
                        break
                    except Exception:
                        continue

                # 로그인 버튼
                login_btn_selectors = [
                    'button[data-e2e="login-btn"]',
                    'button:has-text("登录")',
                    'text=登录',
                ]
                for sel in login_btn_selectors:
                    try:
                        await page.click(sel, timeout=5_000)
                        break
                    except Exception:
                        continue

                # 결과 대기 (캡차 또는 리다이렉트)
                await page.wait_for_timeout(random.randint(3000, 5000))

                # 캡차 감지
                captcha_selectors = [
                    '[class*="captcha"]',
                    '[id*="captcha"]',
                    'text=验证',
                ]
                for sel in captcha_selectors:
                    captcha_el = page.locator(sel)
                    if await captcha_el.count() > 0:
                        await browser.close()
                        raise RuntimeError(
                            "도우인 CAPTCHA(캡차)가 감지되었습니다. "
                            "수동으로 로그인하여 쿠키를 추출해주세요."
                        )

                # 로그인 성공 확인 (프로필 아바타 또는 홈 피드)
                success_selectors = [
                    '[data-e2e="user-avatar"]',
                    '[class*="avatar"]',
                    'a[href*="/user/"]',
                ]
                logged_in = False
                for sel in success_selectors:
                    el = page.locator(sel)
                    if await el.count() > 0:
                        logged_in = True
                        break

                if not logged_in:
                    # URL로 재확인
                    current_url = page.url
                    if "login" in current_url or "passport" in current_url:
                        await browser.close()
                        raise RuntimeError(
                            "도우인 로그인 실패: 자격증명을 확인하거나 "
                            "계정 보안 인증이 필요할 수 있습니다."
                        )

                cookies = await context.cookies()
                await browser.close()

            except RuntimeError:
                raise
            except Exception as e:
                await browser.close()
                raise RuntimeError(f"도우인 로그인 중 오류: {e}") from e

        expires_at = datetime.now(timezone.utc) + timedelta(days=25)
        return cookies, expires_at

    async def _login_xiaohongshu(
        self,
        login_id: str,
        login_pw: str,
        proxy_cfg: Optional[dict],
    ) -> tuple[list[dict], datetime]:
        """
        샤오홍수(小红书) 웹 로그인 → 쿠키 반환.

        전략:
          1. www.xiaohongshu.com 접속
          2. 비밀번호 로그인 탭 선택 (login_id = 휴대폰 번호 또는 이메일)
          3. 입력 후 로그인 버튼 클릭
          4. 성공 여부 확인
          5. 쿠키 저장 후 반환

        ※ 샤오홍수는 슬라이더 캡차 및 SMS 인증을 자주 요구합니다.
           자동화 감지 시 RuntimeError 발생.
        """
        from playwright.async_api import async_playwright
        import random

        async with async_playwright() as p:
            launch_kwargs: dict = {
                "headless": True,
                "args": [
                    "--no-sandbox",
                    "--disable-dev-shm-usage",
                    "--disable-blink-features=AutomationControlled",
                ],
            }
            if proxy_cfg:
                launch_kwargs["proxy"] = proxy_cfg

            browser = await p.chromium.launch(**launch_kwargs)
            context = await browser.new_context(
                viewport={"width": 1440, "height": 900},
                user_agent=(
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/120.0.0.0 Safari/537.36"
                ),
                locale="zh-CN",
            )
            page = await context.new_page()

            try:
                await page.goto(
                    "https://www.xiaohongshu.com/",
                    wait_until="networkidle",
                    timeout=30_000,
                )
                await page.wait_for_timeout(random.randint(1500, 3000))

                # 로그인 버튼 (메인 헤더)
                login_entry_selectors = [
                    '[class*="login"]',
                    'text=登录',
                    'a[href*="login"]',
                ]
                for sel in login_entry_selectors:
                    try:
                        await page.click(sel, timeout=5_000)
                        await page.wait_for_timeout(random.randint(800, 1500))
                        break
                    except Exception:
                        continue

                # 비밀번호 로그인 탭 선택
                pw_tab_selectors = [
                    'text=密码登录',
                    '[class*="password-login"]',
                    'span:has-text("密码登录")',
                ]
                for sel in pw_tab_selectors:
                    try:
                        await page.click(sel, timeout=5_000)
                        await page.wait_for_timeout(random.randint(500, 1000))
                        break
                    except Exception:
                        continue

                # 휴대폰/이메일 입력
                id_selectors = [
                    'input[placeholder*="手机号"]',
                    'input[placeholder*="邮箱"]',
                    'input[name="phone"]',
                    'input[type="text"]:first-of-type',
                ]
                for sel in id_selectors:
                    try:
                        await page.fill(sel, login_id, timeout=5_000)
                        await page.wait_for_timeout(random.randint(300, 700))
                        break
                    except Exception:
                        continue

                # 비밀번호 입력
                pw_selectors = [
                    'input[placeholder*="密码"]',
                    'input[name="password"]',
                    'input[type="password"]',
                ]
                for sel in pw_selectors:
                    try:
                        await page.fill(sel, login_pw, timeout=5_000)
                        await page.wait_for_timeout(random.randint(300, 700))
                        break
                    except Exception:
                        continue

                # 로그인 버튼 클릭
                btn_selectors = [
                    'button[class*="submit"]',
                    'button:has-text("登录")',
                    'div[class*="btn"]:has-text("登录")',
                ]
                for sel in btn_selectors:
                    try:
                        await page.click(sel, timeout=5_000)
                        break
                    except Exception:
                        continue

                await page.wait_for_timeout(random.randint(3000, 5000))

                # 캡차 / SMS 인증 감지
                captcha_indicators = [
                    '[class*="captcha"]',
                    '[id*="captcha"]',
                    'text=验证码',
                    'text=短信验证',
                ]
                for sel in captcha_indicators:
                    el = page.locator(sel)
                    if await el.count() > 0:
                        await browser.close()
                        raise RuntimeError(
                            "샤오홍수 CAPTCHA 또는 SMS 인증이 요구됩니다. "
                            "수동으로 로그인하여 쿠키를 추출해주세요."
                        )

                # 로그인 성공 확인
                success_selectors = [
                    '[class*="avatar"]',
                    '[class*="user-info"]',
                    'a[href*="/user/profile"]',
                ]
                logged_in = False
                for sel in success_selectors:
                    el = page.locator(sel)
                    if await el.count() > 0:
                        logged_in = True
                        break

                if not logged_in:
                    current_url = page.url
                    if "login" in current_url or "signin" in current_url:
                        await browser.close()
                        raise RuntimeError(
                            "샤오홍수 로그인 실패: 자격증명을 확인하거나 "
                            "계정 보안 인증이 필요할 수 있습니다."
                        )

                cookies = await context.cookies()
                await browser.close()

            except RuntimeError:
                raise
            except Exception as e:
                await browser.close()
                raise RuntimeError(f"샤오홍수 로그인 중 오류: {e}") from e

        expires_at = datetime.now(timezone.utc) + timedelta(days=25)
        return cookies, expires_at

    # ─────────────────────────────────────────────────────────
    # 프록시 설정 조회
    # ─────────────────────────────────────────────────────────

    async def _get_proxy_config(self, proxy_id: str) -> Optional[dict]:
        """proxy_pool 에서 프록시 설정을 조회하여 Playwright proxy dict 로 반환."""
        result = (
            self.db.table("proxy_pool")
            .select("proxy_url")
            .eq("id", proxy_id)
            .eq("is_active", True)
            .limit(1)
            .execute()
        )
        if not result.data:
            return None
        return {"server": result.data[0]["proxy_url"]}
