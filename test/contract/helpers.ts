import { env, SELF } from "cloudflare:test";
import { expect } from "vitest";

export const ORIGIN = "https://ep.test";

const hex = (char: string, length: number) => char.repeat(length);

/** Fixed accounts. Keys use the exact production formats. */
export const alice = {
  id: "user_alice",
  username: "alice",
  apiKey: `sec-${hex("a", 64)}`,
  session: "session-alice",
  role: "user",
  activated: true,
};
export const bob = {
  id: "user_bob",
  username: "bob",
  apiKey: `sec-${hex("b", 64)}`,
  session: "session-bob",
  role: "user",
  activated: false,
};
export const carol = {
  id: "user_carol",
  username: "carol",
  apiKey: `sec-${hex("c", 64)}`,
  session: "session-carol",
  role: "admin",
  activated: true,
};

export const ALICE_GROUP = "group_alice_vip";
export const ALICE_KEY = `ep-${hex("1", 32)}`;
export const ALICE_EXPIRED_KEY = `ep-${hex("2", 32)}`;
export const ALICE_REVOKED_KEY = `ep-${hex("3", 32)}`;
export const BOB_GROUP = "group_bob";
export const BOB_KEY = `ep-${hex("4", 32)}`;

const NOW = 1_780_000_000; // seconds, fixed so seeded timestamps are stable
const DAY = 86_400;

type SeedEndpoint = {
  id: string;
  owner: string;
  path: string;
  name: string;
  type: string;
  config: unknown;
  accessControl?: "public" | "authenticated";
  groups?: string[] | null;
  enabled?: boolean;
  published?: boolean;
  sortOrder?: number;
};

export const seedEndpoints: SeedEndpoint[] = [
  {
    id: "ep_static_public",
    owner: alice.id,
    path: "/hello",
    name: "Hello",
    type: "static",
    config: { content: "hello world", contentType: "text/plain", headers: { "X-Custom": "yes" } },
    published: true,
  },
  {
    id: "ep_static_yaml",
    owner: alice.id,
    path: "/configs/app.yaml",
    name: "App config",
    type: "static",
    config: { content: "a: 1\n", contentType: "text/yaml; charset=utf-8" },
    published: true,
    sortOrder: 2,
  },
  {
    id: "ep_static_protected",
    owner: alice.id,
    path: "/configs/secret",
    name: "Secret",
    type: "static",
    config: { content: "classified", contentType: "application/json" },
    accessControl: "authenticated",
    groups: [ALICE_GROUP],
    published: true,
    sortOrder: 1,
  },
  {
    id: "ep_protected_nogroups",
    owner: alice.id,
    path: "/broken",
    name: "No groups",
    type: "static",
    config: { content: "x" },
    accessControl: "authenticated",
    groups: [],
    published: true,
  },
  {
    id: "ep_draft",
    owner: alice.id,
    path: "/draft",
    name: "Draft",
    type: "static",
    config: { content: "draft" },
  },
  {
    id: "ep_disabled",
    owner: alice.id,
    path: "/disabled",
    name: "Disabled",
    type: "static",
    config: { content: "off" },
    enabled: false,
    published: true,
  },
  {
    id: "ep_proxy",
    owner: alice.id,
    path: "/proxy/fixed",
    name: "Fixed proxy",
    type: "proxy",
    config: { targetUrl: "https://upstream.test/data.json", headers: { "X-Upstream": "1" }, timeout: 5000 },
    published: true,
  },
  {
    id: "ep_dynamic",
    owner: alice.id,
    path: "/gh",
    name: "GitHub raw",
    type: "dynamicProxy",
    config: { baseUrl: "https://raw.upstream.test/", autoAppendSlash: true, timeout: 5000, allowedPaths: [] },
    published: true,
  },
  {
    id: "ep_bob_public",
    owner: bob.id,
    path: "/hello",
    name: "Bob hello",
    type: "static",
    config: { content: "bob" },
    published: true,
  },
];

