import React, { useState } from 'react';
import {
  Zap, PlayCircle, Square, PauseCircle, Pencil, Trash2,
  CheckCircle2, AlertCircle, Clock, Plus, ChevronRight,
  Activity, RefreshCw, Download, Power, ArrowLeft,
} from 'lucide-react';
import Canvas from '../../../components/workflow/Canvas.tsx';

// ────────────────────────────────────────────────────────────────────────────
// 타입
// ────────────────────────────────────────────────────────────────────────────
type AutoStatus = 'active' | 'paused' | 'error' | 'idle';
type LogLevel   = 'success' | 'error' | 'info' | 'running';

interface Automation {
  id: number;
  name: string;
  description: string;
  status: AutoStatus;
  trigger: string;
  lastRun: string;
  nextRun: string;
  totalRuns: number;
  successRate: number;
  icon: string;
  tags: string[];
}

interface LogEntry {
  id: number;
  automation: string;
  message: string;
  level: LogLevel;
  time: string;
}

// ────────────────────────────────────────────────────────────────────────────
// 목 데이터
// ────────────────────────────────────────────────────────────────────────────
const AUTOMATIONS: Automation[] = [
  {
    id: 1,
    name: 'Amazon 가격 모니터링',
    description: '등록된 1,200개 상품의 Amazon 가격을 실시간 추적하여 마진율 변동 시 자동 알림',
    status: 'active',
    trigger: 'Cron: */10 * * * *',
    lastRun: '5분 전',
    nextRun: '5분 후',
    totalRuns: 4821,
    successRate: 99.1,
    icon: '📊',
    tags: ['가격모니터링', 'Amazon'],
  },
  {
    id: 2,
    name: 'AI 상품 설명 자동 생성',
    description: '소싱된 상품의 영문 설명을 Gemini AI로 한국어 판매 문구로 자동 변환 및 채널 등록',
    status: 'active',
    trigger: 'Cron: 0 9,15 * * 1-5',
    lastRun: '오전 9시',
    nextRun: '오후 3시',
    totalRuns: 1240,
    successRate: 96.8,
    icon: '✍️',
    tags: ['AI생성', 'Gemini', '상품설명'],
  },
  {
    id: 3,
    name: '쿠팡 시세차익 탐지',
    description: '쿠팡 vs Amazon 가격 비교 후 마진 18% 이상 상품을 자동 발굴하여 소싱 목록 추가',
    status: 'active',
    trigger: 'Cron: 0 * * * *',
    lastRun: '1시간 전',
    nextRun: '1시간 후',
    totalRuns: 892,
    successRate: 98.4,
    icon: '💰',
    tags: ['시세차익', '쿠팡', 'Amazon'],
  },
  {
    id: 4,
    name: 'SNS 상품 홍보 콘텐츠',
    description: '신규 입고 상품을 기반으로 Instagram Reels·TikTok 숏폼 자동 생성 및 예약 발행',
    status: 'paused',
    trigger: 'Cron: 0 18 * * *',
    lastRun: '어제 오후 6시',
    nextRun: '일시정지 중',
    totalRuns: 341,
    successRate: 94.1,
    icon: '📱',
    tags: ['SNS', 'Instagram', 'TikTok'],
  },
  {
    id: 5,
    name: '주문 상태 자동 동기화',
    description: '포워딩 업체 API와 쿠팡·스마트스토어 주문을 15분마다 동기화하여 배송 현황 업데이트',
    status: 'active',
    trigger: 'Cron: */15 * * * *',
    lastRun: '10분 전',
    nextRun: '5분 후',
    totalRuns: 12480,
    successRate: 99.7,
    icon: '🚚',
    tags: ['배송추적', '주문동기화'],
  },
  {
    id: 6,
    name: '환율 기반 마진 재계산',
    description: 'USD/KRW 환율 변동 시 전체 상품의 판매가와 마진율을 자동으로 재계산하여 채널 업데이트',
    status: 'error',
    trigger: 'Webhook: 환율 API',
    lastRun: '3시간 전 (오류)',
    nextRun: '수동 재시작 필요',
    totalRuns: 284,
    successRate: 87.3,
    icon: '💱',
    tags: ['환율', '마진계산'],
  },
];

