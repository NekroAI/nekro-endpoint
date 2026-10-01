import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import type { User } from "../../../../common/types";
import { BrandMark } from "../../design/brand";
import { useAuth } from "../../hooks/useAuth";
import { errorMessage, requestData } from "../../lib/api";
import { safeLocalStorage } from "../../utils/storage";
import { Button } from "../../ui/button";
import { Spinner } from "../../ui/skeleton";

/**
 * GitHub redirects to /auth/callback?code=…&state=… (frozen route, REDESIGN
 * §1.5). The session token is stored under `auth_token` as before.
 */
export function AuthCallbackPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const client = useQueryClient();
  const { refetch } = useAuth();
  const started = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const params = new URLSearchParams(location.search);
    const code = params.get("code");
    const state = params.get("state");
    if (!code || !state) {
      navigate("/", { replace: true });
      return;
    }
    (async () => {
      try {
        const data = await requestData<{ user: User; sessionToken: string }>(
          `/auth/github/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`,
        );
        safeLocalStorage.setItem("auth_token", data.sessionToken);
        client.setQueryData(["auth", "user"], data.user);
        await refetch();
        const backToInit = sessionStorage.getItem("init_return") === "true";
        sessionStorage.removeItem("init_return");
        navigate(backToInit ? "/init" : "/app", { replace: true });
      } catch (caught) {
        setError(errorMessage(caught));
      }
    })();
  }, [client, location.search, navigate, refetch]);

  return (
    <div className="grid min-h-[70vh] place-items-center px-4">
      {error ? (
        <div className="max-w-sm text-center">
          <AlertTriangle className="mx-auto mb-4 size-6 text-danger" />
          <h1 className="font-semibold">登录没有完成</h1>
          <p className="mt-2 text-sm text-ink-3">{error}</p>
          <Button asChild variant="secondary" className="mt-6">
            <Link to="/">返回首页重试</Link>
          </Button>
        </div>
      ) : (
        <div className="text-center" aria-live="polite">
          <div className="relative mx-auto mb-6 grid size-16 place-items-center">
            <span className="absolute inset-0 animate-ping rounded-full bg-signal-soft [animation-duration:1.6s]" />
            <BrandMark className="relative size-10" />
          </div>
          <p className="flex items-center gap-2 text-sm text-ink-2">
            <Spinner /> 正在确认你的 GitHub 身份…
          </p>
        </div>
      )}
    </div>
  );
}
