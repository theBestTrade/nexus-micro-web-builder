"""
database/client.py
Supabase service-role 클라이언트 싱글톤
서비스 키를 사용하므로 RLS 를 우회합니다 (서버사이드 전용).
"""

from functools import lru_cache
from supabase import create_client, Client
from core.config import get_settings


@lru_cache(maxsize=1)
def get_db() -> Client:
    """
    Supabase service-role Client 싱글톤을 반환합니다.
    FastAPI Depends() 또는 직접 호출 모두 가능합니다.
    """
    settings = get_settings()
    return create_client(settings.supabase_url, settings.supabase_service_key)
