import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button, Input, Label, Select, Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/index.tsx';
import { Wand2, Search, Link as LinkIcon, Loader2, Play, ShoppingBag, CheckCircle2, Settings2, Info } from 'lucide-react';
import { saveProject } from '../../lib/actions/index.ts';

const createSchema = z.object({
  contentType: z.string().min(1, { message: "콘텐츠 타입을 선택해주세요." }),
  shoppingMethod: z.enum(["douyin", "image_slide"]).optional(),
  
  mainTab: z.enum(["video", "product"]),
  sourceType: z.enum(["url", "search"]).optional(),
  videoUrl: z.string().optional(),
  platform: z.enum(["douyin", "tiktok", "xiaohongshu"]).optional(),
  searchKeyword: z.string().optional(),
  minViews: z.coerce.number().min(0).optional(),
  minLikes: z.coerce.number().min(0).optional(),
  productPlatform: z.enum(["coupang", "naver_brand"]).optional(),
  productKeyword: z.string().optional(),
  
  // 영상 설정 필드
  targetFormat: z.enum(["16:9", "9:16"], { required_error: "타겟 포맷을 선택해주세요." }),
  targetLength: z.string().min(1, { message: "타겟 길이를 선택해주세요." }),
  resolution: z.string().min(1, { message: "출력 해상도를 선택해주세요." }),
  translationTone: z.string().min(1, { message: "번역 및 톤앤매너를 선택해주세요." }),
  ttsActor: z.string().optional(),
  bgmOption: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.sourceType === 'url' && (!data.videoUrl || !data.videoUrl.startsWith('http'))) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "유효한 URL을 입력해주세요.", path: ["videoUrl"] });
  }
  if (data.sourceType === 'search' && !data.searchKeyword) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "검색어를 입력해주세요.", path: ["searchKeyword"] });
  }
  if (data.contentType === '쇼핑쇼츠-시세차익용' && !data.shoppingMethod) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "쇼핑 쇼츠 제작 방식을 선택해주세요.", path: ["shoppingMethod"] });
  }
});

type CreateFormValues = z.infer<typeof createSchema>;