const LOGS: LogEntry[] = [
  { id: 1,  automation: 'Amazon 가격 모니터링',  message: '1,200개 상품 가격 스캔 완료. 23개 마진율 변동 감지',          level: 'success', time: '5분 전'    },
  { id: 2,  automation: '쿠팡 시세차익 탐지',    message: '신규 고마진 상품 12개 발견. 소싱 대기열에 추가됨',             level: 'success', time: '1시간 전'  },
  { id: 3,  automation: '주문 상태 자동 동기화', message: '쿠팡 주문 47건, 스마트스토어 31건 상태 갱신 완료',             level: 'success', time: '10분 전'  },
  { id: 4,  automation: '환율 기반 마진 재계산', message: 'KORBIT API 연결 실패 (timeout 30s). 재시도 3/3 모두 실패',     level: 'error',   time: '3시간 전'  },
  { id: 5,  automation: 'AI 상품 설명 자동 생성', message: '상품 38개 한국어 설명 생성 완료. 쿠팡·스마트스토어 등록 중', level: 'running', time: '9시간 전'  },
  { id: 6,  automation: 'Amazon 가격 모니터링',  message: '애플 MacBook Air M3 가격 $80 인하 감지. 마진율 재계산됨',     level: 'info',    time: '2시간 전'  },
];

