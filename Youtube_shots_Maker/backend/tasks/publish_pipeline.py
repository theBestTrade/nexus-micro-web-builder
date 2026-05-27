"""
tasks/publish_pipeline.py
영상 배포 Celery 파이프라인

태스크 목록:
  publish_video_task  — 단일 publish_jobs 레코드를 해당 채널에 배포
  run_pending_jobs_task — 예약 시각이 된 pending/scheduled 작업 일괄 실행 (Celery Beat)
"""

from __future__ import annotations

import asyncio
import logging
import random
import time
from datetime import datetime, timezone
from typing import Optional

from celery import Task

from database.client import get_db
from tasks.workers import celery_app

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────
# 헬퍼
# ─────────────────────────────────────────────────────────────

def _run_async(coro):
    """Celery 동기 컨텍스트에서 async 코루틴을 안전하게 실행."""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_closed():
            raise RuntimeError
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    return loop.run_until_complete(coro)


# ─────────────────────────────────────────────────────────────
# Task 1: 단일 영상 배포
# ─────────────────────────────────────────────────────────────

@celery_app.task(
    bind=True,
    name="tasks.publish_pipeline.publish_video_task",
    max_retries=3,
    default_retry_delay=60,
    acks_late=True,
)
def publish_video_task(
    self: Task,
    job_id:  str,
    user_id: str,
) -> dict:
    """
    publish_jobs 레코드 1건을 해당 플랫폼(YouTube/Instagram/TikTok/Naver Blog)에 배포.

    진행 상태:
      PENDING   → 큐 대기
      STARTED   → 배포 시작
      SUCCESS   → 완료 (result: {platform_video_id, published_at})
      FAILURE   → 실패 (exc: error)

    DB publish_jobs.status 도 함께 갱신합니다.
    """
    from services.channel_publisher import ChannelPublisher

    db        = get_db()
    publisher = ChannelPublisher(db=db)

    # 레이트 리밋 회피: 짧은 랜덤 딜레이
    delay = random.uniform(1.0, 3.0)
    logger.info("[publish_task] job_id=%s | 시작 전 %.1f초 대기", job_id, delay)
    time.sleep(delay)

    try:
        result = _run_async(publisher.publish(job_id=job_id, user_id=user_id))
        logger.info(
            "[publish_task] 완료: job_id=%s platform=%s vid=%s",
            job_id,
            result.get("platform"),
            result.get("platform_video_id"),
        )
        return result

    except Exception as exc:
        logger.exception("[publish_task] 실패: job_id=%s", job_id)

        retry_count = self.request.retries
        if retry_count < self.max_retries:
            backoff = 60 * (2 ** retry_count)   # 60s → 120s → 240s
            logger.info(
                "[publish_task] %d초 후 재시도 (%d/%d)",
                backoff, retry_count + 1, self.max_retries,
            )
            raise self.retry(exc=exc, countdown=backoff)

        # 최종 실패: DB 상태는 ChannelPublisher 내부에서 이미 'failed' 처리됨
        raise


# ─────────────────────────────────────────────────────────────
# Task 2: 예약 작업 일괄 실행 (Celery Beat — 5분마다)
# ─────────────────────────────────────────────────────────────

@celery_app.task(
    name="tasks.publish_pipeline.run_pending_jobs_task",
    ignore_result=True,
)
def run_pending_jobs_task() -> None:
    """
    publish_jobs 테이블에서 예약 시각이 된 'scheduled' 작업을 조회하여
    publish_video_task 큐에 삽입합니다.

    - status = 'scheduled'  AND  scheduled_at <= NOW()
    - status = 'pending'    (즉시 배포 미처리 건)

    중복 실행 방지: status를 'uploading'으로 먼저 업데이트 후 큐 삽입.
    """
    db  = get_db()
    now = datetime.now(timezone.utc).isoformat()

    # scheduled — 예약 시각이 된 작업
    res_scheduled = (
        db.table("publish_jobs")
        .select("id, user_id")
        .eq("status", "scheduled")
        .lte("scheduled_at", now)
        .limit(50)
        .execute()
    )

    # pending — 즉시 배포 미처리 작업
    res_pending = (
        db.table("publish_jobs")
        .select("id, user_id")
        .eq("status", "pending")
        .limit(50)
        .execute()
    )

    jobs_to_run = (res_scheduled.data or []) + (res_pending.data or [])
    if not jobs_to_run:
        return

    logger.info("[pending_jobs] %d건 배포 큐 삽입", len(jobs_to_run))

    for job in jobs_to_run:
        job_id  = job["id"]
        user_id = job["user_id"]

        # 중복 실행 방지: uploading 으로 상태 선점
        update_res = (
            db.table("publish_jobs")
            .update({"status": "uploading"})
            .eq("id", job_id)
            .in_("status", ["scheduled", "pending"])   # 이미 다른 워커가 처리 중이면 스킵
            .execute()
        )
        if not update_res.data:
            logger.debug("[pending_jobs] job_id=%s 이미 처리 중 — 스킵", job_id)
            continue

        # Celery 태스크 큐 삽입
        publish_video_task.apply_async(
            kwargs={"job_id": job_id, "user_id": user_id},
            countdown=random.randint(1, 5),   # 동시 실행 분산
        )
        logger.info("[pending_jobs] 큐 삽입: job_id=%s user_id=%s", job_id, user_id)
