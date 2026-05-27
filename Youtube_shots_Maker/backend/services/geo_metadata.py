"""
services/geo_metadata.py
GEO (Generative Engine Optimization) 메타데이터 생성
— Claude API를 이용해 YouTube 설명란·블로그 하단 삽입용 구조화 텍스트 생성
"""

from __future__ import annotations

import json
import logging
import re

import anthropic

from core.config import get_settings

logger = logging.getLogger(__name__)


GEO_SYSTEM_PROMPT = """\
너는 유튜브 쇼츠 SEO·GEO 전문가야.
주어진 한국어 영상 대본을 분석해서 아래 JSON 형식으로 메타데이터를 생성해.
AI 검색 엔진(ChatGPT Search, Perplexity, Gemini)이 딥인덱싱할 수 있도록
구체적인 엔터티와 FAQ를 포함해.

출력 형식 (JSON만, 다른 텍스트 금지):
{
  "title": "...",           // 30자 이내, 핵심 키워드 포함
  "description": "...",    // 150자 이내, 핵심 가치 요약 (명확한 주어·술어)
  "tags": ["...", "..."],  // 최대 15개 키워드
  "context_summary": "...", // 2~3문장 핵심 요약
  "faq_schema": [
    { "question": "...", "answer": "..." },
    { "question": "...", "answer": "..." }
  ]
}
"""


class GeoMetadataService:
    """Claude API로 GEO 메타데이터를 생성하는 서비스"""

    def __init__(self) -> None:
        settings = get_settings()
        self.client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    async def generate(
        self,
        adapted_script: str,
        track: str,
        title_hint: str | None = None,
    ) -> dict:
        """
        한국어 대본 → GEO 메타데이터 dict 반환
        track: "A" | "B" | "D"
        """
        track_hint = {
            "A": "중국 드라마 리컷 쇼츠",
            "B": "쇼핑 리뷰·추천 쇼츠",
            "D": "네이버 블로그 상세 리뷰",
        }.get(track, "쇼츠 영상")

        user_content = f"콘텐츠 유형: {track_hint}\n\n대본:\n{adapted_script[:3000]}"
        if title_hint:
            user_content = f"제목 힌트: {title_hint}\n" + user_content

        try:
            message = self.client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=1024,
                system=GEO_SYSTEM_PROMPT,
                messages=[{"role": "user", "content": user_content}],
            )
            raw = message.content[0].text.strip()

            # JSON 추출 (code fence 제거)
            json_match = re.search(r"\{[\s\S]*\}", raw)
            if not json_match:
                raise ValueError("JSON 파싱 실패")

            data = json.loads(json_match.group())
            return self._normalize(data)

        except Exception as e:
            logger.warning("GEO 메타데이터 생성 실패: %s", e)
            return self._fallback(adapted_script, track_hint)

    # ─────────────────────────────────────────────────────────
    # 내부 헬퍼
    # ─────────────────────────────────────────────────────────

    @staticmethod
    def _normalize(data: dict) -> dict:
        return {
            "title":           str(data.get("title", ""))[:50],
            "description":     str(data.get("description", ""))[:300],
            "tags":            [str(t) for t in data.get("tags", [])][:15],
            "context_summary": str(data.get("context_summary", "")),
            "faq_schema":      [
                {"question": str(f.get("question", "")),
                 "answer":   str(f.get("answer", ""))}
                for f in data.get("faq_schema", [])[:5]
            ],
        }

    @staticmethod
    def _fallback(script: str, track_hint: str) -> dict:
        """API 실패 시 기본값 반환"""
        snippet = script[:80].replace("\n", " ")
        return {
            "title":           f"[{track_hint}] {snippet}",
            "description":     snippet,
            "tags":            ["쇼츠", "AI", track_hint],
            "context_summary": snippet,
            "faq_schema":      [],
        }
