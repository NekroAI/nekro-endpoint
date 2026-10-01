# NekroEndpoint 项目结构说明

## 核心原则

**端到端类型安全**：利用 TypeScript 全栈的优势，所有前后端共享的类型、Schema、配置都统一在 `common/` 目录下管理。

## 目录结构

```
nekro-endpoint/
├── common/                      # 🎯 前后端共享代码（核心）
│   ├── types/                   # TypeScript 类型定义
│   │   └── index.ts             # 从 Zod Schema 推导的类型
│   ├── validators/              # Zod Schema 定义
│   │   ├── endpoint.schema.ts   # 端点相关 Schema
│   │   ├── permission.schema.ts # 权限组和访问密钥 Schema
│   │   ├── auth.schema.ts       # 认证相关 Schema
│   │   └── admin.schema.ts      # 管理员相关 Schema
│   └── config/                  # 共享配置
│       └── api.ts               # API 基础配置
│
├── src/                         # 后端代码 (Hono + D1)
│   ├── db/                      # 数据库
│   │   └── schema.ts            # Drizzle ORM Schema
│   ├── routes/                  # API 路由
│   │   ├── endpoints.ts         # 端点管理 API
│   │   ├── permission-groups.ts # 权限组 API
│   │   ├── access-keys.ts       # 访问密钥 API
│   │   ├── auth.ts              # 认证 API
│   │   ├── admin.ts             # 管理员 API
│   │   └── execution.ts         # 端点执行层 (/e/*)
│   ├── middleware/              # 中间件
│   │   ├── auth.ts              # 认证中间件
│   │   ├── activation.ts        # 激活检查中间件
│   │   └── admin.ts             # 管理员权限中间件
│   ├── utils/                   # 工具函数
│   │   ├── encryption.ts        # 加密工具
│   │   ├── pathTree.ts          # 路径树构建
│   │   └── tree.ts              # 树结构工具
│   └── index.ts                 # 应用入口
│
├── frontend/                    # 前端代码 (React + Tailwind v4 + Radix，见 docs/REDESIGN.md)
│   └── src/
│       ├── app/                 # 工作区外壳、命令面板、AuthGate、Page
│       ├── design/              # 设计令牌、类型字形、品牌、Monaco 主题、动效预设
│       ├── ui/                  # Radix 原语
│       ├── lib/                 # api 请求层、格式化、快捷键
│       ├── features/            # endpoints / share / access / overview / settings / admin / site
│       ├── hooks/useAuth.ts     # 认证状态
│       ├── context/             # 主题偏好
│       └── utils/               # storage、endpointShare
│
├── test/contract/               # /api/* 与 /e/* 契约测试（workerd + D1）
│
└── docs/                        # 文档
    ├── PROJECT_STRUCTURE.md     # 项目结构说明（本文档）
    ├── API_GUIDE.md             # API 开发指南
    ├── ARCHITECTURE.md          # 架构设计文档
    └── ...
```

## 类型系统架构

### 1. Schema 定义 (`common/validators/`)

使用 Zod 定义所有数据结构的 Schema，包括：

- 实体 Schema (如 `EndpointSchema`)
- 输入 Schema (如 `CreateEndpointSchema`)
- 响应 Schema (如 `EndpointListResponseSchema`)

### 2. 类型推导 (`common/types/`)

从 Zod Schema 自动推导 TypeScript 类型：

```typescript
import { z } from "zod";
import { EndpointSchema } from "../validators/endpoint.schema";

// 自动推导类型
export type Endpoint = z.infer<typeof EndpointSchema>;
```

### 3. 前后端使用

**后端 (src/routes/)**:

```typescript
import { EndpointSchema } from "../../common/validators/endpoint.schema";
import type { Endpoint } from "../../common/types";

// 使用 Schema 进行验证和生成 OpenAPI 文档
const route = createRoute({
  responses: {
    200: {
      content: {
        "application/json": { schema: EndpointSchema },
      },
    },
  },
});
```

**前端 (frontend/src/hooks/)**:

```typescript
import type { Endpoint, CreateEndpointInput } from "../../../common/types";

// 使用类型进行类型安全的 API 调用
export function useCreateEndpoint() {
  return useMutation({
    mutationFn: async (data: CreateEndpointInput) => {
      // ...
      return response.json() as Promise<ApiResponse<{ endpoint: Endpoint }>>;
    },
  });
}
```

## 数据流示意图

```
┌─────────────────────────────────────────────────┐
│           common/validators/                    │
│  ┌──────────────────────────────────────────┐   │
│  │   Zod Schema (单一数据源)                │   │
│  │   - EndpointSchema                       │   │
│  │   - CreateEndpointSchema                 │   │
│  └──────────────────┬───────────────────────┘   │
│                     │                            │
│                     ▼                            │
│           common/types/                          │
│  ┌──────────────────────────────────────────┐   │
│  │   TypeScript Types (自动推导)            │   │
│  │   type Endpoint = z.infer<...>          │   │
│  │   type CreateEndpointInput = z.infer<...> │ │
│  └──┬──────────────────────────────────┬────┘   │
└─────┼──────────────────────────────────┼────────┘
      │                                  │
      ▼                                  ▼
┌─────────────────┐              ┌──────────────────┐
│   后端 (src/)   │              │ 前端 (frontend/) │
│                 │              │                  │
│ • 使用 Schema   │              │ • 使用 Types     │
│   进行验证      │              │   进行类型检查   │
│ • 生成 OpenAPI  │              │ • React Query    │
│   文档          │              │   hooks          │
└─────────────────┘              └──────────────────┘
```

## API 响应格式规范

### 标准响应格式

所有 API 响应遵循统一格式：

```typescript
interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
}
```

### 列表响应示例

**端点列表**:

```json
{
  "success": true,
  "data": {
    "tree": [...],
    "total": 10
  }
}
```

**权限组列表**:

```json
{
  "success": true,
  "data": {
    "groups": [...],
    "total": 5
  }
}
```

## 开发规范

### 添加新功能时

1. **定义 Schema** (`common/validators/`):

   ```typescript
   export const NewFeatureSchema = z.object({
     id: z.string(),
     name: z.string(),
     // ...
   });
   ```

2. **推导类型** (`common/types/index.ts`):

   ```typescript
   export type NewFeature = z.infer<typeof NewFeatureSchema>;
   ```

3. **后端实现** (`src/routes/`):

   ```typescript
   import { NewFeatureSchema } from "../../common/validators/...";
   import type { NewFeature } from "../../common/types";
   ```

4. **前端 hooks** (`frontend/src/hooks/`):
   ```typescript
   import type { NewFeature } from "../../../common/types";
   ```

### 禁止的做法 ❌

1. ❌ 在前端 hooks 中重复定义类型接口
2. ❌ 前后端使用不同的类型定义
3. ❌ 硬编码 API 基础路径
4. ❌ 不统一的 API 响应格式

### 推荐的做法 ✅

1. ✅ 所有类型从 `common/types` 导入
2. ✅ 所有 Schema 从 `common/validators` 导入
3. ✅ 使用 `getApiBase()` 获取 API 基础路径
4. ✅ 遵循统一的 API 响应格式

## 好处

1. **类型安全**：从数据库到前端的端到端类型检查
2. **自动文档**：从 Schema 自动生成 OpenAPI 文档
3. **代码复用**：避免重复定义类型和验证逻辑
4. **易于维护**：修改一处，前后端同步更新
5. **减少错误**：编译时就能发现类型不匹配的问题

## 常见问题

### Q: 为什么要用 Zod？

A: Zod 可以同时用于运行时验证和类型推导，避免了类型定义和验证逻辑分离的问题。

### Q: 如何确保前后端类型同步？

A: 通过从同一个 Zod Schema 推导类型，前后端自动使用相同的类型定义。

### Q: 为什么 API 响应要统一格式？

A: 统一的响应格式使得前端处理更加一致，错误处理更加简单，也更容易编写通用的响应处理逻辑。

## 相关文档

- [API 开发指南](./API_GUIDE.md) - 如何添加新的 API
- [架构设计文档](./ARCHITECTURE.md) - 整体架构说明
- [开发指南](./DEVELOPMENT.md) - 日常开发流程
