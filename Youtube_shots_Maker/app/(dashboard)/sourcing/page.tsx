"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Download, Loader2, Heart, Share2, MessageCircle, Flame } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { sourcingApi, type VideoItem } from "@/lib/api/sourcing";
import { formatNumber } from "@/lib/utils";

type Platform = "douyin" | "xiaohongshu";
type Track    = "A" | "B" | "D";

const TRACK_INFO: Record<Track, { label: string; desc: string; variant: "blue" | "amber" | "jade" }> = {
  A: { label: "Track A", desc: "중드 리컷 쇼츠",    variant: "blue"  },
  B: { label: "Track B", desc: "쇼핑 리뷰",          variant: "amber" },
  D: { label: "Track D", desc: "네이버 블로그",       variant: "jade"  },
};

export default function SourcingPage() {
  const queryClient = useQueryClient();
  const [platform, setPlatform] = useState<Platform>("douyin");
  const [track,    setTrack]    = useState<Track>("A");
  const [keyword,  setKeyword]  = useState("");
  const [results,  setResults]  = useState<VideoItem[]>([]);
  const [downloading, setDownloading] = useState<Record<string, string>>({});

  // 기존 영상 목록
  const { data: myVideos = [] } = useQuery({
    queryKey: ["videos"],
    queryFn: () => sourcingApi.listVideos(),
  });

  // 검색
  const searchMutation = useMutation({
    mutationFn: () =>
      sourcingApi.search({ keyword, platform, track, limit: 20 }),
    onSuccess: (data) => {
      setResults(data);
      if (data.length === 0) toast.info("검색 결과가 없습니다.");
      else toast.success(`${data.length}개 영상 발견`);
    },
    onError: (e: Error) => toast.error(`검색 실패: ${e.message}`),
  });

  // 다운로드
  const downloadMutation = useMutation({
    mutationFn: (video_id: string) => sourcingApi.download(video_id),
    onSuccess: (data, video_id) => {
      setDownloading((prev) => ({ ...prev, [video_id]: data.task_id }));
      toast.success("다운로드 큐에 추가되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["videos"] });
      // 폴링
      pollTask(video_id, data.task_id);
    },
    onError: (e: Error) => toast.error(`다운로드 실패: ${e.message}`),
  });

  const pollTask = (video_id: string, task_id: string) => {
    const interval = setInterval(async () => {
      try {
        const status = await sourcingApi.taskStatus(task_id);
        if (status.status === "done") {
          clearInterval(interval);
          setDownloading((prev) => {
            const n = { ...prev };
            delete n[video_id];
            return n;
          });
          toast.success("다운로드 완료!");
          queryClient.invalidateQueries({ queryKey: ["videos"] });
        } else if (status.status === "failed") {
          clearInterval(interval);
          setDownloading((prev) => { const n = { ...prev }; delete n[video_id]; return n; });
          toast.error(`다운로드 실패: ${status.error}`);
        }
      } catch { clearInterval(interval); }
    }, 3000);
  };

  const alreadyDownloaded = (url: string) =>
    myVideos.some((v) => v.original_url === url && v.file_path);

  return (
    <div className="p-8 space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="font-heading text-4xl">TARGET FINDER</h1>
        <p className="text-muted-foreground text-sm mt-1">
          도우인·샤오홍수에서 바이럴 숏폼을 발굴하세요
        </p>
      </div>

      {/* 검색 컨트롤 */}
      <div className="flex flex-col gap-4 sm:flex-row">
        {/* 플랫폼 탭 */}
        <div className="flex rounded-lg border border-border overflow-hidden shrink-0">
          {(["douyin", "xiaohongshu"] as Platform[]).map((p) => (
            <button
              key={p}
              onClick={() => setPlatform(p)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                platform === p
                  ? p === "douyin"
                    ? "bg-coral text-white"
                    : "bg-pink-500 text-white"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {p === "douyin" ? "도우인 🎵" : "샤오홍수 📱"}
            </button>
          ))}
        </div>

        {/* Track 선택 */}
        <Select value={track} onValueChange={(v) => setTrack(v as Track)}>
          <SelectTrigger className="w-40 shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.entries(TRACK_INFO) as [Track, typeof TRACK_INFO[Track]][]).map(
              ([k, { label, desc }]) => (
                <SelectItem key={k} value={k}>
                  {label} — {desc}
                </SelectItem>
              )
            )}
          </SelectContent>
        </Select>

        {/* 키워드 입력 */}
        <div className="flex flex-1 gap-2">
          <Input
            placeholder="키워드 입력 (예: 드라마 클립, 뷰티 리뷰)"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && searchMutation.mutate()}
          />
          <Button
            onClick={() => searchMutation.mutate()}
            disabled={!keyword || searchMutation.isPending}
            className="shrink-0"
          >
            {searchMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            검색
          </Button>
        </div>
      </div>

      {/* Track 뱃지 필터 설명 */}
      <div className="flex gap-2">
        {(Object.entries(TRACK_INFO) as [Track, typeof TRACK_INFO[Track]][]).map(
          ([k, { label, desc, variant }]) => (
            <Badge
              key={k}
              variant={track === k ? variant : "outline"}
              className="cursor-pointer"
              onClick={() => setTrack(k)}
            >
              {label}: {desc}
            </Badge>
          )
        )}
      </div>

      {/* 검색 결과 */}
      {searchMutation.isPending && (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-jade" />
          <p>크롤링 중... 최대 30초 소요될 수 있습니다</p>
        </div>
      )}

      {!searchMutation.isPending && results.length > 0 && (
        <>
          <p className="text-sm text-muted-foreground">
            {results.length}개 발견 · 바이럴 스코어 기준 정렬
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {results.map((video) => (
              <VideoCard
                key={video.id}
                video={video}
                track={track}
                isDownloading={!!downloading[video.id]}
                isDownloaded={alreadyDownloaded(video.original_url)}
                onDownload={() => downloadMutation.mutate(video.id)}
              />
            ))}
          </div>
        </>
      )}

      {/* 내 영상 목록 */}
      {myVideos.length > 0 && results.length === 0 && !searchMutation.isPending && (
        <div>
          <h2 className="font-heading text-2xl mb-4">소싱된 영상 ({myVideos.length})</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {myVideos.map((video) => (
              <VideoCard
                key={video.id}
                video={video}
                track={video.track as Track}
                isDownloading={!!downloading[video.id]}
                isDownloaded={!!video.file_path}
                onDownload={() => downloadMutation.mutate(video.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function VideoCard({
  video, track, isDownloading, isDownloaded, onDownload,
}: {
  video: VideoItem;
  track: Track;
  isDownloading: boolean;
  isDownloaded: boolean;
  onDownload: () => void;
}) {
  const { variant } = TRACK_INFO[track] ?? TRACK_INFO.A;

  return (
    <Card className="overflow-hidden hover:border-jade/40 transition-colors">
      {/* 썸네일 */}
      <div className="relative aspect-video bg-muted">
        {video.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={video.thumbnail_url}
            alt={video.title_cn ?? ""}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-muted-foreground text-xs">
            썸네일 없음
          </div>
        )}
        {/* 바이럴 스코어 */}
        <div className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-xs text-white">
          <Flame className="h-3 w-3 text-orange-400" />
          {video.viral_score}
        </div>
        {/* Track 뱃지 */}
        <div className="absolute top-2 left-2">
          <Badge variant={variant} className="text-[10px]">Track {track}</Badge>
        </div>
      </div>

      <CardContent className="pt-3 pb-3 space-y-2">
        <p className="text-sm line-clamp-2 leading-tight">
          {video.title_cn || "제목 없음"}
        </p>

        {/* 지표 */}
        <div className="flex gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Heart className="h-3 w-3" /> {formatNumber(video.likes)}
          </span>
          <span className="flex items-center gap-1">
            <Share2 className="h-3 w-3" /> {formatNumber(video.shares)}
          </span>
          {video.comments > 0 && (
            <span className="flex items-center gap-1">
              <MessageCircle className="h-3 w-3" /> {formatNumber(video.comments)}
            </span>
          )}
        </div>

        {/* 다운로드 */}
        {isDownloading ? (
          <div className="space-y-1">
            <Progress value={undefined} className="h-1" />
            <p className="text-xs text-muted-foreground text-center">다운로드 중...</p>
          </div>
        ) : (
          <Button
            variant={isDownloaded ? "outline" : "default"}
            size="sm"
            className="w-full"
            onClick={onDownload}
            disabled={isDownloaded}
          >
            <Download className="h-3 w-3" />
            {isDownloaded ? "다운로드 완료" : "다운로드"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
