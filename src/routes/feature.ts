import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { ErrorSchema, FeatureSchema, PathParamsSchema, UpdateFeatureSchema } from "../validators/feature.schema";
import { eq } from "drizzle-orm";
import { DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "../db/schema";
import { features } from "../db/schema";

const GetAllFeaturesRoute = createRoute({
  method: "get",
  path: "/",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.array(FeatureSchema),
        },
      },
      description: "Retrieve all features",
    },
  },
});

const UpdateFeatureRoute = createRoute({
  method: "patch",
  path: "/{key}",
  request: {
    params: PathParamsSchema,
    body: {
      content: {
        "application/json": {
          schema: UpdateFeatureSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: FeatureSchema,
        },
      },
      description: "Returns the updated feature",
    },
    404: {
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
      description: "Feature not found",
    },
  },
});

const app = new OpenAPIHono<{
  Variables: {
    db: DrizzleD1Database<typeof schema>;
  };
}>()
  .openapi(GetAllFeaturesRoute, async (c) => {
    const db = c.get("db");
    const allFeatures = await db.select().from(features).orderBy(features.id);
    return c.json(allFeatures);
  })
  .openapi(UpdateFeatureRoute, async (c) => {
    const db = c.get("db");
    const { key } = c.req.valid("param");
    const { enabled } = c.req.valid("json");

    const [updatedFeature] = await db.update(features).set({ enabled }).where(eq(features.key, key)).returning();

    if (!updatedFeature) {
      return c.json(
        {
          code: 404,
          message: "Feature not found",
        },
        404,
      );
    }

    const result = FeatureSchema.parse(updatedFeature);
    return c.json(result, 200);
  });

export type ApiRoutes = typeof app;

export default app;
