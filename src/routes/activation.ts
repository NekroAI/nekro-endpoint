import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { desc, eq } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import {
  AdminActivationListSchema,
  CreateActivationRequestSchema,
  MyActivationResponseSchema,
  ReviewActivationRequestSchema,
} from "../../common/validators/activation.schema";
import * as drizzleSchema from "../db/schema";
import { activationRequests, users } from "../db/schema";
import { adminMiddleware } from "../middleware/admin";
import { authMiddleware } from "../middleware/auth";
import type { Bindings } from "../types";

type Variables = {
  db: DrizzleD1Database<typeof drizzleSchema>;
  user: typeof drizzleSchema.users.$inferSelect;
};

/**
 * Activation requests (additive, docs/REDESIGN.md): an unactivated user asks
 * an administrator for publishing rights. Activating a user through the
 * existing /admin/users/{id}/activate route also resolves their request,
 * because a pending request of an activated user is reported as approved.
 */
const app = new OpenAPIHono<{ Bindings: Bindings; Variables: Variables }>();

app.use("/activation-request", authMiddleware);
app.use("/admin/activation-requests", authMiddleware, adminMiddleware);
app.use("/admin/activation-requests/*", authMiddleware, adminMiddleware);

type Row = typeof activationRequests.$inferSelect;
const iso = (value: Date | null) => (value ? value.toISOString() : null);
const view = (row: Row, activated: boolean) => ({
  id: row.id,
  message: row.message,
  status: (row.status === "pending" && activated ? "approved" : row.status) as "pending" | "approved" | "rejected",
  reviewNote: row.reviewNote,
  reviewedAt: iso(row.reviewedAt),
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});
const failure = z.object({ success: z.boolean(), message: z.string() });

const myRoute = createRoute({
  method: "get",
  path: "/activation-request",
  tags: ["Activation"],
  summary: "我的激活申请",
  security: [{ Bearer: [] }],
  responses: { 200: { content: { "application/json": { schema: MyActivationResponseSchema } }, description: "当前状态" } },
});

app.openapi(myRoute, async (c) => {
  const user = c.get("user");
  const row = await c.get("db").query.activationRequests.findFirst({ where: eq(activationRequests.userId, user.id) });
  return c.json({ success: true, data: { activated: user.isActivated, request: row ? view(row, user.isActivated) : null } }, 200);
});

const submitRoute = createRoute({
  method: "post",
  path: "/activation-request",
  tags: ["Activation"],
  summary: "提交或更新激活申请",
  security: [{ Bearer: [] }],
  request: { body: { content: { "application/json": { schema: CreateActivationRequestSchema } } } },
  responses: {
    200: { content: { "application/json": { schema: MyActivationResponseSchema } }, description: "申请已提交" },
    400: { content: { "application/json": { schema: failure } }, description: "账号已激活" },
  },
});

app.openapi(submitRoute, async (c) => {
  const user = c.get("user");
  const db = c.get("db");
  if (user.isActivated) return c.json({ success: false, message: "账号已激活，无需申请" }, 400);
  const message = c.req.valid("json").message?.trim() || null;
  const now = new Date();
  const existing = await db.query.activationRequests.findFirst({ where: eq(activationRequests.userId, user.id) });
  if (existing) {
    await db
      .update(activationRequests)
      .set({ message, status: "pending", reviewNote: null, reviewedBy: null, reviewedAt: null, updatedAt: now })
      .where(eq(activationRequests.id, existing.id));
  } else {
    await db.insert(activationRequests).values({ userId: user.id, message, status: "pending" });
  }
  const row = await db.query.activationRequests.findFirst({ where: eq(activationRequests.userId, user.id) });
  return c.json({ success: true, data: { activated: false, request: view(row!, false) } }, 200);
});

const listRoute = createRoute({
  method: "get",
  path: "/admin/activation-requests",
  tags: ["Activation"],
  summary: "激活申请列表（管理员）",
  security: [{ Bearer: [] }],
  responses: { 200: { content: { "application/json": { schema: AdminActivationListSchema } }, description: "按更新时间倒序" } },
});

app.openapi(listRoute, async (c) => {
  const rows = await c
    .get("db")
    .select({ request: activationRequests, user: users })
    .from(activationRequests)
    .innerJoin(users, eq(activationRequests.userId, users.id))
    .orderBy(desc(activationRequests.updatedAt))
    .limit(200);
  const requests = rows.map(({ request, user }) => ({
    ...view(request, user.isActivated),
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt.toISOString(),
    },
  }));
  return c.json(
    { success: true, data: { requests, pending: requests.filter((request) => request.status === "pending").length } },
    200,
  );
});

const reviewRoute = (action: "approve" | "reject") =>
  createRoute({
    method: "post",
    path: `/admin/activation-requests/{id}/${action}`,
    tags: ["Activation"],
    summary: action === "approve" ? "批准并激活用户（管理员）" : "拒绝激活申请（管理员）",
    security: [{ Bearer: [] }],
    request: {
      params: z.object({ id: z.string() }),
      body: { content: { "application/json": { schema: ReviewActivationRequestSchema } }, required: false },
    },
    responses: {
      200: { content: { "application/json": { schema: failure } }, description: "已处理" },
      404: { content: { "application/json": { schema: failure } }, description: "申请不存在" },
    },
  });

for (const action of ["approve", "reject"] as const) {
  app.openapi(reviewRoute(action), async (c) => {
    const db = c.get("db");
    const reviewer = c.get("user");
    const { id } = c.req.valid("param");
    const body = (await c.req.json().catch(() => ({}))) as { note?: unknown };
    const note = typeof body.note === "string" ? body.note.trim().slice(0, 500) || null : null;
    const row = await db.query.activationRequests.findFirst({ where: eq(activationRequests.id, id) });
    if (!row) return c.json({ success: false, message: "申请不存在" }, 404);
    const now = new Date();
    await db
      .update(activationRequests)
      .set({ status: action === "approve" ? "approved" : "rejected", reviewNote: note, reviewedBy: reviewer.id, reviewedAt: now, updatedAt: now })
      .where(eq(activationRequests.id, id));
    if (action === "approve") {
      await db.update(users).set({ isActivated: true, updatedAt: now }).where(eq(users.id, row.userId));
    }
    return c.json({ success: true, message: action === "approve" ? "已批准并激活该用户" : "已拒绝该申请" }, 200);
  });
}

export default app;
