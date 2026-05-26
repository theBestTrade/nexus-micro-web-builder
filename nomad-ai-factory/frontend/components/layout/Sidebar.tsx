import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/supabase/auth.tsx';
import {
  LayoutDashboard, ShoppingCart, Globe, Workflow,
  Settings, LogOut, ChevronLeft, ChevronRight,
  Zap, HelpCircle, Plus, LayoutPanelLeft,
} from 'lucide-react';

// ─── Props ────────────────────────────────────────────────────────────────────
interface SidebarProps {
  onOpenSettings: () => void;
}

// ─── 네비게이션 정의 ──────────────────────────────────────────────────────────
interface NavItemDef {
  path: string;
  label: string;
  icon: React.ElementType;
  exact?: boolean;
}

const PRIMARY_NAV: NavItemDef[] = [
  {
    path: '/dashboard',
    label: '홈 (대시보드)',
    icon: LayoutDashboard,
    exact: true,
  },
  {
    path: '/dashboard/create',
    label: '상품 소싱',
    icon: Globe,
  },
  {
    path: '/dashboard/detail',
    label: '상세페이지 제작',
    icon: LayoutPanelLeft,
  },
  {
    path: '/dashboard/results',
    label: '주문 관리',
    icon: ShoppingCart,
  },
  {
    path: '/dashboard/workflow',
    label: '자동화작업',
    icon: Workflow,
  },
];

// ─── NavItem ─────────────────────────────────────────────────────────────────
interface NavItemProps {
  item: NavItemDef;
  collapsed: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ item, collapsed }) => {
  return (
    <NavLink
      to={item.path}
      end={item.exact}
      title={collapsed ? item.label : undefined}
      className={({ isActive: active }) => `
        relative flex items-center gap-3 rounded-lg text-[13px] font-medium
        transition-all duration-150 group select-none
        ${collapsed ? 'justify-center px-0 py-2.5 mx-auto w-10' : 'px-3 py-2.5'}
        ${active
          ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
          : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
        }
      `}
    >
      <item.icon className="w-[18px] h-[18px] shrink-0" />
      {!collapsed && <span className="truncate flex-1">{item.label}</span>}
      {collapsed && (
        <div className="absolute left-full ml-3 px-2.5 py-1.5 rounded-lg bg-slate-700 text-slate-100 text-[12px] font-medium border border-slate-600 shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity duration-150">
          {item.label}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-slate-700 border-l border-t border-slate-600 rotate-[-45deg]" />
        </div>
      )}
    </NavLink>
  );
};

