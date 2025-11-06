import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { eq, like, or, desc, count } from "drizzle-orm";
import { users, endpoints as endpointsTable, permissionGroups, accessKeys } from "../db/schema";
import { authMiddleware } from "../middleware/auth";
import { adminMiddleware } from "../middleware/admin";
import { buildTree } from "../utils/tree";
import type { Bindings } from "../types";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import * as drizzleSchema from "../db/schema";
import {
  AdminUserSchema,
  AdminUserListResponseSchema,
  AdminUserQuerySchema,
  AdminStatsSchema,
  AdminUserActionResponseSchema,
  AdminForceUnpublishResponseSchema,
} from "../../common/validators/admin.schema";
import { EndpointTreeResponseSchema, EndpointDetailResponseSchema } from "../../common/validators/endpoint.schema";

type Variables = {
  db: DrizzleD1Database<typeof drizzleSchema>;
  user: typeof drizzleSchema.users.$inferSelect;
};

const app = new OpenAPIHono<{ Bindings: Bindings; Variables: Variables }>();

// 应用认证中间件和管理员中间件到所有管理员路由
app.use("/admin/*", authMiddleware, adminMiddleware);

// 列出所有用户
const listUsersRoute = createRoute({
  method: "get",
  path: "/admin/users",
  tags: ["Admin"],
  security: [{ Bearer: [] }],
  request: {
    query: AdminUserQuerySchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: AdminUserListResponseSchema,
        },
      },
      description: "成功返回用户列表",
    },
  },
});

app.openapi(listUsersRoute, async (c): Promise<any> => {
  const db = c.get("db");
  const { page, pageSize, role, isActivated, search } = c.req.valid("query");

  let query = db.select().from(users);

  // 应用筛选
  const conditions = [];
  if (role) {
    conditions.push(eq(users.role, role));
  }
  if (isActivated !== undefined) {
    conditions.push(eq(users.isActivated, isActivated));
  }
  if (search) {
    conditions.push(or(like(users.username, `%${search}%`), like(users.email, `%${search}%`)));
  }

  let allUsers = await db.select().from(users).orderBy(desc(users.createdAt));

  // 手动过滤（Drizzle SQLite 的限制）
  if (role) {
    allUsers = allUsers.filter((u) => u.role === role);
  }
  if (isActivated !== undefined) {
    allUsers = allUsers.filter((u) => u.isActivated === isActivated);
  }
  if (search) {
    allUsers = allUsers.filter((u) => u.username.includes(search) || u.email?.includes(search));
  }

  const total = allUsers.length;
  const offset = (page - 1) * pageSize;
  const paginatedUsers = allUsers.slice(offset, offset + pageSize);

  return c.json({
    success: true,
    data: {
      users: paginatedUsers as any,
      total,
      page,
      pageSize,
    },
  });
});

// 激活用户
const activateUserRoute = createRoute({
  method: "post",
  path: "/admin/users/{id}/activate",
  tags: ["Admin"],
  security: [{ Bearer: [] }],
  request: {
    params: z.object({
      id: z.string(),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: AdminUserActionResponseSchema,
        },
      },
      description: "用户已激活",
    },
  },
});

app.openapi(activateUserRoute, async (c): Promise<any> => {
  const db = c.get("db");
  const { id } = c.req.valid("param");

  const user = await db.query.users.findFirst({
    where: eq(users.id, id),
  });

  if (!user) {
    return c.json({ success: false, message: "用户不存在" }, 404);
  }

  if (user.isActivated) {
    return c.json({ success: false, message: "用户已激活" }, 400);
  }

  await db.update(users).set({ isActivated: true, updatedAt: new Date() }).where(eq(users.id, id));

  return c.json({
    success: true,
    message: `用户 ${user.username} 已激活`,
  });
});

// 停用用户
const deactivateUserRoute = createRoute({
  method: "post",
  path: "/admin/users/{id}/deactivate",
  tags: ["Admin"],
  security: [{ Bearer: [] }],
  request: {
    params: z.object({
      id: z.string(),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: AdminUserActionResponseSchema,
        },
      },
      description: "用户已停用",
    },
  },
});

app.openapi(deactivateUserRoute, async (c): Promise<any> => {
  const db = c.get("db");
  const { id } = c.req.valid("param");

  const user = await db.query.users.findFirst({
    where: eq(users.id, id),
  });

  if (!user) {
    return c.json({ success: false, message: "用户不存在" }, 404);
  }

  if (!user.isActivated) {
    return c.json({ success: false, message: "用户未激活" }, 400);
  }

  await db.update(users).set({ isActivated: false, updatedAt: new Date() }).where(eq(users.id, id));

  return c.json({
    success: true,
    message: `用户 ${user.username} 已停用`,
  });
});

