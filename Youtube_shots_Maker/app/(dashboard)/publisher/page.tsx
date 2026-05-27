"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Send, Globe, FileText, ChevronRight, Loader2, Sparkles,
  Clock, CheckCircle2, XCircle,
  ExternalLink, Copy,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { studioApi, type Script } from "@/lib/api/studio";
import { sourcingApi, type VideoItem } from "@/lib/api/sourcing";
import { accountsApi, type Account, type Platform } from "@/lib/api/accounts";
import {
  publisherApi,
  type GeoMetadata,
  type PublishJob,
  type JobStatus,
} from "@/lib/api/publisher";
import {
  blogApi,
  type BlogPost,
  type BlogStatus,
  type CommerceLinks,
} from "@/lib/api/blog";
import { commerceApi, type ProductItem } from "@/lib/api/commerce";

// ─── 상수 ───────────────────────────────────────────────────

const DEPLOY_PLATFORMS: { platform: Platform; label: string; emoji: string }[] = [
  { platform: "youtube",   label: "YouTube",    emoji: "▶️" },
  { platform: "instagram", label: "Instagram",  emoji: "📸" },
  { platform: "tiktok",    label: "TikTok",     emoji: "🎵" },
  { platform: "naver_blog",label: "네이버 블로그", emoji: "📝" },
];

const JOB_STATUS_CONFIG: Record<JobStatus, { label: string; variant: "jade" | "blue" | "amber" | "coral" | "gray" }> = {
  pending:   { label: "대기",     variant: "gray"  },
  scheduled: { label: "예약됨",   variant: "blue"  },
  uploading: { label: "업로드 중", variant: "amber" },
  published: { label: "완료",     variant: "jade"  },
  failed:    { label: "실패",     variant: "coral" },
};

// ─── 블로그 상태 설정 ────────────────────────────────────────

const BLOG_STATUS_CONFIG: Record<BlogStatus, { label: string; variant: "jade" | "blue" | "amber" | "coral" | "gray" }> = {
  draft:      { label: "초안",      variant: "gray"  },
  generating: { label: "생성 중",   variant: "amber" },
  ready:      { label: "작성 완료", variant: "blue"  },
  publishing: { label: "배포 중",   variant: "amber" },
  published:  { label: "발행 완료", variant: "jade"  },
  failed:     { label: "실패",      variant: "coral" },
};

const BLOG_STYLE_OPTIONS = [
  { value: "review", label: "내돈내산 리뷰", desc: "장단점 솔직 후기" },
  { value: "info",   label: "정보성 포스트", desc: "스펙·비교 중심" },
  { value: "story",  label: "스토리텔링",    desc: "구매 여정 서술" },
] as const;

// ─── 메인 컴포넌트 ───────────────────────────────────────────

