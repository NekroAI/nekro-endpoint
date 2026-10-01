import { fetchMock } from "cloudflare:test";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { alice, api, auth, contract, data, seed } from "./helpers";

beforeAll(() => {
  fetchMock.activate();
  fetchMock.disableNetConnect();
});
beforeEach(seed);
afterEach(() => fetchMock.assertNoPendingInterceptors());

describe("management credentials (REDESIGN §1.1)", () => {
  it("accepts a sec- management key on /auth/me (raw user object, no envelope)", async () => {
    const res = await contract(api("/auth/me", auth.aliceKey));
    expect(res.status).toBe(200);
  });

  it("accepts a browser session token", async () => {
    const res = await contract(api("/auth/me", auth.aliceSession));
    expect(res.status).toBe(200);
  });

  it.each([
    ["missing header", undefined],
    ["Basic scheme", "Basic abc"],
    ["expired session", "Bearer session-alice-expired"],
    ["unknown session", "Bearer nope"],
    ["unknown sec- key", `Bearer sec-${"f".repeat(64)}`],
    ["malformed sec- key", "Bearer sec-short"],
    ["endpoint access key", `Bearer ep-${"1".repeat(32)}`],
  ])("rejects %s with 401", async (_label, authorization) => {
    const res = await contract(api("/auth/me", { headers: authorization ? { Authorization: authorization } : {} }));
    expect(res.status).toBe(401);
  });

  it("regenerate-key returns a new sec- key and invalidates the old one immediately", async () => {
    const res = await contract(api("/auth/regenerate-key", { method: "POST", ...auth.aliceKey }));
    expect(res.status).toBe(200);
    const fresh = data<{ apiKey: string }>(res).apiKey;
    expect(fresh).toMatch(/^sec-[a-f0-9]{64}$/);
    expect(fresh).not.toBe(alice.apiKey);
    expect((await api("/auth/me", auth.aliceKey)).status).toBe(401);
    expect((await api("/auth/me", { token: fresh })).status).toBe(200);
  });

  it("logout ends the session", async () => {
    await contract(api("/auth/logout", { method: "POST", ...auth.aliceSession }));
    expect((await api("/auth/me", auth.aliceSession)).status).toBe(401);
  });
});

describe("GitHub OAuth", () => {
  it("builds the authorize URL with the /auth/callback redirect", async () => {
    const res = await contract(api("/auth/github"));
    const url = new URL(data<{ authUrl: string }>(res).authUrl);
    expect(url.origin + url.pathname).toBe("https://github.com/login/oauth/authorize");
    expect(url.searchParams.get("redirect_uri")).toBe("https://ep.test/auth/callback");
    expect(url.searchParams.get("scope")).toBe("user:email");
  });

  const mockGitHub = (user: Record<string, unknown>) => {
    fetchMock
      .get("https://github.com")
      .intercept({ path: "/login/oauth/access_token", method: "POST" })
      .reply(200, JSON.stringify({ access_token: "gho_test" }), { headers: { "content-type": "application/json" } });
    fetchMock
      .get("https://api.github.com")
      .intercept({ path: "/user" })
      .reply(200, JSON.stringify(user), { headers: { "content-type": "application/json" } });
  };

  it("creates a new user with a sec- key and a usable session", async () => {
    mockGitHub({ id: 9001, login: "dave", email: "dave@example.test", avatar_url: "https://a/dave" });
    const res = await contract(api("/auth/github/callback?code=abc&state=xyz"));
    const { user, sessionToken } = data<{ user: { apiKey: string; isActivated: boolean }; sessionToken: string }>(res);
    expect(user.apiKey).toMatch(/^sec-[a-f0-9]{64}$/);
    expect(user.isActivated).toBe(false);
    expect((await api("/auth/me", { token: sessionToken })).status).toBe(200);
  });

  it("updates an existing user matched by GitHub id and keeps the key", async () => {
    mockGitHub({ id: 1000, login: "alice-renamed", email: null, avatar_url: null });
    const res = await contract(api("/auth/github/callback?code=abc"));
    expect(data<{ user: { apiKey: string } }>(res).user.apiKey).toBe(alice.apiKey);
  });

  it("reports a failed token exchange", async () => {
    fetchMock
      .get("https://github.com")
      .intercept({ path: "/login/oauth/access_token", method: "POST" })
      .reply(200, JSON.stringify({ error: "bad_verification_code" }), {
        headers: { "content-type": "application/json" },
      });
    const res = await contract(api("/auth/github/callback?code=bad"));
    expect(res.status).toBe(400);
  });
});
