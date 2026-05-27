"""
core/auth.py
FastAPI 의존성 — Supabase JWT 검증 → user_id 추출
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client

from .config import get_settings

_security = HTTPBearer(auto_error=True)


async def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(_security),
) -> str:
    """
    Authorization: Bearer <supabase-jwt> 헤더를 검증하고
    user_id(UUID 문자열)를 반환합니다.

    실패 시 HTTP 401 을 반환합니다.
    """
    token = credentials.credentials
    settings = get_settings()

    try:
        # Supabase service client 로 JWT 검증
        client = create_client(settings.supabase_url, settings.supabase_service_key)
        response = client.auth.get_user(token)
        if response.user is None:
            raise ValueError("user is None")
        return str(response.user.id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="유효하지 않은 인증 토큰입니다.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from e
