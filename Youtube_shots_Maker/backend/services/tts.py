"""
services/tts.py
한국어 TTS 합성 (Edge-TTS 기본 / CLOVA Voice 프리미엄)

동작 순서:
  1. scripts.adapted_script 읽기
  2. Edge-TTS 또는 CLOVA로 MP3 합성 → /tmp
  3. Supabase Storage audio/ 업로드
  4. scripts.tts_audio_path, tts_voice_id, status='synthesized' 저장
  5. /tmp 파일 정리
"""

from __future__ import annotations

import asyncio
import logging
import os
import tempfile
from pathlib import Path
from typing import Optional
from uuid import uuid4

import httpx
from supabase import Client

from core.config import get_settings
from models.script import EDGE_TTS_VOICES, TTSProviderEnum

logger   = logging.getLogger(__name__)
settings = get_settings()

AUDIO_BUCKET = "audio"


class TTSService:
    """
    TTS 합성 서비스.

    사용 예:
        tts = TTSService(db=get_db())
        result = await tts.synthesize(script_id, user_id, voice_id="ko-female-1")
    """

    def __init__(self, db: Client):
        self.db = db

    # ─────────────────────────────────────────────────────────
    # 공개 API
    # ─────────────────────────────────────────────────────────

    async def synthesize(
        self,
        script_id: str,
        user_id:   str,
        provider:  TTSProviderEnum = TTSProviderEnum.EDGE_TTS,
        voice_id:  str = "ko-female-1",
    ) -> dict:
        """
        adapted_script를 TTS로 합성합니다.

        반환:
          {
            "tts_audio_path": str,   # Supabase Storage 경로
            "tts_voice_id":   str,
            "provider":       str,
          }
        """
        script_row = await self._get_script(script_id, user_id)
        text       = script_row.get("adapted_script", "")

        if not text:
            raise ValueError("각색된 대본이 없습니다. 먼저 Adapt를 실행해주세요.")

        await self._update_status(script_id, "synthesizing")

        tmp_audio = None
        try:
            # 합성
            if provider == TTSProviderEnum.EDGE_TTS:
                tmp_audio = await self._edge_tts(text, voice_id)
            elif provider == TTSProviderEnum.CLOVA:
                tmp_audio = await self._clova_tts(text, voice_id)
            else:
                raise ValueError(f"지원하지 않는 TTS 제공자: {provider}")

            # Storage 업로드
            storage_path = f"{user_id}/{script_id}/tts_{uuid4().hex}.mp3"
            await self._upload_to_storage(tmp_audio, AUDIO_BUCKET, storage_path)

            # DB 저장
            self.db.table("scripts").update({
                "tts_audio_path": storage_path,
                "tts_voice_id":   voice_id,
                "status":         "synthesized",
                "error_msg":      None,
            }).eq("id", script_id).execute()

            return {
                "tts_audio_path": storage_path,
                "tts_voice_id":   voice_id,
                "provider":       provider.value,
            }

        except Exception as e:
            logger.exception("TTS 합성 실패: script_id=%s", script_id)
            await self._update_status(script_id, "failed", str(e))
            raise
        finally:
            if tmp_audio and os.path.exists(tmp_audio):
                try:
                    os.unlink(tmp_audio)
                except Exception:
                    pass

    # ─────────────────────────────────────────────────────────
    # 내부: Edge-TTS
    # ─────────────────────────────────────────────────────────

    @staticmethod
    async def _edge_tts(text: str, voice_id: str) -> str:
        """
        Edge-TTS로 합성 → /tmp MP3 반환.
        voice_id: 'ko-female-1' 등 모델 내부 키 또는 직접 Azure 보이스명
        """
        import edge_tts

        # 내부 키 → Azure 보이스명 변환
        voice_name = EDGE_TTS_VOICES.get(voice_id, voice_id)

        tmp_path = os.path.join(
            tempfile.gettempdir(), f"tts_{uuid4().hex}.mp3"
        )

        communicate = edge_tts.Communicate(text=text, voice=voice_name)
        await communicate.save(tmp_path)
        return tmp_path

    # ─────────────────────────────────────────────────────────
    # 내부: CLOVA Voice (프리미엄)
    # ─────────────────────────────────────────────────────────

    @staticmethod
    async def _clova_tts(text: str, speaker: str) -> str:
        """
        Naver CLOVA Voice API로 합성 → /tmp MP3 반환.
        speaker: CLOVA speaker ID (예: nara, jinho, dain, etc.)
        """
        api_key = getattr(settings, "clova_api_key", None)
        if not api_key:
            raise RuntimeError(
                "CLOVA_API_KEY 환경변수가 설정되지 않았습니다."
            )

        url = "https://naveropenapi.apigw.ntruss.com/tts-premium/v1/tts"
        headers = {
            "X-NCP-APIGW-API-KEY-ID": api_key.split(":")[0],
            "X-NCP-APIGW-API-KEY":    api_key.split(":")[1] if ":" in api_key else api_key,
            "Content-Type":           "application/x-www-form-urlencoded",
        }
        payload = {
            "speaker": speaker,
            "volume":  "0",
            "speed":   "0",
            "pitch":   "0",
            "format":  "mp3",
            "text":    text[:500],  # CLOVA 최대 500자
        }

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(url, headers=headers, data=payload)

        if resp.status_code != 200:
            raise RuntimeError(
                f"CLOVA TTS 오류 ({resp.status_code}): {resp.text[:200]}"
            )

        tmp_path = os.path.join(
            tempfile.gettempdir(), f"clova_{uuid4().hex}.mp3"
        )
        with open(tmp_path, "wb") as f:
            f.write(resp.content)
        return tmp_path

    # ─────────────────────────────────────────────────────────
    # 내부: Storage 헬퍼
    # ─────────────────────────────────────────────────────────

    async def _upload_to_storage(
        self, local_path: str, bucket: str, storage_path: str
    ) -> None:
        loop = asyncio.get_event_loop()

        def _upload():
            with open(local_path, "rb") as f:
                data = f.read()
            self.db.storage.from_(bucket).upload(
                path=storage_path,
                file=data,
                file_options={"content-type": "audio/mpeg"},
            )

        await loop.run_in_executor(None, _upload)

    # ─────────────────────────────────────────────────────────
    # 내부: DB 헬퍼
    # ─────────────────────────────────────────────────────────

    async def _get_script(self, script_id: str, user_id: str) -> dict:
        result = (
            self.db.table("scripts")
            .select("adapted_script, status")
            .eq("id", script_id)
            .eq("user_id", user_id)
            .single()
            .execute()
        )
        if not result.data:
            raise ValueError(f"스크립트를 찾을 수 없습니다: {script_id}")
        return result.data

    async def _update_status(
        self, script_id: str, status: str, error: Optional[str] = None
    ) -> None:
        update: dict = {"status": status}
        if error:
            update["error_msg"] = error
        self.db.table("scripts").update(update).eq("id", script_id).execute()

    # ─────────────────────────────────────────────────────────
    # 유틸: 사용 가능한 보이스 목록
    # ─────────────────────────────────────────────────────────

    @staticmethod
    def list_edge_tts_voices() -> list[dict]:
        return [
            {"id": k, "name": v, "provider": "edge-tts", "gender": "female" if "female" in k else "male"}
            for k, v in EDGE_TTS_VOICES.items()
        ]

    @staticmethod
    def list_clova_voices() -> list[dict]:
        """CLOVA 기본 보이스 목록 (실제 사용 가능 여부는 API key 플랜에 따라 다름)."""
        return [
            {"id": "nara",    "name": "나라 (여성, 표준)",  "provider": "clova", "gender": "female"},
            {"id": "jinho",   "name": "진호 (남성, 표준)",  "provider": "clova", "gender": "male"},
            {"id": "dain",    "name": "다인 (여성, 밝음)",  "provider": "clova", "gender": "female"},
            {"id": "mijin",   "name": "미진 (여성, 차분)",  "provider": "clova", "gender": "female"},
            {"id": "solar",   "name": "솔라 (여성, 활발)",  "provider": "clova", "gender": "female"},
        ]
