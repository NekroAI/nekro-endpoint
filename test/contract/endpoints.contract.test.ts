import { env } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import { api, auth, contract, data, seed } from "./helpers";

beforeEach(seed);

const staticBody = (path: string, extra: Record<string, unknown> = {}) => ({
  name: `Static ${path}`,
  path,
  type: "static",
  config: { content: "body", contentType: "text/plain", headers: {} },
  ...extra,
});

describe("listing (REDESIGN §1.2)", () => {
  it("requires authentication", async () => {
    expect((await contract(api("/endpoints"))).status).toBe(401);
  });

  it("flat view is the default and hides disabled endpoints", async () => {
    const res = await contract(api("/endpoints", auth.aliceKey));
    const ids = data<{ endpoints: { id: string }[] }>(res).endpoints.map((e) => e.id);
    expect(ids).not.toContain("ep_disabled");
    expect(ids).not.toContain("ep_bob_public");
  });

  it("flat view with includeDisabled (used by epctl)", async () => {
    const res = await contract(api("/endpoints?view=flat&includeDisabled=true", auth.aliceKey));
    expect(data<{ total: number }>(res).total).toBe(8);
  });

  it("filters by type", async () => {
    await contract(api("/endpoints?type=dynamicProxy", auth.aliceKey));
  });

  it("tree view derives directories from path prefixes", async () => {
    await contract(api("/endpoints?view=tree&includeDisabled=true", auth.aliceKey));
  });

  it("session and management key see the same data", async () => {
    const byKey = await api("/endpoints?view=tree", auth.aliceKey);
    const bySession = await api("/endpoints?view=tree", auth.aliceSession);
    expect(bySession).toEqual(byKey);
  });
});

describe("read", () => {
  it("detail returns config and requiredPermissionGroups already parsed (unlike list/create/update)", async () => {
    const res = await contract(api("/endpoints/ep_static_protected", auth.aliceKey));
    const endpoint = data<{ config: unknown; requiredPermissionGroups: unknown }>(res);
    expect(endpoint.config).toEqual({ content: "classified", contentType: "application/json" });
    expect(endpoint.requiredPermissionGroups).toEqual(["group_alice_vip"]);
  });

  it("does not reveal other users' endpoints", async () => {
    expect((await contract(api("/endpoints/ep_bob_public", auth.aliceKey))).status).toBe(404);
  });

  it("404 for unknown ids", async () => {
    expect((await contract(api("/endpoints/nope", auth.aliceKey))).status).toBe(404);
  });
});

describe("create", () => {
  it("creates a static draft; data.endpoint keeps config as a JSON string", async () => {
    const res = await contract(api("/endpoints", { method: "POST", ...auth.aliceKey, body: staticBody("/new") }));
    expect(res.status).toBe(201);
    const { endpoint } = data<{ endpoint: { isPublished: boolean; config: unknown } }>(res);
    expect(endpoint.isPublished).toBe(false);
    expect(typeof endpoint.config).toBe("string");
  });

  it("creates proxy, dynamicProxy and authenticated endpoints", async () => {
    await contract(
      api("/endpoints", {
        method: "POST",
        ...auth.aliceKey,
        body: { name: "P", path: "/p", type: "proxy", config: { targetUrl: "https://upstream.test/x" } },
      }),
    );
    await contract(
      api("/endpoints", {
        method: "POST",
        ...auth.aliceKey,
        body: { name: "D", path: "/d", type: "dynamicProxy", config: { baseUrl: "" } },
      }),
    );
    await contract(
      api("/endpoints", {
        method: "POST",
        ...auth.aliceKey,
        body: staticBody("/locked", { accessControl: "authenticated", requiredPermissionGroups: ["group_alice_vip"] }),
      }),
    );
  });

  it("unactivated users can still create (only publishing is restricted)", async () => {
    expect((await api("/endpoints", { method: "POST", ...auth.bobKey, body: staticBody("/bob-new") })).status).toBe(
      201,
    );
  });

  it("rejects a duplicate path", async () => {
    await contract(api("/endpoints", { method: "POST", ...auth.aliceKey, body: staticBody("/hello") }));
  });

  it("rejects invalid input with the validation error shape", async () => {
    await contract(api("/endpoints", { method: "POST", ...auth.aliceKey, body: staticBody("/bad path!") }));
    await contract(
      api("/endpoints", {
        method: "POST",
        ...auth.aliceKey,
        body: { name: "x", path: "/x", type: "proxy", config: { targetUrl: "not a url" } },
      }),
    );
  });

  it("refuses children under a dynamicProxy endpoint", async () => {
    await contract(
      api("/endpoints", {
        method: "POST",
        ...auth.aliceKey,
        body: staticBody("/gh/child", { parentId: "ep_dynamic" }),
      }),
    );
  });
});

