"""
routers/publisher.py
Publisher Matrix API — Phase 3 / Phase 6

엔드포인트:
  POST /api/publisher/schedule            — 배포 예약 (계정·시간 선택)
  GET  /api/publisher/jobs                — 배포 작업 목록
  POST /api/publisher/geo-metadata        — GEO 메타데이터 생성 (Claude)
  PUT  /api/publisher/jobs/{job_id}       — 작업 상태 수동 업데이트
  POST /api/publisher/jobs/{job_id}/retry — 실패 작업 재시도
"""

from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from core.auth import get_current_user_id
from database.client import get_db
from models.publisher import (
    GeoMetadataRequest,
    GeoMetadataResponse,
    FaqItem,
    PublishJobResponse,
    SchedulePublishRequest,
    SchedulePublishResponse,
)
from services.geo_metadata import GeoMetadataService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/publisher", tags=["publisher"])

# ─────────────────────────────────────────────────────────────
# 의존성
# ─────────────────────────────────────────────────────────────

def _geo_service() -> GeoMetadataService:
    return GeoMetadataService()


# ─────────────────────────────────────────────────────────────
# POST /api/publisher/schedule — 배포 예약
# ─────────────────────────────────────────────────────────────

@router.post(
    "/schedule",
    response_model=SchedulePublishResponse,
    status_code=status.HTTP_201_CREATED,
)
async def schedule_publish(
    body: SchedulePublishRequest,
    user_id: str = Depends(get_current_user_id),
    db=Depends(get_db),
):
    """
    배포 대상 계정 목록과 예약 시간을 받아 publish_jobs 레코드를 생성한다.
    실제 업로드는 Celery worker가 처리 (Phase 5에서 채널 API 연동).
    """
    # script 조회 → video_id 확인
    script_res = (
        db.table("scripts")
        .select("id, video_id, user_id, adapted_script, status")
        .eq("id", body.script_id)
        .eq("user_id", user_id)
        .single()
        .execute()
    )
    if not script_res.data:
        raise HTTPException(status_code=404, detail="스크립트를 찾을 수 없습니다.")

    script = script_res.data
    if script["status"] != "ready":
        raise HTTPException(
            status_code=400,
            detail=f"렌더링이 완료된 스크립트만 배포할 수 있습니다. (현재 상태: {script['status']})",
        )

    job_ids: list[str] = []

    for target in body.publish_targets:
        # 계정 소유권 확인
        acc_res = (
            db.table("accounts")
            .select("id, platform, alias")
            .eq("id", target.account_id)
            .eq("user_id", user_id)
            .eq("is_active", True)
            .single()
            .execute()
        )
        if not acc_res.data:
            logger.warning("계정 미발견 또는 비활성: %s", target.account_id)
            continue

        insert_data: dict = {
            "user_id":            user_id,
            "video_id":           script["video_id"],
            "script_id":          script["id"],
            "publish_account_id": target.account_id,
            "status":             "scheduled" if target.scheduled_at else "pending",
            "commerce_link":      body.commerce_link,
        }
        if target.scheduled_at:
            insert_data["scheduled_at"] = target.scheduled_at.isoformat()

        job_res = db.table("publish_jobs").insert(insert_data).execute()
        if job_res.data:
            new_job_id = job_res.data[0]["id"]
            job_ids.append(new_job_id)

            # scheduled_at 없는 즉시 배포 → Celery 큐 바로 삽입
            if not target.scheduled_at:
                try:
                    from tasks.publish_pipeline import publish_video_task
                    publish_video_task.apply_async(
                        kwargs={"job_id": new_job_id, "user_id": user_id},
                        countdown=2,
                    )
                    logger.info("[schedule] 즉시 배포 큐 삽입: job_id=%s", new_job_id)
                except Exception as e:
                    # Celery 연결 실패 시 pending 상태로 남겨 Beat 태스크가 처리
                    logger.warning("[schedule] Celery 큐 삽입 실패 (Beat 폴백): %s", e)

    if not job_ids:
        raise HTTPException(
            status_code=400,
            detail="유효한 배포 대상이 없습니다. 계정을 확인해주세요.",
        )

    return SchedulePublishResponse(job_ids=job_ids)


# ─────────────────────────────────────────────────────────────
# GET /api/publisher/jobs — 배포 작업 목록
# ─────────────────────────────────────────────────────────────

