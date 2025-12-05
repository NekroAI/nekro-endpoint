# Phase 3 开发计划

**文档版本**: 3.1 - Phase 3.1 已完成 ✅  
**创建日期**: 2025-11-07  
**最后更新**: 2025-12-04  
**完成日期**: 2025-12-04 🎉  
**状态**: ✅ Phase 3.1 已完成（动态代理端点）| ⏳ Phase 3.2 计划中（脚本端点）

> **🎯 核心策略**: 保留 `proxy` 类型，新增 `dynamicProxy` 类型，实现零迁移成本升级 **✅ 实施结果**: 零迁移策略成功实施，向后兼容保持完整

---

## 📋 执行摘要

**Phase 3.1** - 动态代理端点（✅ 已完成，2025-12-04）

Phase 3.1 在保持完全向后兼容的前提下，成功实现了端点类型系统增强：

- ✅ **零迁移成本**：保留 `proxy` 类型，避免数据迁移和用户干预
- ✅ **动态代理端点**：新增 `dynamicProxy` 类型，完整实现子路径透传
- ✅ **安全防护**：SSRF 防护、路径遍历防护、路径白名单机制
- ✅ **树结构约束**：dynamicProxy 强制为叶子节点，前后端双重验证
- ✅ **前端界面**：DynamicProxyEndpointEditor 完整可视化配置
- ✅ **管理员审查**：端点树浏览已在 Phase 2 实现，无需额外开发

**Phase 3.2** - 脚本端点（⏳ 计划中）

- JavaScript 沙箱执行环境
- 脚本管理和版本控制

---

## 🎯 核心改动说明

### 改动 1: 端点类型扩展（保持向后兼容）

#### 当前类型系统（Phase 1-2）

| 类型     | 名称     | 行为                                   |
| -------- | -------- | -------------------------------------- |
| `static` | 静态端点 | 返回预设的文本内容                     |
| `proxy`  | 代理端点 | 转发请求到固定的目标 URL，返回响应内容 |
| `script` | 脚本端点 | 执行自定义 JavaScript（未实现）        |

**现状**：

- ✅ `proxy` 类型运行良好，用户已广泛使用
- ❌ 无法代理子路径（如 `/api/*` 全部转发到目标域名）
- ❌ 缺少动态路径拼接能力

#### 新类型系统（Phase 3 - 向后兼容方案）

| 类型           | 名称         | 行为                  | 子节点约束                | 变更            |
| -------------- | ------------ | --------------------- | ------------------------- | --------------- |
| `static`       | 静态端点     | 返回预设的文本内容    | ✅ 允许                   | 无变更          |
| `proxy`        | 代理端点     | 转发到固定的目标 URL  | ✅ 允许                   | **保持不变** ✅ |
| `dynamicProxy` | 动态代理端点 | 代理子路径到目标域名  | ❌ 禁止（必须是叶子节点） | **新增** 🆕     |
| `script`       | 脚本端点     | 执行自定义 JavaScript | ✅ 允许                   | 无变更          |

**proxy 端点（保持不变）**：

```typescript
{
  targetUrl: 'https://api.example.com/data',
  headers: { 'X-Custom': 'value' },
  timeout: 10000
}
// 访问 /e/user/mydata → 返回 api.example.com/data 的响应内容
// ✅ 现有用户无需任何修改
```

**dynamicProxy 端点（全新能力）**：

```typescript
{
  targetDomain: 'https://api.github.com',
  headers: { 'Authorization': 'Bearer {{GITHUB_TOKEN}}' },
  timeout: 15000,
  stripPrefix: true // 是否移除端点路径前缀
}

// 示例：端点路径为 /github
// 访问 /e/user/github/repos/octocat/hello →
// 转发到 https://api.github.com/repos/octocat/hello
```

**关键设计决策**：

1. **为什么保留 proxy 而不改名？**
   - ✅ **零迁移成本**：现有用户无需任何操作
   - ✅ **避免数据迁移**：不需要修改数据库中的现有数据
   - ✅ **降低升级风险**：用户可以放心升级，不会破坏现有端点
   - ✅ **开源友好**：尊重已部署用户的选择

2. **为什么叫 dynamicProxy？**
   - "动态"强调根据请求子路径动态拼接目标 URL
   - 与 `proxy`（固定 URL）形成清晰的语义对照
   - 避免命名冲突和混淆

3. **为什么动态代理必须是叶子节点？**
   - 避免路径冲突：

     ```
     /api [dynamicProxy → target.com]
       ├─ /users [static]  ❌ 冲突！

     访问 /e/user/api/users 该匹配哪个？
     ```

   - 明确语义：dynamicProxy 接管所有子路径

4. **proxy 和 dynamicProxy 的区别**：| 特性 | proxy | dynamicProxy | |------|-------|--------------| | 目标 URL | 固定完整 URL | 域名 + 动态路径 | | 子路径处理 | 不支持 | 自动拼接 | | 使用场景 | 单个 API 端点转发 | 整个 API 域名代理 | | 示例 | `/data` → `api.com/v1/data` | `/api/*` → `api.com/*` |

