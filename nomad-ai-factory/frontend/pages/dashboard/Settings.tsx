import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button, Input, Label, Switch } from '../../components/ui.tsx';
import { Key, Save } from 'lucide-react';

// Zod 스키마 정의
const apiSchema = z.object({
  google: z.object({ enabled: z.boolean(), key: z.string().optional() }),
  openai: z.object({ enabled: z.boolean(), key: z.string().optional() }),
  anthropic: z.object({ enabled: z.boolean(), key: z.string().optional() }),
  elevenlabs: z.object({ enabled: z.boolean(), key: z.string().optional() }),
  typecast: z.object({ enabled: z.boolean(), key: z.string().optional() }),
}).superRefine((data, ctx) => {
  if (data.google.enabled && (!data.google.key || data.google.key.trim() === '')) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "API 키를 입력해주세요.", path: ["google", "key"] });
  }
  if (data.openai.enabled && (!data.openai.key || data.openai.key.trim() === '')) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "API 키를 입력해주세요.", path: ["openai", "key"] });
  }
  if (data.anthropic.enabled && (!data.anthropic.key || data.anthropic.key.trim() === '')) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "API 키를 입력해주세요.", path: ["anthropic", "key"] });
  }
  if (data.elevenlabs.enabled && (!data.elevenlabs.key || data.elevenlabs.key.trim() === '')) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "API 키를 입력해주세요.", path: ["elevenlabs", "key"] });
  }
  if (data.typecast.enabled && (!data.typecast.key || data.typecast.key.trim() === '')) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "API 키를 입력해주세요.", path: ["typecast", "key"] });
  }
});

type ApiFormValues = z.infer<typeof apiSchema>;

const defaultValues: ApiFormValues = {
  google: { enabled: false, key: '' },
  openai: { enabled: false, key: '' },
  anthropic: { enabled: false, key: '' },
  elevenlabs: { enabled: false, key: '' },
  typecast: { enabled: false, key: '' },
};

const Settings: React.FC = () => {
  const { control, handleSubmit, watch, setValue, reset, formState: { errors, isSubmitting } } = useForm<ApiFormValues>({
    resolver: zodResolver(apiSchema),
    defaultValues
  });

  // 컴포넌트 마운트 시 Local Storage에서 데이터 불러오기
  useEffect(() => {
    const saved = localStorage.getItem('ai-studio-api-keys');
    if (saved) {
      try {
        reset(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse saved API keys");
      }
    }
  }, [reset]);

  // 폼 제출 시 Local Storage에 저장
  const onSubmit = (data: ApiFormValues) => {
    localStorage.setItem('ai-studio-api-keys', JSON.stringify(data));
    alert('API 설정이 성공적으로 저장되었습니다.');
  };

  // 각 API 섹션을 렌더링하는 헬퍼 함수
  const renderApiSection = (name: keyof ApiFormValues, title: string, description: string) => {
    const isEnabled = watch(`${name}.enabled`);

    return (
      <div className={`p-4 rounded-lg border transition-colors ${isEnabled ? 'bg-card border-primary/50' : 'bg-muted/10 border-border'} text-card-foreground space-y-4`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">{title}</p>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          <Controller
            control={control}
            name={`${name}.enabled`}
            render={({ field }) => (
              <Switch
                checked={field.value}
                onCheckedChange={(checked) => {
                  field.onChange(checked);
                  if (!checked) setValue(`${name}.key`, ''); // 비활성화 시 키 초기화
                }}
              />
            )}
          />
        </div>
        
        {isEnabled && (
          <div className="pt-2 animate-in fade-in slide-in-from-top-2 duration-200">
            <Label htmlFor={`${name}-key`} className="sr-only">{title} Key</Label>
            <Controller
              control={control}
              name={`${name}.key`}
              render={({ field }) => (
                <Input
                  id={`${name}-key`}
                  type="password"
                  placeholder={`${title}를 입력하세요`}
                  {...field}
                  value={field.value || ''}
                  className={errors[name]?.key ? "border-destructive focus-visible:ring-destructive" : ""}
                />
              )}
            />
            {errors[name]?.key && (
              <p className="text-sm text-destructive mt-1.5">{errors[name]?.key?.message}</p>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">API 설정</h1>
        <p className="text-muted-foreground mt-2">외부 서비스 연동을 위한 API 키를 관리합니다.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-xl">
            <Key className="w-5 h-5 mr-2 text-primary" />
            API 키 관리
          </CardTitle>
          <CardDescription>
            각 서비스의 API 키를 입력하고 활성화하세요. 키는 브라우저(Local Storage)에 안전하게 저장됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {renderApiSection('google', 'Google API Key', 'Gemini 모델 및 번역, 대본 생성에 사용됩니다.')}
            {renderApiSection('openai', 'OpenAI API Key', 'GPT 모델 및 추가 텍스트 처리에 사용됩니다.')}
            {renderApiSection('anthropic', 'Anthropic API Key', 'Claude 모델을 활용한 고급 추론에 사용됩니다.')}
            {renderApiSection('elevenlabs', 'ElevenLabs API Key', '고품질 AI 음성(TTS) 생성에 사용됩니다.')}
            {renderApiSection('typecast', 'Typecast API Key', 'AI 음성 더빙 및 아바타 생성에 사용됩니다.')}

            <div className="pt-6 flex justify-end">
              <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
                <Save className="w-4 h-4 mr-2" />
                설정 저장
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;