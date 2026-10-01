import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { request, requestData } from "../../lib/api";

export type AiProvider = "openai" | "anthropic" | "openai-compatible";
export type AiConfigView = { provider: AiProvider; model: string; baseUrl: string | null; keyHint: string | null; updatedAt: string };
export type AiConfigState = {
  available: boolean;
  active: "user" | "platform" | null;
  user: AiConfigView | null;
  platform: AiConfigView | null;
};
export type AiConfigInput = { provider: AiProvider; model: string; baseUrl?: string | null; apiKey?: string };
export type AiTestResult = { ok: boolean; toolCalling: boolean; latencyMs: number; message: string };
export type AgentAction = { id: string; source: string; tool: string; input: string; ok: boolean; message: string | null; createdAt: string };

const keys = {
  config: ["signal", "ai", "config"] as const,
  actions: ["signal", "ai", "actions"] as const,
};

export function useSignalConfig() {
  return useQuery({ queryKey: keys.config, queryFn: () => requestData<AiConfigState>("/signal/config"), staleTime: 60_000 });
}

export function useSaveConfig(scope: "user" | "platform") {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: AiConfigInput) =>
      request(scope === "user" ? "/signal/config" : "/signal/platform-config", { method: "PUT", body: input }),
    onSuccess: () => client.invalidateQueries({ queryKey: keys.config }),
  });
}

export function useDeleteConfig(scope: "user" | "platform") {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => request(scope === "user" ? "/signal/config" : "/signal/platform-config", { method: "DELETE" }),
    onSuccess: () => client.invalidateQueries({ queryKey: keys.config }),
  });
}

export function useTestConfig() {
  return useMutation({
    mutationFn: (input?: AiConfigInput) => requestData<AiTestResult>("/signal/config/test", { method: "POST", body: input ?? {} }),
  });
}

export function useAgentActions(enabled: boolean) {
  return useQuery({
    queryKey: keys.actions,
    queryFn: async () => (await requestData<{ actions: AgentAction[] }>("/signal/actions")).actions,
    enabled,
  });
}

export const PROVIDERS: Record<AiProvider, { label: string; hint: string; models: string[]; needsBaseUrl: boolean }> = {
  anthropic: { label: "Anthropic", hint: "Claude 系列", models: ["claude-sonnet-5-5", "claude-opus-5-5", "claude-haiku-4-5-20251001"], needsBaseUrl: false },
  openai: { label: "OpenAI", hint: "官方 API", models: ["gpt-5", "gpt-5-mini"], needsBaseUrl: false },
  "openai-compatible": {
    label: "OpenAI 兼容",
    hint: "DeepSeek、通义、OpenRouter 或任何兼容服务",
    models: ["deepseek-chat", "qwen-plus"],
    needsBaseUrl: true,
  },
};
