import { env, SELF } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import { alice, ALICE_KEY, api, bob, data, ORIGIN, seed } from "./helpers";

beforeEach(seed);

let nextId = 1;
async function rpc(method: string, params: unknown, token: string | null = alice.apiKey) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await SELF.fetch(`${ORIGIN}/mcp`, {
    method: "POST",
    headers,
    body: JSON.stringify({ jsonrpc: "2.0", id: nextId++, method, params }),
  });
  const body = (await response.json().catch(() => null)) as { result?: any; error?: any; message?: string } | null;
  return { status: response.status, body };
}

const call = async (name: string, args: Record<string, unknown> = {}, token?: string) => {
  const { body } = await rpc("tools/call", { name, arguments: args }, token);
  const result = body?.result as { isError?: boolean; content: { text: string }[] };
  const text = result.content[0].text;
  return { isError: Boolean(result.isError), text, json: result.isError ? null : JSON.parse(text) };
};

describe("MCP server at /mcp (REDESIGN §5.8)", () => {
  it("authenticates like /api: no credential is a 401", async () => {
    const res = await rpc("tools/list", {}, null);
    expect(res.status).toBe(401);
  });

  it("initializes with server info and usage instructions", async () => {
    const res = await rpc("initialize", {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "contract-test", version: "1" },
    });
    expect(res.status).toBe(200);
    expect(res.body?.result.serverInfo.name).toBe("endpoints");
    expect(res.body?.result.instructions).toContain("<data>");
  });

  it("lists tools with risk annotations and no admin operations", async () => {
    const res = await rpc("tools/list", {});
    const tools = res.body?.result.tools as { name: string; annotations: Record<string, unknown> }[];
    expect(
      tools.map((tool) => [tool.name, tool.annotations.readOnlyHint, tool.annotations.destructiveHint]),
    ).toMatchSnapshot();
    expect(tools.some((tool) => /admin|activate|user/.test(tool.name))).toBe(false);
  });

  it("lists endpoints in owner scope only", async () => {
    const { json } = await call("list_endpoints");
    const paths = (json as { path: string }[]).map((endpoint) => endpoint.path);
    expect(paths).toContain("/configs/secret");
    expect(paths).toHaveLength(8);
  });

  it("never returns plaintext keys and wraps content as data", async () => {
    const keys = await call("list_access_keys", { group: "VIP" });
    expect(keys.text).not.toContain(ALICE_KEY);
    expect(keys.text).toContain("ep-…1111");
    const endpoint = await call("get_endpoint", { path: "/configs/secret" });
    expect(endpoint.json.config.content.data).toBe("<data>\nclassified\n</data>");
    const groups = await call("list_permission_groups");
    expect(groups.json[0]).toMatchObject({ name: "VIP", endpoints: ["/configs/secret"] });
  });

  it("creates, publishes and serves an endpoint through the same contract", async () => {
    const created = await call("create_endpoint", {
      path: "mcp/hello.txt",
      type: "static",
      content: "from mcp",
      access: "protected",
      groups: ["VIP"],
    });
    expect(created.json).toMatchObject({
      path: "/mcp/hello.txt",
      status: "draft",
      access: "protected",
      groups: ["VIP"],
    });
    expect((await call("publish_endpoint", { path: "/mcp/hello.txt" })).json.status).toBe("live");
    const served = await SELF.fetch(`${ORIGIN}/e/alice/mcp/hello.txt`, { headers: { "X-Access-Key": ALICE_KEY } });
    expect(await served.text()).toBe("from mcp");
  });

  it("issues a pass with a masked key; the plaintext stays in the REST API", async () => {
    const issued = await call("issue_access_key", { group: "VIP", note: "mcp", expiresInDays: 7 });
    expect(issued.json.key).toMatch(/^ep-…[a-f0-9]{4}$/);
    const keys = data<{ keys: { id: string; keyValue: string }[] }>(
      await api("/permission-groups/group_alice_vip/keys", { token: alice.apiKey }),
    ).keys;
    expect(keys.find((key) => key.id === issued.json.id)?.keyValue).toMatch(/^ep-[a-f0-9]{32}$/);
  });

  it("enforces activation on publish for unactivated users", async () => {
    const result = await call("publish_endpoint", { path: "/hello" }, bob.apiKey);
    expect(result.isError).toBe(true);
    expect(result.text).toContain("用户未激活");
  });

  it("reports tool errors instead of throwing", async () => {
    const result = await call("get_endpoint", { path: "/nope" });
    expect(result).toMatchObject({ isError: true });
    expect(result.text).toContain("/nope");
  });

  it("audits every call with redacted input", async () => {
    await call("list_access_keys", { group: "VIP" });
    await call("get_endpoint", { path: "/nope" });
    const rows = await env.DB.prepare(
      "SELECT source, tool, ok FROM agent_actions WHERE user_id = ? ORDER BY created_at",
    )
      .bind(alice.id)
      .all();
    expect(rows.results).toEqual([
      { source: "mcp", tool: "list_access_keys", ok: 1 },
      { source: "mcp", tool: "get_endpoint", ok: 0 },
    ]);
  });
});
