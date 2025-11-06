import { OpenAPIHono } from "@hono/zod-openapi";
import * as drizzleSchema from "../db/schema";
import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1";

import features from "./feature";
import auth from "./auth";
import endpoints from "./endpoints";
import permissionGroups from "./permission-groups";
import accessKeys from "./access-keys";
import admin from "./admin";
import init from "./init";
import { Bindings } from "../types";

type Variables = {
  db: DrizzleD1Database<typeof drizzleSchema>;
};

const api = new OpenAPIHono<{ Bindings: Bindings; Variables: Variables }>()
  // Add DB middleware to all API routes
  .use("*", async (c, next) => {
    const db = drizzle(c.env.DB, { schema: drizzleSchema });
    c.set("db", db);
    await next();
  })
  // Register API routes using chaining
  .route("/features", features)
  .route("/auth", auth)
  .route("/init", init) // 初始化路由（不需要认证）
  .route("/", endpoints)
  .route("/", permissionGroups)
  .route("/", accessKeys)
  .route("/", admin);

export type ApiRoutes = typeof api;

export default api;
