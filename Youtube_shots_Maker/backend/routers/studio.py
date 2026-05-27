"""
routers/studio.py
Adaptation Studio API — Phase 2 AI 변환 파이프라인

엔드포인트:
  POST /api/studio/scripts           — 스크립트 생성 (video_id 연결)
  GET  /api/studio/scripts           — 사용자 스크립트 목록
  GET  /api/studio/scripts/{id}      — 단일 스크립트 조회
  PUT  /api/studio/scripts/{id}      — adapted_script 인라인 편집

  POST /api/studio/transcribe        — STT 태스크 등록 (Whisper)
  POST /api/studio/separate          — 오디오 분리 태스크 (demucs)
  POST /api/studio/adapt             — 대본 각색 태스크 (Claude)
  POST /api/studio/synthesize-tts    — TTS 합성 태스크 (Edge-TTS / CLOVA)
  POST /api/studio/render            — 최종 렌더링 태스크 (FFmpeg)

  GET  /api/studio/task/{task_id}    — Celery 태스크 상태 조회
  GET  /api/studio/voices            — TTS 보이스 목록
"""

from __future__ import annotations

import logging
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi import status as http_status

from core.auth import get_current_user_id
from database.client import get_db
from models.script import (
    AdaptRequest,
    RenderRequest,
    ScriptResponse,
    ScriptUpdateRequest,
    StudioTaskResponse,
    SynthesizeTTSRequest,
    TaskStatusResponse,
    TranscribeRequest,
    TTSProviderEnum,
    VoiceListResponse,
)
from services.tts import TTSService
from tasks.studio_pipeline import (
    adapt_script_task,
    render_video_task,
    separate_audio_task,
    synthesize_tts_task,
    transcribe_task,
)

router = APIRouter(prefix="/api/studio", tags=["studio"])
logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────
# 스크립트 CRUD
# ─────────────────────────────────────────────────────────────

@router.post("/scripts", response_model=ScriptResponse, status_code=201)
async def create_script(
    body:    TranscribeRequest,
    user_id: str = Depends(get_current_user_id),
    db=Depends(get_db),
):
    """
    video_id와 연결된 스크립트 레코드 생성.
    (STT 실행 전 레코드 선생성 — 태스크 ID 추적 기반)
    """
    # 영상 소유권 확인
    video = (
        db.table("videos")
        .select("id, status, file_path")
        .eq("id", body.video_id)
        .eq("user_id", user_id)
        .single()
        .execute()
    )
    if not video.data:
        raise HTTPException(404, detail="영상을 찾을 수 없습니다.")
    if not video.data.get("file_path"):
        raise HTTPException(400, detail="영상이 아직 다운로드되지 않았습니다.")

    result = (
        db.table("scripts")
        .insert({
            "user_id":  user_id,
            "video_id": body.video_id,
            "status":   "created",
        })
        .execute()
    )
    if not result.data:
        raise HTTPException(500, detail="스크립트 생성 실패")

    return result.data[0]


@router.get("/scripts", response_model=list[ScriptResponse])
async def list_scripts(
    video_id: Optional[str] = Query(None),
    status:   Optional[str] = Query(None),
    limit:    int            = Query(20, ge=1, le=100),
    offset:   int            = Query(0, ge=0),
    user_id:  str            = Depends(get_current_user_id),
    db=Depends(get_db),
):
    """사용자의 스크립트 목록."""
    q = (
        db.table("scripts")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .range(offset, offset + limit - 1)
    )
    if video_id:
        q = q.eq("video_id", video_id)
    if status:
        q = q.eq("status", status)

    result = q.execute()
    return result.data or []