---

## 🔍 改动 2: 管理员审查功能增强

### 当前实现（已有但不完善）

**后端 API（已实现）**：

- ✅ `GET /api/admin/users/:userId/endpoints` - 获取用户的端点树
- ✅ `GET /api/admin/endpoints/:id` - 查看端点详细内容
- ✅ `POST /api/admin/endpoints/:id/force-unpublish` - 强制下线端点

**问题**：

- ❌ 前端无专门的审查界面
- ❌ 无法快速浏览所有用户的端点
- ❌ 无内容预览功能

### Phase 3 增强方案

**新增前端页面**：`admin/ContentReviewPage.tsx`

**功能清单**：

1. **用户端点总览**
   - 左侧：用户列表（支持搜索、筛选）
   - 中间：选中用户的端点树（TreeView 展示）
   - 右侧：端点详情预览

2. **快速审查**
   - 端点状态标识：
     - 🟢 已发布
     - 🟡 未发布（草稿）
     - 🔴 已被强制下线
   - 类型图标：📄 static / 🔄 staticProxy / 🌐 dynamicProxy / ⚙️ script
   - 一键预览内容（Monaco Editor）

3. **批量操作**
   - 批量强制下线
   - 批量发送警告通知（未来扩展）
   - 导出审查报告

**工作量评估**：5-7 天

- 后端无需改动（API 已实现）
- 前端页面开发：4 天
- 测试：1 天
- 文档：1 天

---

## 📦 改动 3: 数据库 Schema 变更（仅新增）

### 当前 Schema

```typescript
// endpoints 表
{
  type: text("type", { enum: ["static", "proxy", "script"] });
}
```

### 新 Schema（向后兼容）

```typescript
// endpoints 表
{
  type: text("type", { enum: ["static", "proxy", "dynamicProxy", "script"] });
  // ✅ 保留 "proxy"，仅新增 "dynamicProxy"
}
```

**变更说明**：

- ✅ **保留**: `"proxy"` - 现有端点继续正常工作
- 🆕 **新增**: `"dynamicProxy"` - 提供新的动态代理能力
- ❌ **不删除**: 不移除任何现有类型
- ✅ **零影响**: 现有数据库数据无需任何修改

### Validator Schema 变更（仅新增）

**保持现有 ProxyConfigSchema 不变**：

```typescript
// common/validators/endpoint.schema.ts

// ✅ 保持不变 - 现有 proxy 端点继续使用
export const ProxyConfigSchema = z.object({
  targetUrl: z.string().url(),
  headers: z.record(z.string()).optional(),
  removeHeaders: z.array(z.string()).optional(),
  timeout: z.number().int().min(1000).max(30000).default(10000),
});
```

**新增 DynamicProxyConfigSchema**：

```typescript
// 🆕 新增 - 用于 dynamicProxy 端点
export const DynamicProxyConfigSchema = z.object({
  targetDomain: z.string().url(), // 必须是域名，如 https://api.github.com
  headers: z.record(z.string()).optional(),
  removeHeaders: z.array(z.string()).optional(),
  timeout: z.number().int().min(1000).max(30000).default(15000),
  stripPrefix: z.boolean().default(true), // 是否移除端点路径前缀
  allowedPaths: z.array(z.string()).optional(), // 路径白名单（可选）
});
```

**类型定义更新**：

```typescript
// ✅ 仅新增 'dynamicProxy'，保留 'proxy'
export const EndpointTypeSchema = z.enum(["static", "proxy", "dynamicProxy", "script"]);

export type EndpointType = z.infer<typeof EndpointTypeSchema>;
export type ProxyConfig = z.infer<typeof ProxyConfigSchema>; // 保持不变
export type DynamicProxyConfig = z.infer<typeof DynamicProxyConfigSchema>; // 新增
```

---

## ✅ 改动 4: 零迁移方案（向后兼容）

### 迁移策略

**核心原则**：**无需数据迁移，完全向后兼容**

#### 方案：仅新增类型，保留现有数据

**优势**：

- ✅ **零迁移成本**：现有用户无需任何操作
- ✅ **零风险**：不修改任何现有数据
- ✅ **零停机**：升级过程完全透明
- ✅ **可回滚**：随时可以回退到旧版本
- ✅ **开源友好**：尊重已部署用户的数据

**实施步骤**：

```bash
# 1. 更新 Schema（仅添加新类型）
# src/db/schema.ts
type: text("type").notNull(), // static | proxy | dynamicProxy | script

# 2. 生成迁移文件
pnpm db:generate

# 3. 检查生成的迁移文件
# 由于 SQLite 的 text 类型没有枚举约束，
# Drizzle 不会生成任何 ALTER TABLE 语句
# 这意味着：✅ 无需执行数据库迁移！

# 4. 更新代码（添加新的 case 分支）
# src/routes/execution.ts
case "proxy": {
  // ✅ 保持不变，继续支持现有端点
  // 现有逻辑
}

case "dynamicProxy": {
  // 🆕 新增，处理动态代理
  // 新逻辑
}

# 5. 部署新版本
pnpm deploy

# 6. 验证
# 现有 proxy 端点继续正常工作
# 用户可以创建新的 dynamicProxy 端点
```

