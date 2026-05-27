"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Video, FileText, Send, TrendingUp, Download, Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { sourcingApi } from "@/lib/api/sourcing";
import { studioApi } from "@/lib/api/studio";
import { commerceApi } from "@/lib/api/commerce";
import { publisherApi } from "@/lib/api/publisher";
import { blogApi } from "@/lib/api/blog";
import { formatNumber } from "@/lib/utils";

interface StatCard {
  title: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  color: string;
}

export default function DashboardPage() {
  const { data: videos = [] } = useQuery({
    queryKey: ["videos"],
    queryFn: () => sourcingApi.listVideos(),
  });

  const { data: scripts = [] } = useQuery({
    queryKey: ["scripts"],
    queryFn: () => studioApi.listScripts(),
  });

  const { data: publishJobs = [] } = useQuery({
    queryKey: ["publish-jobs"],
    queryFn: () => publisherApi.listJobs(),
  });

  const { data: blogPosts = [] } = useQuery({
    queryKey: ["blog-posts"],
    queryFn: () => blogApi.listPosts(),
  });

  const { data: commerce } = useQuery({
    queryKey: ["commerce-summary"],
    queryFn: () => commerceApi.getSummary(30),
  });

  const downloadedVideos = videos.filter((v) => v.file_path).length;
  const readyVideos      = scripts.filter((s) => s.status === "ready").length;
  const publishedJobs    = publishJobs.filter((j) => j.status === "published").length;
  const publishedBlogs   = blogPosts.filter((p) => p.status === "published").length;
  const totalPublished   = publishedJobs + publishedBlogs;

  const revenueValue = commerce
    ? `₩${Math.floor(commerce.total_revenue).toLocaleString("ko-KR")}`
    : "₩ -";
  const revenueSub = commerce
    ? `클릭 ${commerce.total_clicks} · 전환 ${commerce.total_conversions} (30일)`
    : "수익 집계 준비 중";

  const stats: StatCard[] = [
    {
      title: "소싱된 영상",
      value: videos.length,
      sub: `다운로드 완료 ${downloadedVideos}개`,
      icon: Download,
      color: "text-denim",
    },
    {
      title: "AI 변환 완료",
      value: readyVideos,
      sub: `스크립트 ${scripts.length}개`,
      icon: Sparkles,
      color: "text-jade",
    },
    {
      title: "배포 완료",
      value: totalPublished,
      sub: `영상 ${publishedJobs} · 블로그 ${publishedBlogs}`,
      icon: Send,
      color: "text-amber",
    },
    {
      title: "예상 수익 (30일)",
      value: revenueValue,
      sub: revenueSub,
      icon: TrendingUp,
      color: "text-coral",
    },
  ];

  const recentVideos = [...videos]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const TRACK_COLORS: Record<string, "blue" | "amber" | "jade"> = {
    A: "blue", B: "amber", D: "jade",
  };

  return (
    <div className="p-8 space-y-8">
      {/* 헤더 */}
      <div>
        <h1 className="font-heading text-4xl text-foreground">DASHBOARD</h1>
        <p className="text-muted-foreground text-sm mt-1">
          중국 숏폼 → AI 재창작 → 멀티채널 배포 현황
        </p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map(({ title, value, sub, icon: Icon, color }) => (
          <Card key={title}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                {title}
                <Icon className={`h-4 w-4 ${color}`} />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-heading text-foreground">{value}</div>
              {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 최근 소싱 영상 */}
      <div>
        <h2 className="font-heading text-2xl mb-4">최근 소싱</h2>
        {recentVideos.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Video className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>아직 소싱된 영상이 없습니다.</p>
              <p className="text-sm mt-1">Target Finder에서 영상을 검색해보세요.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {recentVideos.map((v) => (
              <Card key={v.id} className="hover:border-jade/40 transition-colors">
                <CardContent className="py-3 flex items-center gap-4">
                  {/* 썸네일 */}
                  <div className="h-12 w-20 rounded bg-muted shrink-0 overflow-hidden">
                    {v.thumbnail_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={v.thumbnail_url}
                        alt={v.title_cn ?? ""}
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>

                  {/* 정보 */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{v.title_cn ?? "제목 없음"}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={v.platform === "douyin" ? "coral" : "secondary"} className="text-[10px]">
                        {v.platform === "douyin" ? "도우인" : "샤오홍수"}
                      </Badge>
                      <Badge variant={TRACK_COLORS[v.track] ?? "gray"} className="text-[10px]">
                        Track {v.track}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        바이럴 {v.viral_score}점
                      </span>
                    </div>
                  </div>

                  {/* 상태 */}
                  <StatusBadge status={v.status} />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const MAP: Record<string, { label: string; variant: "gray" | "blue" | "amber" | "jade" | "coral" }> = {
    sourced:     { label: "소싱됨",     variant: "gray"  },
    downloading: { label: "다운로드중", variant: "blue"  },
    downloaded:  { label: "다운로드됨", variant: "jade"  },
    processing:  { label: "처리중",     variant: "amber" },
    ready:       { label: "완료",       variant: "jade"  },
    published:   { label: "배포됨",     variant: "blue"  },
    failed:      { label: "실패",       variant: "coral" },
  };
  const info = MAP[status] ?? { label: status, variant: "gray" };
  return <Badge variant={info.variant}>{info.label}</Badge>;
}