describe("update", () => {
  it("patches config only (epctl push)", async () => {
    const res = await contract(
      api("/endpoints/ep_static_public", {
        method: "PATCH",
        ...auth.aliceKey,
        body: { config: { content: "changed", contentType: "text/plain", headers: {} } },
      }),
    );
    expect(res.status).toBe(200);
    const row = await env.DB.prepare("SELECT config, path, is_published FROM endpoints WHERE id = ?")
      .bind("ep_static_public")
      .first<{ config: string; path: string; is_published: number }>();
    expect(JSON.parse(row!.config).content).toBe("changed");
    expect(row!.path).toBe("/hello");
    expect(row!.is_published).toBe(1);
  });

  it("patches settings", async () => {
    await contract(
      api("/endpoints/ep_draft", {
        method: "PATCH",
        ...auth.aliceKey,
        body: {
          name: "Renamed",
          path: "/renamed",
          accessControl: "authenticated",
          requiredPermissionGroups: ["group_alice_vip"],
          enabled: false,
        },
      }),
    );
  });

  it("rejects a path already in use", async () => {
    await contract(api("/endpoints/ep_draft", { method: "PATCH", ...auth.aliceKey, body: { path: "/hello" } }));
  });

  it("cannot modify another user's endpoint", async () => {
    await contract(api("/endpoints/ep_bob_public", { method: "PATCH", ...auth.aliceKey, body: { name: "x" } }));
  });
});

describe("publish / unpublish (activation applies to publish only)", () => {
  it("publishes for an activated user", async () => {
    const res = await contract(api("/endpoints/ep_draft/publish", { method: "POST", ...auth.aliceKey }));
    expect(res.status).toBe(200);
  });

  it("refuses publishing for an unactivated user", async () => {
    const res = await contract(api("/endpoints/ep_bob_public/publish", { method: "POST", ...auth.bobKey }));
    expect(res.status).toBe(403);
  });

  it("unpublishes", async () => {
    await contract(api("/endpoints/ep_static_public/unpublish", { method: "POST", ...auth.aliceKey }));
  });

  it("unactivated users may unpublish", async () => {
    await contract(api("/endpoints/ep_bob_public/unpublish", { method: "POST", ...auth.bobKey }));
  });

  it("publish of unknown endpoint", async () => {
    await contract(api("/endpoints/nope/publish", { method: "POST", ...auth.aliceKey }));
  });
});

describe("structure", () => {
  it("moves an endpoint under a parent", async () => {
    await contract(
      api("/endpoints/ep_draft/move", { method: "PATCH", ...auth.aliceKey, body: { newParentId: "ep_static_public" } }),
    );
  });

  it("refuses moving under a dynamicProxy endpoint", async () => {
    await contract(
      api("/endpoints/ep_draft/move", { method: "PATCH", ...auth.aliceKey, body: { newParentId: "ep_dynamic" } }),
    );
  });

  it("reorders", async () => {
    await contract(
      api("/endpoints/reorder", {
        method: "POST",
        ...auth.aliceKey,
        body: {
          orders: [
            { id: "ep_static_yaml", sortOrder: 0 },
            { id: "ep_static_protected", sortOrder: 5 },
          ],
        },
      }),
    );
  });
});

describe("delete", () => {
  it("deletes an owned endpoint", async () => {
    await contract(api("/endpoints/ep_draft", { method: "DELETE", ...auth.aliceKey }));
    expect((await api("/endpoints/ep_draft", auth.aliceKey)).status).toBe(404);
  });

  it("cannot delete another user's endpoint", async () => {
    await contract(api("/endpoints/ep_bob_public", { method: "DELETE", ...auth.aliceKey }));
  });
});
