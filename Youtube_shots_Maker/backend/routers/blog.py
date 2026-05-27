"""
routers/blog.py
Track D: 네이버 블로그 API — Phase 4

엔드포인트:
  POST /api/blog/generate              — 블로그 포스트 생성 (Celery 큐)
  GET  /api/blog/posts                 — 블로그 포스트 목록
  GET  /api/blog/preview/{id}          — 단일 포스트 미리보기
  PUT  /api/blog/{id}                  — 포스트 수동 편집
  POST /api/blog/publish               — 네이버 블로그 발행 예약 (Celery 큐)
  GET  /api/blog/jobs                  — 발행 작업 목록
  GET  /api/blog/task/{task_id}        — 태스크 상태 조회
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Optional

from celery.result import AsyncResult
from fastapi import APIRouter, Depends, HTTPException, Query, status

from core.auth import get_current_user_id
from database.client import get_db
from models.blog import (
    BlogGenerateRequest,
    BlogJobItem,
    BlogPostResponse,
    BlogPublishRequest,
    BlogTaskResponse,
    BlogTaskStatusResponse,
    BlogUpdateRequest,
)
from tasks.blog_pipeline import generate_blog_post_task, publish_blog_post_task

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/blog", tags=["blog"])


# ─────────────────────────────────────────────────────────────
# 내부 유틸
# ─────────────────────────────────────────────────────────────

def _row_to_response(row: dict) -> BlogPostResponse:
    acc = row.pop("accounts", None) or {}
    return BlogPostResponse(
        **{k: v for k, v in row.items() if k in BlogPostResponse.model_fields},
        account_alias=acc.get("alias"),
        account_display_name=acc.get("display_name"),
    )


# ─────────────────────────────────────────────────────────────
# POST /api/blog/generate — 블로그 포스트 생성 요청
# ─────────────────────────────────────────────────────────────

@router.post(
    "/generate",
    response_model=BlogTaskResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def generate_blog_post(
    body: BlogGenerateRequest,
    user_id: str = Depends(get_current_user_id),
    db=Depends(get_db),
):
    """
    video_id에 연결된 스크립트를 기반으로 Claude API 블로그 포스트 생성을 큐에 등록한다.
    즉시 blog_post_id와 task_id를 반환하고, 실제 생성은 백그라운드에서 진행된다.
    """
    # video 확인
    video_res = (
        db.table("videos")
        .select("id, track")
        .eq("id", body.video_id)
        .eq("user_id", user_id)
        .single()
        .execute()
    )
    if not video_res.data:
        raise HTTPException(status_code=404, detail="영상을 찾을 수 없습니다.")

    # blog_post 레코드 생성 (status='draft' → Celery가 'generating'으로 변경)
    insert_data: dict = {
        "user_id":  user_id,
        "video_id": body.video_id,
        "status":   "draft",
    }
    if body.script_id:
        insert_data["script_id"] = body.script_id
    if body.commerce_link:
        insert_data["commerce_links"] = {"coupang": body.commerce_link}

    post_res = db.table("blog_posts").insert(insert_data).execute()
    if not post_res.data:
        raise HTTPException(status_code=500, detail="블로그 포스트 레코드 생성 실패")

    blog_post_id = post_res.data[0]["id"]

    # Celery 태스크 등록
    task = generate_blog_post_task.apply_async(
        args=[blog_post_id, user_id, body.style]
    )

    return BlogTaskResponse(
        task_id      = task.id,
        blog_post_id = blog_post_id,
        status       = "queued",
        message      = "블로그 포스트 생성이 큐에 등록되었습니다.",
    )


# ─────────────────────────────────────────────────────────────
# GET /api/blog/posts — 블로그 포스트 목록
# ─────────────────────────────────────────────────────────────

@router.get("/posts", response_model=list[BlogPostResponse])
async def list_blog_posts(
    video_id: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    limit: int = Query(50, ge=1, le=200),
    user_id: str = Depends(get_current_user_id),
    db=Depends(get_db),
):
    query = (
        db.table("blog_posts")
        .select("*, accounts!publish_account_id(alias, display_name)")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(limit)
    )
    if video_id:
        query = query.eq("video_id", video_id)
    if status_filter:
        query = query.eq("status", status_filter)

    res = query.execute()
    return [_row_to_response(row) for row in (res.data or [])]


# ─────────────────────────────────────────────────────────────
# GET /api/blog/preview/{id} — 단일 포스트 미리보기
# ─────────────────────────────────────────────────────────────

@router.get("/preview/{blog_post_id}", response_model=BlogPostResponse)
async def preview_blog_post(
    blog_post_id: str,
    user_id: str = Depends(get_current_user_id),
    db=Depends(get_db),
):
    res = (
        db.table("blog_posts")
        .select("*, accounts!publish_account_id(alias, display_name)")
        .eq("id", blog_post_id)
        .eq("user_id", user_id)
        .single()
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="블로그 포스트를 찾을 수 없습니다.")
    return _row_to_response(res.data)


# ─────────────────────────────────────────────────────────────
# PUT /api/blog/{id} — 포스트 수동 편집
# ─────────────────────────────────────────────────────────────

@router.put("/{blog_post_id}", response_model=BlogPostResponse)
async def update_blog_post(
    blog_post_id: str,
    body: BlogUpdateRequest,
    user_id: str = Depends(get_current_user_id),
    db=Depends(get_db),
):
    update_data = body.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="수정할 필드가 없습니다.")

    res = (
        db.table("blog_posts")
        .update(update_data)
        .eq("id", blog_post_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="블로그 포스트를 찾을 수 없습니다.")

    # 업데이트된 데이터 재조회
    updated = (
        db.table("blog_posts")
        .select("*, accounts!publish_account_id(alias, display_name)")
        .eq("id", blog_post_id)
        .single()
        .execute()
    )
    return _row_to_response(updated.data)


# ─────────────────────────────────────────────────────────────
# POST /api/blog/publish — 네이버 블로그 발행 예약
# ─────────────────────────────────────────────────────────────

@router.post(
    "/publish",
    response_model=BlogTaskResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def publish_blog_post(
    body: BlogPublishRequest,
    user_id: str = Depends(get_current_user_id),
    db=Depends(get_db),
):
    # 블로그 포스트 확인
    post_res = (
        db.table("blog_posts")
        .select("id, status, title_ko")
        .eq("id", body.blog_post_id)
        .eq("user_id", user_id)
        .single()
        .execute()
    )
    if not post_res.data:
        raise HTTPException(status_code=404, detail="블로그 포스트를 찾을 수 없습니다.")

    post = post_res.data
    if post["status"] not in ("ready", "failed"):
        raise HTTPException(
            status_code=400,
            detail=f"발행 준비된 포스트만 배포 가능합니다. (현재: {post['status']})",
        )

    # 계정 확인 (naver_blog 계정이어야 함)
    acc_res = (
        db.table("accounts")
        .select("id, platform, alias")
        .eq("id", body.account_id)
        .eq("user_id", user_id)
        .eq("platform", "naver_blog")
        .eq("is_active", True)
        .single()
        .execute()
    )
    if not acc_res.data:
        raise HTTPException(
            status_code=404,
            detail="활성화된 네이버 블로그 계정을 찾을 수 없습니다.",
        )

    # Celery 태스크 등록 (예약 시간이 있어도 즉시 큐에 등록 — ETA 사용)
    task_kwargs = dict(
        args=[body.blog_post_id, body.account_id, user_id, body.proxy_id]
    )
    if body.scheduled_at:
        task_kwargs["eta"] = body.scheduled_at

    task = publish_blog_post_task.apply_async(**task_kwargs)

    # DB에 account 연결
    db.table("blog_posts").update(
        {"publish_account_id": body.account_id}
    ).eq("id", body.blog_post_id).execute()

    return BlogTaskResponse(
        task_id      = task.id,
        blog_post_id = body.blog_post_id,
        status       = "queued",
        message      = "네이버 블로그 발행이 큐에 등록되었습니다.",
    )


# ─────────────────────────────────────────────────────────────
# GET /api/blog/jobs — 발행 작업 목록
# ─────────────────────────────────────────────────────────────

@router.get("/jobs", response_model=list[BlogJobItem])
async def list_blog_jobs(
    account_id: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    user_id: str = Depends(get_current_user_id),
    db=Depends(get_db),
):
    query = (
        db.table("blog_posts")
        .select(
            "id, title_ko, status, naver_post_url, published_at, error_msg, "
            "accounts!publish_account_id(alias, display_name)"
        )
        .eq("user_id", user_id)
        .in_("status", ["publishing", "published", "failed"])
        .order("created_at", desc=True)
        .limit(limit)
    )
    if account_id:
        query = query.eq("publish_account_id", account_id)

    res = query.execute()
    items = []
    for row in (res.data or []):
        acc = row.pop("accounts", None) or {}
        items.append(
            BlogJobItem(
                blog_post_id        = row["id"],
                title_ko            = row.get("title_ko", ""),
                status              = row["status"],
                naver_post_url      = row.get("naver_post_url"),
                published_at        = row.get("published_at"),
                error_msg           = row.get("error_msg"),
                account_alias       = acc.get("alias"),
                account_display_name= acc.get("display_name"),
            )
        )
    return items


# ─────────────────────────────────────────────────────────────
# GET /api/blog/task/{task_id} — Celery 태스크 상태
# ─────────────────────────────────────────────────────────────

@router.get("/task/{task_id}", response_model=BlogTaskStatusResponse)
async def get_task_status(
    task_id: str,
    user_id: str = Depends(get_current_user_id),
):
    result = AsyncResult(task_id)
    state  = result.state

    if state == "PENDING":
        return BlogTaskStatusResponse(task_id=task_id, status="pending", progress=0)
    if state == "SUCCESS":
        data = result.result or {}
        return BlogTaskStatusResponse(
            task_id      = task_id,
            blog_post_id = data.get("blog_post_id"),
            status       = "success",
            progress     = 100,
            result       = data,
        )
    if state == "FAILURE":
        return BlogTaskStatusResponse(
            task_id  = task_id,
            status   = "failed",
            progress = 0,
            error    = str(result.result),
        )
    # STARTED / RETRY
    return BlogTaskStatusResponse(task_id=task_id, status=state.lower(), progress=50)
