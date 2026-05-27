"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Zap, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

/* ── 소셜 아이콘 (login/page.tsx와 동일) ─────────────── */
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

export default function SignupPage() {
  const router   = useRouter();
  const supabase = createClient();
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [loading,  setLoading]  = useState(false);
  const [socialLoading, setSocialLoading] = useState<"google"|"kakao"|"naver"|null>(null);

  /* ── 이메일 가입 ─────────────────────────────────────── */
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { toast.error("비밀번호가 일치하지 않습니다."); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: `${location.origin}/auth/callback?next=/dashboard` },
      });
      if (error) throw error;
      toast.success("가입 완료! 이메일 인증 후 로그인하세요.");
      router.push("/login");
    } catch (err: unknown) {
      toast.error((err as Error).message || "회원가입 실패");
    } finally {
      setLoading(false);
    }
  };

  /* ── 구글 ───────────────────────────────────────────── */
  const handleGoogle = async () => {
    setSocialLoading("google");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options:  { redirectTo: `${location.origin}/auth/callback?next=/dashboard` },
    });
    if (error) { toast.error(error.message); setSocialLoading(null); }
  };

  /* ── 카카오 ─────────────────────────────────────────── */
  const handleKakao = async () => {
    setSocialLoading("kakao");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "kakao",
      options:  { redirectTo: `${location.origin}/auth/callback?next=/dashboard` },
    });
    if (error) { toast.error(error.message); setSocialLoading(null); }
  };

  /* ── 네이버 ─────────────────────────────────────────── */
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

        <h1 className="text-2xl font-semibold text-center mb-1">회원가입</h1>
        <p className="text-sm text-muted-foreground text-center mb-8">무료 계정을 만들어 시작하세요</p>

        {/* ── 소셜 가입 버튼 3개 ── */}
        <div className="space-y-2 mb-4">
          {/* 구글 */}
          <Button
            type="button" variant="outline"
            className="w-full gap-2 border-white/10 bg-white/5 hover:bg-white/10"
            onClick={handleGoogle} disabled={!!socialLoading}
          >
            {socialLoading === "google" ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
            Google로 시작하기
          </Button>

          {/* 카카오 */}
          <Button
            type="button"
            className="w-full gap-2 bg-[#FEE500] text-[#3C1E1E] hover:bg-[#F5DC00]"
            onClick={handleKakao} disabled={!!socialLoading}
          >
            {socialLoading === "kakao" ? <Loader2 className="h-4 w-4 animate-spin" /> : <KakaoIcon />}
            카카오로 시작하기
          </Button>

          {/* 네이버 */}
          <Button
            type="button"
            className="w-full gap-2 bg-[#03C75A] text-white hover:bg-[#02b350]"
            onClick={handleNaver} disabled={!!socialLoading}
          >
            {socialLoading === "naver" ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : <NaverIcon />}
            네이버로 시작하기
          </Button>
        </div>

        {/* 구분선 */}
        <div className="relative mb-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-white/10" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-surface px-2 text-muted-foreground">또는 이메일로</span>
          </div>
        </div>

        {/* 이메일 가입 폼 */}
        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">이메일</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com" required />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">비밀번호</label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="8자 이상" minLength={8} required />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">비밀번호 확인</label>
            <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
              placeholder="비밀번호 재입력" required />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            회원가입
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          이미 계정이 있으신가요?{" "}
          <Link href="/login" className="text-jade hover:underline">로그인</Link>
        </p>
      </div>
    </div>
  );
}
