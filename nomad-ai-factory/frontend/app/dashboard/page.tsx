import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/supabase/auth.tsx';
import {
  TrendingUp, TrendingDown, ArrowRight, ChevronRight,
  Package, ShoppingCart, Truck, DollarSign, Zap,
  CheckCircle2, Search, Percent, RefreshCw,
  Bell, Sparkles, Plus, Filter, Eye,
  Calendar, ExternalLink, MoreHorizontal,
  HelpCircle, ChevronDown,
} from 'lucide-react';

// ────────────────────────────────────────────────────────────────────────────
// 타입
// ────────────────────────────────────────────────────────────────────────────
type OrderStatus =
  | 'new' | 'confirmed' | 'purchasing'
  | 'shipping_us' | 'customs' | 'shipping_kr'
  | 'delivered' | 'issue';

// ────────────────────────────────────────────────────────────────────────────
// 목 데이터
// ────────────────────────────────────────────────────────────────────────────

const KPIS = [
  {
    id: 'orders_today',
    label: '오늘 신규주문',
    value: 47,
    display: '47건',
    delta: '+12',
    deltaLabel: '어제 대비',
    isPositive: true,
    icon: ShoppingCart,
    color: 'blue',
    sub: '처리 대기 23건',
  },
  {
    id: 'orders_active',
    label: '처리중 주문',
    value: 186,
    display: '186건',
    delta: '+8%',
    deltaLabel: '지난주 대비',
    isPositive: true,
    icon: Package,
    color: 'violet',
    sub: '배송 중 91건',
  },
  {
    id: 'revenue',
    label: '이달 총매출',
    value: 38420000,
    display: '₩3,842만',
    delta: '+22%',
    deltaLabel: '지난달 대비',
    isPositive: true,
    icon: DollarSign,
    color: 'emerald',
    sub: '순이익 ₩768만',
  },
  {
    id: 'margin',
    label: '평균 마진율',
    value: 32.6,
    display: '32.6%',
    delta: '+1.2%p',
    deltaLabel: '지난달 대비',
    isPositive: true,
    icon: Percent,
    color: 'amber',
    sub: '목표 마진 25%',
  },
  {
    id: 'ai_jobs',
    label: 'AI 자동화',
    value: 1240,
    display: '1,240건',
    delta: '+34%',
    deltaLabel: '지난달 대비',
    isPositive: true,
    icon: Zap,
    color: 'indigo',
    sub: '자동화율 78%',
  },
];

const CATEGORIES = [
  { id: 'elec',    name: '전자제품',      icon: '🖥️', orders: 312, sales: 18400000, margin: 18.2 },
  { id: 'luxury',  name: '명품/패션',     icon: '👜', orders: 87,  sales: 9120000,  margin: 28.4 },
  { id: 'health',  name: '건강/영양제',   icon: '💊', orders: 241, sales: 3860000,  margin: 35.6 },
  { id: 'beauty',  name: '뷰티/화장품',   icon: '💄', orders: 178, sales: 2940000,  margin: 22.1 },
  { id: 'sports',  name: '스포츠/아웃도어',icon: '🏃', orders: 134, sales: 4210000,  margin: 19.8 },
  { id: 'home',    name: '홈/리빙',       icon: '🏠', orders: 96,  sales: 3840000,  margin: 21.3 },
  { id: 'kids',    name: '유아/완구',     icon: '🧸', orders: 63,  sales: 1890000,  margin: 24.7 },
  { id: 'food',    name: '식품/건강식',   icon: '🥗', orders: 49,  sales: 980000,   margin: 31.2 },
];

