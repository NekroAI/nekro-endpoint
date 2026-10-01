import api from "../routes/api";
import type { Bindings } from "../types";

/**
 * Calls the frozen management API in-process, authenticated as the acting
 * user with their own management key. Agent and MCP tools therefore go
 * through exactly the same middleware, ownership checks and activation rules
 * as external clients, and their behaviour is covered by the contract tests
 * (docs/REDESIGN.md §5.2). routes/api.ts must never import the agent modules.
 */
export type ApiResult<T = unknown> = { status: number; ok: boolean; body: T };

export class PlatformClient {
  constructor(
    private readonly env: Bindings,
    private readonly apiKey: string,
  ) {}

  async call<T = unknown>(method: string, path: string, body?: unknown): Promise<ApiResult<T>> {
    const headers = new Headers({ Authorization: `Bearer ${this.apiKey}` });
    let payload: string | undefined;
    if (body !== undefined) {
      headers.set("Content-Type", "application/json");
      payload = JSON.stringify(body);
    }
    const response = await api.request(path, { method, headers, body: payload }, this.env);
    const parsed = (await response.json().catch(() => null)) as T;
    const envelopeFailed = Boolean(parsed && typeof parsed === "object" && (parsed as { success?: unknown }).success === false);
    return { status: response.status, ok: response.ok && !envelopeFailed, body: parsed };
  }
}

export class ToolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ToolError";
  }
}

/** Unwraps `{ success, data }`, turning API failures into readable tool errors. */
export async function apiData<T>(client: PlatformClient, method: string, path: string, body?: unknown): Promise<T> {
  const result = await client.call<{ data?: T; message?: string; error?: unknown }>(method, path, body);
  if (!result.ok) {
    const message = result.body?.message ?? (typeof result.body?.error === "string" ? result.body.error : null);
    throw new ToolError(message ? `${message}（HTTP ${result.status}）` : `请求失败（HTTP ${result.status}）`);
  }
  return result.body?.data as T;
}