**数据库状态对比**：

| 时间点 | proxy 端点      | dynamicProxy 端点 | 需要迁移？ |
| ------ | --------------- | ----------------- | ---------- |
| 升级前 | ✅ 正常工作     | ❌ 不存在         | ❌ 否      |
| 升级后 | ✅ 继续正常工作 | ✅ 可以创建       | ❌ 否      |

**用户升级体验**：

```bash
# 用户 A（已部署旧版本）
git pull origin main
pnpm install
pnpm deploy

# ✅ 升级完成！
# - 现有 proxy 端点继续工作
# - 可以创建新的 dynamicProxy 端点
# - 无需任何手动操作
```

**回滚方案**（如果需要）：

```bash
# 如果发现问题，可以直接回退代码
git checkout <previous-version>
pnpm deploy

# ✅ 回滚完成！
# - proxy 端点继续工作
# - dynamicProxy 端点会返回 "Unknown endpoint type" 错误
# - 但不会影响现有功能
```

**前端兼容性处理**：

```typescript
// frontend/src/pages/EndpointsPage.tsx

// ✅ 在类型定义中添加新类型
type: "static" | "proxy" | "dynamicProxy" | "script";

// ✅ 在创建对话框中添加新选项
<FormControlLabel
  value="dynamicProxy"
  control={<Radio />}
  label="🌐 动态代理端点（新功能）"
/>

// ✅ 现有 proxy 端点的 UI 保持不变
```

**总结**：

| 方案                               | 迁移成本 | 风险   | 用户体验 | 推荐度          |
| ---------------------------------- | -------- | ------ | -------- | --------------- |
| ~~重命名 proxy → staticProxy~~     | 高       | 高     | 差       | ❌ 不推荐       |
| **保留 proxy + 新增 dynamicProxy** | **零**   | **零** | **优秀** | ✅ **强烈推荐** |

---

## 🛡️ 改动 5: 树结构约束实现

### 问题场景

```
用户创建端点树：
/api [dynamicProxy → target.com]
  ├─ /users [static]  ❌ 这会导致逻辑冲突
```

**冲突原因**：

- 访问 `/e/user/api/users`
- 是匹配 dynamicProxy 的子路径 `target.com/users`？
- 还是匹配子端点 `static: /users`？

### 解决方案：创建时检查 + 编辑时验证

#### 后端验证逻辑

**创建端点时检查**（`POST /api/endpoints`）：

```typescript
// src/routes/endpoints.ts

// 检查 1: dynamicProxy 端点不能有父节点是 dynamicProxy
if (type === "dynamicProxy" && parentId) {
  const parent = await db.query.endpoints.findFirst({
    where: eq(endpoints.id, parentId),
  });

  if (parent?.type === "dynamicProxy") {
    return c.json(
      {
        error: "Cannot create child endpoint under a dynamicProxy endpoint",
      },
      400,
    );
  }
}

// 检查 2: 不能在 dynamicProxy 端点下创建子端点
if (parentId) {
  const parent = await db.query.endpoints.findFirst({
    where: eq(endpoints.id, parentId),
  });

  if (parent?.type === "dynamicProxy") {
    return c.json(
      {
        error: "Cannot create child endpoint under a dynamicProxy endpoint",
      },
      400,
    );
  }
}

// 检查 3: 将端点类型改为 dynamicProxy 时，必须无子节点
if (type === "dynamicProxy") {
  const children = await db.query.endpoints.findMany({
    where: eq(endpoints.parentId, endpointId),
  });

  if (children.length > 0) {
    return c.json(
      {
        error: "Cannot change to dynamicProxy type: endpoint has child nodes. Please delete child nodes first.",
      },
      400,
    );
  }
}
```

**移动端点时检查**（`PATCH /api/endpoints/:id/move`）：

```typescript
// 不能将端点移动到 dynamicProxy 端点下
if (newParentId) {
  const newParent = await db.query.endpoints.findFirst({
    where: eq(endpoints.id, newParentId),
  });

  if (newParent?.type === "dynamicProxy") {
    return c.json(
      {
        error: "Cannot move endpoint under a dynamicProxy endpoint",
      },
      400,
    );
  }
}
```

#### 前端提示

**端点编辑器中的警告**：

```tsx
// DynamicProxyEndpointEditor.tsx
{
  endpoint.children?.length > 0 && (
    <Alert severity="warning">
      此端点包含 {endpoint.children.length} 个子端点。 动态代理端点不允许有子节点，请先删除所有子端点后再保存。
    </Alert>
  );
}

{
  selectedType === "dynamicProxy" && hasChildren && (
    <Alert severity="error">无法切换为动态代理：当前端点有子节点。 请先移动或删除子节点。</Alert>
  );
}
```

**树形视图中的禁用状态**：

```tsx
// EndpointsPage.tsx
const canAddChild = (node) => {
  // dynamicProxy 节点禁止添加子节点
  if (node.type === "dynamicProxy") {
    return false;
  }
  return true;
};

<TreeItem
  nodeId={node.id}
  label={node.name}
  disabled={!canAddChild(node)} // 右键菜单中的"新建子端点"禁用
/>;
```

---

## 🚀 执行层实现

### proxy 端点执行逻辑（保持不变）

```typescript
// src/routes/execution.ts

case "proxy": {
  // ✅ 保持现有逻辑不变
  const { targetUrl, headers, removeHeaders, timeout } = config;

  const proxyHeaders = {
    ...Object.fromEntries(c.req.raw.headers),
    ...headers,
  };

  removeHeaders?.forEach((h: string) => delete proxyHeaders[h.toLowerCase()]);
  delete proxyHeaders["host"];
  delete proxyHeaders["x-access-key"];

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(targetUrl, {
      method: c.req.method,
      headers: proxyHeaders,
      body: ['GET', 'HEAD'].includes(c.req.method) ? null : c.req.raw.body,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    return c.body(await response.arrayBuffer(), {
      status: response.status,
      headers: Object.fromEntries(response.headers),
    });
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      return c.json({ error: 'Request timeout' }, 504);
    }
    throw error;
  }
}
```

### dynamicProxy 端点执行逻辑

```typescript
case "dynamicProxy": {
  const { targetDomain, headers, removeHeaders, timeout, stripPrefix, allowedPaths } = config;

  // 1. 提取子路径
  const fullPath = new URL(c.req.url).pathname; // /e/username/github/repos/octocat
  const endpointPath = endpoint.path; // /github

  let subPath = fullPath.replace(`/e/${username}${endpointPath}`, '');

  if (!stripPrefix) {
    subPath = endpointPath + subPath; // 保留端点路径前缀
  }

  // 2. 路径白名单检查（可选）
  if (allowedPaths && allowedPaths.length > 0) {
    const isAllowed = allowedPaths.some(pattern => {
      const regex = new RegExp('^' + pattern.replace('*', '.*') + '$');
      return regex.test(subPath);
    });

    if (!isAllowed) {
      return c.json({ error: 'Path not allowed' }, 403);
    }
  }

  // 3. 构造目标 URL
  const targetUrl = new URL(subPath, targetDomain);

  // 复制查询参数
  const searchParams = new URL(c.req.url).searchParams;
  searchParams.forEach((value, key) => {
    if (key !== 'access_key') { // 过滤掉鉴权参数
      targetUrl.searchParams.set(key, value);
    }
  });

  // 4. 转发请求
  const proxyHeaders = {
    ...Object.fromEntries(c.req.raw.headers),
    ...headers,
  };

  removeHeaders?.forEach((h: string) => delete proxyHeaders[h.toLowerCase()]);
  delete proxyHeaders["host"];
  delete proxyHeaders["x-access-key"];

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(targetUrl.toString(), {
      method: c.req.method,
      headers: proxyHeaders,
      body: ['GET', 'HEAD'].includes(c.req.method) ? null : c.req.raw.body,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    return c.body(await response.arrayBuffer(), {
      status: response.status,
      headers: Object.fromEntries(response.headers),
    });
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      return c.json({ error: 'Request timeout' }, 504);
    }
    throw error;
  }
}
```

**关键设计点**：

1. **stripPrefix 参数**：
   - `true`（默认）：`/e/user/github/repos` → `target.com/repos`
   - `false`：`/e/user/github/repos` → `target.com/github/repos`

2. **allowedPaths 白名单**（可选）：
   - 示例：`["/repos/*", "/users/*"]`
   - 用途：限制代理范围，防止滥用

3. **查询参数透传**：
   - 保留原始 URL 的查询参数
   - 过滤掉鉴权参数（`access_key`）

---

## 📝 前端组件变更

### 新增组件

**1. DynamicProxyEndpointEditor.tsx**（新增）

