import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { eq, and, desc } from "drizzle-orm";
import { endpoints as endpointsTable } from "../db/schema";
import { authMiddleware } from "../middleware/auth";
import { activationMiddleware } from "../middleware/activation";
import type { Bindings } from "../types";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import * as drizzleSchema from "../db/schema";
import {
  EndpointSchema,
  CreateEndpointSchema,
  UpdateEndpointSchema,
  MoveEndpointSchema,
  ReorderEndpointsSchema,
  EndpointListResponseSchema,
  EndpointTreeResponseSchema,
  EndpointDetailResponseSchema,
  EndpointSuccessResponseSchema,
  EndpointQuerySchema,
} from "../../common/validators/endpoint.schema";
import { buildTree, checkCircularReference } from "../utils/tree";
import { buildPathTree } from "../utils/pathTree";

type Variables = {
  db: DrizzleD1Database<typeof drizzleSchema>;
  user: typeof drizzleSchema.users.$inferSelect;
};

const app = new OpenAPIHono<{ Bindings: Bindings; Variables: Variables }>();

// 应用认证中间件到所有端点管理路由
app.use("/endpoints/*", authMiddleware);

// 列出端点（树形或扁平）
const listEndpointsRoute = createRoute({
  method: "get",
  path: "/endpoints",
  tags: ["Endpoints"],
  security: [{ Bearer: [] }],
  request: {
    query: EndpointQuerySchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.union([EndpointListResponseSchema, EndpointTreeResponseSchema]),
        },
      },
      description: "成功返回端点列表",
    },
  },
});

app.openapi(listEndpointsRoute, async (c): Promise<any> => {
  const db = c.get("db");
  const user = c.get("user");
  const { view, includeDisabled, type } = c.req.valid("query");

  // 获取所有端点，排序将在 buildTree 中处理
  let query = db.select().from(endpointsTable).where(eq(endpointsTable.ownerUserId, user.id));

  const allEndpoints = await query;

  // 过滤
  let filteredEndpoints = allEndpoints;
  if (!includeDisabled) {
    filteredEndpoints = filteredEndpoints.filter((e) => e.enabled);
  }
  if (type) {
    filteredEndpoints = filteredEndpoints.filter((e) => e.type === type);
  }

  if (view === "tree") {
    // 使用基于路径的树构建（类似 IDE 文件树）
    const tree = buildPathTree(filteredEndpoints);
    return c.json({
      success: true,
      data: { tree },
    });
  }

  return c.json({
    success: true,
    data: {
      endpoints: filteredEndpoints,
      total: filteredEndpoints.length,
    },
  });
});

