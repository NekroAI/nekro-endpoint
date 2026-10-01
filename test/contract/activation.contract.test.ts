import { beforeEach, describe, expect, it } from "vitest";
import { api, auth, bob, carol, data, seed } from "./helpers";

beforeEach(seed);

type Mine = {
  activated: boolean;
  request: { id: string; status: string; message: string | null; reviewNote: string | null } | null;
};
type AdminList = { requests: { id: string; status: string; user: { username: string } }[]; pending: number };

const mine = async (token = bob.apiKey) => data<Mine>(await api("/activation-request", { token }));
const submit = (message?: string, token = bob.apiKey) =>
  api("/activation-request", { method: "POST", token, body: message === undefined ? {} : { message } });
const list = async () => data<AdminList>(await api("/admin/activation-requests", auth.carolKey));

describe("activation requests (added in the redesign)", () => {
  it("requires authentication", async () => {
    expect((await api("/activation-request")).status).toBe(401);
  });

  it("lets an unactivated user apply, once per user", async () => {
    expect(await mine()).toEqual({ activated: false, request: null });
    expect((await submit("想托管团队的配置文件")).status).toBe(200);
    expect((await mine()).request).toMatchObject({ status: "pending", message: "想托管团队的配置文件" });
    await submit("更新后的说明");
    const { requests, pending } = await list();
    expect(requests).toHaveLength(1);
    expect(pending).toBe(1);
  });

  it("rejects applications from activated users", async () => {
    const res = await api("/activation-request", { method: "POST", ...auth.aliceKey, body: {} });
    expect(res.status).toBe(400);
  });

  it("is admin-only to review", async () => {
    expect((await api("/admin/activation-requests", auth.aliceKey)).status).toBe(403);
    expect((await api("/admin/activation-requests/x/approve", { method: "POST", ...auth.aliceKey })).status).toBe(403);
  });

  it("approving activates the user, who can then publish", async () => {
    await submit();
    const [request] = (await list()).requests;
    expect(
      (await api(`/admin/activation-requests/${request.id}/approve`, { method: "POST", ...auth.carolKey })).status,
    ).toBe(200);
    expect(await mine()).toMatchObject({ activated: true, request: { status: "approved" } });
    await api("/endpoints/ep_bob_public/unpublish", { method: "POST", token: bob.apiKey });
    expect((await api("/endpoints/ep_bob_public/publish", { method: "POST", token: bob.apiKey })).status).toBe(200);
  });

  it("rejecting keeps the user inactive, shows the note and allows re-applying", async () => {
    await submit();
    const [request] = (await list()).requests;
    await api(`/admin/activation-requests/${request.id}/reject`, {
      method: "POST",
      ...auth.carolKey,
      body: { note: "请补充用途" },
    });
    expect(await mine()).toMatchObject({ activated: false, request: { status: "rejected", reviewNote: "请补充用途" } });
    await submit("补充：用于内部配置分发");
    expect((await mine()).request).toMatchObject({ status: "pending", reviewNote: null });
  });

  it("shows a request as approved when the user was activated directly", async () => {
    await submit();
    await api(`/admin/users/${bob.id}/activate`, { method: "POST", token: carol.apiKey });
    expect((await mine()).request?.status).toBe("approved");
    expect((await list()).pending).toBe(0);
  });

  it("404s for unknown requests", async () => {
    expect((await api("/admin/activation-requests/nope/approve", { method: "POST", ...auth.carolKey })).status).toBe(
      404,
    );
  });
});
