import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { eq, count } from "drizzle-orm";
import { users } from "../db/schema";
import type { Bindings } from "../types";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import * as drizzleSchema from "../db/schema";

type Variables = {
  db: DrizzleD1Database<typeof drizzleSchema>;
};

const app = new OpenAPIHono<{ Bindings: Bindings; Variables: Variables }>();

// 检查系统是否需要初始化（是否有管理员）
const checkInitRoute = createRoute({
  method: "get",
  path: "/check",
  tags: ["Init"],
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            needsInit: z.boolean(),
            message: z.string(),
          }),
        },
      },
      description: "检查系统是否需要初始化",
    },
  },
});

app.openapi(checkInitRoute, async (c): Promise<any> => {
  const db = c.get("db");

  // 检查是否有管理员
  const adminCount = await db.select({ count: count() }).from(users).where(eq(users.role, "admin"));

  const needsInit = adminCount[0]?.count === 0;

  return c.json({
    success: true,
    needsInit,
    message: needsInit ? "系统需要初始化，请分配管理员" : "系统已初始化",
  });
});

// 获取所有用户列表（用于初始化时选择）
const listUsersForInitRoute = createRoute({
  method: "get",
  path: "/users",
  tags: ["Init"],
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            data: z.object({
              users: z.array(
                z.object({
                  id: z.string(),
                  username: z.string(),
                  email: z.string().nullable(),
                  avatarUrl: z.string().nullable(),
                  createdAt: z.string(),
                }),
              ),
              total: z.number(),
            }),
          }),
        },
      },
      description: "获取所有用户列表（用于初始化）",
    },
  },
});

app.openapi(listUsersForInitRoute, async (c): Promise<any> => {
  const db = c.get("db");

  // 检查是否有管理员（如果已有管理员，不允许访问）
  const adminCount = await db.select({ count: count() }).from(users).where(eq(users.role, "admin"));

  if (adminCount[0]?.count > 0) {
    return c.json({ success: false, message: "系统已初始化，无法访问此接口" }, 403);
  }

  // 获取所有用户
  const allUsers = await db.select().from(users).orderBy(users.createdAt);

  return c.json({
    success: true,
    data: {
      users: allUsers.map((user) => ({
        id: user.id,
        username: user.username,
        email: user.email,
        avatarUrl: user.avatarUrl,
        createdAt:
          user.createdAt instanceof Date
            ? user.createdAt.toISOString()
            : new Date((user.createdAt as number) * 1000).toISOString(),
      })),
      total: allUsers.length,
    },
  });
});

// 设置第一个管理员
const setAdminRoute = createRoute({
  method: "post",
  path: "/set-admin",
  tags: ["Init"],
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            userId: z.string(),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
          }),
        },
      },
      description: "设置管理员成功",
    },
  },
});

app.openapi(setAdminRoute, async (c): Promise<any> => {
  const db = c.get("db");
  const { userId } = c.req.valid("json");

  // 检查是否有管理员（如果已有管理员，不允许访问）
  const adminCount = await db.select({ count: count() }).from(users).where(eq(users.role, "admin"));

  if (adminCount[0]?.count > 0) {
    return c.json({ success: false, message: "系统已初始化，无法设置管理员" }, 403);
  }

  // 检查用户是否存在
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) {
    return c.json({ success: false, message: "用户不存在" }, 404);
  }

  // 设置用户为管理员并激活
  await db
    .update(users)
    .set({
      role: "admin",
      isActivated: true,
    })
    .where(eq(users.id, userId));

  return c.json({
    success: true,
    message: `已成功将用户 "${user.username}" 设置为管理员并激活`,
  });
});

export default app;
