import { api } from "./client";

// ─── 타입 ───────────────────────────────────────────────────

export type BlogStyle = "review" | "info" | "story";

export type BlogStatus =
  | "draft"
  | "generating"
  | "ready"
  | "publishing"
  | "published"
  | "failed";

export interface CommerceLinks {
  coupang?: string;
  smartstore?: string;
  naver_shopping?: string;
}

export interface BlogPost {
  id: string;
  user_id: string;
  video_id: string | null;
  script_id: string | null;
  publish_account_id: string | null;
  title_ko: string;
  body_html: string;
  thumbnail_path: string | null;
  tags: string[] | null;
  commerce_links: CommerceLinks | null;
  naver_post_url: string | null;
  status: BlogStatus;
  generate_task_id: string | null;
  publish_task_id: string | null;
  error_msg: string | null;
  published_at: string | null;
  created_at: string;
  account_alias: string | null;
  account_display_name: string | null;
}

export interface BlogJobItem {
  blog_post_id: string;
  title_ko: string;
  status: BlogStatus;
  naver_post_url: string | null;
  published_at: string | null;
  error_msg: string | null;
  account_alias: string | null;
  account_display_name: string | null;
}

export interface BlogTaskResponse {
  task_id: string;
  blog_post_id: string;
  status: string;
  message: string;
}

export interface BlogTaskStatus {
  task_id: string;
  blog_post_id: string | null;
  status: string;
  progress: number;
  result?: Record<string, unknown>;
  error?: string;
}

export interface GenerateRequest {
  video_id: string;
  script_id?: string;
  style?: BlogStyle;
  commerce_link?: string;
}

export interface PublishRequest {
  blog_post_id: string;
  account_id: string;
  scheduled_at?: string;
  proxy_id?: string;
}

export interface UpdateRequest {
  title_ko?: string;
  body_html?: string;
  tags?: string[];
  commerce_links?: CommerceLinks;
  publish_account_id?: string;
}

// ─── API 함수 ────────────────────────────────────────────────

export const blogApi = {
  generate: (body: GenerateRequest) =>
    api.post<BlogTaskResponse>("/api/blog/generate", body),

  listPosts: (params?: { video_id?: string; status?: BlogStatus }) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params ?? {}).filter(([, v]) => v))
    ).toString();
    return api.get<BlogPost[]>(`/api/blog/posts${qs ? `?${qs}` : ""}`);
  },

  preview: (blog_post_id: string) =>
    api.get<BlogPost>(`/api/blog/preview/${blog_post_id}`),

  update: (blog_post_id: string, body: UpdateRequest) =>
    api.put<BlogPost>(`/api/blog/${blog_post_id}`, body),

  publish: (body: PublishRequest) =>
    api.post<BlogTaskResponse>("/api/blog/publish", body),

  listJobs: (account_id?: string) => {
    const qs = account_id ? `?account_id=${account_id}` : "";
    return api.get<BlogJobItem[]>(`/api/blog/jobs${qs}`);
  },

  taskStatus: (task_id: string) =>
    api.get<BlogTaskStatus>(`/api/blog/task/${task_id}`),
};
