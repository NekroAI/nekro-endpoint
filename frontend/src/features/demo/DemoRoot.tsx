import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, FlaskConical, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppShell } from "../../app/AppShell";
import { DemoContext, WorkspaceBaseContext } from "../../app/base";
import { GitHubMark } from "../../design/github";
import { REPO_URL } from "../../design/site";
import { AuthOverrideContext, type AuthState } from "../../hooks/useAuth";
import { installSandbox } from "../../lib/api";
import { cn } from "../../lib/cn";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { useConfirm } from "../../ui/confirm";
import { Dialog, DialogContent } from "../../ui/dialog";
import { Spinner } from "../../ui/skeleton";
import { toast } from "../../ui/toaster";
import { DEMO_ORIGIN, DEMO_USER, demoFetch, resetDemo, simulate, type SimulatedResponse } from "./backend";

/**
 * /demo: the real workspace running against an in-browser backend, so a
 * visitor without an account (or without activation) can try everything.
 * Data stays in this browser; published URLs use a placeholder domain.
 */
export function DemoRoot() {
  const navigate = useNavigate();
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 5 * 60_000, retry: false, refetchOnWindowFocus: false } } }),
  );
  // The sandbox must be in place before any workspace query runs, so children mount after it.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    installSandbox({ fetch: demoFetch, origin: DEMO_ORIGIN });
    setReady(true);
    return () => installSandbox(null);
  }, []);

  const auth = useMemo<AuthState>(
    () => ({
      user: DEMO_USER,
      isAuthenticated: true,
      isLoading: false,
      error: null,
      login: () => navigate("/app"),
      logout: () => navigate("/"),
      refetch: async () => undefined,
      isLoginLoading: false,
      isLogoutLoading: false,
    }),
    [navigate],
  );
  const [simulated, setSimulated] = useState<SimulatedResponse | null>(null);
  const actions = useMemo(
    () => ({
      simulate: (url: string) => {
        setSimulated(simulate(url));
        void client.invalidateQueries({ queryKey: ["signal", "access"] });
      },
    }),
    [client],
  );

  if (!ready) {
    return (
      <div className="grid h-dvh place-items-center bg-field">
        <Spinner className="size-5" />
      </div>
    );
  }

  return (
    <QueryClientProvider client={client}>
      <AuthOverrideContext.Provider value={auth}>
        <WorkspaceBaseContext.Provider value="/demo">
          <DemoContext.Provider value={actions}>
            <AppShell banner={<DemoBanner />} />
            <SimulatedDialog response={simulated} onClose={() => setSimulated(null)} />
          </DemoContext.Provider>
        </WorkspaceBaseContext.Provider>
      </AuthOverrideContext.Provider>
    </QueryClientProvider>
  );
}

function DemoBanner() {
  const client = useQueryClient();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const reset = async () => {
    const ok = await confirm({
      title: "重置演示数据？",
      description: "你在演示中做的所有修改都会被清除，恢复到初始示例。",
      confirmLabel: "重置",
    });
    if (!ok) return;
    resetDemo();
    navigate("/demo/endpoints");
    await client.resetQueries();
    toast.success("演示数据已重置");
  };
  return (
    <div className="flex h-10 shrink-0 items-center gap-3 border-b border-line bg-signal-soft px-4 text-sm">
      <FlaskConical className="size-4 shrink-0 text-signal" />
      <span className="min-w-0 flex-1 truncate text-ink-2">
        <span className="font-medium text-ink-1">演示环境</span>
        <span className="hidden sm:inline"> · 数据只保存在这个浏览器，不会发出真实请求</span>
      </span>
      <Button size="sm" variant="ghost" onClick={() => void reset()} aria-label="重置演示数据">
        <RotateCcw /> <span className="hidden sm:inline">重置</span>
      </Button>
      <Button asChild size="sm" variant="ghost" className="hidden md:inline-flex">
        <a href={REPO_URL} target="_blank" rel="noreferrer noopener">
          <GitHubMark /> 自行部署
        </a>
      </Button>
      <Button asChild size="sm" variant="primary">
        <Link to="/app">
          登录控制台 <ArrowUpRight />
        </Link>
      </Button>
    </div>
  );
}

function SimulatedDialog({ response, onClose }: { response: SimulatedResponse | null; onClose: () => void }) {
  const tone = !response ? ("neutral" as const) : response.status < 300 ? ("pass" as const) : response.status < 500 ? ("caution" as const) : ("danger" as const);
  return (
    <Dialog open={Boolean(response)} onOpenChange={(open) => !open && onClose()}>
      {response && (
        <DialogContent
          title="模拟访问"
          description="演示环境按真实规则推演边缘节点的响应：发布状态、启停、通行卡与权限组都会生效。"
          className="w-[min(640px,calc(100vw-32px))]"
        >
          <div className="grid min-w-0 gap-3">
            <div className="flex min-w-0 items-center gap-2 font-mono text-xs">
              <span className="shrink-0 text-ink-3">GET</span>
              <span className="min-w-0 truncate text-ink-1" title={response.url}>
                {response.url}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={tone}>HTTP {response.status}</Badge>
              {response.headers.map(([name, value]) => (
                <span key={name} className="max-w-full truncate font-mono text-2xs text-ink-3" title={`${name}: ${value}`}>
                  {name}: {value}
                </span>
              ))}
            </div>
            <pre
              className={cn(
                "scrollbar-thin max-h-72 overflow-auto rounded-md bg-surface-1 p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap text-ink-1",
                "shadow-[inset_0_0_0_1px_var(--line)]",
              )}
            >
              {response.body || "（空响应）"}
            </pre>
            {response.note && <p className="text-xs text-ink-3">{response.note}</p>}
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
}
