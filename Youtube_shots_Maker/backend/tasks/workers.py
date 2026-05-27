"""
tasks/workers.py
Celery 앱 싱글톤 설정

실행 방법:
  celery -A tasks.workers worker --loglevel=info -c 4
  celery -A tasks.workers beat   --loglevel=info   # 주기 태스크 (쿠키 갱신 등)
"""

from celery import Celery
from celery.schedules import crontab

from core.config import get_settings

settings = get_settings()

celery_app = Celery(
    "nomad_short_factory",
    broker=settings.celery_broker_url,
    backend=settings.redis_url,
    include=[
        "tasks.pipeline",         # Phase 1: 다운로드 파이프라인
        "tasks.studio_pipeline",  # Phase 2: AI 변환 파이프라인
        "tasks.blog_pipeline",    # Phase 4: 블로그 파이프라인
        "tasks.publish_pipeline", # Phase 6: 채널 배포 파이프라인
    ],
)

celery_app.conf.update(
    # 직렬화
    task_serializer   = "json",
    result_serializer = "json",
    accept_content    = ["json"],

    # 타임존
    timezone          = "Asia/Seoul",
    enable_utc        = True,

    # 결과 보존 기간 (7일)
    result_expires    = 60 * 60 * 24 * 7,

    # 태스크 재시도
    task_acks_late    = True,
    task_reject_on_worker_lost = True,

    # 워커당 동시 태스크 (Playwright 메모리 고려)
    worker_concurrency = 2,

    # 주기 태스크 스케줄 (Celery Beat)
    beat_schedule     = {
        # ── 매일 새벽 3시: 쿠키 만료 임박 계정 자동 갱신 ─────
        "refresh-expiring-cookies": {
            "task":     "tasks.pipeline.refresh_expiring_cookies_task",
            "schedule": crontab(hour=3, minute=0),
        },
        # ── 매일 오전 9시: OAuth 토큰 만료 7일 이내 DB 플래그 ─
        "check-expiring-tokens": {
            "task":     "tasks.pipeline.check_expiring_tokens_task",
            "schedule": crontab(hour=9, minute=0),
        },
        # ── 매월 1일 새벽 4시: 네이버쇼핑 트래킹 URL 재생성 ──
        "refresh-commerce-tracking-urls": {
            "task":     "tasks.pipeline.refresh_commerce_tracking_urls_task",
            "schedule": crontab(day_of_month=1, hour=4, minute=0),
        },
        # ── 5분마다: 예약 배포 작업 실행 ──────────────────────
        "run-pending-publish-jobs": {
            "task":     "tasks.publish_pipeline.run_pending_jobs_task",
            "schedule": crontab(minute="*/5"),
        },
    },
)