const ORDERS = [
  { id: 'ORD-8842', name: 'Apple MacBook Air M3 15인치',     src: 'amazon.com',  channel: 'coupang',      channelName: '쿠팡',        buy: 1750000, sale: 2190000, margin: 20.1, status: 'shipping_us' as OrderStatus },
  { id: 'ORD-8841', name: 'Coach Tabby 26 숄더백',           src: 'amazon.com',  channel: 'smartstore',   channelName: '스마트스토어', buy: 460000,  sale: 680000,  margin: 32.4, status: 'confirmed'   as OrderStatus },
  { id: 'ORD-8840', name: 'Dyson V15 Detect 진공청소기',     src: 'amazon.com',  channel: 'elevenst',     channelName: '11번가',      buy: 710000,  sale: 890000,  margin: 20.2, status: 'purchasing'  as OrderStatus },
  { id: 'ORD-8839', name: 'GNC 트리플 스트렝스 오메가-3',    src: 'amazon.com',  channel: 'coupang',      channelName: '쿠팡',        buy: 32000,   sale: 52000,   margin: 38.5, status: 'delivered'   as OrderStatus },
  { id: 'ORD-8838', name: 'Nike Air Max 270 운동화',         src: 'ebay.com',    channel: 'gmarket',      channelName: 'G마켓',       buy: 118000,  sale: 168000,  margin: 29.8, status: 'customs'     as OrderStatus },
  { id: 'ORD-8837', name: 'Theragun Mini 마사지건',          src: 'amazon.com',  channel: 'smartstore',   channelName: '스마트스토어', buy: 138000,  sale: 178000,  margin: 22.5, status: 'issue'       as OrderStatus },
];