// ────────────────────────────────────────────────────────────────────────────
// 서브 컴포넌트
// ────────────────────────────────────────────────────────────────────────────
const STATUS_CFG: Record<AutoStatus, { label: string; dot: string; badge: string }> = {
  active: { label: '실행 중', dot: 'bg-emerald-500 animate-pulse', badge: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' },
  paused: { label: '일시정지', dot: 'bg-amber-400',                 badge: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'       },
  error:  { label: '오류',    dot: 'bg-red-500',                   badge: 'bg-red-50 text-red-700 ring-1 ring-red-200'             },
  idle:   { label: '대기',    dot: 'bg-slate-400',                  badge: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'      },
};

const LOG_CFG: Record<LogLevel, { icon: React.ElementType; color: string; bg: string }> = {
  success: { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  error:   { icon: AlertCircle,  color: 'text-red-500',     bg: 'bg-red-50'     },
  info:    { icon: Activity,     color: 'text-blue-500',    bg: 'bg-blue-50'    },
  running: { icon: RefreshCw,    color: 'text-violet-500',  bg: 'bg-violet-50'  },
};

// ────────────────────────────────────────────────────────────────────────────
// KPI 데이터
// ────────────────────────────────────────────────────────────────────────────
const KPI = [
  { label: '활성 자동화',  value: '4개',       sub: '6개 중 4개 실행 중',         icon: '🟢', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { label: '오늘 실행',    value: '1,847건',    sub: '평균 성공률 98.5%',           icon: '⚡', color: 'text-blue-600',    bg: 'bg-blue-50'    },
  { label: '절약 작업시간', value: '14.2시간',  sub: '이번 달 기준',                icon: '⏱️', color: 'text-violet-600',  bg: 'bg-violet-50'  },
  { label: '자동 처리 건', value: '18,057건',   sub: '누적 자동화 처리',            icon: '🤖', color: 'text-amber-600',   bg: 'bg-amber-50'   },
];

// ────────────────────────────────────────────────────────────────────────────
// 메인 컴포넌트
// ────────────────────────────────────────────────────────────────────────────
const WorkflowPage: React.FC = () => {
  const [view, setView]       = useState<'board' | 'editor'>('board');
  const [automations, setAutomations] = useState<Automation[]>(AUTOMATIONS);

  const toggleStatus = (id: number) => {
    setAutomations(prev => prev.map(a =>
      a.id === id
        ? { ...a, status: a.status === 'active' ? 'paused' : 'active' }
        : a
    ));
  };

  // ── 에디터 뷰 ────────────────────────────────────────────────────────────
  if (view === 'editor') {
    return (
      <div className="-m-6 lg:-m-8 h-[calc(100%+3rem)] lg:h-[calc(100%+4rem)] flex flex-col">
        {/* 에디터 상단에 보드로 돌아가기 버튼 */}
        <div className="absolute top-[70px] left-4 z-30">
          <button
            onClick={() => setView('board')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-lg border border-slate-200 shadow-md text-[12px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            보드로 돌아가기
          </button>
        </div>
        <Canvas />
      </div>
    );
  }

  // ── 보드 뷰 ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 animate-in fade-in duration-300">

      {/* ── 헤더 ── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-5 h-5 text-amber-500" fill="currentColor" />
            <h1 className="text-[18px] font-bold text-slate-900 tracking-tight">자동화작업</h1>
            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
              4개 실행 중
            </span>
          </div>
          <p className="text-[12px] text-slate-500">
            구매대행 전 과정을 AI와 자동화 파이프라인으로 운영하세요.
          </p>
        </div>
        <button
          onClick={() => setView('editor')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-[13px] font-semibold rounded-xl hover:bg-blue-500 shadow-sm shadow-blue-600/30 transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          새 자동화 만들기
        </button>
      </div>

      {/* ── KPI ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {KPI.map((k, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${k.bg} flex items-center justify-center text-[20px] shrink-0`}>
              {k.icon}
            </div>
            <div>
              <p className={`text-[20px] font-bold leading-none ${k.color}`}>{k.value}</p>
              <p className="text-[11px] text-slate-500 mt-1">{k.label}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{k.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── 자동화 목록 ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-600" />
            <h2 className="text-[14px] font-semibold text-slate-800">자동화 목록</h2>
          </div>
          <button
            onClick={() => setView('editor')}
            className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:underline"
          >
            에디터 열기 <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 테이블 헤더 */}
        <div className="hidden lg:grid grid-cols-[40px_1fr_110px_120px_100px_110px] items-center gap-4 px-5 py-2.5 bg-slate-50 border-b border-slate-100 text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
          <span />
          <span>자동화명 / 설명</span>
          <span>트리거</span>
          <span>마지막 실행</span>
          <span>성공률</span>
          <span>상태 / 제어</span>
        </div>

        <div className="divide-y divide-slate-50">
          {automations.map(auto => {
            const s = STATUS_CFG[auto.status];
            return (
              <div
                key={auto.id}
                className="grid grid-cols-1 lg:grid-cols-[40px_1fr_110px_120px_100px_110px] items-center gap-4 px-5 py-4 hover:bg-slate-50/70 transition-colors"
              >
                {/* 아이콘 */}
                <div className="hidden lg:flex w-9 h-9 rounded-xl bg-slate-100 items-center justify-center text-[18px] shrink-0">
                  {auto.icon}
                </div>

                {/* 이름 + 설명 */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[18px] lg:hidden">{auto.icon}</span>
                    <p className="text-[13px] font-semibold text-slate-800">{auto.name}</p>
                    {/* 모바일 상태 배지 */}
                    <span className={`lg:hidden inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${s.badge}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                      {s.label}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">{auto.description}</p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {auto.tags.map(t => (
                      <span key={t} className="text-[9px] font-medium bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">{t}</span>
                    ))}
                  </div>
                </div>

                {/* 트리거 */}
                <div className="hidden lg:block">
                  <p className="text-[10px] font-mono bg-slate-100 text-slate-600 px-2 py-1 rounded-md leading-relaxed break-all">{auto.trigger}</p>
                </div>

                {/* 마지막/다음 실행 */}
                <div className="hidden lg:block">
                  <p className="text-[11px] text-slate-600">{auto.lastRun}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {auto.nextRun}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">총 {auto.totalRuns.toLocaleString()}회</p>
                </div>

                {/* 성공률 */}
                <div className="hidden lg:block">
                  <p className={`text-[14px] font-bold ${auto.successRate >= 95 ? 'text-emerald-600' : auto.successRate >= 85 ? 'text-amber-600' : 'text-red-500'}`}>
                    {auto.successRate}%
                  </p>
                  <div className="mt-1 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${auto.successRate >= 95 ? 'bg-emerald-500' : auto.successRate >= 85 ? 'bg-amber-400' : 'bg-red-400'}`}
                      style={{ width: `${auto.successRate}%` }}
                    />
                  </div>
                </div>

                {/* 상태 + 제어 */}
                <div className="hidden lg:flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold ${s.badge}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                    {s.label}
                  </span>
                  <div className="flex items-center gap-1 ml-auto">
                    {/* 재생/정지 */}
                    <button
                      onClick={() => toggleStatus(auto.id)}
                      title={auto.status === 'active' ? '일시정지' : '실행'}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                        auto.status === 'active'
                          ? 'text-amber-600 hover:bg-amber-50'
                          : 'text-emerald-600 hover:bg-emerald-50'
                      }`}
                    >
                      {auto.status === 'active'
                        ? <PauseCircle className="w-4 h-4" />
                        : <PlayCircle  className="w-4 h-4" />
                      }
                    </button>
                    {/* 편집 */}
                    <button
                      onClick={() => setView('editor')}
                      title="편집"
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-blue-600 hover:bg-blue-50 transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 새 자동화 추가 */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50">
          <button
            onClick={() => setView('editor')}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-blue-300 text-blue-600 text-[12px] font-semibold hover:bg-blue-50 transition-colors"
          >
            <Plus className="w-4 h-4" />
            새 자동화 워크플로우 추가
          </button>
        </div>
      </div>

      {/* ── 하단 2단: 실행 로그 | 빠른 자동화 템플릿 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5">

        {/* 실행 로그 */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-600" />
              <h3 className="text-[13px] font-semibold text-slate-800">최근 실행 로그</h3>
            </div>
            <button className="text-[11px] text-slate-400 hover:text-slate-600 flex items-center gap-1">
              <RefreshCw className="w-3 h-3" /> 새로고침
            </button>
          </div>
          <div className="divide-y divide-slate-50">
            {LOGS.map(log => {
              const cfg   = LOG_CFG[log.level];
              const Icon  = cfg.icon;
              return (
                <div key={log.id} className="flex items-start gap-3 px-5 py-3 hover:bg-slate-50 transition-colors">
                  <div className={`w-6 h-6 rounded-full ${cfg.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                    <Icon className={`w-3.5 h-3.5 ${cfg.color} ${log.level === 'running' ? 'animate-spin' : ''}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-[11px] font-semibold text-slate-600">{log.automation}</p>
                      <span className="text-[10px] text-slate-400">{log.time}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">{log.message}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 빠른 자동화 템플릿 */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100">
            <h3 className="text-[13px] font-semibold text-slate-800">⚡ 추천 자동화 템플릿</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">바로 적용할 수 있는 구매대행 자동화</p>
          </div>
          <div className="divide-y divide-slate-50">
            {[
              { emoji: '🛒', name: '원클릭 소싱 파이프라인', desc: '소싱 → 번역 → 채널 등록 전자동' },
              { emoji: '📈', name: '마진 알림 봇',          desc: '설정 마진 이하 시 즉시 알림'   },
              { emoji: '📝', name: 'AI 상품 카피 생성기',   desc: '영문 → 한국어 판매 문구 변환'  },
              { emoji: '📦', name: '재고 부족 자동 발주',   desc: '설정 수량 이하 시 자동 발주'   },
              { emoji: '🌐', name: 'SNS 홍보 자동화',       desc: '신제품 → SNS 자동 발행'        },
            ].map((t, i) => (
              <button
                key={i}
                onClick={() => setView('editor')}
                className="w-full flex items-center gap-3 px-5 py-3 hover:bg-blue-50/60 transition-colors text-left group"
              >
                <span className="text-[18px] shrink-0">{t.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-slate-700 group-hover:text-blue-700">{t.name}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{t.desc}</p>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-500 transition-colors shrink-0" />
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default WorkflowPage;
