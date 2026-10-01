import { env, SELF } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import { alice, ALICE_KEY, api, data, ORIGIN, seed } from "./helpers";

/**
 * Workers Builds may deploy the code before migration 0002 is applied.
 * Without the Signal tables everything else must keep working.
 */
beforeEach(async () => {
  await seed();
  await env.DB.batch([env.DB.prepare("DROP TABLE agent_actions"), env.DB.prepare("DROP TABLE ai_provider_configs")]);
});

describe("deployed before migration 0002", () => {
  it("serves the management API and published endpoints", async () => {
    expect((await api("/endpoints", { token: alice.apiKey })).status).toBe(200);
    const served = await SELF.fetch(`${ORIGIN}/e/alice/configs/secret`, { headers: { "X-Access-Key": ALICE_KEY } });
    expect(served.status).toBe(200);
  });

  it("reports Signal as unavailable instead of failing", async () => {
    const res = await api("/signal/config", { token: alice.apiKey });
    expect(res.status).toBe(200);
    expect(data<{ available: boolean; active: unknown }>(res)).toMatchObject({ available: false, active: null });
  });

  it("keeps MCP tools working when the audit table is missing", async () => {
    const response = await SELF.fetch(`${ORIGIN}/mcp`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${alice.apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { name: "list_endpoints", arguments: {} },
      }),
    });
    const body = (await response.json()) as { result: { isError: boolean } };
    expect(body.result.isError).toBe(false);
  });
});
