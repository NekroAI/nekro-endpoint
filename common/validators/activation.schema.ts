import { z } from "@hono/zod-openapi";

// 激活申请（新增接口）
export const ActivationStatusSchema = z.enum(["pending", "approved", "rejected"]);

export const ActivationRequestSchema = z.object({
  id: z.string(),
  message: z.string().nullable(),
  status: ActivationStatusSchema,
  reviewNote: z.string().nullable(),
  reviewedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const CreateActivationRequestSchema = z.object({
  message: z.string().max(500).optional().describe("想用来做什么，帮助管理员判断"),
});

export const ReviewActivationRequestSchema = z.object({
  note: z.string().max(500).optional().describe("给申请人的说明（拒绝时建议填写）"),
});

export const MyActivationResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    activated: z.boolean(),
    request: ActivationRequestSchema.nullable(),
  }),
});

export const AdminActivationListSchema = z.object({
  success: z.boolean(),
  data: z.object({
    requests: z.array(
      ActivationRequestSchema.extend({
        user: z.object({
          id: z.string(),
          username: z.string(),
          email: z.string().nullable(),
          avatarUrl: z.string().nullable(),
          createdAt: z.string(),
        }),
      }),
    ),
    pending: z.number().int(),
  }),
});
