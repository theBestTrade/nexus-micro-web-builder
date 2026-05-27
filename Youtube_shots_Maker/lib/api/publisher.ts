import { api } from "./client";

// ─── 타입 ───────────────────────────────────────────────────

export interface PublishTarget {
  account_id: string;
  scheduled_at?: string; // ISO 8601
}

export interface SchedulePublishRequest {
  script_id: string;
  publish_targets: PublishTarget[];
  commerce_link?: string;
  proxy_id?: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface GeoMetadata {
  title: string;
  description: string;
  tags: string[];
  context_summary: string;
  faq_schema: FaqItem[];
}

export type JobStatus =
  | "pending"
  | "scheduled"
  | "uploading"
  | "published"
  | "failed";

export interface PublishJob {
  id: string;
  video_id: string | null;
  script_id: string | null;
  publish_account_id: string | null;
  scheduled_at: string | null;
  published_at: string | null;
  status: JobStatus;
  platform_video_id: string | null;
  commerce_link: string | null;
  geo_metadata: GeoMetadata | null;
  error_msg: string | null;
  created_at: string;
  account_alias: string | null;
  account_platform: string | null;
  account_display_name: string | null;
}

// ─── API 함수 ────────────────────────────────────────────────

export const publisherApi = {
  schedule: (body: SchedulePublishRequest) =>
    api.post<{ job_ids: string[] }>("/api/publisher/schedule", body),

  listJobs: (account_id?: string) => {
    const qs = account_id ? `?account_id=${account_id}` : "";
    return api.get<PublishJob[]>(`/api/publisher/jobs${qs}`);
  },

  geoMetadata: (script_id: string) =>
    api.post<GeoMetadata>("/api/publisher/geo-metadata", { script_id }),
};