export async function seed() {
  const statements: D1PreparedStatement[] = [];
  for (const [index, user] of [alice, bob, carol].entries()) {
    statements.push(
      env.DB.prepare(
        `INSERT INTO users (id, github_id, username, email, avatar_url, api_key, role, is_activated, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(
        user.id,
        String(1000 + index),
        user.username,
        `${user.username}@example.test`,
        `https://avatars.example.test/${user.username}`,
        user.apiKey,
        user.role,
        user.activated ? 1 : 0,
        NOW,
        NOW,
      ),
      env.DB.prepare(
        `INSERT INTO user_sessions (id, user_id, session_token, expires_at, created_at) VALUES (?, ?, ?, ?, ?)`,
      ).bind(`sess_${user.username}`, user.id, user.session, NOW + 3650 * DAY, NOW),
    );
  }
  statements.push(
    env.DB.prepare(
      `INSERT INTO user_sessions (id, user_id, session_token, expires_at, created_at) VALUES (?, ?, ?, ?, ?)`,
    ).bind("sess_alice_expired", alice.id, "session-alice-expired", NOW - DAY, NOW - 31 * DAY),
  );

  for (const [id, owner, name] of [
    [ALICE_GROUP, alice.id, "VIP"],
    [BOB_GROUP, bob.id, "Bob friends"],
  ]) {
    statements.push(
      env.DB.prepare(
        `INSERT INTO permission_groups (id, owner_user_id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
      ).bind(id, owner, name, `${name} group`, NOW, NOW),
    );
  }

  const keys: [string, string, string, number | null, boolean][] = [
    ["key_alice", ALICE_GROUP, ALICE_KEY, null, true],
    ["key_alice_expired", ALICE_GROUP, ALICE_EXPIRED_KEY, NOW - DAY, true],
    ["key_alice_revoked", ALICE_GROUP, ALICE_REVOKED_KEY, null, false],
    ["key_bob", BOB_GROUP, BOB_KEY, null, true],
  ];
  for (const [id, group, value, expiresAt, active] of keys) {
    statements.push(
      env.DB.prepare(
        `INSERT INTO access_keys (id, permission_group_id, key_value, description, expires_at, is_active, usage_count, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
      ).bind(id, group, value, `${id} note`, expiresAt, active ? 1 : 0, NOW),
    );
  }

  for (const ep of seedEndpoints) {
    statements.push(
      env.DB.prepare(
        `INSERT INTO endpoints (id, owner_user_id, parent_id, path, name, type, config, access_control,
           required_permission_groups, enabled, is_published, sort_order, created_at, updated_at)
         VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(
        ep.id,
        ep.owner,
        ep.path,
        ep.name,
        ep.type,
        JSON.stringify(ep.config),
        ep.accessControl ?? "public",
        ep.groups === undefined || ep.groups === null ? null : JSON.stringify(ep.groups),
        ep.enabled === false ? 0 : 1,
        ep.published ? 1 : 0,
        ep.sortOrder ?? 0,
        NOW,
        NOW,
      ),
    );
  }

  await env.DB.batch(statements);
}

export type ContractResponse = {
  status: number;
  contentType: string | null;
  body: unknown;
};

type RequestOptions = {
  method?: string;
  token?: string;
  body?: unknown;
  headers?: Record<string, string>;
};

export async function call(path: string, options: RequestOptions = {}): Promise<ContractResponse> {
  const headers = new Headers(options.headers);
  if (options.token) headers.set("Authorization", `Bearer ${options.token}`);
  let body: string | undefined;
  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(options.body);
  }
  const response = await SELF.fetch(`${ORIGIN}${path}`, { method: options.method ?? "GET", headers, body });
  const contentType = response.headers.get("Content-Type");
  const text = await response.text();
  let parsed: unknown = text;
  if (contentType?.includes("application/json")) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }
  return { status: response.status, contentType, body: parsed };
}

/** Management API helper: `/api` prefix. */
export const api = (path: string, options?: RequestOptions) => call(`/api${path}`, options);

const ISO_DATE = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z/g;
const SEC_KEY = /sec-[a-f0-9]{64}/g;
const EP_KEY = /ep-[a-f0-9]{32}/g;
const CUID = /\b[a-z][a-z0-9]{23}\b/g;

/**
 * Replaces generated values with stable placeholders while keeping structure,
 * field names, messages and fixture identities visible in snapshots. Generated
 * ids keep their identity within one call, so relations remain checkable.
 * Seeded keys are kept literally; generated ones become <sec-key>/<ep-key>.
 */
export function normalize<T>(value: T, ids = new Map<string, string>()): T {
  const seededKeys = new Set([
    alice.apiKey,
    bob.apiKey,
    carol.apiKey,
    ALICE_KEY,
    ALICE_EXPIRED_KEY,
    ALICE_REVOKED_KEY,
    BOB_KEY,
  ]);
  const replaceString = (input: string) =>
    input
      .replace(SEC_KEY, (key) => (seededKeys.has(key) ? key : "<sec-key>"))
      .replace(EP_KEY, (key) => (seededKeys.has(key) ? key : "<ep-key>"))
      .replace(ISO_DATE, "<date>")
      .replace(CUID, (id) => {
        if (!ids.has(id)) ids.set(id, `<id:${ids.size + 1}>`);
        return ids.get(id)!;
      });

  const walk = (node: unknown): unknown => {
    if (typeof node === "string") return replaceString(node);
    if (Array.isArray(node)) return node.map(walk);
    if (node && typeof node === "object") {
      return Object.fromEntries(Object.entries(node).map(([key, child]) => [key, walk(child)]));
    }
    return node;
  };
  return walk(value) as T;
}

export const auth = {
  aliceKey: { token: alice.apiKey },
  aliceSession: { token: alice.session },
  bobKey: { token: bob.apiKey },
  carolKey: { token: carol.apiKey },
};

/** Snapshot the normalized response; returns it for further explicit assertions. */
export async function contract(response: ContractResponse | Promise<ContractResponse>, ids?: Map<string, string>) {
  const resolved = await response;
  expect(normalize(resolved, ids)).toMatchSnapshot();
  return resolved;
}

export const data = <T = any>(response: ContractResponse) => (response.body as { data: T }).data;
