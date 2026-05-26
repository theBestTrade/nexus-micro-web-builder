import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/supabase/auth.tsx';
import {
  Zap, LayoutDashboard, Globe, ShoppingCart,
  Workflow, Settings as SettingsIcon, LogOut, Menu, X, LayoutPanelLeft,
} from 'lucide-react';

// ─── Props ────────────────────────────────────────────────────────────────────
interface HeaderProps {
  onOpenSettings: () => void;
}

const Header: React.FC<HeaderProps> = ({ onOpenSettings }) => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  // logout() → isAuthenticated = false → ProtectedRoute 가 '/'로 리다이렉트 처리
  const handleLogout = () => {
    logout();
    setIsMobileMenuOpen(false);
  };

  const navItems = [
    { path: '/dashboard',          label: '홈 (대시보드)',   icon: LayoutDashboard,  exact: true },
    { path: '/dashboard/create',   label: '상품 소싱',      icon: Globe },
    { path: '/dashboard/detail',   label: '상세페이지 제작', icon: LayoutPanelLeft },
    { path: '/dashboard/results',  label: '주문 관리',      icon: ShoppingCart },
    { path: '/dashboard/workflow', label: '자동화작업',     icon: Workflow },
  ];

  const handleOpenSettings = () => {
    setIsMobileMenuOpen(false);
    onOpenSettings();
  };

  return (
    <>
      {/* 모바일 헤더 바 */}
      <header className="md:hidden h-14 flex items-center justify-between px-4 border-b border-slate-200 bg-slate-900 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-white" fill="currentColor" />
          </div>
          <span className="font-bold text-[14px] text-white tracking-tight">NOMAD AI Factory</span>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(o => !o)}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* 모바일 드롭다운 메뉴 */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 bg-slate-900 px-3 py-3 space-y-1 animate-in slide-in-from-top-2 duration-200">
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.exact}
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                }`
              }
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {item.label}
            </NavLink>
          ))}

          {/* 설정 버튼 — 모달로 열기 */}
          <button
            onClick={handleOpenSettings}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
          >
            <SettingsIcon className="w-4 h-4 shrink-0" />
            설정
          </button>

          <div className="pt-2 border-t border-slate-800 mt-2">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium text-slate-400 hover:bg-red-600/10 hover:text-red-400 transition-colors"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              로그아웃
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
