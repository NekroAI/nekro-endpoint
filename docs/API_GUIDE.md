# 🔌 API 开发指南

本指南介绍如何在 NekroEdge 模板中创建和管理后端 API。

## 🏗️ API 架构概览

NekroEdge 使用 **Hono** 作为后端框架，结合 **Zod** 进行数据验证，**Drizzle ORM** 进行数据库操作。

### 核心特性

- 🔒 **类型安全**: 端到端 TypeScript 类型检查
- 📖 **自动文档**: 基于 Zod Schema 自动生成 OpenAPI 文档
- ✅ **数据验证**: 请求和响应自动验证
- 🗄️ **ORM 集成**: Drizzle ORM 提供类型安全的数据库操作

## 📁 API 项目结构

```
src/
├── db/
│   └── schema.ts         # 数据库表定义
├── routes/
│   └── post.ts          # API 路由实现
├── validators/
│   └── post.schema.ts   # 数据验证 Schema
└── index.ts             # 主入口，路由注册
```

## 🚀 创建新 API 的完整流程

### 1. 定义数据库表结构

```typescript
// src/db/schema.ts
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  createdAt: integer("created_at").notNull(),
});
```

### 2. 创建验证 Schema

```typescript
// src/validators/user.schema.ts
import { z } from "zod";

export const CreateUserSchema = z.object({
  name: z.string().min(1, "姓名不能为空"),
  email: z.string().email("邮箱格式不正确"),
});

export const UpdateUserSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
});

export const UserParamsSchema = z.object({
  id: z.string().transform((val) => parseInt(val)),
});
```

### 3. 实现 API 路由

```typescript
// src/routes/user.ts
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { users } from "../db/schema";
import { CreateUserSchema, UpdateUserSchema, UserParamsSchema } from "../validators/user.schema";

const app = new OpenAPIHono();

// 创建用户
const createUserRoute = createRoute({
  method: "post",
  path: "/users",
  request: {
    body: {
      content: {
        "application/json": {
          schema: CreateUserSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: "用户创建成功",
      content: {
        "application/json": {
          schema: z.object({
            id: z.number(),
            name: z.string(),
            email: z.string(),
            createdAt: z.number(),
          }),
        },
      },
    },
  },
  tags: ["用户管理"],
});

app.openapi(createUserRoute, async (c) => {
  const userData = c.req.valid("json");
  const db = c.env.DB;

  const result = await db
    .insert(users)
    .values({
      ...userData,
      createdAt: Date.now(),
    })
    .returning();

  return c.json(result[0], 201);
});

export default app;
```

### 4. 注册路由

```typescript
// src/index.ts
import userRoutes from "./routes/user";

// 在 apiApp 中注册路由
apiApp.route("/users", userRoutes);
```

### 5. 生成数据库迁移

```bash
# 生成迁移文件
pnpm db:generate

# 应用迁移
pnpm db:migrate
```

## 🛠️ 高级 API 开发技巧

### 分页查询

```typescript
// 分页 Schema
const PaginationSchema = z.object({
  page: z.string().transform((val) => Math.max(1, parseInt(val) || 1)),
  limit: z.string().transform((val) => Math.min(100, Math.max(1, parseInt(val) || 10))),
});

// 实现分页查询
app.openapi(getUsersRoute, async (c) => {
  const { page, limit } = c.req.valid("query");
  const offset = (page - 1) * limit;

  const users = await db.select().from(usersTable).limit(limit).offset(offset);

  const total = await db.select({ count: sql`count(*)` }).from(usersTable);

  return c.json({
    data: users,
    pagination: {
      page,
      limit,
      total: total[0].count,
      totalPages: Math.ceil(total[0].count / limit),
    },
  });
});
```

### 错误处理

```typescript
// 自定义错误处理中间件
app.use("*", async (c, next) => {
  try {
    await next();
  } catch (error) {
    if (error instanceof ZodError) {
      return c.json(
        {
          error: "数据验证失败",
          details: error.errors,
        },
        400,
      );
    }

    return c.json(
      {
        error: "服务器内部错误",
      },
      500,
    );
  }
});
```

### 认证中间件

```typescript
// JWT 认证中间件
const authMiddleware = async (c, next) => {
  const token = c.req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return c.json({ error: "未提供认证令牌" }, 401);
  }

  try {
    const payload = await verifyJWT(token);
    c.set("user", payload);
    await next();
  } catch {
    return c.json({ error: "无效的认证令牌" }, 401);
  }
};

// 在需要认证的路由中使用
app.use("/users/*", authMiddleware);
```

## 📖 API 文档

### 访问 Swagger UI

开发环境下访问：http://localhost:8787/api/doc

### 自定义文档信息

```typescript
// src/index.ts
apiApp.doc("/doc", {
  openapi: "3.0.0",
  info: {
    title: "NekroEdge API",
    version: "1.0.0",
    description: "全栈应用 API 文档",
  },
  tags: [
    { name: "用户管理", description: "用户相关操作" },
    { name: "内容管理", description: "内容相关操作" },
  ],
});
```

