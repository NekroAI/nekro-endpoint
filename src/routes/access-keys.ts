import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { eq, and } from "drizzle-orm";
import { accessKeys, permissionGroups } from "../db/schema";
import { authMiddleware } from "../middleware/auth";
import { generateAccessKey } from "../utils/encryption";
import type { Bindings } from "../types";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import * as drizzleSchema from "../db/schema";
import {
  AccessKeySchema,
  CreateAccessKeySchema,
  UpdateAccessKeySchema,
  AccessKeyListResponseSchema,
  CreateAccessKeyResponseSchema,
  PermissionSuccessResponseSchema,
} from "../../common/validators/permission.schema";

type Variables = {
  db: DrizzleD1Database<typeof drizzleSchema>;
  user: typeof drizzleSchema.users.$inferSelect;
};

const app = new OpenAPIHono<{ Bindings: Bindings; Variables: Variables }>();

// 应用认证中间件到所有访问密钥管理路由
// 注意：access-keys 有两种路径前缀，需要分别应用中间件
app.use("/permission-groups/*/keys*", authMiddleware);
app.use("/access-keys/*", authMiddleware);

// 列出指定权限组的访问密钥
const listAccessKeysRoute = createRoute({
  method: "get",
  path: "/permission-groups/{groupId}/keys",
  tags: ["Access Keys"],
  security: [{ Bearer: [] }],
  request: {
    params: z.object({
      groupId: z.string(),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: AccessKeyListResponseSchema,
        },
      },
      description: "成功返回访问密钥列表",
    },
  },
});

app.openapi(listAccessKeysRoute, async (c): Promise<any> => {
  const db = c.get("db");
  const user = c.get("user");
  const { groupId } = c.req.valid("param");

  // 验证权限组是否属于当前用户
  const group = await db.query.permissionGroups.findFirst({
    where: and(eq(permissionGroups.id, groupId), eq(permissionGroups.ownerUserId, user.id)),
  });

  if (!group) {
    return c.json({ success: false, message: "权限组不存在" }, 404);
  }

  const keys = await db.select().from(accessKeys).where(eq(accessKeys.permissionGroupId, groupId));

  return c.json({
    success: true,
    data: {
      keys: keys as any,
      total: keys.length,
    },
  });
});

// 生成新的访问密钥
const createAccessKeyRoute = createRoute({
  method: "post",
  path: "/permission-groups/{groupId}/keys",
  tags: ["Access Keys"],
  security: [{ Bearer: [] }],
  request: {
    params: z.object({
      groupId: z.string(),
    }),
    body: {
      content: {
        "application/json": {
          schema: CreateAccessKeySchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        "application/json": {
          schema: CreateAccessKeyResponseSchema,
        },
      },
      description: "访问密钥生成成功",
    },
  },
});

app.openapi(createAccessKeyRoute, async (c): Promise<any> => {
  const db = c.get("db");
  const user = c.get("user");
  const { groupId } = c.req.valid("param");
  const body = c.req.valid("json");

  // 验证权限组是否属于当前用户
  const group = await db.query.permissionGroups.findFirst({
    where: and(eq(permissionGroups.id, groupId), eq(permissionGroups.ownerUserId, user.id)),
  });

  if (!group) {
    return c.json({ success: false, message: "权限组不存在" }, 404);
  }

  // 生成密钥（明文存储）
  const plainKey = generateAccessKey();

  // 处理过期时间
  const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;

  const newKey = await db
    .insert(accessKeys)
    .values({
      permissionGroupId: groupId,
      keyValue: plainKey, // 直接存储明文
      description: body.description ?? null,
      expiresAt: expiresAt,
      isActive: true,
      lastUsedAt: null,
      usageCount: 0,
    })
    .returning()
    .get();

  return c.json(
    {
      success: true,
      message: "密钥创建成功，请立即保存，此密钥仅显示一次",
      data: {
        key: newKey,
      },
    },
    201,
  );
});

// 更新访问密钥
const updateAccessKeyRoute = createRoute({
  method: "patch",
  path: "/access-keys/{id}",
  tags: ["Access Keys"],
  security: [{ Bearer: [] }],
  request: {
    params: z.object({
      id: z.string(),
    }),
    body: {
      content: {
        "application/json": {
          schema: UpdateAccessKeySchema,
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
              key: AccessKeySchema,
            }),
          }),
        },
      },
      description: "访问密钥更新成功",
    },
  },
});

