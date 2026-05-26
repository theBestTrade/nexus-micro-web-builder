import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../../components/layout/Sidebar.tsx';
import Header from '../../components/layout/Header.tsx';
import SettingsModal from '../../components/settings/SettingsModal.tsx';

const DashboardLayout: React.FC = () => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* ── 왼쪽 GNB (Playauto 네이비 사이드바) ── */}
      <Sidebar onOpenSettings={() => setIsSettingsOpen(true)} />

      {/* ── 오른쪽 콘텐츠 영역 ── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* 모바일 헤더 (md 이상 숨김) */}
        <Header onOpenSettings={() => setIsSettingsOpen(true)} />

        {/* 페이지 콘텐츠 */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-8">
          <Outlet />
        </div>
      </main>

      {/* ── 설정 모달 ── */}
      {isSettingsOpen && (
        <SettingsModal onClose={() => setIsSettingsOpen(false)} />
      )}
    </div>
  );
};

export default DashboardLayout;
