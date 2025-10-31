import { z } from "@hono/zod-openapi";

export const FeatureSchema = z
  .object({
    id: z.number().openapi({
      example: 1,
    }),
    key: z.string().openapi({
      example: "dark-mode-toggle",
    }),
    name: z.string().openapi({
      example: "Dark Mode Toggle",
    }),
    description: z.string().openapi({
      example: "Enable or disable the dark mode toggle button in the UI.",
    }),
    enabled: z.boolean().openapi({
      example: true,
    }),
  })
  .openapi("Feature");

export const UpdateFeatureSchema = z.object({
  enabled: z.boolean(),
});

export const PathParamsSchema = z.object({
  key: z.string().openapi({
    param: {
      name: "key",
      in: "path",
    },
    example: "dark-mode-toggle",
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