app.openapi(updateAccessKeyRoute, async (c): Promise<any> => {
  const db = c.get("db");
  const user = c.get("user");
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");

  // 验证密钥是否存在且属于当前用户
  const key = await db.query.accessKeys.findFirst({
    where: eq(accessKeys.id, id),
    with: {
      permissionGroup: true,
    },
  });

  if (!key) {
    return c.json({ success: false, message: "访问密钥不存在" }, 404);
  }

  // 验证权限组属于当前用户
  const group = await db.query.permissionGroups.findFirst({
    where: and(eq(permissionGroups.id, key.permissionGroupId), eq(permissionGroups.ownerUserId, user.id)),
  });

  if (!group) {
    return c.json({ success: false, message: "无权操作此密钥" }, 403);
  }

  const updateData: any = {};

  if (body.description !== undefined) updateData.description = body.description;
  if (body.expiresAt !== undefined) updateData.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
  if (body.isActive !== undefined) updateData.isActive = body.isActive;

  const updatedKey = await db.update(accessKeys).set(updateData).where(eq(accessKeys.id, id)).returning().get();

  return c.json({
    success: true,
    message: "访问密钥更新成功",
    data: { key: updatedKey as any },
  });
});

// 撤销访问密钥
const revokeAccessKeyRoute = createRoute({
  method: "post",
  path: "/access-keys/{id}/revoke",
  tags: ["Access Keys"],
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
      description: "访问密钥已撤销",
    },
  },
});

app.openapi(revokeAccessKeyRoute, async (c): Promise<any> => {
  const db = c.get("db");
  const user = c.get("user");
  const { id } = c.req.valid("param");

  // 验证密钥是否存在且属于当前用户
  const key = await db.query.accessKeys.findFirst({
    where: eq(accessKeys.id, id),
  });

  if (!key) {
    return c.json({ success: false, message: "访问密钥不存在" }, 404);
  }

  // 验证权限组属于当前用户
  const group = await db.query.permissionGroups.findFirst({
    where: and(eq(permissionGroups.id, key.permissionGroupId), eq(permissionGroups.ownerUserId, user.id)),
  });

  if (!group) {
    return c.json({ success: false, message: "无权操作此密钥" }, 403);
  }

  await db.update(accessKeys).set({ isActive: false }).where(eq(accessKeys.id, id));

  return c.json({
    success: true,
    message: "访问密钥已撤销",
  });
});

// 删除访问密钥
const deleteAccessKeyRoute = createRoute({
  method: "delete",
  path: "/access-keys/{id}",
  tags: ["Access Keys"],
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
      description: "访问密钥删除成功",
    },
  },
});

app.openapi(deleteAccessKeyRoute, async (c): Promise<any> => {
  const db = c.get("db");
  const user = c.get("user");
  const { id } = c.req.valid("param");

  // 验证密钥是否存在且属于当前用户
  const key = await db.query.accessKeys.findFirst({
    where: eq(accessKeys.id, id),
  });

  if (!key) {
    return c.json({ success: false, message: "访问密钥不存在" }, 404);
  }

  // 验证权限组属于当前用户
  const group = await db.query.permissionGroups.findFirst({
    where: and(eq(permissionGroups.id, key.permissionGroupId), eq(permissionGroups.ownerUserId, user.id)),
  });

  if (!group) {
    return c.json({ success: false, message: "无权操作此密钥" }, 403);
  }

  await db.delete(accessKeys).where(eq(accessKeys.id, id));

  return c.json({
    success: true,
    message: "访问密钥删除成功",
  });
});

export default app;
