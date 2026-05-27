import { api } from "./client";

// ─── 타입 ───────────────────────────────────────────────────

export interface ProductItem {
  product_id: string;
  product_name: string;
  price: number;         // 원
  commission_rate: number; // %
  product_url: string;
  thumbnail: string | null;
  category: string | null;
  brand: string | null;
}

export interface ProductSearchResponse {
  items: ProductItem[];
  total: number;
  keyword: string;
}

export interface TrackingUrlResponse {
  tracking_url: string;
  commission_rate: number;
  product_name: string;
  log_id: string;
}

export interface StatsItem {
  log_id: string;
  product_id: string | null;
  product_name: string | null;
  tracking_url: string | null;
  commission_rate: number;
  click_count: number;
  conversion_count: number;
  estimated_revenue: number;
  logged_at: string;
}

export interface CommerceSummary {
  total_clicks: number;
  total_conversions: number;
  total_revenue: number;
  active_products: number;
  period_days: number;
}

// ─── API 함수 ────────────────────────────────────────────────

export const commerceApi = {
  search: (params: {
    keyword: string;
    limit?: number;
    account_id?: string;
    category_id?: string;
  }) =>
    api.post<ProductSearchResponse>("/api/commerce/naver-shopping/search", {
      keyword:     params.keyword,
      limit:       params.limit ?? 10,
      account_id:  params.account_id,
      category_id: params.category_id,
    }),

  generateLink: (params: {
    video_id: string;
    product_id: string;
    account_id?: string;
    sub_id?: string;
  }) =>
    api.post<TrackingUrlResponse>("/api/commerce/naver-shopping/link", params),

  getStats: (params: { from: string; to: string; account_id?: string }) => {
    const qs = new URLSearchParams({
      from: params.from,
      to: params.to,
      ...(params.account_id ? { account_id: params.account_id } : {}),
    }).toString();
    return api.get<StatsItem[]>(`/api/commerce/naver-shopping/stats?${qs}`);
  },

  getSummary: (days?: number) => {
    const qs = days ? `?days=${days}` : "";
    return api.get<CommerceSummary>(`/api/commerce/summary${qs}`);
  },
};
