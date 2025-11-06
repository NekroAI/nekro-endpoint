import { createMiddleware } from "hono/factory";
import type { Bindings } from "../types";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import * as drizzleSchema from "../db/schema";

type Variables = {
  db: DrizzleD1Database<typeof drizzleSchema>;
  user: typeof drizzleSchema.users.$inferSelect;
};

/**
 * 激活检查中间件
 * 确保用户已被管理员激活后才能执行特定操作
 * 必须在 authMiddleware 之后使用
 */
export const activationMiddleware = createMiddleware<{
  Bindings: Bindings;
  Variables: Variables;
}>(async (c, next) => {
  const user = c.get("user");

  if (!user) {
    return c.json({ success: false, message: "用户未认证" }, 401);
  }

  if (!user.isActivated) {
    return c.json({ success: false, message: "用户未激活，请联系管理员" }, 403);
  }

  await next();
});
