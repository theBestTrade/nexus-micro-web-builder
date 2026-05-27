"""
services/script_adapter.py
LLM 대본 각색 (Anthropic Claude claude-sonnet-4-6)

Track 분기:
  A: 중드 리컷 → 기승전결 압축 + 도파민형 한국어 대본
  B: 쇼핑 리뷰 → 위트 있는 내돈내산 리뷰 / 정보성 꿀팁 톤
  D: 네이버 블로그 → SEO 최적화 블로그 포스트 (마크다운)

동작 순서:
  1. scripts 테이블에서 raw_stt 읽기
  2. Track 별 프롬프트로 Claude 호출
  3. adapted_script + status='adapted' 저장
"""

from __future__ import annotations

import logging
from typing import Optional

import anthropic
from supabase import Client

from core.config import get_settings

logger   = logging.getLogger(__name__)
settings = get_settings()


# ─────────────────────────────────────────────────────────────
# 프롬프트 상수
# ─────────────────────────────────────────────────────────────

_TRACK_A_SYSTEM = """\
너는 한국 유튜브 쇼츠 편집자야.
중국어 드라마 클립의 STT 텍스트를 받아,
한국 시청자가 3초 내 이탈하지 않도록 기승전결을 극대화하고
도파민을 유도하는 한국어 대본으로 재구성해.

규칙:
- 60초 이내 분량으로 압축
- 첫 문장은 반드시 훅(Hook): 강렬한 의문/반전으로 시작
- 마지막 문장은 CTA: 구독·좋아요·다음 영상 유도
- 구어체, 구어적 표현 사용
- 출력: 한국어 대본만. 설명·메타텍스트 없이.
"""

_TRACK_B_SYSTEM = """\
너는 한국 인플루언서 리뷰어야.
중국 쇼핑 영상의 STT 텍스트를 받아,
위트 있는 '내돈내산 리뷰' 또는 '정보성 꿀팁' 톤앤매너로 변환해.

규칙:
- 상품 핵심 장점 3가지를 자연스럽게 녹여낼 것
- 공감형 도입부 (예: "이거 진짜 써봤는데요...")
- 구매 욕구를 자극하되 과장 광고 금지
- 마지막: 링크 클릭 유도 CTA ("아래 링크에서 확인해보세요!")
- 출력: 한국어 대본만. 설명 없이.
"""

_TRACK_D_SYSTEM = """\
너는 한국 SEO 블로그 작가야.
중국 영상의 STT 텍스트를 받아,
네이버 검색 상위노출을 목표로 한 정보성 블로그 포스트를 작성해.

규칙:
- 마크다운 형식 (H1, H2, H3, 리스트, 강조)
- 2000~3000자 분량
- SEO 키워드: 제목·첫 단락·소제목에 자연스럽게 삽입
- 구조: 서론 → 핵심 정보 3~5개 소제목 → 결론 + CTA
- 독자 공감형 문체, 전문성 있으나 쉬운 설명
- 출력: 마크다운 블로그 본문만. 메타텍스트 없이.
"""

SYSTEM_PROMPTS: dict[str, str] = {
    "A": _TRACK_A_SYSTEM,
    "B": _TRACK_B_SYSTEM,
    "D": _TRACK_D_SYSTEM,
}

MODEL = "claude-sonnet-4-6"
MAX_TOKENS = 2048


class ScriptAdapter:
    """
    Claude 기반 대본 각색 서비스.

    사용 예:
        adapter = ScriptAdapter(db=get_db())
        result = await adapter.adapt(script_id, user_id, track="A")
    """

    def __init__(self, db: Client):
        self.db     = db
        self._client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    # ─────────────────────────────────────────────────────────
    # 공개 API
    # ─────────────────────────────────────────────────────────

    async def adapt(
        self,
        script_id: str,
        user_id:   str,
        track:     str,
        tone:      Optional[str] = None,
    ) -> dict:
        """
        raw_stt를 Claude로 각색합니다.

        반환:
          {
            "adapted_script": str,
            "track":          str,
          }
        """
        track = track.upper()
        if track not in SYSTEM_PROMPTS:
            raise ValueError(f"지원하지 않는 Track입니다: {track}. (A / B / D)")

        script_row = await self._get_script(script_id, user_id)
        raw_stt    = script_row.get("raw_stt", "")

        if not raw_stt:
            raise ValueError("STT 결과가 없습니다. 먼저 트랜스크라이브를 실행해주세요.")

        await self._update_status(script_id, "adapting")

        try:
            adapted = await self._call_claude(track, raw_stt, tone)

            self.db.table("scripts").update({
                "adapted_script": adapted,
                "status":         "adapted",
                "error_msg":      None,
            }).eq("id", script_id).execute()

            return {
                "adapted_script": adapted,
                "track":          track,
            }

        except Exception as e:
            logger.exception("대본 각색 실패: script_id=%s", script_id)
            await self._update_status(script_id, "failed", str(e))
            raise

    # ─────────────────────────────────────────────────────────
    # 내부: Claude 호출
    # ─────────────────────────────────────────────────────────

    async def _call_claude(
        self, track: str, raw_stt: str, tone: Optional[str]
    ) -> str:
        """Claude API 호출 (sync → 스레드 풀)."""
        import asyncio

        system_prompt = SYSTEM_PROMPTS[track]
        user_message  = self._build_user_message(raw_stt, tone)

        loop = asyncio.get_event_loop()

        def _invoke():
            response = self._client.messages.create(
                model      = MODEL,
                max_tokens = MAX_TOKENS,
                system     = system_prompt,
                messages   = [{"role": "user", "content": user_message}],
            )
            return response.content[0].text.strip()

        return await loop.run_in_executor(None, _invoke)

    @staticmethod
    def _build_user_message(raw_stt: str, tone: Optional[str]) -> str:
        parts = [
            "다음은 중국어 영상의 STT 원문입니다. 위 지침에 따라 한국어 대본으로 재구성해주세요.",
            "",
            "=== STT 원문 ===",
            raw_stt,
        ]
        if tone:
            parts += ["", f"[추가 톤 지침]: {tone}"]
        return "\n".join(parts)

    # ─────────────────────────────────────────────────────────
    # 내부: DB 헬퍼
    # ─────────────────────────────────────────────────────────

    async def _get_script(self, script_id: str, user_id: str) -> dict:
        result = (
            self.db.table("scripts")
            .select("raw_stt, status")
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