@router.get("/jobs", response_model=list[PublishJobResponse])
async def list_jobs(
    account_id: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    user_id: str = Depends(get_current_user_id),
    db=Depends(get_db),
):
    query = (
        db.table("publish_jobs")
        .select(
            "*, accounts!publish_account_id(alias, platform, display_name)"
        )
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(limit)
    )
    if account_id:
        query = query.eq("publish_account_id", account_id)

    res = query.execute()
    rows = res.data or []

    result = []
    for row in rows:
        acc = row.pop("accounts", None) or {}
        result.append(
            PublishJobResponse(
                **{k: v for k, v in row.items() if k in PublishJobResponse.model_fields},
                account_alias=acc.get("alias"),
                account_platform=acc.get("platform"),
                account_display_name=acc.get("display_name"),
            )
        )
    return result


# ─────────────────────────────────────────────────────────────
# POST /api/publisher/geo-metadata — GEO 메타데이터 생성
# ─────────────────────────────────────────────────────────────

@router.post("/geo-metadata", response_model=GeoMetadataResponse)
async def generate_geo_metadata(
    body: GeoMetadataRequest,
    user_id: str = Depends(get_current_user_id),
    db=Depends(get_db),
    geo_svc: GeoMetadataService = Depends(_geo_service),
):
    # 스크립트 조회
    res = (
        db.table("scripts")
        .select("adapted_script, videos!video_id(title_cn, track)")
        .eq("id", body.script_id)
        .eq("user_id", user_id)
        .single()
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="스크립트를 찾을 수 없습니다.")

    data = res.data
    adapted_script = data.get("adapted_script") or ""
    video = data.get("videos") or {}
    track = video.get("track", "A")
    title_hint = video.get("title_cn")

    if not adapted_script:
        raise HTTPException(
            status_code=400, detail="각색된 대본이 없습니다. 먼저 Adapt를 실행하세요."
        )

    meta = await geo_svc.generate(adapted_script, track, title_hint)

    return GeoMetadataResponse(
        title=meta["title"],
        description=meta["description"],
        tags=meta["tags"],
        context_summary=meta["context_summary"],
        faq_schema=[FaqItem(**f) for f in meta["faq_schema"]],
    )


# ─────────────────────────────────────────────────────────────
# PUT /api/publisher/jobs/{job_id} — 작업 상태 업데이트 (수동)
# ─────────────────────────────────────────────────────────────

@router.put("/jobs/{job_id}", response_model=PublishJobResponse)
async def update_job(
    job_id: str,
    body: dict,
    user_id: str = Depends(get_current_user_id),
    db=Depends(get_db),
):
    allowed = {"status", "error_msg", "platform_video_id", "commerce_link"}
    update_data = {k: v for k, v in body.items() if k in allowed}
    if not update_data:
        raise HTTPException(status_code=400, detail="업데이트할 필드가 없습니다.")

    res = (
        db.table("publish_jobs")
        .update(update_data)
        .eq("id", job_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="작업을 찾을 수 없습니다.")

    row = res.data[0]
    return PublishJobResponse(**{k: v for k, v in row.items() if k in PublishJobResponse.model_fields})


# ─────────────────────────────────────────────────────────────
# POST /api/publisher/jobs/{job_id}/retry — 실패 작업 재시도
# ─────────────────────────────────────────────────────────────

@router.post("/jobs/{job_id}/retry", response_model=PublishJobResponse)
async def retry_job(
    job_id:  str,
    user_id: str = Depends(get_current_user_id),
    db      = Depends(get_db),
):
    """
    status='failed' 인 작업을 'pending' 으로 초기화하고 Celery 큐에 재삽입합니다.
    """
    res = (
        db.table("publish_jobs")
        .select("id, status, user_id")
        .eq("id", job_id)
        .eq("user_id", user_id)
        .single()
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="작업을 찾을 수 없습니다.")

    if res.data["status"] not in ("failed", "pending"):
        raise HTTPException(
            status_code=400,
            detail=f"재시도는 failed/pending 상태에서만 가능합니다. (현재: {res.data['status']})",
        )

    # pending 으로 초기화
    db.table("publish_jobs").update(
        {"status": "pending", "error_msg": None}
    ).eq("id", job_id).execute()

    # Celery 큐 삽입
    try:
        from tasks.publish_pipeline import publish_video_task
        publish_video_task.apply_async(
            kwargs={"job_id": job_id, "user_id": user_id},
            countdown=2,
        )
        logger.info("[retry] Celery 큐 삽입: job_id=%s", job_id)
    except Exception as e:
        logger.warning("[retry] Celery 큐 삽입 실패 (Beat 폴백): %s", e)

    updated = db.table("publish_jobs").select("*").eq("id", job_id).single().execute()
    row     = updated.data
    return PublishJobResponse(**{k: v for k, v in row.items() if k in PublishJobResponse.model_fields})
