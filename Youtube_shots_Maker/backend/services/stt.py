"""
services/stt.py
중국어 음성 → 텍스트 (OpenAI Whisper large-v3)

동작 순서:
  1. Supabase Storage에서 원본 영상 다운로드 → /tmp
  2. FFmpeg로 오디오 추출 (16kHz mono WAV)
  3. Whisper large-v3 로 STT 실행 (language="zh")
  4. raw_stt 텍스트 + stt_segments (타이밍) 반환
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

from supabase import Client

logger = logging.getLogger(__name__)

# Whisper 모델 싱글톤 (첫 호출 시 다운로드, ~3GB)
_whisper_model = None
_whisper_lock  = asyncio.Lock()

AUDIO_BUCKET  = "audio"
VIDEOS_BUCKET = "videos"


async def _load_whisper(model_size: str = "large-v3"):
    """Whisper 모델 lazy 로딩 (스레드 안전)."""
    global _whisper_model
    async with _whisper_lock:
        if _whisper_model is None:
            import whisper
            logger.info("Whisper %s 모델 로딩 중 (최초 1회, ~수 분 소요)...", model_size)
            loop = asyncio.get_event_loop()
            _whisper_model = await loop.run_in_executor(
                None, lambda: whisper.load_model(model_size)
            )
            logger.info("Whisper 모델 로딩 완료.")
    return _whisper_model


class STTService:
    """
    Whisper 기반 STT 서비스.

    사용 예:
        stt = STTService(db=get_db())
        result = await stt.transcribe(script_id, user_id)
    """

    def __init__(self, db: Client, model_size: str = "large-v3"):
        self.db         = db
        self.model_size = model_size

    # ─────────────────────────────────────────────────────────
    # 공개 API
    # ─────────────────────────────────────────────────────────

    async def transcribe(self, script_id: str, user_id: str) -> dict:
        """
        script의 video에서 오디오를 추출하고 Whisper STT를 실행합니다.

        반환:
          {
            "raw_stt":      str,            # 전체 텍스트
            "stt_segments": list[dict],     # [{ start, end, text }, ...]
            "language":     str,            # 감지된 언어
          }
        """
        script_row = await self._get_script(script_id, user_id)
        video_row  = await self._get_video(script_row["video_id"], user_id)

        file_path = video_row.get("file_path")
        if not file_path:
            raise ValueError("영상이 아직 다운로드되지 않았습니다. 먼저 다운로드를 완료해주세요.")

        # 상태: transcribing
        await self._update_status(script_id, "transcribing")

        tmp_video = None
        tmp_audio = None
        try:
            # 1) Supabase Storage → /tmp 다운로드
            tmp_video = await self._download_from_storage(VIDEOS_BUCKET, file_path)

            # 2) FFmpeg 오디오 추출 (16kHz mono WAV)
            tmp_audio = await self._extract_audio(tmp_video)

            # 3) Whisper STT
            result = await self._run_whisper(tmp_audio)

            # 4) DB 저장
            segments = [
                {"start": s["start"], "end": s["end"], "text": s["text"].strip()}
                for s in result.get("segments", [])
            ]
            self.db.table("scripts").update({
                "raw_stt":      result["text"].strip(),
                "stt_segments": segments,
                "status":       "transcribed",
                "error_msg":    None,
            }).eq("id", script_id).execute()

            return {
                "raw_stt":      result["text"].strip(),
                "stt_segments": segments,
                "language":     result.get("language", "zh"),
            }

        except Exception as e:
            logger.exception("STT 실패: script_id=%s", script_id)
            await self._update_status(script_id, "failed", str(e))
            raise
        finally:
            for f in [tmp_video, tmp_audio]:
                if f and os.path.exists(f):
                    try:
                        os.unlink(f)
                    except Exception:
                        pass

    # ─────────────────────────────────────────────────────────
    # 내부: Whisper 실행
    # ─────────────────────────────────────────────────────────

    async def _run_whisper(self, audio_path: str) -> dict:
        """Whisper 모델 실행 (CPU/GPU 자동 선택)."""
        model = await _load_whisper(self.model_size)
        loop  = asyncio.get_event_loop()

        def _transcribe():
            return model.transcribe(
                audio_path,
                language      = "zh",          # 중국어 강제 지정
                task          = "transcribe",
                fp16          = self._has_gpu(),
                verbose       = False,
                word_timestamps = False,
            )

        return await loop.run_in_executor(None, _transcribe)

    @staticmethod
    def _has_gpu() -> bool:
        try:
            import torch
            return torch.cuda.is_available()
        except ImportError:
            return False

    # ─────────────────────────────────────────────────────────
    # 내부: FFmpeg 오디오 추출
    # ─────────────────────────────────────────────────────────

    @staticmethod
    async def _extract_audio(video_path: str) -> str:
        """영상에서 오디오 추출 → 16kHz mono WAV."""
        tmp_audio = os.path.join(tempfile.gettempdir(), f"audio_{uuid4().hex}.wav")
        cmd = [
            "ffmpeg", "-y",
            "-i", video_path,
            "-vn",                  # 영상 트랙 제거
            "-ar", "16000",         # 16kHz (Whisper 최적)
            "-ac", "1",             # mono
            "-f", "wav",
            tmp_audio,
        ]
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.DEVNULL,
            stderr=asyncio.subprocess.PIPE,
        )
        _, stderr = await proc.communicate()
        if proc.returncode != 0:
            raise RuntimeError(f"FFmpeg 오디오 추출 실패: {stderr.decode()[:500]}")
        return tmp_audio

    # ─────────────────────────────────────────────────────────
    # 내부: Storage 헬퍼
    # ─────────────────────────────────────────────────────────

    async def _download_from_storage(self, bucket: str, path: str) -> str:
        """Supabase Storage → /tmp 파일로 저장. 로컬 경로 반환."""
        ext      = Path(path).suffix or ".mp4"
        tmp_path = os.path.join(tempfile.gettempdir(), f"dl_{uuid4().hex}{ext}")
        loop     = asyncio.get_event_loop()

        def _download():
            data = self.db.storage.from_(bucket).download(path)
            with open(tmp_path, "wb") as f:
                f.write(data)

        await loop.run_in_executor(None, _download)
        return tmp_path

    # ─────────────────────────────────────────────────────────
    # 내부: DB 헬퍼
    # ─────────────────────────────────────────────────────────

    async def _get_script(self, script_id: str, user_id: str) -> dict:
        result = (
            self.db.table("scripts")
            .select("*")
            .eq("id", script_id)
            .eq("user_id", user_id)
            .single()
            .execute()
        )
        if not result.data:
            raise ValueError(f"스크립트를 찾을 수 없습니다: {script_id}")
        return result.data

    async def _get_video(self, video_id: str, user_id: str) -> dict:
        result = (
            self.db.table("videos")
            .select("file_path, status")
            .eq("id", video_id)
            .eq("user_id", user_id)
            .single()
            .execute()
        )
        if not result.data:
            raise ValueError(f"영상을 찾을 수 없습니다: {video_id}")
        return result.data

    async def _update_status(
        self, script_id: str, status: str, error: Optional[str] = None
    ) -> None:
        update: dict = {"status": status}
        if error:
            update["error_msg"] = error
        self.db.table("scripts").update(update).eq("id", script_id).execute()
