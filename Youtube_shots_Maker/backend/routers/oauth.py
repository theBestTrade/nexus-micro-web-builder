"""
routers/oauth.py
OAuth 채널 연동 — YouTube / Instagram / TikTok

엔드포인트:
  GET  /api/accounts/oauth/{platform}/authorize  — 인증 URL 반환
  GET  /api/accounts/oauth/{platform}/callback   — 코드 교환 → 계정 저장 → 프론트엔드 리다이렉트
  POST /api/accounts/oauth/{platform}/refresh    — 토큰 재발급 (refresh_token)
"""

from __future__ import annotations

import base64
import json
import logging
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import RedirectResponse

from core.auth import get_current_user_id
from core.config import get_settings
from database.client import get_db
from models.account import AccountCreate, PlatformEnum
from services.account_manager import AccountManager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/accounts/oauth", tags=["oauth"])


# ─────────────────────────────────────────────────────────────
# OAuth Provider 설정
# ─────────────────────────────────────────────────────────────

_YOUTUBE_SCOPE = " ".join([
    "https://www.googleapis.com/auth/youtube.upload",
    "https://www.googleapis.com/auth/youtube.readonly",
    "https://www.googleapis.com/auth/youtube",
])

_INSTAGRAM_SCOPE = "user_profile,user_media"
_TIKTOK_SCOPE    = "user.info.basic,video.upload"

OAUTH_PROVIDERS: dict[str, dict] = {
    "youtube": {
        "auth_url":    "https://accounts.google.com/o/oauth2/v2/auth",
        "token_url":   "https://oauth2.googleapis.com/token",
        "revoke_url":  "https://oauth2.googleapis.com/revoke",
        "profile_url": "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true",
        "scope":       _YOUTUBE_SCOPE,
    },
    "instagram": {
        "auth_url":    "https://api.instagram.com/oauth/authorize",
        "token_url":   "https://api.instagram.com/oauth/access_token",
        "profile_url": "https://graph.instagram.com/me?fields=id,username",
        "scope":       _INSTAGRAM_SCOPE,
    },
    "tiktok": {
        "auth_url":    "https://www.tiktok.com/v2/auth/authorize/",
        "token_url":   "https://open.tiktokapis.com/v2/oauth/token/",
        "profile_url": "https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name",
        "scope":       _TIKTOK_SCOPE,
    },
}


# ─────────────────────────────────────────────────────────────
# 내부 헬퍼
# ─────────────────────────────────────────────────────────────

def _encode_state(user_id: str, alias: str, platform: str) -> str:
    """state 파라미터 = base64(JSON{user_id, alias, platform, nonce})"""
    payload = {
        "user_id":  user_id,
        "alias":    alias,
        "platform": platform,
        "nonce":    secrets.token_urlsafe(12),
    }
    return base64.urlsafe_b64encode(json.dumps(payload).encode()).decode()


def _decode_state(state: str) -> dict:
    """state 파라미터 디코드. 실패 시 ValueError."""
    try:
        return json.loads(base64.urlsafe_b64decode(state.encode()).decode())
    except Exception as e:
        raise ValueError(f"잘못된 state 파라미터: {e}") from e


def _redirect_uri(platform: str, settings) -> str:
    return f"{settings.api_base_url}/api/accounts/oauth/{platform}/callback"


# ─────────────────────────────────────────────────────────────
# GET /authorize — 인증 URL 반환
# ─────────────────────────────────────────────────────────────

@router.get("/{platform}/authorize")
async def get_authorize_url(
    platform: str,
    alias:    str = Query(..., description="계정 별명 (예: 메인 유튜브)"),
    user_id:  str = Depends(get_current_user_id),
):
    """
    OAuth 인증 URL을 생성하여 반환합니다.
    프론트엔드는 이 URL을 팝업 또는 리다이렉트로 열어 OAuth 흐름을 시작합니다.
    """
    if platform not in OAUTH_PROVIDERS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"지원하지 않는 플랫폼: {platform}. 지원: youtube, instagram, tiktok",
        )

    settings     = get_settings()
    provider     = OAUTH_PROVIDERS[platform]
    state_token  = _encode_state(user_id, alias, platform)
    redirect_uri = _redirect_uri(platform, settings)

    params: dict = {
        "response_type": "code",
        "redirect_uri":  redirect_uri,
        "state":         state_token,
    }

    if platform == "youtube":
        params.update({
            "client_id":   settings.youtube_client_id,
            "scope":       provider["scope"],
            "access_type": "offline",
            "prompt":      "consent",          # 매번 refresh_token 발급
        })
    elif platform == "instagram":
        params.update({
            "client_id": settings.instagram_app_id,
            "scope":     provider["scope"],
        })
    elif platform == "tiktok":
        params.update({
            "client_key": settings.tiktok_client_key,
            "scope":      provider["scope"],
        })

    auth_url = f"{provider['auth_url']}?{urlencode(params)}"
    logger.info("[oauth] authorize 요청: platform=%s alias=%s", platform, alias)

    return {"auth_url": auth_url}


