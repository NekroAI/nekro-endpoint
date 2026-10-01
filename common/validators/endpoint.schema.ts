import { z } from "@hono/zod-openapi";

// 端点类型枚举
export const EndpointTypeSchema = z.enum(["static", "proxy", "dynamicProxy", "script"]);

export const AccessControlSchema = z.enum(["public", "authenticated"]);

// 静态端点配置
export const StaticConfigSchema = z.object({
  content: z.string(),
  contentType: z.string().default("text/plain"),
  headers: z.record(z.string()).optional(),
});

// 代理端点配置（固定 URL 转发）
export const ProxyConfigSchema = z.object({
  targetUrl: z.string().url(),
  headers: z.record(z.string()).optional(),
  removeHeaders: z.array(z.string()).optional(),
  timeout: z.number().int().min(1000).max(30000).default(10000),
});

// 动态代理端点配置（子路径代理）
export const DynamicProxyConfigSchema = z.object({
  baseUrl: z.union([z.literal(""), z.string().url()]), // 创建时允许空字符串，编辑时填写有效 URL
  autoAppendSlash: z.boolean().default(true), // 自动在 baseUrl 末尾补充斜杠
  headers: z.record(z.string()).optional(),
  removeHeaders: z.array(z.string()).optional(),
  timeout: z.number().int().min(1000).max(30000).default(15000),
  allowedPaths: z.array(z.string()).optional(),
});

// 脚本端点配置 (Phase 3)
export const ScriptConfigSchema = z.object({
  code: z.string(),
  runtime: z.enum(["javascript"]).default("javascript"),
});

// 统一配置类型
export const EndpointConfigSchema = z.union([
  StaticConfigSchema,
  ProxyConfigSchema,
  DynamicProxyConfigSchema,
  ScriptConfigSchema,
]);

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

// 递归的 children 无法由 zod-to-openapi 推导（z.lazy 会让 /api/doc 生成失败），
// 因此 children 以显式 OpenAPI 描述代替。响应不做运行时校验，只影响文档与类型。
const recursiveChildren = (description: string) =>
  z.array(z.any()).openapi({ type: "array", items: { type: "object" }, description });

// 管理员视图：按 parentId 嵌套的完整端点行（GET /admin/users/{userId}/endpoints）
export const EndpointTreeNodeSchema = EndpointSchema.extend({
  children: recursiveChildren("子端点，结构与本节点相同"),
}).openapi("EndpointTreeNode");

// 端点管理视图：按路径前缀推导的命名空间树（GET /endpoints?view=tree）
export const EndpointPathTreeNodeSchema = z
  .object({
    id: z.string().openapi({ description: "端点 ID；目录节点为路径本身" }),
    path: z.string(),
    name: z.string(),
    isVirtual: z.boolean().openapi({ description: "true 表示由路径前缀形成的目录，本身不是端点" }),
    endpoint: z
      .object({
        id: z.string(),
        name: z.string(),
        path: z.string(),
        type: EndpointTypeSchema,
        accessControl: AccessControlSchema,
        isPublished: z.boolean(),
        enabled: z.boolean(),
      })
      .optional(),
    children: recursiveChildren("子节点，结构与本节点相同"),
  })
  .openapi("EndpointPathTreeNode");

// 端点列表响应
export const EndpointListResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    endpoints: z.array(EndpointSchema),
    total: z.number().int(),
  }),
});

// 端点树响应（管理员视图）
export const EndpointTreeResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    tree: z.array(EndpointTreeNodeSchema),
  }),
});

// 命名空间树响应（GET /endpoints?view=tree）
export const EndpointPathTreeResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    tree: z.array(EndpointPathTreeNodeSchema),
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
