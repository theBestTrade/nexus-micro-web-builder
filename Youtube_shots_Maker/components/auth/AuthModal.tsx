"use client";

import { useState } from "react";
import { Zap, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";

/* ── 소셜 아이콘 ──────────────────────────────────── */
const GoogleIcon = () => (
  <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const KakaoIcon = () => (
  <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="#3C1E1E">
    <path d="M12 3C6.477 3 2 6.477 2 10.5c0 2.548 1.516 4.793 3.813 6.142-.168.624-.608 2.26-.697 2.612-.11.432.158.426.332.31.137-.094 2.175-1.472 3.053-2.065.487.07.985.106 1.499.106 5.523 0 10-3.477 10-7.5S17.523 3 12 3z"/>
  </svg>
);

const NaverIcon = () => (
  <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="white">
    <path d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727z"/>
  </svg>
);

/* ── 타입 ─────────────────────────────────────────── */
type Mode = "login" | "signup";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultMode?: Mode;
}

/* ── 컴포넌트 ─────────────────────────────────────── */
export default function AuthModal({
  open,
  onOpenChange,
  defaultMode = "login",
}: AuthModalProps) {
  const supabase = createClient();
  const [mode, setMode] = useState<Mode>(defaultMode);

  /* 공통 필드 */
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [loading,  setLoading]  = useState(false);
  const [socialLoading, setSocialLoading] = useState<"google" | "kakao" | "naver" | null>(null);

  /* 모드 전환 시 필드 초기화 */
  const switchMode = (next: Mode) => {
    setEmail(""); setPassword(""); setConfirm("");
    setMode(next);
  };

  /* ── 이메일 로그인 ───────────────────────── */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success("로그인 성공!");
      window.location.href = "/dashboard";
    } catch (err: unknown) {
      toast.error((err as Error).message || "로그인에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  /* ── 이메일 회원가입 ─────────────────────── */
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("비밀번호가 일치하지 않습니다.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${location.origin}/auth/callback?next=/dashboard` },
      });
      if (error) throw error;
      toast.success("가입 완료! 이메일 인증 링크를 확인하세요.");
      switchMode("login");
    } catch (err: unknown) {
      toast.error((err as Error).message || "회원가입에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  /* ── 소셜 로그인 ─────────────────────────── */
  const handleGoogle = async () => {
    setSocialLoading("google");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback?next=/dashboard` },
    });
    if (error) { toast.error(error.message); setSocialLoading(null); }
  };

  const handleKakao = async () => {
    setSocialLoading("kakao");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "kakao",
      options: { redirectTo: `${location.origin}/auth/callback?next=/dashboard` },
    });
    if (error) { toast.error(error.message); setSocialLoading(null); }
  };

  const handleNaver = () => {
    setSocialLoading("naver");
    location.href = "/api/auth/naver";
  };

  const busy = loading || !!socialLoading;

  /* ── 렌더 ────────────────────────────────── */
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-8">
        {/* 로고 */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-jade">
            <Zap className="h-5 w-5 text-surface" />
          </div>
          <span className="font-heading text-2xl tracking-widest">NOMAD</span>
        </div>

        {/* 제목 */}
        <DialogTitle className="text-xl font-semibold text-center">
          {mode === "login" ? "로그인" : "회원가입"}
        </DialogTitle>
        <DialogDescription className="text-center text-sm text-muted-foreground mb-6">
          {mode === "login"
            ? "계정으로 로그인하세요"
            : "무료 계정을 만들어 시작하세요"}
        </DialogDescription>

        {/* ── 이메일 폼 ── */}
        <form onSubmit={mode === "login" ? handleLogin : handleSignup} className="space-y-3 mb-5">
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">이메일</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              required
              disabled={busy}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">비밀번호</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              minLength={8}
              required
              disabled={busy}
            />
          </div>
          {mode === "signup" && (
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">비밀번호 확인</label>
              <Input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="비밀번호 재입력"
                required
                disabled={busy}
              />
            </div>
          )}
          <Button
            type="submit"
            className="w-full bg-jade hover:bg-jade/90 text-surface font-semibold"
            disabled={busy}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === "login" ? "로그인" : "회원가입"}
          </Button>
        </form>

        {/* 구분선 */}
        <div className="relative mb-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-white/10" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">또는 소셜 계정으로</span>
          </div>
        </div>

        {/* ── 소셜 버튼 (세로) ── */}
        <div className="flex flex-col gap-2 mb-5">
          <Button
            type="button"
            variant="outline"
            className="w-full h-10 gap-2 border-white/10 bg-white/5 hover:bg-white/10 text-sm justify-center"
            onClick={handleGoogle}
            disabled={busy}
          >
            {socialLoading === "google"
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <GoogleIcon />}
            Google로 {mode === "login" ? "로그인" : "가입"}
          </Button>

          <Button
            type="button"
            className="w-full h-10 gap-2 bg-[#FEE500] text-[#3C1E1E] hover:bg-[#F5DC00] text-sm justify-center"
            onClick={handleKakao}
            disabled={busy}
          >
            {socialLoading === "kakao"
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <KakaoIcon />}
            카카오로 {mode === "login" ? "로그인" : "가입"}
          </Button>

          <Button
            type="button"
            className="w-full h-10 gap-2 bg-[#03C75A] text-white hover:bg-[#02b350] text-sm justify-center"
            onClick={handleNaver}
            disabled={busy}
          >
            {socialLoading === "naver"
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <NaverIcon />}
            네이버로 {mode === "login" ? "로그인" : "가입"}
          </Button>
        </div>

        {/* 모드 전환 */}
        <p className="text-center text-sm text-muted-foreground">
          {mode === "login" ? (
            <>
              계정이 없으신가요?{" "}
              <button
                type="button"
                onClick={() => switchMode("signup")}
                className="text-jade hover:underline font-medium"
              >
                회원가입
              </button>
            </>
          ) : (
            <>
              이미 계정이 있으신가요?{" "}
              <button
                type="button"
                onClick={() => switchMode("login")}
                className="text-jade hover:underline font-medium"
              >
                로그인
              </button>
            </>
          )}
        </p>
      </DialogContent>
    </Dialog>
  );
}
