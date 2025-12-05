/**
 * 统一的类型定义文件
 * 所有前后端共享的类型都在这里定义，从 Zod Schema 推导而来
 */

import { z } from "zod";
import {
  // Endpoint schemas
  EndpointTypeSchema,
  AccessControlSchema,
  EndpointConfigSchema,
  StaticConfigSchema,
  ProxyConfigSchema,
  DynamicProxyConfigSchema,
  ScriptConfigSchema,
  EndpointSchema,
  CreateEndpointSchema,
  UpdateEndpointSchema,
} from "../validators/endpoint.schema";
import {
  // Permission Group schemas
  PermissionGroupSchema,
  CreatePermissionGroupSchema,
  UpdatePermissionGroupSchema,
  // Access Key schemas
  AccessKeySchema,
  AccessKeyWithPlainSchema,
  CreateAccessKeySchema,
  UpdateAccessKeySchema,
} from "../validators/permission.schema";
import { UserInfoSchema } from "../validators/auth.schema";

// ==================== 基础类型 ====================

/** 端点类型 */
export type EndpointType = z.infer<typeof EndpointTypeSchema>;

/** 访问控制类型 */
export type AccessControl = z.infer<typeof AccessControlSchema>;

/** 端点配置类型（联合类型） */
export type EndpointConfig = z.infer<typeof EndpointConfigSchema>;

/** 静态端点配置 */
export type StaticConfig = z.infer<typeof StaticConfigSchema>;

/** 代理端点配置 */
export type ProxyConfig = z.infer<typeof ProxyConfigSchema>;

/** 动态代理端点配置 */
export type DynamicProxyConfig = z.infer<typeof DynamicProxyConfigSchema>;

/** 脚本端点配置 */
export type ScriptConfig = z.infer<typeof ScriptConfigSchema>;

// ==================== 实体类型 (从 Schema 推导) ====================

/** 用户信息 */
export type User = z.infer<typeof UserInfoSchema>;

/** 端点实体 */
export type Endpoint = z.infer<typeof EndpointSchema>;

/** 权限组实体 */
export type PermissionGroup = z.infer<typeof PermissionGroupSchema>;

/** 访问密钥实体 */
export type AccessKey = z.infer<typeof AccessKeySchema>;

/** 访问密钥（包含明文密钥，仅在创建时返回） */
export type AccessKeyWithPlain = z.infer<typeof AccessKeyWithPlainSchema>;

// ==================== 输入类型 (用于创建/更新) ====================

/** 创建端点输入 */
export type CreateEndpointInput = z.infer<typeof CreateEndpointSchema>;

/** 更新端点输入 */
export type UpdateEndpointInput = z.infer<typeof UpdateEndpointSchema>;

/** 创建权限组输入 */
export type CreatePermissionGroupInput = z.infer<typeof CreatePermissionGroupSchema>;

/** 更新权限组输入 */
export type UpdatePermissionGroupInput = z.infer<typeof UpdatePermissionGroupSchema>;

/** 创建访问密钥输入 */
export type CreateAccessKeyInput = z.infer<typeof CreateAccessKeySchema>;

/** 更新访问密钥输入 */
export type UpdateAccessKeyInput = z.infer<typeof UpdateAccessKeySchema>;

// ==================== 扩展类型 ====================

/** 端点树节点（包含子节点） */
export interface EndpointTreeNode extends Endpoint {
  children?: EndpointTreeNode[];
}

// ==================== API 响应类型 ====================

/** 标准 API 响应格式 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
}

/** 端点列表响应数据 */
export interface EndpointsListData {
  endpoints?: Endpoint[];
  tree?: EndpointTreeNode[];
  total: number;
}

/** 权限组列表响应数据 */
export interface PermissionGroupsListData {
  groups: PermissionGroup[];
  total: number;
}

/** 访问密钥列表响应数据 */
export interface AccessKeysListData {
  keys: AccessKey[];
  total: number;
}

/** 用户列表响应数据 */
export interface UsersListData {
  users: User[];
  total: number;
  page?: number;
  pageSize?: number;
}

// ==================== 常量导出 ====================

/** 端点类型常量 */
export const ENDPOINT_TYPES = ["static", "proxy", "dynamicProxy", "script"] as const;

/** 访问控制级别常量 */
export const ACCESS_CONTROLS = ["public", "authenticated"] as const;
