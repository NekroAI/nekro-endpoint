import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { eq } from "drizzle-orm";
import { users, userSessions } from "../db/schema";
import {
  AuthResponseSchema,
  GitHubCallbackSchema,
  ErrorSchema,
  UserInfoSchema,
  RegenerateApiKeyResponseSchema,
} from "../../common/validators/auth.schema";
import { generateUserApiKey } from "../utils/encryption";
import { createId } from "@paralleldrive/cuid2";
import type { Bindings } from "../types";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import * as drizzleSchema from "../db/schema";
import { and, gt } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";

type Variables = {
  db: DrizzleD1Database<typeof drizzleSchema>;
  user?: typeof users.$inferSelect;
};

// GitHub OAuth 登录 URL
const loginRoute = createRoute({
  method: "get",
  path: "/github",
  summary: "获取 GitHub OAuth 登录 URL",
  description: "返回 GitHub OAuth 授权 URL，用户可通过此 URL 进行登录",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
            data: z.object({
              authUrl: z.string(),
              state: z.string(),
            }),
          }),
        },
      },
      description: "成功返回登录 URL",
    },
    500: {
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
          }),
        },
      },
      description: "服务器错误",
    },
  },
});

// GitHub OAuth 回调处理
const callbackRoute = createRoute({
  method: "get",
  path: "/github/callback",
  summary: "GitHub OAuth 回调处理",
  description: "处理 GitHub OAuth 授权回调，完成用户登录或注册",
  request: {
    query: GitHubCallbackSchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: AuthResponseSchema,
        },
      },
      description: "登录成功",
    },
    400: {
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
          }),
        },
      },
      description: "登录失败",
    },
    500: {
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
          }),
        },
      },
      description: "服务器错误",
    },
  },
});

// 获取当前用户信息
const meRoute = createRoute({
  method: "get",
  path: "/me",
  summary: "获取当前用户信息",
  description: "获取当前登录用户的详细信息",
  security: [{ BearerAuth: [] }],
  responses: {
    200: {
      content: {
        "application/json": {
          schema: UserInfoSchema,
        },
      },
      description: "成功获取用户信息",
    },
    401: {
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
      description: "未授权",
    },
  },
});

// 登出
const logoutRoute = createRoute({
  method: "post",
  path: "/logout",
  summary: "用户登出",
  description: "清除用户会话，完成登出操作",
  security: [{ BearerAuth: [] }],
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
          }),
        },
      },
      description: "登出成功",
    },
  },
});

// 重新生成 API Key
const regenerateKeyRoute = createRoute({
  method: "post",
  path: "/regenerate-key",
  summary: "重新生成 API Key",
  description: "为当前用户重新生成 API Key，旧的 Key 将立即失效",
  security: [{ BearerAuth: [] }],
  responses: {
    200: {
      content: {
        "application/json": {
          schema: RegenerateApiKeyResponseSchema,
        },
      },
      description: "API Key 重新生成成功",
    },
    401: {
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
      description: "未授权",
    },
    500: {
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
          }),
        },
      },
      description: "服务器错误",
    },
  },
});

const auth = new OpenAPIHono<{ Bindings: Bindings; Variables: Variables }>();
const protectedRoutes = new OpenAPIHono<{ Bindings: Bindings; Variables: Variables }>();

protectedRoutes.use("/*", authMiddleware);