const CreateForm: React.FC = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [videoResults, setVideoResults] = useState<any[]>([]);
  const [productResults, setProductResults] = useState<any[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      contentType: '중국드라마',
      shoppingMethod: 'douyin',
      mainTab: 'video',
      sourceType: 'search',
      platform: 'douyin',
      videoUrl: '',
      searchKeyword: '',
      minViews: 6000,
      minLikes: 300,
      productPlatform: 'coupang',
      productKeyword: '',
      targetFormat: '16:9',
      targetLength: '원본 영상의 길이',
      resolution: '720p',
      translationTone: '한국어-사이다/정보형 각색',
      ttsActor: 'random',
      bgmOption: 'random_suno',
    }
  });

  // 컴포넌트 마운트 시 localStorage에서 기본 영상 설정 불러오기
  useEffect(() => {
    const savedSettingsStr = localStorage.getItem('nomad-ai-settings');
    if (savedSettingsStr) {
      try {
        const savedSettings = JSON.parse(savedSettingsStr);
        if (savedSettings.video) {
          if (savedSettings.video.targetLength) setValue('targetLength', savedSettings.video.targetLength);
          if (savedSettings.video.resolution) setValue('resolution', savedSettings.video.resolution);
          if (savedSettings.video.translationTone) setValue('translationTone', savedSettings.video.translationTone);
          if (savedSettings.video.targetFormat) setValue('targetFormat', savedSettings.video.targetFormat as any);
          if (savedSettings.video.ttsActor) setValue('ttsActor', savedSettings.video.ttsActor);
          if (savedSettings.video.bgmOption) setValue('bgmOption', savedSettings.video.bgmOption);
        }
      } catch (e) {
        console.error("Failed to parse saved settings", e);
      }
    }
    setIsLoaded(true);
  }, [setValue]);

  const contentType = watch('contentType');
  const mainTab = watch('mainTab');
  const sourceType = watch('sourceType');
  
  // 영상 설정 필드 감시
  const targetLength = watch('targetLength');
  const resolution = watch('resolution');
  const translationTone = watch('translationTone');
  const targetFormat = watch('targetFormat');
  const ttsActor = watch('ttsActor');
  const bgmOption = watch('bgmOption');

  // 영상 설정 변경 시 localStorage에 자동 동기화
  useEffect(() => {
    if (!isLoaded) return;
    
    const savedSettingsStr = localStorage.getItem('nomad-ai-settings');
    const savedSettings = savedSettingsStr ? JSON.parse(savedSettingsStr) : { video: {} };
    
    let changed = false;
    if (savedSettings.video?.targetLength !== targetLength) changed = true;
    if (savedSettings.video?.resolution !== resolution) changed = true;
    if (savedSettings.video?.translationTone !== translationTone) changed = true;
    if (savedSettings.video?.targetFormat !== targetFormat) changed = true;
    if (savedSettings.video?.ttsActor !== ttsActor) changed = true;
    if (savedSettings.video?.bgmOption !== bgmOption) changed = true;

    if (changed) {
      savedSettings.video = {
        ...savedSettings.video,
        targetLength,
        resolution,
        translationTone,
        targetFormat,
        ttsActor,
        bgmOption
      };
      localStorage.setItem('nomad-ai-settings', JSON.stringify(savedSettings));
    }
  }, [targetLength, resolution, translationTone, targetFormat, ttsActor, bgmOption, isLoaded]);

  // 가상의 검색 로직
  const handleSearch = async () => {
    setIsSearching(true);
    setSelectedItemId(null);
    await new Promise(resolve => setTimeout(resolve, 1500)); // 1.5초 대기
    
    if (mainTab === 'video') {
      // 영상 검색 결과 목업 (10개)
      const mocks = Array.from({ length: 10 }).map((_, i) => ({
        id: `vid_${i}`,
        title: `[${watch('platform')}] 인기 급상승 영상 ${i + 1}`,
        thumbnail: `https://picsum.photos/seed/vid${i}/300/400`,
        views: Math.floor(Math.random() * 50000) + 6000,
        likes: Math.floor(Math.random() * 5000) + 300,
      }));
      setVideoResults(mocks);
    } else {
      // 상품 검색 결과 목업 (10개)
      const mocks = Array.from({ length: 10 }).map((_, i) => ({
        id: `prod_${i}`,
        title: `[${watch('productPlatform') === 'coupang' ? '로켓배송' : '브랜드'}] 추천 상품 ${i + 1}`,
        thumbnail: `https://picsum.photos/seed/prod${i}/300/300`,
        price: Math.floor(Math.random() * 50000) + 10000,
        margin: Math.floor(Math.random() * 15000) + 2000,
      }));
      setProductResults(mocks);
    }
    setIsSearching(false);
  };

  const onSubmit = async (data: CreateFormValues) => {
    if (data.sourceType === 'search' && !selectedItemId) {
      alert('검색 결과에서 처리할 항목을 선택해주세요.');
      return;
    }

    try {
      setIsSubmitting(true);
      
      const payload = {
        ...data,
        selectedItemId,
      };

      // Server Action 호출 (시뮬레이션)
      const result = await saveProject(payload);
      
      if (result.success) {
        console.log("=== 최종 생성된 AI 대본 ===");
        console.log(result.script);
        console.log("=== 최종 렌더링된 영상 URL ===");
        console.log(result.data?.result_url);
        
        if (result.affiliateLinks && result.affiliateLinks.length > 0) {
          console.log("=== 매칭된 커머스 시세차익 상품 ===");
          console.table(result.affiliateLinks);
        }
        
        console.log("=== GEO 최적화 블로그 원고 ===");
        console.log(result.blogPost);

        alert('🎉 파이프라인 처리가 완료되었습니다!\n\n(F12 개발자 도구 콘솔에서 상세 로그와 결과물을 확인하세요)');
      } else {
        alert(result.error || '오류가 발생했습니다.');
      }
    } catch (error) {
      console.error(error);
      alert('예기치 못한 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      
      {/* 1. 최상단: 콘텐츠 타입 (프로젝트 목적) */}
      <div className="space-y-4 p-5 rounded-lg border border-border bg-card/50">
        <div className="space-y-2">
          <Label htmlFor="contentType" className="text-sm font-semibold">콘텐츠 타입 (프로젝트 목적)</Label>
          <Select id="contentType" {...register("contentType")} className={errors.contentType ? "border-destructive" : ""}>
            <option value="중국드라마">중국드라마</option>
            <option value="해외인기쇼츠">해외인기쇼츠</option>
            <option value="쇼핑쇼츠-시세차익용">쇼핑쇼츠-시세차익용</option>
            <option value="타임랩스">타임랩스</option>
            <option value="ASMR">ASMR</option>
            <option value="인터뷰하는 강아지">인터뷰하는 강아지</option>
          </Select>
          {errors.contentType && <p className="text-xs text-destructive">{errors.contentType.message}</p>}
        </div>

        {/* 쇼핑쇼츠 선택 시 추가 옵션 */}
        {contentType === '쇼핑쇼츠-시세차익용' && (
          <div className="pt-4 border-t border-border space-y-4 animate-in fade-in">
            <div className="space-y-3">
              <Label className="text-sm font-medium">쇼핑 쇼츠 제작 방식</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className={`flex items-start space-x-3 cursor-pointer p-4 rounded-md border transition-colors ${watch('shoppingMethod') === 'douyin' ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'}`}>
                  <input type="radio" value="douyin" {...register("shoppingMethod")} className="accent-primary w-4 h-4 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">도우인(Douyin) 영상 활용</p>
                    <p className="text-xs text-muted-foreground mt-1">중국 플랫폼의 원본 영상을 가져와 리뷰/더빙 형태로 가공합니다.</p>
                  </div>
                </label>
                <label className={`flex items-start space-x-3 cursor-pointer p-4 rounded-md border transition-colors ${watch('shoppingMethod') === 'image_slide' ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'}`}>
                  <input type="radio" value="image_slide" {...register("shoppingMethod")} className="accent-primary w-4 h-4 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">상세페이지 이미지 슬라이드</p>
                    <p className="text-xs text-muted-foreground mt-1">상품 상세페이지의 이미지를 추출하여 슬라이드쇼 형태의 숏폼을 생성합니다.</p>
                  </div>
                </label>
              </div>
              {errors.shoppingMethod && <p className="text-xs text-destructive">{errors.shoppingMethod.message}</p>}
            </div>
            
            <div className="p-3 bg-primary/10 text-primary rounded-md text-xs flex items-start">
              <Info className="w-4 h-4 mr-2 mt-0.5 shrink-0" />
              <p>쇼핑 쇼츠는 쿠팡 파트너스 및 네이버 브랜드 커넥트와 <strong>자동으로 상품 연동(시세차익 매칭)</strong>이 진행됩니다.</p>
            </div>
          </div>
        )}
      </div>

      {/* 2. 메인 탭 네비게이션 */}
      <div className="flex space-x-1 border-b border-border">
        <button
          type="button"
          onClick={() => { setValue('mainTab', 'video'); setVideoResults([]); setSelectedItemId(null); }}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center ${mainTab === 'video' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          <Play className="w-4 h-4 mr-2" />
          소스 영상 가져오기
        </button>
        <button
          type="button"
          onClick={() => { setValue('mainTab', 'product'); setProductResults([]); setSelectedItemId(null); }}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center ${mainTab === 'product' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          <ShoppingBag className="w-4 h-4 mr-2" />
          상품 검색
        </button>
      </div>

      {/* 탭 1: 소스 영상 가져오기 */}
      {mainTab === 'video' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="flex p-1 space-x-1 bg-muted/50 rounded-lg w-fit border border-border">
            <button 
              type="button" 
              onClick={() => setValue('sourceType', 'search')} 
              className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${sourceType === 'search' ? 'bg-background shadow-sm text-foreground border border-border/50' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Search className="w-4 h-4 mr-2" />
              플랫폼 검색
            </button>
            <button 
              type="button" 
              onClick={() => setValue('sourceType', 'url')} 
              className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${sourceType === 'url' ? 'bg-background shadow-sm text-foreground border border-border/50' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <LinkIcon className="w-4 h-4 mr-2" />
              URL 직접 입력
            </button>
          </div>

          {sourceType === 'search' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5 rounded-lg border border-border bg-card/50">
                <div className="space-y-3 md:col-span-2">
                  <Label className="text-sm">플랫폼 선택</Label>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input type="radio" value="douyin" {...register("platform")} className="accent-primary w-4 h-4" />
                      <span className="text-sm">도우인 (Douyin)</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input type="radio" value="tiktok" {...register("platform")} className="accent-primary w-4 h-4" />
                      <span className="text-sm">틱톡 글로벌 (TikTok)</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input type="radio" value="xiaohongshu" {...register("platform")} className="accent-primary w-4 h-4" />
                      <span className="text-sm">샤오홍슈 (Xiaohongshu)</span>
                    </label>
                  </div>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="searchKeyword" className="text-sm">검색 키워드</Label>
                  <div className="flex gap-2">
                    <Input id="searchKeyword" placeholder="예: 강아지 웃긴 영상" {...register("searchKeyword")} className="flex-1" />
                    <Button type="button" onClick={handleSearch} disabled={isSearching} variant="secondary">
                      {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="minViews" className="text-sm">최소 조회수 필터</Label>
                  <Input id="minViews" type="number" {...register("minViews")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="minLikes" className="text-sm">최소 좋아요(하트) 필터</Label>
                  <Input id="minLikes" type="number" {...register("minLikes")} />
                </div>
              </div>

              {/* 영상 검색 결과 그리드 */}
              {videoResults.length > 0 && (
                <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4">
                  <Label className="text-sm">검색 결과 ({videoResults.length}건)</Label>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {videoResults.map((video) => (
                      <div 
                        key={video.id} 
                        onClick={() => setSelectedItemId(video.id)}
                        className={`relative rounded-lg border overflow-hidden cursor-pointer transition-all hover:border-primary/50 ${selectedItemId === video.id ? 'ring-2 ring-primary border-primary' : 'border-border bg-card'}`}
                      >
                        <img src={video.thumbnail} alt={video.title} className="w-full aspect-[3/4] object-cover" />
                        <div className="p-3 space-y-1">
                          <p className="text-xs font-medium line-clamp-2 leading-tight">{video.title}</p>
                          <div className="flex justify-between text-[10px] text-muted-foreground">
                            <span>👁️ {video.views.toLocaleString()}</span>
                            <span>❤️ {video.likes.toLocaleString()}</span>
                          </div>
                        </div>
                        {selectedItemId === video.id && (
                          <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-0.5">
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {sourceType === 'url' && (
            <div className="space-y-2 p-5 rounded-lg border border-border bg-card/50">
              <Label htmlFor="videoUrl" className="text-sm">원본 영상 URL</Label>
              <Input 
                id="videoUrl" 
                placeholder="https://youtube.com/watch?v=..." 
                {...register("videoUrl")}
              />
            </div>
          )}
        </div>
      )}

      {/* 탭 2: 상품 검색 */}
      {mainTab === 'product' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="grid grid-cols-1 gap-4 p-5 rounded-lg border border-border bg-card/50">
            <div className="space-y-3">
              <Label className="text-sm">검색 플랫폼</Label>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input type="radio" value="coupang" {...register("productPlatform")} className="accent-primary w-4 h-4" />
                  <span className="text-sm">쿠팡 파트너스 상품</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input type="radio" value="naver_brand" {...register("productPlatform")} className="accent-primary w-4 h-4" />
                  <span className="text-sm">네이버 브랜드 커넥트 상품</span>
                </label>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="productKeyword" className="text-sm">상품 검색어</Label>
              <div className="flex gap-2">
                <Input id="productKeyword" placeholder="예: 무선 청소기" {...register("productKeyword")} className="flex-1" />
                <Button type="button" onClick={handleSearch} disabled={isSearching} variant="secondary">
                  {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>

          {/* 상품 검색 결과 그리드 */}
          {productResults.length > 0 && (
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4">
              <Label className="text-sm">검색 결과 ({productResults.length}건)</Label>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {productResults.map((prod) => (
                  <div 
                    key={prod.id} 
                    onClick={() => setSelectedItemId(prod.id)}
                    className={`relative rounded-lg border overflow-hidden cursor-pointer transition-all hover:border-primary/50 ${selectedItemId === prod.id ? 'ring-2 ring-primary border-primary' : 'border-border bg-card'}`}
                  >
                    <img src={prod.thumbnail} alt={prod.title} className="w-full aspect-square object-cover" />
                    <div className="p-3 space-y-1.5">
                      <p className="text-xs font-medium line-clamp-2 leading-tight">{prod.title}</p>
                      <p className="text-sm font-bold">₩{prod.price.toLocaleString()}</p>
                      <p className="text-[10px] text-green-500 font-medium">예상 마진: ₩{prod.margin.toLocaleString()}</p>
                    </div>
                    {selectedItemId === prod.id && (
                      <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-0.5">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <hr className="border-border" />

      {/* 3. 영상 변환 설정 (Card - 항상 열림) */}
      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center text-base">
                <Settings2 className="w-4 h-4 mr-2 text-primary" />
                영상 변환 설정
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                해상도, 타겟 길이, 톤앤매너 등을 설정합니다.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6 pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 타겟 길이 */}
            <div className="space-y-2">
              <Label htmlFor="targetLength" className="text-sm">타겟 길이</Label>
              <Select id="targetLength" {...register("targetLength")} className={errors.targetLength ? "border-destructive" : ""}>
                <option value="원본 영상의 길이">원본 영상의 길이</option>
                <option value="15초">15초</option>
                <option value="30초">30초</option>
                <option value="45초">45초</option>
                <option value="60초">60초</option>
              </Select>
              {errors.targetLength && <p className="text-xs text-destructive">{errors.targetLength.message}</p>}
            </div>

            {/* 출력 해상도 */}
            <div className="space-y-2">
              <Label htmlFor="resolution" className="text-sm">출력 해상도</Label>
              <Select id="resolution" {...register("resolution")} className={errors.resolution ? "border-destructive" : ""}>
                <option value="720p">720p</option>
                <option value="1080p">1080p</option>
              </Select>
              {errors.resolution && <p className="text-xs text-destructive">{errors.resolution.message}</p>}
            </div>

            {/* 번역 및 톤앤매너 */}
            <div className="space-y-2">
              <Label htmlFor="translationTone" className="text-sm">번역 및 톤앤매너</Label>
              <Select id="translationTone" {...register("translationTone")} className={errors.translationTone ? "border-destructive" : ""}>
                <option value="한국어-사이다/정보형 각색">한국어-사이다/정보형 각색</option>
                <option value="일본어-감성 독백형 각색">일본어-감성 독백형 각색</option>
              </Select>
              {errors.translationTone && <p className="text-xs text-destructive">{errors.translationTone.message}</p>}
            </div>

            {/* 타겟 포맷 (Select) */}
            <div className="space-y-2">
              <Label htmlFor="targetFormat" className="text-sm">타겟 포맷</Label>
              <Select id="targetFormat" {...register("targetFormat")} className={errors.targetFormat ? "border-destructive" : ""}>
                <option value="16:9">가로형 16:9</option>
                <option value="9:16">세로형 9:16</option>
              </Select>
              {errors.targetFormat && <p className="text-xs text-destructive">{errors.targetFormat.message}</p>}
            </div>
          </div>

          {/* 오디오 설정 (TTS 및 BGM) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-border">
            <div className="space-y-2">
              <Label className="text-sm">TTS 성우 선택</Label>
              <Select {...register("ttsActor")}>
                <option value="random">랜덤 배정</option>
                <option value="calm_male">차분한 남성</option>
                <option value="cheerful_female">발랄한 여성</option>
                <option value="trust_male">신뢰감 있는 남성</option>
                <option value="cute_child">귀여운 아이</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">배경음악(BGM) 선택</Label>
              <Select {...register("bgmOption")}>
                <option value="random_suno">업로드된 Suno 음원 랜덤 재생</option>
                <option value="none">사용 안함</option>
                <option value="calm_piano">잔잔한 피아노</option>
                <option value="trendy_beat">트렌디한 비트</option>
              </Select>
              <p className="text-[10px] text-muted-foreground mt-1">
                * 선택한 음원은 영상 길이에 맞게 자동으로 잘려서 삽입됩니다.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="pt-2 flex items-center justify-end">
        <Button type="submit" disabled={isSubmitting} className="w-full md:w-auto bg-primary text-primary-foreground hover:bg-primary/90">
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Wand2 className="w-4 h-4 mr-2" />
          )}
          {isSubmitting ? '파이프라인 처리 중...' : '영상 생성 시작'}
        </Button>
      </div>
    </form>
  );
};

export default CreateForm;