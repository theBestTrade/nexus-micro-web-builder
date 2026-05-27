"""
routers/accounts.py
계정 관리 API — /api/accounts

엔드포인트:
  GET    /api/accounts                       # 계정 목록
  POST   /api/accounts                       # 계정 등록
  GET    /api/accounts/{account_id}          # 단일 계정 조회
  PUT    /api/accounts/{account_id}          # 계정 수정
  DELETE /api/accounts/{account_id}          # 계정 삭제
  POST   /api/accounts/{account_id}/set-default     # 기본 계정 지정
  POST   /api/accounts/{account_id}/test            # 연결 테스트
  POST   /api/accounts/{account_id}/cookie/refresh  # 쿠키 갱신
  GET    /api/accounts/{account_id}/cookie          # 쿠키 상태 조회
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from core.auth import get_current_user_id
from database.client import get_db
from models.account import (
    AccountCreate,
    AccountListResponse,
    AccountResponse,
    AccountUpdate,
    ConnectionTestResult,
    CookieRefreshResult,
    CookieStatus,
)
from services.account_manager import AccountManager

router = APIRouter(prefix="/api/accounts", tags=["accounts"])


def _get_manager() -> AccountManager:
    """AccountManager 의존성 팩토리."""
    return AccountManager(db=get_db())


# ─────────────────────────────────────────────────────────────
# GET /api/accounts — 계정 목록 조회
# ─────────────────────────────────────────────────────────────

@router.get("", response_model=AccountListResponse)
async def list_accounts(
    platform:  Optional[str]  = Query(None, description="플랫폼 필터 (예: naver_blog)"),
    is_active: Optional[bool] = Query(None, description="활성 계정만 조회"),
    user_id:   str            = Depends(get_current_user_id),
    manager:   AccountManager = Depends(_get_manager),
) -> AccountListResponse:
    """
    사용자의 모든 계정 목록을 반환합니다.
    민감 정보(credentials, access_token)는 포함되지 않습니다.
    """
    accounts = manager.list_accounts(user_id, platform=platform, is_active=is_active)
    return AccountListResponse(accounts=accounts, total=len(accounts))


# ─────────────────────────────────────────────────────────────
# POST /api/accounts — 계정 등록
# ─────────────────────────────────────────────────────────────

@router.post("", response_model=AccountResponse, status_code=status.HTTP_201_CREATED)
async def create_account(
    data:    AccountCreate  = ...,
    user_id: str            = Depends(get_current_user_id),
    manager: AccountManager = Depends(_get_manager),
) -> AccountResponse:
    """
    새 계정을 등록합니다.
    - 같은 platform + alias 조합이 이미 있으면 409 반환
    - is_default 미지정 시 해당 platform의 첫 계정이면 자동으로 true
    - login_id/login_pw, api_key/api_secret 은 AES-256-GCM 암호화 후 DB 저장
    """
    try:
        account = manager.create_account(user_id, data)
        return account
    except Exception as e:
        error_msg = str(e)
        if "unique" in error_msg.lower() or "duplicate" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"이미 같은 별명의 계정이 있습니다: platform={data.platform.value}, alias={data.alias}",
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"계정 생성 실패: {error_msg}",
        )


# ─────────────────────────────────────────────────────────────
# GET /api/accounts/{account_id} — 단일 계정 조회
# ─────────────────────────────────────────────────────────────

@router.get("/{account_id}", response_model=AccountResponse)
async def get_account(
    account_id: str,
    user_id:   str            = Depends(get_current_user_id),
    manager:   AccountManager = Depends(_get_manager),
) -> AccountResponse:
    """단일 계정 조회 (소유권 검증 포함)."""
    try:
        return manager.get_account(account_id, user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"계정을 찾을 수 없습니다: {account_id}",
        )


# ─────────────────────────────────────────────────────────────
# PUT /api/accounts/{account_id} — 계정 수정
# ─────────────────────────────────────────────────────────────

@router.put("/{account_id}", response_model=AccountResponse)
async def update_account(
    account_id: str,
    data:    AccountUpdate  = ...,
    user_id: str            = Depends(get_current_user_id),
    manager: AccountManager = Depends(_get_manager),
) -> AccountResponse:
    """
    계정 정보를 부분 업데이트합니다.
    - is_default=true 설정 시 같은 platform의 기존 default 자동 해제
    - login_pw, api_key 등 자격증명 변경 시 재암호화
    """
    try:
        return manager.update_account(account_id, user_id, data)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"계정을 찾을 수 없습니다: {account_id}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"계정 수정 실패: {str(e)}",
        )


# ─────────────────────────────────────────────────────────────
# DELETE /api/accounts/{account_id} — 계정 삭제
# ─────────────────────────────────────────────────────────────

@router.delete("/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_account(
    account_id: str,
    user_id:   str            = Depends(get_current_user_id),
    manager:   AccountManager = Depends(_get_manager),
) -> None:
    """
    계정을 삭제합니다.
    - 연결된 쿠키(platform_cookies)도 CASCADE 삭제됩니다.
    - is_default 계정 삭제 시 남은 계정 중 가장 오래된 계정이 자동으로 default가 됩니다.
    """
    try:
        manager.delete_account(account_id, user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"계정을 찾을 수 없습니다: {account_id}",
        )


# ─────────────────────────────────────────────────────────────
# POST /api/accounts/{account_id}/set-default — 기본 계정 지정
# ─────────────────────────────────────────────────────────────

@router.post("/{account_id}/set-default", response_model=AccountResponse)
async def set_default_account(
    account_id: str,
    user_id:   str            = Depends(get_current_user_id),
    manager:   AccountManager = Depends(_get_manager),
) -> AccountResponse:
    """
    해당 계정을 플랫폼의 기본 계정으로 지정합니다.
    같은 platform의 기존 default 계정은 자동으로 해제됩니다.
    """
    try:
        return manager.set_default(account_id, user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"계정을 찾을 수 없습니다: {account_id}",
        )


# ─────────────────────────────────────────────────────────────
# POST /api/accounts/{account_id}/test — 연결 테스트
# ─────────────────────────────────────────────────────────────

class _TestBody(AccountUpdate):
    """연결 테스트 요청 (proxy_id만 사용)."""
    proxy_id: Optional[str] = None

    model_config = {"extra": "ignore"}


from pydantic import BaseModel as _BaseModel

class _TestRequest(_BaseModel):
    proxy_id: Optional[str] = None


@router.post("/{account_id}/test", response_model=ConnectionTestResult)
async def test_account_connection(
    account_id: str,
    body:      _TestRequest  = _TestRequest(),
    user_id:   str           = Depends(get_current_user_id),
    manager:   AccountManager = Depends(_get_manager),
) -> ConnectionTestResult:
    """
    계정 연결 상태를 실시간으로 확인합니다.
    - OAuth:       토큰 만료 여부 확인
    - Credential:  Playwright로 세션 유효성 확인
    - Commerce:    API 키 / URL 유효성 확인
    결과는 accounts.health_status 에 자동 저장됩니다.
    """
    return await manager.test_connection(account_id, user_id, proxy_id=body.proxy_id)


# ─────────────────────────────────────────────────────────────
# POST /api/accounts/{account_id}/cookie/refresh — 쿠키 갱신
# ─────────────────────────────────────────────────────────────

class _RefreshRequest(_BaseModel):
    proxy_id: Optional[str] = None


@router.post("/{account_id}/cookie/refresh", response_model=CookieRefreshResult)
async def refresh_account_cookie(
    account_id: str,
    body:      _RefreshRequest  = _RefreshRequest(),
    user_id:   str              = Depends(get_current_user_id),
    manager:   AccountManager   = Depends(_get_manager),
) -> CookieRefreshResult:
    """
    Playwright를 사용해 저장된 ID/PW로 로그인 후 쿠키를 갱신합니다.
    대상: naver_blog / douyin / xiaohongshu (자격증명 방식 계정)
    """
    return await manager.refresh_cookie(account_id, user_id, proxy_id=body.proxy_id)


# ─────────────────────────────────────────────────────────────
# GET /api/accounts/{account_id}/cookie — 쿠키 상태 조회
# ─────────────────────────────────────────────────────────────

@router.get("/{account_id}/cookie", response_model=CookieStatus)
async def get_cookie_status(
    account_id: str,
    user_id:   str            = Depends(get_current_user_id),
    manager:   AccountManager = Depends(_get_manager),
) -> CookieStatus:
    """
    쿠키 저장 상태를 반환합니다. (쿠키 원문은 포함되지 않습니다)
    """
    try:
        return manager.get_cookie_status(account_id, user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"계정을 찾을 수 없습니다: {account_id}",
        )