// 创建端点
const createEndpointRoute = createRoute({
  method: "post",
  path: "/endpoints",
  tags: ["Endpoints"],
  security: [{ Bearer: [] }],
  request: {
    body: {
      content: {
        "application/json": {
          schema: CreateEndpointSchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        "application/json": {
          schema: EndpointSuccessResponseSchema,
        },
      },
      description: "端点创建成功",
    },
  },
});

app.openapi(createEndpointRoute, async (c): Promise<any> => {
  const db = c.get("db");
  const user = c.get("user");
  const body = c.req.valid("json");

  // 检查路径是否已存在
  const existingEndpoint = await db.query.endpoints.findFirst({
    where: and(eq(endpointsTable.ownerUserId, user.id), eq(endpointsTable.path, body.path)),
  });

  if (existingEndpoint) {
    return c.json({ success: false, message: "该路径已存在" }, 400);
  }

  // 检查循环引用
  if (body.parentId) {
    const allEndpoints = await db.select().from(endpointsTable).where(eq(endpointsTable.ownerUserId, user.id));
    // 对于新节点，我们传递一个临时 ID
    if (checkCircularReference(allEndpoints, "temp-new-id", body.parentId)) {
      return c.json({ success: false, message: "无法创建循环引用" }, 400);
    }
  }

  const newEndpoint = await db
    .insert(endpointsTable)
    .values({
      ownerUserId: user.id,
      parentId: body.parentId ?? null,
      path: body.path,
      name: body.name,
      type: body.type,
      config: JSON.stringify(body.config),
      accessControl: body.accessControl,
      requiredPermissionGroups: body.requiredPermissionGroups ? JSON.stringify(body.requiredPermissionGroups) : null,
      enabled: true,
      isPublished: false,
      sortOrder: 0,
    })
    .returning()
    .get();

  return c.json(
    {
      success: true,
      message: "端点创建成功",
      data: { endpoint: newEndpoint as any },
    },
    201,
  );
});

// 获取端点详情
const getEndpointRoute = createRoute({
  method: "get",
  path: "/endpoints/{id}",
  tags: ["Endpoints"],
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

app.openapi(getEndpointRoute, async (c): Promise<any> => {
  const db = c.get("db");
  const user = c.get("user");
  const { id } = c.req.valid("param");

  const endpoint = await db.query.endpoints.findFirst({
    where: and(eq(endpointsTable.id, id), eq(endpointsTable.ownerUserId, user.id)),
  });

  if (!endpoint) {
    return c.json({ success: false, message: "端点不存在" }, 404);
  }

  // 解析 JSON 字段（从 JSON 字符串转为对象）
  const parsedEndpoint = {
    ...endpoint,
    config: typeof endpoint.config === "string" ? JSON.parse(endpoint.config) : endpoint.config,
    requiredPermissionGroups:
      typeof endpoint.requiredPermissionGroups === "string"
        ? JSON.parse(endpoint.requiredPermissionGroups)
        : endpoint.requiredPermissionGroups || [],
  };

  return c.json({
    success: true,
    data: parsedEndpoint,
  });
});

// 更新端点
const updateEndpointRoute = createRoute({
  method: "patch",
  path: "/endpoints/{id}",
  tags: ["Endpoints"],
  security: [{ Bearer: [] }],
  request: {
    params: z.object({
      id: z.string(),
    }),
    body: {
      content: {
        "application/json": {
          schema: UpdateEndpointSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: EndpointSuccessResponseSchema,
        },
      },
      description: "端点更新成功",
    },
  },
});

app.openapi(updateEndpointRoute, async (c): Promise<any> => {
  const db = c.get("db");
  const user = c.get("user");
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");

  const endpoint = await db.query.endpoints.findFirst({
    where: and(eq(endpointsTable.id, id), eq(endpointsTable.ownerUserId, user.id)),
  });

  if (!endpoint) {
    return c.json({ success: false, message: "端点不存在" }, 404);
  }

  // 如果更新了 parentId，检查循环引用
  if (body.parentId !== undefined) {
    const allEndpoints = await db.select().from(endpointsTable).where(eq(endpointsTable.ownerUserId, user.id));
    if (checkCircularReference(allEndpoints, id, body.parentId)) {
      return c.json({ success: false, message: "无法创建循环引用" }, 400);
    }
  }

  // 如果更新了路径，检查是否冲突
  if (body.path && body.path !== endpoint.path) {
    const existingEndpoint = await db.query.endpoints.findFirst({
      where: and(eq(endpointsTable.ownerUserId, user.id), eq(endpointsTable.path, body.path)),
    });

    if (existingEndpoint && existingEndpoint.id !== id) {
      return c.json({ success: false, message: "该路径已被其他端点使用" }, 400);
    }
  }

  const updateData: any = {
    updatedAt: new Date(),
  };

  if (body.parentId !== undefined) updateData.parentId = body.parentId;
  if (body.path) updateData.path = body.path;
  if (body.name) updateData.name = body.name;
  if (body.type) updateData.type = body.type;
  if (body.config) updateData.config = JSON.stringify(body.config);
  if (body.accessControl) updateData.accessControl = body.accessControl;
  if (body.requiredPermissionGroups !== undefined)
    updateData.requiredPermissionGroups = body.requiredPermissionGroups
      ? JSON.stringify(body.requiredPermissionGroups)
      : null;
  if (body.enabled !== undefined) updateData.enabled = body.enabled;

  const updatedEndpoint = await db
    .update(endpointsTable)
    .set(updateData)
    .where(eq(endpointsTable.id, id))
    .returning()
    .get();

  return c.json({
    success: true,
    message: "端点更新成功",
    data: { endpoint: updatedEndpoint as any },
  });
});

// 删除端点
const deleteEndpointRoute = createRoute({
  method: "delete",
  path: "/endpoints/{id}",
  tags: ["Endpoints"],
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
          schema: EndpointSuccessResponseSchema,
        },
      },
      description: "端点删除成功",
    },
  },
});

app.openapi(deleteEndpointRoute, async (c): Promise<any> => {
  const db = c.get("db");
  const user = c.get("user");
  const { id } = c.req.valid("param");

  const endpoint = await db.query.endpoints.findFirst({
    where: and(eq(endpointsTable.id, id), eq(endpointsTable.ownerUserId, user.id)),
  });

  if (!endpoint) {
    return c.json({ success: false, message: "端点不存在" }, 404);
  }

  // 检查是否有子端点
  const children = await db.select().from(endpointsTable).where(eq(endpointsTable.parentId, id));
  if (children.length > 0) {
    return c.json({ success: false, message: "请先删除子端点" }, 400);
  }

  await db.delete(endpointsTable).where(eq(endpointsTable.id, id));

  return c.json({
    success: true,
    message: "端点删除成功",
  });
});

