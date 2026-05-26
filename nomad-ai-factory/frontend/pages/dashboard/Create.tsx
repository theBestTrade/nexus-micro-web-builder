import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button, Input, Label, Select, RadioGroup, RadioGroupItem } from '../../components/ui.tsx';
import { PlaySquare, Wand2 } from 'lucide-react';

const createSchema = z.object({
  videoUrl: z.string().url({ message: "유효한 URL을 입력해주세요." }),
  contentType: z.string().min(1, { message: "콘텐츠 타입을 선택해주세요." }),
  targetFormat: z.enum(["16:9", "9:16"], { required_error: "타겟 포맷을 선택해주세요." }),
  targetLength: z.string().min(1, { message: "타겟 길이를 선택해주세요." }),
  resolution: z.string().min(1, { message: "출력 해상도를 선택해주세요." }),
  translationTone: z.string().min(1, { message: "번역 및 톤앤매너를 선택해주세요." }),
});

type CreateFormValues = z.infer<typeof createSchema>;

const Create: React.FC = () => {
  const { register, handleSubmit, formState: { errors } } = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      videoUrl: '',
      contentType: '',
      targetFormat: '16:9',
      targetLength: '',
      resolution: '',
      translationTone: '',
    }
  });

  const onSubmit = (data: CreateFormValues) => {
    console.log("=== 영상 생성 요청 데이터 ===");
    console.log(JSON.stringify(data, null, 2));
    alert('영상 생성 요청이 콘솔에 출력되었습니다.');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">영상 컨트롤 패널</h1>
        <p className="text-muted-foreground mt-2">원본 영상을 입력하고 원하는 포맷으로 변환을 시작하세요.</p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-xl">
            <PlaySquare className="w-5 h-5 mr-2 text-primary" />
            새 프로젝트 설정
          </CardTitle>
          <CardDescription>
            AI가 영상을 분석하고 설정된 값에 맞게 자동으로 편집 및 각색합니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            
            {/* 영상 URL */}
            <div className="space-y-2">
              <Label htmlFor="videoUrl">원본 영상 URL</Label>
              <Input 
                id="videoUrl" 
                placeholder="https://youtube.com/watch?v=..." 
                {...register("videoUrl")}
                className={errors.videoUrl ? "border-destructive" : ""}
              />
              {errors.videoUrl && <p className="text-sm text-destructive">{errors.videoUrl.message}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 콘텐츠 타입 */}
              <div className="space-y-2">
                <Label htmlFor="contentType">콘텐츠 타입</Label>
                <Select id="contentType" {...register("contentType")} className={errors.contentType ? "border-destructive" : ""}>
                  <option value="" disabled>선택해주세요</option>
                  <option value="중국드라마">중국드라마</option>
                  <option value="해외인기쇼츠">해외인기쇼츠</option>
                  <option value="쇼핑쇼츠-시세차익용">쇼핑쇼츠-시세차익용</option>
                  <option value="로우파이(Lo-fi) 영상">로우파이(Lo-fi) 영상</option>
                </Select>
                {errors.contentType && <p className="text-sm text-destructive">{errors.contentType.message}</p>}
              </div>

              {/* 타겟 길이 */}
              <div className="space-y-2">
                <Label htmlFor="targetLength">타겟 길이</Label>
                <Select id="targetLength" {...register("targetLength")} className={errors.targetLength ? "border-destructive" : ""}>
                  <option value="" disabled>선택해주세요</option>
                  <option value="60초 미만 숏폼">60초 미만 숏폼</option>
                  <option value="3분 이상 롱폼">3분 이상 롱폼</option>
                </Select>
                {errors.targetLength && <p className="text-sm text-destructive">{errors.targetLength.message}</p>}
              </div>

              {/* 출력 해상도 */}
              <div className="space-y-2">
                <Label htmlFor="resolution">출력 해상도</Label>
                <Select id="resolution" {...register("resolution")} className={errors.resolution ? "border-destructive" : ""}>
                  <option value="" disabled>선택해주세요</option>
                  <option value="720p">720p</option>
                  <option value="1080p">1080p</option>
                  <option value="4K">4K</option>
                </Select>
                {errors.resolution && <p className="text-sm text-destructive">{errors.resolution.message}</p>}
              </div>

              {/* 번역 및 톤앤매너 */}
              <div className="space-y-2">
                <Label htmlFor="translationTone">번역 및 톤앤매너</Label>
                <Select id="translationTone" {...register("translationTone")} className={errors.translationTone ? "border-destructive" : ""}>
                  <option value="" disabled>선택해주세요</option>
                  <option value="한국어-사이다/정보형 각색">한국어-사이다/정보형 각색</option>
                  <option value="일본어-감성 독백형 각색">일본어-감성 독백형 각색</option>
                </Select>
                {errors.translationTone && <p className="text-sm text-destructive">{errors.translationTone.message}</p>}
              </div>
            </div>

            {/* 타겟 포맷 (Radio Group) */}
            <div className="space-y-3 pt-2">
              <Label>타겟 포맷</Label>
              <RadioGroup className="flex flex-row space-x-6">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="16:9" id="format-16-9" {...register("targetFormat")} />
                  <Label htmlFor="format-16-9" className="font-normal cursor-pointer">가로형 16:9</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="9:16" id="format-9-16" {...register("targetFormat")} />
                  <Label htmlFor="format-9-16" className="font-normal cursor-pointer">세로형 9:16</Label>
                </div>
              </RadioGroup>
              {errors.targetFormat && <p className="text-sm text-destructive">{errors.targetFormat.message}</p>}
            </div>

            <div className="pt-6">
              <Button type="submit" className="w-full md:w-auto">
                <Wand2 className="w-4 h-4 mr-2" />
                영상 생성 시작
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Create;