auth
  .openapi(loginRoute, async (c) => {
    const githubClientId = c.env.GITHUB_CLIENT_ID;
    const baseUrl = c.env.APP_BASE_URL;

    if (!githubClientId) {
      return c.json(
        {
          success: false,
          message: "GitHub OAuth 配置未设置",
        },
        500,
      );
    }

    const state = createId(); // 用于防止 CSRF 攻击
    const redirectUri = `${baseUrl}/auth/callback`;

    const githubAuthUrl = new URL("https://github.com/login/oauth/authorize");
    githubAuthUrl.searchParams.set("client_id", githubClientId);
    githubAuthUrl.searchParams.set("redirect_uri", redirectUri);
    githubAuthUrl.searchParams.set("scope", "user:email");
    githubAuthUrl.searchParams.set("state", state);

    return c.json({
      success: true,
      message: "GitHub OAuth URL 生成成功",
      data: {
        authUrl: githubAuthUrl.toString(),
        state,
      },
    });
  })
  .openapi(callbackRoute, async (c) => {
    const code = c.req.query("code")!;
    const state = c.req.query("state");
    const db = c.get("db");

    try {
      // 1. 使用 code 交换 access token
      const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: c.env.GITHUB_CLIENT_ID,
          client_secret: c.env.GITHUB_CLIENT_SECRET,
          code,
        }),
      });

      if (!tokenResponse.ok) {
        console.error("GitHub token request failed:", tokenResponse.status, tokenResponse.statusText);
        return c.json(
          {
            success: false,
            message: "获取 GitHub 访问令牌失败",
          },
          400,
        );
      }

      const tokenData = (await tokenResponse.json()) as {
        access_token?: string;
        token_type?: string;
        scope?: string;
        error?: string;
        error_description?: string;
      };
      console.log("GitHub token response:", tokenData);

      if (!tokenData.access_token) {
        console.error("GitHub token data invalid:", tokenData);
        return c.json(
          {
            success: false,
            message: "获取 GitHub 访问令牌失败",
          },
          400,
        );
      }

      // 2. 使用 access token 获取用户信息
      const userResponse = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `token ${tokenData.access_token}`,
          "User-Agent": "nekro-edge-template",
          Accept: "application/vnd.github.v3+json",
        },
      });

      if (!userResponse.ok) {
        console.error("GitHub user request failed:", userResponse.status, userResponse.statusText);
        const errorText = await userResponse.text();
        console.error("GitHub user error response:", errorText);
        return c.json(
          {
            success: false,
            message: "获取 GitHub 用户信息失败",
          },
          400,
        );
      }

      const githubUser = (await userResponse.json()) as {
        id?: number;
        login?: string;
        email?: string;
        avatar_url?: string;
        name?: string;
      };

      if (!githubUser.id) {
        return c.json(
          {
            success: false,
            message: "获取 GitHub 用户信息失败",
          },
          400,
        );
      }

      // 3. 检查用户是否已存在
      let existingUser = await db.select().from(users).where(eq(users.githubId, githubUser.id.toString())).get();

      let user: typeof users.$inferSelect;

      if (existingUser) {
        // 更新现有用户信息
        user = (
          await db
            .update(users)
            .set({
              username: githubUser.login!,
              email: githubUser.email || null,
              avatarUrl: githubUser.avatar_url || null,
              updatedAt: new Date(),
            })
            .where(eq(users.id, existingUser.id))
            .returning()
        )[0];
      } else {
        // 创建新用户
        user = (
          await db
            .insert(users)
            .values({
              githubId: githubUser.id!.toString(),
              username: githubUser.login!,
              email: githubUser.email || null,
              avatarUrl: githubUser.avatar_url || null,
              apiKey: generateUserApiKey(),
            })
            .returning()
        )[0];
      }

      // 4. 创建会话
      const sessionToken = createId();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30天过期

      await db.insert(userSessions).values({
        userId: user.id,
        sessionToken,
        expiresAt,
      });

      console.log(`[Auth Callback] Session created for user ${user.id} with token ${sessionToken}`);

      return c.json(
        {
          success: true,
          message: "登录成功",
          data: {
            user: {
              id: user.id,
              username: user.username,
              email: user.email,
              avatarUrl: user.avatarUrl,
              apiKey: user.apiKey,
              createdAt: user.createdAt.toISOString(),
            },
            sessionToken,
          },
        },
        200,
      );
    } catch (error) {
      console.error("GitHub OAuth 登录失败:", error);
      return c.json(
        {
          success: false,
          message: "登录过程中发生错误",
        },
        500,
      );
    }
  });

protectedRoutes
  .openapi(meRoute, async (c) => {
    const authHeader = c.req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return c.json({ code: 401, message: "认证令牌缺失" }, 401);
    }

    const sessionToken = authHeader.substring(7);
    console.log(`[Auth Me] Checking token: ${sessionToken}`);
    const db = c.get("db");

    const session = await db
      .select()
      .from(userSessions)
      .where(and(eq(userSessions.sessionToken, sessionToken), gt(userSessions.expiresAt, new Date())))
      .get();

    console.log(`[Auth Me] Session found in DB:`, session);

    if (!session) {
      return c.json({ code: 401, message: "认证令牌无效或已过期" }, 401);
    }

    const user = await db.select().from(users).where(eq(users.id, session.userId)).get();

    if (!user) {
      return c.json(
        {
          code: 401,
          message: "用户未登录",
        },
        401,
      );
    }

    const result = UserInfoSchema.parse({
      id: user.id,
      username: user.username,
      email: user.email,
      avatarUrl: user.avatarUrl,
      apiKey: user.apiKey,
      createdAt: user.createdAt.toISOString(),
    });

    return c.json(result, 200);
  })
  .openapi(logoutRoute, async (c) => {
    const sessionToken = c.req.header("Authorization")?.replace("Bearer ", "");

    if (sessionToken) {
      const db = c.get("db");
      await db.delete(userSessions).where(eq(userSessions.sessionToken, sessionToken));
    }

    return c.json({
      success: true,
      message: "登出成功",
    });
  })
  .openapi(regenerateKeyRoute, async (c) => {
    const user = c.get("user");

    // 类型守卫：确保用户已认证
    if (!user) {
      return c.json(
        {
          success: false,
          message: "用户未认证",
        },
        500,
      );
    }

    const db = c.get("db");

    try {
      // 生成新的 API Key
      const newApiKey = generateUserApiKey();

      // 更新用户的 API Key
      const updatedUser = (
        await db
          .update(users)
          .set({
            apiKey: newApiKey,
            updatedAt: new Date(),
          })
          .where(eq(users.id, user.id))
          .returning()
      )[0];

      if (!updatedUser) {
        return c.json(
          {
            success: false,
            message: "更新用户信息失败",
          },
          500,
        );
      }

      console.log(`[Auth Regenerate Key] New API Key generated for user ${user.id}`);

      return c.json(
        {
          success: true,
          message: "API Key 重新生成成功",
          data: {
            apiKey: updatedUser.apiKey,
          },
        },
        200,
      );
    } catch (error) {
      console.error("API Key 重新生成失败:", error);
      return c.json(
        {
          success: false,
          message: "API Key 重新生成过程中发生错误",
        },
        500,
      );
    }
  });

const app = new OpenAPIHono().route("/", auth).route("/", protectedRoutes);

export default app;
