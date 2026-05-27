"""
services/video_editor.py
FFmpeg 기반 최종 영상 렌더링

파이프라인:
  1. 원본 영상 다운로드 → /tmp
  2. BGM 오디오 다운로드 → /tmp  (bgm_path 있을 때)
  3. TTS 오디오 다운로드 → /tmp
  4. SRT 자막 파일 생성 (adapted_script → 단순 타이밍 분배)
  5. FFmpeg 렌더링:
       - 영상 + (BGM 30% + TTS 100%) 오디오 믹스
       - ASS/SRT 자막 오버레이 (NotoSansKR 폰트)
  6. 최종 MP4 → Supabase Storage finals/ 업로드
  7. scripts.final_video_path, subtitle_style, status='ready' 저장
  8. /tmp 파일 정리
"""

from __future__ import annotations

import asyncio
import logging
import math
import os
import tempfile
import textwrap
from pathlib import Path
from typing import Optional
from uuid import uuid4

from supabase import Client

from models.script import DEFAULT_SUBTITLE_STYLE

logger = logging.getLogger(__name__)

VIDEOS_BUCKET = "videos"
AUDIO_BUCKET  = "audio"
FINALS_BUCKET = "finals"

# TTS 길이가 원본의 ±20% 초과 시 속도 보정 허용 범위
ATEMPO_MIN = 0.8
ATEMPO_MAX = 1.2


