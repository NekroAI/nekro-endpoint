import { sqliteTable, text, integer, unique, index } from "drizzle-orm/sqlite-core";
import { createId } from "@paralleldrive/cuid2";
import { sql } from "drizzle-orm";

export const features = sqliteTable(
  "features",
  {
    id: integer("id").primaryKey(),
    key: text("key").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(false),
  },
  (table) => ({
    keyIdx: unique("features_key_idx").on(table.key),
  }),
);

// 用户表
export const users = sqliteTable(
  "users",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    githubId: text("github_id").notNull().unique(),
    username: text("username").notNull(),
    email: text("email"),
    avatarUrl: text("avatar_url"),
    apiKey: text("api_key")
      .notNull()
      .unique()
      .$defaultFn(() => `ak-${createId()}`),
    role: text("role").notNull().default("user"), // user | admin
    isActivated: integer("is_activated", { mode: "boolean" }).notNull().default(false),
    platformApiKey: text("platform_api_key"), // 哈希存储
    platformApiKeyCreatedAt: integer("platform_api_key_created_at", { mode: "timestamp" }),
    lastLoginAt: integer("last_login_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(strftime('%s', 'now'))`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(strftime('%s', 'now'))`),
  },
  (table) => [
    index("users_github_id_idx").on(table.githubId),
    index("users_api_key_idx").on(table.apiKey),
    index("users_platform_api_key_idx").on(table.platformApiKey),
  ],
);

// 用户会话表
export const userSessions = sqliteTable(
  "user_sessions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sessionToken: text("session_token").notNull().unique(),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("user_sessions_session_token_idx").on(table.sessionToken),
    index("user_sessions_user_id_idx").on(table.userId),
  ],
);

// 端点表（支持树形结构）
export const endpoints = sqliteTable(
  "endpoints",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    ownerUserId: text("owner_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    parentId: text("parent_id"), // 树形结构：父节点ID
    path: text("path").notNull(), // 端点路径
    name: text("name").notNull(), // 端点名称
    type: text("type").notNull(), // static | proxy | dynamicProxy | script
    config: text("config").notNull(), // JSON 配置
    accessControl: text("access_control").notNull().default("public"), // public | authenticated
    requiredPermissionGroups: text("required_permission_groups"), // JSON array of group IDs
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
    isPublished: integer("is_published", { mode: "boolean" }).notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("endpoint_owner_idx").on(table.ownerUserId),
    index("endpoint_parent_idx").on(table.parentId),
    unique("endpoint_owner_path_idx").on(table.ownerUserId, table.path),
  ],
);

// 权限组表
export const permissionGroups = sqliteTable(
  "permission_groups",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    ownerUserId: text("owner_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [index("perm_group_owner_idx").on(table.ownerUserId)],
);

// 访问密钥表
export const accessKeys = sqliteTable(
  "access_keys",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    permissionGroupId: text("permission_group_id")
      .notNull()
      .references(() => permissionGroups.id, { onDelete: "cascade" }),
    keyValue: text("key_value").notNull().unique(), // 明文密钥（仅用于端点访问验证，非系统级密钥）
    description: text("description"),
    expiresAt: integer("expires_at", { mode: "timestamp" }),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    lastUsedAt: integer("last_used_at", { mode: "timestamp" }),
    usageCount: integer("usage_count").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [index("access_key_group_idx").on(table.permissionGroupId)],
);
