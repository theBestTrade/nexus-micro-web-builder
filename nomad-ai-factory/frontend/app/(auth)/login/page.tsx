import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../lib/supabase/auth.tsx';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/index.tsx';
import { Video } from 'lucide-react';

const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = (provider: string) => {
    login(provider);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="absolute inset-0 bg-[url('https://picsum.photos/1920/1080?blur=10')] bg-cover bg-center opacity-10"></div>
      
      <Card className="w-full max-w-md relative z-10 border-zinc-800 bg-zinc-950/80 backdrop-blur-xl">
        <CardHeader className="space-y-3 text-center">
          <div className="flex justify-center mb-2">
            <div className="p-3 bg-primary/10 rounded-full">
              <Video className="w-8 h-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight">환영합니다</CardTitle>
          <CardDescription className="text-zinc-400">
            NOMAD AI Factory에 로그인하여 시작하세요
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 mt-4">
          <Button 
            variant="outline" 
            className="w-full flex items-center justify-center gap-3 h-12 text-base border-zinc-700 hover:bg-zinc-800"
            onClick={() => handleLogin('google')}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Google로 계속하기
          </Button>
          
          <Button 
            variant="kakao" 
            className="w-full flex items-center justify-center gap-3 h-12 text-base font-semibold"
            onClick={() => handleLogin('kakao')}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3c-5.523 0-10 3.51-10 7.84 0 2.81 1.83 5.27 4.61 6.61-.24.86-.86 3.12-.89 3.26-.04.16.06.24.18.16.14-.09 3.3-2.23 3.83-2.6.75.2 1.54.31 2.36.31 5.523 0 10-3.51 10-7.84C22 6.51 17.523 3 12 3z"/>
            </svg>
            카카오로 계속하기
          </Button>

          <Button 
            variant="naver" 
            className="w-full flex items-center justify-center gap-3 h-12 text-base font-semibold"
            onClick={() => handleLogin('naver')}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16.273 12.845 7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727v12.845z"/>
            </svg>
            네이버로 계속하기
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginPage;