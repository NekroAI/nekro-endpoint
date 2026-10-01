import { AlertTriangle, Ban, Check, ChevronDown, Eraser, Loader2, Sparkles, X } from "lucide-react";
import { AnimatePresence, m as motion } from "motion/react";
import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { UIMessage } from "ai";
import { glide } from "../../design/motion";
import { cn } from "../../lib/cn";
import { Button } from "../../ui/button";
import { Tooltip } from "../../ui/tooltip";
import { isToolPart, toolNameOf, useSignal, type PlanStep } from "./SignalProvider";
import { metaOf, targetOf } from "./tools";

/** The conversation above the Signal Line. */
export function SignalPanel() {
  const { messages, status, error, clear, setOpen, model, pending } = useSignal();
  const scroller = useRef<HTMLDivElement>(null);
  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    const element = scroller.current;
    if (element) element.scrollTo({ top: element.scrollHeight, behavior: "smooth" });
  }, [messages, status, pending.length]);

  return (
    <motion.section
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.98 }}
      transition={glide}
      aria-label="Signal 对话"
      className="pointer-events-auto mb-2 flex max-h-[min(62vh,640px)] w-full max-w-[680px] flex-col overflow-hidden rounded-lg glass shadow-float"
    >
      <header className="flex shrink-0 items-center gap-2 border-b border-line px-4 py-2.5">
        <Sparkles className="size-4 text-signal" />
        <span className="text-sm font-medium">Signal</span>
        {model && <span className="truncate font-mono text-2xs text-ink-4">{model.model}</span>}
        <div className="ml-auto flex items-center gap-0.5">
          <Tooltip content="清空对话">
            <Button size="icon-sm" variant="ghost" aria-label="清空对话" onClick={clear}>
              <Eraser />
            </Button>
          </Tooltip>
          <Tooltip content="收起">
            <Button size="icon-sm" variant="ghost" aria-label="收起对话" onClick={() => setOpen(false)}>
              <ChevronDown />
            </Button>
          </Tooltip>
        </div>
      </header>

      <div ref={scroller} className="scrollbar-thin min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4" aria-live="polite">
        {messages.map((message) => (
          <Message key={message.id} message={message} />
        ))}
        {busy && pending.length === 0 && <Thinking />}
        {error && (
          <p className="flex items-start gap-2 rounded-sm bg-danger-soft px-3 py-2 text-sm text-danger">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            {error.message || "Signal 暂时无法回应"}
          </p>
        )}
      </div>

      <AnimatePresence>{pending.length > 0 && <PlanCard key={pending.map((step) => step.approvalId).join()} steps={pending} />}</AnimatePresence>
    </motion.section>
  );
}

function Message({ message }: { message: UIMessage }) {
  if (message.role === "user") {
    const text = message.parts.map((part) => (part.type === "text" ? part.text : "")).join("");
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] rounded-lg rounded-br-sm bg-surface-3 px-3 py-2 text-sm whitespace-pre-wrap text-ink-1">{text}</p>
      </div>
    );
  }
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-signal-soft">
        <Sparkles className="size-3.5 text-signal" />
      </span>
      <div className="grid min-w-0 flex-1 gap-2">
        {message.parts.map((part, index) => {
          if (part.type === "text") return part.text ? <RichText key={index} text={part.text} /> : null;
          if (isToolPart(part)) return <ToolLine key={part.toolCallId} part={part} />;
          return null;
        })}
      </div>
    </div>
  );
}

