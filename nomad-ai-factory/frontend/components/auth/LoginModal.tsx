import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/supabase/auth.tsx';
import { X, Zap, Code2, Mail, Globe } from 'lucide-react';

interface LoginModalProps {
  onClose: () => void;
}

// ── 카카오 SVG 아이콘 ────────────────────────────────────────────────────────
const KakaoIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
    <path d="M12 3C6.477 3 2 6.477 2 10.8c0 2.756 1.73 5.187 4.35 6.627l-.88 3.24a.3.3 0 00.44.33l3.82-2.54A11.5 11.5 0 0012 18.6c5.523 0 10-3.477 10-7.8S17.523 3 12 3z"/>
  </svg>
);

// ── 네이버 SVG 아이콘 ────────────────────────────────────────────────────────
const NaverIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
    <path d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727z"/>
  </svg>
);

// ── 소셜 로그인 버튼 정의 ─────────────────────────────────────────────────────
const SOCIAL_PROVIDERS = [
  {
    id: 'google',
    label: 'Google로 계속하기',
    icon: Globe,
    className: 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50',
  },
  {
    id: 'github',
    label: 'GitHub로 계속하기',
    icon: Code2,
    className: 'bg-[#24292E] text-white hover:bg-[#1a1f23]',
  },
  {
    id: 'kakao',
    label: '카카오로 계속하기',
    icon: KakaoIcon,
    className: 'bg-[#FEE500] text-[#391B1B] hover:bg-[#f0d800]',
  },
  {
    id: 'naver',
    label: '네이버로 계속하기',
    icon: NaverIcon,
    className: 'bg-[#03C75A] text-white hover:bg-[#02b350]',
  },
] as const;

// ─── 메인 모달 컴포넌트 ──────────────────────────────────────────────────────
const LoginModal: React.FC<LoginModalProps> = ({ onClose }) => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const overlayRef = useRef<HTMLDivElement>(null);

  // ESC 키로 닫기
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    // 모달 열릴 때 스크롤 막기
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  // 오버레이 클릭 시 닫기
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  const handleLogin = async (provider: string) => {
    login(provider);
    onClose();
    navigate('/dashboard');
  };

  return (
    /* ── 오버레이 ───────────────────────────────────────────────────── */
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="
        fixed inset-0 z-50
        bg-slate-900/60 modal-backdrop
        flex items-center justify-center p-4
        animate-in fade-in duration-200
      "
    >
      {/* ── 모달 패널 ──────────────────────────────────────────────── */}
      <div className="
        relative w-full max-w-[400px]
        bg-white rounded-2xl shadow-2xl
        animate-in zoom-in-95 duration-200
        overflow-hidden
      ">
        {/* 상단 파란 그라디언트 띠 */}
        <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600" />

        {/* 닫기 버튼 */}
        <button
          onClick={onClose}
          className="
            absolute top-4 right-4
            w-8 h-8 rounded-full
            flex items-center justify-center
            text-slate-400 hover:text-slate-600 hover:bg-slate-100
            transition-colors
          "
        >
          <X className="w-4 h-4" />
        </button>

        {/* 콘텐츠 */}
        <div className="px-8 py-8">
          {/* 로고 + 제목 */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/30 mb-4">
              <Zap className="w-6 h-6 text-white" fill="currentColor" />
            </div>
            <h2 className="text-[22px] font-bold text-slate-900 tracking-tight">
              NOMAD AI Factory
            </h2>
            <p className="text-[13px] text-slate-500 mt-1.5 text-center leading-relaxed">
              AI 콘텐츠 수익화 자동화 플랫폼에 오신 것을 환영합니다.<br />
              소셜 계정으로 바로 시작하세요.
            </p>
          </div>

          {/* 소셜 로그인 버튼 목록 */}
          <div className="space-y-3">
            {SOCIAL_PROVIDERS.map(({ id, label, icon: Icon, className: btnClass }) => (
              <button
                key={id}
                onClick={() => handleLogin(id)}
                className={`
                  w-full flex items-center justify-center gap-3
                  h-11 px-4 rounded-xl text-[14px] font-semibold
                  transition-all duration-150 active:scale-[0.98]
                  shadow-sm border border-transparent
                  ${btnClass}
                `}
              >
                <Icon />
                {label}
              </button>
            ))}
          </div>

          {/* 구분선 */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-slate-100" />
            <span className="text-[11px] text-slate-400 font-medium">또는</span>
            <div className="flex-1 h-px bg-slate-100" />
          </div>

          {/* 이메일 로그인 (Mock) */}
          <button
            onClick={() => handleLogin('email')}
            className="
              w-full flex items-center justify-center gap-3
              h-11 px-4 rounded-xl text-[14px] font-semibold
              bg-slate-50 text-slate-700 border border-slate-200
              hover:bg-slate-100 transition-all duration-150 active:scale-[0.98]
            "
          >
            <Mail className="w-5 h-5" />
            이메일로 로그인
          </button>

          {/* 약관 */}
          <p className="text-[11px] text-slate-400 text-center mt-6 leading-relaxed">
            로그인 시{' '}
            <button className="text-blue-600 hover:underline">이용약관</button>
            {' '}및{' '}
            <button className="text-blue-600 hover:underline">개인정보처리방침</button>
            에 동의하는 것으로 간주됩니다.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;
