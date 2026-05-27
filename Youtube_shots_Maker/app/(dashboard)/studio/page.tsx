"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Mic, Scissors, Wand2, Volume2, Film, ChevronRight,
  Loader2, CheckCircle2, XCircle, Play, Pause,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { sourcingApi, type VideoItem } from "@/lib/api/sourcing";
import { studioApi, type Script } from "@/lib/api/studio";

type Step = "stt" | "separate" | "adapt" | "tts" | "render";

const STEPS: { id: Step; label: string; icon: React.ElementType }[] = [
  { id: "stt",      label: "STT 전사",    icon: Mic      },
  { id: "separate", label: "음원 분리",    icon: Scissors },
  { id: "adapt",    label: "대본 각색",    icon: Wand2    },
  { id: "tts",      label: "TTS 합성",    icon: Volume2  },
  { id: "render",   label: "최종 렌더링",  icon: Film     },
];

const STATUS_TO_STEP: Record<string, Step | null> = {
  created:      null,
  transcribing: "stt",      transcribed: "stt",
  separating:   "separate", separated:   "separate",
  adapting:     "adapt",    adapted:     "adapt",
  synthesizing: "tts",      synthesized: "tts",
  rendering:    "render",   ready:       "render",
  failed:       null,
};

const DONE_STATUSES = ["transcribed", "separated", "adapted", "synthesized", "ready"];