@router.get("/scripts/{script_id}", response_model=ScriptResponse)
async def get_script(
    script_id: str,
    user_id:   str = Depends(get_current_user_id),
    db=Depends(get_db),
):
    """단일 스크립트 상세 조회."""
    result = (
        db.table("scripts")
        .select("*")
        .eq("id", script_id)
        .eq("user_id", user_id)
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(404, detail="스크립트를 찾을 수 없습니다.")
    return result.data


@router.put("/scripts/{script_id}", response_model=ScriptResponse)
async def update_script(
    script_id: str,
    body:      ScriptUpdateRequest,
    user_id:   str = Depends(get_current_user_id),
    db=Depends(get_db),
):
    """adapted_script 인라인 편집."""
    existing = (
        db.table("scripts")
        .select("id")
        .eq("id", script_id)
        .eq("user_id", user_id)
        .single()
        .execute()
    )
    if not existing.data:
        raise HTTPException(404, detail="스크립트를 찾을 수 없습니다.")

    update_data = body.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(400, detail="변경할 내용이 없습니다.")

    result = (
        db.table("scripts")
        .update(update_data)
        .eq("id", script_id)
        .execute()
    )
    return result.data[0]


# ─────────────────────────────────────────────────────────────
# AI 파이프라인 태스크 등록
# ─────────────────────────────────────────────────────────────

@router.post("/transcribe", response_model=StudioTaskResponse, status_code=202)
async def start_transcribe(
    body:    TranscribeRequest,
    user_id: str = Depends(get_current_user_id),
    db=Depends(get_db),
):
    """
    Whisper STT 태스크 등록.
    video_id에 대한 스크립트가 없으면 자동 생성.
    """
    # 스크립트 조회 or 생성
    script_id = await _get_or_create_script(db, user_id, body.video_id)

    # stt_task_id 업데이트 전 태스크 발행
    task = transcribe_task.apply_async(
        args=[script_id, user_id],
        task_id=str(uuid4()),
    )

    db.table("scripts").update({"stt_task_id": task.id}).eq("id", script_id).execute()

    return StudioTaskResponse(
        task_id=task.id,
        script_id=script_id,
        message="STT 태스크가 등록되었습니다.",
    )


@router.post("/separate", response_model=StudioTaskResponse, status_code=202)
async def start_separate(
    body:    TranscribeRequest,
    user_id: str = Depends(get_current_user_id),
    db=Depends(get_db),
):
    """demucs BGM/보컬 분리 태스크 등록."""
    script_id = await _get_or_create_script(db, user_id, body.video_id)

    task = separate_audio_task.apply_async(
        args=[script_id, user_id],
        task_id=str(uuid4()),
    )

    db.table("scripts").update({"separate_task_id": task.id}).eq("id", script_id).execute()

    return StudioTaskResponse(
        task_id=task.id,
        script_id=script_id,
        message="오디오 분리 태스크가 등록되었습니다.",
    )


@router.post("/adapt", response_model=StudioTaskResponse, status_code=202)
async def start_adapt(
    body:    AdaptRequest,
    user_id: str = Depends(get_current_user_id),
    db=Depends(get_db),
):
    """Claude 대본 각색 태스크 등록."""
    _assert_script_owned(db, body.script_id, user_id)

    task = adapt_script_task.apply_async(
        args=[body.script_id, user_id, body.track.value, body.tone],
        task_id=str(uuid4()),
    )

    db.table("scripts").update({"adapt_task_id": task.id}).eq("id", body.script_id).execute()

    return StudioTaskResponse(
        task_id=task.id,
        script_id=body.script_id,
        message="대본 각색 태스크가 등록되었습니다.",
    )


@router.post("/synthesize-tts", response_model=StudioTaskResponse, status_code=202)
async def start_synthesize_tts(
    body:    SynthesizeTTSRequest,
    user_id: str = Depends(get_current_user_id),
    db=Depends(get_db),
):
    """TTS 합성 태스크 등록."""
    _assert_script_owned(db, body.script_id, user_id)

    task = synthesize_tts_task.apply_async(
        args=[body.script_id, user_id, body.voice.value, body.voice_id],
        task_id=str(uuid4()),
    )

    db.table("scripts").update({"tts_task_id": task.id}).eq("id", body.script_id).execute()

    return StudioTaskResponse(
        task_id=task.id,
        script_id=body.script_id,
        message="TTS 합성 태스크가 등록되었습니다.",
    )


@router.post("/render", response_model=StudioTaskResponse, status_code=202)
async def start_render(
    body:    RenderRequest,
    user_id: str = Depends(get_current_user_id),
    db=Depends(get_db),
):
    """FFmpeg 최종 렌더링 태스크 등록."""
    _assert_script_owned(db, body.script_id, user_id)

    task = render_video_task.apply_async(
        args=[body.script_id, user_id, body.font, body.subtitle_style],
        task_id=str(uuid4()),
    )

    db.table("scripts").update({"render_task_id": task.id}).eq("id", body.script_id).execute()

    return StudioTaskResponse(
        task_id=task.id,
        script_id=body.script_id,
        message="렌더링 태스크가 등록되었습니다.",
    )


# ─────────────────────────────────────────────────────────────
# 태스크 상태 조회
# ─────────────────────────────────────────────────────────────

@router.get("/task/{task_id}", response_model=TaskStatusResponse)
async def get_task_status(
    task_id: str,
    _:       str = Depends(get_current_user_id),
):
    """Celery 태스크 상태 + 진행률 조회."""
    from celery.result import AsyncResult
    from tasks.workers import celery_app

    res    = AsyncResult(task_id, app=celery_app)
    state  = res.state

    STATUS_MAP = {
        "PENDING":  ("queued",     0),
        "STARTED":  ("processing", 30),
        "RETRY":    ("processing", 10),
        "SUCCESS":  ("done",       100),
        "FAILURE":  ("failed",     0),
        "REVOKED":  ("failed",     0),
    }
    status_str, progress = STATUS_MAP.get(state, ("processing", 50))

    result = None
    error  = None
    if state == "SUCCESS":
        result = res.result if isinstance(res.result, dict) else {"result": str(res.result)}
    elif state == "FAILURE":
        error = str(res.result)

    return TaskStatusResponse(
        task_id=task_id,
        script_id=None,
        status=status_str,
        progress=progress,
        result=result,
        error=error,
    )


# ─────────────────────────────────────────────────────────────
# TTS 보이스 목록
# ─────────────────────────────────────────────────────────────

@router.get("/voices", response_model=list[VoiceListResponse])
async def list_voices(_: str = Depends(get_current_user_id)):
    """사용 가능한 TTS 보이스 목록 반환."""
    return [
        VoiceListResponse(
            provider=TTSProviderEnum.EDGE_TTS,
            voices=TTSService.list_edge_tts_voices(),
        ),
        VoiceListResponse(
            provider=TTSProviderEnum.CLOVA,
            voices=TTSService.list_clova_voices(),
        ),
    ]


# ─────────────────────────────────────────────────────────────
# 내부 헬퍼
# ─────────────────────────────────────────────────────────────

async def _get_or_create_script(db, user_id: str, video_id: str) -> str:
    """video_id에 연결된 스크립트가 없으면 자동 생성. script_id 반환."""
    existing = (
        db.table("scripts")
        .select("id")
        .eq("video_id", video_id)
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    if existing.data:
        return existing.data[0]["id"]

    # 영상 소유권 확인
    video = (
        db.table("videos")
        .select("id, file_path")
        .eq("id", video_id)
        .eq("user_id", user_id)
        .single()
        .execute()
    )
    if not video.data:
        raise HTTPException(404, detail="영상을 찾을 수 없습니다.")
    if not video.data.get("file_path"):
        raise HTTPException(400, detail="영상이 아직 다운로드되지 않았습니다. 먼저 다운로드해주세요.")

    new_script = (
        db.table("scripts")
        .insert({"user_id": user_id, "video_id": video_id, "status": "created"})
        .execute()
    )
    return new_script.data[0]["id"]


def _assert_script_owned(db, script_id: str, user_id: str) -> None:
    """스크립트 소유권 확인. 없으면 404."""
    result = (
        db.table("scripts")
        .select("id")
        .eq("id", script_id)
        .eq("user_id", user_id)
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(404, detail="스크립트를 찾을 수 없습니다.")