```tsx
export function DynamicProxyEndpointEditor({ endpoint, onSave }) {
  const [config, setConfig] = useState<DynamicProxyConfig>(endpoint.config);

  return (
    <Box>
      {/* 子节点警告 */}
      {endpoint.children?.length > 0 && (
        <Alert severity="error">动态代理端点不允许有子节点。 请先删除 {endpoint.children.length} 个子端点。</Alert>
      )}

      {/* 目标域名 */}
      <TextField
        label="目标域名"
        value={config.targetDomain}
        onChange={(e) => setConfig({ ...config, targetDomain: e.target.value })}
        placeholder="https://api.github.com"
        helperText="所有子路径请求将转发到此域名"
      />

      {/* 路径前缀处理 */}
      <FormControlLabel
        control={
          <Switch
            checked={config.stripPrefix}
            onChange={(e) => setConfig({ ...config, stripPrefix: e.target.checked })}
          />
        }
        label="移除端点路径前缀"
      />
      <FormHelperText>
        开启后：/e/user/api/v1/users → target.com/v1/users
        <br />
        关闭后：/e/user/api/v1/users → target.com/api/v1/users
      </FormHelperText>

      {/* 路径白名单（高级选项）*/}
      <Accordion>
        <AccordionSummary>高级选项</AccordionSummary>
        <AccordionDetails>
          <TextField
            label="允许的路径（每行一个）"
            multiline
            rows={4}
            placeholder="/repos/*\n/users/*"
            helperText="支持通配符 *，留空则允许所有路径"
          />
        </AccordionDetails>
      </Accordion>

      {/* 请求头管理（复用现有组件）*/}
      <HeadersManager headers={config.headers} onChange={(headers) => setConfig({ ...config, headers })} />

      {/* 保存按钮 */}
      <Button onClick={handleSave} disabled={endpoint.children?.length > 0}>
        保存
      </Button>
    </Box>
  );
}
```

**2. ProxyEndpointEditor.tsx**（保持不变）

```tsx
// ✅ 现有组件无需修改
export function ProxyEndpointEditor({ endpoint, onSave }) {
  const [config, setConfig] = useState<ProxyConfig>(endpoint.config);

  return (
    <Box>
      {/* 目标 URL */}
      <TextField
        label="目标 URL"
        value={config.targetUrl}
        onChange={(e) => setConfig({ ...config, targetUrl: e.target.value })}
        placeholder="https://example.com/api/data"
        helperText="固定的代理目标地址"
      />

      {/* 请求头管理 */}
      <HeadersManager headers={config.headers} onChange={(headers) => setConfig({ ...config, headers })} />

      {/* 超时设置 */}
      <TextField
        label="超时时间 (ms)"
        type="number"
        value={config.timeout}
        onChange={(e) => setConfig({ ...config, timeout: Number(e.target.value) })}
      />

      <Button onClick={handleSave}>保存</Button>
    </Box>
  );
}
```

### 修改组件

**EndpointEditor.tsx** - 添加新的路由分支

```tsx
export function EndpointEditor({ endpoint }) {
  switch (endpoint.type) {
    case "static":
      return <StaticEndpointEditor endpoint={endpoint} />;
    case "proxy": // ✅ 保持不变
      return <ProxyEndpointEditor endpoint={endpoint} />;
    case "dynamicProxy": // 🆕 新增
      return <DynamicProxyEndpointEditor endpoint={endpoint} />;
    case "script":
      return <ScriptEndpointEditor endpoint={endpoint} />;
    default:
      return <Alert severity="error">未知的端点类型</Alert>;
  }
}
```

**CreateEndpointDialog.tsx** - 新增 dynamicProxy 选项

```tsx
<FormControl>
  <FormLabel>端点类型</FormLabel>
  <RadioGroup value={type} onChange={(e) => setType(e.target.value)}>
    <FormControlLabel value="static" control={<Radio />} label="📄 静态端点" />
    <FormControlLabel value="proxy" control={<Radio />} label="🔄 代理端点" />
    <FormControlLabel value="dynamicProxy" control={<Radio />} label="🌐 动态代理端点（新功能）" />
    <FormControlLabel value="script" control={<Radio />} label="⚙️ 脚本端点" />
  </RadioGroup>

  {/* 添加说明 */}
  {type === "dynamicProxy" && (
    <Alert severity="info" sx={{ mt: 1 }}>
      动态代理端点可以代理整个 API 域名的所有子路径， 适用于 GitHub API、第三方 API 等场景。
    </Alert>
  )}
</FormControl>;

{
  /* dynamicProxy 创建时的警告 */
}
{
  type === "dynamicProxy" && selectedParent?.type === "dynamicProxy" && (
    <Alert severity="error">不能在动态代理端点下创建子端点</Alert>
  );
}
```

---

## 🎉 零迁移方案的优势总结

### 对开源项目的价值

**1. 用户友好** ✅

- 现有用户无需任何操作即可升级
- 不会破坏任何现有端点
- 升级过程完全透明
- 可以随时回退到旧版本

**2. 开发友好** ✅

- 无需编写复杂的迁移脚本
- 无需测试数据迁移流程
- 减少开发和测试时间
- 降低代码复杂度

**3. 运维友好** ✅

- 无需停机维护
- 无需备份和恢复数据
- 无需担心迁移失败
- 无需准备回滚方案

**4. 风险最小化** ✅

- 完全消除数据迁移风险
- 降低升级失败概率
- 提高用户信任度
- 减少支持成本

### 与重命名方案的对比

