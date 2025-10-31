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
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(strftime('%s', 'now'))`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(strftime('%s', 'now'))`),
  },
  (table) => [index("users_github_id_idx").on(table.githubId), index("users_api_key_idx").on(table.apiKey)],
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
