"""
services/naver_blog.py
Track D: Playwright를 이용한 네이버 블로그 스마트에디터 3.0 자동 등록

NAVER_BLOG_AUTOMATION_SPEC:
  0. accounts 테이블에서 account_id로 계정 조회 → credentials_encrypted 복호화
  1. platform_cookies에서 account_id로 쿠키 조회 → 만료 시 자동 재로그인
  2. https://blog.naver.com/{blog_id}/postwrite 접근
  3. 스마트에디터 3.0 iframe 내 contenteditable 영역에 HTML 삽입
  4. 제목 입력 (input#subject)
  5. 태그 입력 (최대 10개)
  6. 대표 이미지: 본문 내 첫 <img> 태그를 대표 이미지로 사용
  7. '발행' 버튼 클릭
  8. 발행 완료 URL 파싱 → 반환
  9. accounts.last_used_at, health_status='healthy' 업데이트

ANTI_BOT_MEASURES:
  - random.uniform(1.5, 4.0) 딜레이
  - page.mouse.move() 랜덤 이동
  - 최신 Chrome UA
  - viewport: 1920x1080
  - proxy 연동 (ProxyManager)
"""

from __future__ import annotations

import asyncio
import logging
import random
from datetime import datetime, timezone
from typing import Optional

from supabase import Client

from core.config import get_settings
from services.account_manager import AccountManager

logger = logging.getLogger(__name__)

# 실제 Chrome 최신 UA (봇 탐지 회피)
_CHROME_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/125.0.0.0 Safari/537.36"
)

# 네이버 로그인 URL
_NAVER_LOGIN_URL   = "https://nid.naver.com/nidlogin.login"
_NAVER_BLOG_WRITE  = "https://blog.naver.com/{blog_id}/postwrite"