| 维度           | 重命名方案（proxy → staticProxy） | 零迁移方案（保留 proxy） |
| -------------- | --------------------------------- | ------------------------ |
| **数据迁移**   | ❌ 需要                           | ✅ 不需要                |
| **用户操作**   | ❌ 需要手动升级                   | ✅ 自动升级              |
| **风险等级**   | ⚠️ 中-高                          | ✅ 极低                  |
| **回滚难度**   | ❌ 困难                           | ✅ 简单                  |
| **开发时间**   | ⚠️ 20 天                          | ✅ 15 天                 |
| **测试复杂度** | ⚠️ 高                             | ✅ 低                    |
| **用户体验**   | ⚠️ 需要学习新名称                 | ✅ 无感知                |
| **开源友好度** | ⚠️ 中                             | ✅ 高                    |

### 实施建议

**阶段 1: 代码更新（Day 1-5）**

```typescript
// 1. 更新类型定义
export const EndpointTypeSchema = z.enum([
  'static',
  'proxy',        // ✅ 保留
  'dynamicProxy', // 🆕 新增
  'script'
]);

// 2. 添加新的执行逻辑
case "proxy": {
  // ✅ 保持不变
}

case "dynamicProxy": {
  // 🆕 新增
}
```

**阶段 2: 前端更新（Day 6-10）**

```tsx
// 1. 添加新的编辑器组件
<DynamicProxyEndpointEditor />

// 2. 更新路由逻辑
case 'proxy': return <ProxyEndpointEditor />;        // ✅ 保持
case 'dynamicProxy': return <DynamicProxyEndpointEditor />; // 🆕 新增

// 3. 添加新的创建选项
<FormControlLabel
  value="dynamicProxy"
  label="🌐 动态代理端点（新功能）"
/>
```

**阶段 3: 测试和发布（Day 11-15）**

```bash
# 1. 兼容性测试
- 测试现有 proxy 端点是否正常工作
- 测试新 dynamicProxy 端点功能

# 2. 部署
pnpm deploy

# 3. 验证
- 现有端点继续工作 ✅
- 可以创建新端点 ✅
```

### 用户升级指南（示例）

````markdown
# NekroEndpoint v2.0 升级指南

## 新功能：动态代理端点

我们新增了 `dynamicProxy` 端点类型，支持代理整个 API 域名的所有子路径。

### 升级步骤

1. 拉取最新代码：
   ```bash
   git pull origin main
   pnpm install
   pnpm deploy
   ```
````

2. 完成！✅

### 现有端点

- ✅ 所有现有 `proxy` 端点继续正常工作
- ✅ 无需任何修改
- ✅ 无需数据迁移

### 新功能使用

创建端点时，选择"动态代理端点"即可使用新功能。

详细文档：[链接]

````

---

## 🧪 测试计划

### 单元测试

**后端测试**（新增）：

```typescript
// tests/endpoints/dynamicProxy.test.ts

describe('DynamicProxy Endpoint', () => {
  test('should prevent creating child under dynamicProxy', async () => {
    const parent = await createEndpoint({ type: 'dynamicProxy', path: '/api' });

    const response = await request(app)
      .post('/api/endpoints')
      .send({ type: 'static', path: '/users', parentId: parent.id });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Cannot create child endpoint');
  });

  test('should prevent changing to dynamicProxy when has children', async () => {
    const parent = await createEndpoint({ type: 'static', path: '/api' });
    await createEndpoint({ type: 'static', path: '/users', parentId: parent.id });

    const response = await request(app)
      .patch(`/api/endpoints/${parent.id}`)
      .send({ type: 'dynamicProxy' });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('has child nodes');
  });

  test('should proxy sub-paths correctly', async () => {
    const endpoint = await createEndpoint({
      type: 'dynamicProxy',
      path: '/github',
      config: {
        targetDomain: 'https://api.github.com',
        stripPrefix: true
      }
    });

    const response = await request(app)
      .get('/e/testuser/github/repos/octocat/hello-world');

    // 应该转发到 https://api.github.com/repos/octocat/hello-world
    expect(response.status).toBe(200);
  });
});
````

**前端测试**（新增）：

```typescript
// frontend/src/components/endpoints/__tests__/DynamicProxyEditor.test.tsx

