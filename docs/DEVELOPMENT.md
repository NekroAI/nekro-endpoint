# ⚙️ 开发指南

本指南涵盖 NekroEdge 模板的日常开发工作流、最佳实践和高级配置。

## 🚀 开发工作流

### 日常开发流程

```bash
# 1. 启动开发环境
pnpm dev

# 2. 在新终端中进行数据库操作 (如需要)
pnpm db:generate  # 生成迁移文件
pnpm db:migrate   # 应用迁移
pnpm db:studio    # 查看数据库

# 3. 开发完成后检查代码质量
pnpm type-check   # 类型检查
pnpm format       # 代码格式化

# 4. 构建测试
pnpm build        # 生产构建
pnpm preview      # 预览构建结果
```

### 开发环境说明

| 地址                              | 用途     | 热重载 | 适用场景                     |
| --------------------------------- | -------- | ------ | ---------------------------- |
| **http://localhost:5173**         | 前端开发 | ✅     | 日常开发、样式调试、组件开发 |
| **http://localhost:8787**         | 完整应用 | ❌     | API 测试、SSR 验证、集成测试 |
| **http://localhost:8787/api/doc** | API 文档 | ❌     | API 文档查看、接口测试       |

> 💡 **开发建议**: 日常开发使用 5173 端口，需要测试完整功能时使用 8787 端口

## 📁 项目结构详解

```
your-project/
├── 📁 frontend/              # 前端应用
│   ├── 📁 src/
│   │   ├── 📁 components/    # 可复用组件
│   │   │   ├── Header.tsx    # 网站头部
│   │   │   ├── Footer.tsx    # 网站底部
│   │   │   └── Navbar.tsx    # 导航栏
│   │   ├── 📁 context/       # React Context
│   │   │   └── ThemeContextProvider.tsx  # 主题状态管理
│   │   ├── 📁 pages/         # 页面组件
│   │   │   ├── HomePage.tsx  # 首页
│   │   │   └── Features.tsx  # 功能页面
│   │   ├── 📁 theme/         # 主题配置
│   │   │   ├── index.ts      # 主题定义
│   │   │   └── types.ts      # 主题类型
│   │   ├── 📁 assets/        # 静态资源
│   │   ├── 📄 App.tsx        # 应用主布局
│   │   ├── 📄 entry-client.tsx  # 客户端入口
│   │   └── 📄 entry-server.tsx  # SSR 入口
│   ├── 📄 index.html         # HTML 模板
│   └── 📄 vite.config.mts    # Vite 配置
├── 📁 src/                   # 后端应用
│   ├── 📁 config/            # 配置文件
│   │   └── seo.ts            # SEO 配置
│   ├── 📁 db/                # 数据库
│   │   └── schema.ts         # 数据表定义
│   ├── 📁 routes/            # API 路由
│   │   └── post.ts           # 示例路由
│   ├── 📁 validators/        # 数据验证
│   │   └── post.schema.ts    # 示例验证器
│   ├── 📁 utils/             # 工具函数
│   │   └── htmlTemplate.ts  # HTML 模板生成
│   └── 📄 index.ts           # Hono 后端入口
├── 📁 drizzle/               # 数据库迁移文件
├── 📁 scripts/               # 构建脚本
└── 📁 docs/                  # 项目文档
```

## 🛠️ 常用开发命令

### 开发服务器

```bash
# 启动开发服务器
pnpm dev

# 指定端口启动
pnpm dev --port 3000

# 构建生产版本
pnpm build

# 预览生产构建
pnpm preview
```

### 数据库管理

```bash
# 生成数据库迁移文件
pnpm db:generate

# 应用本地数据库迁移
pnpm db:migrate

# 应用生产数据库迁移
pnpm db:migrate:prod

# 打开数据库管理界面
pnpm db:studio

# 删除本地数据库 (重置)
pnpm db:reset
```

### 代码质量

```bash
# TypeScript 类型检查
pnpm type-check

# 代码格式化
pnpm format

# 生成 HTML 模板 (SEO 优化)
pnpm generate:html
```

## 🎨 自定义开发

### 1. 修改品牌信息

#### 更新基本信息

```bash
# package.json
{
  "name": "your-app-name",
  "description": "你的应用描述",
  "author": "你的名字"
}
```

#### 替换 Logo 和图标

```typescript
// frontend/src/assets/logos/index.tsx
export const AppLogo = () => (
  <img src="/your-logo.svg" alt="Your App" />
);
```

#### 更新版权信息

```typescript
// frontend/src/components/Footer.tsx
const currentYear = new Date().getFullYear();
return (
  <Typography variant="body2">
    © {currentYear} Your Company Name. All rights reserved.
  </Typography>
);
```

### 2. 添加新页面

#### 创建页面组件

```typescript
// frontend/src/pages/AboutPage.tsx
import { Typography, Container } from '@mui/material';

export default function AboutPage() {
  return (
    <Container maxWidth="md">
      <Typography variant="h3" component="h1" gutterBottom>
        关于我们
      </Typography>
      <Typography variant="body1">
        这里是关于页面内容...
      </Typography>
    </Container>
  );
}
```

