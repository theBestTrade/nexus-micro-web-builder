"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus, Trash2, RefreshCw, TestTube2, Star,
  ChevronDown, ChevronUp, Loader2, Wifi, WifiOff, AlertTriangle,
  ExternalLink,
} from "lucide-react";
import { proxyApi, type ProxyItem, type ProxyType } from "@/lib/api/proxy";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { accountsApi, oauthApi, type Account, type Platform, type HealthStatus, type OAuthPlatform } from "@/lib/api/accounts";

const PLATFORM_GROUPS = [
  {
    title: "소싱 계정",
    platforms: ["douyin", "xiaohongshu"] as Platform[],
    labels: { douyin: "도우인 🎵", xiaohongshu: "샤오홍수 📱" },
    type: "credential",
  },
  {
    title: "배포 채널",
    platforms: ["youtube", "instagram", "tiktok"] as Platform[],
    labels: { youtube: "YouTube", instagram: "Instagram", tiktok: "TikTok" },
    type: "oauth",
  },
  {
    title: "네이버 블로그",
    platforms: ["naver_blog"] as Platform[],
    labels: { naver_blog: "네이버 블로그" },
    type: "credential",
  },
  {
    title: "커머스 계정",
    platforms: ["naver_shopping_connect", "coupang_partners", "smartstore"] as Platform[],
    labels: {
      naver_shopping_connect: "네이버쇼핑 커넥트",
      coupang_partners: "쿠팡 파트너스",
      smartstore: "스마트스토어",
    },
    type: "commerce",
  },
] as const;

const HEALTH_CONFIG: Record<HealthStatus, { dot: string; label: string }> = {
  healthy:       { dot: "status-dot-green",  label: "정상" },
  cookie_expired:{ dot: "status-dot-amber",  label: "쿠키 만료" },
  token_expired: { dot: "status-dot-red",    label: "토큰 만료" },
  banned:        { dot: "status-dot-red",    label: "차단됨" },
  error:         { dot: "status-dot-red",    label: "오류" },
  unknown:       { dot: "status-dot-gray",   label: "미확인" },
};

export default function SettingsPage() {
  const queryClient  = useQueryClient();
  const searchParams = useSearchParams();

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ["accounts"],
    queryFn: () => accountsApi.list(),
  });

  // OAuth 콜백 결과 처리 (URL 쿼리 파라미터)
  useEffect(() => {
    const success = searchParams.get("oauth_success");
    const error   = searchParams.get("oauth_error");
    if (success) {
      toast.success(`${success} 계정 연동 완료!`);
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      // URL 파라미터 제거
      window.history.replaceState({}, "", window.location.pathname);
    } else if (error) {
      toast.error(`OAuth 연동 실패: ${decodeURIComponent(error)}`);
      window.history.replaceState({}, "", window.location.pathname);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    "소싱 계정": true,
  });
  const [addModal, setAddModal] = useState<{
    open: boolean;
    platform: Platform | null;
    type: string;
  }>({ open: false, platform: null, type: "" });

  const toggle = (title: string) =>
    setExpanded((p) => ({ ...p, [title]: !p[title] }));

  const deleteMutation = useMutation({
    mutationFn: accountsApi.delete,
    onSuccess: () => {
      toast.success("계정이 삭제되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setDefaultMutation = useMutation({
    mutationFn: accountsApi.setDefault,
    onSuccess: () => {
      toast.success("기본 계정으로 설정되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const testMutation = useMutation({
    mutationFn: accountsApi.test,
    onSuccess: (data) => {
      if (data.success) toast.success("연결 성공!");
      else toast.error(`연결 실패: ${data.error}`);
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });

  const refreshCookieMutation = useMutation({
    mutationFn: accountsApi.refreshCookie,
    onSuccess: () => {
      toast.success("쿠키가 갱신되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const refreshTokenMutation = useMutation({
    mutationFn: ({ platform, id }: { platform: OAuthPlatform; id: string }) =>
      oauthApi.refreshToken(platform, id),
    onSuccess: () => {
      toast.success("토큰이 갱신되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="p-8 space-y-6 max-w-4xl">
      <div>
        <h1 className="font-heading text-4xl">SETTINGS</h1>
        <p className="text-muted-foreground text-sm mt-1">계정·프록시·시스템 설정</p>
      </div>

      <Tabs defaultValue="accounts">
        <TabsList>
          <TabsTrigger value="accounts">계정 관리</TabsTrigger>
          <TabsTrigger value="proxy">프록시 설정</TabsTrigger>
        </TabsList>

        {/* 계정 관리 탭 */}
        <TabsContent value="accounts" className="mt-6 space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-jade" />
            </div>
          ) : (
            PLATFORM_GROUPS.map(({ title, platforms, labels, type }) => {
              const groupAccounts = accounts.filter((a) =>
                (platforms as readonly string[]).includes(a.platform)
              );
              const isOpen = expanded[title];

              return (
                <Card key={title}>
                  <CardHeader
                    className="py-3 px-5 cursor-pointer flex-row items-center justify-between"
                    onClick={() => toggle(title)}
                  >
                    <CardTitle className="text-base flex items-center gap-3">
                      {title}
                      <Badge variant="gray" className="text-xs">
                        {groupAccounts.length}개
                      </Badge>
                    </CardTitle>
                    {isOpen ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </CardHeader>

                  {isOpen && (
                    <CardContent className="px-5 pb-5 space-y-3">
                      {groupAccounts.map((account) => (
                        <AccountCard
                          key={account.id}
                          account={account}
                          type={type}
                          onDelete={() => deleteMutation.mutate(account.id)}
                          onSetDefault={() => setDefaultMutation.mutate(account.id)}
                          onTest={() => testMutation.mutate(account.id)}
                          onRefreshCookie={() => refreshCookieMutation.mutate(account.id)}
                          onRefreshToken={() =>
                            refreshTokenMutation.mutate({
                              platform: account.platform as OAuthPlatform,
                              id: account.id,
                            })
                          }
                          labels={labels as Record<string, string>}
                        />
                      ))}

                      {/* 계정 추가 버튼들 */}
                      <div className="flex gap-2 pt-1 flex-wrap">
                        {(platforms as readonly Platform[]).map((platform) => (
                          <Button
                            key={platform}
                            variant="outline"
                            size="sm"
                            className="gap-1"
                            onClick={() =>
                              setAddModal({ open: true, platform, type })
                            }
                          >
                            <Plus className="h-3 w-3" />
                            {(labels as Record<string, string>)[platform]} 추가
                          </Button>
                        ))}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* 프록시 설정 탭 */}
        <TabsContent value="proxy" className="mt-6">
          <ProxyTab />
        </TabsContent>
      </Tabs>

      {/* 계정 추가 모달 */}
      <AddAccountModal
        open={addModal.open}
        platform={addModal.platform}
        type={addModal.type}
        onClose={() => setAddModal({ open: false, platform: null, type: "" })}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["accounts"] })}
      />
    </div>
  );
}

/* ─── AccountCard ──────────────────────────────────────────── */
function AccountCard({
  account, type, onDelete, onSetDefault, onTest, onRefreshCookie, onRefreshToken, labels,
}: {
  account: Account;
  type: string;
  onDelete: () => void;
  onSetDefault: () => void;
  onTest: () => void;
  onRefreshCookie: () => void;
  onRefreshToken: () => void;
  labels: Record<string, string>;
}) {
  const health = HEALTH_CONFIG[account.health_status];

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border p-3 hover:border-jade/30 transition-colors">
      {/* 아바타 플레이스홀더 */}
      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-sm shrink-0 overflow-hidden">
        {account.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={account.avatar_url} alt="" className="h-full w-full object-cover" />
        ) : (
          (account.alias[0] ?? "?").toUpperCase()
        )}
      </div>

      {/* 정보 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{account.alias}</span>
          {account.is_default && (
            <Badge variant="jade" className="text-[10px] px-1.5">🏷 기본</Badge>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <Badge variant="gray" className="text-[9px] px-1">
            {labels[account.platform] ?? account.platform}
          </Badge>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <span className={`status-dot ${health.dot}`} />
            {health.label}
          </span>
        </div>
      </div>

      {/* 액션 버튼 */}
      <div className="flex items-center gap-1 shrink-0">
        {!account.is_default && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onSetDefault}
            title="기본 계정 설정"
          >
            <Star className="h-3.5 w-3.5" />
          </Button>
        )}
        {type === "credential" && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onRefreshCookie}
            title="쿠키 갱신"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        )}
        {type === "oauth" && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onRefreshToken}
            title="토큰 재발급"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onTest}
          title="연결 테스트"
        >
          <TestTube2 className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-coral hover:text-coral"
          onClick={onDelete}
          title="삭제"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

/* ─── AddAccountModal ──────────────────────────────────────── */
function AddAccountModal({
  open, platform, type, onClose, onSuccess,
}: {
  open: boolean;
  platform: Platform | null;
  type: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [alias, setAlias]           = useState("");
  const [loginId, setLoginId]       = useState("");
  const [loginPw, setLoginPw]       = useState("");
  const [partnerId, setPartnerId]   = useState("");
  const [apiKey, setApiKey]         = useState("");
  const [affiliateUrl, setAffiliateUrl] = useState("");
  const [loading, setLoading]       = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);

  // 모달 닫힐 때 폼 초기화
  const handleClose = () => {
    setAlias(""); setLoginId(""); setLoginPw("");
    setPartnerId(""); setApiKey(""); setAffiliateUrl("");
    onClose();
  };

  const handleSubmit = async () => {
    if (!platform || !alias) return;
    setLoading(true);
    try {
      const body: Record<string, unknown> = { platform, alias };
      if (type === "credential") {
        body.login_id = loginId;
        body.login_pw = loginPw;
      } else if (type === "commerce") {
        body.partner_id    = partnerId || undefined;
        body.api_key       = apiKey || undefined;
        body.affiliate_url = affiliateUrl || undefined;
      }
      await accountsApi.create(body as unknown as Parameters<typeof accountsApi.create>[0]);
      toast.success("계정이 추가되었습니다.");
      onSuccess();
      handleClose();
    } catch (e: unknown) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  /** OAuth 플로우: 팝업 창으로 인증 진행 */
  const handleOAuth = async () => {
    if (!platform || !alias.trim()) {
      toast.error("별명을 먼저 입력해주세요.");
      return;
    }
    setOauthLoading(true);
    try {
      const { auth_url } = await oauthApi.getAuthorizeUrl(
        platform as OAuthPlatform,
        alias
      );

      // 팝업 창 열기 (OAuth 흐름)
      const popup = window.open(
        auth_url,
        "oauth_popup",
        "width=600,height=700,scrollbars=yes,resizable=yes"
      );

      // 팝업 닫힘 감지 → 계정 목록 갱신
      const timer = setInterval(() => {
        if (!popup || popup.closed) {
          clearInterval(timer);
          setOauthLoading(false);
          onSuccess();
          handleClose();
        }
      }, 500);

    } catch (e: unknown) {
      toast.error((e as Error).message);
      setOauthLoading(false);
    }
  };

  const PLATFORM_LABELS: Record<string, string> = {
    youtube:   "YouTube",
    instagram: "Instagram",
    tiktok:    "TikTok",
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>계정 추가</DialogTitle>
          <DialogDescription>
            {platform && PLATFORM_LABELS[platform]
              ? `${PLATFORM_LABELS[platform]} OAuth 연동`
              : `${platform} 플랫폼 계정 등록`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {/* 별명 — 모든 타입 공통 */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">별명 *</label>
            <Input
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              placeholder="예: 메인 계정, 서브 유튜브"
            />
          </div>

          {/* 자격증명 방식 (naver_blog / douyin / xiaohongshu) */}
          {type === "credential" && (
            <>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">로그인 ID</label>
                <Input
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  placeholder="아이디"
                  autoComplete="off"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  비밀번호
                  <span className="ml-1 text-[10px] text-jade">(AES-256 암호화 저장)</span>
                </label>
                <Input
                  type="password"
                  value={loginPw}
                  onChange={(e) => setLoginPw(e.target.value)}
                  placeholder="비밀번호"
                  autoComplete="new-password"
                />
              </div>
            </>
          )}

          {/* 커머스 계정 */}
          {type === "commerce" && (
            <>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">파트너 ID</label>
                <Input
                  value={partnerId}
                  onChange={(e) => setPartnerId(e.target.value)}
                  placeholder="네이버쇼핑 파트너 ID / 쿠팡 파트너스 ID"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">API Key</label>
                <Input
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="API Key (암호화 저장)"
                  type="password"
                  autoComplete="off"
                />
              </div>
              {platform === "smartstore" && (
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">스토어 URL</label>
                  <Input
                    value={affiliateUrl}
                    onChange={(e) => setAffiliateUrl(e.target.value)}
                    placeholder="https://smartstore.naver.com/yourstore"
                  />
                </div>
              )}
            </>
          )}

          {/* OAuth 방식 (youtube / instagram / tiktok) */}
          {type === "oauth" && (
            <div className="rounded-lg border border-denim/30 bg-denim/5 p-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                별명을 입력한 후 아래 버튼을 클릭하면{" "}
                <strong className="text-foreground">
                  {platform && PLATFORM_LABELS[platform]} 인증 팝업
                </strong>
                이 열립니다.
              </p>
              <Button
                className="w-full gap-2"
                onClick={handleOAuth}
                disabled={!alias.trim() || oauthLoading}
              >
                {oauthLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ExternalLink className="h-4 w-4" />
                )}
                {platform && PLATFORM_LABELS[platform]} 계정 연동하기
              </Button>
              <p className="text-[11px] text-muted-foreground text-center">
                인증 완료 후 팝업이 자동으로 닫히고 계정이 등록됩니다.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={handleClose}>취소</Button>
          {type !== "oauth" && (
            <Button onClick={handleSubmit} disabled={!alias || loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              추가
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── ProxyTab ─────────────────────────────────────────────── */

function ProxyTab() {
  const queryClient = useQueryClient();

  const { data: proxies = [], isLoading } = useQuery({
    queryKey: ["proxies"],
    queryFn: () => proxyApi.list(),
  });

  const [showAdd, setShowAdd] = useState(false);
  const [proxyUrl, setProxyUrl] = useState("");
  const [proxyType, setProxyType] = useState<ProxyType>("http");
  const [label, setLabel] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);

  const deleteMutation = useMutation({
    mutationFn: proxyApi.delete,
    onSuccess: () => {
      toast.success("프록시가 삭제되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["proxies"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleAdd = async () => {
    if (!proxyUrl) return;
    setAddLoading(true);
    try {
      await proxyApi.add({ proxy_url: proxyUrl, proxy_type: proxyType, label: label || undefined });
      toast.success("프록시가 추가되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["proxies"] });
      setProxyUrl(""); setLabel(""); setShowAdd(false);
    } catch (e: unknown) {
      toast.error((e as Error).message);
    } finally {
      setAddLoading(false);
    }
  };

  const handleTest = async (id: string) => {
    setTestingId(id);
    try {
      const res = await proxyApi.test(id);
      if (res.success) {
        toast.success(`연결 성공! 응답속도: ${res.latency_ms}ms`);
      } else {
        toast.error(`연결 실패: ${res.error}`);
      }
      queryClient.invalidateQueries({ queryKey: ["proxies"] });
    } catch (e: unknown) {
      toast.error((e as Error).message);
    } finally {
      setTestingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* 안내 카드 */}
      <Card>
        <CardContent className="py-4 px-5">
          <p className="text-sm text-muted-foreground">
            프록시를 등록하면 도우인·샤오홍수 크롤링과 네이버 블로그 자동화에 자동으로 적용됩니다.
            <br />
            실패 횟수가 3회 이상인 프록시는 자동으로 비활성화됩니다.
          </p>
        </CardContent>
      </Card>

      {/* 프록시 목록 */}
      <Card>
        <CardHeader className="py-3 px-5 flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            프록시 목록
            <Badge variant="gray" className="text-xs">{proxies.length}개</Badge>
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            className="gap-1 h-7"
            onClick={() => setShowAdd(!showAdd)}
          >
            <Plus className="h-3 w-3" />
            추가
          </Button>
        </CardHeader>

        <CardContent className="px-5 pb-5 space-y-3">
          {/* 추가 폼 */}
          {showAdd && (
            <div className="rounded-lg border border-dashed border-denim/40 p-4 space-y-3 bg-denim/5">
              <p className="text-xs font-medium text-denim">새 프록시 등록</p>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  프록시 URL <span className="text-coral">*</span>
                </label>
                <Input
                  value={proxyUrl}
                  onChange={(e) => setProxyUrl(e.target.value)}
                  placeholder="http://user:pass@host:8080"
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground mb-1 block">타입</label>
                  <Select
                    value={proxyType}
                    onValueChange={(v) => setProxyType(v as ProxyType)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="http"   className="text-xs">HTTP</SelectItem>
                      <SelectItem value="https"  className="text-xs">HTTPS</SelectItem>
                      <SelectItem value="socks5" className="text-xs">SOCKS5</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground mb-1 block">별명 (선택)</label>
                  <Input
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="예: KR-01"
                    className="h-8 text-xs"
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" size="sm" onClick={() => setShowAdd(false)}>취소</Button>
                <Button size="sm" onClick={handleAdd} disabled={!proxyUrl || addLoading}>
                  {addLoading && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                  저장
                </Button>
              </div>
            </div>
          )}

          {/* 목록 */}
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-jade" />
            </div>
          ) : proxies.length === 0 && !showAdd ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <Wifi className="h-8 w-8 mx-auto mb-2 opacity-20" />
              <p>등록된 프록시가 없습니다.</p>
            </div>
          ) : (
            proxies.map((proxy) => (
              <ProxyCard
                key={proxy.id}
                proxy={proxy}
                isTesting={testingId === proxy.id}
                onTest={() => handleTest(proxy.id)}
                onDelete={() => deleteMutation.mutate(proxy.id)}
              />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ─── ProxyCard ────────────────────────────────────────────── */
function ProxyCard({
  proxy, isTesting, onTest, onDelete,
}: {
  proxy: ProxyItem;
  isTesting: boolean;
  onTest: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border p-3 hover:border-jade/30 transition-colors">
      {/* 상태 아이콘 */}
      <div className="shrink-0">
        {!proxy.is_active ? (
          <WifiOff className="h-4 w-4 text-coral" />
        ) : proxy.fail_count >= 2 ? (
          <AlertTriangle className="h-4 w-4 text-amber" />
        ) : (
          <Wifi className="h-4 w-4 text-jade" />
        )}
      </div>

      {/* 정보 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono text-xs truncate">
            {proxy.proxy_url_masked}
          </span>
          {proxy.label && (
            <Badge variant="gray" className="text-[9px] px-1 shrink-0">
              {proxy.label}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <Badge
            variant={proxy.is_active ? "jade" : "coral"}
            className="text-[9px] px-1"
          >
            {proxy.is_active ? "활성" : "비활성"}
          </Badge>
          <Badge variant="gray" className="text-[9px] px-1">
            {proxy.proxy_type.toUpperCase()}
          </Badge>
          {proxy.fail_count > 0 && (
            <span className="text-[10px] text-amber">
              실패 {proxy.fail_count}회
            </span>
          )}
          {proxy.last_used_at && (
            <span className="text-[10px] text-muted-foreground">
              마지막: {new Date(proxy.last_used_at).toLocaleDateString("ko-KR")}
            </span>
          )}
        </div>
      </div>

      {/* 액션 버튼 */}
      <div className="flex items-center gap-1 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onTest}
          disabled={isTesting}
          title="연결 테스트"
        >
          {isTesting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <TestTube2 className="h-3.5 w-3.5" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-coral hover:text-coral"
          onClick={onDelete}
          title="삭제"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
