import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button, Textarea, Label } from '../../../components/ui/index.tsx';
import { FileVideo, ShoppingBag, FileText, Copy, Check, ExternalLink, Sparkles, Tag } from 'lucide-react';

// 가상의 결과 데이터 (확장됨)
const mockResultData = {
  video: {
    url: "https://www.w3schools.com/html/mov_bbb.mp4", // 샘플 비디오
    format: "9:16",
    resolution: "1080p"
  },
  commerce: [
    {
      id: 1,
      name: "[가성비 갑] 2024년형 최신 무선 로봇청소기",
      price: 299000,
      margin: 15000,
      platform: "쿠팡 파트너스",
      link: "https://coupa.ng/mock_link_1"
    },
    {
      id: 2,
      name: "[프리미엄] 전문가용 무선 로봇청소기 PRO",
      price: 599000,
      margin: 45000,
      platform: "네이버 브랜드 커넥트",
      link: "https://search.shopping.naver.com/mock_link_2"
    },
    {
      id: 3,
      name: "스마트홈 연동 로봇청소기 먼지비움 스테이션 포함",
      price: 359000,
      margin: 21000,
      platform: "아마존 어소시에이트",
      link: "https://amzn.to/mock_link_3"
    },
    {
      id: 4,
      name: "초경량 슬림형 로봇청소기 (원룸 추천)",
      price: 129000,
      margin: 8000,
      platform: "알리익스프레스",
      link: "https://s.click.aliexpress.com/e/mock_link_4"
    },
    {
      id: 5,
      name: "물걸레 전용 로봇청소기 듀얼스핀",
      price: 199000,
      margin: 12000,
      platform: "쿠팡 파트너스",
      link: "https://coupa.ng/mock_link_5"
    }
  ],
  geo: {
    suggestedTitles: [
      "2024년 로봇청소기 추천! 바쁜 직장인을 위한 필수템",
      "가성비 vs 프리미엄 로봇청소기 완벽 비교 분석",
      "삶의 질 수직 상승! 나에게 맞는 로봇청소기 고르는 법"
    ],
    suggestedTags: ["#로봇청소기추천", "#가성비로봇청소기", "#자취생필수템", "#스마트홈", "#내돈내산리뷰"]
  },
  blogContents: [
    `## 버전 1: 직관적이고 빠른 정보 전달형

바쁜 아침, 청소할 시간이 없으신가요?
안녕하세요! 오늘은 바쁜 현대인과 자취생들의 삶의 질을 수직 상승시켜줄 **로봇청소기**를 리뷰해보려고 합니다. 매일 퇴근하고 집에 오면 쌓여있는 먼지... 이제 직접 청소기 돌리지 마세요!

### 1. 가성비 모델 특징
첫 번째로 소개할 제품은 20만원대 가성비 끝판왕 모델입니다. 
- 강력한 흡입력 (5000Pa)
- 스마트 맵핑 기능
- 물걸레 청소 동시 지원

### 2. 프리미엄 모델 특징
두 번째는 완벽한 청소를 원하는 분들을 위한 프리미엄 PRO 모델입니다.
- 자동 먼지 비움 스테이션
- AI 장애물 회피 시스템
- 듀얼 스핀 물걸레

여러분의 라이프스타일과 예산에 맞춰 현명한 선택하시길 바랍니다. 아래 링크에서 최저가로 만나보세요!

---
*본 포스팅은 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.*`,
    
    `## 버전 2: 감성적이고 스토리텔링 중심형

퇴근 후 지친 몸을 이끌고 집에 돌아왔을 때, 깨끗한 바닥이 나를 반겨준다면 어떨까요?
우리의 소중한 저녁 시간을 지켜줄 마법 같은 아이템, 바로 로봇청소기입니다.

처음엔 '과연 깨끗하게 청소가 될까?' 반신반의했지만, 이제는 없어서는 안 될 저의 룸메이트가 되었습니다. 
특히 반려동물과 함께 생활하시는 분들이라면 매일 뿜어져 나오는 털 스트레스에서 완벽하게 해방되실 수 있어요.

제가 직접 사용해보고 꼼꼼하게 고른 두 가지 모델을 소개합니다.
하나는 합리적인 가격에 꼭 필요한 기능만 담은 알짜배기 모델이고, 다른 하나는 청소의 처음부터 끝까지 완벽하게 책임지는 프리미엄 모델입니다.

나를 위한 작은 사치, 지금 바로 경험해보세요.

---
*본 포스팅은 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.*`,

    `## 버전 3: 상세한 스펙 비교 및 분석형

2024년 상반기 로봇청소기 시장 트렌드 및 스펙 전격 비교!
수많은 브랜드와 모델 속에서 어떤 제품을 선택해야 할지 고민이신 분들을 위해 준비했습니다.

### 핵심 스펙 비교 포인트
1. **흡입력 (Pa)**: 최소 4000Pa 이상을 권장합니다.
2. **센서 기술**: LDS 라이다 센서 + dToF 센서 조합이 가장 정확한 맵핑을 자랑합니다.
3. **스테이션 유무**: 자동 먼지 비움과 걸레 세척 기능은 편의성을 극대화합니다.

### 추천 모델 A (가성비)
- 흡입력: 5000Pa
- 센서: LDS 라이다
- 특장점: 20만원대의 놀라운 가격 접근성

### 추천 모델 B (하이엔드)
- 흡입력: 8000Pa
- 센서: dToF + AI 카메라
- 특장점: 올인원 스테이션 (먼지비움+걸레세척+열풍건조)

자세한 스펙과 실사용 후기는 아래 링크를 통해 확인하실 수 있습니다.

---
*본 포스팅은 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.*`
  ]
};

