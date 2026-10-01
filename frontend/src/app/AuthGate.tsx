import type { ReactNode } from "react";
import { m as motion } from "motion/react";
import { useAuth } from "../hooks/useAuth";
import { BrandMark } from "../design/brand";
import { GitHubMark } from "../design/github";
import { Button } from "../ui/button";
import { Skeleton, Spinner } from "../ui/skeleton";
import { glide } from "../design/motion";

/** Renders children only for a signed-in user; SSR and first paint show a skeleton. */
export function AuthGate({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <ShellSkeleton />;
  if (!isAuthenticated) return <SignIn />;
  return <>{children}</>;
}

function ShellSkeleton() {
  return (
    <div className="flex h-dvh bg-field" aria-busy="true" aria-label="正在加载">
      <div className="hidden w-[60px] shrink-0 flex-col gap-3 border-r border-line p-3 md:flex">
        <Skeleton className="size-8 rounded-full" />
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="size-8" />
        ))}
      </div>
      <div className="grid flex-1 place-items-center">
        <Spinner className="size-5" />
      </div>
    </div>
  );
}

function SignIn() {
  const { login, isLoginLoading } = useAuth();
  return (
    <div className="grid min-h-dvh place-items-center bg-field px-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={glide}
        className="w-full max-w-sm text-center"
      >
        <div className="relative mx-auto mb-8 grid size-20 place-items-center">
          <span className="absolute inset-0 rounded-full bg-signal-soft blur-xl" />
          <BrandMark className="relative size-14" />
        </div>
        <h1 className="text-xl font-semibold tracking-tight">登录到 Endpoints</h1>
        <p className="mt-2 text-sm text-ink-3">在全球边缘布置你的端点，签发通行卡，掌控谁能访问。</p>
        <Button size="lg" variant="primary" className="mt-8 w-full" onClick={login} disabled={isLoginLoading}>
          {isLoginLoading ? <Spinner className="text-signal-ink" /> : <GitHubMark />}
          使用 GitHub 继续
        </Button>
        <p className="mt-4 text-xs text-ink-4">新账号需要管理员激活后才能发布端点。</p>
      </motion.div>
    </div>
  );
}
