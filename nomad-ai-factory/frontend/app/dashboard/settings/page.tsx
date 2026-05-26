import React, { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button, Input, Label, Switch, Select, Textarea } from '../../../components/ui/index.tsx';
import { Key, Save, Settings2, UserCog } from 'lucide-react';

// Zod 스키마 정의 (API 설정 + 영상 설정 통합)
const settingsSchema = z.object({
  api: z.object({
    google: z.object({ enabled: z.boolean(), key: z.string().optional() }),
    openai: z.object({ enabled: z.boolean(), key: z.string().optional() }),
    anthropic: z.object({ enabled: z.boolean(), key: z.string().optional() }),
    elevenlabs: z.object({ enabled: z.boolean(), key: z.string().optional() }),
    typecast: z.object({ enabled: z.boolean(), key: z.string().optional() }),
    xiaohongshu: z.object({ enabled: z.boolean(), key: z.string().optional() }),
    douyin: z.object({ enabled: z.boolean(), key: z.string().optional() }),
    tiktok: z.object({ enabled: z.boolean(), key: z.string().optional() }),
    naver: z.object({ enabled: z.boolean(), clientId: z.string().optional(), clientSecret: z.string().optional() }),
    kakao: z.object({ enabled: z.boolean(), restApiKey: z.string().optional(), clientSecret: z.string().optional() }),
    coupang: z.object({ enabled: z.boolean(), accessKey: z.string().optional(), secretKey: z.string().optional() }),
    naverBrand: z.object({ enabled: z.boolean(), clientId: z.string().optional(), clientSecret: z.string().optional() }),
    amazon: z.object({ enabled: z.boolean(), accessKey: z.string().optional(), secretKey: z.string().optional() }),
    aliexpress: z.object({ enabled: z.boolean(), appKey: z.string().optional(), appSecret: z.string().optional() }),
  }),
  video: z.object({
    selectedApi: z.string().optional(),
    targetLength: z.string().optional(),
    resolution: z.string().optional(),
    translationTone: z.string().optional(),
    targetFormat: z.string().optional(),
    prompt: z.string().optional(),
    template: z.string().optional(),
    ttsActor: z.string().optional(),
    bgmOption: z.string().optional(),
  })
}).superRefine((data, ctx) => {
  // 단일 API 키 유효성 검사
  const checkSimpleKey = (provider: keyof typeof data.api) => {
    const p = data.api[provider] as any;
    if (p.enabled && (!p.key || p.key.trim() === '')) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "API 키를 입력해주세요.", path: ["api", provider, "key"] });
    }
  };
  ['google', 'openai', 'anthropic', 'elevenlabs', 'typecast', 'xiaohongshu', 'douyin', 'tiktok'].forEach(p => checkSimpleKey(p as any));

  // 복합 API 키 유효성 검사
  const checkComplexKey = (provider: string, key1: string, key2: string, label1: string, label2: string) => {
    const p = data.api[provider as keyof typeof data.api] as any;
    if (p.enabled) {
      if (!p[key1]?.trim()) ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${label1}를 입력해주세요.`, path: ["api", provider, key1] });
      if (!p[key2]?.trim()) ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${label2}를 입력해주세요.`, path: ["api", provider, key2] });
    }
  };

  checkComplexKey('naver', 'clientId', 'clientSecret', 'Client ID', 'Client Secret');
  checkComplexKey('kakao', 'restApiKey', 'clientSecret', 'REST API 키', 'Client Secret');
  checkComplexKey('coupang', 'accessKey', 'secretKey', 'Access Key', 'Secret Key');
  checkComplexKey('naverBrand', 'clientId', 'clientSecret', 'Client ID', 'Client Secret');
  checkComplexKey('amazon', 'accessKey', 'secretKey', 'Access Key', 'Secret Key');
  checkComplexKey('aliexpress', 'appKey', 'appSecret', 'App Key', 'App Secret');
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

