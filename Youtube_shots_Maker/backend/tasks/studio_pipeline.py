"""
tasks/studio_pipeline.py
Phase 2 AI 변환 파이프라인 — Celery 비동기 태스크

태스크 목록:
  transcribe_task      — Whisper STT
  separate_audio_task  — demucs BGM/보컬 분리
  adapt_script_task    — Claude 대본 각색
  synthesize_tts_task  — Edge-TTS / CLOVA 합성
  render_video_task    — FFmpeg 최종 렌더링

공통 패턴:
  - bind=True: self로 상태 업데이트 가능
  - max_retries=3, exponential backoff
  - 진행 상태는 scripts.status 컬럼에 직접 기록
  - _run_async()로 비동기 서비스를 동기 Celery 태스크에서 실행
"""

from __future__ import annotations

import asyncio
import logging
from typing import Optional

from tasks.workers import celery_app
from database.client import get_db
from services.stt import STTService
from services.audio_separator import AudioSeparator
from services.script_adapter import ScriptAdapter
from services.tts import TTSService
from services.video_editor import VideoEditor
from models.script import TTSProviderEnum

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────
# 헬퍼: 동기 Celery → 비동기 서비스 브릿지
# ─────────────────────────────────────────────────────────────

def _run_async(coro):
    """새 이벤트 루프에서 코루틴 실행 (Celery 워커 스레드 전용)."""
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


def _retry_countdown(retries: int) -> int:
    """지수 백오프: 30s → 60s → 120s"""
    return 30 * (2 ** retries)


# ─────────────────────────────────────────────────────────────
# 태스크: STT (Whisper)
# ─────────────────────────────────────────────────────────────

@celery_app.task(
    bind=True,
    name="studio.transcribe",
    max_retries=3,
    soft_time_limit=600,   # 10분
)
def transcribe_task(self, script_id: str, user_id: str) -> dict:
    """
    Whisper large-v3로 중국어 STT 실행.

    반환:
      { "raw_stt": str, "stt_segments": [...], "language": str }
    """
    try:
        db      = get_db()
        service = STTService(db=db)
        result  = _run_async(service.transcribe(script_id, user_id))
        logger.info("STT 완료: script_id=%s", script_id)
        return result
    except Exception as exc:
        logger.warning(
            "STT 태스크 실패 (재시도 %d/%d): script_id=%s — %s",
            self.request.retries, self.max_retries, script_id, exc,
        )
        raise self.retry(
            exc=exc,
            countdown=_retry_countdown(self.request.retries),
        )


# ─────────────────────────────────────────────────────────────
# 태스크: 오디오 분리 (demucs)
# ─────────────────────────────────────────────────────────────

@celery_app.task(
    bind=True,
    name="studio.separate_audio",
    max_retries=3,
    soft_time_limit=900,   # 15분 (demucs는 시간이 걸림)
)
def separate_audio_task(self, script_id: str, user_id: str) -> dict:
    """
    demucs htdemucs로 BGM / 보컬 분리.

    반환:
      { "bgm_path": str, "vocals_path": str }
    """
    try:
        db      = get_db()
        service = AudioSeparator(db=db)
        result  = _run_async(service.separate(script_id, user_id))
        logger.info("오디오 분리 완료: script_id=%s", script_id)
        return result
    except Exception as exc:
        logger.warning(
            "오디오 분리 실패 (재시도 %d/%d): script_id=%s — %s",
            self.request.retries, self.max_retries, script_id, exc,
        )
        raise self.retry(
            exc=exc,
            countdown=_retry_countdown(self.request.retries),
        )


# ─────────────────────────────────────────────────────────────
# 태스크: 대본 각색 (Claude)
# ─────────────────────────────────────────────────────────────

@celery_app.task(
    bind=True,
    name="studio.adapt_script",
    max_retries=3,
    soft_time_limit=180,   # 3분
)
def adapt_script_task(
    self,
    script_id: str,
    user_id:   str,
    track:     str,
    tone:      Optional[str] = None,
) -> dict:
    """
    Claude claude-sonnet-4-6로 Track A/B/D 분기 대본 각색.

    반환:
      { "adapted_script": str, "track": str }
    """
    try:
        db      = get_db()
        service = ScriptAdapter(db=db)
        result  = _run_async(service.adapt(script_id, user_id, track, tone))
        logger.info("대본 각색 완료: script_id=%s, track=%s", script_id, track)
        return result
    except Exception as exc:
        logger.warning(
            "대본 각색 실패 (재시도 %d/%d): script_id=%s — %s",
            self.request.retries, self.max_retries, script_id, exc,
        )
        raise self.retry(
            exc=exc,
            countdown=_retry_countdown(self.request.retries),
        )


# ─────────────────────────────────────────────────────────────
# 태스크: TTS 합성
# ─────────────────────────────────────────────────────────────

@celery_app.task(
    bind=True,
    name="studio.synthesize_tts",
    max_retries=3,
    soft_time_limit=300,   # 5분
)
def synthesize_tts_task(
    self,
    script_id: str,
    user_id:   str,
    provider:  str = "edge-tts",
    voice_id:  str = "ko-female-1",
) -> dict:
    """
    Edge-TTS / CLOVA로 TTS 합성.

    반환:
      { "tts_audio_path": str, "tts_voice_id": str, "provider": str }
    """
    try:
        db          = get_db()
        service     = TTSService(db=db)
        provider_enum = TTSProviderEnum(provider)
        result      = _run_async(
            service.synthesize(script_id, user_id, provider_enum, voice_id)
        )
        logger.info("TTS 합성 완료: script_id=%s, voice=%s", script_id, voice_id)
        return result
    except Exception as exc:
        logger.warning(
            "TTS 합성 실패 (재시도 %d/%d): script_id=%s — %s",
            self.request.retries, self.max_retries, script_id, exc,
        )
        raise self.retry(
            exc=exc,
            countdown=_retry_countdown(self.request.retries),
        )


# ─────────────────────────────────────────────────────────────
# 태스크: FFmpeg 렌더링
# ─────────────────────────────────────────────────────────────

@celery_app.task(
    bind=True,
    name="studio.render_video",
    max_retries=2,
    soft_time_limit=600,   # 10분
)
def render_video_task(
    self,
    script_id:      str,
    user_id:        str,
    font:           str = "NotoSansKR",
    subtitle_style: Optional[dict] = None,
) -> dict:
    """
    FFmpeg로 자막·오디오 믹스 최종 렌더링.

    반환:
      { "final_video_path": str, "subtitle_style": dict }
    """
    try:
        db      = get_db()
        service = VideoEditor(db=db)
        result  = _run_async(
            service.render(script_id, user_id, font, subtitle_style)
        )
        logger.info("렌더링 완료: script_id=%s", script_id)
        return result
    except Exception as exc:
        logger.warning(
            "렌더링 실패 (재시도 %d/%d): script_id=%s — %s",
            self.request.retries, self.max_retries, script_id, exc,
        )
        raise self.retry(
            exc=exc,
            countdown=_retry_countdown(self.request.retries),
        )
