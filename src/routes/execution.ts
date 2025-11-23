import { Hono } from "hono";
import { eq, and } from "drizzle-orm";
import { users, endpoints as endpointsTable, accessKeys, permissionGroups } from "../db/schema";
import type { Bindings } from "../types";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import * as drizzleSchema from "../db/schema";

type Variables = {
  db: DrizzleD1Database<typeof drizzleSchema>;
};

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

/**
 * 端点执行层
 * 处理 /e/:username/:path 格式的请求
 */
app.all("/e/:username/*", async (c) => {
  const db = c.get("db");
  const username = c.req.param("username");

  // 从完整路径中提取端点路径部分
  // 完整路径格式: /e/:username/:path
  const fullPath = c.req.path; // 例如: /e/KroMiose/test111
  const prefix = `/e/${username}`; // 例如: /e/KroMiose
  const pathParam = fullPath.startsWith(prefix) ? fullPath.slice(prefix.length) : "";

  // 确保 path 总是以 / 开头，以匹配数据库中的存储格式
  const path = pathParam ? (pathParam.startsWith("/") ? pathParam : `/${pathParam}`) : "/";

  // 查找用户
  const user = await db.query.users.findFirst({
    where: eq(users.username, username),
  });

  if (!user) {
    return c.json({ error: "User not found" }, 404);
  }

  if (!user.isActivated) {
    return c.json({ error: "User not activated" }, 403);
  }

  // 查找端点
  const endpoint = await db.query.endpoints.findFirst({
    where: and(eq(endpointsTable.ownerUserId, user.id), eq(endpointsTable.path, path)),
  });

  if (!endpoint) {
    return c.json({ error: "Endpoint not found" }, 404);
  }

  if (!endpoint.isPublished) {
    return c.json({ error: "Endpoint not published" }, 403);
  }

  if (!endpoint.enabled) {
    return c.json({ error: "Endpoint disabled" }, 503);
  }

  // 验证访问权限
  if (endpoint.accessControl === "authenticated") {
    const accessKey = c.req.header("X-Access-Key") || c.req.query("access_key");

    if (!accessKey) {
      return c.json({ error: "Access key required" }, 401);
    }

    // 解析权限组
    let requiredGroups: string[] = [];
    if (endpoint.requiredPermissionGroups) {
      try {
        requiredGroups = JSON.parse(endpoint.requiredPermissionGroups);
      } catch {
        return c.json({ error: "Invalid permission configuration" }, 500);
      }
    }

    if (requiredGroups.length === 0) {
      return c.json({ error: "No permission groups configured" }, 500);
    }

    // 查找所有相关的访问密钥
    const validKeys = await db.select().from(accessKeys).where(eq(accessKeys.isActive, true)).all();

    // 验证密钥（直接比较明文）
    let keyValid = false;
    let matchedKey: typeof accessKeys.$inferSelect | null = null;

    for (const key of validKeys) {
      // 检查密钥是否属于所需的权限组
      if (!requiredGroups.includes(key.permissionGroupId)) {
        continue;
      }

      // 检查密钥是否过期
      if (key.expiresAt && new Date(key.expiresAt) < new Date()) {
        continue;
      }

      // 直接比较明文密钥
      if (accessKey === key.keyValue) {
        keyValid = true;
        matchedKey = key;
        break;
      }
    }

    if (!keyValid) {
      return c.json({ error: "Invalid or expired access key" }, 403);
    }

    // 更新密钥使用统计
    if (matchedKey) {
      await db
        .update(accessKeys)
        .set({
          lastUsedAt: new Date(),
          usageCount: matchedKey.usageCount + 1,
        })
        .where(eq(accessKeys.id, matchedKey.id));
    }
  }

  // 解析端点配置
  let config: any;
  try {
    config = JSON.parse(endpoint.config);
  } catch {
    return c.json({ error: "Invalid endpoint configuration" }, 500);
  }

  // 根据端点类型执行
  switch (endpoint.type) {
    case "static": {
      const { content, contentType = "text/plain", headers = {} } = config;

      // 设置响应头
      Object.entries(headers).forEach(([key, value]) => {
        c.header(key, value as string);
      });

      // 确保 Content-Type 包含 charset=utf-8
      const finalContentType = contentType.includes("charset")
        ? contentType
        : `${contentType}; charset=utf-8`;

      return c.body(content, {
        headers: {
          "Content-Type": finalContentType,
        },
      });
    }

    case "proxy": {
      const { targetUrl, headers = {}, removeHeaders = [], timeout = 10000 } = config;

      // 直接使用目标 URL，不再进行路径映射处理
      const finalUrl = targetUrl;

      // 准备请求头
      const proxyHeaders: Record<string, string> = {
        ...Object.fromEntries(c.req.raw.headers),
        ...headers,
      };

      // 移除指定的请求头
      removeHeaders.forEach((header: string) => {
        delete proxyHeaders[header.toLowerCase()];
      });

      // 删除某些不应该转发的头
      delete proxyHeaders["host"];
      delete proxyHeaders["x-access-key"];

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const proxyResponse = await fetch(finalUrl, {
          method: c.req.method,
          headers: proxyHeaders,
          body: c.req.method !== "GET" && c.req.method !== "HEAD" ? await c.req.raw.clone().arrayBuffer() : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // 转发响应
        const responseHeaders: Record<string, string> = {};
        proxyResponse.headers.forEach((value, key) => {
          responseHeaders[key] = value;
        });

        return new Response(proxyResponse.body, {
          status: proxyResponse.status,
          headers: responseHeaders,
        });
        
      } catch (error: any) {
        if (error.name === "AbortError") {
          return c.json({ error: "Proxy timeout" }, 504);
        }
        return c.json({ error: "Proxy error", details: error.message }, 502);
      }
    }

    case "script": {
      // Script 端点在 Phase 2/3 实现
      return c.json({ error: "Script endpoints not yet supported" }, 501);
    }

    default:
      return c.json({ error: "Unknown endpoint type" }, 500);
  }
});

export default app;
