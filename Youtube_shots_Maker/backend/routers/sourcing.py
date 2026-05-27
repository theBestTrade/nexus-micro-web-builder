"""
routers/sourcing.py
소싱 모듈 API — /api/sourcing

엔드포인트:
  POST /api/sourcing/search              # 키워드 검색 (동기, Playwright)
  POST /api/sourcing/download            # 다운로드 큐 등록 (비동기, Celery)
  GET  /api/sourcing/status/{task_id}    # 태스크 진행 상태 조회
  GET  /api/sourcing/videos              # 소싱된 영상 목록 조회
  GET  /api/sourcing/videos/{video_id}   # 영상 상세 조회
"""

from typing import Optional

from celery.result import AsyncResult
from fastapi import APIRouter, Depends, HTTPException, Query, status

from core.auth import get_current_user_id
from database.client import get_db
from models.video import (
    SourcingDownloadRequest,
    SourcingDownloadResponse,
    SourcingSearchRequest,
    SourcingSearchResponse,
    TaskStatusResponse,
    VideoResponse,
)
from services.downloader import VideoDownloader
from services.proxy_manager import ProxyManager
from tasks.workers import celery_app

router = APIRouter(prefix="/api/sourcing", tags=["sourcing"])


# ─────────────────────────────────────────────────────────────
# 의존성
# ─────────────────────────────────────────────────────────────

def _get_downloader() -> VideoDownloader:
    db = get_db()
    return VideoDownloader(db, ProxyManager(db))


# ─────────────────────────────────────────────────────────────
# POST /api/sourcing/search — 키워드 검색
# ─────────────────────────────────────────────────────────────

@router.post("/search", response_model=SourcingSearchResponse)
async def search_videos(
    body:       SourcingSearchRequest,
    user_id:    str            = Depends(get_current_user_id),
    downloader: VideoDownloader = Depends(_get_downloader),
) -> SourcingSearchResponse:
    """
    도우인 / 샤오홍수에서 키워드로 인기 영상을 검색합니다.
    결과는 videos 테이블에 저장됩니다.

    - account_id 미지정 시: 해당 platform의 기본 계정 쿠키 사용
    - proxy_id 미지정 시: 직접 연결
    - 바이럴 스코어 순으로 정렬됩니다.
    """
    try:
        rows = await downloader.search_videos(
            user_id    = user_id,
            keyword    = body.keyword,
            platform   = body.platform.value,
            track      = body.track.value,
            limit      = body.limit,
            account_id = body.account_id,
            proxy_id   = body.proxy_id,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"검색 중 오류가 발생했습니다: {str(e)}",
        )

    # 바이럴 스코어 내림차순 정렬
    rows.sort(key=lambda r: r.get("viral_score", 0), reverse=True)

    videos = [_row_to_response(r) for r in rows]
    return SourcingSearchResponse(
        videos   = videos,
        total    = len(videos),
        keyword  = body.keyword,
        platform = body.platform,
    )


# ─────────────────────────────────────────────────────────────
# POST /api/sourcing/download — 다운로드 큐 등록
# ─────────────────────────────────────────────────────────────

@router.post("/download", response_model=SourcingDownloadResponse, status_code=status.HTTP_202_ACCEPTED)
async def queue_download(
    body:    SourcingDownloadRequest,
    user_id: str = Depends(get_current_user_id),
) -> SourcingDownloadResponse:
    """
    영상 무워터마크 다운로드를 Celery 큐에 등록합니다.
    즉시 task_id를 반환하며, 실제 다운로드는 백그라운드에서 진행됩니다.
    진행 상태는 GET /api/sourcing/status/{task_id} 로 확인합니다.
    """
    db = get_db()

    # 영상 존재 + 소유권 확인
    result = (
        db.table("videos")
        .select("id, status")
        .eq("id", body.video_id)
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"영상을 찾을 수 없습니다: {body.video_id}",
        )

    video_row = result.data[0]
    if video_row["status"] in ("downloading", "downloaded", "processing", "ready"):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"이미 다운로드 중이거나 완료된 영상입니다. (현재 상태: {video_row['status']})",
        )

    # Celery 태스크 등록
    from tasks.pipeline import download_video_task
    task = download_video_task.apply_async(
        kwargs={
            "video_id":   body.video_id,
            "user_id":    user_id,
            "account_id": body.account_id,
            "proxy_id":   body.proxy_id,
        }
    )

    # task_id를 DB에 저장
    db.table("videos").update(
        {"download_task_id": task.id, "status": "downloading"}
    ).eq("id", body.video_id).execute()

    return SourcingDownloadResponse(
        video_id = body.video_id,
        task_id  = task.id,
    )


# ─────────────────────────────────────────────────────────────
# GET /api/sourcing/status/{task_id} — 태스크 상태 조회
# ─────────────────────────────────────────────────────────────

