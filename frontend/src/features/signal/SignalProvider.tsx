import { useChat } from "@ai-sdk/react";
import { useQueryClient } from "@tanstack/react-query";
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithApprovalResponses, type UIMessage } from "ai";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { getApiBase } from "../../../../common/config/api";
import { safeLocalStorage } from "../../utils/storage";
import { apiFetch } from "../../lib/api";
import { useSignalConfig, type AiConfigView } from "./api";
import { ghostOf, metaOf, type Ghost, type Risk } from "./tools";

export type PlanStep = {
  approvalId: string;
  toolCallId: string;
  toolName: string;
  input: Record<string, unknown>;
  risk: Risk;
};

type ToolPart = {
  type: string;
  toolCallId: string;
  state: string;
  input?: Record<string, unknown>;
  output?: unknown;
  errorText?: string;
  approval?: { id: string; approved?: boolean };
};

type MessagePart = UIMessage["parts"][number];
export const toolNameOf = (part: { type: string }) => part.type.replace(/^tool-/, "");
export const isToolPart = (part: MessagePart): part is MessagePart & ToolPart => part.type.startsWith("tool-");

type SignalState = {
  /** Whether a model is configured and the chat can be used. */
  enabled: boolean;
  model: AiConfigView | null;
  messages: UIMessage[];
  status: "submitted" | "streaming" | "ready" | "error";
  error: Error | undefined;
  send: (text: string) => void;
  stop: () => void;
  clear: () => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  pending: PlanStep[];
  respond: (decisions: Record<string, boolean>) => void;
  ghosts: Ghost[];
  setContext: (context: { path?: string; page?: string }) => void;
};

const SignalContext = createContext<SignalState | null>(null);

export function useSignal() {
  const context = useContext(SignalContext);
  if (!context) throw new Error("useSignal must be used inside SignalProvider");
  return context;
}

/** Optional access for components that may render outside the workspace. */
export function useOptionalSignal() {
  return useContext(SignalContext);
}

export function SignalProvider({ children }: { children: ReactNode }) {
  const { data: config } = useSignalConfig();
  const client = useQueryClient();
  const context = useRef<{ path?: string; page?: string }>({});
  const [open, setOpen] = useState(false);

  const transport = useMemo(
    () =>
      new DefaultChatTransport<UIMessage>({
        api: `${getApiBase()}/api/signal/chat`,
        fetch: apiFetch,
        headers: (): Record<string, string> => {
          const token = safeLocalStorage.getItem("auth_token");
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
        body: () => ({ context: context.current }),
      }),
    [],
  );

  const chat = useChat({
    transport,
    // After the user answers every pending approval, continue automatically.
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
  });

  // Refresh workspace data whenever a tool finished.
  const seen = useRef(new Set<string>());
  useEffect(() => {
    let changed = false;
    for (const message of chat.messages) {
      for (const part of message.parts) {
        if (isToolPart(part) && part.state === "output-available" && !seen.current.has(part.toolCallId)) {
          seen.current.add(part.toolCallId);
          if (metaOf(toolNameOf(part)).risk !== "read") changed = true;
        }
      }
    }
    if (changed) {
      void client.invalidateQueries({ queryKey: ["signal", "endpoints"] });
      void client.invalidateQueries({ queryKey: ["signal", "access"] });
    }
  }, [chat.messages, client]);

  const pending = useMemo<PlanStep[]>(() => {
    const last = chat.messages[chat.messages.length - 1];
    if (!last || last.role !== "assistant") return [];
    return last.parts.filter(isToolPart).flatMap((part) =>
      part.state === "approval-requested" && part.approval
        ? [
            {
              approvalId: part.approval.id,
              toolCallId: part.toolCallId,
              toolName: toolNameOf(part),
              input: part.input ?? {},
              risk: metaOf(toolNameOf(part)).risk,
            },
          ]
        : [],
    );
  }, [chat.messages]);

  const ghosts = useMemo(
    () => pending.flatMap((step) => ghostOf(step.toolName, step.input) ?? []),
    [pending],
  );

  const { addToolApprovalResponse, sendMessage, setMessages, stop } = chat;
  const respond = useCallback(
    (decisions: Record<string, boolean>) => {
      for (const [id, approved] of Object.entries(decisions)) {
        void addToolApprovalResponse({ id, approved, reason: approved ? undefined : "用户拒绝了这一步" });
      }
    },
    [addToolApprovalResponse],
  );

  const send = useCallback(
    (text: string) => {
      if (!text.trim()) return;
      setOpen(true);
      // Unanswered approvals are declined when the user moves on.
      if (pending.length) respond(Object.fromEntries(pending.map((step) => [step.approvalId, false])));
      void sendMessage({ text: text.trim() });
    },
    [pending, respond, sendMessage],
  );

  const clear = useCallback(() => {
    stop();
    setMessages([]);
    seen.current.clear();
  }, [setMessages, stop]);

  const model = config?.available ? (config.active === "user" ? config.user : config.active === "platform" ? config.platform : null) : null;

  const value: SignalState = {
    enabled: Boolean(config?.available && config.active),
    model,
    messages: chat.messages,
    status: chat.status,
    error: chat.error,
    send,
    stop,
    clear,
    open,
    setOpen,
    pending,
    respond,
    ghosts,
    setContext: useCallback((next) => {
      context.current = { ...context.current, ...next };
    }, []),
  };
  return <SignalContext.Provider value={value}>{children}</SignalContext.Provider>;
}
