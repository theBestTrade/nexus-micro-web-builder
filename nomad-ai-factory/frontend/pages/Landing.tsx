import React, { useState, useEffect } from 'react';
import LoginModal from '../components/auth/LoginModal.tsx';
import {
  Zap, ArrowRight, Menu, X, CheckCircle,
  Globe, Workflow, FileText, TrendingUp,
  Package, BarChart3, ChevronRight, Star,
  Shield, Clock, Users, Cpu,
} from 'lucide-react';

// ─── 데이터 ───────────────────────────────────────────────────────────────────

const NAV_LINKS = [
  { label: '기능',     href: '#features'      },
  { label: '작동방식', href: '#how-it-works'   },
  { label: '요금제',   href: '#pricing'        },
  { label: '고객사례', href: '#testimonials'   },
];

const MARQUEE_ITEMS = [
  '쿠팡', 'Amazon', '스마트스토어', 'eBay', '11번가',
  'G마켓', 'Walmart', '옥션', 'AliExpress', '티몬',
  '쿠팡', 'Amazon', '스마트스토어', 'eBay', '11번가',
  'G마켓', 'Walmart', '옥션', 'AliExpress', '티몬',
];

const STATS = [
  { value: '8,000+',  label: '활성 셀러',       sub: '전국 구매대행 셀러' },
  { value: '₩3.2억+', label: '누적 거래액',      sub: '지난 12개월 기준'   },
  { value: '94.7%',   label: '마진 분석 정확도', sub: 'AI 가격 비교 모델'  },
  { value: '99.9%',   label: '서비스 가동률',    sub: 'SLA 보장'           },
];

const FEATURES = [
  {
    icon: Globe,
    iconColor: 'text-blue-600',
    iconBg:    'bg-blue-50',
    title: '미국 상품 소싱 자동화',
    desc:  'Amazon · eBay · Walmart URL만 입력하면 가격·스펙·이미지를 자동 추출하고, 실시간 환율로 마진율을 즉시 계산합니다.',
    tags:  ['Amazon', 'eBay', 'Walmart'],
  },
  {
    icon: BarChart3,
    iconColor: 'text-teal-600',
    iconBg:    'bg-teal-50',
    title: '실시간 마진율 계산',
    desc:  'USD/KRW 환율·플랫폼 수수료·배송비·포워딩 요금을 종합해 순마진율을 자동 산출합니다.',
    tags:  ['환율 연동', '수수료 자동', '마진 최적화'],
  },
  {
    icon: FileText,
    iconColor: 'text-violet-600',
    iconBg:    'bg-violet-50',
    title: 'AI 상세페이지 제작',
    desc:  'Gemini · GPT · Claude로 해외 상품 설명을 국내 감성에 맞게 번역·재작성하고, SEO 최적 태그까지 자동 생성합니다.',
    tags:  ['Gemini', 'GPT', 'Claude'],
  },
  {
    icon: Package,
    iconColor: 'text-emerald-600',
    iconBg:    'bg-emerald-50',
    title: '다채널 상품 등록',
    desc:  '쿠팡·스마트스토어·11번가·G마켓에 상품 정보를 한 번에 등록하고 재고·가격을 통합 관리합니다.',
    tags:  ['쿠팡', '스마트스토어', '11번가'],
  },
  {
    icon: Workflow,
    iconColor: 'text-orange-600',
    iconBg:    'bg-orange-50',
    title: '노드 기반 자동화',
    desc:  'Make.com 스타일의 시각적 노드 에디터로 소싱→등록→발행 전 과정을 워크플로우로 자동화합니다.',
    tags:  ['노드 에디터', 'Cron 스케줄', 'API 연동'],
  },
  {
    icon: TrendingUp,
    iconColor: 'text-rose-600',
    iconBg:    'bg-rose-50',
    title: 'SNS 콘텐츠 자동 발행',
    desc:  '상품 홍보 숏폼·블로그 콘텐츠를 AI가 제작해 Instagram · TikTok · YouTube에 자동 업로드합니다.',
    tags:  ['Instagram', 'TikTok', 'YouTube'],
  },
];

