/** Client-side labels for the server tool registry (src/agent/tools.ts). */
export type Risk = "read" | "write" | "publish" | "destructive";

export const TOOL_META: Record<string, { title: string; done: string; risk: Risk }> = {
  list_endpoints: { title: "查看端点", done: "读取了端点列表", risk: "read" },
  get_endpoint: { title: "查看端点", done: "读取了端点", risk: "read" },
  list_permission_groups: { title: "查看权限组", done: "读取了权限组", risk: "read" },
  list_access_keys: { title: "查看通行卡", done: "读取了通行卡", risk: "read" },
  share_link: { title: "访问地址", done: "生成了访问地址", risk: "read" },
  create_endpoint: { title: "新建端点", done: "新建了端点", risk: "write" },
  update_endpoint_settings: { title: "修改设置", done: "修改了设置", risk: "write" },
  update_endpoint_content: { title: "修改内容", done: "修改了内容", risk: "write" },
  publish_endpoint: { title: "发布", done: "发布了端点", risk: "publish" },
  unpublish_endpoint: { title: "取消发布", done: "取消发布了端点", risk: "publish" },
  create_permission_group: { title: "新建权限组", done: "新建了权限组", risk: "write" },
  issue_access_key: { title: "签发通行卡", done: "签发了通行卡", risk: "write" },
  revoke_access_key: { title: "吊销通行卡", done: "吊销了通行卡", risk: "destructive" },
  delete_endpoint: { title: "删除端点", done: "删除了端点", risk: "destructive" },
  delete_permission_group: { title: "删除权限组", done: "删除了权限组", risk: "destructive" },
};

export const metaOf = (name: string) => TOOL_META[name] ?? { title: name, done: name, risk: "write" as Risk };

/** The human-readable target of a call: a path, a group or a key. */
export function targetOf(input: Record<string, unknown> | undefined) {
  if (!input) return "";
  const value = input.path ?? input.group ?? input.name ?? input.keyId ?? input.prefix;
  return typeof value === "string" ? value : "";
}

const normalize = (path: string) => (path.startsWith("/") ? path : `/${path}`).replace(/\/$/, "");

export type Ghost = { path: string; kind: "create" | "update" | "delete" | "publish" };

/** Pending calls drawn on the namespace before they run (docs/REDESIGN.md §5.4). */
export function ghostOf(toolName: string, input: Record<string, unknown> | undefined): Ghost | null {
  const path = typeof input?.path === "string" ? normalize(input.path) : null;
  if (!path) return null;
  switch (toolName) {
    case "create_endpoint":
      return { path, kind: "create" };
    case "delete_endpoint":
      return { path, kind: "delete" };
    case "publish_endpoint":
    case "unpublish_endpoint":
      return { path, kind: "publish" };
    case "update_endpoint_settings":
    case "update_endpoint_content":
      return { path, kind: "update" };
    default:
      return null;
  }
}
