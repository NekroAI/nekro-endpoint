import type { AccessKey, PermissionGroup, User } from "../../../../common/types";
import type { EndpointWire } from "../endpoints/model";
import { safeLocalStorage } from "../../utils/storage";
import { chatResponse } from "./signal";

/**
 * The /demo workspace's backend: the management API answered in the browser
 * from a seeded namespace. Responses follow the contract snapshots
 * (test/contract/__snapshots__) so the real UI runs unchanged; nothing leaves
 * the page and the state lives in this browser only.
 */
export const DEMO_ORIGIN = "https://edge.example.com";
export const DEMO_USER: User = {
  id: "demo_user",
  username: "you",
  email: null,
  avatarUrl: null,
  apiKey: "sec-demo",
  role: "user",
  isActivated: true,
  createdAt: "2026-09-01T08:00:00.000Z",
};

type Endpoint = Omit<EndpointWire, "config" | "requiredPermissionGroups"> & {
  config: Record<string, unknown>;
  requiredPermissionGroups: string[] | null;
};
type Action = { id: string; source: string; tool: string; input: string; ok: boolean; message: string | null; createdAt: string };
export type DemoState = { endpoints: Endpoint[]; groups: PermissionGroup[]; keys: AccessKey[]; actions: Action[] };

const STORAGE_KEY = "endpoints_demo_v1";
const day = 86_400_000;
const ago = (ms: number) => new Date(Date.now() - ms).toISOString();
const ahead = (ms: number) => new Date(Date.now() + ms).toISOString();
const randomId = () => crypto.randomUUID().replace(/-/g, "").slice(0, 21);
const randomKey = () =>
  `ep-${Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;

function seed(): DemoState {
  const endpoint = (
    id: string,
    path: string,
    name: string,
    type: Endpoint["type"],
    config: Record<string, unknown>,
    extra: Partial<Endpoint> = {},
  ): Endpoint => ({
    id,
    path,
    name,
    type,
    config,
    accessControl: "public",
    requiredPermissionGroups: null,
    enabled: true,
    isPublished: true,
    sortOrder: 0,
    parentId: null,
    createdAt: ago(20 * day),
    updatedAt: ago(2 * day),
    ...extra,
  });
  const group = (id: string, name: string, description: string): PermissionGroup => ({
    id,
    ownerUserId: DEMO_USER.id,
    name,
    description,
    createdAt: ago(18 * day),
    updatedAt: ago(18 * day),
  });
  const key = (id: string, groupId: string, description: string, extra: Partial<AccessKey> = {}): AccessKey => ({
    id,
    permissionGroupId: groupId,
    keyValue: randomKey(),
    description,
    expiresAt: null,
    isActive: true,
    lastUsedAt: ago(3 * 3_600_000),
    usageCount: 0,
    createdAt: ago(15 * day),
    ...extra,
  });

  return {
    endpoints: [
      endpoint(
        "demo_status",
        "/status",
        "服务状态",
        "static",
        {
          content: JSON.stringify({ status: "ok", region: "edge", updatedAt: "2026-10-01T08:00:00Z" }, null, 2),
          contentType: "application/json; charset=utf-8",
        },
        { sortOrder: 0 },
      ),
      endpoint(
        "demo_configs",
        "/configs",
        "配置中心",
        "static",
        { content: "这里汇总团队共用的配置文件。\n", contentType: "text/plain; charset=utf-8" },
        { sortOrder: 1 },
      ),
      endpoint(
        "demo_app_yaml",
        "/configs/app.yaml",
        "应用配置",
        "static",
        {
          content: "app:\n  name: storefront\n  locale: zh-CN\nfeatures:\n  checkout_v2: true\n  dark_mode: true\n",
          contentType: "text/yaml; charset=utf-8",
        },
        { parentId: "demo_configs", accessControl: "authenticated", requiredPermissionGroups: ["demo_team"], sortOrder: 0 },
      ),
      endpoint(
        "demo_flags",
        "/configs/flags.json",
        "功能开关",
        "static",
        {
          content: JSON.stringify({ newOnboarding: false, betaSearch: true }, null, 2),
          contentType: "application/json; charset=utf-8",
        },
        {
          parentId: "demo_configs",
          accessControl: "authenticated",
          requiredPermissionGroups: ["demo_team", "demo_partner"],
          isPublished: false,
          sortOrder: 1,
          updatedAt: ago(40 * 60_000),
        },
      ),
      endpoint(
        "demo_weather",
        "/api/weather",
        "上海天气",
        "proxy",
        {
          targetUrl: "https://api.open-meteo.com/v1/forecast?latitude=31.23&longitude=121.47&current_weather=true",
          timeout: 10000,
        },
        { sortOrder: 2 },
      ),
      endpoint(
        "demo_mirror",
        "/mirror/github",
        "GitHub Raw 加速",
        "dynamicProxy",
        { baseUrl: "https://raw.githubusercontent.com/", autoAppendSlash: true, timeout: 15000 },
        { sortOrder: 3 },
      ),
      endpoint(
        "demo_changelog",
        "/docs/changelog.md",
        "更新日志",
        "static",
        { content: "# 更新日志\n\n- 2026-09：上线新版控制台\n", contentType: "text/markdown; charset=utf-8" },
        { enabled: false, sortOrder: 4 },
      ),
    ],
    groups: [group("demo_team", "团队成员", "内部同事使用"), group("demo_partner", "合作伙伴", "外部合作方，按项目发放")],
    keys: [
      key("demo_key_laptop", "demo_team", "小王的笔记本", { usageCount: 128 }),
      key("demo_key_ci", "demo_team", "CI 流水线", { usageCount: 2047, lastUsedAt: ago(8 * 60_000) }),
      key("demo_key_acme", "demo_partner", "Acme 联调", { expiresAt: ahead(5 * day), usageCount: 36 }),
      key("demo_key_old", "demo_partner", "旧版合作方", { expiresAt: ago(3 * day), usageCount: 9, lastUsedAt: ago(4 * day) }),
    ],
    actions: [],
  };
}

let state: DemoState = load();

function load(): DemoState {
  try {
    const saved = safeLocalStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved) as DemoState;
  } catch {
    // Corrupt or unavailable storage: start from the seed.
  }
  return seed();
}

function save() {
  try {
    safeLocalStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage may be full or blocked; the demo keeps working in memory.
  }
}

export function resetDemo() {
  state = seed();
  save();
}

export function demoState() {
  return state;
}

// ---- Wire shapes ----------------------------------------------------------

/** List, create and update return JSON strings; detail returns parsed values (frozen contract). */
const wire = (endpoint: Endpoint) => ({
  ...endpoint,
  ownerUserId: DEMO_USER.id,
  config: JSON.stringify(endpoint.config),
  requiredPermissionGroups: endpoint.requiredPermissionGroups ? JSON.stringify(endpoint.requiredPermissionGroups) : null,
});
const detail = (endpoint: Endpoint) => ({ ...endpoint, ownerUserId: DEMO_USER.id });

class Failure {
  constructor(
    readonly status: number,
    readonly message: string,
  ) {}
}
const fail = (status: number, message: string): never => {
  throw new Failure(status, message);
};

const findEndpoint = (id: string) => state.endpoints.find((endpoint) => endpoint.id === id) ?? fail(404, "端点不存在");
const findGroup = (id: string) => state.groups.find((group) => group.id === id) ?? fail(404, "权限组不存在");
const findKey = (id: string) => state.keys.find((key) => key.id === id) ?? fail(404, "访问密钥不存在");
const now = () => new Date().toISOString();

// ---- Operations shared by the REST handlers and the scripted Signal ------

export const ops = {
  createEndpoint(input: {
    path: string;
    name: string;
    type: Endpoint["type"];
    config: Record<string, unknown>;
    parentId?: string | null;
    accessControl?: Endpoint["accessControl"];
    requiredPermissionGroups?: string[];
  }) {
    if (!/^[a-zA-Z0-9\-_/.]+$/.test(input.path)) fail(400, "路径只能包含字母、数字、连字符、下划线、斜杠和点号");
    if (state.endpoints.some((endpoint) => endpoint.path === input.path)) fail(409, "该路径已存在");
    const parent = input.parentId ? findEndpoint(input.parentId) : null;
    if (parent?.type === "dynamicProxy") fail(400, "不能在动态代理端点下创建子端点");
    const siblings = state.endpoints.filter((endpoint) => endpoint.parentId === (input.parentId ?? null));
    const created: Endpoint = {
      id: randomId(),
      path: input.path,
      name: input.name,
      type: input.type,
      config: input.config,
      accessControl: input.accessControl ?? "public",
      requiredPermissionGroups: input.requiredPermissionGroups?.length ? input.requiredPermissionGroups : null,
      enabled: true,
      isPublished: false,
      sortOrder: siblings.length ? Math.max(...siblings.map((endpoint) => endpoint.sortOrder)) + 1 : 0,
      parentId: input.parentId ?? null,
      createdAt: now(),
      updatedAt: now(),
    };
    state.endpoints.push(created);
    save();
    return created;
  },

  updateEndpoint(id: string, patch: Record<string, unknown>) {
    const endpoint = findEndpoint(id);
    if (typeof patch.path === "string" && patch.path !== endpoint.path) {
      if (state.endpoints.some((other) => other.path === patch.path && other.id !== id)) fail(409, "该路径已被其他端点使用");
      endpoint.path = patch.path;
    }
    if (typeof patch.name === "string") endpoint.name = patch.name;
    if (patch.config && typeof patch.config === "object") endpoint.config = patch.config as Record<string, unknown>;
    if (patch.accessControl === "public" || patch.accessControl === "authenticated") endpoint.accessControl = patch.accessControl;
    if (Array.isArray(patch.requiredPermissionGroups)) {
      endpoint.requiredPermissionGroups = patch.requiredPermissionGroups.length ? (patch.requiredPermissionGroups as string[]) : null;
    }
    if (typeof patch.enabled === "boolean") endpoint.enabled = patch.enabled;
    if (patch.parentId !== undefined) endpoint.parentId = (patch.parentId as string | null) ?? null;
    endpoint.updatedAt = now();
    save();
    return endpoint;
  },

  setPublished(id: string, published: boolean) {
    const endpoint = findEndpoint(id);
    endpoint.isPublished = published;
    endpoint.updatedAt = now();
    save();
    return endpoint;
  },

  deleteEndpoint(id: string) {
    findEndpoint(id);
    state.endpoints = state.endpoints.filter((endpoint) => endpoint.id !== id);
    for (const endpoint of state.endpoints) if (endpoint.parentId === id) endpoint.parentId = null;
    save();
  },

  issueKey(groupId: string, input: { description?: string; expiresAt?: string }) {
    findGroup(groupId);
    const key: AccessKey = {
      id: randomId(),
      permissionGroupId: groupId,
      keyValue: randomKey(),
      description: input.description ?? null,
      expiresAt: input.expiresAt ?? null,
      isActive: true,
      lastUsedAt: null,
      usageCount: 0,
      createdAt: now(),
    };
    state.keys.push(key);
    save();
    return key;
  },

  log(tool: string, input: unknown, ok: boolean, message: string | null) {
    state.actions.unshift({ id: randomId(), source: "signal", tool, input: JSON.stringify(input), ok, message, createdAt: now() });
    state.actions = state.actions.slice(0, 50);
    save();
  },
};

// ---- REST router ------------------------------------------------------------

type Body = Record<string, unknown>;
type Handler = (match: string[], body: Body, url: URL) => { status?: number; body: unknown };
const routes: [string, RegExp, Handler][] = [];
const on = (method: string, pattern: string, handler: Handler) =>
  routes.push([method, new RegExp(`^${pattern.replace(/:\w+/g, "([^/]+)")}$`), handler]);
const ok = (data: unknown, message?: string, status = 200) => ({
  status,
  body: { success: true, ...(message ? { message } : {}), ...(data === undefined ? {} : { data }) },
});

on("GET", "/auth/me", () => ({ body: DEMO_USER }));
on("GET", "/endpoints", () => {
  const endpoints = [...state.endpoints].sort((a, b) => a.sortOrder - b.sortOrder).map(wire);
  return ok({ endpoints, total: endpoints.length });
});
on("POST", "/endpoints", (_, body) => ok({ endpoint: wire(ops.createEndpoint(body as Parameters<typeof ops.createEndpoint>[0])) }, "端点创建成功", 201));
on("POST", "/endpoints/reorder", (_, body) => {
  for (const { id, sortOrder } of (body.orders as { id: string; sortOrder: number }[]) ?? []) {
    const endpoint = state.endpoints.find((candidate) => candidate.id === id);
    if (endpoint) endpoint.sortOrder = sortOrder;
  }
  save();
  return ok(undefined, "排序更新成功");
});
on("GET", "/endpoints/:id", ([id]) => ok(detail(findEndpoint(id))));
on("PATCH", "/endpoints/:id", ([id], body) => ok({ endpoint: wire(ops.updateEndpoint(id, body)) }, "端点更新成功"));
on("DELETE", "/endpoints/:id", ([id]) => {
  ops.deleteEndpoint(id);
  return ok(undefined, "端点删除成功");
});
on("POST", "/endpoints/:id/publish", ([id]) => ok({ endpoint: wire(ops.setPublished(id, true)) }, "端点发布成功"));
on("POST", "/endpoints/:id/unpublish", ([id]) => ok({ endpoint: wire(ops.setPublished(id, false)) }, "端点已下线"));

on("GET", "/permission-groups", () => ok({ groups: state.groups, total: state.groups.length }));
on("POST", "/permission-groups", (_, body) => {
  const group: PermissionGroup = {
    id: randomId(),
    ownerUserId: DEMO_USER.id,
    name: String(body.name ?? ""),
    description: typeof body.description === "string" ? body.description : null,
    createdAt: now(),
    updatedAt: now(),
  };
  if (!group.name) fail(400, "请输入权限组名称");
  state.groups.push(group);
  save();
  return ok({ group }, "权限组创建成功", 201);
});
on("PATCH", "/permission-groups/:id", ([id], body) => {
  const group = findGroup(id);
  if (typeof body.name === "string") group.name = body.name;
  if (typeof body.description === "string") group.description = body.description;
  group.updatedAt = now();
  save();
  return ok({ group }, "权限组更新成功");
});
on("DELETE", "/permission-groups/:id", ([id]) => {
  findGroup(id);
  state.groups = state.groups.filter((group) => group.id !== id);
  state.keys = state.keys.filter((key) => key.permissionGroupId !== id);
  for (const endpoint of state.endpoints) {
    if (endpoint.requiredPermissionGroups?.includes(id)) {
      const rest = endpoint.requiredPermissionGroups.filter((groupId) => groupId !== id);
      endpoint.requiredPermissionGroups = rest.length ? rest : null;
    }
  }
  save();
  return ok(undefined, "权限组删除成功");
});
on("GET", "/permission-groups/:id/keys", ([id]) => {
  findGroup(id);
  const keys = state.keys.filter((key) => key.permissionGroupId === id);
  return ok({ keys, total: keys.length });
});
on("POST", "/permission-groups/:id/keys", ([id], body) =>
  ok(
    { key: ops.issueKey(id, body as { description?: string; expiresAt?: string }) },
    "密钥创建成功，请立即保存，此密钥仅显示一次",
    201,
  ),
);
on("GET", "/permission-groups/:id/endpoints", ([id]) => {
  findGroup(id);
  const endpoints = state.endpoints
    .filter((endpoint) => endpoint.requiredPermissionGroups?.includes(id))
    .map(({ id: endpointId, path, name, type, accessControl, enabled, isPublished }) => ({
      id: endpointId,
      path,
      name,
      type,
      accessControl,
      enabled,
      isPublished,
    }));
  return ok({ endpoints, total: endpoints.length });
});
on("POST", "/access-keys/:id/revoke", ([id]) => {
  findKey(id).isActive = false;
  save();
  return ok(undefined, "访问密钥已撤销");
});
on("PATCH", "/access-keys/:id", ([id], body) => {
  const key = findKey(id);
  if (typeof body.description === "string") key.description = body.description;
  if (typeof body.isActive === "boolean") key.isActive = body.isActive;
  if (typeof body.expiresAt === "string") key.expiresAt = body.expiresAt;
  save();
  return ok({ key }, "访问密钥更新成功");
});
on("DELETE", "/access-keys/:id", ([id]) => {
  findKey(id);
  state.keys = state.keys.filter((key) => key.id !== id);
  save();
  return ok(undefined, "访问密钥删除成功");
});

on("GET", "/activation-request", () => ok({ activated: true, request: null }));
on("GET", "/signal/config", () =>
  ok({
    available: true,
    active: "platform",
    user: null,
    platform: { provider: "anthropic", model: "演示脚本", baseUrl: null, keyHint: null, updatedAt: DEMO_USER.createdAt },
  }),
);
on("GET", "/signal/actions", () => ok({ actions: state.actions }));

const latency = () => new Promise((resolve) => setTimeout(resolve, 120 + Math.random() * 180));
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=UTF-8" } });

/** The sandbox fetch installed by DemoRoot: answers /api/* locally. */
export async function demoFetch(input: string, init: RequestInit): Promise<Response> {
  const url = new URL(input, "http://demo.local");
  const path = url.pathname.replace(/^.*?\/api(?=\/)/, "");
  const method = (init.method ?? "GET").toUpperCase();
  let body: Body = {};
  if (typeof init.body === "string") {
    try {
      body = JSON.parse(init.body) as Body;
    } catch {
      body = {};
    }
  }
  if (path === "/signal/chat" && method === "POST") return chatResponse(body, init.signal ?? undefined);

  await latency();
  for (const [routeMethod, pattern, handler] of routes) {
    const match = pattern.exec(path);
    if (routeMethod !== method || !match) continue;
    try {
      const result = handler(match.slice(1).map(decodeURIComponent), body, url);
      return json(result.status ?? 200, result.body);
    } catch (error) {
      if (error instanceof Failure) return json(error.status, { success: false, message: error.message });
      throw error;
    }
  }
  return json(404, { success: false, message: "演示环境不支持此操作，部署自己的实例即可使用完整功能" });
}

// ---- Simulated public access ---------------------------------------------

export type SimulatedResponse = {
  url: string;
  status: number;
  headers: [string, string][];
  body: string;
  note: string | null;
};

/** What the edge would answer for a published URL (src/routes/execution.ts), without any network. */
export function simulate(raw: string): SimulatedResponse {
  const url = new URL(raw, DEMO_ORIGIN);
  const prefix = `/e/${DEMO_USER.username}`;
  const path = decodeURIComponent(url.pathname.startsWith(prefix) ? url.pathname.slice(prefix.length) : url.pathname) || "/";
  const result = (
    status: number,
    body: string,
    headers: [string, string][] = [],
    note: string | null = null,
  ): SimulatedResponse => ({
    url: url.toString(),
    status,
    headers: headers.length ? headers : [["content-type", "application/json; charset=UTF-8"] as [string, string]],
    body,
    note,
  });
  const error = (status: number, message: string, note?: string) =>
    result(status, JSON.stringify({ success: false, message }, null, 2), [], note ?? null);

  const exact = state.endpoints.find((endpoint) => endpoint.path === path);
  const dynamic = exact
    ? null
    : state.endpoints
        .filter((endpoint) => endpoint.type === "dynamicProxy" && path.startsWith(`${endpoint.path}/`))
        .sort((a, b) => b.path.length - a.path.length)[0];
  const endpoint = exact ?? dynamic;
  if (!endpoint || !endpoint.isPublished) return error(404, "端点不存在", endpoint ? "这个端点还是草稿：发布后才能访问。" : undefined);
  if (!endpoint.enabled) return error(503, "端点已停用", "停用的端点保留配置，但暂停对外服务。");

  if (endpoint.accessControl === "authenticated") {
    const value = url.searchParams.get("access_key");
    if (!value) return error(401, "需要访问密钥", "受保护端点需要带上通行卡：查询参数 access_key 或请求头 X-Access-Key。");
    const key = state.keys.find((candidate) => candidate.keyValue === value);
    const expired = key?.expiresAt && new Date(key.expiresAt).getTime() < Date.now();
    if (!key || !key.isActive || expired) return error(401, "访问密钥无效或已过期");
    if (!endpoint.requiredPermissionGroups?.includes(key.permissionGroupId)) return error(403, "访问密钥无权访问此端点");
    key.usageCount += 1;
    key.lastUsedAt = now();
    save();
  }

  const config = endpoint.config;
  if (endpoint.type === "static") {
    const headers = Object.entries((config.headers as Record<string, string> | undefined) ?? {});
    return result(200, String(config.content ?? ""), [
      ["content-type", String(config.contentType ?? "text/plain")],
      ["cache-control", "no-cache"],
      ...headers,
    ]);
  }
  if (endpoint.type === "proxy" || endpoint.type === "dynamicProxy") {
    const target =
      endpoint.type === "proxy"
        ? String(config.targetUrl ?? "")
        : `${String(config.baseUrl ?? "").replace(/\/?$/, "/")}${path.slice(endpoint.path.length + 1)}`;
    return result(
      200,
      `转发到 ${target}\n\n（演示环境不会发出真实请求。部署后，这里返回的就是目标服务的真实响应。）`,
      [
        ["content-type", "text/plain; charset=utf-8"],
        ["x-forwarded-to", target],
      ],
      "代理会去掉平台凭据（sec-、ep- 与会话令牌），其余请求头原样转发。",
    );
  }
  return error(501, "脚本端点即将推出");
}