const defaultValues: SettingsFormValues = {
  api: {
    google: { enabled: false, key: '' },
    openai: { enabled: false, key: '' },
    anthropic: { enabled: false, key: '' },
    elevenlabs: { enabled: false, key: '' },
    typecast: { enabled: false, key: '' },
    xiaohongshu: { enabled: false, key: '' },
    douyin: { enabled: false, key: '' },
    tiktok: { enabled: false, key: '' },
    naver: { enabled: false, clientId: '', clientSecret: '' },
    kakao: { enabled: false, restApiKey: '', clientSecret: '' },
    coupang: { enabled: false, accessKey: '', secretKey: '' },
    naverBrand: { enabled: false, clientId: '', clientSecret: '' },
    amazon: { enabled: false, accessKey: '', secretKey: '' },
    aliexpress: { enabled: false, appKey: '', appSecret: '' },
  },
  video: {
    selectedApi: 'google',
    targetLength: '원본 영상의 길이',
    resolution: '720p',
    translationTone: '한국어-사이다/정보형 각색',
    targetFormat: '16:9',
    prompt: '',
    template: '',
    ttsActor: 'random',
    bgmOption: 'random_suno',
  }
};

const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'account' | 'api' | 'video'>('account');

  const { control, handleSubmit, watch, setValue, reset, register, formState: { errors, isSubmitting } } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues
  });

  useEffect(() => {
    const saved = localStorage.getItem('nomad-ai-settings');
    if (saved) {
      try {
        reset(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse saved settings");
      }
    }
  }, [reset]);

  const onSubmit = (data: SettingsFormValues) => {
    localStorage.setItem('nomad-ai-settings', JSON.stringify(data));
    alert('설정이 성공적으로 저장되었습니다.');
  };

  const renderSimpleApiSection = (name: keyof SettingsFormValues['api'], title: string, description: string) => {
    const isEnabled = watch(`api.${name}.enabled`);
    const error = (errors.api as any)?.[name]?.key;

    return (
      <div className={`p-4 rounded-lg border transition-colors ${isEnabled ? 'bg-card border-primary/50' : 'bg-muted/10 border-border'} text-card-foreground space-y-4`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">{title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          </div>
          <Controller
            control={control}
            name={`api.${name}.enabled`}
            render={({ field }) => (
              <Switch
                checked={field.value}
                onCheckedChange={(checked) => {
                  field.onChange(checked);
                  if (!checked) setValue(`api.${name}.key` as any, '');
                }}
              />
            )}
          />
        </div>
        
        {isEnabled && (
          <div className="pt-2 animate-in fade-in slide-in-from-top-2 duration-200">
            <Label className="sr-only">{title} Key</Label>
            <Controller
              control={control}
              name={`api.${name}.key` as any}
              render={({ field }) => (
                <Input
                  type="password"
                  placeholder={`${title}를 입력하세요`}
                  {...field}
                  value={field.value || ''}
                  className={error ? "border-destructive focus-visible:ring-destructive" : ""}
                />
              )}
            />
            {error && <p className="text-xs text-destructive mt-1.5">{error.message}</p>}
          </div>
        )}
      </div>
    );
  };

  const renderComplexApiSection = (
    name: 'naver' | 'kakao' | 'coupang' | 'naverBrand' | 'amazon' | 'aliexpress', 
    title: string, 
    description: string, 
    key1Label: string, 
    key1Name: string, 
    key2Label: string, 
    key2Name: string
  ) => {
    const isEnabled = watch(`api.${name}.enabled`);
    const error1 = (errors.api as any)?.[name]?.[key1Name];
    const error2 = (errors.api as any)?.[name]?.[key2Name];

    return (
      <div className={`p-4 rounded-lg border transition-colors ${isEnabled ? 'bg-card border-primary/50' : 'bg-muted/10 border-border'} text-card-foreground space-y-4`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">{title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          </div>
          <Controller
            control={control}
            name={`api.${name}.enabled`}
            render={({ field }) => (
              <Switch
                checked={field.value}
                onCheckedChange={(checked) => {
                  field.onChange(checked);
                  if (!checked) {
                    setValue(`api.${name}.${key1Name}` as any, '');
                    setValue(`api.${name}.${key2Name}` as any, '');
                  }
                }}
              />
            )}
          />
        </div>
        
        {isEnabled && (
          <div className="pt-2 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">{key1Label}</Label>
              <Controller
                control={control}
                name={`api.${name}.${key1Name}` as any}
                render={({ field }) => (
                  <Input type="password" placeholder={`${key1Label} 입력`} {...field} value={field.value || ''} className={error1 ? "border-destructive" : ""} />
                )}
              />
              {error1 && <p className="text-xs text-destructive mt-1.5">{error1.message}</p>}
            </div>
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">{key2Label}</Label>
              <Controller
                control={control}
                name={`api.${name}.${key2Name}` as any}
                render={({ field }) => (
                  <Input type="password" placeholder={`${key2Label} 입력`} {...field} value={field.value || ''} className={error2 ? "border-destructive" : ""} />
                )}
              />
              {error2 && <p className="text-xs text-destructive mt-1.5">{error2.message}</p>}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-3xl pb-20">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">설정</h1>
        <p className="text-sm text-muted-foreground mt-1">플랫폼 연동 및 기본 영상 변환 설정을 관리합니다.</p>
      </div>

      {/* 탭 네비게이션 */}
      <div className="flex space-x-1 border-b border-border">
        <button
          type="button"
          onClick={() => setActiveTab('account')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'account' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          계정 설정
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('api')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'api' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          API 설정
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('video')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'video' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          영상 설정
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        
        {/* 계정 설정 탭 */}
        <div className={activeTab === 'account' ? 'block space-y-4' : 'hidden'}>
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <UserCog className="w-4 h-4 mr-2 text-primary" />
                계정 연동 설정
              </CardTitle>
              <CardDescription className="text-xs">
                소셜 로그인 및 외부 커머스 플랫폼 연동을 위한 계정 정보를 관리합니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {renderComplexApiSection('naver', '네이버 (Naver) 로그인 API', '네이버 소셜 로그인 연동에 사용됩니다.', 'Client ID', 'clientId', 'Client Secret', 'clientSecret')}
              {renderComplexApiSection('kakao', '카카오 (Kakao) API', '카카오 플랫폼 연동에 사용됩니다. (보안 탭에서 Secret 활성화 필수)', 'REST API Key', 'restApiKey', 'Client Secret', 'clientSecret')}
              {renderComplexApiSection('coupang', '쿠팡 파트너스 API', '쿠팡 제휴 상품 검색 및 시세차익 매칭에 사용됩니다.', 'Access Key', 'accessKey', 'Secret Key', 'secretKey')}
              {renderComplexApiSection('naverBrand', '네이버 브랜드 커넥트 API', '네이버 커머스 상품 검색 및 매칭에 사용됩니다.', 'Client ID', 'clientId', 'Client Secret', 'clientSecret')}
              {renderComplexApiSection('amazon', '아마존 어소시에이트 API', '아마존 글로벌 제휴 상품 검색에 사용됩니다.', 'Access Key', 'accessKey', 'Secret Key', 'secretKey')}
              {renderComplexApiSection('aliexpress', '알리익스프레스 어필리에이트 API', '알리익스프레스 제휴 상품 검색에 사용됩니다.', 'App Key', 'appKey', 'App Secret', 'appSecret')}
            </CardContent>
          </Card>
        </div>

        {/* API 설정 탭 */}
        <div className={activeTab === 'api' ? 'block space-y-4' : 'hidden'}>
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <Key className="w-4 h-4 mr-2 text-primary" />
                API 키 관리
              </CardTitle>
              <CardDescription className="text-xs">
                각 서비스의 API 키를 입력하고 활성화하세요. 키는 브라우저에 안전하게 저장됩니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {renderSimpleApiSection('google', 'Google Gemini API', '텍스트 분석 및 대본 생성에 사용됩니다.')}
              {renderSimpleApiSection('openai', 'OpenAI API', 'GPT 모델 및 추가 텍스트 처리에 사용됩니다.')}
              {renderSimpleApiSection('anthropic', 'Anthropic API', 'Claude 모델을 활용한 고급 추론에 사용됩니다.')}
              {renderSimpleApiSection('elevenlabs', 'ElevenLabs API', '고품질 AI 음성(TTS) 생성에 사용됩니다.')}
              {renderSimpleApiSection('typecast', 'Typecast API', 'AI 음성 더빙 및 아바타 생성에 사용됩니다.')}
              {renderSimpleApiSection('douyin', '도우인 (Douyin) API', '도우인 플랫폼 데이터 검색 및 연동에 사용됩니다.')}
              {renderSimpleApiSection('tiktok', '틱톡 글로벌 (TikTok) API', '틱톡 플랫폼 데이터 검색 및 연동에 사용됩니다.')}
              {renderSimpleApiSection('xiaohongshu', '샤오홍슈 (Xiaohongshu) API', '샤오홍슈 플랫폼 데이터 검색 및 연동에 사용됩니다.')}
            </CardContent>
          </Card>
        </div>

        {/* 영상 설정 탭 */}
        <div className={activeTab === 'video' ? 'block space-y-4' : 'hidden'}>
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <Settings2 className="w-4 h-4 mr-2 text-primary" />
                기본 영상 변환 설정
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                영상 생성 시 기본으로 적용될 파라미터와 프롬프트를 설정합니다.
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6 pt-0">
              
              {/* 프롬프트 및 템플릿 설정 */}
              <div className="space-y-4 p-4 bg-muted/10 rounded-lg border border-border">
                <div className="space-y-2">
                  <Label className="text-sm">기본 프롬프트 (System Prompt)</Label>
                  <Textarea 
                    {...register("video.prompt")} 
                    placeholder="AI 대본 생성 시 기본으로 적용될 프롬프트를 입력하세요."
                    className="min-h-[80px] text-xs"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">기본 템플릿 (Template)</Label>
                  <Textarea 
                    {...register("video.template")} 
                    placeholder="대본의 기본 구조나 템플릿 양식을 입력하세요."
                    className="min-h-[80px] text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-sm">사용할 AI 모델 (대본 생성용)</Label>
                  <Select {...register("video.selectedApi")}>
                    <option value="google">Google Gemini 1.5 Pro</option>
                    <option value="openai">OpenAI GPT-4o</option>
                    <option value="anthropic">Anthropic Claude 3.5 Sonnet</option>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">기본 타겟 길이</Label>
                  <Select {...register("video.targetLength")}>
                    <option value="원본 영상의 길이">원본 영상의 길이</option>
                    <option value="15초">15초</option>
                    <option value="30초">30초</option>
                    <option value="45초">45초</option>
                    <option value="60초">60초</option>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">기본 출력 해상도</Label>
                  <Select {...register("video.resolution")}>
                    <option value="720p">720p</option>
                    <option value="1080p">1080p</option>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">기본 번역 및 톤앤매너</Label>
                  <Select {...register("video.translationTone")}>
                    <option value="한국어-사이다/정보형 각색">한국어-사이다/정보형 각색</option>
                    <option value="일본어-감성 독백형 각색">일본어-감성 독백형 각색</option>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">기본 타겟 포맷</Label>
                  <Select {...register("video.targetFormat")}>
                    <option value="16:9">가로형 16:9</option>
                    <option value="9:16">세로형 9:16</option>
                  </Select>
                </div>
              </div>

              {/* 오디오 설정 (TTS 및 BGM) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-border">
                <div className="space-y-2">
                  <Label className="text-sm">TTS 성우 선택</Label>
                  <Select {...register("video.ttsActor")}>
                    <option value="random">랜덤 배정</option>
                    <option value="calm_male">차분한 남성</option>
                    <option value="cheerful_female">발랄한 여성</option>
                    <option value="trust_male">신뢰감 있는 남성</option>
                    <option value="cute_child">귀여운 아이</option>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">배경음악(BGM) 선택</Label>
                  <Select {...register("video.bgmOption")}>
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
        </div>

        {/* 하단 고정 저장 버튼 */}
        <div className="fixed bottom-0 left-0 right-0 md:left-64 p-4 bg-background/80 backdrop-blur-md border-t border-border flex justify-end z-10">
          <Button type="submit" disabled={isSubmitting} className="w-full md:w-auto bg-primary text-primary-foreground hover:bg-primary/90">
            <Save className="w-4 h-4 mr-2" />
            모든 설정 저장
          </Button>
        </div>
      </form>
    </div>
  );
};

export default SettingsPage;