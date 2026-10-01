import type {
  AccessControl,
  DynamicProxyConfig,
  EndpointType,
  ProxyConfig,
  ScriptConfig,
  StaticConfig,
} from "../../../../common/types";

/**
 * View model for an endpoint. The API returns `config` and
 * `requiredPermissionGroups` as JSON strings from list/create/update and as
 * parsed values from detail (frozen contract, docs/REDESIGN.md §1.2); both
 * shapes are normalised here so components never call JSON.parse.
 */
export type ConfigByType = {
  static: StaticConfig;
  proxy: ProxyConfig;
  dynamicProxy: DynamicProxyConfig;
  script: ScriptConfig;
};

export type EndpointView<T extends EndpointType = EndpointType> = {
  id: string;
  path: string;
  name: string;
  type: T;
  config: ConfigByType[T];
  accessControl: AccessControl;
  groups: string[];
  enabled: boolean;
  isPublished: boolean;
  sortOrder: number;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  /** A Signal plan step that has not run yet (docs/REDESIGN.md §5.4); never sent to the API. */
  ghost?: "create";
};

export type EndpointWire = {
  id: string;
  path: string;
  name: string;
  type: EndpointType;
  config: string | Record<string, unknown>;
  accessControl: AccessControl;
  requiredPermissionGroups: string | string[] | null;
  enabled: boolean;
  isPublished: boolean;
  sortOrder: number;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
};

function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string") return (value as T) ?? fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function toView(wire: EndpointWire): EndpointView {
  return {
    id: wire.id,
    path: wire.path,
    name: wire.name,
    type: wire.type,
    config: parseJson(wire.config, {}) as EndpointView["config"],
    accessControl: wire.accessControl,
    groups: parseJson<string[] | null>(wire.requiredPermissionGroups, null) ?? [],
    enabled: wire.enabled,
    isPublished: wire.isPublished,
    sortOrder: wire.sortOrder,
    parentId: wire.parentId,
    createdAt: wire.createdAt,
    updatedAt: wire.updatedAt,
  };
}

export type EndpointStatus = "live" | "draft" | "disabled";

/** What a visitor gets: disabled wins over published, matching /e/* (503). */
export function statusOf(endpoint: Pick<EndpointView, "enabled" | "isPublished">): EndpointStatus {
  if (!endpoint.enabled) return "disabled";
  return endpoint.isPublished ? "live" : "draft";
}

export const statusLabel: Record<EndpointStatus, string> = {
  live: "在线",
  draft: "草稿",
  disabled: "已停用",
};

export const PATH_PATTERN = /^[a-zA-Z0-9\-_/.]+$/;

/** Mirrors the server rule plus the leading slash the UI always adds. */
export function normalizePath(input: string) {
  const trimmed = input.trim();
  const withSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withSlash.replace(/\/{2,}/g, "/");
}

export function validatePath(path: string, taken: (path: string) => boolean): string | null {
  if (path === "/" || path.length < 2) return "请输入路径";
  if (path.length > 255) return "路径最长 255 个字符";
  if (!PATH_PATTERN.test(path)) return "只能包含字母、数字、- _ . 和 /";
  if (path.split("/").some((part) => part === "." || part === "..")) return "路径不能包含 . 或 .. 段";
  if (path.endsWith("/")) return "路径不能以 / 结尾";
  if (taken(path)) return "这个路径已经被使用";
  return null;
}

export function defaultConfig<T extends EndpointType>(type: T): ConfigByType[T] {
  const configs: ConfigByType = {
    static: { content: "", contentType: "text/plain", headers: {} },
    proxy: { targetUrl: "https://example.com/", headers: {}, removeHeaders: [], timeout: 10000 },
    dynamicProxy: { baseUrl: "", autoAppendSlash: true, headers: {}, removeHeaders: [], timeout: 15000, allowedPaths: [] },
    script: {
      code: "// 脚本端点即将推出\nexport default async function handler(request) {\n  return new Response('Hello from the edge');\n}\n",
      runtime: "javascript",
    },
  };
  return configs[type];
}

export function proxyTargetHost(endpoint: EndpointView): string | null {
  const url =
    endpoint.type === "proxy"
      ? (endpoint.config as ProxyConfig).targetUrl
      : endpoint.type === "dynamicProxy"
        ? (endpoint.config as DynamicProxyConfig).baseUrl
        : null;
  if (!url) return null;
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}