export default function PublisherPage() {
  const queryClient = useQueryClient();

  // 데이터
  const { data: scripts = [], isLoading: scriptsLoading } = useQuery({
    queryKey: ["scripts"],
    queryFn: () => studioApi.listScripts(),
    select: (d) => d.filter((s) => s.status === "ready"),
  });

  const { data: videos = [] } = useQuery({
    queryKey: ["videos"],
    queryFn: () => sourcingApi.listVideos(),
  });

  const { data: jobs = [], isLoading: jobsLoading } = useQuery({
    queryKey: ["publish-jobs"],
    queryFn: () => publisherApi.listJobs(),
    refetchInterval: 10_000,
  });

  // 선택된 스크립트
  const [selectedScript, setSelectedScript] = useState<Script | null>(null);
  const selectedVideo = videos.find((v) => v.id === selectedScript?.video_id);

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="font-heading text-4xl">PUBLISHER MATRIX</h1>
        <p className="text-muted-foreground text-sm mt-1">
          완성된 콘텐츠를 멀티채널에 배포하세요
        </p>
      </div>

      <Tabs defaultValue="video">
        <TabsList>
          <TabsTrigger value="video" className="gap-2">
            <Globe className="h-4 w-4" />
            영상 배포
          </TabsTrigger>
          <TabsTrigger value="blog" className="gap-2">
            <FileText className="h-4 w-4" />
            블로그 배포
          </TabsTrigger>
        </TabsList>

        {/* ── 영상 배포 탭 ─────────────────────────────────── */}
        <TabsContent value="video" className="mt-6">
          <div className="flex gap-6 items-start">
            {/* 좌: 스크립트 그리드 */}
            <div className="flex-1 min-w-0">
              {scriptsLoading ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-jade" />
                </div>
              ) : scripts.length === 0 ? (
                <Card>
                  <CardContent className="py-20 text-center text-muted-foreground">
                    <Send className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p className="font-medium">배포할 완성 영상이 없습니다</p>
                    <p className="text-sm mt-1">
                      Adaptation Studio에서 렌더링을 완료해주세요.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-3 grid-cols-1 lg:grid-cols-2">
                  {scripts.map((script) => {
                    const video = videos.find((v) => v.id === script.video_id);
                    const isSelected = selectedScript?.id === script.id;
                    return (
                      <ScriptCard
                        key={script.id}
                        script={script}
                        video={video}
                        isSelected={isSelected}
                        onClick={() =>
                          setSelectedScript(isSelected ? null : script)
                        }
                      />
                    );
                  })}
                </div>
              )}

              {/* 배포 이력 */}
              <div className="mt-8">
                <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
                  최근 배포 이력
                </h2>
                <JobsList jobs={jobs} isLoading={jobsLoading} />
              </div>
            </div>

            {/* 우: 배포 패널 */}
            {selectedScript && (
              <div className="w-[380px] shrink-0 sticky top-6">
                <DeployPanel
                  script={selectedScript}
                  video={selectedVideo ?? null}
                  onSuccess={() => {
                    queryClient.invalidateQueries({ queryKey: ["publish-jobs"] });
                    setSelectedScript(null);
                    toast.success("배포가 예약되었습니다!");
                  }}
                />
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── 블로그 배포 탭 (Track D) ─────────────────────── */}
        <TabsContent value="blog" className="mt-6">
          <BlogTab videos={videos} queryClient={queryClient} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── ScriptCard ──────────────────────────────────────────────

function ScriptCard({
  script, video, isSelected, onClick,
}: {
  script: Script;
  video: VideoItem | undefined;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <Card
      onClick={onClick}
      className={`cursor-pointer transition-all hover:border-jade/50 ${
        isSelected ? "border-jade ring-1 ring-jade/30 bg-jade/5" : ""
      }`}
    >
      <div className="flex items-center gap-3 p-4">
        <div className="h-16 w-24 rounded bg-muted shrink-0 overflow-hidden">
          {video?.thumbnail_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={video.thumbnail_url}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-jade" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">
            {video?.title_cn || "제목 없음"}
          </p>
          <div className="flex gap-1.5 mt-1.5 flex-wrap">
            <Badge variant="jade" className="text-[10px]">렌더링 완료</Badge>
            {video?.platform && (
              <Badge
                variant={video.platform === "douyin" ? "coral" : "secondary"}
                className="text-[10px]"
              >
                {video.platform === "douyin" ? "도우인" : "샤오홍수"}
              </Badge>
            )}
            {video?.track && (
              <Badge
                variant={
                  video.track === "A" ? "blue" :
                  video.track === "B" ? "amber" : "jade"
                }
                className="text-[10px]"
              >
                Track {video.track}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {new Date(script.created_at).toLocaleDateString("ko-KR")}
          </p>
        </div>
        <ChevronRight
          className={`h-4 w-4 shrink-0 transition-colors ${
            isSelected ? "text-jade" : "text-muted-foreground"
          }`}
        />
      </div>
    </Card>
  );
}

// ─── DeployPanel ─────────────────────────────────────────────

type DeployTarget = {
  platform: Platform;
  account_id: string;
  scheduled_at: string;
};

function DeployPanel({
  script,
  video,
  onSuccess,
}: {
  script: Script;
  video: VideoItem | null;
  onSuccess: () => void;
}) {
  const videoTyped = video;

  // 계정 목록 조회
  const { data: accounts = [] } = useQuery({
    queryKey: ["accounts"],
    queryFn: () => accountsApi.list(),
    select: (d) =>
      d.filter((a) =>
        ["youtube", "instagram", "tiktok", "naver_blog"].includes(a.platform)
      ),
  });

  // 배포 대상 상태 (platform → { account_id, scheduled_at })
  const [targets, setTargets] = useState<Partial<Record<Platform, DeployTarget>>>({});
  const [commerceLink, setCommerceLink] = useState("");
  const [activeTab, setActiveTab] = useState<"setup" | "geo" | "commerce">("setup");

  // GEO 메타데이터
  const [geoMeta, setGeoMeta] = useState<GeoMetadata | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);

  // 배포 뮤테이션
  const scheduleMut = useMutation({
    mutationFn: publisherApi.schedule,
    onSuccess: (data) => {
      if (data.job_ids.length > 0) onSuccess();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const selectedTargets = Object.values(targets).filter(Boolean) as DeployTarget[];

  const handleAccountSelect = (platform: Platform, account_id: string) => {
    setTargets((prev) => ({
      ...prev,
      [platform]: { platform, account_id, scheduled_at: "" },
    }));
  };

  const handleTimeChange = (platform: Platform, value: string) => {
    setTargets((prev) => ({
      ...prev,
      [platform]: { ...(prev[platform]!), scheduled_at: value },
    }));
  };

  const clearTarget = (platform: Platform) => {
    setTargets((prev) => {
      const next = { ...prev };
      delete next[platform];
      return next;
    });
  };

  const handleGenerateGeo = async () => {
    setGeoLoading(true);
    try {
      const meta = await publisherApi.geoMetadata(script.id);
      setGeoMeta(meta);
      toast.success("GEO 메타데이터가 생성되었습니다.");
    } catch (e: unknown) {
      toast.error((e as Error).message);
    } finally {
      setGeoLoading(false);
    }
  };

  const handleDeploy = () => {
    if (selectedTargets.length === 0) {
      toast.error("배포할 계정을 1개 이상 선택하세요.");
      return;
    }
    scheduleMut.mutate({
      script_id: script.id,
      publish_targets: selectedTargets.map((t) => ({
        account_id: t.account_id,
        ...(t.scheduled_at ? { scheduled_at: new Date(t.scheduled_at).toISOString() } : {}),
      })),
      commerce_link: commerceLink || undefined,
    });
  };

  const getAccountsForPlatform = (platform: Platform) =>
    accounts.filter((a: Account) => a.platform === platform);

  return (
    <Card className="border-jade/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Send className="h-4 w-4 text-jade" />
          배포 설정
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">

        {/* 내부 탭 */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList className="w-full">
            <TabsTrigger value="setup" className="flex-1 text-xs">배포 채널</TabsTrigger>
            <TabsTrigger value="geo"   className="flex-1 text-xs">GEO 메타</TabsTrigger>
            <TabsTrigger value="commerce" className="flex-1 text-xs">커머스 링크</TabsTrigger>
          </TabsList>

          {/* 배포 채널 탭 */}
          <TabsContent value="setup" className="mt-4 space-y-3">
            {DEPLOY_PLATFORMS.map(({ platform, label, emoji }) => {
              const platformAccounts = getAccountsForPlatform(platform);
              const selected = targets[platform];
              return (
                <div key={platform} className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <span>{emoji}</span>
                    <span>{label}</span>
                    {selected && (
                      <button
                        onClick={() => clearTarget(platform)}
                        className="ml-auto text-coral hover:text-coral/80 text-[10px]"
                      >
                        해제
                      </button>
                    )}
                  </div>
                  <Select
                    value={selected?.account_id ?? ""}
                    onValueChange={(v) => handleAccountSelect(platform, v)}
                    disabled={platformAccounts.length === 0}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue
                        placeholder={
                          platformAccounts.length === 0
                            ? "등록된 계정 없음"
                            : "계정 선택"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {platformAccounts.map((acc: Account) => (
                        <SelectItem key={acc.id} value={acc.id} className="text-xs">
                          {acc.is_default ? "🏷 " : ""}{acc.alias}
                          {acc.display_name ? ` (${acc.display_name})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selected && (
                    <Input
                      type="datetime-local"
                      className="h-7 text-xs"
                      value={selected.scheduled_at}
                      onChange={(e) => handleTimeChange(platform, e.target.value)}
                      placeholder="예약 시간 (비우면 즉시)"
                    />
                  )}
                </div>
              );
            })}

            {selectedTargets.length > 0 && (
              <div className="pt-1">
                <p className="text-xs text-muted-foreground mb-1">
                  {selectedTargets.length}개 채널 선택됨
                </p>
              </div>
            )}
          </TabsContent>

          {/* GEO 메타데이터 탭 */}
          <TabsContent value="geo" className="mt-4 space-y-3">
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2 border-denim/40 text-denim"
              onClick={handleGenerateGeo}
              disabled={geoLoading || !script.adapted_script}
            >
              {geoLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              AI로 메타데이터 생성
            </Button>

            {!script.adapted_script && (
              <p className="text-xs text-amber text-center">
                각색 대본이 필요합니다
              </p>
            )}

            {geoMeta && (
              <div className="space-y-2 text-xs">
                <div>
                  <label className="text-muted-foreground block mb-1">제목</label>
                  <Input
                    value={geoMeta.title}
                    onChange={(e) =>
                      setGeoMeta({ ...geoMeta, title: e.target.value })
                    }
                    className="h-7 text-xs"
                  />
                </div>
                <div>
                  <label className="text-muted-foreground block mb-1">설명</label>
                  <Textarea
                    value={geoMeta.description}
                    onChange={(e) =>
                      setGeoMeta({ ...geoMeta, description: e.target.value })
                    }
                    className="text-xs resize-none"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="text-muted-foreground block mb-1">태그</label>
                  <div className="flex flex-wrap gap-1">
                    {geoMeta.tags.map((tag, i) => (
                      <Badge key={i} variant="gray" className="text-[10px]">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                </div>
                {geoMeta.faq_schema.length > 0 && (
                  <div>
                    <label className="text-muted-foreground block mb-1">FAQ</label>
                    <div className="space-y-1.5">
                      {geoMeta.faq_schema.slice(0, 2).map((faq, i) => (
                        <div key={i} className="rounded bg-muted p-2">
                          <p className="font-medium">Q. {faq.question}</p>
                          <p className="text-muted-foreground mt-0.5">
                            A. {faq.answer}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full gap-1 text-muted-foreground"
                  onClick={() => {
                    const text = `${geoMeta.title}\n\n${geoMeta.description}\n\n${geoMeta.context_summary}`;
                    navigator.clipboard.writeText(text);
                    toast.success("클립보드에 복사됨");
                  }}
                >
                  <Copy className="h-3 w-3" />
                  클립보드 복사
                </Button>
              </div>
            )}
          </TabsContent>

          {/* 커머스 링크 탭 */}
          <TabsContent value="commerce" className="mt-4">
            {videoTyped?.track === "B" ? (
              <CommercePanel
                videoId={script.video_id}
                onLinkSelect={(url) => setCommerceLink(url)}
                selectedLink={commerceLink}
              />
            ) : (
              <div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground text-center">
                Track B (쇼핑 리뷰) 영상에만 적용됩니다.
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* 배포 버튼 */}
        <Button
          className="w-full gap-2 bg-jade hover:bg-jade/90 text-surface"
          onClick={handleDeploy}
          disabled={scheduleMut.isPending || selectedTargets.length === 0}
        >
          {scheduleMut.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          {selectedTargets.length === 0
            ? "채널을 선택하세요"
            : `${selectedTargets.length}개 채널에 배포 예약`}
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── JobsList ────────────────────────────────────────────────

function JobsList({ jobs, isLoading }: { jobs: PublishJob[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-jade" />
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <p className="text-xs text-muted-foreground text-center py-6">
        배포 이력이 없습니다.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {jobs.map((job) => {
        const cfg = JOB_STATUS_CONFIG[job.status];
        return (
          <div
            key={job.id}
            className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm"
          >
            <JobStatusIcon status={job.status} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-xs truncate">
                  {job.account_alias ?? "알 수 없는 계정"}
                </span>
                {job.account_platform && (
                  <Badge variant="gray" className="text-[9px] px-1">
                    {job.account_platform}
                  </Badge>
                )}
                <Badge variant={cfg.variant} className="text-[9px] px-1 ml-auto">
                  {cfg.label}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {job.scheduled_at
                  ? `예약: ${new Date(job.scheduled_at).toLocaleString("ko-KR")}`
                  : job.published_at
                  ? `완료: ${new Date(job.published_at).toLocaleString("ko-KR")}`
                  : new Date(job.created_at).toLocaleString("ko-KR")}
              </p>
              {job.error_msg && (
                <p className="text-[10px] text-coral mt-0.5 truncate">{job.error_msg}</p>
              )}
            </div>
            {job.platform_video_id && (
              <a
                href={`https://youtu.be/${job.platform_video_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-denim hover:text-denim/80"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// COMMERCE PANEL (Track B: 네이버쇼핑 커넥트)
// ═══════════════════════════════════════════════════════════════

function CommercePanel({
  videoId,
  onLinkSelect,
  selectedLink,
}: {
  videoId: string;
  onLinkSelect: (url: string) => void;
  selectedLink: string;
}) {
  const [keyword, setKeyword]           = useState("");
  const [coupangUrl, setCoupangUrl]     = useState("");
  const [smartstoreUrl, setSmartstore]  = useState("");
  const [searchResults, setSearchResults] = useState<ProductItem[]>([]);
  const [isSearching, setIsSearching]   = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [generatedLinks, setGeneratedLinks] = useState<Record<string, string>>({});
  const [activeSource, setActiveSource] = useState<"naver" | "coupang" | "smartstore">("naver");

  const handleSearch = async () => {
    if (!keyword.trim()) return;
    setIsSearching(true);
    try {
      const res = await commerceApi.search({ keyword: keyword.trim(), limit: 6 });
      setSearchResults(res.items);
    } catch (e: unknown) {
      toast.error((e as Error).message);
    } finally {
      setIsSearching(false);
    }
  };

  const handleGenerateLink = async (product: ProductItem) => {
    setGeneratingId(product.product_id);
    try {
      const res = await commerceApi.generateLink({
        video_id:   videoId,
        product_id: product.product_id,
      });
      setGeneratedLinks((prev) => ({ ...prev, [product.product_id]: res.tracking_url }));
      onLinkSelect(res.tracking_url);
      toast.success(`트래킹 URL 생성 완료 (수수료 ${res.commission_rate}%)`);
    } catch (e: unknown) {
      toast.error((e as Error).message);
    } finally {
      setGeneratingId(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        {(["naver", "coupang", "smartstore"] as const).map((src) => (
          <button key={src} onClick={() => setActiveSource(src)}
            className={`flex-1 text-[10px] py-1 rounded-md transition-colors font-medium ${
              activeSource === src ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            {src === "naver" ? "네이버쇼핑" : src === "coupang" ? "쿠팡" : "스마트스토어"}
          </button>
        ))}
      </div>

      {/* 네이버쇼핑 커넥트 */}
      {activeSource === "naver" && (
        <div className="space-y-2">
          <p className="text-[10px] text-muted-foreground">상품 검색 → CPS 트래킹 URL 자동 생성</p>
          <div className="flex gap-1.5">
            <Input value={keyword} onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="상품명 검색..." className="h-7 text-xs flex-1" />
            <Button size="sm" className="h-7 px-2.5 text-xs bg-jade hover:bg-jade/90 text-surface"
              onClick={handleSearch} disabled={isSearching || !keyword.trim()}>
              {isSearching ? <Loader2 className="h-3 w-3 animate-spin" /> : "검색"}
            </Button>
          </div>
          {searchResults.length > 0 && (
            <div className="space-y-1.5 max-h-52 overflow-y-auto">
              {searchResults.map((product) => {
                const hasLink = !!generatedLinks[product.product_id];
                const isGen   = generatingId === product.product_id;
                return (
                  <div key={product.product_id}
                    className={`rounded-lg border p-2 text-xs ${hasLink ? "border-jade/40 bg-jade/5" : "border-border"}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{product.product_name}</p>
                        <div className="flex gap-2 mt-0.5 text-[10px] text-muted-foreground">
                          <span>₩{product.price.toLocaleString()}</span>
                          <span className="text-jade">수수료 {product.commission_rate}%</span>
                        </div>
                      </div>
                      {hasLink ? (
                        <Button size="sm" variant="ghost" className="h-6 px-1.5 text-[10px] text-jade shrink-0"
                          onClick={() => { navigator.clipboard.writeText(generatedLinks[product.product_id]); toast.success("복사됨"); }}>
                          <Copy className="h-2.5 w-2.5 mr-0.5" />복사
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" className="h-6 px-1.5 text-[10px] shrink-0"
                          onClick={() => handleGenerateLink(product)} disabled={isGen}>
                          {isGen ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : "링크 생성"}
                        </Button>
                      )}
                    </div>
                    {hasLink && <p className="text-[9px] text-jade mt-1 font-mono truncate">{generatedLinks[product.product_id]}</p>}
                  </div>
                );
              })}
            </div>
          )}
          {selectedLink && (
            <div className="rounded-lg bg-jade/10 border border-jade/30 p-2">
              <p className="text-[10px] font-medium text-jade mb-0.5">선택된 링크</p>
              <p className="text-[9px] font-mono text-muted-foreground truncate">{selectedLink}</p>
              <button className="text-[9px] text-coral hover:underline" onClick={() => onLinkSelect("")}>해제</button>
            </div>
          )}
        </div>
      )}

      {/* 쿠팡 파트너스 */}
      {activeSource === "coupang" && (
        <div className="space-y-2">
          <p className="text-[10px] text-muted-foreground">쿠팡 파트너스 추적 URL을 입력하세요.</p>
          <Input value={coupangUrl}
            onChange={(e) => { setCoupangUrl(e.target.value); if (e.target.value) onLinkSelect(e.target.value); }}
            placeholder="https://link.coupang.com/..." className="h-8 text-xs" />
          {coupangUrl && (
            <a href={coupangUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-[10px] text-denim hover:underline">
              <ExternalLink className="h-3 w-3" />링크 확인
            </a>
          )}
        </div>
      )}

      {/* 스마트스토어 */}
      {activeSource === "smartstore" && (
        <div className="space-y-2">
          <p className="text-[10px] text-muted-foreground">스마트스토어 상품 URL을 입력하세요.</p>
          <Input value={smartstoreUrl}
            onChange={(e) => { setSmartstore(e.target.value); if (e.target.value) onLinkSelect(e.target.value); }}
            placeholder="https://smartstore.naver.com/..." className="h-8 text-xs" />
          {smartstoreUrl && (
            <a href={smartstoreUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-[10px] text-denim hover:underline">
              <ExternalLink className="h-3 w-3" />링크 확인
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function JobStatusIcon({ status }: { status: JobStatus }) {
  switch (status) {
    case "published": return <CheckCircle2 className="h-4 w-4 text-jade shrink-0" />;
    case "failed":    return <XCircle      className="h-4 w-4 text-coral shrink-0" />;
    case "uploading": return <Loader2      className="h-4 w-4 text-amber animate-spin shrink-0" />;
    default:          return <Clock        className="h-4 w-4 text-muted-foreground shrink-0" />;
  }
}

// ═══════════════════════════════════════════════════════════════
// BLOG TAB (Track D)
// ═══════════════════════════════════════════════════════════════

function BlogTab({
  videos,
  queryClient,
}: {
  videos: VideoItem[];
  queryClient: ReturnType<typeof useQueryClient>;
}) {
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [generateVideoId, setGenerateVideoId] = useState("");
  const [generateStyle, setGenerateStyle] = useState<"review" | "info" | "story">("review");
  const [isGenerating, setIsGenerating] = useState(false);

  // Track D 영상만 표시
  const trackDVideos = videos.filter((v) => v.track === "D");

  // 블로그 포스트 목록
  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["blog-posts"],
    queryFn: () => blogApi.listPosts(),
    refetchInterval: 8_000,
  });

  const handleGenerate = async () => {
    if (!generateVideoId) {
      toast.error("영상을 선택하세요.");
      return;
    }
    setIsGenerating(true);
    try {
      const res = await blogApi.generate({
        video_id: generateVideoId,
        style: generateStyle,
      });
      toast.success("블로그 포스트 생성이 시작되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["blog-posts"] });
      setGenerateVideoId("");
    } catch (e: unknown) {
      toast.error((e as Error).message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex gap-6 items-start">
      {/* 좌: 포스트 목록 */}
      <div className="flex-1 min-w-0 space-y-5">

        {/* 생성 섹션 */}
        <Card className="border-jade/20 bg-jade/5">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs font-semibold text-jade mb-3 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              블로그 포스트 생성 (Track D)
            </p>
            <div className="flex gap-2 items-end flex-wrap">
              <div className="flex-1 min-w-[160px]">
                <label className="text-xs text-muted-foreground block mb-1">
                  Track D 영상 선택
                </label>
                <Select value={generateVideoId} onValueChange={setGenerateVideoId}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder={
                      trackDVideos.length === 0 ? "Track D 영상 없음" : "영상 선택"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {trackDVideos.map((v) => (
                      <SelectItem key={v.id} value={v.id} className="text-xs">
                        {v.title_cn || v.id.slice(0, 8)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-36">
                <label className="text-xs text-muted-foreground block mb-1">스타일</label>
                <Select
                  value={generateStyle}
                  onValueChange={(v) => setGenerateStyle(v as typeof generateStyle)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BLOG_STYLE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value} className="text-xs">
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                size="sm"
                className="bg-jade hover:bg-jade/90 text-surface gap-1.5 h-8"
                onClick={handleGenerate}
                disabled={isGenerating || !generateVideoId}
              >
                {isGenerating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                생성
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 포스트 그리드 */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-jade" />
          </div>
        ) : posts.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="font-medium">생성된 블로그 포스트가 없습니다</p>
              <p className="text-sm mt-1">위에서 Track D 영상을 선택해 포스트를 생성하세요.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 grid-cols-1 lg:grid-cols-2">
            {posts.map((post) => (
              <BlogPostCard
                key={post.id}
                post={post}
                isSelected={selectedPost?.id === post.id}
                onClick={() => setSelectedPost(
                  selectedPost?.id === post.id ? null : post
                )}
              />
            ))}
          </div>
        )}

        {/* 발행 이력 */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
            블로그 발행 이력
          </h2>
          <BlogJobsList />
        </div>
      </div>

      {/* 우: 편집/배포 패널 */}
      {selectedPost && (
        <div className="w-[400px] shrink-0 sticky top-6">
          <BlogEditPanel
            post={selectedPost}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ["blog-posts"] });
              setSelectedPost(null);
              toast.success("발행이 예약되었습니다!");
            }}
            onUpdate={() => {
              queryClient.invalidateQueries({ queryKey: ["blog-posts"] });
            }}
          />
        </div>
      )}
    </div>
  );
}

// ─── BlogPostCard ────────────────────────────────────────────

function BlogPostCard({
  post, isSelected, onClick,
}: {
  post: BlogPost;
  isSelected: boolean;
  onClick: () => void;
}) {
  const cfg = BLOG_STATUS_CONFIG[post.status];
  const isAnimating = post.status === "generating" || post.status === "publishing";

  return (
    <Card
      onClick={() => post.status === "ready" || post.status === "failed" ? onClick() : undefined}
      className={`transition-all ${
        post.status === "ready" || post.status === "failed"
          ? "cursor-pointer hover:border-jade/50"
          : "cursor-default opacity-75"
      } ${isSelected ? "border-jade ring-1 ring-jade/30 bg-jade/5" : ""}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <Badge
                variant={cfg.variant}
                className={`text-[10px] ${isAnimating ? "animate-pulse" : ""}`}
              >
                {cfg.label}
              </Badge>
              <span className="text-[10px] text-muted-foreground ml-auto">
                {new Date(post.created_at).toLocaleDateString("ko-KR")}
              </span>
            </div>
            <p className="text-sm font-medium line-clamp-2">
              {post.title_ko || "생성 중..."}
            </p>
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {post.tags.slice(0, 4).map((tag, i) => (
                  <span key={i} className="text-[10px] text-muted-foreground">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
            {post.error_msg && (
              <p className="text-[10px] text-coral mt-1 truncate">{post.error_msg}</p>
            )}
            {post.naver_post_url && (
              <a
                href={post.naver_post_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 text-[10px] text-denim mt-1 hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                발행된 포스트 보기
              </a>
            )}
          </div>
          {(post.status === "ready" || post.status === "failed") && (
            <ChevronRight
              className={`h-4 w-4 shrink-0 mt-0.5 ${isSelected ? "text-jade" : "text-muted-foreground"}`}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── BlogEditPanel ───────────────────────────────────────────

function BlogEditPanel({
  post,
  onSuccess,
  onUpdate,
}: {
  post: BlogPost;
  onSuccess: () => void;
  onUpdate: () => void;
}) {
  const { data: naverAccounts = [] } = useQuery({
    queryKey: ["accounts"],
    queryFn: () => accountsApi.list(),
    select: (d) => d.filter((a: Account) => a.platform === "naver_blog"),
  });

  const [title, setTitle] = useState(post.title_ko);
  const [body, setBody] = useState(post.body_html);
  const [tags, setTags] = useState((post.tags ?? []).join(", "));
  const [coupang, setCoupang]     = useState(post.commerce_links?.coupang ?? "");
  const [smartstore, setSmartstore] = useState(post.commerce_links?.smartstore ?? "");
  const [accountId, setAccountId] = useState(
    naverAccounts.find((a: Account) => a.is_default)?.id ?? ""
  );
  const [scheduledAt, setScheduledAt] = useState("");
  const [activeTab, setActiveTab]     = useState<"edit" | "preview" | "publish">("edit");
  const [isSaving, setIsSaving]       = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await blogApi.update(post.id, {
        title_ko:     title,
        body_html:    body,
        tags:         tags.split(",").map((t) => t.trim()).filter(Boolean),
        commerce_links: {
          ...(coupang     ? { coupang }     : {}),
          ...(smartstore  ? { smartstore }  : {}),
        },
      });
      toast.success("저장되었습니다.");
      onUpdate();
    } catch (e: unknown) {
      toast.error((e as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!accountId) {
      toast.error("네이버 블로그 계정을 선택하세요.");
      return;
    }
    setIsPublishing(true);
    try {
      // 먼저 저장
      await blogApi.update(post.id, {
        title_ko:  title,
        body_html: body,
        tags:      tags.split(",").map((t) => t.trim()).filter(Boolean),
        commerce_links: {
          ...(coupang    ? { coupang }    : {}),
          ...(smartstore ? { smartstore } : {}),
        },
      });
      // 발행 요청
      await blogApi.publish({
        blog_post_id: post.id,
        account_id:   accountId,
        ...(scheduledAt ? { scheduled_at: new Date(scheduledAt).toISOString() } : {}),
      });
      onSuccess();
    } catch (e: unknown) {
      toast.error((e as Error).message);
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <Card className="border-jade/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4 text-jade" />
          블로그 포스트 편집
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList className="w-full">
            <TabsTrigger value="edit"    className="flex-1 text-xs">편집</TabsTrigger>
            <TabsTrigger value="preview" className="flex-1 text-xs">미리보기</TabsTrigger>
            <TabsTrigger value="publish" className="flex-1 text-xs">배포</TabsTrigger>
          </TabsList>

          {/* 편집 탭 */}
          <TabsContent value="edit" className="mt-4 space-y-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">제목 (30자 이내)</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={50}
                className="h-8 text-xs"
              />
              <p className="text-[10px] text-muted-foreground mt-0.5 text-right">
                {title.length}/30
              </p>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">본문 HTML</label>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="text-xs font-mono resize-none"
                rows={8}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">
                태그 (쉼표로 구분, 최대 10개)
              </label>
              <Input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="리뷰, 추천, 할인"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground block">커머스 링크</label>
              <Input
                value={coupang}
                onChange={(e) => setCoupang(e.target.value)}
                placeholder="쿠팡 파트너스 URL"
                className="h-7 text-xs"
              />
              <Input
                value={smartstore}
                onChange={(e) => setSmartstore(e.target.value)}
                placeholder="스마트스토어 URL"
                className="h-7 text-xs"
              />
            </div>
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
              저장
            </Button>
          </TabsContent>

          {/* 미리보기 탭 */}
          <TabsContent value="preview" className="mt-4">
            <div className="rounded-lg border border-border overflow-auto max-h-96">
              <div
                className="p-4 text-sm prose prose-sm dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: body }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1 text-center">
              실제 네이버 블로그 렌더링과 다를 수 있습니다
            </p>
          </TabsContent>

          {/* 배포 탭 */}
          <TabsContent value="publish" className="mt-4 space-y-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">
                네이버 블로그 계정 <span className="text-coral">*</span>
              </label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder={
                    naverAccounts.length === 0 ? "등록된 계정 없음" : "계정 선택"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {(naverAccounts as Account[]).map((acc) => (
                    <SelectItem key={acc.id} value={acc.id} className="text-xs">
                      {acc.is_default ? "🏷 " : ""}{acc.alias}
                      {acc.display_name ? ` (${acc.display_name})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {naverAccounts.length === 0 && (
                <p className="text-[10px] text-amber mt-1">
                  Settings → 네이버 블로그 계정을 먼저 등록하세요.
                </p>
              )}
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">
                예약 시간 (비우면 즉시)
              </label>
              <Input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </TabsContent>
        </Tabs>

        {/* 발행 버튼 (항상 하단) */}
        <Button
          className="w-full gap-2 bg-jade hover:bg-jade/90 text-surface"
          onClick={handlePublish}
          disabled={isPublishing || !accountId || naverAccounts.length === 0}
        >
          {isPublishing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          {scheduledAt ? "예약 등록" : "지금 발행"}
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── BlogJobsList ────────────────────────────────────────────

function BlogJobsList() {
  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["blog-jobs"],
    queryFn: () => blogApi.listJobs(),
    refetchInterval: 10_000,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-jade" />
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <p className="text-xs text-muted-foreground text-center py-6">
        블로그 발행 이력이 없습니다.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {jobs.map((job) => {
        const cfg = BLOG_STATUS_CONFIG[job.status as BlogStatus];
        return (
          <div
            key={job.blog_post_id}
            className="flex items-center gap-3 rounded-lg border border-border p-3"
          >
            {job.status === "published" ? (
              <CheckCircle2 className="h-4 w-4 text-jade shrink-0" />
            ) : job.status === "failed" ? (
              <XCircle className="h-4 w-4 text-coral shrink-0" />
            ) : (
              <Loader2 className="h-4 w-4 text-amber animate-spin shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium truncate">{job.title_ko}</span>
                <Badge variant={cfg.variant} className="text-[9px] px-1 ml-auto shrink-0">
                  {cfg.label}
                </Badge>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {job.account_alias ?? "알 수 없는 계정"}
                {job.published_at
                  ? ` · ${new Date(job.published_at).toLocaleString("ko-KR")}`
                  : ""}
              </p>
              {job.error_msg && (
                <p className="text-[10px] text-coral mt-0.5 truncate">{job.error_msg}</p>
              )}
            </div>
            {job.naver_post_url && (
              <a
                href={job.naver_post_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-denim hover:text-denim/80 shrink-0"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        );
      })}
    </div>
  );
}