const ResultsPage: React.FC = () => {
  // isLoading 상태 제거 — 인위적 1500ms 대기가 무한로딩처럼 느껴지는 문제 해결
  const [isCopied, setIsCopied] = useState(false);
  const [activeBlogTab, setActiveBlogTab] = useState(0);
  const [blogTexts, setBlogTexts] = useState(mockResultData.blogContents);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(blogTexts[activeBlogTab]);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
      alert('복사에 실패했습니다.');
    }
  };

  // 현재 텍스트의 줄 수를 계산하여 textarea의 rows 속성에 동적으로 할당
  const currentTextLines = blogTexts[activeBlogTab].split('\n').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">결과물 보관함</h1>
        <p className="text-sm text-muted-foreground mt-1">생성된 영상, 수익화 링크, GEO 최적화 블로그 원고를 확인하고 활용하세요.</p>
      </div>
      
      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* 1. 영상 플레이어 (좌측 상단) */}
        <Card className="md:col-span-1 border-border bg-card flex flex-col">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center text-lg">
              <FileVideo className="w-4 h-4 mr-2 text-primary" />
              최종 렌더링 영상
            </CardTitle>
            <CardDescription className="text-xs">
              {mockResultData.video.format} 비율 | {mockResultData.video.resolution}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex items-center justify-center bg-muted/10 p-4 rounded-b-xl">
            <div className="relative w-full max-w-[240px] aspect-[9/16] bg-black rounded-lg overflow-hidden shadow-md border border-border/50">
              <video 
                src={mockResultData.video.url} 
                controls 
                className="w-full h-full object-cover"
                poster="https://picsum.photos/seed/poster/400/700"
              />
            </div>
          </CardContent>
        </Card>

        {/* 2. 커머스 시세차익 매칭 (우측 상단) */}
        <Card className="md:col-span-2 border-border bg-card flex flex-col">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center text-lg">
              <ShoppingBag className="w-4 h-4 mr-2 text-primary" />
              수익화 상품 매칭 결과
            </CardTitle>
            <CardDescription className="text-xs">
              대본 키워드 기반으로 추출된 고마진 제휴 링크입니다. (총 5개)
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 space-y-3 overflow-y-auto max-h-[450px] pr-2">
            {mockResultData.commerce.map((item) => (
              <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border border-border bg-muted/5 hover:bg-muted/20 transition-colors gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-primary/10 text-primary">
                      {item.platform}
                    </span>
                  </div>
                  <a href={item.link} target="_blank" rel="noreferrer" className="text-sm font-semibold text-foreground line-clamp-1 hover:text-primary hover:underline cursor-pointer transition-colors">
                    {item.name}
                  </a>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-muted-foreground">판매가: {item.price.toLocaleString()}원</span>
                    <span className="font-medium text-green-500">예상 마진: +{item.margin.toLocaleString()}원</span>
                  </div>
                </div>
                <Button variant="secondary" size="sm" className="shrink-0" onClick={() => window.open(item.link, '_blank')}>
                  <ExternalLink className="w-3 h-3 mr-2" />
                  링크 복사
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* 3. GEO 최적화 블로그 원고 (하단 전체) */}
        <Card className="md:col-span-3 border-border bg-card">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center text-lg">
                  <FileText className="w-4 h-4 mr-2 text-primary" />
                  GEO 최적화 블로그 원고
                </CardTitle>
                <CardDescription className="text-xs mt-1">
                  AI가 검색 엔진 및 생성형 AI 검색에 최적화하여 작성한 포스팅입니다.
                </CardDescription>
              </div>
              <Button onClick={handleCopy} variant={isCopied ? "default" : "secondary"} size="sm" className="transition-all">
                {isCopied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                {isCopied ? '복사 완료!' : '현재 버전 복사'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* AI 추천 제목 및 태그 블록 */}
            <div className="p-4 rounded-lg border border-primary/20 bg-primary/5 space-y-4">
              <div className="flex items-center text-primary font-semibold text-sm">
                <Sparkles className="w-4 h-4 mr-1.5" />
                AI 추천 메타데이터
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">최적화 제목 추천 (H1)</Label>
                <ul className="list-disc list-inside text-sm font-medium text-foreground pl-1 space-y-1.5">
                  {mockResultData.geo.suggestedTitles.map((title, idx) => (
                    <li key={idx} className="leading-relaxed">{title}</li>
                  ))}
                </ul>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">추천 해시태그</Label>
                <div className="flex flex-wrap gap-1.5">
                  {mockResultData.geo.suggestedTags.map((tag, idx) => (
                    <span key={idx} className="inline-flex items-center px-2 py-1 rounded-md bg-background border border-border text-[10px] font-medium text-muted-foreground">
                      <Tag className="w-3 h-3 mr-1 opacity-70" />
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* 마크다운 에디터 영역 (탭 포함) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">본문 내용 (Markdown)</Label>
                <div className="flex space-x-1 bg-muted/30 p-1 rounded-lg border border-border">
                  {blogTexts.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveBlogTab(idx)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${activeBlogTab === idx ? 'bg-background shadow-sm text-foreground border border-border/50' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      버전 {idx + 1}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* rows 속성을 동적으로 할당하여 전체 내용이 스크롤 없이 보이도록 설정 */}
              <Textarea 
                value={blogTexts[activeBlogTab]}
                onChange={(e) => {
                  const newTexts = [...blogTexts];
                  newTexts[activeBlogTab] = e.target.value;
                  setBlogTexts(newTexts);
                }}
                rows={Math.max(15, currentTextLines + 1)}
                className="w-full font-mono text-sm leading-relaxed resize-none bg-muted/5 p-4 overflow-hidden"
              />
            </div>

          </CardContent>
        </Card>

      </div>
    </div>
  );
};

export default ResultsPage;