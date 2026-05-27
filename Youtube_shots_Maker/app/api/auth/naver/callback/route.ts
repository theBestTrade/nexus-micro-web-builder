import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code  = searchParams.get("code");
  const state = searchParams.get("state");

  // CSRF 검증
  const savedState = request.cookies.get("naver_oauth_state")?.value;
  if (!code || !state || state !== savedState) {
    return NextResponse.redirect(`${origin}/login?error=invalid_state`);
  }

  try {
    // 1. 액세스 토큰 교환
    const tokenRes = await fetch("https://nid.naver.com/oauth2.0/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type:    "authorization_code",
        client_id:     process.env.NAVER_CLIENT_ID!,
        client_secret: process.env.NAVER_CLIENT_SECRET!,
        redirect_uri:  process.env.NAVER_CALLBACK_URL!,
        code,
        state,
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) throw new Error("토큰 발급 실패");

    // 2. 네이버 프로필 조회
    const profileRes = await fetch("https://openapi.naver.com/v1/nid/me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profileData = await profileRes.json();
    const naverUser   = profileData.response as {
      id: string;
      email: string;
      name: string;
      profile_image: string;
      nickname: string;
    };

    if (!naverUser?.email) throw new Error("이메일을 가져올 수 없습니다.");

    // 3. Supabase 유저 upsert (없으면 생성, 있으면 메타데이터 업데이트)
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existing = existingUsers.users.find((u) => u.email === naverUser.email);

    if (existing) {
      await supabaseAdmin.auth.admin.updateUserById(existing.id, {
        user_metadata: {
          full_name:   naverUser.name || naverUser.nickname,
          avatar_url:  naverUser.profile_image,
          provider:    "naver",
          naver_id:    naverUser.id,
        },
      });
    } else {
      await supabaseAdmin.auth.admin.createUser({
        email:         naverUser.email,
        email_confirm: true,
        user_metadata: {
          full_name:  naverUser.name || naverUser.nickname,
          avatar_url: naverUser.profile_image,
          provider:   "naver",
          naver_id:   naverUser.id,
        },
      });
    }

    // 4. 매직링크 생성 → 자동 로그인 (이메일 전송 없이 즉시 리다이렉트)
    const { data: linkData, error: linkError } =
      await supabaseAdmin.auth.admin.generateLink({
        type:       "magiclink",
        email:      naverUser.email,
        options:    { redirectTo: `${origin}/dashboard` },
      });

    if (linkError || !linkData.properties?.action_link) {
      throw new Error(linkError?.message || "세션 생성 실패");
    }

    // state 쿠키 삭제 후 자동 로그인 URL로 리다이렉트
    const res = NextResponse.redirect(linkData.properties.action_link);
    res.cookies.delete("naver_oauth_state");
    return res;

  } catch (err) {
    console.error("[Naver OAuth]", err);
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent((err as Error).message)}`
    );
  }
}
