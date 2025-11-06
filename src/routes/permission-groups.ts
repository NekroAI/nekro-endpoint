import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { eq, and } from "drizzle-orm";
import { permissionGroups, accessKeys, endpoints as endpointsTable } from "../db/schema";
import { authMiddleware } from "../middleware/auth";
import type { Bindings } from "../types";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import * as drizzleSchema from "../db/schema";
import {
  PermissionGroupSchema,
  CreatePermissionGroupSchema,
  UpdatePermissionGroupSchema,
  PermissionGroupListResponseSchema,
  PermissionGroupDetailResponseSchema,
  PermissionSuccessResponseSchema,
} from "../../common/validators/permission.schema";

type Variables = {
  db: DrizzleD1Database<typeof drizzleSchema>;
  user: typeof drizzleSchema.users.$inferSelect;
};

const app = new OpenAPIHono<{ Bindings: Bindings; Variables: Variables }>();

// 应用认证中间件到所有权限组管理路由
app.use("/permission-groups/*", authMiddleware);

// 列出权限组
const listPermissionGroupsRoute = createRoute({
  method: "get",
  path: "/permission-groups",
  tags: ["Permission Groups"],
  security: [{ Bearer: [] }],
  responses: {
    200: {
      content: {
        "application/json": {
          schema: PermissionGroupListResponseSchema,
        },
      },
      description: "成功返回权限组列表",
    },
  },
});

app.openapi(listPermissionGroupsRoute, async (c): Promise<any> => {
  const db = c.get("db");
  const user = c.get("user");

  const groups = await db.select().from(permissionGroups).where(eq(permissionGroups.ownerUserId, user.id));

  return c.json({
    success: true,
    data: {
      groups: groups as any,
      total: groups.length,
    },
  });
});

// 创建权限组
const createPermissionGroupRoute = createRoute({
  method: "post",
  path: "/permission-groups",
  tags: ["Permission Groups"],
  security: [{ Bearer: [] }],
  request: {
    body: {
      content: {
        "application/json": {
          schema: CreatePermissionGroupSchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
            data: z.object({
              group: PermissionGroupSchema,
            }),
          }),
        },
      },
      description: "权限组创建成功",
    },
  },
});

app.openapi(createPermissionGroupRoute, async (c): Promise<any> => {
  const db = c.get("db");
  const user = c.get("user");
  const body = c.req.valid("json");

  const newGroup = await db
    .insert(permissionGroups)
    .values({
      ownerUserId: user.id,
      name: body.name,
      description: body.description ?? null,
    })
    .returning()
    .get();

  return c.json(
    {
      success: true,
      message: "权限组创建成功",
      data: { group: newGroup as any },
    },
    201,
  );
});

// 获取权限组详情
const getPermissionGroupRoute = createRoute({
  method: "get",
  path: "/permission-groups/{id}",
  tags: ["Permission Groups"],
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
          schema: PermissionGroupDetailResponseSchema,
        },
      },
      description: "成功返回权限组详情",
    },
  },
});

app.openapi(getPermissionGroupRoute, async (c): Promise<any> => {
  const db = c.get("db");
  const user = c.get("user");
  const { id } = c.req.valid("param");

  const group = await db.query.permissionGroups.findFirst({
    where: and(eq(permissionGroups.id, id), eq(permissionGroups.ownerUserId, user.id)),
  });

  if (!group) {
    return c.json({ success: false, message: "权限组不存在" }, 404);
  }

  // 统计密钥数量
  const keys = await db.select().from(accessKeys).where(eq(accessKeys.permissionGroupId, id));

  // 统计关联端点数量
  const allEndpoints = await db.select().from(endpointsTable).where(eq(endpointsTable.ownerUserId, user.id));
  const endpointsCount = allEndpoints.filter((e) => {
    if (!e.requiredPermissionGroups) return false;
    try {
      const groups = JSON.parse(e.requiredPermissionGroups);
      return Array.isArray(groups) && groups.includes(id);
    } catch {
      return false;
    }
  }).length;

  return c.json({
    success: true,
    data: {
      group: group as any,
      keysCount: keys.length,
      endpointsCount,
    },
  });
});

// 更新权限组
const updatePermissionGroupRoute = createRoute({
  method: "patch",
  path: "/permission-groups/{id}",
  tags: ["Permission Groups"],
  security: [{ Bearer: [] }],
  request: {
    params: z.object({
      id: z.string(),
    }),
    body: {
      content: {
        "application/json": {
          schema: UpdatePermissionGroupSchema,
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
            data: z.object({
              group: PermissionGroupSchema,
            }),
          }),
        },
      },
      description: "权限组更新成功",
    },
  },
});

app.openapi(updatePermissionGroupRoute, async (c): Promise<any> => {
  const db = c.get("db");
  const user = c.get("user");
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");

  const group = await db.query.permissionGroups.findFirst({
    where: and(eq(permissionGroups.id, id), eq(permissionGroups.ownerUserId, user.id)),
  });

  if (!group) {
    return c.json({ success: false, message: "权限组不存在" }, 404);
  }

  const updateData: any = {
    updatedAt: new Date(),
  };

  if (body.name) updateData.name = body.name;
  if (body.description !== undefined) updateData.description = body.description;

  const updatedGroup = await db
    .update(permissionGroups)
    .set(updateData)
    .where(eq(permissionGroups.id, id))
    .returning()
    .get();

  return c.json({
    success: true,
    message: "权限组更新成功",
    data: { group: updatedGroup as any },
  });
});

// 删除权限组
const deletePermissionGroupRoute = createRoute({
  method: "delete",
  path: "/permission-groups/{id}",
  tags: ["Permission Groups"],
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
          schema: PermissionSuccessResponseSchema,
        },
      },
      description: "权限组删除成功",
    },
  },
});

app.openapi(deletePermissionGroupRoute, async (c): Promise<any> => {
  const db = c.get("db");
  const user = c.get("user");
  const { id } = c.req.valid("param");

  const group = await db.query.permissionGroups.findFirst({
    where: and(eq(permissionGroups.id, id), eq(permissionGroups.ownerUserId, user.id)),
  });

  if (!group) {
    return c.json({ success: false, message: "权限组不存在" }, 404);
  }

  // 检查是否有端点正在使用该权限组
  const allEndpoints = await db.select().from(endpointsTable).where(eq(endpointsTable.ownerUserId, user.id));
  const usedByEndpoints = allEndpoints.some((e) => {
    if (!e.requiredPermissionGroups) return false;
    try {
      const groups = JSON.parse(e.requiredPermissionGroups);
      return Array.isArray(groups) && groups.includes(id);
    } catch {
      return false;
    }
  });

  if (usedByEndpoints) {
    return c.json({ success: false, message: "该权限组正在被端点使用，无法删除" }, 400);
  }

  // 删除权限组（级联删除会自动删除相关的访问密钥）
  await db.delete(permissionGroups).where(eq(permissionGroups.id, id));

  return c.json({
    success: true,
    message: "权限组删除成功",
  });
});

export default app;
