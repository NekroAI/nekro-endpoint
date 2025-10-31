import { z } from "@hono/zod-openapi";

export const ErrorSchema = z.object({
  code: z.number().openapi({ example: 404 }),
  message: z.string().openapi({ example: "User not found" }),
});

export const GitHubCallbackSchema = z.object({
  code: z.string(),
  state: z.string().optional(),
});

export const UserInfoSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  apiKey: z.string(),
  createdAt: z.string(),
});

export const AuthResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z
    .object({
      user: UserInfoSchema,
      sessionToken: z.string(),
    })
    .optional(),
});

export const RegenerateApiKeyResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z
    .object({
      apiKey: z.string(),
    })
    .optional(),
});
