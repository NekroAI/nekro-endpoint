import { z } from "@hono/zod-openapi";

export const PostSchema = z
  .object({
    id: z.number().openapi({
      example: 1,
    }),
    title: z.string().openapi({
      example: "My First Post",
    }),
    content: z.string().openapi({
      example: "This is the content of my first post.",
    }),
  })
  .openapi("Post");

export const CreatePostSchema = z.object({
  title: z.string().max(50),
  content: z.string().max(1000),
});

export const PathParamsSchema = z.object({
  id: z
    .string()
    .regex(/^\d+$/)
    .openapi({
      param: {
        name: "id",
        in: "path",
      },
      example: "123",
    }),
});

export const ErrorSchema = z.object({
  code: z.number().openapi({
    example: 400,
  }),
  message: z.string().openapi({
    example: "Bad Request",
  }),
});
