"""
models/script.py
scripts 테이블 + Studio API 관련 Pydantic 스키마
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, Field


# ─────────────────────────────────────────────────────────────
# Enum
# ─────────────────────────────────────────────────────────────

class ScriptStatusEnum(str, Enum):
    CREATED      = "created"
    TRANSCRIBING = "transcribing"
    TRANSCRIBED  = "transcribed"
    ADAPTING     = "adapting"
    ADAPTED      = "adapted"
    SEPARATING   = "separating"
    SEPARATED    = "separated"
    SYNTHESIZING = "synthesizing"
    SYNTHESIZED  = "synthesized"
    RENDERING    = "rendering"
    READY        = "ready"
    FAILED       = "failed"


class TTSProviderEnum(str, Enum):
    EDGE_TTS = "edge-tts"
    CLOVA    = "clova"


class TrackEnum(str, Enum):
    A = "A"
    B = "B"
    D = "D"


# ─────────────────────────────────────────────────────────────
# TTS 보이스 목록
# ─────────────────────────────────────────────────────────────

EDGE_TTS_VOICES: dict[str, str] = {
    "ko-female-1": "ko-KR-SunHiNeural",    # 여성, 안정적
    "ko-female-2": "ko-KR-YuJinNeural",    # 여성, 밝음
    "ko-male-1":   "ko-KR-InJoonNeural",   # 남성, 안정적
    "ko-male-2":   "ko-KR-HyunsuNeural",   # 남성, 뉴스
    "ko-male-3":   "ko-KR-BongJinNeural",  # 남성, 자연스러움
}


# ─────────────────────────────────────────────────────────────
# 자막 스타일 기본값
# ─────────────────────────────────────────────────────────────

DEFAULT_SUBTITLE_STYLE: dict = {
    "font_name":       "NotoSansKR",
    "font_size":       22,
    "primary_color":   "white",       # 텍스트 색상
    "outline_color":   "black",       # 테두리 색상
    "outline_width":   2,
    "shadow":          1,
    "margin_bottom":   60,            # 화면 하단에서 px
    "max_chars_per_line": 20,         # 줄당 최대 글자 수
}


# ─────────────────────────────────────────────────────────────
# Request 스키마
# ─────────────────────────────────────────────────────────────

class TranscribeRequest(BaseModel):
    video_id: str = Field(..., description="다운로드 완료된 video ID")


class AdaptRequest(BaseModel):
    script_id: str
    track:     TrackEnum
    tone:      Optional[str] = Field(None, description="추가 톤 힌트 (예: '유머러스하게')")


class SynthesizeTTSRequest(BaseModel):
    script_id: str
    voice:     TTSProviderEnum = TTSProviderEnum.EDGE_TTS
    voice_id:  str             = Field(
        default="ko-female-1",
        description="Edge-TTS: ko-female-1 등 / CLOVA: speaker ID"
    )


class RenderRequest(BaseModel):
    script_id:      str
    font:           str             = "NotoSansKR"
    subtitle_style: Optional[dict]  = None  # 미지정 시 DEFAULT_SUBTITLE_STYLE 사용


class ScriptUpdateRequest(BaseModel):
    """인라인 편집용 — adapted_script만 수정 가능"""
    adapted_script: Optional[str] = None


# ─────────────────────────────────────────────────────────────
# Response 스키마
# ─────────────────────────────────────────────────────────────

class ScriptResponse(BaseModel):
    id:      UUID
    user_id: UUID
    video_id: UUID

    raw_stt:        Optional[str]
    stt_segments:   Optional[list[Any]]
    stt_task_id:    Optional[str]

    adapted_script: Optional[str]
    adapt_task_id:  Optional[str]

    bgm_path:       Optional[str]
    vocals_path:    Optional[str]
    separate_task_id: Optional[str]
    bgm_preserved:  bool

    tts_audio_path: Optional[str]
    tts_voice_id:   Optional[str]
    tts_task_id:    Optional[str]

    final_video_path: Optional[str]
    subtitle_style:   Optional[dict]
    render_task_id:   Optional[str]

    status:    ScriptStatusEnum
    error_msg: Optional[str]

    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class StudioTaskResponse(BaseModel):
    """스튜디오 태스크 등록 응답"""
    task_id:   str
    script_id: str
    status:    str = "queued"
    message:   str


class TaskStatusResponse(BaseModel):
    """태스크 진행 상태"""
    task_id:   str
    script_id: Optional[str]
    status:    str
    progress:  int = 0
    result:    Optional[dict] = None
    error:     Optional[str] = None


class VoiceListResponse(BaseModel):
    """사용 가능한 TTS 보이스 목록"""
    provider: TTSProviderEnum
    voices:   list[dict]   # [{ id, name, gender, preview_url? }]
