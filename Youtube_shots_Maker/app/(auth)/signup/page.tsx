"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Zap, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router   = useRouter();
  const supabase = createClient();
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [loading,  setLoading]  = useState(false);

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
        options: { emailRedirectTo: `${location.origin}/dashboard` },
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
        <p className="text-sm text-muted-foreground text-center mb-8">
          무료 계정을 만들어 시작하세요
        </p>

        <form onSubmit={handleSignup} className="space-y-4">
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
              placeholder="8자 이상"
              minLength={8}
              required
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">비밀번호 확인</label>
            <Input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="비밀번호 재입력"
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            회원가입
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          이미 계정이 있으신가요?{" "}
          <Link href="/login" className="text-jade hover:underline">
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
}