## 🗄️ 数据库操作最佳实践

### 查询优化

```typescript
// 使用 select 指定字段
const users = await db
  .select({
    id: usersTable.id,
    name: usersTable.name,
    email: usersTable.email,
  })
  .from(usersTable);

// 使用 with 进行条件查询
const activeUsers = await db.select().from(usersTable).where(eq(usersTable.active, true));
```

### 事务处理

```typescript
// 数据库事务
await db.transaction(async (tx) => {
  const user = await tx.insert(usersTable).values(userData).returning();
  await tx.insert(profilesTable).values({
    userId: user[0].id,
    ...profileData,
  });
});
```

## 🧪 API 测试

### 使用 curl 测试

```bash
# 创建用户
curl -X POST http://localhost:8787/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"张三","email":"zhangsan@example.com"}'

# 获取用户列表
curl http://localhost:8787/api/users?page=1&limit=10
```

### 集成测试示例

```typescript
// tests/api.test.ts
import { describe, it, expect } from "vitest";

describe("用户 API", () => {
  it("应该能够创建用户", async () => {
    const response = await fetch("http://localhost:8787/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "测试用户",
        email: "test@example.com",
      }),
    });

    expect(response.status).toBe(201);
    const user = await response.json();
    expect(user.name).toBe("测试用户");
  });
});
```

## 🔧 常见问题解决

### CORS 问题

```typescript
// 添加 CORS 中间件
import { cors } from "hono/cors";

app.use(
  "*",
  cors({
    origin: ["http://localhost:5173"],
    allowMethods: ["GET", "POST", "PUT", "DELETE"],
  }),
);
```

### 环境变量配置

```typescript
// 获取环境变量
app.get("/config", async (c) => {
  return c.json({
    nodeEnv: c.env.NODE_ENV,
    version: "1.0.0",
  });
});
```

## 🔐 认证 API 端点

### 可用的认证端点

| 端点                        | 方法 | 需要认证 | 描述                       |
| --------------------------- | ---- | -------- | -------------------------- |
| `/api/auth/github`          | GET  | ❌       | 获取 GitHub OAuth 登录 URL |
| `/api/auth/github/callback` | GET  | ❌       | 处理 GitHub OAuth 回调     |
| `/api/auth/me`              | GET  | ✅       | 获取当前用户信息           |
| `/api/auth/logout`          | POST | ✅       | 用户登出                   |
| `/api/auth/regenerate-key`  | POST | ✅       | 重新生成 API Key           |

### 获取登录 URL

```bash
curl http://localhost:8787/api/auth/github
```

**响应**:

```json
{
  "success": true,
  "message": "GitHub OAuth URL 生成成功",
  "data": {
    "authUrl": "https://github.com/login/oauth/authorize?client_id=...",
    "state": "..."
  }
}
```

### 获取当前用户信息

```bash
curl -H "Authorization: Bearer your_session_token" \
  http://localhost:8787/api/auth/me
```

**响应**:

```json
{
  "id": "cuid_user_id",
  "username": "github_username",
  "email": "user@example.com",
  "avatarUrl": "https://avatars.githubusercontent.com/...",
  "apiKey": "ak-...",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

### 重新生成 API Key

```bash
curl -X POST \
  -H "Authorization: Bearer your_session_token" \
  http://localhost:8787/api/auth/regenerate-key
```

**响应**:

```json
{
  "success": true,
  "message": "API Key 重新生成成功",
  "data": {
    "apiKey": "ak-new_api_key_here"
  }
}
```

### 创建受保护的 API 端点

要创建需要认证的 API 端点，使用 `authMiddleware`：

```typescript
// src/routes/protected.ts
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { authMiddleware } from "../middleware/auth";

const protectedRoutes = new OpenAPIHono();

// 应用认证中间件到所有路由
protectedRoutes.use("/*", authMiddleware);

const myProtectedRoute = createRoute({
  method: "get",
  path: "/protected-data",
  summary: "获取受保护的数据",
  security: [{ BearerAuth: [] }], // 在文档中标注需要认证
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            data: z.string(),
          }),
        },
      },
      description: "成功响应",
    },
    401: {
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
          }),
        },
      },
      description: "未授权",
    },
  },
});

protectedRoutes.openapi(myProtectedRoute, async (c) => {
  // 用户信息已由中间件注入到 context
  const user = c.get("user");

  return c.json({
    data: `Hello ${user.username}! Your API Key is ${user.apiKey}`,
  });
});

export default protectedRoutes;
```

详细的认证配置请参考 [认证配置指南](./AUTHENTICATION.md)。

## 💡 API 开发小贴士

- **Schema 优先**: 先定义 Zod Schema，再实现业务逻辑
- **一致性**: 保持响应格式的一致性
- **错误处理**: 提供清晰的错误信息和状态码
- **文档化**: 为每个 API 添加清晰的描述和示例
- **类型安全**: 充分利用 TypeScript 的类型检查
- **认证保护**: 敏感操作必须使用 authMiddleware 保护
