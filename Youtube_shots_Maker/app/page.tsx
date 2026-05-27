import Link from "next/link";
import { ArrowRight, Zap, TrendingUp, Globe, Bot } from "lucide-react";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-surface text-foreground">
      {/* 네브바 */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4 border-b border-border/50 backdrop-blur-md bg-surface/80">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-jade">
            <Zap className="h-5 w-5 text-surface" />
          </div>
          <span className="font-heading text-xl tracking-widest">NOMAD SHORT FACTORY</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            로그인
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-md bg-jade px-4 py-2 text-sm font-medium text-surface hover:bg-jade-600 transition-colors"
          >
            무료 시작
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </nav>

      {/* 히어로 섹션 */}
      <section className="pt-32 pb-24 px-8 text-center">
        <div className="mx-auto max-w-4xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-jade/30 bg-jade/10 px-4 py-1.5 text-sm text-jade mb-8">
            <Zap className="h-3.5 w-3.5" />
            중국 숏폼 → 한국 멀티채널 AI 자동화
          </div>

          <h1 className="font-heading text-6xl sm:text-7xl md:text-8xl leading-none mb-6">
            중국 바이럴
            <br />
            <span className="text-jade">AI 재창작</span>
            <br />
            자동 배포
          </h1>

          <p className="mx-auto max-w-2xl text-lg text-muted-foreground mb-10">
            도우인·샤오홍수의 바이럴 숏폼을 AI가 한국어로 재창작하고,
            유튜브 쇼츠·인스타·틱톡·네이버 블로그에 자동으로 배포합니다.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-jade px-8 py-3 text-base font-medium text-surface hover:bg-jade-600 transition-colors"
            >
              무료로 시작하기
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 rounded-md border border-border px-8 py-3 text-base font-medium hover:bg-muted transition-colors"
            >
              로그인
            </Link>
          </div>
        </div>
      </section>

      {/* 기능 카드 */}
      <section className="px-8 py-16 max-w-6xl mx-auto">
        <h2 className="font-heading text-4xl text-center mb-12">3개 수익 트랙</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {TRACKS.map(({ label, track, color, bgColor, desc, items }) => (
            <div
              key={track}
              className={`rounded-xl border ${bgColor} p-6 space-y-4`}
            >
              <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${color}`}>
                {label}
              </div>
              <p className="text-muted-foreground text-sm">{desc}</p>
              <ul className="space-y-2">
                {items.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm">
                    <div className="h-1.5 w-1.5 rounded-full bg-jade shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* AI 파이프라인 */}
      <section className="px-8 py-16 bg-surface-800/50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-heading text-4xl mb-4">완전 자동 AI 파이프라인</h2>
          <p className="text-muted-foreground mb-12">
            클릭 한 번으로 전체 워크플로우를 처리합니다
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {PIPELINE.map(({ icon: Icon, label }, i) => (
              <div key={label} className="flex items-center gap-2">
                <div className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm">
                  <Icon className="h-4 w-4 text-jade" />
                  {label}
                </div>
                {i < PIPELINE.length - 1 && (
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-8 py-24 text-center">
        <h2 className="font-heading text-5xl mb-4">지금 바로 시작하세요</h2>
        <p className="text-muted-foreground mb-8">무료 플랜으로 시작 · 언제든 업그레이드</p>
        <Link
          href="/signup"
          className="inline-flex items-center gap-2 rounded-md bg-jade px-10 py-4 text-lg font-medium text-surface hover:bg-jade-600 transition-colors"
        >
          무료 시작 <ArrowRight className="h-5 w-5" />
        </Link>
      </section>

      {/* 푸터 */}
      <footer className="border-t border-border px-8 py-6 text-center text-sm text-muted-foreground">
        © 2026 NOMAD Short Factory. All rights reserved.
      </footer>
    </main>
  );
}

const TRACKS = [
  {
    label: "Track A",
    track: "A",
    color: "bg-denim/20 text-denim border-denim/30",
    bgColor: "border-denim/20 bg-denim/5",
    desc: "중국 드라마 클립 → 한국 유튜브 쇼츠",
    items: [
      "Whisper STT (중국어 → 텍스트)",
      "Claude AI 대본 각색",
      "TTS + 자막 자동 생성",
      "YouTube Shorts 자동 업로드",
    ],
  },
  {
    label: "Track B",
    track: "B",
    color: "bg-amber/20 text-amber border-amber/30",
    bgColor: "border-amber/20 bg-amber/5",
    desc: "중국 쇼핑 리뷰 → 커머스 전환",
    items: [
      "쇼핑 리뷰 위트 각색",
      "네이버쇼핑 커넥트 연동",
      "쿠팡 파트너스 링크 삽입",
      "CPS 수익 자동 집계",
    ],
  },
  {
    label: "Track D",
    track: "D",
    color: "bg-jade/20 text-jade border-jade/30",
    bgColor: "border-jade/20 bg-jade/5",
    desc: "영상 대본 → 네이버 블로그 자동 등록",
    items: [
      "SEO 최적화 블로그 생성",
      "Playwright 자동 등록",
      "커머스 링크 자동 삽입",
      "네이버 검색 트래픽 확보",
    ],
  },
];

const PIPELINE = [
  { icon: TrendingUp, label: "바이럴 발굴" },
  { icon: Bot,        label: "Whisper STT" },
  { icon: Bot,        label: "Claude 각색" },
  { icon: Globe,      label: "TTS 합성" },
  { icon: Zap,        label: "렌더링" },
  { icon: Send,       label: "자동 배포" },
];

function Send(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>
    </svg>
  );
}
