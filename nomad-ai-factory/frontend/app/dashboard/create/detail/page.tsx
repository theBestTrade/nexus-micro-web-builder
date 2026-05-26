import React, { useState } from 'react';
import {
  FileText, Zap, Copy, Check, Globe, ChevronDown,
  Sparkles, Tag, AlignLeft, Image, Star, ShoppingCart,
  RefreshCw, Download, ExternalLink,
} from 'lucide-react';
import { Label, Input, Select, Textarea, Button } from '../../../../components/ui/index.tsx';

// ────────────────────────────────────────────────────────────────────────────
// 타입 & 데이터
// ────────────────────────────────────────────────────────────────────────────
const CHANNELS = [
  { value: 'coupang',      label: '쿠팡' },
  { value: 'smartstore',   label: '네이버 스마트스토어' },
  { value: '11st',         label: '11번가' },
  { value: 'gmarket',      label: 'G마켓' },
  { value: 'auction',      label: '옥션' },
  { value: 'amazon_kr',    label: 'Amazon KR' },
];

const TONES = [
  { value: 'benefit',  label: '혜택 강조형 (쿠팡 스타일)' },
  { value: 'premium',  label: '프리미엄 감성형' },
  { value: 'spec',     label: '스펙 비교형 (정보 중심)' },
  { value: 'review',   label: '후기 공감형 (스토리텔링)' },
  { value: 'seo',      label: 'SEO 최적화형 (검색 노출)' },
];

const AI_MODELS = [
  { value: 'gemini',    label: 'Google Gemini 2.5 Flash (권장)' },
  { value: 'gpt4o',     label: 'OpenAI GPT-4o' },
  { value: 'claude',    label: 'Anthropic Claude 3.5 Sonnet' },
];

// 샘플 결과물 (생성 시뮬레이션)
const SAMPLE_RESULT = {
  title: '[미국 직구] Apple MacBook Air M3 15인치 — 가성비 최강 울트라씬 노트북',
  subtitle: '✈️ 미국 직배송 | 🎁 정품 박스 포함 | 🔒 AS 보장',
  description: `✅ 왜 이 제품인가요?

애플 최신 M3 칩셋을 탑재한 맥북 에어 15인치는 국내 정가 대비 약 25% 저렴하게 미국 직구로 만나볼 수 있습니다. 15인치 대화면과 18시간 배터리, 그리고 놀라운 성능으로 재택근무·영상편집·코딩 모두를 한 기기로 해결하세요.

📦 제품 주요 사양
• 칩셋: Apple M3 (8코어 CPU / 10코어 GPU)
• 디스플레이: 15.3인치 Liquid Retina (2880×1864, 224ppi)
• 메모리: 8GB 통합 메모리
• 저장 공간: 256GB SSD
• 배터리: 최대 18시간 사용
• 무게: 1.51kg (초경량)

💡 이런 분께 추천드려요
✔ 가성비 있는 고성능 노트북을 찾으시는 분
✔ 배터리 걱정 없이 외부 작업이 많으신 분
✔ 유튜브 편집·디자인 작업을 자주 하시는 분
✔ 애플 생태계(아이폰·아이패드)를 사용 중이신 분

🚀 미국 직구 구매 안내
• 배송 기간: 미국 발송 후 5~10일 소요
• 관세: 목록통관 기준 ($150 이하 면세)
• AS: 애플코리아 공식 서비스 가능 (시리얼 번호 기준)

⭐ 구매 고객 후기
"국내보다 30만원 이상 저렴하게 샀어요. 박스 상태도 완벽하고 정품 확인도 됩니다. 적극 추천!" — 실구매자 리뷰`,

  seoTags: ['맥북에어', '맥북에어M3', '미국직구노트북', 'MacBookAir', '애플노트북', '15인치노트북', '가성비노트북', '미국직구'],
  hashtags: '#맥북에어 #미국직구 #맥북에어M3 #가성비노트북 #애플노트북 #직구추천',
};

