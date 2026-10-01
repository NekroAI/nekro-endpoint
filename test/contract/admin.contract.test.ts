import { env } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import { api, auth, bob, carol, contract, seed } from "./helpers";

beforeEach(seed);

describe("admin (REDESIGN §1.2)", () => {
  it("rejects non-admins", async () => {
    expect((await contract(api("/admin/users", auth.aliceKey))).status).toBe(403);
    expect((await contract(api("/admin/users"))).status).toBe(401);
  });

  it("lists users", async () => {
    await contract(api("/admin/users", auth.carolKey));
  });

  it("activates and deactivates", async () => {
    await api("/endpoints/ep_bob_public/unpublish", { method: "POST", ...auth.bobKey });
    await contract(api(`/admin/users/${bob.id}/activate`, { method: "POST", ...auth.carolKey }));
    expect((await api("/endpoints/ep_bob_public/publish", { method: "POST", ...auth.bobKey })).status).toBe(200);
    await contract(api(`/admin/users/${bob.id}/deactivate`, { method: "POST", ...auth.carolKey }));
  });

  it("reviews a user's endpoints and one endpoint", async () => {
    await contract(api("/admin/users/user_alice/endpoints", auth.carolKey));
    await contract(api("/admin/endpoints/ep_static_protected", auth.carolKey));
  });

  it("force-unpublishes", async () => {
    await contract(api("/admin/endpoints/ep_static_public/force-unpublish", { method: "POST", ...auth.carolKey }));
  });

  it("reports stats", async () => {
    await contract(api("/admin/stats", auth.carolKey));
  });

  it("deletes a user", async () => {
    await contract(api(`/admin/users/${bob.id}`, { method: "DELETE", ...auth.carolKey }));
  });
});

describe("init (REDESIGN §1.2)", () => {
  it("is closed once an admin exists", async () => {
    await contract(api("/init/check"));
    await contract(api("/init/set-admin", { method: "POST", body: { userId: bob.id } }));
  });

  it("lists users and assigns the first admin", async () => {
    await env.DB.prepare("UPDATE users SET role = 'user' WHERE id = ?").bind(carol.id).run();
    await contract(api("/init/check"));
    await contract(api("/init/users"));
    await contract(api("/init/set-admin", { method: "POST", body: { userId: "nope" } }));
    await contract(api("/init/set-admin", { method: "POST", body: { userId: bob.id } }));
    expect((await api("/admin/users", auth.bobKey)).status).toBe(200);
  });
});

describe("features", () => {
  it("lists feature flags", async () => {
    await contract(api("/features"));
  });
});

describe("OpenAPI", () => {
  // Fixed in the redesign (z.lazy in the tree schema made generation throw).
  it("serves the document at /api/doc", async () => {
    const res = await api("/doc");
    expect(res.status).toBe(200);
    const doc = res.body as { openapi: string; paths: Record<string, Record<string, unknown>> };
    expect(doc.openapi).toBe("3.1.0");
    const operations = Object.entries(doc.paths)
      .flatMap(([path, methods]) => Object.keys(methods).map((method) => `${method.toUpperCase()} ${path}`))
      .sort();
    expect(operations).toMatchSnapshot();
  });
});
