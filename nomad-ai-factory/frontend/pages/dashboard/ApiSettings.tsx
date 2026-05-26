import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui.tsx';
import { Key } from 'lucide-react';

const ApiSettings: React.FC = () => {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
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
            Gemini, Supabase 등 필요한 서비스의 API 키를 안전하게 등록하세요.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 rounded-lg border bg-card text-card-foreground flex items-center justify-between">
              <div>
                <p className="font-medium">Google Gemini API</p>
                <p className="text-sm text-muted-foreground">텍스트 및 영상 생성 모델 사용</p>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-destructive/10 text-destructive">
                미등록
              </span>
            </div>
            <div className="p-4 rounded-lg border bg-card text-card-foreground flex items-center justify-between">
              <div>
                <p className="font-medium">Supabase Project URL</p>
                <p className="text-sm text-muted-foreground">데이터베이스 및 스토리지 연동</p>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-500">
                연결됨
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ApiSettings;