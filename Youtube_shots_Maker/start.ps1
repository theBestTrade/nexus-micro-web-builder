# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# NOMAD Short Factory — 원클릭 개발 서버 실행
# 사용법: .\start.ps1
#         .\start.ps1 -WithRedis     (Docker로 Redis도 함께 실행)
#         .\start.ps1 -WithCelery    (Celery Worker도 함께 실행)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

param(
    [switch]$WithRedis,
    [switch]$WithCelery
)

$Root    = $PSScriptRoot
$Backend = Join-Path $Root "backend"
$Venv    = Join-Path $Backend ".venv\Scripts"

Write-Host ""
Write-Host "  NOMAD Short Factory — Dev Server Launcher" -ForegroundColor Cyan
Write-Host "  ===========================================" -ForegroundColor Cyan
Write-Host ""

# ── 1. Redis 상태 확인 ──────────────────────────────────────────
Write-Host "[1/3] Redis 확인 중..." -ForegroundColor Yellow

$redisOk = $false
try {
    $tcp = New-Object System.Net.Sockets.TcpClient
    $tcp.Connect("127.0.0.1", 6379)
    $tcp.Close()
    $redisOk = $true
    Write-Host "      Redis 이미 실행 중 (localhost:6379)" -ForegroundColor Green
} catch {
    Write-Host "      Redis 미실행 감지" -ForegroundColor Red
}

if (-not $redisOk) {
    if ($WithRedis) {
        # Docker로 Redis 실행
        $dockerExists = Get-Command docker -ErrorAction SilentlyContinue
        if ($dockerExists) {
            Write-Host "      Docker로 Redis 시작..." -ForegroundColor Yellow
            Start-Process "docker" -ArgumentList "run -d --rm -p 6379:6379 --name nomad-redis redis:alpine" -WindowStyle Hidden
            Start-Sleep 2
            Write-Host "      Redis 시작 완료" -ForegroundColor Green
            $redisOk = $true
        } else {
            Write-Host "      Docker가 설치되지 않아 Redis를 자동 시작할 수 없습니다." -ForegroundColor Red
        }
    } else {
        Write-Host ""
        Write-Host "  [경고] Redis가 실행되지 않습니다. Celery 태스크가 동작하지 않습니다." -ForegroundColor Red
        Write-Host "  Redis 시작 방법:" -ForegroundColor Yellow
        Write-Host "    docker run -d -p 6379:6379 redis:alpine" -ForegroundColor White
        Write-Host "    또는: .\start.ps1 -WithRedis" -ForegroundColor White
        Write-Host ""
    }
}

# ── 2. FastAPI 백엔드 실행 ──────────────────────────────────────
Write-Host "[2/3] FastAPI 백엔드 시작..." -ForegroundColor Yellow

$uvicorn = Join-Path $Venv "uvicorn.exe"
if (-not (Test-Path $uvicorn)) {
    Write-Host "      [오류] 가상환경이 없습니다. 먼저 설치하세요:" -ForegroundColor Red
    Write-Host "      cd backend; python -m venv .venv; .\.venv\Scripts\pip install -r requirements.txt" -ForegroundColor White
    exit 1
}

Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "Set-Location '$Backend'; Write-Host '[FastAPI] Starting...' -ForegroundColor Cyan; & '$uvicorn' main:app --reload --port 8000 --app-dir '$Backend'"
) -WindowStyle Normal

Write-Host "      FastAPI 실행 중 → http://localhost:8000" -ForegroundColor Green
Write-Host "      Swagger 문서   → http://localhost:8000/docs" -ForegroundColor DarkGray

# ── 3. Next.js 프론트엔드 실행 ─────────────────────────────────
Write-Host "[3/3] Next.js 프론트엔드 시작..." -ForegroundColor Yellow

Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "Set-Location '$Root'; Write-Host '[Next.js] Starting...' -ForegroundColor Cyan; npm run dev"
) -WindowStyle Normal

Write-Host "      Next.js 실행 중 → http://localhost:3000" -ForegroundColor Green

# ── 4. (선택) Celery Worker 실행 ───────────────────────────────
if ($WithCelery -and $redisOk) {
    Write-Host ""
    Write-Host "[+] Celery Worker 시작..." -ForegroundColor Yellow
    $celery = Join-Path $Venv "celery.exe"
    Start-Process powershell -ArgumentList @(
        "-NoExit",
        "-Command",
        "Set-Location '$Backend'; Write-Host '[Celery] Starting...' -ForegroundColor Cyan; & '$celery' -A tasks.workers worker --loglevel=info --pool=solo"
    ) -WindowStyle Normal
    Write-Host "      Celery Worker 실행 중" -ForegroundColor Green
}

# ── 완료 메시지 ─────────────────────────────────────────────────
Write-Host ""
Write-Host "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "  서버 실행 완료! 브라우저에서 접속하세요." -ForegroundColor Cyan
Write-Host ""
Write-Host "    프론트엔드  →  http://localhost:3000" -ForegroundColor White
Write-Host "    백엔드 API  →  http://localhost:8000/docs" -ForegroundColor White
Write-Host "    헬스체크    →  http://localhost:8000/health" -ForegroundColor White
Write-Host "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "  창을 닫으려면 각 터미널에서 Ctrl+C 를 누르세요." -ForegroundColor DarkGray
Write-Host ""