# ─────────────────────────────────────────────────────────────
# GET /callback — 코드 교환 → 계정 DB 저장
# ─────────────────────────────────────────────────────────────

@router.get("/{platform}/callback")
async def oauth_callback(
    platform: str,
    code:     Optional[str] = Query(None),
    state:    Optional[str] = Query(None),
    error:    Optional[str] = Query(None),
    db                      = Depends(get_db),
):
    """
    OAuth 공급자가 리다이렉트하는 콜백 엔드포인트.
    코드를 토큰으로 교환 → accounts 테이블에 저장 → 프론트엔드 /settings 로 리다이렉트.
    """
    settings = get_settings()
    frontend_settings = f"{settings.frontend_url}/settings"

    if error or not code or not state:
        reason = error or "code_missing"
        logger.warning("[oauth] 콜백 오류: platform=%s reason=%s", platform, reason)
        return RedirectResponse(f"{frontend_settings}?oauth_error={reason}")

    if platform not in OAUTH_PROVIDERS:
        return RedirectResponse(f"{frontend_settings}?oauth_error=unsupported_platform")

    # state 디코딩
    try:
        state_data = _decode_state(state)
    except ValueError:
        return RedirectResponse(f"{frontend_settings}?oauth_error=invalid_state")

    user_id  = state_data.get("user_id", "")
    alias    = state_data.get("alias", platform)
    provider = OAUTH_PROVIDERS[platform]
    redirect = _redirect_uri(platform, settings)

    # ── 토큰 교환 ───────────────────────────────────────────────
    token_data: dict = {}
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            if platform == "youtube":
                resp = await client.post(provider["token_url"], data={
                    "code":          code,
                    "client_id":     settings.youtube_client_id,
                    "client_secret": settings.youtube_client_secret,
                    "redirect_uri":  redirect,
                    "grant_type":    "authorization_code",
                })
            elif platform == "instagram":
                resp = await client.post(provider["token_url"], data={
                    "client_id":     settings.instagram_app_id,
                    "client_secret": settings.instagram_app_secret,
                    "redirect_uri":  redirect,
                    "code":          code,
                    "grant_type":    "authorization_code",
                })
            elif platform == "tiktok":
                resp = await client.post(provider["token_url"], data={
                    "client_key":    settings.tiktok_client_key,
                    "client_secret": settings.tiktok_client_secret,
                    "code":          code,
                    "redirect_uri":  redirect,
                    "grant_type":    "authorization_code",
                })
            else:
                return RedirectResponse(f"{frontend_settings}?oauth_error=unsupported_platform")

            if resp.status_code != 200:
                logger.error("[oauth] 토큰 교환 실패: %s %s", resp.status_code, resp.text)
                return RedirectResponse(f"{frontend_settings}?oauth_error=token_exchange_failed")

            token_data = resp.json()

    except httpx.RequestError as e:
        logger.error("[oauth] HTTP 오류: %s", e)
        return RedirectResponse(f"{frontend_settings}?oauth_error=network_error")

    # ── 채널 프로필 조회 (선택) ─────────────────────────────────
    display_name    : Optional[str] = None
    avatar_url      : Optional[str] = None
    platform_account_id: Optional[str] = None
    access_token = token_data.get("access_token", "")

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            headers = {"Authorization": f"Bearer {access_token}"}

            if platform == "youtube":
                r = await client.get(provider["profile_url"], headers=headers)
                if r.status_code == 200:
                    items = r.json().get("items", [])
                    if items:
                        snippet = items[0].get("snippet", {})
                        display_name        = snippet.get("title")
                        avatar_url          = (snippet.get("thumbnails", {}).get("default") or {}).get("url")
                        platform_account_id = items[0].get("id")

            elif platform == "instagram":
                r = await client.get(provider["profile_url"], headers=headers)
                if r.status_code == 200:
                    data = r.json()
                    display_name        = data.get("username")
                    platform_account_id = data.get("id")

            elif platform == "tiktok":
                r = await client.get(provider["profile_url"], headers=headers)
                if r.status_code == 200:
                    data = r.json().get("data", {}).get("user", {})
                    display_name        = data.get("display_name")
                    avatar_url          = data.get("avatar_url")
                    platform_account_id = data.get("open_id")

    except Exception as e:
        logger.warning("[oauth] 프로필 조회 실패 (무시): %s", e)

    # ── 토큰 만료 시각 계산 ─────────────────────────────────────
    expires_in       = int(token_data.get("expires_in", 3600))
    token_expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)

    # ── DB 저장 ─────────────────────────────────────────────────
    manager = AccountManager(db=db)
    try:
        account = manager.create_account(
            user_id,
            AccountCreate(
                platform             = PlatformEnum(platform),
                alias                = alias,
                display_name         = display_name,
                avatar_url           = avatar_url,
                platform_account_id  = platform_account_id,
                access_token         = access_token,
                refresh_token        = token_data.get("refresh_token"),
                token_expires_at     = token_expires_at,
            ),
        )
        logger.info("[oauth] 계정 저장 완료: platform=%s account_id=%s", platform, account.id)
        return RedirectResponse(
            f"{frontend_settings}?oauth_success={platform}&account_id={account.id}"
        )

    except Exception as e:
        logger.error("[oauth] 계정 저장 실패: %s", e)
        error_msg = str(e).replace(" ", "+")[:80]
        return RedirectResponse(f"{frontend_settings}?oauth_error={error_msg}")


