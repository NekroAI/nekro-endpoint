import { createMiddleware } from "hono/factory";
import { and, eq, gt } from "drizzle-orm";
import { userSessions, users } from "../db/schema";
import type { Bindings } from "../types";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import * as drizzleSchema from "../db/schema";

type Variables = {
  db: DrizzleD1Database<typeof drizzleSchema>;
  user: typeof drizzleSchema.users.$inferSelect;
};

export const authMiddleware = createMiddleware<{
  Bindings: Bindings;
  Variables: Variables;
}>(async (c, next) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ success: false, message: "认证令牌缺失" }, 401);
  }

  const token = authHeader.substring(7);
  const db = c.get("db");

  // Management keys are stored in users.apiKey. They are distinct from the
  // ep-* keys used by the published endpoint execution layer.
  if (/^sec-[a-f0-9]{64}$/.test(token)) {
    const user = await db.query.users.findFirst({
      where: eq(users.apiKey, token),
    });

    if (!user) {
      return c.json({ success: false, message: "认证令牌无效或已过期" }, 401);
    }

    c.set("user", user);
    await next();
    return;
  }

  if (token.startsWith("sec-") || token.startsWith("ep-")) {
    return c.json({ success: false, message: "认证令牌无效或已过期" }, 401);
  }

  const session = await db.query.userSessions.findFirst({
    where: and(eq(userSessions.sessionToken, token), gt(userSessions.expiresAt, new Date())),
  });

  if (!session) {
    return c.json({ success: false, message: "认证令牌无效或已过期" }, 401);
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.userId),
  });

  if (!user) {
    return c.json({ success: false, message: "用户不存在" }, 401);
  }

  c.set("user", user);
  await next();
});
