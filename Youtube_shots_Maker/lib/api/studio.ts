import { api } from "./client";

export interface Script {
  id: string;
  user_id: string;
  video_id: string;
  raw_stt: string | null;
  stt_segments: unknown[] | null;
  stt_task_id: string | null;
  adapted_script: string | null;
  adapt_task_id: string | null;
  bgm_path: string | null;
  vocals_path: string | null;
  separate_task_id: string | null;
  bgm_preserved: boolean;
  tts_audio_path: string | null;
  tts_voice_id: string | null;
  tts_task_id: string | null;
  final_video_path: string | null;
  subtitle_style: Record<string, unknown> | null;
  render_task_id: string | null;
  status: string;
  error_msg: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskResponse {
  task_id: string;
  script_id: string;
  status: string;
  message: string;
}

export interface TaskStatus {
  task_id: string;
  script_id: string | null;
  status: string;
  progress: number;
  result?: Record<string, unknown>;
  error?: string;
}

export const studioApi = {
  // Scripts
  createScript: (video_id: string) =>
    api.post<Script>("/api/studio/scripts", { video_id }),

  listScripts: (video_id?: string) => {
    const qs = video_id ? `?video_id=${video_id}` : "";
    return api.get<Script[]>(`/api/studio/scripts${qs}`);
  },

  getScript: (script_id: string) =>
    api.get<Script>(`/api/studio/scripts/${script_id}`),

  updateScript: (script_id: string, adapted_script: string) =>
    api.put<Script>(`/api/studio/scripts/${script_id}`, { adapted_script }),

  // Pipeline tasks
  transcribe: (video_id: string) =>
    api.post<TaskResponse>("/api/studio/transcribe", { video_id }),

  separate: (video_id: string) =>
    api.post<TaskResponse>("/api/studio/separate", { video_id }),

  adapt: (script_id: string, track: string, tone?: string) =>
    api.post<TaskResponse>("/api/studio/adapt", { script_id, track, tone }),

  synthesizeTTS: (script_id: string, voice: string, voice_id: string) =>
    api.post<TaskResponse>("/api/studio/synthesize-tts", {
      script_id, voice, voice_id,
    }),

  render: (script_id: string, font?: string, subtitle_style?: Record<string, unknown>) =>
    api.post<TaskResponse>("/api/studio/render", {
      script_id, font: font ?? "NotoSansKR", subtitle_style,
    }),

  // Task status
  taskStatus: (task_id: string) =>
    api.get<TaskStatus>(`/api/studio/task/${task_id}`),

  // Voices
  voices: () =>
    api.get<{ provider: string; voices: { id: string; name: string; gender: string }[] }[]>(
      "/api/studio/voices"
    ),
};
