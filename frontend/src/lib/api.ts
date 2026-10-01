import { getApiBase } from "../../../common/config/api";
import { safeLocalStorage } from "../utils/storage";

/**
 * Typed access to the frozen management API (docs/REDESIGN.md §1.2, §3.3).
 * Responses are parsed, never reshaped on the server; envelopes and the
 * raw /auth/me object are both handled here so features stay declarative.
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly body: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * The in-browser demo (/demo) answers API calls locally instead of over the
 * network. It installs a sandbox before its workspace mounts; the console
 * itself never sets one.
 */
type Sandbox = { fetch: (url: string, init: RequestInit) => Promise<Response>; origin: string };
let sandbox: Sandbox | null = null;

export function installSandbox(next: Sandbox | null) {
  sandbox = next;
}

/** The origin published endpoints are served from (the demo uses a placeholder domain). */
export function sandboxOrigin() {
  return sandbox?.origin ?? null;
}

export const apiFetch: typeof fetch = (input, init) => {
  if (!sandbox) return fetch(input, init);
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  return sandbox.fetch(url, init ?? {});
};

type RequestOptions = { method?: string; body?: unknown; signal?: AbortSignal };

function messageOf(body: unknown, fallback: string) {
  if (body && typeof body === "object") {
    const record = body as { message?: unknown; error?: unknown };
    if (typeof record.message === "string" && record.message) return record.message;
    if (typeof record.error === "string" && record.error) return record.error;
    if (record.error && typeof record.error === "object" && "message" in record.error) {
      return String((record.error as { message: unknown }).message);
    }
  }
  return fallback;
}

export async function request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers();
  const token = safeLocalStorage.getItem("auth_token");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  let body: string | undefined;
  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(options.body);
  }

  const response = await apiFetch(`${getApiBase()}/api${path}`, {
    method: options.method ?? "GET",
    headers,
    body,
    signal: options.signal,
  });
  const parsed: unknown = await response.json().catch(() => null);

  if (!response.ok || (parsed && typeof parsed === "object" && (parsed as { success?: unknown }).success === false)) {
    throw new ApiError(response.status, messageOf(parsed, `请求失败（${response.status}）`), parsed);
  }
  return parsed as T;
}

/** For enveloped responses: returns `data`. */
export async function requestData<T>(path: string, options?: RequestOptions): Promise<T> {
  const body = await request<{ data: T }>(path, options);
  return body.data;
}

export function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "发生未知错误";
}
