import React, { useEffect, useRef, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
  Button, Input, Label, Switch, Select, Textarea,
} from '../ui/index.tsx';
import { Key, Save, Settings2, UserCog, X, Settings } from 'lucide-react';

// ─── Zod 스키마 ───────────────────────────────────────────────────────────────
const settingsSchema = z.object({
  api: z.object({
    google:       z.object({ enabled: z.boolean(), key: z.string().optional() }),
    openai:       z.object({ enabled: z.boolean(), key: z.string().optional() }),
    anthropic:    z.object({ enabled: z.boolean(), key: z.string().optional() }),
    elevenlabs:   z.object({ enabled: z.boolean(), key: z.string().optional() }),
    typecast:     z.object({ enabled: z.boolean(), key: z.string().optional() }),
    xiaohongshu:  z.object({ enabled: z.boolean(), key: z.string().optional() }),
    douyin:       z.object({ enabled: z.boolean(), key: z.string().optional() }),
    tiktok:       z.object({ enabled: z.boolean(), key: z.string().optional() }),
    naver:        z.object({ enabled: z.boolean(), clientId: z.string().optional(), clientSecret: z.string().optional() }),
    kakao:        z.object({ enabled: z.boolean(), restApiKey: z.string().optional(), clientSecret: z.string().optional() }),
    coupang:      z.object({ enabled: z.boolean(), accessKey: z.string().optional(), secretKey: z.string().optional() }),
    naverBrand:   z.object({ enabled: z.boolean(), clientId: z.string().optional(), clientSecret: z.string().optional() }),
    amazon:       z.object({ enabled: z.boolean(), accessKey: z.string().optional(), secretKey: z.string().optional() }),
    aliexpress:   z.object({ enabled: z.boolean(), appKey: z.string().optional(), appSecret: z.string().optional() }),
  }),
  video: z.object({
    selectedApi:      z.string().optional(),
    targetLength:     z.string().optional(),
    resolution:       z.string().optional(),
    translationTone:  z.string().optional(),
    targetFormat:     z.string().optional(),
    prompt:           z.string().optional(),
    template:         z.string().optional(),
    ttsActor:         z.string().optional(),
    bgmOption:        z.string().optional(),
  }),
}).superRefine((data, ctx) => {
  const checkSimpleKey = (provider: keyof typeof data.api) => {
    const p = data.api[provider] as any;
    if (p.enabled && (!p.key || p.key.trim() === '')) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'API 키를 입력해주세요.', path: ['api', provider, 'key'] });
    }
  };
  ['google','openai','anthropic','elevenlabs','typecast','xiaohongshu','douyin','tiktok'].forEach(p => checkSimpleKey(p as any));

  const checkComplexKey = (provider: string, key1: string, key2: string, label1: string, label2: string) => {
    const p = data.api[provider as keyof typeof data.api] as any;
    if (p.enabled) {
      if (!p[key1]?.trim()) ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${label1}를 입력해주세요.`, path: ['api', provider, key1] });
      if (!p[key2]?.trim()) ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${label2}를 입력해주세요.`, path: ['api', provider, key2] });
    }
  };
  checkComplexKey('naver',      'clientId',   'clientSecret', 'Client ID',   'Client Secret');
  checkComplexKey('kakao',      'restApiKey', 'clientSecret', 'REST API 키', 'Client Secret');
  checkComplexKey('coupang',    'accessKey',  'secretKey',    'Access Key',  'Secret Key');
  checkComplexKey('naverBrand', 'clientId',   'clientSecret', 'Client ID',   'Client Secret');
  checkComplexKey('amazon',     'accessKey',  'secretKey',    'Access Key',  'Secret Key');
  checkComplexKey('aliexpress', 'appKey',     'appSecret',    'App Key',     'App Secret');
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

const defaultValues: SettingsFormValues = {
  api: {
    google:      { enabled: false, key: '' },
    openai:      { enabled: false, key: '' },
    anthropic:   { enabled: false, key: '' },
    elevenlabs:  { enabled: false, key: '' },
    typecast:    { enabled: false, key: '' },
    xiaohongshu: { enabled: false, key: '' },
    douyin:      { enabled: false, key: '' },
    tiktok:      { enabled: false, key: '' },
    naver:       { enabled: false, clientId: '', clientSecret: '' },
    kakao:       { enabled: false, restApiKey: '', clientSecret: '' },
    coupang:     { enabled: false, accessKey: '', secretKey: '' },
    naverBrand:  { enabled: false, clientId: '', clientSecret: '' },
    amazon:      { enabled: false, accessKey: '', secretKey: '' },
    aliexpress:  { enabled: false, appKey: '', appSecret: '' },
  },
  video: {
    selectedApi:     'google',
    targetLength:    '원본 영상의 길이',
    resolution:      '720p',
    translationTone: '한국어-사이다/정보형 각색',
    targetFormat:    '16:9',
    prompt:          '',
    template:        '',
    ttsActor:        'random',
    bgmOption:       'random_suno',
  },
};

