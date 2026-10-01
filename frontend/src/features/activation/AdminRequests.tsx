import { Check, Inbox, X } from "lucide-react";
import { AnimatePresence, m as motion } from "motion/react";
import { useState } from "react";
import { glide } from "../../design/motion";
import { errorMessage } from "../../lib/api";
import { relativeTime } from "../../lib/format";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { Dialog, DialogContent, DialogFooter } from "../../ui/dialog";
import { Field } from "../../ui/field";
import { Textarea } from "../../ui/input";
import { toast } from "../../ui/toaster";
import { useAdminActivations, useReviewActivation, type AdminActivationRequest } from "./api";

/** Pending activation requests, shown first on the admin page. */
export function AdminRequests() {
  const { data } = useAdminActivations();
  const review = useReviewActivation();
  const [rejecting, setRejecting] = useState<AdminActivationRequest | null>(null);
  const [note, setNote] = useState("");
  const pending = (data?.requests ?? []).filter((request) => request.status === "pending");
  if (!data || pending.length === 0) return null;

  const act = (request: AdminActivationRequest, action: "approve" | "reject", reviewNote?: string) =>
    review.mutate(
      { id: request.id, action, note: reviewNote },
      {
        onSuccess: () =>
          toast.success(
            action === "approve" ? `已激活 ${request.user.username}` : `已拒绝 ${request.user.username} 的申请`,
          ),
        onError: (error) => toast.error("操作失败", { description: errorMessage(error) }),
      },
    );

  return (
    <section className="mt-6 rounded-lg bg-surface-0 shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--caution)_35%,transparent)]">
      <h2 className="flex items-center gap-2 border-b border-line px-5 py-3 text-sm font-medium">
        <Inbox className="size-4 text-caution" /> 待处理的激活申请 <Badge tone="caution">{pending.length}</Badge>
      </h2>
      <ul className="divide-y divide-line">
        <AnimatePresence initial={false}>
          {pending.map((request) => (
            <motion.li
              key={request.id}
              layout
              exit={{ opacity: 0, height: 0 }}
              transition={glide}
              className="flex flex-wrap items-center gap-3 px-5 py-3"
            >
              <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-full bg-surface-3 text-xs font-semibold text-ink-2">
                {request.user.avatarUrl ? (
                  <img src={request.user.avatarUrl} alt="" className="size-full object-cover" />
                ) : (
                  request.user.username[0]?.toUpperCase()
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm text-ink-1">
                  {request.user.username}
                  <span className="ml-2 text-xs text-ink-4">{relativeTime(request.updatedAt)}申请</span>
                </div>
                <p className="truncate text-xs text-ink-3">{request.message || "未填写用途说明"}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => (setNote(""), setRejecting(request))}
                  disabled={review.isPending}
                >
                  <X /> 拒绝
                </Button>
                <Button size="sm" variant="primary" onClick={() => act(request, "approve")} disabled={review.isPending}>
                  <Check /> 批准并激活
                </Button>
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
      <Dialog open={Boolean(rejecting)} onOpenChange={(open) => !open && setRejecting(null)}>
        {rejecting && (
          <DialogContent
            title={`拒绝 ${rejecting.user.username} 的申请`}
            description="说明会展示给申请人，对方可以补充后重新提交。"
          >
            <Field label="说明" hint="可选">
              <Textarea
                autoFocus
                value={note}
                maxLength={500}
                onChange={(event) => setNote(event.target.value)}
                placeholder="例如：请补充具体用途"
              />
            </Field>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setRejecting(null)}>
                取消
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  act(rejecting, "reject", note.trim() || undefined);
                  setRejecting(null);
                }}
              >
                拒绝申请
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </section>
  );
}