// ─── 버튼 아이템 (설정/도움말용) ─────────────────────────────────────────────
interface ButtonNavItemProps {
  label: string;
  icon: React.ElementType;
  collapsed: boolean;
  onClick: () => void;
}
const ButtonNavItem: React.FC<ButtonNavItemProps> = ({ label, icon: Icon, collapsed, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    title={collapsed ? label : undefined}
    className={`
      relative w-full flex items-center gap-3 rounded-lg text-[13px] font-medium
      text-slate-400 hover:bg-slate-800 hover:text-slate-100
      transition-all duration-150 group select-none
      ${collapsed ? 'justify-center px-0 py-2.5 mx-auto w-10' : 'px-3 py-2.5'}
    `}
  >
    <Icon className="w-[18px] h-[18px] shrink-0" />
    {!collapsed && <span className="truncate">{label}</span>}
    {collapsed && (
      <div className="absolute left-full ml-3 px-2.5 py-1.5 rounded-lg bg-slate-700 text-slate-100 text-[12px] font-medium border border-slate-600 shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
        {label}
      </div>
    )}
  </button>
);

// ─── 메인 사이드바 ────────────────────────────────────────────────────────────
const Sidebar: React.FC<SidebarProps> = ({ onOpenSettings }) => {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout   = () => { logout(); };
  const avatarInitial  = user?.name?.charAt(0)?.toUpperCase() || 'U';

  return (
    <aside className={`
      relative hidden md:flex flex-col bg-slate-900
      transition-all duration-300 ease-in-out shrink-0
      ${collapsed ? 'w-[68px]' : 'w-[240px]'}
    `}>
      {/* ── 로고 ── */}
      <div className={`h-14 flex items-center border-b border-slate-800 shrink-0 ${collapsed ? 'justify-center px-0' : 'px-4 gap-3'}`}>
        <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center shrink-0 shadow-lg shadow-blue-600/30">
          <Zap className="w-4 h-4 text-white" fill="currentColor" />
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-white leading-none tracking-tight truncate">NOMAD AI</p>
            <p className="text-[10px] text-slate-500 mt-0.5 truncate">구매대행 자동화</p>
          </div>
        )}
      </div>

      {/* ── 접기/펼치기 ── */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="absolute -right-3 top-[52px] z-20 w-6 h-6 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center hover:bg-slate-600 transition-all shadow-md"
      >
        {collapsed ? <ChevronRight className="w-3 h-3 text-slate-300" /> : <ChevronLeft className="w-3 h-3 text-slate-300" />}
      </button>

      {/* ── 빠른 시작 버튼 ── */}
      <div className={`pt-4 pb-2 shrink-0 ${collapsed ? 'px-2' : 'px-3'}`}>
        <button
          onClick={() => navigate('/dashboard/create')}
          title={collapsed ? '상품 소싱' : undefined}
          className={`
            w-full flex items-center gap-2 rounded-lg text-[13px] font-semibold
            bg-blue-600 text-white hover:bg-blue-500 active:scale-[0.98]
            transition-all duration-150 shadow-md shadow-blue-600/20
            ${collapsed ? 'justify-center p-2.5' : 'px-3 py-2.5'}
          `}
        >
          <Plus className="w-4 h-4 shrink-0" />
          {!collapsed && '상품 소싱 시작'}
        </button>
      </div>

      {/* 섹션 레이블 */}
      {!collapsed && (
        <p className="px-4 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-widest text-slate-600">메뉴</p>
      )}

      {/* ── 메인 네비게이션 ── */}
      <nav className={`flex-1 overflow-y-auto overflow-x-hidden py-1 space-y-0.5 ${collapsed ? 'px-2' : 'px-3'}`}>
        {PRIMARY_NAV.map(item => (
          <NavItem key={item.path} item={item} collapsed={collapsed} />
        ))}
      </nav>

      {/* ── 하단 영역 ── */}
      <div className={`shrink-0 border-t border-slate-800 pt-3 pb-3 space-y-0.5 ${collapsed ? 'px-2' : 'px-3'}`}>
        <ButtonNavItem label="설정" icon={Settings} collapsed={collapsed} onClick={onOpenSettings} />

        <button
          title={collapsed ? '도움말' : undefined}
          className={`relative w-full flex items-center gap-3 rounded-lg text-[13px] font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-all duration-150 group ${collapsed ? 'justify-center p-2.5' : 'px-3 py-2.5'}`}
        >
          <HelpCircle className="w-[18px] h-[18px] shrink-0" />
          {!collapsed && '도움말'}
          {collapsed && (
            <div className="absolute left-full ml-3 px-2.5 py-1.5 rounded-lg bg-slate-700 text-slate-100 text-[12px] font-medium border border-slate-600 shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">도움말</div>
          )}
        </button>

        <div className="my-2 border-t border-slate-800" />

        {/* 유저 프로필 */}
        <div className={`flex items-center gap-3 rounded-lg hover:bg-slate-800 transition-colors cursor-default group relative ${collapsed ? 'justify-center p-2.5' : 'px-3 py-2.5'}`}>
          <div className="w-7 h-7 rounded-full shrink-0 bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-[11px] font-bold shadow-sm">
            {avatarInitial}
          </div>
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-slate-200 truncate leading-none">{user?.name || '사용자'}</p>
                <p className="text-[10px] text-slate-500 mt-0.5 truncate">{user?.provider || 'email'} 로그인</p>
              </div>
              <button onClick={handleLogout} title="로그아웃" className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-red-400 hover:bg-red-400/10 opacity-0 group-hover:opacity-100 transition-all">
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </>
          )}
          {collapsed && (
            <div className="absolute left-full ml-3 px-2.5 py-1.5 rounded-lg bg-slate-700 text-slate-100 text-[12px] border border-slate-600 shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity leading-relaxed">
              <p className="font-semibold">{user?.name || '사용자'}</p>
              <p className="text-slate-400 text-[10px]">{user?.provider}</p>
            </div>
          )}
        </div>

        {collapsed && (
          <button onClick={handleLogout} title="로그아웃" className="w-full flex items-center justify-center p-2.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-all">
            <LogOut className="w-[18px] h-[18px]" />
          </button>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