// ─── Props ────────────────────────────────────────────────────────────────────
interface SettingsModalProps {
  onClose: () => void;
}

// ─── 메인 컴포넌트 ─────────────────────────────────────────────────────────────
const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'account' | 'api' | 'video'>('account');
  const overlayRef = useRef<HTMLDivElement>(null);

  const {
    control, handleSubmit, watch, setValue, reset, register,
    formState: { errors, isSubmitting },
  } = useForm<SettingsFormValues>({ resolver: zodResolver(settingsSchema), defaultValues });

  // 저장된 설정 불러오기
  useEffect(() => {
    const saved = localStorage.getItem('nomad-ai-settings');
    if (saved) {
      try { reset(JSON.parse(saved)); } catch { /* ignore */ }
    }
  }, [reset]);

  // ESC 키로 닫기 + 스크롤 잠금
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  // 오버레이 클릭으로 닫기
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  const onSubmit = (data: SettingsFormValues) => {
    localStorage.setItem('nomad-ai-settings', JSON.stringify(data));
    alert('설정이 성공적으로 저장되었습니다.');
    onClose();
  };

  // ── 단순 API 섹션 렌더러 ──────────────────────────────────────────────────
  const renderSimpleApiSection = (
    name: keyof SettingsFormValues['api'],
    title: string,
    description: string,
  ) => {
    const isEnabled = watch(`api.${name}.enabled`);
    const error = (errors.api as any)?.[name]?.key;

    return (
      <div
        key={name}
        className={`p-4 rounded-lg border transition-colors space-y-4 ${
          isEnabled ? 'bg-white border-blue-300' : 'bg-slate-50 border-slate-200'
        }`}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-800">{title}</p>
            <p className="text-xs text-slate-500 mt-0.5">{description}</p>
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
            <Controller
              control={control}
              name={`api.${name}.key` as any}
              render={({ field }) => (
                <Input
                  type="password"
                  placeholder={`${title} 키를 입력하세요`}
                  {...field}
                  value={field.value || ''}
                  className={error ? 'border-red-400 focus-visible:ring-red-400' : ''}
                />
              )}
            />
            {error && <p className="text-xs text-red-500 mt-1.5">{error.message}</p>}
          </div>
        )}
      </div>
    );
  };

  // ── 복합 API 섹션 렌더러 ──────────────────────────────────────────────────
  const renderComplexApiSection = (
    name: 'naver' | 'kakao' | 'coupang' | 'naverBrand' | 'amazon' | 'aliexpress',
    title: string,
    description: string,
    key1Label: string, key1Name: string,
    key2Label: string, key2Name: string,
  ) => {
    const isEnabled = watch(`api.${name}.enabled`);
    const error1 = (errors.api as any)?.[name]?.[key1Name];
    const error2 = (errors.api as any)?.[name]?.[key2Name];

    return (
      <div
        key={name}
        className={`p-4 rounded-lg border transition-colors space-y-4 ${
          isEnabled ? 'bg-white border-blue-300' : 'bg-slate-50 border-slate-200'
        }`}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-800">{title}</p>
            <p className="text-xs text-slate-500 mt-0.5">{description}</p>
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
              <Label className="mb-1.5 block text-xs text-slate-500">{key1Label}</Label>
              <Controller
                control={control}
                name={`api.${name}.${key1Name}` as any}
                render={({ field }) => (
                  <Input type="password" placeholder={`${key1Label} 입력`} {...field} value={field.value || ''} className={error1 ? 'border-red-400' : ''} />
                )}
              />
              {error1 && <p className="text-xs text-red-500 mt-1.5">{error1.message}</p>}
            </div>
            <div>
              <Label className="mb-1.5 block text-xs text-slate-500">{key2Label}</Label>
              <Controller
                control={control}
                name={`api.${name}.${key2Name}` as any}
                render={({ field }) => (
                  <Input type="password" placeholder={`${key2Label} 입력`} {...field} value={field.value || ''} className={error2 ? 'border-red-400' : ''} />
                )}
              />
              {error2 && <p className="text-xs text-red-500 mt-1.5">{error2.message}</p>}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── 탭 버튼 ───────────────────────────────────────────────────────────────
  const TabBtn = ({ id, label }: { id: 'account' | 'api' | 'video'; label: string }) => (
    <button
      type="button"
      onClick={() => setActiveTab(id)}
      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
        activeTab === id
          ? 'border-blue-600 text-blue-600'
          : 'border-transparent text-slate-500 hover:text-slate-800'
      }`}
    >
      {label}
    </button>
  );

  // ─────────────────────────────────────────────────────────────────────────
  return (
    /* ── 오버레이 ──────────────────────────────────────────────────────────── */
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 bg-slate-900/60 modal-backdrop flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      {/* ── 모달 패널 ────────────────────────────────────────────────────── */}
      <div className="
        relative w-full max-w-2xl max-h-[90vh]
        bg-white rounded-2xl shadow-2xl
        animate-in zoom-in-95 duration-200
        flex flex-col overflow-hidden
      ">
        {/* 상단 그라디언트 띠 */}
        <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 shrink-0" />

        {/* ── 헤더 ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm shadow-blue-600/30">
              <Settings className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <h2 className="text-[16px] font-bold text-slate-900 tracking-tight">설정</h2>
              <p className="text-[11px] text-slate-400">플랫폼 연동 및 기본 영상 변환 설정</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── 탭 ───────────────────────────────────────────────────────── */}
        <div className="flex border-b border-slate-100 px-6 shrink-0 overflow-x-auto">
          <TabBtn id="account" label="계정 설정" />
          <TabBtn id="api"     label="API 설정" />
          <TabBtn id="video"   label="영상 설정" />
        </div>

        {/* ── 폼 콘텐츠 (스크롤) ───────────────────────────────────────── */}
        <form
          id="settings-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex-1 overflow-y-auto px-6 py-5 space-y-4"
        >
          {/* 계정 설정 탭 */}
          <div className={activeTab === 'account' ? 'block space-y-4' : 'hidden'}>
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="flex items-center text-base">
                  <UserCog className="w-4 h-4 mr-2 text-blue-600" />
                  계정 연동 설정
                </CardTitle>
                <CardDescription className="text-xs">
                  소셜 로그인 및 외부 커머스 플랫폼 연동을 위한 계정 정보를 관리합니다.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {renderComplexApiSection('naver',      '네이버 (Naver) 로그인 API', '네이버 소셜 로그인 연동에 사용됩니다.',                        'Client ID',   'clientId',   'Client Secret', 'clientSecret')}
                {renderComplexApiSection('kakao',      '카카오 (Kakao) API',         '카카오 플랫폼 연동에 사용됩니다.',                             'REST API Key','restApiKey', 'Client Secret', 'clientSecret')}
                {renderComplexApiSection('coupang',    '쿠팡 파트너스 API',          '쿠팡 제휴 상품 검색 및 시세차익 매칭에 사용됩니다.',           'Access Key',  'accessKey',  'Secret Key',    'secretKey')}
                {renderComplexApiSection('naverBrand', '네이버 브랜드 커넥트 API',   '네이버 커머스 상품 검색 및 매칭에 사용됩니다.',                 'Client ID',   'clientId',   'Client Secret', 'clientSecret')}
                {renderComplexApiSection('amazon',     '아마존 어소시에이트 API',    '아마존 글로벌 제휴 상품 검색에 사용됩니다.',                    'Access Key',  'accessKey',  'Secret Key',    'secretKey')}
                {renderComplexApiSection('aliexpress', '알리익스프레스 어필리에이트 API', '알리익스프레스 제휴 상품 검색에 사용됩니다.',              'App Key',     'appKey',     'App Secret',    'appSecret')}
              </CardContent>
            </Card>
          </div>

          {/* API 설정 탭 */}
          <div className={activeTab === 'api' ? 'block space-y-4' : 'hidden'}>
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="flex items-center text-base">
                  <Key className="w-4 h-4 mr-2 text-blue-600" />
                  API 키 관리
                </CardTitle>
                <CardDescription className="text-xs">
                  각 서비스의 API 키를 입력하고 활성화하세요. 키는 브라우저에 안전하게 저장됩니다.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {renderSimpleApiSection('google',      'Google Gemini API',              '텍스트 분석 및 대본 생성에 사용됩니다.')}
                {renderSimpleApiSection('openai',      'OpenAI API',                     'GPT 모델 및 추가 텍스트 처리에 사용됩니다.')}
                {renderSimpleApiSection('anthropic',   'Anthropic API',                  'Claude 모델을 활용한 고급 추론에 사용됩니다.')}
                {renderSimpleApiSection('elevenlabs',  'ElevenLabs API',                 '고품질 AI 음성(TTS) 생성에 사용됩니다.')}
                {renderSimpleApiSection('typecast',    'Typecast API',                   'AI 음성 더빙 및 아바타 생성에 사용됩니다.')}
                {renderSimpleApiSection('douyin',      '도우인 (Douyin) API',             '도우인 플랫폼 데이터 검색 및 연동에 사용됩니다.')}
                {renderSimpleApiSection('tiktok',      '틱톡 글로벌 (TikTok) API',        '틱톡 플랫폼 데이터 검색 및 연동에 사용됩니다.')}
                {renderSimpleApiSection('xiaohongshu', '샤오홍슈 (Xiaohongshu) API',      '샤오홍슈 플랫폼 데이터 검색 및 연동에 사용됩니다.')}
              </CardContent>
            </Card>
          </div>

          {/* 영상 설정 탭 */}
          <div className={activeTab === 'video' ? 'block space-y-4' : 'hidden'}>
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="flex items-center text-base">
                  <Settings2 className="w-4 h-4 mr-2 text-blue-600" />
                  기본 영상 변환 설정
                </CardTitle>
                <CardDescription className="text-xs">
                  영상 생성 시 기본으로 적용될 파라미터와 프롬프트를 설정합니다.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* 프롬프트 & 템플릿 */}
                <div className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">기본 프롬프트 (System Prompt)</Label>
                    <Textarea
                      {...register('video.prompt')}
                      placeholder="AI 대본 생성 시 기본으로 적용될 프롬프트를 입력하세요."
                      className="min-h-[72px] text-xs"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">기본 템플릿 (Template)</Label>
                    <Textarea
                      {...register('video.template')}
                      placeholder="대본의 기본 구조나 템플릿 양식을 입력하세요."
                      className="min-h-[72px] text-xs"
                    />
                  </div>
                </div>

                {/* 파라미터 그리드 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm">사용할 AI 모델 (대본 생성용)</Label>
                    <Select {...register('video.selectedApi')}>
                      <option value="google">Google Gemini 1.5 Pro</option>
                      <option value="openai">OpenAI GPT-4o</option>
                      <option value="anthropic">Anthropic Claude 3.5 Sonnet</option>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">기본 타겟 길이</Label>
                    <Select {...register('video.targetLength')}>
                      <option value="원본 영상의 길이">원본 영상의 길이</option>
                      <option value="15초">15초</option>
                      <option value="30초">30초</option>
                      <option value="45초">45초</option>
                      <option value="60초">60초</option>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">기본 출력 해상도</Label>
                    <Select {...register('video.resolution')}>
                      <option value="720p">720p</option>
                      <option value="1080p">1080p</option>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">기본 번역 및 톤앤매너</Label>
                    <Select {...register('video.translationTone')}>
                      <option value="한국어-사이다/정보형 각색">한국어 — 사이다/정보형 각색</option>
                      <option value="일본어-감성 독백형 각색">일본어 — 감성 독백형 각색</option>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">기본 타겟 포맷</Label>
                    <Select {...register('video.targetFormat')}>
                      <option value="16:9">가로형 16:9</option>
                      <option value="9:16">세로형 9:16</option>
                    </Select>
                  </div>
                </div>

                {/* 오디오 설정 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-200">
                  <div className="space-y-1.5">
                    <Label className="text-sm">TTS 성우 선택</Label>
                    <Select {...register('video.ttsActor')}>
                      <option value="random">랜덤 배정</option>
                      <option value="calm_male">차분한 남성</option>
                      <option value="cheerful_female">발랄한 여성</option>
                      <option value="trust_male">신뢰감 있는 남성</option>
                      <option value="cute_child">귀여운 아이</option>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">배경음악(BGM) 선택</Label>
                    <Select {...register('video.bgmOption')}>
                      <option value="random_suno">Suno 음원 랜덤 재생</option>
                      <option value="none">사용 안함</option>
                      <option value="calm_piano">잔잔한 피아노</option>
                      <option value="trendy_beat">트렌디한 비트</option>
                    </Select>
                    <p className="text-[10px] text-slate-400">* 음원은 영상 길이에 맞게 자동으로 잘려 삽입됩니다.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </form>

        {/* ── 하단 푸터 (저장 버튼) ──────────────────────────────────────── */}
        <div className="shrink-0 flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
          >
            취소
          </button>
          <Button
            type="submit"
            form="settings-form"
            disabled={isSubmitting}
            className="bg-blue-600 text-white hover:bg-blue-500 px-5"
          >
            <Save className="w-4 h-4 mr-2" />
            모든 설정 저장
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