const STATUS_META: Record<OrderStatus, { label: string; dot: string; cls: string }> = {
  new:         { label: '신규접수', dot: 'bg-blue-500',   cls: 'bg-blue-50   text-blue-700   ring-1 ring-inset ring-blue-200'   },
  confirmed:   { label: '주문확인', dot: 'bg-indigo-500', cls: 'bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-200' },
  purchasing:  { label: '구매중',   dot: 'bg-violet-500', cls: 'bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-200' },
  shipping_us: { label: '미국배송', dot: 'bg-amber-500',  cls: 'bg-amber-50  text-amber-700  ring-1 ring-inset ring-amber-200'  },
  customs:     { label: '통관중',   dot: 'bg-orange-500', cls: 'bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-200' },
  shipping_kr: { label: '국내배송', dot: 'bg-teal-500',   cls: 'bg-teal-50   text-teal-700   ring-1 ring-inset ring-teal-200'   },
  delivered:   { label: '배송완료', dot: 'bg-emerald-500',cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200' },
  issue:       { label: '문제발생', dot: 'bg-red-500',    cls: 'bg-red-50    text-red-700    ring-1 ring-inset ring-red-200'    },
};

const PIPELINE = [
  { id: 'p1', icon: '🏭', label: '미국 내 이동',   count: 34,  tone: 'blue'   },
  { id: 'p2', icon: '📦', label: '포워더 입고',    count: 28,  tone: 'indigo' },
  { id: 'p3', icon: '✈️', label: '국제 배송 중',  count: 52,  tone: 'violet' },
  { id: 'p4', icon: '🛃', label: '통관 심사',      count: 18,  tone: 'amber'  },
  { id: 'p5', icon: '🚚', label: '국내 배송',      count: 41,  tone: 'emerald'},
];

const CHANNELS = [
  { id: 'coupang',     name: '쿠팡',        color: 'bg-orange-500',  initial: 'C', sales: 16800000, listings: 284, rate: 10.8 },
  { id: 'smartstore',  name: '스마트스토어', color: 'bg-emerald-500', initial: 'N', sales: 8420000,  listings: 176, rate: 12.0 },
  { id: 'elevenst',    name: '11번가',      color: 'bg-red-500',     initial: '1', sales: 5640000,  listings: 98,  rate: 9.5  },
  { id: 'gmarket',     name: 'G마켓',       color: 'bg-blue-500',    initial: 'G', sales: 4120000,  listings: 67,  rate: 11.2 },
  { id: 'auction',     name: '옥션',        color: 'bg-indigo-500',  initial: 'A', sales: 1980000,  listings: 31,  rate: 10.0 },
  { id: 'amazon',      name: 'Amazon KR',   color: 'bg-slate-700',   initial: 'a', sales: 1460000,  listings: 12,  rate: 15.0 },
];

const CS_STATES = [
  { id: 'unanswered', label: '미답변 문의', count: 8,   tone: 'rose'    },
  { id: 'processing', label: '처리 중',    count: 14,  tone: 'amber'   },
  { id: 'return',     label: '반품/교환',  count: 5,   tone: 'indigo'  },
  { id: 'done',       label: '완료',      count: 127, tone: 'emerald' },
];

const AUTOMATIONS = [
  { id: 'a1', name: 'Amazon 가격 모니터링',   next: '5분 후',   runs: 4821, status: 'running' },
  { id: 'a2', name: 'AI 상품 소개글 자동생성', next: '오후 3시', runs: 1240, status: 'idle'    },
  { id: 'a3', name: '쿠팡 시세차익 탐지',     next: '10분 후',  runs: 892,  status: 'running' },
  { id: 'a4', name: 'SNS 상품 홍보 콘텐츠',  next: '오후 6시', runs: 341,  status: 'idle'    },
];

const ONBOARDING = [
  { id: 'o1', done: true,  label: '소셜 로그인 설정 완료' },
  { id: 'o2', done: true,  label: '판매 채널 연동 (쿠팡, 스마트스토어)' },
  { id: 'o3', done: false, label: '포워딩 업체 설정' },
  { id: 'o4', done: false, label: '구매대행 수수료 설정' },
  { id: 'o5', done: false, label: 'AI 자동화 워크플로우 구성' },
];

// ────────────────────────────────────────────────────────────────────────────
// 유틸
// ────────────────────────────────────────────────────────────────────────────
const krw = (n: number) =>
  n >= 10000000
    ? `₩${(n / 10000000).toFixed(1)}천만`
    : n >= 10000
    ? `₩${(n / 10000).toFixed(0)}만`
    : `₩${n.toLocaleString('ko-KR')}`;

const fmt = (n: number) => n.toLocaleString('ko-KR');

const KPI_COLOR: Record<string, { text: string; bg: string; bar: string; iconBg: string; iconText: string }> = {
  blue:   { text: 'text-blue-600',   bg: 'bg-blue-50',   bar: 'bg-blue-500',   iconBg: 'bg-blue-100',   iconText: 'text-blue-600'   },
  violet: { text: 'text-violet-600', bg: 'bg-violet-50', bar: 'bg-violet-500', iconBg: 'bg-violet-100', iconText: 'text-violet-600' },
  emerald:{ text: 'text-emerald-600',bg: 'bg-emerald-50',bar: 'bg-emerald-500',iconBg: 'bg-emerald-100',iconText: 'text-emerald-600'},
  amber:  { text: 'text-amber-600',  bg: 'bg-amber-50',  bar: 'bg-amber-500',  iconBg: 'bg-amber-100',  iconText: 'text-amber-600'  },
  indigo: { text: 'text-indigo-600', bg: 'bg-indigo-50', bar: 'bg-indigo-500', iconBg: 'bg-indigo-100', iconText: 'text-indigo-600' },
};

// ────────────────────────────────────────────────────────────────────────────
// 서브 컴포넌트
// ────────────────────────────────────────────────────────────────────────────

/** 카드 wrapper */
const Card: React.FC<{
  title?: React.ReactNode;
  action?: React.ReactNode;
  padding?: boolean;
  children: React.ReactNode;
  className?: string;
}> = ({ title, action, padding = true, children, className = '' }) => (
  <div className={`bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden ${className}`}>
    {title !== undefined && (
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
        <span className="text-[13.5px] font-semibold text-slate-800">{title}</span>
        {action && <div className="flex items-center gap-2 text-slate-400">{action}</div>}
      </div>
    )}
    <div className={padding ? 'p-5' : ''}>{children}</div>
  </div>
);

interface KPITileProps {
  id: string;
  label: string;
  display: string;
  delta: string;
  deltaLabel: string;
  isPositive: boolean;
  icon: React.ElementType;
  color: string;
  sub: string;
  value: number;
}

/** KPI 타일 — 왼쪽 색 바 */
const KPITile: React.FC<KPITileProps> = ({ label, display, delta, isPositive, icon: Icon, color, sub }) => {
  const c = KPI_COLOR[color] ?? KPI_COLOR.blue;
  return (
    <div className="relative bg-white rounded-xl border border-slate-200 shadow-card p-4 overflow-hidden hover:shadow-card-md transition-shadow">
      {/* left color bar */}
      <div className={`absolute top-0 left-0 w-1 h-full ${c.bar} rounded-l-xl`} />
      <div className="flex items-start justify-between mb-2">
        <div className={`w-8 h-8 rounded-lg ${c.iconBg} flex items-center justify-center shrink-0`}>
          <Icon className={`w-4 h-4 ${c.iconText}`} />
        </div>
        <span className={`flex items-center gap-0.5 text-[11px] font-semibold tabular-nums ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
          {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {delta}
        </span>
      </div>
      <p className="text-[22px] font-bold text-slate-900 tracking-tight leading-none tabular-nums">{display}</p>
      <p className="text-[11px] text-slate-500 mt-1 truncate">{label}</p>
      <p className="text-[10px] text-slate-400 mt-1 truncate">{sub}</p>
    </div>
  );
};

/** 채널 버블 (이니셜 원) */
const ChannelBubble: React.FC<{ ch: (typeof CHANNELS)[0]; size?: number }> = ({ ch, size = 26 }) => (
  <div
    className={`${ch.color} rounded-full flex items-center justify-center text-white font-bold shrink-0`}
    style={{ width: size, height: size, fontSize: size * 0.44 }}
  >
    {ch.initial}
  </div>
);

/** 상태 필 */
const StatusPill: React.FC<{ status: OrderStatus }> = ({ status }) => {
  const m = STATUS_META[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold ${m.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${m.dot} ${status === 'purchasing' || status === 'shipping_us' ? 'animate-pulse' : ''}`} />
      {m.label}
    </span>
  );
};

/** 진행 바 */
const ProgressBar: React.FC<{ value: number; color?: string; height?: number }> = ({
  value, color = 'bg-blue-500', height = 5,
}) => (
  <div className="w-full bg-slate-100 rounded-full overflow-hidden" style={{ height }}>
    <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${Math.min(value, 100)}%` }} />
  </div>
);

// ────────────────────────────────────────────────────────────────────────────
// 메인 대시보드 페이지
// ────────────────────────────────────────────────────────────────────────────
const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const maxOrders = Math.max(...CATEGORIES.map(c => c.orders));
  const totalSales = CHANNELS.reduce((s, c) => s + c.sales, 0);
  const doneOnboarding = ONBOARDING.filter(o => o.done).length;

  const today = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
  });

  return (
    /* 전체 랩퍼: 레이아웃 p-6/p-8 를 TopBar 영역에서 상쇄 */
    <div className="-mt-6 lg:-mt-8 -mx-6 lg:-mx-8">

      {/* ══ 1. 상단 TopBar ══════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-10 h-[58px] bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
        {/* 좌: 페이지 타이틀 */}
        <div className="flex items-center gap-3">
          <h1 className="text-[15px] font-bold text-slate-900 tracking-tight">대시보드 홈</h1>
          <nav className="hidden sm:flex items-center gap-1 text-[12px] text-slate-400">
            <ChevronRight className="w-3 h-3" />
            <span className="text-slate-600 font-medium">구매대행 종합 현황</span>
          </nav>
        </div>

        {/* 우: 검색 + 액션 */}
        <div className="flex items-center gap-2">
          {/* 검색 */}
          <div className="relative hidden md:block">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="주문번호 / 상품명 검색…"
              className="h-9 w-[240px] pl-8 pr-3 rounded-lg border border-slate-200 bg-slate-50 text-[12.5px] placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* 알림 벨 */}
          <button className="relative h-9 w-9 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-500 transition-colors">
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-rose-500 rounded-full pulse-dot" />
          </button>

          {/* 도움말 */}
          <button className="h-9 w-9 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-500 transition-colors">
            <HelpCircle className="w-4 h-4" />
          </button>

          <div className="w-px h-5 bg-slate-200 mx-0.5" />

          {/* 유저 */}
          <button className="flex items-center gap-2 h-9 px-2.5 rounded-lg hover:bg-slate-50 transition-colors">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-rose-500 flex items-center justify-center text-white text-[11px] font-bold shrink-0">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <span className="hidden lg:block text-[12.5px] font-semibold text-slate-700 max-w-[80px] truncate">
              {user?.name || '노마드 셀러'}
            </span>
            <ChevronDown className="hidden lg:block w-3 h-3 text-slate-400" />
          </button>
        </div>
      </header>

      {/* ══ 실제 콘텐츠: 패딩 복원 ════════════════════════════════════════ */}
      <div className="p-6 lg:p-8 space-y-5">

        {/* ── 2. HelloRow (파란 배너) ──────────────────────────────────── */}
        <div className="bg-gradient-to-br from-blue-600 via-blue-600 to-indigo-700 text-white rounded-2xl p-5 relative overflow-hidden">
          {/* 데코 blob */}
          <div className="absolute -right-12 -top-12 w-44 h-44 rounded-full bg-white/10 blur-xl pointer-events-none" />
          <div className="absolute right-16 -bottom-10 w-24 h-24 rounded-full bg-white/5 blur-lg pointer-events-none" />

          <div className="relative grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            <div className="md:col-span-7">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-blue-100 mb-1.5">
                <Calendar className="w-3 h-3" />
                <span>{today}</span>
              </div>
              <h2 className="text-[18px] font-bold leading-tight tracking-tight">
                오늘 <span className="text-amber-300">47건</span>의 주문이 확인 대기 중이에요.
              </h2>
              <p className="text-[12.5px] text-blue-100 mt-1">
                AI 자동화가 어제{' '}
                <span className="font-semibold text-white">128건</span>의 작업을 처리했고, 평균 마진율은{' '}
                <span className="font-semibold text-white">32.6%</span>입니다.
              </p>
            </div>
            <div className="md:col-span-5 flex items-center gap-2 md:justify-end">
              <button
                onClick={() => navigate('/dashboard/results')}
                className="h-9 px-3.5 rounded-lg bg-white/15 hover:bg-white/25 backdrop-blur border border-white/20 text-[12.5px] font-semibold inline-flex items-center gap-1.5 transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
                주문 확인 (47)
              </button>
              <button
                onClick={() => navigate('/dashboard/create')}
                className="h-9 px-3.5 rounded-lg bg-white text-blue-700 hover:bg-blue-50 text-[12.5px] font-semibold inline-flex items-center gap-1.5 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                AI 추천 상품
              </button>
            </div>
          </div>
        </div>

        {/* ── 3. KPI 스트립 (5개) ──────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {KPIS.map(k => <KPITile key={k.id} {...k} />)}
        </div>

        {/* ── 4. 퀵 액션 ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: '주문 접수 확인',  desc: '신규 47건 대기',       icon: ShoppingCart, grad: 'bg-gradient-to-br from-blue-500 to-blue-700',    badge: '47', to: '/dashboard/results'  },
            { label: '상품 소싱',       desc: 'Amazon·eBay 탐색',     icon: Search,       grad: 'bg-gradient-to-br from-violet-500 to-violet-700', badge: undefined, to: '/dashboard/create' },
            { label: '배송 조회',       desc: '배송중 173건',         icon: Truck,        grad: 'bg-gradient-to-br from-emerald-500 to-teal-600',  badge: undefined, to: '/dashboard/results' },
            { label: 'AI 자동화',       desc: '자동화 편집기 열기',    icon: Zap,          grad: 'bg-gradient-to-br from-amber-500 to-orange-600',  badge: undefined, to: '/dashboard/workflow' },
          ].map(qa => (
            <button
              key={qa.label}
              onClick={() => navigate(qa.to)}
              className="group relative bg-white border border-slate-200 rounded-xl p-4 hover:shadow-card-md hover:border-slate-300 transition-all text-left"
            >
              <div className="flex items-start justify-between">
                <div className={`w-9 h-9 rounded-lg ${qa.grad} flex items-center justify-center`}>
                  <qa.icon className="w-4 h-4 text-white" />
                </div>
                {qa.badge && (
                  <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">{qa.badge}</span>
                )}
              </div>
              <div className="mt-3 text-[13px] font-semibold text-slate-800">{qa.label}</div>
              <div className="mt-0.5 text-[11px] text-slate-500 flex items-center gap-1">
                바로가기 <ArrowRight className="w-3 h-3" />
              </div>
            </button>
          ))}
        </div>

        {/* ── 5. 메인 12-col 그리드 ─────────────────────────────────────── */}
        <div className="grid grid-cols-12 gap-4">

          {/* 왼쪽 col-8 */}
          <div className="col-span-12 lg:col-span-8 space-y-4">

            {/* 5-1. 카테고리별 현황 (2-col 리스트 + 진행 바) */}
            <Card
              title="구매대행 카테고리"
              action={
                <>
                  <button className="text-[11px] text-slate-500 hover:text-slate-700 px-2 py-1 rounded-md hover:bg-slate-50 transition-colors">이번달</button>
                  <RefreshCw className="w-3.5 h-3.5 cursor-pointer hover:text-slate-600 transition-colors" />
                </>
              }
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                {CATEGORIES.map(c => (
                  <div key={c.id} className="group">
                    <div className="flex items-center justify-between text-[12.5px] mb-1.5">
                      <div className="flex items-center gap-2 text-slate-700 font-medium">
                        <span>{c.icon}</span>
                        <span>{c.name}</span>
                        <span className="text-slate-400 text-[11px] font-normal">{c.orders}건</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-500 tabular-nums text-[11.5px]">{krw(c.sales)}</span>
                        <span className="font-semibold text-emerald-600 tabular-nums text-[11.5px] w-10 text-right">{c.margin}%</span>
                      </div>
                    </div>
                    <ProgressBar value={(c.orders / maxOrders) * 100} color="bg-blue-500" height={5} />
                  </div>
                ))}
              </div>
            </Card>

            {/* 5-2. 최근 주문 내역 (table) */}
            <Card
              title="최근 주문 내역"
              padding={false}
              action={
                <>
                  <button className="text-[11px] text-slate-500 hover:text-slate-700 inline-flex items-center gap-1 px-2 py-1 rounded-md hover:bg-slate-50 transition-colors">
                    <Filter className="w-3 h-3" /> 필터
                  </button>
                  <button
                    onClick={() => navigate('/dashboard/results')}
                    className="text-[11px] text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 font-medium"
                  >
                    전체보기 <ChevronRight className="w-3 h-3" />
                  </button>
                </>
              }
            >
              <div className="overflow-x-auto">
                <table className="w-full text-[12.5px]">
                  <thead>
                    <tr className="text-[11px] text-slate-500 border-b border-slate-100">
                      <th className="text-left font-medium px-5 py-2.5 w-[90px]">주문번호</th>
                      <th className="text-left font-medium py-2.5">상품 / 소싱</th>
                      <th className="text-left font-medium py-2.5 w-[110px]">채널</th>
                      <th className="text-right font-medium py-2.5 w-[90px]">구매가</th>
                      <th className="text-right font-medium py-2.5 w-[90px]">판매가</th>
                      <th className="text-right font-medium py-2.5 w-[60px]">마진</th>
                      <th className="text-left font-medium py-2.5 pl-3 w-[100px]">상태</th>
                      <th className="px-5 w-[24px]" />
                    </tr>
                  </thead>
                  <tbody>
                    {ORDERS.map(o => (
                      <tr
                        key={o.id}
                        onClick={() => navigate('/dashboard/detail')}
                        className="border-b border-slate-50 last:border-0 hover:bg-slate-50/70 cursor-pointer transition-colors"
                      >
                        <td className="px-5 py-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">{o.id}</td>
                        <td className="py-3 pr-2">
                          <div className="text-slate-800 font-medium truncate max-w-[240px]">{o.name}</div>
                          <div className="text-[10.5px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <ExternalLink className="w-2.5 h-2.5" /> {o.src}
                          </div>
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            {(() => {
                              const ch = CHANNELS.find(c => c.id === o.channel);
                              return ch ? <ChannelBubble ch={ch} size={22} /> : null;
                            })()}
                            <span className="text-slate-700">{o.channelName}</span>
                          </div>
                        </td>
                        <td className="text-right tabular-nums text-slate-500 py-3 whitespace-nowrap">{krw(o.buy)}</td>
                        <td className="text-right tabular-nums text-slate-900 font-semibold py-3 whitespace-nowrap">{krw(o.sale)}</td>
                        <td className="text-right tabular-nums font-semibold py-3 whitespace-nowrap">
                          <span className={o.margin >= 32 ? 'text-emerald-600' : o.margin >= 25 ? 'text-amber-600' : 'text-slate-600'}>
                            {o.margin}%
                          </span>
                        </td>
                        <td className="pl-3 py-3">
                          <StatusPill status={o.status} />
                        </td>
                        <td className="px-5 py-3 text-slate-400">
                          <ChevronRight className="w-3.5 h-3.5" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* 오른쪽 col-4 */}
          <div className="col-span-12 lg:col-span-4 space-y-4">

            {/* 5-3. 배송 파이프라인 */}
            <Card
              title="배송 파이프라인"
              action={<RefreshCw className="w-3.5 h-3.5 cursor-pointer hover:text-slate-600 transition-colors" />}
            >
              <div className="relative">
                {/* 타임라인 선 */}
                <div className="absolute left-[13px] top-3 bottom-3 w-px bg-slate-100" />
                <div className="space-y-3">
                  {PIPELINE.map(p => (
                    <div key={p.id} className="flex items-center gap-3">
                      <div className="relative z-10 w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-[13px] shrink-0">
                        {p.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[12.5px] font-medium text-slate-800">{p.label}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[15px] font-bold text-slate-900 tabular-nums">{p.count}</span>
                        <span className="text-[11px] text-slate-400 ml-0.5">건</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[12px]">
                <span className="text-slate-500">전체 진행중 주문</span>
                <span className="font-semibold text-slate-900 tabular-nums">173건</span>
              </div>
            </Card>

            {/* 5-4. CS 현황 */}
            <Card
              title="CS 현황"
              action={
                <button className="text-[11px] text-blue-600 hover:text-blue-700 font-medium transition-colors">바로가기 →</button>
              }
            >
              <div className="grid grid-cols-2 gap-2">
                {CS_STATES.map(cs => (
                  <div
                    key={cs.id}
                    className="border border-slate-100 rounded-lg p-3 hover:border-slate-200 hover:bg-slate-50/50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        cs.tone === 'rose' ? 'bg-rose-500' :
                        cs.tone === 'amber' ? 'bg-amber-500' :
                        cs.tone === 'indigo' ? 'bg-indigo-500' : 'bg-emerald-500'
                      }`} />
                      {cs.label}
                    </div>
                    <div className={`mt-1 text-[20px] font-bold tabular-nums ${cs.id === 'unanswered' ? 'text-rose-600' : 'text-slate-900'}`}>
                      {cs.count}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* 5-5. AI 자동화 현황 */}
            <Card
              title="AI 자동화 현황"
              action={
                <button
                  onClick={() => navigate('/dashboard/workflow')}
                  className="text-[11px] text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1 transition-colors"
                >
                  편집기 열기 <ExternalLink className="w-3 h-3" />
                </button>
              }
            >
              <div className="space-y-1.5">
                {AUTOMATIONS.map(a => (
                  <div
                    key={a.id}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <div className={`w-2 h-2 rounded-full shrink-0 ${a.status === 'running' ? 'bg-emerald-500 pulse-dot' : 'bg-slate-300'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[12.5px] font-medium text-slate-800 truncate">{a.name}</div>
                      <div className="text-[10.5px] text-slate-400 mt-0.5 flex items-center gap-2">
                        <span>다음: {a.next}</span>
                        <span className="text-slate-300">·</span>
                        <span>{fmt(a.runs)}회</span>
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      a.status === 'running'
                        ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200'
                        : 'bg-slate-100 text-slate-500'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${a.status === 'running' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                      {a.status === 'running' ? '실행중' : '일시중지'}
                    </span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => navigate('/dashboard/workflow')}
                className="mt-3 w-full h-9 rounded-lg border border-dashed border-slate-300 text-[12px] text-slate-500 hover:bg-slate-50 hover:border-slate-400 inline-flex items-center justify-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> 새 자동화 워크플로우 만들기
              </button>
            </Card>
          </div>
        </div>

        {/* ── 6. 하단 row — 채널 현황 + 시작 가이드 ──────────────────────── */}
        <div className="grid grid-cols-12 gap-4">

          {/* 6-1. 판매 채널 현황 (col-7) */}
          <div className="col-span-12 lg:col-span-7">
            <Card
              title="판매 채널 현황"
              action={
                <button className="text-[11px] text-blue-600 hover:text-blue-700 font-medium transition-colors">상세 →</button>
              }
            >
              <div className="space-y-3">
                {CHANNELS.map(ch => {
                  const share = (ch.sales / totalSales) * 100;
                  return (
                    <div key={ch.id} className="flex items-center gap-3">
                      <ChannelBubble ch={ch} size={28} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between text-[12px] mb-1">
                          <span className="font-medium text-slate-800">{ch.name}</span>
                          <span className="font-semibold text-slate-900 tabular-nums">{krw(ch.sales)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            <ProgressBar value={share} color="bg-blue-500" height={5} />
                          </div>
                          <span className="text-[10.5px] text-slate-400 tabular-nums w-9 text-right">{share.toFixed(1)}%</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[11px] text-slate-500">{ch.listings}개</div>
                        <div className="text-[10px] text-slate-400">수수료 {ch.rate}%</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* 6-2. 구매대행 시작 가이드 (col-5) */}
          <div className="col-span-12 lg:col-span-5">
            <Card
              title="구매대행 시작 가이드"
              action={<MoreHorizontal className="w-4 h-4 cursor-pointer hover:text-slate-600 transition-colors" />}
            >
              {/* 진행률 */}
              <div className="flex items-baseline justify-between mb-1.5">
                <div className="text-[12px] text-slate-500">진행률</div>
                <div className="text-[20px] font-bold text-slate-900 tabular-nums">
                  {doneOnboarding}
                  <span className="text-slate-400 text-[14px]">/{ONBOARDING.length}</span>
                </div>
              </div>
              <ProgressBar value={(doneOnboarding / ONBOARDING.length) * 100} color="bg-emerald-500" height={6} />

              {/* 체크리스트 */}
              <ul className="mt-4 space-y-1.5">
                {ONBOARDING.map((s, i) => (
                  <li
                    key={s.id}
                    className={`flex items-center gap-2.5 px-2 py-1.5 rounded-md transition-colors ${s.done ? 'opacity-50' : 'hover:bg-slate-50'}`}
                  >
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${s.done ? 'bg-emerald-500' : 'border-2 border-slate-300'}`}>
                      {s.done && <CheckCircle2 className="w-3 h-3 text-white" />}
                    </div>
                    <span className={`text-[12.5px] ${s.done ? 'text-slate-500 line-through decoration-slate-300' : 'text-slate-700 font-medium'}`}>
                      {i + 1}. {s.label}
                    </span>
                    {!s.done && i === doneOnboarding && (
                      <span className="ml-auto text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full shrink-0">
                        다음 단계
                      </span>
                    )}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <button
                onClick={() => navigate('/dashboard/create')}
                className="mt-4 w-full h-9 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[12px] font-semibold hover:opacity-90 inline-flex items-center justify-center gap-1.5 transition-opacity"
              >
                <Search className="w-3.5 h-3.5" />
                상품 소싱 시작하기
              </button>
            </Card>
          </div>
        </div>

      </div>{/* /콘텐츠 */}
    </div>
  );
};

export default DashboardPage;
