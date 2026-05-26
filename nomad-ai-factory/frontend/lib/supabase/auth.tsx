import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { User, AuthContextType } from '../../types/index.ts';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_KEY = 'nomad_ai_session';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // 앱 초기 마운트 시 세션 복원 (새로고침 대응)
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as User;
        setUser(parsed);
      }
    } catch {
      sessionStorage.removeItem(SESSION_KEY);
    } finally {
      // 세션 복원 완료 — 이후부터 라우트 가드가 동작
      setIsInitialized(true);
    }
  }, []);

  const login = (provider: string) => {
    const newUser: User = {
      id: Math.random().toString(36).substring(7),
      name: '테스트 유저',
      provider,
    };
    setUser(newUser);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(newUser));
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem(SESSION_KEY);
    // navigate 호출 없음 — ProtectedRoute가 단독으로 리다이렉트 처리
    // (이중 navigate가 충돌하면 / → /dashboard → / 루프 발생 가능)
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isInitialized, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
