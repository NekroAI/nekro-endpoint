import { z } from "@hono/zod-openapi";

// 权限组 Schema
export const PermissionGroupSchema = z.object({
  id: z.string(),
  ownerUserId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// 创建权限组请求
export const CreatePermissionGroupSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

// 更新权限组请求
export const UpdatePermissionGroupSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
});

// 访问密钥 Schema
export const AccessKeySchema = z.object({
  id: z.string(),
  permissionGroupId: z.string(),
  keyValue: z.string(), // 哈希值，不返回明文
  description: z.string().nullable(),
  expiresAt: z.string().nullable(),
  isActive: z.boolean(),
  lastUsedAt: z.string().nullable(),
  usageCount: z.number().int(),
  createdAt: z.string(),
});

// 访问密钥详情（包含明文密钥，仅在创建时返回一次）
export const AccessKeyWithPlainSchema = z.object({
  id: z.string(),
  permissionGroupId: z.string(),
  plainKey: z.string(), // ep-xxx 格式的明文密钥
  description: z.string().nullable(),
  expiresAt: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
});

// 创建访问密钥请求
export const CreateAccessKeySchema = z.object({
  description: z.string().max(200).optional(),
  expiresAt: z.string().datetime().optional(), // ISO 8601 格式
});

// 更新访问密钥请求
export const UpdateAccessKeySchema = z.object({
  description: z.string().max(200).optional(),
  expiresAt: z.string().datetime().optional(),
  isActive: z.boolean().optional(),
});

// 权限组列表响应
export const PermissionGroupListResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    groups: z.array(PermissionGroupSchema),
    total: z.number().int(),
  }),
});

// 权限组详情响应
export const PermissionGroupDetailResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    group: PermissionGroupSchema,
    keysCount: z.number().int().optional(),
    endpointsCount: z.number().int().optional(),
  }),
});

// 访问密钥列表响应
export const AccessKeyListResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    keys: z.array(AccessKeySchema),
    total: z.number().int(),
  }),
});

// 创建访问密钥响应（包含明文密钥）
export const CreateAccessKeyResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().default("密钥创建成功，请立即保存，此密钥仅显示一次"),
  data: z.object({
    key: AccessKeyWithPlainSchema,
  }),
});

// 通用成功响应
export const PermissionSuccessResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
