"""
core/config.py
애플리케이션 설정 (pydantic-settings, .env 자동 로드)
"""

import binascii
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Supabase ──────────────────────────────────────────────
    supabase_url: str
    supabase_service_key: str          # service_role key (RLS bypass)
    supabase_anon_key: str = ""        # anon key (JWT 검증용, 선택)

    # ── AES-256-GCM 암호화 키 (32 bytes hex, 64자) ────────────
    credentials_encryption_key: str

    # ── AI ────────────────────────────────────────────────────
    anthropic_api_key: str = ""
    openai_api_key: str = ""
    clova_api_key: str = ""   # NAVER CLOVA Voice API (선택, 프리미엄 TTS)

    # ── Redis / Celery ────────────────────────────────────────
    redis_url: str = "redis://localhost:6379"
    celery_broker_url: str = "redis://localhost:6379/0"

    # ── Proxy (선택) ──────────────────────────────────────────
    default_proxy_url: str = ""

    # ── OAuth — YouTube (Google) ───────────────────────────────
    youtube_client_id:     str = ""
    youtube_client_secret: str = ""

    # ── OAuth — Instagram (Meta) ───────────────────────────────
    instagram_app_id:     str = ""
    instagram_app_secret: str = ""

    # ── OAuth — TikTok ────────────────────────────────────────
    tiktok_client_key:    str = ""
    tiktok_client_secret: str = ""

    # ── 결제 ──────────────────────────────────────────────────
    toss_secret_key: str = ""

    # ── 배포 URL (OAuth 콜백·리다이렉트에 사용) ──────────────
    api_base_url:   str = "http://localhost:8000"   # FastAPI 베이스 URL
    frontend_url:   str = "http://localhost:3000"   # Next.js 프론트엔드 URL

    @property
    def encryption_key_bytes(self) -> bytes:
        """hex 문자열 → 32 bytes (AES-256 키)"""
        key_hex = self.credentials_encryption_key.strip()
        if len(key_hex) != 64:
            raise ValueError(
                "CREDENTIALS_ENCRYPTION_KEY 는 64자 hex 문자열이어야 합니다 (32 bytes). "
                "생성: python -c \"import os,binascii; print(binascii.hexlify(os.urandom(32)).decode())\""
            )
        return binascii.unhexlify(key_hex)


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