class NaverBlogService:
    """
    네이버 블로그 스마트에디터 3.0 Playwright 자동화 서비스.
    """

    def __init__(self, db: Client) -> None:
        self.db      = db
        self.manager = AccountManager(db)

    # ─────────────────────────────────────────────────────────
    # 공개 메서드
    # ─────────────────────────────────────────────────────────

    async def publish(
        self,
        account_id: str,
        user_id: str,
        title_ko: str,
        body_html: str,
        tags: list[str],
        proxy_url: Optional[str] = None,
    ) -> str:
        """
        블로그 포스트를 발행하고 완성된 포스트 URL을 반환한다.

        Raises
        ------
        RuntimeError : 발행 실패 (CAPTCHA·로그인 오류 등)
        """
        # 0. 계정 정보 조회
        account_raw = self._get_account_raw(account_id)
        creds       = self.manager._decode_credentials(
            account_raw.get("credentials_encrypted")
        )
        blog_id = account_raw.get("platform_account_id") or creds.get("login_id", "")
        if not blog_id:
            raise RuntimeError("platform_account_id(블로그 ID)가 설정되지 않았습니다.")

        # 1. 쿠키 조회
        cookies = self.manager.get_cookies(account_id)

        # Playwright 실행
        from playwright.async_api import async_playwright

        proxy_cfg: dict | None = {"server": proxy_url} if proxy_url else None

        async with async_playwright() as p:
            browser = await p.chromium.launch(
                headless=True,
                args=["--no-sandbox", "--disable-blink-features=AutomationControlled"],
                proxy=proxy_cfg,
            )
            ctx = await browser.new_context(
                viewport={"width": 1920, "height": 1080},
                user_agent=_CHROME_UA,
                locale="ko-KR",
            )

            # 쿠키 주입 또는 로그인
            if cookies:
                await ctx.add_cookies(cookies)
            else:
                await self._login(ctx, creds, blog_id)
                # 로그인 후 쿠키 저장
                new_cookies = await ctx.cookies()
                self.manager.save_cookies(account_id, new_cookies)

            page = await ctx.new_page()

            try:
                post_url = await self._write_post(
                    page, blog_id, title_ko, body_html, tags
                )
            except Exception as exc:
                logger.error("블로그 포스팅 실패 [%s]: %s", blog_id, exc)
                await browser.close()
                raise

            await browser.close()

        # 9. 계정 상태 업데이트
        self._update_account_health(account_id, "healthy")

        return post_url

    # ─────────────────────────────────────────────────────────
    # 내부: 로그인
    # ─────────────────────────────────────────────────────────

    async def _login(self, ctx, creds: dict, blog_id: str) -> None:
        """
        네이버 ID/PW로 로그인.
        JavaScript로 input에 값을 주입해 봇 감지 우회.
        """
        login_id = creds.get("login_id", "")
        login_pw = creds.get("login_pw", "")
        if not login_id or not login_pw:
            raise RuntimeError("네이버 로그인 ID/PW가 저장되어 있지 않습니다.")

        page = await ctx.new_page()
        await page.goto(_NAVER_LOGIN_URL, wait_until="domcontentloaded")
        await self._random_delay(1.0, 2.0)

        # JavaScript로 직접 input 값 설정 (자동화 감지 우회)
        await page.evaluate(
            """([id, pw]) => {
                const idEl = document.querySelector('#id');
                const pwEl = document.querySelector('#pw');
                const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                    window.HTMLInputElement.prototype, 'value').set;
                nativeInputValueSetter.call(idEl, id);
                idEl.dispatchEvent(new Event('input', { bubbles: true }));
                nativeInputValueSetter.call(pwEl, pw);
                pwEl.dispatchEvent(new Event('input', { bubbles: true }));
            }""",
            [login_id, login_pw],
        )
        await self._random_delay(0.5, 1.5)
        await self._random_mouse_move(page)

        await page.click("#log\\.login")
        await page.wait_for_url("https://www.naver.com/**", timeout=15_000)
        await page.close()

    # ─────────────────────────────────────────────────────────
    # 내부: 포스트 작성
    # ─────────────────────────────────────────────────────────

    async def _write_post(
        self,
        page,
        blog_id: str,
        title: str,
        body_html: str,
        tags: list[str],
    ) -> str:
        """
        스마트에디터 3.0 iframe에 HTML을 삽입하고 발행한다.
        반환값: 발행된 포스트 URL
        """
        write_url = _NAVER_BLOG_WRITE.format(blog_id=blog_id)
        await page.goto(write_url, wait_until="networkidle", timeout=30_000)
        await self._random_delay(2.0, 3.5)

        # CAPTCHA 감지
        if "captcha" in page.url.lower() or "nid.naver.com" in page.url:
            raise RuntimeError(
                "CAPTCHA 또는 로그인 페이지로 리다이렉트되었습니다. "
                "쿠키를 갱신하거나 수동으로 확인해주세요."
            )

        # ── 제목 입력 ────────────────────────────────────────
        title_selector = "input#subject, input[placeholder*='제목']"
        await page.wait_for_selector(title_selector, timeout=15_000)
        await page.click(title_selector)
        await self._random_delay(0.3, 0.8)
        await page.fill(title_selector, title)
        await self._random_delay(0.5, 1.2)

        # ── 스마트에디터 iframe HTML 삽입 ───────────────────
        # mainFrame iframe 대기
        await page.wait_for_selector(
            "iframe#mainFrame, iframe[name='mainFrame']", timeout=20_000
        )
        main_frame = page.frame("mainFrame")
        if main_frame is None:
            # iframe이 named frame이 아닌 경우 첫 번째 iframe 시도
            frames = page.frames
            main_frame = next(
                (f for f in frames if "mainFrame" in (f.name or "")), None
            )
        if main_frame is None:
            raise RuntimeError("스마트에디터 iframe을 찾을 수 없습니다.")

        # contenteditable 영역에 HTML 삽입
        editor_selector = ".se-component-content, [contenteditable='true'], .se2_inputarea"
        await main_frame.wait_for_selector(editor_selector, timeout=15_000)
        await self._random_delay(0.8, 1.5)

        # innerHTML 주입 (React/SE3 이벤트 트리거)
        await main_frame.evaluate(
            """(html) => {
                const el = document.querySelector(
                    '.se-component-content, [contenteditable="true"], .se2_inputarea'
                );
                if (!el) throw new Error('Editor element not found');
                el.innerHTML = html;
                el.dispatchEvent(new Event('input',  { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
            }""",
            body_html,
        )
        await self._random_delay(1.0, 2.0)
        await self._random_mouse_move(page)

        # ── 태그 입력 ────────────────────────────────────────
        tag_input_sel = "input.tag_input, input[placeholder*='태그']"
        if await page.query_selector(tag_input_sel):
            for tag in tags[:10]:
                await page.click(tag_input_sel)
                await page.type(tag_input_sel, tag, delay=50)
                await page.keyboard.press("Enter")
                await self._random_delay(0.3, 0.8)

        await self._random_delay(0.5, 1.5)

        # ── 발행 버튼 ─────────────────────────────────────────
        publish_btn_sel = (
            "button.publish_btn, "
            "button:has-text('발행'), "
            "a:has-text('발행'), "
            "button[type='submit']"
        )
        await page.click(publish_btn_sel)
        await self._random_delay(2.0, 3.0)

        # 발행 확인 팝업 처리 (있을 경우)
        confirm_btn_sel = "button:has-text('확인'), button:has-text('발행하기')"
        if await page.query_selector(confirm_btn_sel):
            await page.click(confirm_btn_sel)
            await self._random_delay(2.0, 4.0)

        # ── 발행 URL 파싱 ────────────────────────────────────
        current_url = page.url
        if "logNo=" in current_url or f"blog.naver.com/{blog_id}" in current_url:
            return current_url

        # 페이지 이동 대기
        try:
            await page.wait_for_url(
                f"**/blog.naver.com/{blog_id}/**", timeout=15_000
            )
            return page.url
        except Exception:
            # URL 파싱 실패 시 현재 URL 반환 (발행은 성공했을 수 있음)
            logger.warning("발행 URL 파싱 불확실: %s", current_url)
            return current_url or f"https://blog.naver.com/{blog_id}"

    # ─────────────────────────────────────────────────────────
    # 내부: 헬퍼
    # ─────────────────────────────────────────────────────────

    @staticmethod
    async def _random_delay(min_s: float = 1.5, max_s: float = 4.0) -> None:
        await asyncio.sleep(random.uniform(min_s, max_s))

    @staticmethod
    async def _random_mouse_move(page) -> None:
        x = random.randint(200, 1600)
        y = random.randint(100, 800)
        await page.mouse.move(x, y)

    def _get_account_raw(self, account_id: str) -> dict:
        res = (
            self.db.table("accounts")
            .select("*")
            .eq("id", account_id)
            .single()
            .execute()
        )
        if not res.data:
            raise RuntimeError(f"계정을 찾을 수 없습니다: {account_id}")
        return res.data

    def _update_account_health(self, account_id: str, status: str) -> None:
        self.db.table("accounts").update(
            {
                "health_status": status,
                "last_used_at":  datetime.now(timezone.utc).isoformat(),
            }
        ).eq("id", account_id).execute()