describe('DynamicProxyEndpointEditor', () => {
  test('should disable save when endpoint has children', () => {
    const endpoint = {
      type: 'dynamicProxy',
      children: [{ id: '1', name: 'child' }]
    };

    render(<DynamicProxyEndpointEditor endpoint={endpoint} />);

    expect(screen.getByRole('button', { name: /保存/ })).toBeDisabled();
    expect(screen.getByText(/不允许有子节点/)).toBeInTheDocument();
  });

  test('should show path stripping explanation', () => {
    render(<DynamicProxyEndpointEditor endpoint={mockEndpoint} />);

    expect(screen.getByText(/移除端点路径前缀/)).toBeInTheDocument();
  });
});
```

### 集成测试

**测试场景**：

1. **向后兼容性测试** ✅
   - 验证现有 proxy 端点继续正常工作
   - 验证 proxy 端点可以正常编辑
   - 验证 proxy 端点的访问链接不变

2. **执行层测试**
   - proxy：验证固定 URL 转发（现有功能）
   - dynamicProxy：验证子路径正确拼接（新功能）

3. **树结构约束测试**
   - 尝试在 dynamicProxy 下创建子节点（应失败）
   - 尝试将有子节点的端点改为 dynamicProxy（应失败）

4. **安全测试** 🔒
   - SSRF 防护：尝试访问内网地址（应被拒绝）
   - 路径遍历：尝试访问 `../` 路径（应被拒绝）
   - 请求速率限制：高频请求测试

---

## 📅 开发排期（零迁移方案）

### Week 1: 后端核心逻辑和安全加固

**Day 1: Schema 和 Validator 更新**

- [ ] 更新 `EndpointTypeSchema`（添加 `dynamicProxy`）
- [ ] 新增 `DynamicProxyConfigSchema`
- [ ] 更新 TypeScript 类型定义
- [ ] ✅ 无需数据库迁移脚本

**Day 2: 安全防护实现**

- [ ] 实现 SSRF 防护（黑名单 + IP 范围检查）
- [ ] 实现路径遍历防护
- [ ] 实现目标域名白名单（可选）
- [ ] 安全测试

**Day 3-4: 后端 API 验证逻辑**

- [ ] 实现子节点检查中间件
- [ ] 更新 `POST /api/endpoints`（创建验证）
- [ ] 更新 `PATCH /api/endpoints/:id`（编辑验证）
- [ ] 更新 `PATCH /api/endpoints/:id/move`（移动验证）
- [ ] 单元测试

**Day 5: 执行层实现**

- [ ] 实现 `dynamicProxy` 执行逻辑
- [ ] 子路径提取和拼接
- [ ] 查询参数透传
- [ ] 安全检查集成
- [ ] 集成测试

---

### Week 2: 前端界面和管理员审查

**Day 6-7: 端点编辑器**

- [ ] 新增 `DynamicProxyEndpointEditor.tsx`
- [ ] 更新 `EndpointEditor.tsx`（添加新的 case 分支）
- [ ] 更新 `CreateEndpointDialog.tsx`（添加新选项）
- [ ] 添加配置预览功能
- [ ] 添加连接测试功能
- [ ] 树形视图中的约束提示

**Day 8-9: 管理员审查页面**

- [ ] 创建 `admin/ContentReviewPage.tsx`
- [ ] 用户列表 + 搜索/筛选
- [ ] 端点树展示（复用现有 TreeView）
- [ ] 内容预览面板（Monaco Editor）
- [ ] 批量操作按钮

**Day 10: 测试和文档**

- [ ] E2E 测试
- [ ] 用户文档更新
- [ ] API 文档更新（Swagger）
- [ ] 迁移指南编写

---

### Week 3: 测试和发布

**Day 11-12: 全面测试**

- [ ] 完整功能回归测试
- [ ] 现有 proxy 端点兼容性测试
- [ ] 新 dynamicProxy 端点功能测试
- [ ] 安全测试（SSRF、路径遍历）
- [ ] 性能测试
- [ ] 修复发现的 Bug

**Day 13: 文档更新**

- [ ] 更新 API 文档
- [ ] 编写 dynamicProxy 使用指南
- [ ] 更新 CHANGELOG
- [ ] 编写升级指南（说明零迁移）

**Day 14: 发布准备**

- [ ] 代码审查
- [ ] 创建 Git Tag
- [ ] 准备发布说明
- [ ] 测试部署流程

**Day 15: 正式发布**

- [ ] 部署到生产环境
- [ ] 发布公告
- [ ] 监控错误日志
- [ ] 收集用户反馈

---

## 🎯 验收标准

### 功能验收

- [ ] ✅ 所有现有 proxy 端点继续正常工作（零影响）
- [ ] ✅ proxy 端点可正常转发到固定 URL
- [ ] ✅ dynamicProxy 可正确代理子路径
- [ ] ✅ dynamicProxy 端点创建时正确检查子节点
- [ ] ✅ 无法在 dynamicProxy 下创建子端点（前后端验证）
- [ ] ✅ 管理员审查页面可浏览所有用户端点
- [ ] ✅ 管理员可预览端点内容
- [ ] ✅ 管理员可批量强制下线端点

### 兼容性验收

- [ ] ✅ 现有用户无需任何操作即可升级
- [ ] ✅ 升级后现有端点链接仍可正常访问
- [ ] ✅ 前端正确显示现有 proxy 端点
- [ ] ✅ 可以正常编辑现有 proxy 端点
- [ ] ✅ 数据库中无需执行任何迁移脚本

### 性能验收

- [ ] ✅ dynamicProxy 执行延迟 < staticProxy 延迟 + 50ms
- [ ] ✅ 子节点检查查询时间 < 100ms
- [ ] ✅ 管理员审查页面加载时间 < 2s（1000 端点）

### 安全验收

- [ ] ✅ SSRF 防护生效（无法访问内网地址）
- [ ] ✅ 路径遍历防护生效（无法访问 `../` 路径）
- [ ] ✅ 目标域名白名单生效（如启用）
- [ ] ✅ 请求速率限制生效（如启用）

---

## 🚨 风险评估（零迁移方案）

### 高风险

**风险 1: ~~数据迁移失败~~**

- **状态**: ✅ **已消除**（无需迁移）
- **说明**: 采用零迁移方案，完全避免了数据迁移风险

**风险 2: dynamicProxy 执行逻辑错误导致安全问题**

- **概率**: 中
- **影响**: 高
- **缓解措施**:
  - 实现路径白名单机制
  - 禁止访问内网地址（127.0.0.1、10.0.0.0/8 等）
  - 完善单元测试和安全测试

**风险 3: 现有用户升级后出现兼容性问题**

- **概率**: 极低（< 1%）
- **影响**: 中
- **缓解措施**:
  - 保留所有现有类型和逻辑
  - 充分的兼容性测试
  - 提供详细的升级指南
  - 快速回滚机制

### 中风险

**风险 4: 子节点检查性能问题**

- **概率**: 低
- **影响**: 中
- **缓解措施**:
  - 在 parentId 字段上添加索引
  - 使用 COUNT 查询而非 findMany
  - 缓存检查结果（如果必要）

**风险 5: 前端编辑器 UX 复杂度增加**

- **概率**: 中
- **影响**: 中
- **缓解措施**:
  - 提供清晰的帮助文档
  - 在界面中增加示例和提示
  - 收集用户反馈快速迭代

---

## 📚 参考资料

### 技术文档

- [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)
- [Drizzle ORM 迁移指南](https://orm.drizzle.team/docs/migrations)
- [Zod Schema 验证](https://zod.dev/)

### 项目文档

- [design.md](.cursor/trace/design.md) - 原始设计文档
- [implementation-status.md](.cursor/trace/implementation-status.md) - 实现状态报告
- [global.mdc](.cursor/rules/global.mdc) - 工作指导手册

---

## ✅ 检查清单

**开发前**

- [ ] 阅读完整��� Phase 3 计划
- [ ] 理解端点类型重构的原因
- [ ] 确认数据迁移策略
- [ ] 搭建本地测试环境

**开发中**

- [ ] 每日提交代码到功能分支
- [ ] 编写单元测试（测试覆盖率 > 80%）
- [ ] 更新相关���档
- [ ] 代码 Review

**发布前**

- [ ] 运行完整测试套件
- [ ] 本地测试数据迁移
- [ ] 更新 CHANGELOG
- [ ] 准备回滚方案

**发布后**

- [ ] 监控错误日志
- [ ] 收集用户反馈
- [ ] 修复紧急 Bug
- [ ] 规划下一阶段功能

---

## 📝 变更日志

### v3.1 - 2025-12-04（Phase 3.1 实施完成）✅

**完成内容**：

- ✅ 后端 Schema 更新（`type` 枚举扩展为包含 `dynamicProxy`）
- ✅ Validator Schema 更新（新增 `DynamicProxyConfigSchema`）
- ✅ 安全防护工具实现（`src/utils/security.ts`）
  - `isTargetUrlSafe()` - SSRF 防护
  - `sanitizePath()` - 路径遍历防护
  - `isPathAllowed()` - 路径白名单检查
- ✅ 后端 API 树结构约束验证（创建、更新、移动端点）
- ✅ 执行层 dynamicProxy 逻辑实现（`src/routes/execution.ts`）
- ✅ 前端 DynamicProxyEndpointEditor 组件
- ✅ 前端 EndpointEditor 路由更新
- ✅ 前端 CreateEndpointDialog 类型选项更新
- ✅ 文档更新（开发指南、实施状态报告）

**实施结果**：

- 零迁移策略成功验证
- 向后兼容性完整保持
- 用户无需任何手动操作
- 开发周期：1 天（优于计划的 15 天）
- 代码质量：无 Lint 错误

### v3.0 - 2025-12-04（零迁移方案设计）

**重大变更**：

- ✅ 采用零迁移向后兼容方案
- ✅ 保留 `proxy` 类型，不进行重命名
- ✅ 新增 `dynamicProxy` 类型
- ✅ 消除所有数据迁移风险
- ✅ 降低用户升级成本

**原因**：

- 项目是开源的，许多用户已在自己的 Cloudflare 账号中部署
- 避免潜在的数据兼容问题
- 降低用户升级风险
- 提高开源项目的用户友好度

**影响**：

- 开发时间：从 20 天减少到 15 天
- 风险等级：从中-高降低到极低
- 用户体验：从需要手动操作到完全自动

### v2.0 - 2025-11-07（已废弃）

- ~~采用重命名方案（proxy → staticProxy）~~
- ~~需要数据库迁移~~
- ~~需要用户手动操作~~

### v1.0 - 2025-11-07

- 初始版本
- 基础功能设计

---

**文档维护者**: AI Assistant  
**审阅者**: @miose  
**最后更新**: 2025-12-04（Phase 3.1 完成）
