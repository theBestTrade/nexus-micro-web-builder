import { api } from "./client";

export type Platform =
  | "douyin" | "xiaohongshu"
  | "youtube" | "instagram" | "tiktok" | "naver_blog"
  | "naver_shopping_connect" | "coupang_partners" | "smartstore";

export type HealthStatus =
  | "unknown" | "healthy" | "cookie_expired" | "token_expired" | "banned" | "error";

export interface Account {
  id: string;
  platform: Platform;
  alias: string;
  display_name: string | null;
  avatar_url: string | null;
  platform_account_id: string | null;
  partner_id: string | null;
  affiliate_url: string | null;
  is_default: boolean;
  is_active: boolean;
  health_status: HealthStatus;
  last_used_at: string | null;
  created_at: string;
}

export interface CreateAccountBody {
  platform: Platform;
  alias: string;
  login_id?: string;
  login_pw?: string;
  access_token?: string;
  refresh_token?: string;
  platform_account_id?: string;
  display_name?: string;
  partner_id?: string;
  affiliate_url?: string;
  is_default?: boolean;
}

export const accountsApi = {
  list: (platform?: Platform) => {
    const qs = platform ? `?platform=${platform}` : "";
    return api.get<Account[]>(`/api/accounts${qs}`);
  },

  create: (body: CreateAccountBody) =>
    api.post<Account>("/api/accounts", body),

  update: (id: string, body: Partial<CreateAccountBody & { is_active: boolean }>) =>
    api.put<Account>(`/api/accounts/${id}`, body),

  delete: (id: string) =>
    api.delete<void>(`/api/accounts/${id}`),

  setDefault: (id: string) =>
    api.post<Account>(`/api/accounts/${id}/set-default`, {}),

  test: (id: string) =>
    api.post<{ success: boolean; health_status: string; error?: string }>(
      `/api/accounts/${id}/test`, {}
    ),

  refreshCookie: (id: string) =>
    api.post<{ success: boolean; expires_at?: string }>(
      `/api/accounts/${id}/cookie/refresh`, {}
    ),

  cookieStatus: (id: string) =>
    api.get<{ refreshed_at: string; expires_at: string; health_status: string }>(
      `/api/accounts/${id}/cookie`
    ),
};

// ─── OAuth API ─────────────────────────────────────────────────

export type OAuthPlatform = "youtube" | "instagram" | "tiktok";

export const oauthApi = {
  /** OAuth 인증 URL 조회. 반환된 auth_url 을 팝업으로 열어 OAuth 흐름 시작. */
  getAuthorizeUrl: (platform: OAuthPlatform, alias: string) =>
    api.get<{ auth_url: string }>(
      `/api/accounts/oauth/${platform}/authorize?alias=${encodeURIComponent(alias)}`
    ),

  /** access_token 재발급 (refresh_token 사용). */
  refreshToken: (platform: OAuthPlatform, accountId: string) =>
    api.post<{
      success: boolean;
      account_id: string;
      token_expires_at: string;
      platform: string;
    }>(
      `/api/accounts/oauth/${platform}/refresh?account_id=${accountId}`,
      {}
    ),
};
