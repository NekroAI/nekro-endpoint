import { z } from "@hono/zod-openapi";

// 端点类型枚举
export const EndpointTypeSchema = z.enum(["static", "proxy", "script"]);

export const AccessControlSchema = z.enum(["public", "authenticated"]);

// 静态端点配置
export const StaticConfigSchema = z.object({
  content: z.string(),
  contentType: z.string().default("text/plain"),
  headers: z.record(z.string()).optional(),
});

// 代理端点配置
export const ProxyConfigSchema = z.object({
  targetUrl: z.string().url(),
  pathMapping: z.string().optional(),
  headers: z.record(z.string()).optional(),
  removeHeaders: z.array(z.string()).optional(),
  timeout: z.number().int().min(1000).max(30000).default(10000),
});

// 脚本端点配置 (Phase 2/3)
export const ScriptConfigSchema = z.object({
  code: z.string(),
  runtime: z.enum(["javascript"]).default("javascript"),
});

// 统一配置类型
export const EndpointConfigSchema = z.union([StaticConfigSchema, ProxyConfigSchema, ScriptConfigSchema]);

// 完整端点 Schema
export const EndpointSchema = z.object({
  id: z.string(),
  ownerUserId: z.string(),
  parentId: z.string().nullable(),
  path: z.string(),
  name: z.string(),
  type: EndpointTypeSchema,
  config: z.string(), // JSON string
  accessControl: AccessControlSchema,
  requiredPermissionGroups: z.string().nullable(), // JSON array string
  enabled: z.boolean(),
  isPublished: z.boolean(),
  sortOrder: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// 创建端点请求
export const CreateEndpointSchema = z.object({
  parentId: z.string().nullable().optional(),
  path: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-zA-Z0-9\-_\/\.]+$/, {
      message: "路径只能包含字母、数字、连字符、下划线、斜杠和点号",
    }),
  name: z.string().min(1).max(100),
  type: EndpointTypeSchema,
  config: EndpointConfigSchema,
  accessControl: AccessControlSchema.default("public"),
  requiredPermissionGroups: z.array(z.string()).optional(),
});

// 更新端点请求
export const UpdateEndpointSchema = z.object({
  parentId: z.string().nullable().optional(),
  path: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-zA-Z0-9\-_\/\.]+$/)
    .optional(),
  name: z.string().min(1).max(100).optional(),
  type: EndpointTypeSchema.optional(),
  config: EndpointConfigSchema.optional(),
  accessControl: AccessControlSchema.optional(),
  requiredPermissionGroups: z.array(z.string()).optional(),
  enabled: z.boolean().optional(),
});

// 移动端点请求
export const MoveEndpointSchema = z.object({
  newParentId: z.string().nullable(),
});

// 批量排序请求
export const ReorderEndpointsSchema = z.object({
  orders: z.array(
    z.object({
      id: z.string(),
      sortOrder: z.number().int(),
    }),
  ),
});

// 端点树节点
export const EndpointTreeNodeSchema: any = z.lazy(() =>
  z.object({
    id: z.string(),
    ownerUserId: z.string(),
    parentId: z.string().nullable(),
    path: z.string(),
    name: z.string(),
    type: EndpointTypeSchema,
    accessControl: AccessControlSchema,
    enabled: z.boolean(),
    isPublished: z.boolean(),
    sortOrder: z.number().int(),
    createdAt: z.string(),
    updatedAt: z.string(),
    children: z.array(EndpointTreeNodeSchema).optional(),
  }),
);

// 端点列表响应
export const EndpointListResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    endpoints: z.array(EndpointSchema),
    total: z.number().int(),
  }),
});

// 端点树响应
export const EndpointTreeResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    tree: z.array(EndpointTreeNodeSchema),
  }),
});

// 端点详情响应
export const EndpointDetailResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    endpoint: EndpointSchema,
  }),
});

// 通用成功响应
export const EndpointSuccessResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z
    .object({
      endpoint: EndpointSchema,
    })
    .optional(),
});

// 查询参数
export const EndpointQuerySchema = z.object({
  view: z.enum(["tree", "flat"]).optional().default("flat"),
  includeDisabled: z
    .string()
    .transform((val) => val === "true")
    .optional(),
  type: EndpointTypeSchema.optional(),
});