#### 添加路由 (统一配置)

现在只需要在一个地方添加路由：

```typescript
// frontend/src/routes.tsx
import AboutPage from './pages/AboutPage';

export const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<App />}>
      <Route index element={<HomePage />} />
      <Route path="features" element={<Features />} />
      <Route path="about" element={<AboutPage />} />  {/* 在这里添加新路由 */}
    </Route>
  </Routes>
);
```

#### 更新导航

```typescript
// frontend/src/App.tsx
<Button
  component={RouterLink}
  to="/about"
  sx={{
    my: 2,
    color: "inherit",
    display: "block",
    fontWeight: location.pathname === "/about" ? "bold" : "normal",
  }}
>
  关于我们
</Button>
```

### 3. 环境变量配置

#### 前端环境变量

在 `frontend/src/` 中使用环境变量：

```typescript
// 访问环境变量 (必须以 VITE_ 开头)
const apiUrl = import.meta.env.VITE_API_URL;
const isDev = import.meta.env.DEV;
const isProd = import.meta.env.PROD;
```

#### 后端环境变量

在 Hono 应用中访问：

```typescript
// src/index.ts
app.get("/config", async (c) => {
  return c.json({
    nodeEnv: c.env.NODE_ENV,
    vitePort: c.env.VITE_PORT,
  });
});
```

## 🔧 高级配置

### Vite 配置定制

```typescript
// frontend/vite.config.mts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@components": path.resolve(__dirname, "./src/components"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:8787",
    },
  },
  // SSR 配置
  ssr: {
    noExternal: [
      "react-router-dom",
      "@mui/material",
      "@mui/system",
      "@mui/icons-material",
      "@emotion/react",
      "@emotion/styled",
    ],
  },
});
```

### Wrangler 配置说明

```jsonc
// wrangler.jsonc
{
  "name": "your-app-name", // 项目名称
  "main": "src/index.ts", // 入口文件
  "compatibility_date": "2024-07-29", // 兼容性日期
  "compatibility_flags": ["nodejs_compat"], // Node.js 兼容

  "assets": {
    // 静态资源配置
    "binding": "ASSETS",
    "directory": "./dist/client",
  },

  "d1_databases": [
    {
      // 数据库配置
      "binding": "DB",
      "database_name": "your-db-name",
      "database_id": "your-db-id",
      "migrations_dir": "drizzle",
    },
  ],

  "vars": {
    // 环境变量
    "NODE_ENV": "development",
    "VITE_PORT": "5173",
  },
}
```

## 🧪 测试和调试

### 本地调试技巧

#### 查看开发日志

```bash
# 查看详细的 Wrangler 日志
pnpm dev --verbose

# 查看网络请求
# 在浏览器开发者工具的 Network 面板中查看
```

#### API 调试

```bash
# 使用 curl 测试 API
curl http://localhost:8787/api/posts

# 使用 Postman 或 Insomnia 测试
# 导入 http://localhost:8787/api/doc 的 OpenAPI 规范
```

#### 数据库调试

```bash
# 打开数据库管理界面
pnpm db:studio

# 查看数据库文件 (SQLite)
ls -la .wrangler/state/v3/d1/
```

### 常见问题排查

#### 热重载不工作

1. 确认访问地址是 `localhost:5173`
2. 检查防火墙设置
3. 重启开发服务器

#### API 请求失败

1. 检查后端服务是否运行 (`localhost:8787`)
2. 查看浏览器 Network 面板的错误信息
3. 确认 API 路径是否正确

#### 构建失败

1. 运行 `pnpm type-check` 检查类型错误
2. 检查 `vite.config.mts` 配置
3. 确认所有依赖都在 `ssr.noExternal` 中声明

## 📊 性能优化

### 前端优化

```typescript
// 使用 React.lazy 进行代码分割
const AboutPage = React.lazy(() => import('./pages/AboutPage'));

// 在路由中使用 Suspense
<Route
  path="/about"
  element={
    <Suspense fallback={<div>Loading...</div>}>
      <AboutPage />
    </Suspense>
  }
/>
```

### 后端优化

```typescript
// 使用 Hono 的缓存
app.get("/api/posts", cache({ cacheName: "posts", maxAge: 300 }), async (c) => {
  // API 逻辑
});

// 启用 gzip 压缩
app.use("*", compress());
```

## 🔄 下一步

开发基础掌握后，建议了解：

- [🔌 API 开发指南](./API_GUIDE.md) - 深入学习后端 API 开发
- [🎨 主题定制指南](./THEMING.md) - 自定义应用外观
- [📦 部署指南](./DEPLOYMENT.md) - 部署到生产环境

## 💡 开发小贴士

- **善用热重载**: 优先在 5173 端口开发，享受即时反馈
- **类型安全**: 定期运行 `pnpm type-check`，利用 TypeScript 的类型检查
- **API 优先**: 新功能开发时先设计 API，再实现前端界面
- **数据库版本控制**: 每次 schema 修改都要生成迁移文件
- **环境隔离**: 本地开发使用独立的数据库，避免影响生产数据
