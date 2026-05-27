"""
services/blog_writer.py
Track D: Claude API를 이용한 네이버 블로그 포스트 HTML 자동 생성

출력 파싱 형식:
---TITLE---
{제목}
---BODY_HTML---
{HTML 본문}
---TAGS---
{태그1,태그2,...}
---
"""

from __future__ import annotations

import logging
import re
from typing import Literal

import anthropic

from core.config import get_settings

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────
# 시스템 프롬프트 (CLAUDE.md TRACK_D_BLOG_SYSTEM)
# ─────────────────────────────────────────────────────────────

TRACK_D_BLOG_SYSTEM = """\
너는 한국 파워블로거야. 중국 쇼핑 영상의 STT 텍스트 또는 영상 대본을 받아,
네이버 블로그에 최적화된 상세 리뷰 포스트를 HTML 형식으로 작성해.

작성 규칙:
1. 제목: 검색 유입 키워드 포함, 30자 이내
2. 도입부: 구매 배경·공감 스토리 (3~4문장)
3. 본문 구성:
   - 상품 스펙 요약 (표 또는 리스트)
   - 장점 3가지 + 단점 1가지 (신뢰감 형성)
   - 실사용 후기 (구체적 수치·비교 포함)
4. 마무리: 구매 추천 대상 + CTA (링크 플레이스홀더: {{COMMERCE_LINK}})
5. 태그: 핵심 키워드 10개 이내 (쉼표 구분)

출력 형식 (이 형식 그대로, 다른 텍스트 없이):
---TITLE---
{제목}
---BODY_HTML---
{HTML 본문}
---TAGS---
{태그1,태그2,...}
---
"""

STYLE_HINTS = {
    "review": "내돈내산 솔직 리뷰 톤. 장단점을 균형 있게 서술하고 실제 사용 경험을 강조해.",
    "info":   "정보성 포스트 톤. 제품 스펙과 비교 데이터를 중심으로 객관적으로 서술해.",
    "story":  "스토리텔링 톤. 구매 계기부터 사용 과정까지 일기 형식으로 서술해.",
}


# ─────────────────────────────────────────────────────────────
# 파서
# ─────────────────────────────────────────────────────────────

def _parse_blog_output(raw: str) -> dict:
    """
    Claude 출력에서 TITLE, BODY_HTML, TAGS 섹션을 추출.
    파싱 실패 시 각 필드에 빈 문자열 반환.
    """
    def _extract(section: str) -> str:
        pattern = rf"---{section}---\s*([\s\S]*?)(?=---[A-Z_]+---|$)"
        m = re.search(pattern, raw)
        return m.group(1).strip() if m else ""

    title    = _extract("TITLE")
    body     = _extract("BODY_HTML")
    tags_raw = _extract("TAGS")

    tags = [t.strip() for t in tags_raw.split(",") if t.strip()][:10]

    return {"title_ko": title, "body_html": body, "tags": tags}


# ─────────────────────────────────────────────────────────────
# 서비스
# ─────────────────────────────────────────────────────────────

class BlogWriterService:
    """Claude claude-sonnet-4-6로 네이버 블로그 포스트를 생성한다."""

    def __init__(self) -> None:
        settings = get_settings()
        self.client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    def generate(
        self,
        script_text: str,
        style: Literal["review", "info", "story"] = "review",
        commerce_link: str | None = None,
    ) -> dict:
        """
        Parameters
        ----------
        script_text   : STT 또는 각색 대본
        style         : 포스트 스타일
        commerce_link : 삽입할 커머스 링크 ({{COMMERCE_LINK}} 교체)

        Returns
        -------
        dict: { title_ko, body_html, tags }
        """
        style_hint = STYLE_HINTS.get(style, STYLE_HINTS["review"])

        user_msg = (
            f"포스트 스타일: {style_hint}\n\n"
            f"영상 대본 또는 STT 텍스트:\n{script_text[:4000]}"
        )

        try:
            message = self.client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=4096,
                system=TRACK_D_BLOG_SYSTEM,
                messages=[{"role": "user", "content": user_msg}],
            )
            raw = message.content[0].text
            result = _parse_blog_output(raw)
        except Exception as exc:
            logger.warning("BlogWriter 생성 실패: %s", exc)
            result = self._fallback(script_text)

        # 커머스 링크 교체
        if commerce_link and result.get("body_html"):
            result["body_html"] = result["body_html"].replace(
                "{{COMMERCE_LINK}}", commerce_link
            )

        return result

    @staticmethod
    def _fallback(script_text: str) -> dict:
        snippet = script_text[:100].replace("\n", " ")
        return {
            "title_ko": f"리뷰: {snippet[:28]}",
            "body_html": f"<p>{snippet}</p>",
            "tags":      ["리뷰", "추천"],
        }

    def attach_commerce_links(self, body_html: str, commerce_links: dict) -> str:
        """
        body_html 내 {{COMMERCE_LINK}} 플레이스홀더를
        commerce_links 딕셔너리 값으로 치환.
        우선순위: naver_shopping > coupang > smartstore
        """
        url = (
            commerce_links.get("naver_shopping")
            or commerce_links.get("coupang")
            or commerce_links.get("smartstore")
            or ""
        )
        if url:
            body_html = body_html.replace("{{COMMERCE_LINK}}", url)
        return body_html
