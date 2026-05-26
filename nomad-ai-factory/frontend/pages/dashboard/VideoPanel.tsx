import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui.tsx';
import { PlaySquare } from 'lucide-react';

const VideoPanel: React.FC = () => {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">영상 생성 패널</h1>
        <p className="text-muted-foreground mt-2">AI 모델을 활용하여 텍스트나 이미지로 영상을 생성합니다.</p>
      </div>
      
      <Card className="border-dashed border-2 bg-transparent">
        <CardContent className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <PlaySquare className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-xl font-semibold mb-2">새로운 영상 프로젝트 시작</h3>
          <p className="text-muted-foreground max-w-sm mb-6">
            프롬프트를 입력하고 AI가 생성하는 놀라운 영상을 경험해보세요. (다음 파트에서 구현됩니다)
          </p>
          <button className="bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 rounded-md text-sm font-medium transition-colors">
            프로젝트 생성
          </button>
        </CardContent>
      </Card>
    </div>
  );
};

export default VideoPanel;