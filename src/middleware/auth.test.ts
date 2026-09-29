import { describe, expect, it, vi } from "vitest";
import { Hono } from "hono";
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core";
import { authMiddleware } from "./auth";
import { activationMiddleware } from "./activation";
import { adminMiddleware } from "./admin";
import authRoutes from "../routes/auth";
import endpointRoutes from "../routes/endpoints";

const apiKey = `sec-${"a".repeat(64)}`;
const user = {
  id: "owner-1",
  username: "alice",
  email: null,
  avatarUrl: null,
  apiKey,
  role: "user",
  isActivated: true,
  createdAt: new Date("2026-01-01"),
};

function fixture(options: { known?: boolean; session?: boolean; activated?: boolean } = {}) {
  const currentUser = { ...user, isActivated: options.activated ?? true };
  const db = {
    query: {
      users: { findFirst: vi.fn().mockResolvedValue(options.known === false ? undefined : currentUser) },
      userSessions: { findFirst: vi.fn().mockResolvedValue(options.session ? { userId: user.id } : undefined) },
    },
  };
  const app = new Hono();
  app.use("*", async (c, next) => {
    c.set("db" as never, db as never);
    await next();
  });
  app.get("/protected", authMiddleware, (c) => c.json({ id: c.get("user").id }));
  app.get("/activated", authMiddleware, activationMiddleware, (c) => c.json({ ok: true }));
  app.get("/admin", authMiddleware, adminMiddleware, (c) => c.json({ ok: true }));
  app.route("/auth", authRoutes);
  app.route("/", endpointRoutes);
  return { app, db };
}

describe("management authentication", () => {
  it("looks up a valid management key in users.apiKey, without a session", async () => {
    const { app, db } = fixture();
    const response = await app.request("/protected", { headers: { Authorization: `Bearer ${apiKey}` } });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ id: user.id });
    const query = new SQLiteSyncDialect().sqlToQuery(db.query.users.findFirst.mock.calls[0][0].where);
    expect(query.sql).toContain('"users"."api_key"');
    expect(query.params).toEqual([apiKey]);
    expect(db.query.userSessions.findFirst).not.toHaveBeenCalled();
  });

  it("rejects unknown keys without treating them as sessions", async () => {
    const { app, db } = fixture({ known: false });
    expect((await app.request("/protected", { headers: { Authorization: `Bearer ${apiKey}` } })).status).toBe(401);
    expect(db.query.userSessions.findFirst).not.toHaveBeenCalled();
  });

  it.each([undefined, "Basic abc", "Bearer sec-short", `Bearer ep-${"b".repeat(32)}`])(
    "rejects missing, malformed and endpoint-access credentials: %s",
    async (authorization) => {
      const { app, db } = fixture();
      expect(
        (await app.request("/protected", { headers: authorization ? { Authorization: authorization } : {} })).status,
      ).toBe(401);
      expect(db.query.users.findFirst).not.toHaveBeenCalled();
    },
  );

  it("preserves session authentication and its expiration predicate", async () => {
    const { app, db } = fixture({ session: true });
    expect((await app.request("/protected", { headers: { Authorization: "Bearer browser-session" } })).status).toBe(
      200,
    );
    const query = new SQLiteSyncDialect().sqlToQuery(db.query.userSessions.findFirst.mock.calls[0][0].where);
    expect(query.sql).toContain('"expires_at" >');
    expect(query.params[0]).toBe("browser-session");
  });

  it("rejects an absent/expired session", async () => {
    const { app, db } = fixture();
    expect((await app.request("/protected", { headers: { Authorization: "Bearer expired-session" } })).status).toBe(
      401,
    );
    expect(db.query.users.findFirst).not.toHaveBeenCalled();
  });

  it("does not grant activation or admin rights to an API key", async () => {
    const { app } = fixture({ activated: false });
    const headers = { Authorization: `Bearer ${apiKey}` };
    expect((await app.request("/activated", { headers })).status).toBe(403);
    expect((await app.request("/admin", { headers })).status).toBe(403);
    // Exercise the actual endpoint router registration, not just a test route.
    expect((await app.request("/endpoints/example/publish", { method: "POST", headers })).status).toBe(403);
  });

  it("supports /auth/me with either credential without logging secrets", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    try {
      const { app } = fixture();
      const response = await app.request("/auth/me", { headers: { Authorization: `Bearer ${apiKey}` } });
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({ username: "alice" });
      expect(JSON.stringify(log.mock.calls)).not.toContain(apiKey);
    } finally {
      log.mockRestore();
    }
  });
});