export default function StudioPage() {
  const queryClient = useQueryClient();
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);
  const [script,        setScript]        = useState<Script | null>(null);
  const [editedScript,  setEditedScript]  = useState("");
  const [track,         setTrack]         = useState("A");
  const [voiceId,       setVoiceId]       = useState("ko-female-1");
  const [taskId,        setTaskId]        = useState<string | null>(null);
  const [playing,       setPlaying]       = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // 다운로드 완료 영상 목록
  const { data: videos = [] } = useQuery({
    queryKey: ["videos"],
    queryFn: () => sourcingApi.listVideos(),
    select: (d) => d.filter((v) => v.file_path),
  });

  // 보이스 목록
  const { data: voices = [] } = useQuery({
    queryKey: ["voices"],
    queryFn: studioApi.voices,
  });
  const edgeTtsVoices = voices.find((v) => v.provider === "edge-tts")?.voices ?? [];

  // 스크립트 로드
  useEffect(() => {
    if (!selectedVideo) return;
    studioApi.listScripts(selectedVideo.id).then((list) => {
      const s = list[0];
      if (s) {
        setScript(s);
        setEditedScript(s.adapted_script ?? "");
      } else {
        setScript(null);
        setEditedScript("");
      }
    });
  }, [selectedVideo]);

  // 태스크 폴링
  useEffect(() => {
    if (!taskId) return;
    const interval = setInterval(async () => {
      const status = await studioApi.taskStatus(taskId);
      if (status.status === "done" || status.status === "failed") {
        clearInterval(interval);
        setTaskId(null);
        if (selectedVideo) {
          const list = await studioApi.listScripts(selectedVideo.id);
          if (list[0]) {
            setScript(list[0]);
            setEditedScript(list[0].adapted_script ?? "");
          }
        }
        if (status.status === "done") toast.success("완료되었습니다!");
        else toast.error(`실패: ${status.error}`);
        queryClient.invalidateQueries({ queryKey: ["scripts"] });
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [taskId, selectedVideo, queryClient]);

  const runStep = async (step: Step) => {
    if (!selectedVideo) return;
    try {
      let res;
      if (step === "stt") {
        res = await studioApi.transcribe(selectedVideo.id);
      } else if (step === "separate") {
        res = await studioApi.separate(selectedVideo.id);
      } else if (step === "adapt") {
        if (!script) return;
        // 편집된 스크립트 먼저 저장
        if (editedScript !== script.adapted_script && script.adapted_script) {
          await studioApi.updateScript(script.id, editedScript);
        }
        res = await studioApi.adapt(script.id, track);
      } else if (step === "tts") {
        if (!script) return;
        res = await studioApi.synthesizeTTS(script.id, "edge-tts", voiceId);
      } else if (step === "render") {
        if (!script) return;
        res = await studioApi.render(script.id);
      } else return;

      setTaskId(res.task_id);
      toast.info(`${STEPS.find((s) => s.id === step)?.label} 시작됨`);
    } catch (e: unknown) {
      toast.error((e as Error).message);
    }
  };

  const saveScript = async () => {
    if (!script) return;
    await studioApi.updateScript(script.id, editedScript);
    toast.success("저장되었습니다.");
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (playing) { videoRef.current.pause(); setPlaying(false); }
    else          { videoRef.current.play();  setPlaying(true);  }
  };

  const completedSteps = DONE_STATUSES.filter((s) =>
    script?.status === s ||
    DONE_STATUSES.indexOf(script?.status ?? "") >
    DONE_STATUSES.indexOf(s)
  );

  return (
    <div className="flex h-full">
      {/* 영상 목록 사이드바 */}
      <div className="w-56 shrink-0 border-r border-border overflow-y-auto">
        <div className="p-4 border-b border-border">
          <h2 className="font-heading text-lg">영상 목록</h2>
          <p className="text-xs text-muted-foreground">{videos.length}개</p>
        </div>
        <ul className="p-2 space-y-1">
          {videos.map((v) => (
            <li key={v.id}>
              <button
                onClick={() => setSelectedVideo(v)}
                className={`w-full text-left rounded-md p-2 text-sm transition-colors ${
                  selectedVideo?.id === v.id
                    ? "bg-denim/20 text-denim"
                    : "hover:bg-muted text-muted-foreground"
                }`}
              >
                <p className="truncate text-xs leading-tight">
                  {v.title_cn || "제목 없음"}
                </p>
                <div className="flex gap-1 mt-1">
                  <Badge
                    variant={v.platform === "douyin" ? "coral" : "secondary"}
                    className="text-[9px] px-1 py-0"
                  >
                    {v.platform === "douyin" ? "DY" : "XHS"}
                  </Badge>
                  <Badge variant="gray" className="text-[9px] px-1 py-0">
                    {v.track}
                  </Badge>
                </div>
              </button>
            </li>
          ))}
          {videos.length === 0 && (
            <li className="p-4 text-xs text-muted-foreground text-center">
              Target Finder에서 먼저 영상을 다운로드하세요
            </li>
          )}
        </ul>
      </div>

      {/* 메인 에디터 */}
      {!selectedVideo ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <Film className="h-16 w-16 mx-auto mb-4 opacity-20" />
            <p>영상을 선택하여 AI 변환을 시작하세요</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <h1 className="font-heading text-3xl">{selectedVideo.title_cn || "영상 편집"}</h1>

          {/* 파이프라인 스텝 */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {STEPS.map(({ id, label, icon: Icon }, i) => {
              const stepStatus = script?.status;
              const isDone = DONE_STATUSES.includes(stepStatus ?? "") &&
                DONE_STATUSES.indexOf(stepStatus ?? "") >=
                ["transcribed","separated","adapted","synthesized","ready"].indexOf(
                  id === "stt" ? "transcribed" :
                  id === "separate" ? "separated" :
                  id === "adapt" ? "adapted" :
                  id === "tts" ? "synthesized" : "ready"
                );
              const isActive = STATUS_TO_STEP[stepStatus ?? ""] === id;
              const isRunning = taskId && isActive;

              return (
                <div key={id} className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => runStep(id)}
                    disabled={!!taskId}
                    className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium border transition-colors ${
                      isDone
                        ? "border-jade bg-jade/10 text-jade"
                        : isRunning
                        ? "border-amber bg-amber/10 text-amber"
                        : "border-border text-muted-foreground hover:border-denim hover:text-denim"
                    }`}
                  >
                    {isRunning ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : isDone ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : (
                      <Icon className="h-3.5 w-3.5" />
                    )}
                    {label}
                  </button>
                  {i < STEPS.length - 1 && (
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                </div>
              );
            })}
          </div>

          {/* 진행 중 표시 */}
          {taskId && (
            <div className="flex items-center gap-3 rounded-lg bg-amber/10 border border-amber/30 p-3">
              <Loader2 className="h-4 w-4 animate-spin text-amber shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium">처리 중...</p>
                <Progress value={undefined} className="h-1 mt-1" />
              </div>
            </div>
          )}

          {/* 2단 레이아웃: 비디오 | 대본 */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* 원본 비디오 플레이어 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">원본 영상</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="aspect-video rounded-md overflow-hidden bg-black relative">
                  <video
                    ref={videoRef}
                    className="h-full w-full"
                    onEnded={() => setPlaying(false)}
                    // 실제 signed URL은 별도 API로 받아야 함 (시연용)
                    src=""
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <button
                      onClick={togglePlay}
                      className="rounded-full bg-black/50 p-3 hover:bg-black/70 transition-colors"
                    >
                      {playing
                        ? <Pause className="h-6 w-6 text-white" />
                        : <Play  className="h-6 w-6 text-white" />
                      }
                    </button>
                  </div>
                </div>
                <div className="mt-2 flex gap-2 text-xs text-muted-foreground">
                  <Badge variant={selectedVideo.platform === "douyin" ? "coral" : "secondary"}>
                    {selectedVideo.platform === "douyin" ? "도우인" : "샤오홍수"}
                  </Badge>
                  <span>바이럴 {selectedVideo.viral_score}점</span>
                </div>
              </CardContent>
            </Card>

            {/* 대본 에디터 */}
            <Card>
              <CardHeader className="pb-2 flex-row items-center justify-between">
                <CardTitle className="text-sm">AI 각색 대본</CardTitle>
                <div className="flex items-center gap-2">
                  <Select value={track} onValueChange={setTrack}>
                    <SelectTrigger className="h-7 w-28 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A">Track A</SelectItem>
                      <SelectItem value="B">Track B</SelectItem>
                      <SelectItem value="D">Track D</SelectItem>
                    </SelectContent>
                  </Select>
                  {script && (
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={saveScript}>
                      저장
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* STT 원문 */}
                {script?.raw_stt && (
                  <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground max-h-24 overflow-y-auto">
                    <p className="font-medium mb-1 text-foreground">STT 원문 (중국어)</p>
                    {script.raw_stt}
                  </div>
                )}

                {/* 각색 대본 편집기 */}
                <Textarea
                  value={editedScript}
                  onChange={(e) => setEditedScript(e.target.value)}
                  placeholder={
                    script?.status === "created" || !script
                      ? "STT 실행 후 자동으로 입력됩니다"
                      : "각색된 한국어 대본..."
                  }
                  className="min-h-[200px] text-sm resize-none"
                />

                {/* TTS 보이스 선택 */}
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted-foreground shrink-0">TTS 보이스</label>
                  <Select value={voiceId} onValueChange={setVoiceId}>
                    <SelectTrigger className="h-8 text-xs flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {edgeTtsVoices.map((v) => (
                        <SelectItem key={v.id} value={v.id} className="text-xs">
                          {v.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 최종 결과 */}
          {script?.final_video_path && (
            <Card className="border-jade/40">
              <CardContent className="py-4 flex items-center gap-4">
                <CheckCircle2 className="h-8 w-8 text-jade shrink-0" />
                <div>
                  <p className="font-medium text-jade">렌더링 완료!</p>
                  <p className="text-sm text-muted-foreground">
                    최종 영상이 준비되었습니다. Publisher에서 배포하세요.
                  </p>
                </div>
                <Button variant="jade" className="ml-auto" asChild>
                  <a href="/publisher">배포하러 가기 →</a>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* 에러 */}
          {script?.status === "failed" && (
            <Card className="border-coral/40">
              <CardContent className="py-4 flex items-center gap-4">
                <XCircle className="h-8 w-8 text-coral shrink-0" />
                <div>
                  <p className="font-medium text-coral">처리 실패</p>
                  <p className="text-sm text-muted-foreground">{script.error_msg}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
