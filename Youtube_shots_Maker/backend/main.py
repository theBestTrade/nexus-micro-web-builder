"""
main.py
NOMAD Short Factory — FastAPI 앱 진입점
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import accounts, sourcing, studio, publisher, proxy, blog, commerce, oauth


# ─────────────────────────────────────────────────────────────
# Lifespan (시작 / 종료 훅)
# ─────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 시작 시 실행
    print("[START] NOMAD Short Factory API")
    yield
    # 종료 시 실행
    print("[STOP] NOMAD Short Factory API")


# ─────────────────────────────────────────────────────────────
# FastAPI 앱 생성
# ─────────────────────────────────────────────────────────────

app = FastAPI(
    title="NOMAD Short Factory API",
    description="중국 숏폼 AI 재창작 · 멀티채널 자동 배포 플랫폼",
    version="0.1.0",
    lifespan=lifespan,
)

# ─────────────────────────────────────────────────────────────
# CORS (Next.js dev server 허용)
# ─────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",   # Next.js dev
        "http://localhost:3001",
        "https://*.vercel.app",    # Vercel preview
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────────────────────
# 라우터 등록
# ─────────────────────────────────────────────────────────────

app.include_router(accounts.router)
app.include_router(oauth.router)       # Phase 6 (OAuth 채널 연동)
app.include_router(sourcing.router)
app.include_router(studio.router)
app.include_router(publisher.router)   # Phase 3
app.include_router(proxy.router)       # Phase 3
app.include_router(blog.router)        # Phase 4 (Track D)
app.include_router(commerce.router)   # Phase 5 (Track B)


# ─────────────────────────────────────────────────────────────
# 헬스체크
# ─────────────────────────────────────────────────────────────

@app.get("/health", tags=["system"])
async def health_check():
    return {"status": "ok", "service": "nomad-short-factory", "phase": "6"}


@app.get("/", tags=["system"])
async def root():
    return {
        "service": "NOMAD Short Factory API",
        "docs": "/docs",
        "version": "0.3.0",
    }
