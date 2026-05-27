import { api } from "./client";

// ─── 타입 ───────────────────────────────────────────────────

export type ProxyType = "http" | "https" | "socks5";

export interface ProxyItem {
  id: string;
  user_id: string;
  proxy_url_masked: string;   // 패스워드 마스킹됨
  proxy_type: ProxyType;
  label: string | null;
  is_active: boolean;
  last_used_at: string | null;
  fail_count: number;
  created_at: string;
}

export interface AddProxyRequest {
  proxy_url: string;           // 실제 URL (패스워드 포함)
  proxy_type: ProxyType;
  label?: string;
}

export interface TestProxyResult {
  success: boolean;
  latency_ms?: number;
  error?: string;
}

// ─── API 함수 ────────────────────────────────────────────────

export const proxyApi = {
  list: () =>
    api.get<ProxyItem[]>("/api/proxy/list"),

  add: (body: AddProxyRequest) =>
    api.post<ProxyItem>("/api/proxy/add", body),

  delete: (proxy_id: string) =>
    api.delete<void>(`/api/proxy/${proxy_id}`),

  test: (proxy_id: string, target_url?: string) =>
    api.post<TestProxyResult>("/api/proxy/test", {
      proxy_id,
      target_url: target_url ?? "https://www.google.com",
    }),
};
