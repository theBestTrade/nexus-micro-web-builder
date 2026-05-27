"""
services/audio_separator.py
BGM / 보컬 분리 (demucs htdemucs)

동작 순서:
  1. Supabase Storage에서 원본 영상 다운로드 → /tmp
  2. FFmpeg로 오디오 추출 (wav)
  3. demucs htdemucs --two-stems vocals 실행
  4. no_vocals.wav (BGM) + vocals.wav 업로드 → Supabase Storage audio/
  5. scripts.bgm_path, scripts.vocals_path, status='separated' 저장
  6. /tmp 파일 정리
"""

from __future__ import annotations

import asyncio
import logging
import os
import shutil
import tempfile
from pathlib import Path
from uuid import uuid4

from supabase import Client

logger = logging.getLogger(__name__)

AUDIO_BUCKET  = "audio"
VIDEOS_BUCKET = "videos"


class AudioSeparator:
    """
    demucs htdemucs 기반 오디오 분리 서비스.

    사용 예:
        sep = AudioSeparator(db=get_db())
        result = await sep.separate(script_id, user_id)
    """

    def __init__(self, db: Client):
        self.db = db

    # ─────────────────────────────────────────────────────────
    # 공개 API
    # ─────────────────────────────────────────────────────────

    async def separate(self, script_id: str, user_id: str) -> dict:
        """
        script의 video에서 BGM·보컬을 분리합니다.

        반환:
          {
            "bgm_path":    str,   # Supabase Storage 경로 (BGM)
            "vocals_path": str,   # Supabase Storage 경로 (보컬)
          }
        """
        script_row = await self._get_script(script_id, user_id)
        video_row  = await self._get_video(script_row["video_id"], user_id)

        file_path = video_row.get("file_path")
        if not file_path:
            raise ValueError("영상이 아직 다운로드되지 않았습니다. 먼저 다운로드를 완료해주세요.")

        await self._update_status(script_id, "separating")

        tmp_dir   = None
        tmp_video = None
        tmp_audio = None
        try:
            # 1) Supabase Storage → /tmp 다운로드
            tmp_video = await self._download_from_storage(VIDEOS_BUCKET, file_path)

            # 2) FFmpeg 오디오 추출 (44.1kHz stereo WAV — demucs 최적)
            tmp_audio = await self._extract_audio(tmp_video)

            # 3) demucs htdemucs 분리
            tmp_dir, bgm_local, vocals_local = await self._run_demucs(tmp_audio)

            # 4) Supabase Storage 업로드
            base_prefix = f"{user_id}/{script_id}"
            bgm_storage    = f"{base_prefix}/bgm_{uuid4().hex}.wav"
            vocals_storage = f"{base_prefix}/vocals_{uuid4().hex}.wav"

            await self._upload_to_storage(bgm_local,    AUDIO_BUCKET, bgm_storage)
            await self._upload_to_storage(vocals_local, AUDIO_BUCKET, vocals_storage)

            # 5) DB 저장
            self.db.table("scripts").update({
                "bgm_path":    bgm_storage,
                "vocals_path": vocals_storage,
                "status":      "separated",
                "error_msg":   None,
            }).eq("id", script_id).execute()

            return {
                "bgm_path":    bgm_storage,
                "vocals_path": vocals_storage,
            }

        except Exception as e:
            logger.exception("오디오 분리 실패: script_id=%s", script_id)
            await self._update_status(script_id, "failed", str(e))
            raise
        finally:
            # /tmp 정리
            for f in [tmp_video, tmp_audio]:
                if f and os.path.exists(f):
                    try:
                        os.unlink(f)
                    except Exception:
                        pass
            if tmp_dir and os.path.exists(tmp_dir):
                try:
                    shutil.rmtree(tmp_dir, ignore_errors=True)
                except Exception:
                    pass

    # ─────────────────────────────────────────────────────────
    # 내부: demucs 실행
    # ─────────────────────────────────────────────────────────

    @staticmethod
    async def _run_demucs(audio_path: str) -> tuple[str, str, str]:
        """
        demucs htdemucs --two-stems=vocals 실행.

        반환: (output_dir, bgm_path, vocals_path)
          - bgm_path    : no_vocals.wav (반주)
          - vocals_path : vocals.wav    (원본 보컬)
        """
        out_dir = os.path.join(tempfile.gettempdir(), f"demucs_{uuid4().hex}")
        os.makedirs(out_dir, exist_ok=True)

        cmd = [
            "python", "-m", "demucs",
            "--two-stems", "vocals",
            "-n", "htdemucs",
            "--out", out_dir,
            audio_path,
        ]

        loop = asyncio.get_event_loop()

        def _run():
            import subprocess
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
            )
            return result

        result = await loop.run_in_executor(None, _run)

        if result.returncode != 0:
            raise RuntimeError(
                f"demucs 실패 (returncode={result.returncode}): "
                f"{result.stderr[:800]}"
            )

        # demucs 출력 구조:
        #   {out_dir}/htdemucs/{stem_name}/no_vocals.wav
        #   {out_dir}/htdemucs/{stem_name}/vocals.wav
        stem_name = Path(audio_path).stem
        model_dir = Path(out_dir) / "htdemucs" / stem_name

        bgm_path    = str(model_dir / "no_vocals.wav")
        vocals_path = str(model_dir / "vocals.wav")

        if not os.path.exists(bgm_path):
            raise FileNotFoundError(
                f"demucs 출력 파일을 찾을 수 없습니다: {bgm_path}\n"
                f"출력 디렉터리 내용: {list(Path(out_dir).rglob('*'))}"
            )

        return out_dir, bgm_path, vocals_path

    # ─────────────────────────────────────────────────────────
    # 내부: FFmpeg 오디오 추출
    # ─────────────────────────────────────────────────────────

    @staticmethod
    async def _extract_audio(video_path: str) -> str:
        """영상에서 오디오 추출 → 44.1kHz stereo WAV (demucs 권장 포맷)."""
        tmp_audio = os.path.join(tempfile.gettempdir(), f"sep_input_{uuid4().hex}.wav")
        cmd = [
            "ffmpeg", "-y",
            "-i", video_path,
            "-vn",
            "-ar", "44100",   # 44.1kHz (demucs 기본값)
            "-ac", "2",        # stereo
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
        tmp_path = os.path.join(tempfile.gettempdir(), f"sep_dl_{uuid4().hex}{ext}")
        loop     = asyncio.get_event_loop()

        def _download():
            data = self.db.storage.from_(bucket).download(path)
            with open(tmp_path, "wb") as f:
                f.write(data)

        await loop.run_in_executor(None, _download)
        return tmp_path

    async def _upload_to_storage(
        self, local_path: str, bucket: str, storage_path: str
    ) -> None:
        """로컬 파일 → Supabase Storage 업로드."""
        loop = asyncio.get_event_loop()

        def _upload():
            with open(local_path, "rb") as f:
                data = f.read()
            self.db.storage.from_(bucket).upload(
                path=storage_path,
                file=data,
                file_options={"content-type": "audio/wav"},
            )

        await loop.run_in_executor(None, _upload)

    # ─────────────────────────────────────────────────────────
    # 내부: DB 헬퍼
    # ─────────────────────────────────────────────────────────

    async def _get_script(self, script_id: str, user_id: str) -> dict:
        result = (
            self.db.table("scripts")
            .select("video_id, status")
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
        self, script_id: str, status: str, error: str | None = None
    ) -> None:
        update: dict = {"status": status}
        if error:
            update["error_msg"] = error
        self.db.table("scripts").update(update).eq("id", script_id).execute()
