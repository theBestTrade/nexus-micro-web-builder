"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Zap, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

/* ── 소셜 로그인 아이콘 ───────────────────────────────── */
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
  <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="#03C75A">
    <path d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727z"/>
  </svg>
);

export default function LoginPage() {
  const router   = useRouter();
  const supabase = createClient();
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [socialLoading, setSocialLoading] = useState<"google"|"kakao"|"naver"|null>(null);

  /* ── 이메일 로그인 ─────────────────────────────────── */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success("로그인 성공!");
      router.push("/dashboard");
    } catch (err: unknown) {
      toast.error((err as Error).message || "로그인 실패");
    } finally {
      setLoading(false);
    }
  };

  /* ── 구글 로그인 ───────────────────────────────────── */
  const handleGoogle = async () => {
    setSocialLoading("google");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options:  { redirectTo: `${location.origin}/auth/callback?next=/dashboard` },
    });
    if (error) { toast.error(error.message); setSocialLoading(null); }
  };

  /* ── 카카오 로그인 ─────────────────────────────────── */
  const handleKakao = async () => {
    setSocialLoading("kakao");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "kakao",
      options:  { redirectTo: `${location.origin}/auth/callback?next=/dashboard` },
    });
    if (error) { toast.error(error.message); setSocialLoading(null); }
  };

  /* ── 네이버 로그인 ─────────────────────────────────── */
  const handleNaver = () => {
    setSocialLoading("naver");
    location.href = "/api/auth/naver";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm">

        {/* 로고 */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-jade">
            <Zap className="h-6 w-6 text-surface" />
          </div>
          <span className="font-heading text-2xl tracking-widest">NOMAD</span>
        </div>

        <h1 className="text-2xl font-semibold text-center mb-1">로그인</h1>
        <p className="text-sm text-muted-foreground text-center mb-8">계정으로 로그인하세요</p>

        {/* ── 이메일 로그인 폼 ── */}
        <form onSubmit={handleLogin} className="space-y-4 mb-6">
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">이메일</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              required
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">비밀번호</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <Button type="submit" className="w-full bg-jade hover:bg-jade/90 text-surface font-semibold" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            로그인
          </Button>
        </form>

        {/* 구분선 */}
        <div className="relative mb-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-white/10" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-surface px-2 text-muted-foreground">또는 소셜 계정으로</span>
          </div>
        </div>

        {/* ── 소셜 로그인 버튼 3개 ── */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          {/* 구글 */}
          <Button
            type="button"
            variant="outline"
            className="h-10 gap-1.5 border-white/10 bg-white/5 hover:bg-white/10 text-xs px-2"
            onClick={handleGoogle}
            disabled={!!socialLoading}
            title="Google로 로그인"
          >
            {socialLoading === "google"
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <GoogleIcon />}
            <span className="hidden sm:inline">Google</span>
          </Button>

          {/* 카카오 */}
          <Button
            type="button"
            className="h-10 gap-1.5 bg-[#FEE500] text-[#3C1E1E] hover:bg-[#F5DC00] text-xs px-2"
            onClick={handleKakao}
            disabled={!!socialLoading}
            title="카카오로 로그인"
          >
            {socialLoading === "kakao"
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <KakaoIcon />}
            <span className="hidden sm:inline">카카오</span>
          </Button>

          {/* 네이버 */}
          <Button
            type="button"
            className="h-10 gap-1.5 bg-[#03C75A] text-white hover:bg-[#02b350] text-xs px-2"
            onClick={handleNaver}
            disabled={!!socialLoading}
            title="네이버로 로그인"
          >
            {socialLoading === "naver"
              ? <Loader2 className="h-4 w-4 animate-spin text-white" />
              : <NaverIcon />}
            <span className="hidden sm:inline">네이버</span>
          </Button>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          계정이 없으신가요?{" "}
          <Link href="/signup" className="text-jade hover:underline">회원가입</Link>
        </p>
      </div>
    </div>
  );
}
