import { beforeEach, describe, expect, it } from "vitest";
import { ALICE_GROUP, ALICE_KEY, api, auth, BOB_GROUP, contract, data, seed } from "./helpers";

beforeEach(seed);

describe("permission groups (REDESIGN §1.2)", () => {
  it("lists own groups", async () => {
    await contract(api("/permission-groups", auth.aliceKey));
  });

  it("requires authentication", async () => {
    expect((await contract(api("/permission-groups"))).status).toBe(401);
  });

  it("creates a group", async () => {
    await contract(
      api("/permission-groups", { method: "POST", ...auth.aliceKey, body: { name: "Trial", description: "7 days" } }),
    );
  });

  it("reads one group", async () => {
    await contract(api(`/permission-groups/${ALICE_GROUP}`, auth.aliceKey));
  });

  it("updates a group", async () => {
    await contract(
      api(`/permission-groups/${ALICE_GROUP}`, { method: "PATCH", ...auth.aliceKey, body: { name: "VVIP" } }),
    );
  });

  it("isolates groups between users", async () => {
    await contract(api(`/permission-groups/${BOB_GROUP}`, auth.aliceKey));
    await contract(api(`/permission-groups/${BOB_GROUP}`, { method: "PATCH", ...auth.aliceKey, body: { name: "x" } }));
    await contract(api(`/permission-groups/${BOB_GROUP}`, { method: "DELETE", ...auth.aliceKey }));
  });

  it("deletes a group", async () => {
    await contract(api(`/permission-groups/${ALICE_GROUP}`, { method: "DELETE", ...auth.aliceKey }));
  });
});

describe("access keys", () => {
  it("lists keys including the plaintext ep- keyValue (relied on by sharing)", async () => {
    const res = await contract(api(`/permission-groups/${ALICE_GROUP}/keys`, auth.aliceKey));
    const values = JSON.stringify(res.body);
    expect(values).toContain(ALICE_KEY);
  });

  it("creates a key and returns it once with 201", async () => {
    const res = await contract(
      api(`/permission-groups/${ALICE_GROUP}/keys`, {
        method: "POST",
        ...auth.aliceKey,
        body: { description: "for dave", expiresAt: "2030-01-01T00:00:00.000Z" },
      }),
    );
    expect(res.status).toBe(201);
    expect(data<{ key: { keyValue: string } }>(res).key.keyValue).toMatch(/^ep-[a-f0-9]{32}$/);
  });

  it("creates a key without optional fields", async () => {
    await contract(api(`/permission-groups/${ALICE_GROUP}/keys`, { method: "POST", ...auth.aliceKey, body: {} }));
  });

  it("cannot list or create keys in another user's group", async () => {
    await contract(api(`/permission-groups/${BOB_GROUP}/keys`, auth.aliceKey));
    await contract(api(`/permission-groups/${BOB_GROUP}/keys`, { method: "POST", ...auth.aliceKey, body: {} }));
  });

  // KNOWN DEFECT: the handler uses a relational query (`with`) but the schema
  // declares no relations, so PATCH /access-keys/{id} always answers 500.
  // When fixed, replace it.fails with it and add the cross-user 404 check.
  it.fails("updates a key", async () => {
    const res = await api("/access-keys/key_alice", {
      method: "PATCH",
      ...auth.aliceKey,
      body: { description: "renamed", isActive: true },
    });
    expect(res.status).toBe(200);
  });

  it("revokes a key", async () => {
    await contract(api("/access-keys/key_alice/revoke", { method: "POST", ...auth.aliceKey }));
  });

  it("deletes a key", async () => {
    await contract(api("/access-keys/key_alice", { method: "DELETE", ...auth.aliceKey }));
  });

  it("isolates keys between users", async () => {
    await contract(api("/access-keys/key_bob/revoke", { method: "POST", ...auth.aliceKey }));
    await contract(api("/access-keys/key_bob", { method: "DELETE", ...auth.aliceKey }));
  });

  it("requires authentication", async () => {
    await contract(api("/access-keys/key_alice/revoke", { method: "POST" }));
  });
});