const HOW_IT_WORKS = [
  {
    step: '01',
    icon: Globe,
    gradient: 'from-blue-500 to-cyan-500',
    shadow:   'shadow-blue-200',
    title: '상품 URL 입력',
    desc:  'Amazon·eBay·Walmart 상품 URL을 붙여넣으면 AI가 가격·스펙·이미지를 즉시 추출합니다.',
  },
  {
    step: '02',
    icon: Cpu,
    gradient: 'from-violet-500 to-indigo-500',
    shadow:   'shadow-violet-200',
    title: 'AI 분석 & 번역',
    desc:  '환율·수수료를 반영한 마진 자동 계산, 국내 감성 맞춤 상세페이지를 자동 생성합니다.',
  },
  {
    step: '03',
    icon: TrendingUp,
    gradient: 'from-emerald-500 to-teal-500',
    shadow:   'shadow-emerald-200',
    title: '자동 등록 & 수익',
    desc:  '쿠팡·스마트스토어에 자동 등록하고 SNS 콘텐츠까지 발행해 다채널 수익을 동시에 창출합니다.',
  },
];

const PLANS = [
  {
    name:      'Starter',
    badge:     null,
    price:     '₩0',
    period:    '영구 무료',
    desc:      '구매대행을 처음 시작하는 1인 셀러',
    features:  ['월 상품 소싱 20건', '기본 마진율 계산', 'AI 상세페이지 5건/월', '채널 1개 연동', '커뮤니티 지원'],
    cta:       '무료로 시작',
    highlight: false,
  },
  {
    name:      'Pro',
    badge:     '가장 인기',
    price:     '₩49,000',
    period:    '/ 월',
    desc:      '매출을 본격적으로 키우려는 셀러',
    features:  ['무제한 상품 소싱', '실시간 환율 · 마진 분석', 'AI 상세페이지 무제한', '채널 5개 연동', '자동화 워크플로우 10개', 'SNS 자동 발행', '우선 고객 지원'],
    cta:       '14일 무료 체험',
    highlight: true,
  },
  {
    name:      'Business',
    badge:     null,
    price:     '₩149,000',
    period:    '/ 월',
    desc:      '팀 단위 대규모 셀러 · 에이전시',
    features:  ['Pro 모든 기능 포함', '팀원 5인 계정', '무제한 워크플로우', '전 채널 통합 연동', 'API 액세스', '전담 매니저 배정'],
    cta:       '영업팀 문의',
    highlight: false,
  },
];

const TESTIMONIALS = [
  {
    name:    '김○○',
    role:    '쿠팡 파트너 셀러 · 월 매출 2,300만',
    content: '미국 아마존에서 상품 URL만 복사하면 마진 계산부터 상세페이지 번역까지 10분 안에 끝납니다. 전에는 하루 종일 걸리던 작업이에요.',
    rating:  5,
  },
  {
    name:    '박○○',
    role:    '스마트스토어 운영 · 3년차 구매대행',
    content: '자동화 워크플로우 덕에 매일 아침 새 상품이 자동으로 등록돼요. 지금은 부업이 아니라 본업이 됐습니다.',
    rating:  5,
  },
  {
    name:    '이○○',
    role:    '디지털 노마드 · 해외 거주 셀러',
    content: 'SNS 콘텐츠까지 자동으로 올려줘서 인스타그램 팔로워가 늘면서 수익이 두 배 됐어요. 이 툴 없이는 못 살 것 같아요.',
    rating:  5,
  },
];

