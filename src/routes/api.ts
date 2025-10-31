import { OpenAPIHono } from "@hono/zod-openapi";
import * as drizzleSchema from "../db/schema";
import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1";

import features from "./feature";
import auth from "./auth";
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
  .route("/auth", auth);

export type ApiRoutes = typeof api;

export default api;