/** Plain text with `code` spans; paths become clickable when they look like endpoint paths. */
function RichText({ text }: { text: string }) {
  const segments = text.split(/(`[^`]+`)/g);
  return (
    <p className="text-sm leading-relaxed whitespace-pre-wrap text-ink-1">
      {segments.map((segment, index) =>
        segment.startsWith("`") && segment.endsWith("`") ? (
          <code key={index} className="rounded-[4px] bg-surface-2 px-1 py-0.5 font-mono text-[0.92em]">
            {segment.slice(1, -1)}
          </code>
        ) : (
          <Fragment key={index}>{segment}</Fragment>
        ),
      )}
    </p>
  );
}

type ToolPartView = { type: string; toolCallId: string; state: string; input?: Record<string, unknown>; output?: unknown; errorText?: string; approval?: { approved?: boolean } };

function outputSummary(name: string, output: unknown) {
  if (Array.isArray(output)) return `${output.length} 项`;
  if (output && typeof output === "object") {
    const record = output as Record<string, unknown>;
    if (typeof record.error === "string") return null;
    if (name === "share_link" && typeof record.url === "string") return record.url;
    if (name === "issue_access_key" && typeof record.key === "string") return `${record.group} · ${record.key}`;
  }
  return null;
}

function ToolLine({ part }: { part: ToolPartView }) {
  const navigate = useNavigate();
  const name = toolNameOf(part);
  const meta = metaOf(name);
  const target = targetOf(part.input);
  const failed = part.state === "output-error" || Boolean((part.output as { error?: unknown } | undefined)?.error);
  const denied = part.state === "output-denied" || (part.state === "approval-responded" && part.approval?.approved === false);
  const running = part.state === "input-streaming" || part.state === "input-available" || (part.state === "approval-responded" && part.approval?.approved);
  if (part.state === "approval-requested") return null; // shown in the plan card

  const icon = failed ? (
    <X className="size-3.5 text-danger" />
  ) : denied ? (
    <Ban className="size-3.5 text-ink-4" />
  ) : running ? (
    <Loader2 className="size-3.5 animate-spin text-ink-3" />
  ) : (
    <Check className={cn("size-3.5", meta.risk === "read" ? "text-ink-3" : "text-signal")} />
  );
  const summary = !failed && !denied && !running ? outputSummary(name, part.output) : null;
  const error = failed ? (part.errorText ?? String((part.output as { error?: unknown }).error)) : null;
  const isPath = target.startsWith("/");

  return (
    <div className="grid gap-1">
      <div className={cn("flex min-w-0 items-center gap-2 text-xs", denied ? "text-ink-4" : "text-ink-3")}>
        {icon}
        <span className={cn(denied && "line-through")}>{denied ? meta.title : running ? `${meta.title}…` : meta.done}</span>
        {target &&
          (isPath && !denied && meta.risk !== "destructive" ? (
            <button type="button" className="truncate font-mono text-ink-2 hover:text-signal" onClick={() => navigate(`/app/endpoints${target}`)}>
              {target}
            </button>
          ) : (
            <span className="truncate font-mono text-ink-2">{target}</span>
          ))}
        {summary && <span className="truncate font-mono text-ink-4">· {summary}</span>}
        {name === "issue_access_key" && !failed && !denied && !running && (
          <Link to="/app/access" className="shrink-0 text-pass hover:underline">
            查看完整密钥
          </Link>
        )}
      </div>
      {error && <p className="pl-5 text-xs text-danger">{error}</p>}
    </div>
  );
}

function Thinking() {
  return (
    <div className="flex items-center gap-3" aria-label="Signal 正在思考">
      <span className="grid size-6 place-items-center rounded-full bg-signal-soft">
        <Sparkles className="size-3.5 animate-pulse text-signal" />
      </span>
      <span className="h-2 w-40 animate-pulse rounded-full bg-[linear-gradient(90deg,var(--surface-2),var(--signal-soft),var(--surface-2))]" />
    </div>
  );
}

const riskStyle = {
  read: "bg-ink-4",
  write: "bg-signal",
  publish: "bg-signal shadow-[0_0_8px_var(--signal)]",
  destructive: "bg-danger",
} as const;

function StepDetail({ step }: { step: PlanStep }) {
  const input = step.input;
  const rows: [string, ReactNode][] = [];
  if (step.toolName === "create_endpoint") {
    rows.push(["类型", String(input.type ?? "")]);
    rows.push(["访问", input.access === "protected" ? `受保护 · ${(input.groups as string[] | undefined)?.join("、") ?? ""}` : "公开"]);
  }
  for (const key of ["targetUrl", "baseUrl", "contentType", "newPath", "access", "enabled", "note", "expiresInDays", "description"]) {
    if (input[key] !== undefined && !(step.toolName === "create_endpoint" && key === "access")) rows.push([key, String(input[key])]);
  }
  if (Array.isArray(input.groups) && step.toolName !== "create_endpoint") rows.push(["权限组", (input.groups as string[]).join("、")]);
  const content = typeof input.content === "string" ? input.content : null;
  if (!rows.length && !content) return null;
  return (
    <div className="mt-1.5 grid gap-1 pl-6 text-xs">
      {rows.map(([label, value]) => (
        <div key={label} className="flex gap-2">
          <span className="w-16 shrink-0 text-ink-4">{label}</span>
          <span className="min-w-0 truncate font-mono text-ink-2">{value}</span>
        </div>
      ))}
      {content !== null && (
        <pre className="scrollbar-thin mt-1 max-h-28 overflow-auto rounded-sm bg-surface-1 p-2 font-mono text-2xs leading-relaxed text-ink-2 shadow-[inset_0_0_0_1px_var(--line)]">
          {content || "（空）"}
        </pre>
      )}
    </div>
  );
}

/** Pending approvals as one plan the user can trim and run (docs/REDESIGN.md §5.4). */
function PlanCard({ steps }: { steps: PlanStep[] }) {
  const { respond } = useSignal();
  const [chosen, setChosen] = useState(() => new Set(steps.map((step) => step.approvalId)));
  const destructive = useMemo(() => steps.some((step) => chosen.has(step.approvalId) && step.risk === "destructive"), [steps, chosen]);
  const count = chosen.size;

  const run = () => respond(Object.fromEntries(steps.map((step) => [step.approvalId, chosen.has(step.approvalId)])));
  const declineAll = () => respond(Object.fromEntries(steps.map((step) => [step.approvalId, false])));

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={glide}
      className="shrink-0 border-t border-line bg-surface-solid/80 px-4 py-3"
    >
      <div className="mb-2 flex items-center gap-2 text-xs font-medium text-ink-2">
        <span className="size-1.5 animate-ghost rounded-full bg-signal" />
        需要你确认 {steps.length} 项操作
      </div>
      <ul className="scrollbar-thin grid max-h-56 gap-1 overflow-y-auto">
        {steps.map((step, index) => {
          const meta = metaOf(step.toolName);
          const on = chosen.has(step.approvalId);
          return (
            <li key={step.approvalId} className={cn("rounded-md px-2 py-2 transition-colors", on ? "bg-surface-2" : "opacity-60")}>
              <label className="flex cursor-pointer items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() =>
                    setChosen((current) => {
                      const next = new Set(current);
                      if (next.has(step.approvalId)) next.delete(step.approvalId);
                      else next.add(step.approvalId);
                      return next;
                    })
                  }
                  className="size-3.5 accent-[var(--signal)]"
                />
                <span className={cn("size-1.5 shrink-0 rounded-full", riskStyle[step.risk])} />
                <span className="font-mono text-2xs text-ink-4">{index + 1}</span>
                <span className={cn("text-sm", step.risk === "destructive" ? "text-danger" : "text-ink-1")}>{meta.title}</span>
                <span className="truncate font-mono text-xs text-ink-2">{targetOf(step.input)}</span>
              </label>
              <StepDetail step={step} />
            </li>
          );
        })}
      </ul>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-2xs text-ink-4">{destructive ? "包含不可撤销的操作" : "发布、删除等操作会立即影响线上访问"}</span>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={declineAll}>
            全部拒绝
          </Button>
          <Button size="sm" variant={destructive ? "danger" : "primary"} disabled={count === 0} onClick={run}>
            执行所选 ({count})
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
