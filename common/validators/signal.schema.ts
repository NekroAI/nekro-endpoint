import { z } from "@hono/zod-openapi";

// Signal Line 模型配置（新增接口，docs/REDESIGN.md §5.6）
export const AiProviderSchema = z.enum(["openai", "anthropic", "openai-compatible"]);

export const AiConfigInputSchema = z
  .object({
    provider: AiProviderSchema,
    model: z.string().min(1).max(200),
    baseUrl: z.string().url().optional().nullable(),
    apiKey: z.string().min(1).max(500).optional().describe("留空表示沿用已保存的 Key"),
  })
  .refine((value) => value.provider !== "openai-compatible" || Boolean(value.baseUrl), {
    message: "OpenAI 兼容服务需要填写 Base URL",
    path: ["baseUrl"],
  });

export const AiConfigViewSchema = z.object({
  provider: AiProviderSchema,
  model: z.string(),
  baseUrl: z.string().nullable(),
  keyHint: z.string().nullable(),
  updatedAt: z.string(),
});

export const AiConfigStateSchema = z.object({
  success: z.boolean(),
  data: z.object({
    available: z.boolean().openapi({ description: "服务端是否配置了 AI_CONFIG_SECRET" }),
    active: z.enum(["user", "platform"]).nullable(),
    user: AiConfigViewSchema.nullable(),
    platform: AiConfigViewSchema.nullable(),
  }),
});

export const AiConfigTestResultSchema = z.object({
  success: z.boolean(),
  data: z.object({
    ok: z.boolean(),
    toolCalling: z.boolean(),
    latencyMs: z.number(),
    message: z.string(),
  }),
});
