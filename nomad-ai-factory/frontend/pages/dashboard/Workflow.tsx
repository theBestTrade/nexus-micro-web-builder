import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui.tsx';
import { GitMerge } from 'lucide-react';

const Workflow: React.FC = () => {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">워크플로우 자동화</h1>
        <p className="text-muted-foreground mt-2">반복적인 작업을 자동화하는 파이프라인을 구성합니다.</p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-xl">
            <GitMerge className="w-5 h-5 mr-2 text-primary" />
            자동화 파이프라인
          </CardTitle>
          <CardDescription>
            트리거와 액션을 연결하여 나만의 워크플로우를 만드세요.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 rounded-md border border-dashed flex items-center justify-center bg-muted/30">
            <p className="text-muted-foreground">워크플로우 에디터가 여기에 표시됩니다.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Workflow;