// ─── 랜딩 페이지 ─────────────────────────────────────────────────────────────
const Landing: React.FC = () => {
  const [isLoginOpen,    setIsLoginOpen]    = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [scrolled,       setScrolled]       = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const openLogin  = () => { setIsLoginOpen(true); setIsMobileNavOpen(false); };
  const closeLogin = () => setIsLoginOpen(false);

  return (
    <div className="min-h-screen bg-white text-slate-900">

      {/* ══════════════════════════════════════════════════════
          NAV
      ══════════════════════════════════════════════════════ */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/95 backdrop-blur-xl border-b border-slate-200 shadow-sm'
          : 'bg-transparent'
      }`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* 로고 */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center shadow-md shadow-blue-600/25">
              <Zap className="w-4 h-4 text-white" fill="currentColor" />
            </div>
            <span className={`font-bold text-[15px] tracking-tight transition-colors ${scrolled ? 'text-slate-900' : 'text-white'}`}>
              NOMAD AI
            </span>
            <span className="hidden sm:inline text-[11px] font-semibold text-blue-300 bg-blue-400/20 border border-blue-400/30 px-2 py-0.5 rounded-full">
              Factory
            </span>
          </div>

          {/* 데스크톱 메뉴 */}
          <nav className="hidden md:flex items-center gap-7">
            {NAV_LINKS.map(link => (
              <a
                key={link.label}
                href={link.href}
                className={`text-[14px] font-medium transition-colors ${
                  scrolled ? 'text-slate-600 hover:text-slate-900' : 'text-blue-100 hover:text-white'
                }`}
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* CTA */}
          <div className="flex items-center gap-3">
            <button
              onClick={openLogin}
              className={`hidden sm:block text-[14px] font-medium transition-colors ${
                scrolled ? 'text-slate-600 hover:text-slate-900' : 'text-blue-100 hover:text-white'
              }`}
            >
              로그인
            </button>
            <button
              onClick={openLogin}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold bg-blue-600 text-white hover:bg-blue-500 shadow-md shadow-blue-600/25 transition-all active:scale-[0.97]"
            >
              무료 시작
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              className={`md:hidden p-2 rounded-lg transition-colors ${
                scrolled ? 'text-slate-700 hover:bg-slate-100' : 'text-white hover:bg-white/10'
              }`}
              onClick={() => setIsMobileNavOpen(o => !o)}
            >
              {isMobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* 모바일 메뉴 */}
        {isMobileNavOpen && (
          <div className="md:hidden bg-slate-900 border-b border-white/10 px-4 py-4 space-y-1">
            {NAV_LINKS.map(link => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setIsMobileNavOpen(false)}
                className="block px-3 py-2.5 rounded-lg text-[14px] font-medium text-slate-200 hover:text-white hover:bg-white/10 transition-colors"
              >
                {link.label}
              </a>
            ))}
            <div className="pt-3 border-t border-white/10 flex flex-col gap-2">
              <button onClick={openLogin} className="w-full text-center py-2.5 text-[14px] font-medium text-slate-300">
                로그인
              </button>
              <button onClick={openLogin} className="w-full py-2.5 rounded-lg bg-blue-600 text-white text-[14px] font-semibold">
                무료로 시작하기
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ══════════════════════════════════════════════════════
          HERO — 다크 오로라 히어로
      ══════════════════════════════════════════════════════ */}
      <section className="hero-aurora relative overflow-hidden pt-32 pb-24 lg:pt-40 lg:pb-32">
        {/* Ambient blobs */}
        <div className="blob absolute w-96 h-96 rounded-full bg-indigo-600 top-1/4 -left-32 pointer-events-none" />
        <div className="blob absolute w-80 h-80 rounded-full bg-cyan-500 top-0 right-0 pointer-events-none" />
        <div className="blob absolute w-64 h-64 rounded-full bg-purple-600 bottom-0 right-1/3 pointer-events-none" />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 text-center">
          {/* 뱃지 */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/20 border border-blue-400/40 text-[12px] font-semibold text-blue-200 mb-8">
            <Star className="w-3.5 h-3.5 text-yellow-400" fill="currentColor" />
            미국 구매대행 + AI 콘텐츠 자동화 플랫폼 · 셀러 8,000+
          </div>

          {/* 헤드라인 */}
          <h1 className="text-[40px] sm:text-[56px] lg:text-[66px] font-extrabold leading-[1.1] tracking-tight text-white mb-6">
            미국 상품 소싱부터<br />
            <span className="aurora-text">AI 자동화 수익</span>까지
          </h1>

          {/* 서브카피 — 명도 높은 파란색 계열로 가독성 확보 */}
          <p className="text-[17px] sm:text-[19px] text-blue-100 leading-relaxed max-w-2xl mx-auto mb-10">
            Amazon·eBay URL 하나로 마진 분석·상세페이지·다채널 등록을 자동화하고,<br className="hidden sm:block" />
            SNS 콘텐츠까지 AI가 대신 올려드립니다.
          </p>

          {/* CTA 버튼 */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
            <button
              onClick={openLogin}
              className="flex items-center gap-2.5 px-8 py-4 rounded-xl text-[16px] font-bold bg-blue-600 text-white hover:bg-blue-500 shadow-xl shadow-blue-900/40 transition-all active:scale-[0.97] w-full sm:w-auto"
            >
              <Zap className="w-5 h-5" fill="currentColor" />
              무료로 시작하기
            </button>
            <button
              onClick={openLogin}
              className="flex items-center gap-2 px-8 py-4 rounded-xl text-[16px] font-semibold bg-white/10 border border-white/25 text-white hover:bg-white/20 transition-all active:scale-[0.97] w-full sm:w-auto"
            >
              데모 보기
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* 신뢰 문구 */}
          <p className="text-[13px] text-slate-400 mb-14">
            신용카드 불필요 · 14일 무료 체험 · 언제든 해지 가능
          </p>

          {/* 대시보드 목업 */}
          <div className="mx-auto max-w-4xl rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-black/50"
               style={{ background: 'rgba(15,23,60,0.85)', backdropFilter: 'blur(20px)' }}>
            {/* 브라우저 바 */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-emerald-400" />
              </div>
              <div className="flex-1 mx-4 h-6 rounded-md flex items-center px-3" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <span className="text-[11px] text-slate-400">app.nomadai.factory/dashboard</span>
              </div>
            </div>
            {/* 미니 대시보드 */}
            <div className="flex h-52 sm:h-64">
              {/* 미니 사이드바 */}
              <div className="w-14 flex flex-col items-center py-3 gap-3 shrink-0" style={{ background: 'rgba(0,0,0,0.25)' }}>
                <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
                  <Zap className="w-3.5 h-3.5 text-white" fill="currentColor" />
                </div>
                {[Globe, Package, FileText, Workflow, BarChart3].map((Icon, i) => (
                  <div key={i} className={`w-8 h-8 rounded-lg flex items-center justify-center ${i === 0 ? 'bg-blue-600/40' : ''}`}>
                    <Icon className={`w-4 h-4 ${i === 0 ? 'text-blue-300' : 'text-slate-500'}`} />
                  </div>
                ))}
              </div>
              {/* 콘텐츠 */}
              <div className="flex-1 p-4 overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)' }}>
                {/* KPI 카드 */}
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-3">
                  {[
                    { label: '오늘 신규주문', val: '23건',      color: 'text-blue-400'   },
                    { label: '이달 매출',     val: '₩1,230만', color: 'text-emerald-400' },
                    { label: '평균 마진율',   val: '34.2%',    color: 'text-violet-400'  },
                    { label: 'AI 처리',       val: '127건',    color: 'text-cyan-400'    },
                  ].map((s, i) => (
                    <div key={i} className={`rounded-lg p-2.5 border border-white/[0.08] ${i === 3 ? 'hidden sm:block' : ''}`}
                         style={{ background: 'rgba(255,255,255,0.05)' }}>
                      <p className="text-[9px] text-slate-400">{s.label}</p>
                      <p className={`text-[13px] font-bold mt-0.5 ${s.color}`}>{s.val}</p>
                    </div>
                  ))}
                </div>
                {/* 주문 목록 */}
                <div className="rounded-lg p-3 border border-white/[0.08]" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-2">최근 소싱 상품</p>
                  {[
                    { name: 'Apple AirPods Pro 2세대', ch: '쿠팡',      margin: '+38.2%', status: '처리중', statusColor: 'text-blue-400'    },
                    { name: 'Dyson V15 무선청소기',    ch: '스마트스토어', margin: '+42.1%', status: '완료',   statusColor: 'text-emerald-400' },
                    { name: 'Nike Air Max 2025',       ch: '11번가',    margin: '+29.7%', status: '대기',   statusColor: 'text-slate-400'   },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-1.5 border-b border-white/[0.06] last:border-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-5 h-5 rounded shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }} />
                        <span className="text-[10px] text-slate-300 truncate">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <span className="text-[9px] text-slate-500 hidden sm:block">{item.ch}</span>
                        <span className="text-[10px] font-semibold text-emerald-400">{item.margin}</span>
                        <span className={`text-[9px] font-semibold ${item.statusColor}`}>{item.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          MARQUEE — 파트너 플랫폼
      ══════════════════════════════════════════════════════ */}
      <section className="py-10 bg-slate-50 border-y border-slate-200 overflow-hidden">
        <p className="text-center text-[11px] font-bold text-slate-400 tracking-[0.2em] uppercase mb-6">
          연동 지원 플랫폼
        </p>
        <div className="relative">
          <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-slate-50 to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-slate-50 to-transparent z-10 pointer-events-none" />
          <div className="flex overflow-hidden">
            <div className="marquee-track gap-4">
              {MARQUEE_ITEMS.map((name, i) => (
                <div
                  key={i}
                  className="shrink-0 flex items-center justify-center h-9 px-5 rounded-full bg-white border border-slate-200 text-[13px] font-semibold text-slate-600 hover:text-slate-900 hover:border-slate-300 transition-colors cursor-default select-none shadow-sm"
                >
                  {name}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          STATS — 수치 증명
      ══════════════════════════════════════════════════════ */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {STATS.map((stat, i) => (
              <div key={i}>
                <p className="text-[38px] sm:text-[44px] font-extrabold text-slate-900 leading-none tracking-tight">
                  {stat.value}
                </p>
                <p className="text-[14px] font-semibold text-slate-700 mt-2">{stat.label}</p>
                <p className="text-[12px] text-slate-400 mt-0.5">{stat.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          FEATURES (id="features")
      ══════════════════════════════════════════════════════ */}
      <section id="features" className="py-24 bg-slate-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <span className="inline-block text-[12px] font-bold text-blue-600 tracking-[0.15em] uppercase bg-blue-50 border border-blue-100 px-3 py-1 rounded-full mb-4">
              핵심 기능
            </span>
            <h2 className="text-[30px] sm:text-[40px] font-extrabold text-slate-900 tracking-tight leading-tight">
              구매대행의 모든 과정을<br />AI가 자동으로 처리합니다
            </h2>
            <p className="text-[16px] text-slate-500 mt-4 max-w-xl mx-auto leading-relaxed">
              소싱 · 마진 분석 · 상세페이지 · 상품 등록 · SNS 발행까지, 단 한 번의 클릭으로.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl p-6 border border-slate-100 hover:border-slate-200 hover:shadow-lg transition-all duration-200 group"
              >
                <div className={`w-11 h-11 rounded-xl ${f.iconBg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <f.icon className={`w-5 h-5 ${f.iconColor}`} />
                </div>
                <h3 className="text-[16px] font-bold text-slate-900 mb-2">{f.title}</h3>
                <p className="text-[13px] text-slate-500 leading-relaxed mb-4">{f.desc}</p>
                <div className="flex flex-wrap gap-1.5">
                  {f.tags.map(tag => (
                    <span key={tag} className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          HOW IT WORKS (id="how-it-works")
      ══════════════════════════════════════════════════════ */}
      <section id="how-it-works" className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <span className="inline-block text-[12px] font-bold text-blue-600 tracking-[0.15em] uppercase bg-blue-50 border border-blue-100 px-3 py-1 rounded-full mb-4">
              작동 방식
            </span>
            <h2 className="text-[30px] sm:text-[40px] font-extrabold text-slate-900 tracking-tight">
              3단계로 자동화 수익 완성
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* 연결선 */}
            <div className="hidden md:block absolute top-16 left-[calc(33%+1rem)] right-[calc(33%+1rem)] h-0.5 bg-slate-200" />

            {HOW_IT_WORKS.map((step, i) => (
              <div key={i} className="flex flex-col items-center text-center relative">
                {/* 스텝 번호 뱃지 */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full">
                  STEP {step.step}
                </div>
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${step.gradient} flex items-center justify-center mb-5 shadow-xl ${step.shadow}`}>
                  <step.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-[18px] font-bold text-slate-900 mb-2">{step.title}</h3>
                <p className="text-[13px] text-slate-500 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          TESTIMONIALS (id="testimonials")
      ══════════════════════════════════════════════════════ */}
      <section id="testimonials" className="py-24 bg-slate-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <span className="inline-block text-[12px] font-bold text-blue-600 tracking-[0.15em] uppercase bg-blue-50 border border-blue-100 px-3 py-1 rounded-full mb-4">
              고객 사례
            </span>
            <h2 className="text-[30px] sm:text-[40px] font-extrabold text-slate-900 tracking-tight">
              실제 셀러들의 이야기
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                <div className="flex gap-1 mb-3">
                  {Array.from({ length: t.rating }).map((_, si) => (
                    <Star key={si} className="w-4 h-4 text-yellow-400" fill="currentColor" />
                  ))}
                </div>
                <p className="text-[14px] text-slate-600 leading-relaxed mb-5">"{t.content}"</p>
                <div className="border-t border-slate-100 pt-4">
                  <p className="text-[14px] font-bold text-slate-900">{t.name}</p>
                  <p className="text-[12px] text-slate-500 mt-0.5">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          PRICING (id="pricing")
      ══════════════════════════════════════════════════════ */}
      <section id="pricing" className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <span className="inline-block text-[12px] font-bold text-blue-600 tracking-[0.15em] uppercase bg-blue-50 border border-blue-100 px-3 py-1 rounded-full mb-4">
              요금제
            </span>
            <h2 className="text-[30px] sm:text-[40px] font-extrabold text-slate-900 tracking-tight">
              합리적인 가격, 무제한 성장
            </h2>
            <p className="text-[15px] text-slate-500 mt-3">
              14일 무료 체험 · 언제든 플랜 변경 · 연간 결제 시 20% 할인
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
            {PLANS.map((plan, i) => (
              <div
                key={i}
                className={`relative rounded-2xl p-7 flex flex-col ${
                  plan.highlight
                    ? 'bg-blue-600 text-white shadow-2xl shadow-blue-600/30 ring-4 ring-blue-600/20 md:-mt-4 md:pb-11'
                    : 'bg-white border border-slate-200 text-slate-900'
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-white text-blue-700 text-[11px] font-bold shadow-md whitespace-nowrap border border-blue-100">
                    ✦ {plan.badge}
                  </div>
                )}

                <p className={`text-[12px] font-bold tracking-widest uppercase mb-2 ${plan.highlight ? 'text-blue-200' : 'text-slate-400'}`}>
                  {plan.name}
                </p>
                <div className="flex items-baseline gap-1.5 mb-1">
                  <span className={`text-[36px] font-extrabold leading-none ${plan.highlight ? 'text-white' : 'text-slate-900'}`}>
                    {plan.price}
                  </span>
                  <span className={`text-[13px] font-medium ${plan.highlight ? 'text-blue-200' : 'text-slate-400'}`}>
                    {plan.period}
                  </span>
                </div>
                <p className={`text-[13px] mb-7 ${plan.highlight ? 'text-blue-100' : 'text-slate-500'}`}>
                  {plan.desc}
                </p>

                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((f, fi) => (
                    <li key={fi} className="flex items-start gap-2.5 text-[13px]">
                      <CheckCircle className={`w-4 h-4 shrink-0 mt-0.5 ${plan.highlight ? 'text-blue-200' : 'text-blue-600'}`} />
                      <span className={plan.highlight ? 'text-blue-50' : 'text-slate-600'}>{f}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={openLogin}
                  className={`w-full py-3 rounded-xl text-[14px] font-bold transition-all active:scale-[0.97] ${
                    plan.highlight
                      ? 'bg-white text-blue-700 hover:bg-blue-50 shadow-md'
                      : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-600/20'
                  }`}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>

          {/* 신뢰 배지 */}
          <div className="flex flex-wrap items-center justify-center gap-6 mt-12 text-[13px] text-slate-500">
            <span className="flex items-center gap-1.5"><Shield className="w-4 h-4 text-emerald-500" /> SSL 보안 결제</span>
            <span className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-emerald-500" /> 언제든 해지 가능</span>
            <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-emerald-500" /> 14일 환불 보장</span>
            <span className="flex items-center gap-1.5"><Users className="w-4 h-4 text-emerald-500" /> 8,000+ 셀러 사용 중</span>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          CTA — 최종 전환 유도
      ══════════════════════════════════════════════════════ */}
      <section className="hero-aurora relative overflow-hidden py-24">
        <div className="blob absolute w-96 h-96 rounded-full bg-indigo-600 -top-20 -right-20 pointer-events-none" />
        <div className="blob absolute w-72 h-72 rounded-full bg-cyan-500 bottom-0 left-0 pointer-events-none" />

        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-[32px] sm:text-[46px] font-extrabold text-white tracking-tight leading-tight mb-5">
            지금 바로 구매대행<br />
            <span className="aurora-text">자동화를 시작하세요</span>
          </h2>
          <p className="text-[16px] text-blue-100 leading-relaxed mb-10">
            신용카드 없이 무료로 시작할 수 있습니다.<br />
            8,000명의 셀러와 함께 AI 구매대행의 새 시대를 여세요.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={openLogin}
              className="flex items-center gap-2.5 px-10 py-4 rounded-xl text-[16px] font-bold bg-blue-600 text-white hover:bg-blue-500 shadow-xl shadow-blue-900/40 transition-all active:scale-[0.97] w-full sm:w-auto"
            >
              <Zap className="w-5 h-5" fill="currentColor" />
              무료로 시작하기
              <ArrowRight className="w-5 h-5" />
            </button>
            <button
              onClick={openLogin}
              className="flex items-center gap-2 px-8 py-4 rounded-xl text-[15px] font-semibold bg-white/10 border border-white/25 text-white hover:bg-white/20 transition-all w-full sm:w-auto"
            >
              데모 체험하기
            </button>
          </div>
          <p className="mt-6 text-[13px] text-slate-400">신용카드 불필요 · 14일 무료 체험 · 언제든 해지 가능</p>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════════════ */}
      <footer className="bg-slate-900 py-14">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row items-start justify-between gap-10 mb-10">
            {/* 브랜드 */}
            <div className="max-w-xs">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-white" fill="currentColor" />
                </div>
                <span className="font-bold text-white text-[15px]">NOMAD AI Factory</span>
              </div>
              <p className="text-[13px] text-slate-400 leading-relaxed">
                미국 구매대행 + AI 콘텐츠 자동화를 통합한<br />글로벌 셀러 올인원 플랫폼
              </p>
              <p className="text-[12px] text-slate-600 mt-4">Made for Digital Nomads 🌍</p>
            </div>

            {/* 링크 */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 text-[13px]">
              {[
                { title: '서비스',   links: ['상품 소싱', '마진 분석', '상세페이지', '자동화 워크플로우'] },
                { title: '회사',     links: ['소개', '블로그', '채용', '파트너십'] },
                { title: '지원',     links: ['고객센터', '이용약관', '개인정보처리방침', 'API 문서'] },
              ].map((col, i) => (
                <div key={i}>
                  <p className="font-semibold text-slate-300 mb-3">{col.title}</p>
                  <ul className="space-y-2">
                    {col.links.map(link => (
                      <li key={link}>
                        <button className="text-slate-500 hover:text-slate-300 transition-colors">{link}</button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-[12px]">
            <p className="text-slate-500">© 2026 NOMAD AI Factory. All rights reserved.</p>
            <p className="text-slate-600">사업자등록번호: 000-00-00000 · 통신판매업 신고: 제000-서울000-0000호</p>
          </div>
        </div>
      </footer>

      {isLoginOpen && <LoginModal onClose={closeLogin} />}
    </div>
  );
};

export default Landing;
