import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // Supabase 공식 권장 패턴:
  // supabaseResponse 를 한 번만 생성하고 cookies.setAll 에서 재사용
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // 1) 요청 쿠키에도 반영 (동일 미들웨어 체인에서 재사용 가능하도록)
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          // 2) 응답 쿠키에 세팅 — supabaseResponse 재생성 없이 직접 추가
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // ⚠️ getUser()는 매 요청마다 Supabase Auth 서버에 검증 요청을 보냄
  // (캐시 없이 항상 최신 세션 상태 확인)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // 보호된 경로 목록
  const protectedPaths = [
    "/dashboard",
    "/sourcing",
    "/studio",
    "/publisher",
    "/settings",
  ];
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));

  // 미인증 → 로그인 페이지로
  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // 이미 로그인 상태에서 auth 페이지 접근 → 대시보드로
  if (user && (pathname === "/login" || pathname === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // 세션 쿠키가 업데이트된 supabaseResponse 를 반드시 반환
  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * 아래 경로는 미들웨어에서 제외:
     * - _next/static (정적 파일)
     * - _next/image (이미지 최적화)
     * - favicon.ico
     * - 이미지 확장자
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
