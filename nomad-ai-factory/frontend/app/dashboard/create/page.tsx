import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/index.tsx';
import { PlaySquare } from 'lucide-react';
import CreateForm from '../../../components/forms/CreateForm.tsx';

const CreatePage: React.FC = () => {
  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">영상 컨트롤 패널</h1>
        <p className="text-sm text-muted-foreground mt-1">원본 영상을 입력하거나 검색하여 원하는 포맷으로 변환을 시작하세요.</p>
      </div>
      
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <PlaySquare className="w-4 h-4 mr-2 text-primary" />
            새 프로젝트 설정
          </CardTitle>
          <CardDescription className="text-xs">
            AI가 영상을 분석하고 설정된 값에 맞게 자동으로 편집 및 각색합니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateForm />
        </CardContent>
      </Card>
    </div>
  );
};

export default CreatePage;