// ────────────────────────────────────────────────────────────────────────────
// 메인 컴포넌트
// ────────────────────────────────────────────────────────────────────────────
const DetailPageCreator: React.FC = () => {
  const [url,       setUrl]       = useState('');
  const [channel,   setChannel]   = useState('coupang');
  const [tone,      setTone]      = useState('benefit');
  const [model,     setModel]     = useState('gemini');
  const [keywords,  setKeywords]  = useState('');
  const [isGen,     setIsGen]     = useState(false);
  const [result,    setResult]    = useState<typeof SAMPLE_RESULT | null>(null);
  const [copied,    setCopied]    = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'description' | 'seo' | 'preview'>('description');

  const handleGenerate = async () => {
    if (!url.trim()) { alert('상품 URL을 입력해주세요.'); return; }
    setIsGen(true);
    setResult(null);
    await new Promise(r => setTimeout(r, 2200));
    setResult(SAMPLE_RESULT);
    setIsGen(false);
    setActiveTab('description');
  };

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const CopyBtn = ({ id, text }: { id: string; text: string }) => (
    <button
      onClick={() => handleCopy(id, text)}
      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
        copied === id ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
      }`}
    >
      {copied === id ? <><Check className="w-3 h-3" />복사됨</> : <><Copy className="w-3 h-3" />복사</>}
    </button>
  );

  return (
    <div className="space-y-5 animate-in fade-in duration-300 max-w-5xl">

      {/* ── 헤더 ── */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <FileText className="w-5 h-5 text-blue-600" />
          <h1 className="text-[18px] font-bold text-slate-900 tracking-tight">상세페이지 제작</h1>
        </div>
        <p className="text-[12px] text-slate-500">
          Amazon·eBay 상품 URL을 입력하면 AI가 채널 맞춤 한국어 상품 상세페이지를 자동 생성합니다.
        </p>
      </div>

      {/* ── 입력 폼 ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-100">
          <Globe className="w-4 h-4 text-blue-600" />
          <h2 className="text-[14px] font-semibold text-slate-800">소싱 정보 입력</h2>
        </div>

        <div className="p-5 space-y-4">
          {/* URL 입력 */}
          <div className="space-y-1.5">
            <Label className="text-[12px] font-semibold text-slate-700">상품 URL *</Label>
            <div className="flex gap-2">
              <Input
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://www.amazon.com/dp/... 또는 eBay, Walmart URL 입력"
                className="flex-1 text-sm border-slate-200"
              />
            </div>
            <p className="text-[10px] text-slate-400">Amazon, eBay, Walmart, Costco US 등 지원</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* 판매 채널 */}
            <div className="space-y-1.5">
              <Label className="text-[12px] font-semibold text-slate-700">판매 채널</Label>
              <Select value={channel} onChange={e => setChannel(e.target.value)} className="text-sm border-slate-200">
                {CHANNELS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </Select>
            </div>

            {/* 문구 톤 */}
            <div className="space-y-1.5">
              <Label className="text-[12px] font-semibold text-slate-700">문구 스타일</Label>
              <Select value={tone} onChange={e => setTone(e.target.value)} className="text-sm border-slate-200">
                {TONES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </Select>
            </div>

            {/* AI 모델 */}
            <div className="space-y-1.5">
              <Label className="text-[12px] font-semibold text-slate-700">AI 모델</Label>
              <Select value={model} onChange={e => setModel(e.target.value)} className="text-sm border-slate-200">
                {AI_MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </Select>
            </div>
          </div>

          {/* 추가 키워드 */}
          <div className="space-y-1.5">
            <Label className="text-[12px] font-semibold text-slate-700">강조 키워드 (선택)</Label>
            <Input
              value={keywords}
              onChange={e => setKeywords(e.target.value)}
              placeholder="예: 미국 직구, 최저가, 정품 보증, 빠른 배송"
              className="text-sm border-slate-200"
            />
            <p className="text-[10px] text-slate-400">콤마로 구분. AI가 설명에 자연스럽게 녹여줍니다.</p>
          </div>

          {/* 생성 버튼 */}
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={handleGenerate}
              disabled={isGen}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[13px] font-semibold transition-all ${
                isGen
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-500 shadow-sm shadow-blue-600/30'
              }`}
            >
              {isGen ? (
                <><RefreshCw className="w-4 h-4 animate-spin" />AI 생성 중...</>
              ) : (
                <><Sparkles className="w-4 h-4" />상세페이지 자동 생성</>
              )}
            </button>
            {result && (
              <p className="text-[11px] text-emerald-600 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />생성 완료! 아래에서 확인하세요.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── 생성 결과 ── */}
      {result && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-400">
          {/* 탭 */}
          <div className="flex items-center border-b border-slate-100 px-5">
            {([
              { id: 'description', label: '📝 상품 설명', icon: AlignLeft },
              { id: 'seo',         label: '🔍 SEO / 태그', icon: Tag       },
              { id: 'preview',     label: '👁️ 미리보기',   icon: Star      },
            ] as const).map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-[12px] font-semibold border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-5">

            {/* 상품 설명 탭 */}
            {activeTab === 'description' && (
              <div className="space-y-4">
                {/* 제목 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-[12px] font-semibold text-slate-700">🏷️ 상품명 (제목)</Label>
                    <CopyBtn id="title" text={result.title} />
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-[14px] font-bold text-slate-900 leading-relaxed">{result.title}</p>
                    <p className="text-[11px] text-slate-500 mt-1">{result.subtitle}</p>
                  </div>
                </div>

                {/* 본문 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-[12px] font-semibold text-slate-700">📄 상세 설명</Label>
                    <CopyBtn id="desc" text={result.description} />
                  </div>
                  <Textarea
                    value={result.description}
                    readOnly
                    className="min-h-[320px] text-xs font-mono bg-slate-50 border-slate-200 resize-none leading-relaxed"
                  />
                </div>

                {/* 액션 */}
                <div className="flex flex-wrap gap-2">
                  <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 text-white text-[12px] font-semibold hover:bg-emerald-500 transition-colors">
                    <ShoppingCart className="w-3.5 h-3.5" />
                    {CHANNELS.find(c => c.value === channel)?.label} 바로 등록
                  </button>
                  <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-slate-600 text-[12px] font-semibold hover:bg-slate-50 transition-colors">
                    <Download className="w-3.5 h-3.5" />
                    TXT 다운로드
                  </button>
                  <button
                    onClick={handleGenerate}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-blue-200 text-blue-600 text-[12px] font-semibold hover:bg-blue-50 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    재생성
                  </button>
                </div>
              </div>
            )}

            {/* SEO 탭 */}
            {activeTab === 'seo' && (
              <div className="space-y-5">
                {/* 검색 태그 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-[12px] font-semibold text-slate-700">🏷️ SEO 키워드 태그</Label>
                    <CopyBtn id="tags" text={result.seoTags.join(', ')} />
                  </div>
                  <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200 min-h-[60px]">
                    {result.seoTags.map(tag => (
                      <span key={tag} className="px-2.5 py-1 bg-blue-100 text-blue-700 text-[11px] font-semibold rounded-full">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* SNS 해시태그 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-[12px] font-semibold text-slate-700">📱 SNS 해시태그</Label>
                    <CopyBtn id="hashtag" text={result.hashtags} />
                  </div>
                  <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                    <p className="text-[12px] text-indigo-700 leading-relaxed">{result.hashtags}</p>
                  </div>
                </div>

                {/* 채널별 글자수 가이드 */}
                <div className="space-y-2">
                  <Label className="text-[12px] font-semibold text-slate-700">📊 채널별 제목 최적화 분석</Label>
                  <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 overflow-hidden">
                    {[
                      { channel: '쿠팡',       max: 100, used: result.title.length, color: 'blue'    },
                      { channel: '스마트스토어', max: 100, used: result.title.length, color: 'emerald' },
                      { channel: '11번가',     max: 80,  used: Math.min(result.title.length, 80), color: 'orange' },
                      { channel: 'G마켓',      max: 80,  used: Math.min(result.title.length, 80), color: 'red'    },
                    ].map(ch => {
                      const pct = Math.round((ch.used / ch.max) * 100);
                      return (
                        <div key={ch.channel} className="flex items-center gap-3 px-4 py-2.5 bg-white">
                          <span className="text-[11px] font-semibold text-slate-600 w-24 shrink-0">{ch.channel}</span>
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full bg-${ch.color}-500 rounded-full`} style={{ width: `${Math.min(pct, 100)}%` }} />
                          </div>
                          <span className="text-[10px] text-slate-500 shrink-0">{ch.used}/{ch.max}자</span>
                          {ch.used > ch.max
                            ? <span className="text-[9px] text-red-500 font-bold">초과</span>
                            : <span className="text-[9px] text-emerald-600 font-bold">적합</span>
                          }
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* 미리보기 탭 */}
            {activeTab === 'preview' && (
              <div className="space-y-4">
                <p className="text-[11px] text-slate-500">
                  실제 {CHANNELS.find(c => c.value === channel)?.label} 등록 시 표시될 화면 미리보기입니다.
                </p>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  {/* 채널 헤더 모킹 */}
                  <div className="bg-blue-600 px-4 py-2.5 flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-white/30" />
                    <span className="text-[11px] text-white font-bold">{CHANNELS.find(c => c.value === channel)?.label} 상품 등록 미리보기</span>
                  </div>
                  {/* 상품 상세 모킹 */}
                  <div className="p-5 bg-white space-y-4">
                    {/* 이미지 플레이스홀더 */}
                    <div className="w-full h-40 bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <Image className="w-8 h-8 text-slate-300 mx-auto mb-1" />
                        <p className="text-[10px] text-slate-400">상품 이미지 (Amazon에서 자동 수집)</p>
                      </div>
                    </div>
                    {/* 제목 */}
                    <div>
                      <p className="text-[14px] font-bold text-slate-900 leading-snug">{result.title}</p>
                      <p className="text-[11px] text-slate-500 mt-1">{result.subtitle}</p>
                    </div>
                    {/* 가격 플레이스홀더 */}
                    <div className="flex items-end gap-2">
                      <span className="text-[22px] font-bold text-blue-700">₩2,190,000</span>
                      <span className="text-[12px] text-slate-400 line-through mb-1">₩2,680,000</span>
                      <span className="text-[11px] font-bold text-red-500 mb-1">18% 할인</span>
                    </div>
                    {/* 설명 요약 */}
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-[11px] text-slate-600 leading-relaxed line-clamp-4">
                      {result.description.substring(0, 200)}...
                    </div>
                    {/* 태그 */}
                    <div className="flex flex-wrap gap-1">
                      {result.seoTags.slice(0, 5).map(t => (
                        <span key={t} className="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">#{t}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* 미생성 시 가이드 카드 */}
      {!result && !isGen && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100 p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-[22px] shrink-0">
              🤖
            </div>
            <div>
              <p className="text-[14px] font-bold text-slate-900 mb-1">AI가 이렇게 도와드려요</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                {[
                  '영문 상품명 → 한국어 판매 제목 자동 변환',
                  '채널별 최적 글자수 & 키워드 배치',
                  '스펙·특장점·구매 이유 설명 자동 작성',
                  'SEO 태그 + SNS 해시태그 동시 생성',
                  '쿠팡·스마트스토어·11번가 맞춤 문체',
                  '미국 직구 안내 문구 자동 포함',
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-[11px] text-slate-700">
                    <div className="w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5 text-white" />
                    </div>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default DetailPageCreator;