// 删除用户
const deleteUserRoute = createRoute({
  method: "delete",
  path: "/admin/users/{id}",
  tags: ["Admin"],
  security: [{ Bearer: [] }],
  request: {
    params: z.object({
      id: z.string(),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: AdminUserActionResponseSchema,
        },
      },
      description: "用户已删除",
    },
  },
});

app.openapi(deleteUserRoute, async (c): Promise<any> => {
  const db = c.get("db");
  const currentUser = c.get("user");
  const { id } = c.req.valid("param");

  if (id === currentUser.id) {
    return c.json({ success: false, message: "不能删除自己的账号" }, 400);
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, id),
  });

  if (!user) {
    return c.json({ success: false, message: "用户不存在" }, 404);
  }

  // 级联删除会自动处理相关数据
  await db.delete(users).where(eq(users.id, id));

  return c.json({
    success: true,
    message: `用户 ${user.username} 已删除`,
  });
});

// 查看指定用户的端点树
const getUserEndpointsRoute = createRoute({
  method: "get",
  path: "/admin/users/{userId}/endpoints",
  tags: ["Admin"],
  security: [{ Bearer: [] }],
  request: {
    params: z.object({
      userId: z.string(),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: EndpointTreeResponseSchema,
        },
      },
      description: "成功返回用户端点树",
    },
  },
});

app.openapi(getUserEndpointsRoute, async (c): Promise<any> => {
  const db = c.get("db");
  const { userId } = c.req.valid("param");

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) {
    return c.json({ success: false, message: "用户不存在" }, 404);
  }

  const endpoints = await db.select().from(endpointsTable).where(eq(endpointsTable.ownerUserId, userId));

  const tree = buildTree(endpoints);

  return c.json({
    success: true,
    data: { tree },
  });
});

// 查看任意端点详情
const getAnyEndpointRoute = createRoute({
  method: "get",
  path: "/admin/endpoints/{id}",
  tags: ["Admin"],
  security: [{ Bearer: [] }],
  request: {
    params: z.object({
      id: z.string(),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: EndpointDetailResponseSchema,
        },
      },
      description: "成功返回端点详情",
    },
  },
});

app.openapi(getAnyEndpointRoute, async (c): Promise<any> => {
  const db = c.get("db");
  const { id } = c.req.valid("param");

  const endpoint = await db.query.endpoints.findFirst({
    where: eq(endpointsTable.id, id),
  });

  if (!endpoint) {
    return c.json({ success: false, message: "端点不存在" }, 404);
  }

  return c.json({
    success: true,
    data: { endpoint: endpoint as any },
  });
});

// 强制下线端点
const forceUnpublishEndpointRoute = createRoute({
  method: "post",
  path: "/admin/endpoints/{id}/force-unpublish",
  tags: ["Admin"],
  security: [{ Bearer: [] }],
  request: {
    params: z.object({
      id: z.string(),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: AdminForceUnpublishResponseSchema,
        },
      },
      description: "端点已强制下线",
    },
  },
});

app.openapi(forceUnpublishEndpointRoute, async (c): Promise<any> => {
  const db = c.get("db");
  const { id } = c.req.valid("param");

  const endpoint = await db.query.endpoints.findFirst({
    where: eq(endpointsTable.id, id),
  });

  if (!endpoint) {
    return c.json({ success: false, message: "端点不存在" }, 404);
  }

  await db.update(endpointsTable).set({ isPublished: false, updatedAt: new Date() }).where(eq(endpointsTable.id, id));

  return c.json({
    success: true,
    message: "端点已强制下线",
  });
});

// 系统统计
const getStatsRoute = createRoute({
  method: "get",
  path: "/admin/stats",
  tags: ["Admin"],
  security: [{ Bearer: [] }],
  responses: {
    200: {
      content: {
        "application/json": {
          schema: AdminStatsSchema,
        },
      },
      description: "成功返回系统统计",
    },
  },
});

app.openapi(getStatsRoute, async (c): Promise<any> => {
  const db = c.get("db");

  const allUsers = await db.select().from(users);
  const allEndpoints = await db.select().from(endpointsTable);
  const allGroups = await db.select().from(permissionGroups);
  const allKeys = await db.select().from(accessKeys);

  const totalUsers = allUsers.length;
  const activatedUsers = allUsers.filter((u) => u.isActivated).length;
  const totalEndpoints = allEndpoints.length;
  const publishedEndpoints = allEndpoints.filter((e) => e.isPublished).length;

  return c.json({
    success: true,
    data: {
      totalUsers,
      activatedUsers,
      totalEndpoints,
      publishedEndpoints,
      totalPermissionGroups: allGroups.length,
      totalAccessKeys: allKeys.length,
    },
  });
});

export default app;
