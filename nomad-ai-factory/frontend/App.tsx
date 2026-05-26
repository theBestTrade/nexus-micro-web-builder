import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/supabase/auth.tsx';

// Pages
import Landing from './pages/Landing.tsx';
import DashboardLayout from './app/dashboard/layout.tsx';
import DashboardPage from './app/dashboard/page.tsx';
import CreatePage from './app/dashboard/create/page.tsx';
import DetailPage from './app/dashboard/create/detail/page.tsx'; // 경로는 파일 위치, URL은 /dashboard/detail
import WorkflowPage from './app/dashboard/workflow/page.tsx';
import ResultsPage from './app/dashboard/results/page.tsx';

// ─── 초기화 대기 스피너 ──────────────────────────────────────────────────────
const InitLoader: React.FC = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-white">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center animate-pulse">
        <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="currentColor">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
      </div>
      <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  </div>
);

// ─── 보호 라우트: 미인증 → '/'로 이동 ────────────────────────────────────────
// isInitialized 가 false 인 동안은 렌더링을 보류해 오판 리다이렉트를 방지한다.
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isInitialized } = useAuth();

  if (!isInitialized) return <InitLoader />;                 // 세션 복원 대기
  if (!isAuthenticated) return <Navigate to="/" replace />; // 미인증 → 랜딩

  return <>{children}</>;
};

// ─── 공개 라우트: 이미 로그인된 경우 → '/dashboard'로 이동 ───────────────────
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isInitialized } = useAuth();

  if (!isInitialized) return <InitLoader />;                        // 세션 복원 대기
  if (isAuthenticated) return <Navigate to="/dashboard" replace />; // 인증 완료 → 대시보드

  return <>{children}</>;
};

// ─── 라우트 구성 ─────────────────────────────────────────────────────────────
const AppRoutes: React.FC = () => (
  <Routes>
    {/* 메인 랜딩 페이지 (로그인 모달 포함) */}
    <Route
      path="/"
      element={
        <PublicRoute>
          <Landing />
        </PublicRoute>
      }
    />

    {/* /login → 랜딩으로 리다이렉트 (모달 방식으로 대체) */}
    <Route path="/login" element={<Navigate to="/" replace />} />

    {/* 대시보드 — 인증 필요 (로그아웃 시 ProtectedRoute가 /로 자동 이동) */}
    <Route
      path="/dashboard"
      element={
        <ProtectedRoute>
          <DashboardLayout />
        </ProtectedRoute>
      }
    >
      <Route index element={<DashboardPage />} />
      <Route path="create"  element={<CreatePage />} />
      <Route path="detail"  element={<DetailPage />} />
      <Route path="results"       element={<ResultsPage />} />
      <Route path="settings"      element={<Navigate to="/dashboard" replace />} />
      <Route path="workflow"      element={<WorkflowPage />} />
    </Route>

    {/* 그 외 경로 → 랜딩 */}
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

const App: React.FC = () => (
  <AuthProvider>
    <HashRouter>
      <AppRoutes />
    </HashRouter>
  </AuthProvider>
);

export default App;
