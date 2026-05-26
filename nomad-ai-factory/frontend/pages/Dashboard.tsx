import React from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.tsx';
import { 
  Video, 
  Settings as SettingsIcon, 
  Workflow, 
  LogOut, 
  Menu,
  PlaySquare
} from 'lucide-react';
import { Button } from '../components/ui.tsx';

const DashboardLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/dashboard/create', label: '영상 컨트롤 패널', icon: PlaySquare },
    { path: '/dashboard/workflow', label: '워크플로우 자동화', icon: Workflow },
  ];

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar (Desktop) */}
      <aside className="hidden md:flex w-64 flex-col border-r border-border bg-card">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <Video className="w-6 h-6 text-primary mr-2" />
          <span className="font-bold text-lg tracking-tight">NOMAD AI Factory</span>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
              
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`flex items-center px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  isActive 
                    ? 'bg-primary/10 text-primary' 
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
              >
                <item.icon className={`w-5 h-5 mr-3 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border space-y-4">
          {/* API 설정 (유저 프로필 위로 이동) */}
          <NavLink
            to="/dashboard/settings"
            className={({ isActive }) => `flex items-center px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
              isActive 
                ? 'bg-primary/10 text-primary' 
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            }`}
          >
            <SettingsIcon className={`w-5 h-5 mr-3 ${location.pathname === '/dashboard/settings' ? 'text-primary' : 'text-muted-foreground'}`} />
            API 설정
          </NavLink>

          <div className="flex items-center px-2">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold mr-3">
              {user?.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.provider} 로그인</p>
            </div>
          </div>
          <Button variant="outline" className="w-full justify-start text-muted-foreground" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            로그아웃
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden h-16 flex items-center justify-between px-4 border-b border-border bg-card">
          <div className="flex items-center">
            <Video className="w-6 h-6 text-primary mr-2" />
            <span className="font-bold text-lg">NOMAD AI Factory</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            <Menu className="w-6 h-6" />
          </Button>
        </header>

        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-b border-border bg-card p-2 space-y-1">
             {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) => `flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                  isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground'
                }`}
              >
                <item.icon className="w-5 h-5 mr-3" />
                {item.label}
              </NavLink>
            ))}
            <NavLink
              to="/dashboard/settings"
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) => `flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground'
              }`}
            >
              <SettingsIcon className="w-5 h-5 mr-3" />
              API 설정
            </NavLink>
            <Button variant="ghost" className="w-full justify-start text-muted-foreground mt-2" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              로그아웃
            </Button>
          </div>
        )}

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;