import { api } from "./client";

export interface VideoItem {
  id: string;
  platform: "douyin" | "xiaohongshu";
  track: "A" | "B" | "D";
  original_url: string;
  title_cn: string;
  thumbnail_url: string;
  likes: number;
  shares: number;
  comments: number;
  viral_score: number;
  duration_sec: number;
  status: string;
  file_path: string | null;
  download_task_id: string | null;
  created_at: string;
}

export interface SearchRequest {
  keyword: string;
  platform: "douyin" | "xiaohongshu";
  track: "A" | "B" | "D";
  limit?: number;
  account_id?: string;
  proxy_id?: string;
}

export interface TaskStatus {
  task_id: string;
  status: string;
  progress: number;
  result?: Record<string, unknown>;
  error?: string;
}

export const sourcingApi = {
  search: (body: SearchRequest) =>
    api.post<VideoItem[]>("/api/sourcing/search", body),

  download: (video_id: string, account_id?: string, proxy_id?: string) =>
    api.post<{ task_id: string; status: string }>("/api/sourcing/download", {
      video_id, account_id, proxy_id,
    }),

  taskStatus: (task_id: string) =>
    api.get<TaskStatus>(`/api/sourcing/status/${task_id}`),

  listVideos: (params?: { platform?: string; track?: string; status?: string }) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params ?? {}).filter(([, v]) => v))
    ).toString();
    return api.get<VideoItem[]>(`/api/sourcing/videos${qs ? `?${qs}` : ""}`);
  },
};
