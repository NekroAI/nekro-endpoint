import { z } from "@hono/zod-openapi";

// 管理员用户信息 Schema
export const AdminUserSchema = z.object({
  id: z.string(),
  githubId: z.string(),
  username: z.string(),
  email: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  role: z.enum(["user", "admin"]),
  isActivated: z.boolean(),
  lastLoginAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// 管理员用户列表响应
export const AdminUserListResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    users: z.array(AdminUserSchema),
    total: z.number().int(),
    page: z.number().int(),
    pageSize: z.number().int(),
  }),
});

// 管理员用户查询参数
export const AdminUserQuerySchema = z.object({
  page: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().min(1))
    .optional()
    .default("1"),
  pageSize: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().min(1).max(100))
    .optional()
    .default("20"),
  role: z.enum(["user", "admin"]).optional(),
  isActivated: z
    .string()
    .transform((val) => val === "true")
    .optional(),
  search: z.string().optional(), // 搜索用户名或邮箱
});

// 系统统计信息
export const AdminStatsSchema = z.object({
  success: z.boolean(),
  data: z.object({
    totalUsers: z.number().int(),
    activatedUsers: z.number().int(),
    totalEndpoints: z.number().int(),
    publishedEndpoints: z.number().int(),
    totalPermissionGroups: z.number().int(),
    totalAccessKeys: z.number().int(),
  }),
});

// 激活/停用用户响应
export const AdminUserActionResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

// 强制下线端点响应
export const AdminForceUnpublishResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