class VideoEditor:
    """
    FFmpeg 기반 영상 편집 서비스.

    사용 예:
        editor = VideoEditor(db=get_db())
        result = await editor.render(script_id, user_id)
    """

    def __init__(self, db: Client):
        self.db = db

    # ─────────────────────────────────────────────────────────
    # 공개 API
    # ─────────────────────────────────────────────────────────

    async def render(
        self,
        script_id:      str,
        user_id:        str,
        font:           str = "NotoSansKR",
        subtitle_style: Optional[dict] = None,
    ) -> dict:
        """
        최종 영상을 렌더링합니다.

        반환:
          {
            "final_video_path": str,   # Supabase Storage 경로
            "subtitle_style":   dict,
          }
        """
        style = {**DEFAULT_SUBTITLE_STYLE, **(subtitle_style or {}), "font_name": font}

        script_row = await self._get_script(script_id, user_id)
        video_row  = await self._get_video(script_row["video_id"], user_id)

        file_path     = video_row.get("file_path")
        tts_path      = script_row.get("tts_audio_path")
        bgm_path      = script_row.get("bgm_path")
        adapted_text  = script_row.get("adapted_script", "")
        bgm_preserved = script_row.get("bgm_preserved", True)

        if not file_path:
            raise ValueError("원본 영상 경로가 없습니다.")
        if not tts_path:
            raise ValueError("TTS 오디오 경로가 없습니다. 먼저 TTS 합성을 실행해주세요.")

        await self._update_status(script_id, "rendering")

        tmp_files = []
        try:
            # 1) 다운로드
            tmp_video = await self._download(VIDEOS_BUCKET, file_path)
            tmp_tts   = await self._download(AUDIO_BUCKET,  tts_path)
            tmp_files += [tmp_video, tmp_tts]

            tmp_bgm = None
            if bgm_preserved and bgm_path:
                tmp_bgm = await self._download(AUDIO_BUCKET, bgm_path)
                tmp_files.append(tmp_bgm)

            # 2) TTS 속도 보정 (원본 영상 길이 기준 ±20%)
            video_dur = await self._get_duration(tmp_video)
            tts_dur   = await self._get_duration(tmp_tts)

            if tts_dur > 0 and video_dur > 0:
                ratio = tts_dur / video_dur
                if ratio < ATEMPO_MIN or ratio > ATEMPO_MAX:
                    # 속도 보정이 필요한 경우에만 atempo 적용
                    atempo = min(ATEMPO_MAX, max(ATEMPO_MIN, ratio))
                    tmp_tts_adjusted = await self._adjust_speed(tmp_tts, atempo)
                    tmp_files.append(tmp_tts_adjusted)
                    tmp_tts = tmp_tts_adjusted

            # 3) SRT 자막 생성
            tts_dur_final = await self._get_duration(tmp_tts)
            tmp_srt = self._generate_srt(
                adapted_text, tts_dur_final,
                max_chars=style.get("max_chars_per_line", 20)
            )
            tmp_files.append(tmp_srt)

            # 4) FFmpeg 렌더링
            tmp_output = os.path.join(
                tempfile.gettempdir(), f"final_{uuid4().hex}.mp4"
            )
            tmp_files.append(tmp_output)

            await self._ffmpeg_render(
                video_path  = tmp_video,
                tts_path    = tmp_tts,
                bgm_path    = tmp_bgm,
                srt_path    = tmp_srt,
                output_path = tmp_output,
                style       = style,
            )

            # 5) Storage 업로드
            storage_path = f"{user_id}/{script_id}/final_{uuid4().hex}.mp4"
            await self._upload(tmp_output, FINALS_BUCKET, storage_path)

            # 6) DB 저장
            self.db.table("scripts").update({
                "final_video_path": storage_path,
                "subtitle_style":   style,
                "status":           "ready",
                "error_msg":        None,
            }).eq("id", script_id).execute()

            return {
                "final_video_path": storage_path,
                "subtitle_style":   style,
            }

        except Exception as e:
            logger.exception("영상 렌더링 실패: script_id=%s", script_id)
            await self._update_status(script_id, "failed", str(e))
            raise
        finally:
            for f in tmp_files:
                if f and os.path.exists(f):
                    try:
                        os.unlink(f)
                    except Exception:
                        pass

    # ─────────────────────────────────────────────────────────
    # 내부: FFmpeg 렌더링
    # ─────────────────────────────────────────────────────────

    @staticmethod
    async def _ffmpeg_render(
        video_path:  str,
        tts_path:    str,
        bgm_path:    Optional[str],
        srt_path:    str,
        output_path: str,
        style:       dict,
    ) -> None:
        """
        FFmpeg 최종 렌더링:
          - 영상 스트림: 원본 그대로 (libx264 copy → 실패 시 재인코딩)
          - 오디오 스트림:
              BGM 있을 때: amix(BGM*0.3 + TTS*1.0)
              BGM 없을 때: TTS만
          - 자막: SRT burn-in (subtitles 필터)
        """
        # ── 자막 필터 스타일 구성 ──────────────────────────────
        font_name   = style.get("font_name", "NotoSansKR")
        font_size   = style.get("font_size", 22)
        pri_color   = _color_to_ass(style.get("primary_color", "white"))
        out_color   = _color_to_ass(style.get("outline_color", "black"))
        outline_w   = style.get("outline_width", 2)
        shadow      = style.get("shadow", 1)
        margin_bot  = style.get("margin_bottom", 60)

        # SRT 경로 (Windows 경로 이스케이프)
        srt_escaped = srt_path.replace("\\", "/").replace(":", "\\:")
        subtitle_filter = (
            f"subtitles='{srt_escaped}'"
            f":force_style='FontName={font_name},"
            f"FontSize={font_size},"
            f"PrimaryColour={pri_color},"
            f"OutlineColour={out_color},"
            f"Outline={outline_w},"
            f"Shadow={shadow},"
            f"MarginV={margin_bot},"
            f"Alignment=2'"
        )

        # ── 입력 스트림 구성 ──────────────────────────────────
        if bgm_path:
            inputs = [
                "ffmpeg", "-y",
                "-i", video_path,   # [0] 영상
                "-i", tts_path,     # [1] TTS
                "-i", bgm_path,     # [2] BGM
            ]
            audio_filter = (
                "[1:a]volume=1.0[tts];"
                "[2:a]volume=0.3[bgm];"
                "[tts][bgm]amix=inputs=2:duration=first[aout]"
            )
            filter_complex = f"{audio_filter};[0:v]{subtitle_filter}[vout]"
            cmd = inputs + [
                "-filter_complex", filter_complex,
                "-map", "[vout]",
                "-map", "[aout]",
                "-c:v", "libx264", "-preset", "fast", "-crf", "22",
                "-c:a", "aac", "-b:a", "128k",
                "-movflags", "+faststart",
                output_path,
            ]
        else:
            inputs = [
                "ffmpeg", "-y",
                "-i", video_path,   # [0] 영상
                "-i", tts_path,     # [1] TTS
            ]
            filter_complex = f"[0:v]{subtitle_filter}[vout]"
            cmd = inputs + [
                "-filter_complex", filter_complex,
                "-map", "[vout]",
                "-map", "1:a",
                "-c:v", "libx264", "-preset", "fast", "-crf", "22",
                "-c:a", "aac", "-b:a", "128k",
                "-movflags", "+faststart",
                output_path,
            ]

        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.DEVNULL,
            stderr=asyncio.subprocess.PIPE,
        )
        _, stderr = await proc.communicate()
        if proc.returncode != 0:
            raise RuntimeError(
                f"FFmpeg 렌더링 실패: {stderr.decode()[:800]}"
            )

    # ─────────────────────────────────────────────────────────
    # 내부: 유틸
    # ─────────────────────────────────────────────────────────

    @staticmethod
    async def _get_duration(media_path: str) -> float:
        """ffprobe로 미디어 길이(초) 조회."""
        cmd = [
            "ffprobe", "-v", "quiet",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            media_path,
        ]
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.DEVNULL,
        )
        stdout, _ = await proc.communicate()
        try:
            return float(stdout.decode().strip())
        except ValueError:
            return 0.0

    @staticmethod
    async def _adjust_speed(audio_path: str, atempo: float) -> str:
        """atempo 필터로 TTS 속도 보정 → 새 파일 반환."""
        out_path = os.path.join(
            tempfile.gettempdir(), f"tts_adj_{uuid4().hex}.mp3"
        )
        # atempo는 0.5~2.0 범위만 가능; 더 큰 변환은 체이닝
        filters = _build_atempo_chain(atempo)
        cmd = [
            "ffmpeg", "-y",
            "-i", audio_path,
            "-filter:a", filters,
            out_path,
        ]
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.DEVNULL,
            stderr=asyncio.subprocess.PIPE,
        )
        _, stderr = await proc.communicate()
        if proc.returncode != 0:
            raise RuntimeError(f"atempo 조정 실패: {stderr.decode()[:400]}")
        return out_path

    @staticmethod
    def _generate_srt(text: str, duration: float, max_chars: int = 20) -> str:
        """
        대본 텍스트를 균등 타이밍으로 분할한 SRT 파일 생성 → /tmp 반환.
        """
        lines = _split_text(text, max_chars)
        if not lines:
            lines = [text[:max_chars]] if text else [""]

        n         = len(lines)
        seg_dur   = duration / n if n > 0 else duration
        srt_lines = []

        for i, line in enumerate(lines):
            start = i * seg_dur
            end   = min((i + 1) * seg_dur, duration)
            srt_lines.append(
                f"{i + 1}\n"
                f"{_srt_time(start)} --> {_srt_time(end)}\n"
                f"{line}\n"
            )

        srt_content = "\n".join(srt_lines)
        tmp_srt = os.path.join(tempfile.gettempdir(), f"sub_{uuid4().hex}.srt")
        with open(tmp_srt, "w", encoding="utf-8") as f:
            f.write(srt_content)
        return tmp_srt

    # ─────────────────────────────────────────────────────────
    # 내부: Storage 헬퍼
    # ─────────────────────────────────────────────────────────

    async def _download(self, bucket: str, path: str) -> str:
        ext      = Path(path).suffix or ".bin"
        tmp_path = os.path.join(tempfile.gettempdir(), f"ve_{uuid4().hex}{ext}")
        loop     = asyncio.get_event_loop()

        def _dl():
            data = self.db.storage.from_(bucket).download(path)
            with open(tmp_path, "wb") as f:
                f.write(data)

        await loop.run_in_executor(None, _dl)
        return tmp_path

    async def _upload(self, local_path: str, bucket: str, storage_path: str) -> None:
        loop = asyncio.get_event_loop()

        def _up():
            with open(local_path, "rb") as f:
                data = f.read()
            self.db.storage.from_(bucket).upload(
                path=storage_path,
                file=data,
                file_options={"content-type": "video/mp4"},
            )

        await loop.run_in_executor(None, _up)

    # ─────────────────────────────────────────────────────────
    # 내부: DB 헬퍼
    # ─────────────────────────────────────────────────────────

    async def _get_script(self, script_id: str, user_id: str) -> dict:
        result = (
            self.db.table("scripts")
            .select("video_id, tts_audio_path, bgm_path, adapted_script, bgm_preserved")
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
            .select("file_path")
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


# ─────────────────────────────────────────────────────────────
# 모듈 레벨 유틸
# ─────────────────────────────────────────────────────────────

def _srt_time(seconds: float) -> str:
    """초 → SRT 시간 형식 00:00:00,000"""
    h   = int(seconds // 3600)
    m   = int((seconds % 3600) // 60)
    s   = int(seconds % 60)
    ms  = int(round((seconds - int(seconds)) * 1000))
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def _split_text(text: str, max_chars: int) -> list[str]:
    """대본을 max_chars 기준으로 자연스럽게 줄 분할."""
    sentences = [s.strip() for s in text.replace("\n", " ").split(".") if s.strip()]
    lines: list[str] = []
    for sent in sentences:
        wrapped = textwrap.wrap(sent, width=max_chars)
        lines.extend(wrapped)
    return lines or [text[:max_chars]]


def _color_to_ass(color: str) -> str:
    """CSS 색상 이름 → ASS &H00BBGGRR 형식"""
    mapping = {
        "white":  "&H00FFFFFF",
        "black":  "&H00000000",
        "yellow": "&H0000FFFF",
        "red":    "&H000000FF",
        "blue":   "&H00FF0000",
        "green":  "&H0000FF00",
    }
    return mapping.get(color.lower(), "&H00FFFFFF")


def _build_atempo_chain(ratio: float) -> str:
    """
    atempo 필터는 0.5~2.0 범위만 지원.
    범위 초과 시 여러 단계로 체이닝.
    """
    filters = []
    while ratio > 2.0:
        filters.append("atempo=2.0")
        ratio /= 2.0
    while ratio < 0.5:
        filters.append("atempo=0.5")
        ratio /= 0.5
    filters.append(f"atempo={ratio:.4f}")
    return ",".join(filters)
