import { NextResponse } from "next/server";

export async function GET() {
  const clientId    = process.env.NAVER_CLIENT_ID!;
  const callbackUrl = process.env.NAVER_CALLBACK_URL!;
  const state       = crypto.randomUUID();

  const params = new URLSearchParams({
    response_type: "code",
    client_id:     clientId,
    redirect_uri:  callbackUrl,
    state,
  });

  const res = NextResponse.redirect(
    `https://nid.naver.com/oauth2.0/authorize?${params.toString()}`
  );

  // CSRF 방지용 state 쿠키 (1분)
  res.cookies.set("naver_oauth_state", state, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    maxAge:   60,
    path:     "/",
  });

  return res;
}
