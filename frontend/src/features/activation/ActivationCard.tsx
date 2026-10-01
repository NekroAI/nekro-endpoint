import { Clock, Rocket, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../hooks/useAuth";
import { errorMessage } from "../../lib/api";
import { relativeTime } from "../../lib/format";
import { cn } from "../../lib/cn";
import { Button } from "../../ui/button";
import { Textarea } from "../../ui/input";
import { Spinner } from "../../ui/skeleton";
import { toast } from "../../ui/toaster";
import { useMyActivation, useSubmitActivation } from "./api";

/**
 * Where an unactivated user asks for publishing rights and follows the
 * request. `compact` fits in a popover next to the publish button.
 */
export function ActivationCard({ compact = false, className }: { compact?: boolean; className?: string }) {
  const { user, refetch } = useAuth();
  const client = useQueryClient();
  const { data, isLoading, isError } = useMyActivation(Boolean(user && !user.isActivated));
  const submit = useSubmitActivation();
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState(false);
  const request = data?.request ?? null;

  // Approved since the session loaded: refresh the user so publishing unlocks.
  useEffect(() => {
    if (data?.activated && user && !user.isActivated) {
      void refetch();
      void client.invalidateQueries({ queryKey: ["auth", "user"] });
    }
  }, [data?.activated, user, refetch, client]);

  if (!user || user.isActivated || isError) return null;

  const send = async () => {
    try {
      await submit.mutateAsync(message.trim());
      setEditing(false);
      toast.success("已提交激活申请", { description: "管理员处理后，你就可以发布端点了。" });
    } catch (error) {
      toast.error("提交失败", { description: errorMessage(error) });
    }
  };

  const form = (
    <div className="grid gap-2">
      <Textarea
        value={message}
        maxLength={500}
        onChange={(event) => setMessage(event.target.value)}
        placeholder="简单说说你打算用它做什么（可选），有助于管理员更快处理"
        className={compact ? "min-h-16 text-xs" : undefined}
      />
      <div className="flex justify-end gap-2">
        {editing && (
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
            取消
          </Button>
        )}
        <Button size="sm" variant="primary" onClick={() => void send()} disabled={submit.isPending}>
          {submit.isPending && <Spinner className="text-current" />} {request ? "重新提交" : "申请发布权限"}
        </Button>
      </div>
    </div>
  );

  const status = request?.status;
  return (
    <div
      className={cn(
        "grid gap-3",
        !compact &&
          "rounded-lg bg-surface-0 p-5 shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--caution)_35%,transparent)]",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "mt-0.5 grid size-8 shrink-0 place-items-center rounded-full [&_svg]:size-4",
            status === "pending"
              ? "bg-signal-soft text-signal"
              : status === "rejected"
                ? "bg-danger-soft text-danger"
                : "bg-caution-soft text-caution",
          )}
        >
          {status === "pending" ? <Clock /> : status === "rejected" ? <XCircle /> : <Rocket />}
        </span>
        <div className="min-w-0">
          <div className="text-sm font-medium text-ink-1">
            {status === "pending" ? "激活申请已提交" : status === "rejected" ? "激活申请未通过" : "申请发布权限"}
          </div>
          <p className="mt-0.5 text-xs leading-relaxed text-ink-3">
            {status === "pending"
              ? `${relativeTime(request!.updatedAt)}提交，等待管理员处理。在此期间可以继续创建和编辑端点。`
              : status === "rejected"
                ? request!.reviewNote
                  ? `管理员说明：${request!.reviewNote}`
                  : "可以补充说明后重新提交。"
                : "账号需要管理员激活后才能发布端点。你现在就可以创建和编辑，激活后一键上线。"}
          </p>
        </div>
      </div>
      {isLoading ? (
        <Spinner />
      ) : status === "pending" && !editing ? (
        <div className="flex items-center justify-between gap-2 pl-11">
          {request?.message ? <p className="min-w-0 truncate text-xs text-ink-4">「{request.message}」</p> : <span />}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setMessage(request?.message ?? "");
              setEditing(true);
            }}
          >
            修改说明
          </Button>
        </div>
      ) : (
        <div className={compact ? undefined : "pl-11"}>{form}</div>
      )}
    </div>
  );
}