@router.get("/status/{task_id}", response_model=TaskStatusResponse)
async def get_task_status(
    task_id: str,
    user_id: str = Depends(get_current_user_id),
) -> TaskStatusResponse:
    """
    Celery 태스크의 진행 상태를 반환합니다.

    state 값:
      PENDING   — 큐 대기 중
      STARTED   — 시작됨
      PROGRESS  — 진행 중 (progress: 0~100)
      SUCCESS   — 완료 (file_path 포함)
      FAILURE   — 실패 (error 포함)
      RETRY     — 재시도 중
    """
    task_result = AsyncResult(task_id, app=celery_app)
    state       = task_result.state
    meta        = task_result.info or {}

    # DB에서 video_id 조회 (task_id 매핑)
    db     = get_db()
    v_res  = (
        db.table("videos")
        .select("id, status, file_path, error_msg")
        .eq("download_task_id", task_id)
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    video_row = v_res.data[0] if v_res.data else None

    # 상태 매핑
    if state == "SUCCESS":
        return TaskStatusResponse(
            task_id   = task_id,
            video_id  = video_row["id"] if video_row else None,
            status    = "downloaded",
            progress  = 100,
            file_path = (meta.get("file_path") if isinstance(meta, dict) else None)
                        or (video_row["file_path"] if video_row else None),
        )

    if state == "FAILURE":
        return TaskStatusResponse(
            task_id  = task_id,
            video_id = video_row["id"] if video_row else None,
            status   = "failed",
            progress = 0,
            error    = str(task_result.result),
        )

    if state == "PROGRESS" and isinstance(meta, dict):
        return TaskStatusResponse(
            task_id  = task_id,
            video_id = meta.get("video_id") or (video_row["id"] if video_row else None),
            status   = "downloading",
            progress = meta.get("progress", 0),
        )

    # PENDING / STARTED / RETRY
    return TaskStatusResponse(
        task_id  = task_id,
        video_id = video_row["id"] if video_row else None,
        status   = state.lower(),
        progress = 0,
    )


# ─────────────────────────────────────────────────────────────
# GET /api/sourcing/videos — 소싱된 영상 목록
# ─────────────────────────────────────────────────────────────

@router.get("/videos", response_model=list[VideoResponse])
async def list_videos(
    platform: Optional[str] = Query(None),
    track:    Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    limit:    int           = Query(default=20, ge=1, le=100),
    offset:   int           = Query(default=0, ge=0),
    user_id:  str           = Depends(get_current_user_id),
) -> list[VideoResponse]:
    """소싱된 영상 목록 (필터: platform / track / status)."""
    db    = get_db()
    query = (
        db.table("videos")
        .select("*")
        .eq("user_id", user_id)
        .order("viral_score", desc=True)
        .range(offset, offset + limit - 1)
    )
    if platform:      query = query.eq("platform", platform)
    if track:         query = query.eq("track", track)
    if status_filter: query = query.eq("status", status_filter)

    result = query.execute()
    return [_row_to_response(r) for r in result.data]


# ─────────────────────────────────────────────────────────────
# GET /api/sourcing/videos/{video_id} — 영상 상세
# ─────────────────────────────────────────────────────────────

@router.get("/videos/{video_id}", response_model=VideoResponse)
async def get_video(
    video_id: str,
    user_id:  str = Depends(get_current_user_id),
) -> VideoResponse:
    """단일 영상 상세 조회."""
    db = get_db()
    result = (
        db.table("videos")
        .select("*")
        .eq("id", video_id)
        .eq("user_id", user_id)
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"영상을 찾을 수 없습니다: {video_id}",
        )
    return _row_to_response(result.data)


# ─────────────────────────────────────────────────────────────
# 내부: DB 행 → VideoResponse 변환
# ─────────────────────────────────────────────────────────────

def _row_to_response(row: dict) -> VideoResponse:
    from models.video import SourcePlatformEnum, TrackEnum, VideoStatusEnum
    return VideoResponse(
        id                  = row["id"],
        user_id             = row["user_id"],
        sourcing_account_id = row.get("sourcing_account_id"),
        platform            = SourcePlatformEnum(row["platform"]),
        track               = TrackEnum(row["track"]),
        original_url        = row["original_url"],
        file_path           = row.get("file_path"),
        thumbnail_url       = row.get("thumbnail_url"),
        title_cn            = row.get("title_cn"),
        viral_score         = row.get("viral_score", 0),
        likes               = row.get("likes", 0),
        shares              = row.get("shares", 0),
        comments            = row.get("comments", 0),
        duration_sec        = row.get("duration_sec"),
        width               = row.get("width"),
        height              = row.get("height"),
        status              = VideoStatusEnum(row.get("status", "sourced")),
        download_task_id    = row.get("download_task_id"),
        error_msg           = row.get("error_msg"),
        created_at          = row["created_at"],
        updated_at          = row["updated_at"],
    )
