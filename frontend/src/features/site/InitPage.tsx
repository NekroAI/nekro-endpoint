import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Check } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { BrandMark } from "../../design/brand";
import { GitHubMark } from "../../design/github";
import { glide, ignite } from "../../design/motion";
import { errorMessage, request, requestData } from "../../lib/api";
import { relativeTime } from "../../lib/format";
import { cn } from "../../lib/cn";
import { Button } from "../../ui/button";
import { Skeleton, Spinner } from "../../ui/skeleton";

type InitUser = { id: string; username: string; email: string | null; avatarUrl: string | null; createdAt: string };

/**
 * First-run setup (/init): choose the first administrator. The API closes
 * itself once an admin exists, so this page redirects home afterwards.
 */
export function InitPage() {
  const check = useQuery({
    queryKey: ["signal", "init", "check"],
    queryFn: () => request<{ needsInit: boolean }>("/init/check"),
    retry: false,
  });
  const users = useQuery({
    queryKey: ["signal", "init", "users"],
    queryFn: () => requestData<{ users: InitUser[] }>("/init/users"),
    enabled: check.data?.needsInit === true,
  });
  const [selected, setSelected] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "submitting" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (check.data && !check.data.needsInit && state !== "done") window.location.replace("/");
  }, [check.data, state]);

  const assign = async () => {
    if (!selected) return;
    setState("submitting");
    setError(null);
    try {
      await request("/init/set-admin", { method: "POST", body: { userId: selected } });
      setState("done");
      setTimeout(() => window.location.replace("/app"), 2600);
    } catch (caught) {
      setState("idle");
      setError(errorMessage(caught));
    }
  };

  const register = async () => {
    try {
      const { authUrl } = await requestData<{ authUrl: string }>("/auth/github");
      sessionStorage.setItem("init_return", "true");
      window.location.href = authUrl;
    } catch (caught) {
      setError(errorMessage(caught));
    }
  };

  const list = users.data?.users ?? [];

  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden bg-field px-4 py-16 text-ink-1">
      <AnimatePresence>{state === "done" && <IgniteField />}</AnimatePresence>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={glide} className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <BrandMark className="mx-auto size-12" />
          <h1 className="mt-6 text-xl font-semibold tracking-tight">{state === "done" ? "系统已点亮" : "初始化 Endpoints"}</h1>
          <p className="mt-2 text-sm text-ink-3">
            {state === "done" ? "管理员已就位，正在进入控制台…" : "选择第一位管理员。管理员会被同时激活，并可以激活其他用户。"}
          </p>
        </div>

        {state === "done" ? null : check.isLoading || users.isLoading ? (
          <div className="grid gap-2">
            {[0, 1, 2].map((index) => (
              <Skeleton key={index} className="h-14 rounded-md" />
            ))}
          </div>
        ) : check.error ? (
          <Notice>{errorMessage(check.error)}</Notice>
        ) : list.length === 0 ? (
          <div className="rounded-lg bg-surface-0 p-6 text-center shadow-[inset_0_0_0_1px_var(--line)]">
            <p className="text-sm text-ink-2">还没有任何用户。先用 GitHub 登录注册一个账号，登录后会回到这里。</p>
            <Button variant="primary" className="mt-5" onClick={() => void register()}>
              <GitHubMark /> 使用 GitHub 注册
            </Button>
          </div>
        ) : (
          <>
            <div role="radiogroup" aria-label="选择管理员" className="grid gap-2">
              {list.map((user) => {
                const on = selected === user.id;
                return (
                  <button
                    key={user.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setSelected(user.id)}
                    className={cn(
                      "flex items-center gap-3 rounded-md p-3 text-left transition-[background-color,box-shadow]",
                      on ? "bg-signal-soft shadow-[inset_0_0_0_1px_var(--signal)]" : "bg-surface-1 shadow-[inset_0_0_0_1px_var(--line)] hover:bg-surface-2",
                    )}
                  >
                    <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-full bg-surface-3 text-sm font-semibold text-ink-2">
                      {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="size-full object-cover" /> : user.username[0]?.toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{user.username}</span>
                      <span className="block truncate text-xs text-ink-3">
                        {user.email ?? "未公开邮箱"} · {relativeTime(user.createdAt)}加入
                      </span>
                    </span>
                    {on && <Check className="size-4 text-signal" />}
                  </button>
                );
              })}
            </div>
            {error && <Notice>{error}</Notice>}
            <Button size="lg" variant="primary" className="mt-5 w-full" disabled={!selected || state === "submitting"} onClick={() => void assign()}>
              {state === "submitting" && <Spinner className="text-current" />} 设为管理员并点亮系统
            </Button>
            <p className="mt-3 text-center text-xs text-ink-4">完成后此页面将永久关闭。</p>
          </>
        )}
      </motion.div>
    </div>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-4 flex items-start gap-2 rounded-sm bg-danger-soft px-3 py-2.5 text-sm text-danger">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" /> {children}
    </p>
  );
}

/** Full-screen one-shot ignite: rings sweep out from the centre. */
function IgniteField() {
  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center" aria-hidden>
      {[0, 0.18, 0.36].map((delay) => (
        <motion.span
          key={delay}
          className="absolute size-40 rounded-full shadow-[0_0_0_2px_var(--signal),0_0_60px_var(--signal)]"
          initial={{ opacity: 0.9, scale: 0.3 }}
          animate={{ opacity: 0, scale: 9 }}
          transition={{ ...ignite, duration: 1.6, delay }}
        />
      ))}
    </div>
  );
}