// 发布端点（需要激活状态）
const publishEndpointRoute = createRoute({
  method: "post",
  path: "/endpoints/{id}/publish",
  tags: ["Endpoints"],
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
          schema: EndpointSuccessResponseSchema,
        },
      },
      description: "端点发布成功",
    },
  },
});

app.openapi(publishEndpointRoute, async (c): Promise<any> => {
  const db = c.get("db");
  const user = c.get("user");
  const { id } = c.req.valid("param");

  const endpoint = await db.query.endpoints.findFirst({
    where: and(eq(endpointsTable.id, id), eq(endpointsTable.ownerUserId, user.id)),
  });

  if (!endpoint) {
    return c.json({ success: false, message: "端点不存在" }, 404);
  }

  if (endpoint.isPublished) {
    return c.json({ success: false, message: "端点已发布" }, 400);
  }

  const updatedEndpoint = await db
    .update(endpointsTable)
    .set({ isPublished: true, updatedAt: new Date() })
    .where(eq(endpointsTable.id, id))
    .returning()
    .get();

  return c.json({
    success: true,
    message: "端点发布成功",
    data: { endpoint: updatedEndpoint as any },
  });
});

// 取消发布端点
const unpublishEndpointRoute = createRoute({
  method: "post",
  path: "/endpoints/{id}/unpublish",
  tags: ["Endpoints"],
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
          schema: EndpointSuccessResponseSchema,
        },
      },
      description: "端点取消发布成功",
    },
  },
});

app.openapi(unpublishEndpointRoute, async (c): Promise<any> => {
  const db = c.get("db");
  const user = c.get("user");
  const { id } = c.req.valid("param");

  const endpoint = await db.query.endpoints.findFirst({
    where: and(eq(endpointsTable.id, id), eq(endpointsTable.ownerUserId, user.id)),
  });

  if (!endpoint) {
    return c.json({ success: false, message: "端点不存在" }, 404);
  }

  const updatedEndpoint = await db
    .update(endpointsTable)
    .set({ isPublished: false, updatedAt: new Date() })
    .where(eq(endpointsTable.id, id))
    .returning()
    .get();

  return c.json({
    success: true,
    message: "端点已下线",
    data: { endpoint: updatedEndpoint as any },
  });
});

// 移动端点
const moveEndpointRoute = createRoute({
  method: "patch",
  path: "/endpoints/{id}/move",
  tags: ["Endpoints"],
  security: [{ Bearer: [] }],
  request: {
    params: z.object({
      id: z.string(),
    }),
    body: {
      content: {
        "application/json": {
          schema: MoveEndpointSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: EndpointSuccessResponseSchema,
        },
      },
      description: "端点移动成功",
    },
  },
});

app.openapi(moveEndpointRoute, async (c): Promise<any> => {
  const db = c.get("db");
  const user = c.get("user");
  const { id } = c.req.valid("param");
  const { newParentId } = c.req.valid("json");

  const endpoint = await db.query.endpoints.findFirst({
    where: and(eq(endpointsTable.id, id), eq(endpointsTable.ownerUserId, user.id)),
  });

  if (!endpoint) {
    return c.json({ success: false, message: "端点不存在" }, 404);
  }

  // 检查循环引用
  const allEndpoints = await db.select().from(endpointsTable).where(eq(endpointsTable.ownerUserId, user.id));
  if (checkCircularReference(allEndpoints, id, newParentId)) {
    return c.json({ success: false, message: "无法创建循环引用" }, 400);
  }

  const updatedEndpoint = await db
    .update(endpointsTable)
    .set({ parentId: newParentId, updatedAt: new Date() })
    .where(eq(endpointsTable.id, id))
    .returning()
    .get();

  return c.json({
    success: true,
    message: "端点移动成功",
    data: { endpoint: updatedEndpoint as any },
  });
});

// 批量排序
const reorderEndpointsRoute = createRoute({
  method: "post",
  path: "/endpoints/reorder",
  tags: ["Endpoints"],
  security: [{ Bearer: [] }],
  request: {
    body: {
      content: {
        "application/json": {
          schema: ReorderEndpointsSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: EndpointSuccessResponseSchema,
        },
      },
      description: "排序更新成功",
    },
  },
});

app.openapi(reorderEndpointsRoute, async (c): Promise<any> => {
  const db = c.get("db");
  const user = c.get("user");
  const { orders } = c.req.valid("json");

  // 批量更新排序
  for (const order of orders) {
    await db
      .update(endpointsTable)
      .set({ sortOrder: order.sortOrder, updatedAt: new Date() })
      .where(and(eq(endpointsTable.id, order.id), eq(endpointsTable.ownerUserId, user.id)));
  }

  return c.json({
    success: true,
    message: "排序更新成功",
  });
});

// 只在发布相关的路由上应用激活检查中间件
app.use("/endpoints/:id/publish", activationMiddleware);

export default app;