# ─────────────────────────────────────────────────────────────
# POST /refresh — 토큰 재발급 (refresh_token 방식)
# ─────────────────────────────────────────────────────────────

@router.post("/{platform}/refresh")
async def refresh_oauth_token(
    platform:   str,
    account_id: str = Query(...),
    user_id:    str = Depends(get_current_user_id),
    db              = Depends(get_db),
):
    """
    refresh_token 을 사용해 access_token 을 재발급합니다.
    YouTube / TikTok 지원. Instagram은 장기 토큰 발급 API 사용.
    """
    if platform not in OAUTH_PROVIDERS:
        raise HTTPException(status_code=400, detail=f"지원하지 않는 플랫폼: {platform}")

    manager = AccountManager(db=db)

    # 계정 조회 (내부용: credentials_encrypted 포함)
    raw = manager._get_account_raw(account_id, user_id)
    refresh_token = raw.get("refresh_token")

    if not refresh_token:
        raise HTTPException(
            status_code=422,
            detail="refresh_token 이 저장되지 않았습니다. 다시 OAuth 연동을 진행해주세요.",
        )

    settings  = get_settings()
    provider  = OAUTH_PROVIDERS[platform]
    new_token : dict = {}

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            if platform == "youtube":
                resp = await client.post(provider["token_url"], data={
                    "client_id":     settings.youtube_client_id,
                    "client_secret": settings.youtube_client_secret,
                    "refresh_token": refresh_token,
                    "grant_type":    "refresh_token",
                })
            elif platform == "tiktok":
                resp = await client.post(provider["token_url"], data={
                    "client_key":    settings.tiktok_client_key,
                    "client_secret": settings.tiktok_client_secret,
                    "refresh_token": refresh_token,
                    "grant_type":    "refresh_token",
                })
            elif platform == "instagram":
                # 인스타그램은 장기 토큰 갱신 방식이 다름
                resp = await client.get(
                    "https://graph.instagram.com/refresh_access_token",
                    params={
                        "grant_type":   "ig_refresh_token",
                        "access_token": raw.get("access_token", ""),
                    },
                )
            else:
                raise HTTPException(status_code=400, detail="토큰 재발급 미지원 플랫폼")

            if resp.status_code != 200:
                raise HTTPException(
                    status_code=502,
                    detail=f"토큰 재발급 실패: {resp.status_code} {resp.text[:200]}",
                )
            new_token = resp.json()

    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=f"네트워크 오류: {e}") from e

    # DB 업데이트
    expires_in       = int(new_token.get("expires_in", 3600))
    token_expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)

    from models.account import AccountUpdate
    updated = manager.update_account(
        account_id, user_id,
        AccountUpdate(
            access_token     = new_token.get("access_token"),
            refresh_token    = new_token.get("refresh_token", refresh_token),  # 새 rt가 없으면 기존 유지
            token_expires_at = token_expires_at,
        ),
    )

    return {
        "success":          True,
        "account_id":       account_id,
        "token_expires_at": token_expires_at.isoformat(),
        "platform":         platform,
    }
