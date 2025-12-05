/**
 * 安全工具函数
 * 用于防护 SSRF、路径遍历等安全问题
 */

/**
 * 内网地址黑名单
 */
const BLOCKED_HOSTS = [
  "127.0.0.1",
  "localhost",
  "0.0.0.0",
  "169.254.169.254", // AWS/GCP metadata
  "metadata.google.internal", // GCP metadata
  "::1", // IPv6 localhost
  "0:0:0:0:0:0:0:1", // IPv6 localhost
];

/**
 * 内网 IP 范围（CIDR 格式）
 */
const BLOCKED_IP_RANGES = [
  /^10\./, // 10.0.0.0/8
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12
  /^192\.168\./, // 192.168.0.0/16
  /^fc00:/, // IPv6 私有地址
  /^fd[0-9a-f]{2}:/, // IPv6 唯一本地地址
];

/**
 * 验证目标 URL 是否安全（防止 SSRF 攻击）
 * @param url 目标 URL
 * @returns 是否安全
 */
export function isTargetUrlSafe(url: string): boolean {
  try {
    const parsed = new URL(url);

    // 检查协议：只允许 HTTP 和 HTTPS
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return false;
    }

    // 检查主机名黑名单
    const hostname = parsed.hostname.toLowerCase();
    if (BLOCKED_HOSTS.includes(hostname)) {
      return false;
    }

    // 检查 IP 地址范围
    for (const pattern of BLOCKED_IP_RANGES) {
      if (pattern.test(hostname)) {
        return false;
      }
    }

    // 检查端口：禁止访问非标准端口（可选）
    // 允许 80 (http) 和 443 (https) 以及空端口
    if (parsed.port && parsed.port !== "80" && parsed.port !== "443") {
      // 这里可以根据需要放宽限制
      // 暂时允许所有端口，但记录日志
      console.warn(`[Security] Non-standard port detected: ${parsed.port} for ${url}`);
    }

    return true;
  } catch {
    // URL 解析失败
    return false;
  }
}

/**
 * 规范化路径，防止路径遍历攻击
 * @param path 原始路径
 * @returns 清理后的安全路径
 */
export function sanitizePath(path: string): string {
  return (
    path
      .replace(/\.\./g, "") // 移除 ..
      .replace(/\/+/g, "/") // 合并多个斜杠
      // 移除开头的多余斜杠但保留一个
      .replace(/^\/+/, "/")
  );
}

/**
 * 检查路径是否匹配白名单
 * @param path 要检查的路径
 * @param allowedPaths 允许的路径模式列表（支持通配符 *）
 * @returns 是否匹配
 */
export function isPathAllowed(path: string, allowedPaths: string[]): boolean {
  if (!allowedPaths || allowedPaths.length === 0) {
    return true; // 没有白名单则全部允许
  }

  return allowedPaths.some((pattern) => {
    // 将通配符模式转换为正则表达式
    const regexPattern = "^" + pattern.replace(/\*/g, ".*").replace(/\//g, "\\/") + "$";
    const regex = new RegExp(regexPattern);
    return regex.test(path);
  });
}

/**
 * 验证 dynamicProxy 配置是否安全
 * @param config dynamicProxy 配置
 * @returns 验证结果
 */
export function validateDynamicProxyConfig(config: { baseUrl: string; allowedPaths?: string[] }): {
  valid: boolean;
  error?: string;
} {
  // 如果 baseUrl 为空，跳过验证（创建阶段）
  if (!config.baseUrl || config.baseUrl.trim() === "") {
    return { valid: true };
  }

  // 检查基础 URL 安全性
  if (!isTargetUrlSafe(config.baseUrl)) {
    return {
      valid: false,
      error: "目标地址不安全或不允许访问（禁止访问内网地址）",
    };
  }

  // 验证路径白名单格式
  if (config.allowedPaths && config.allowedPaths.length > 0) {
    for (const pattern of config.allowedPaths) {
      if (!pattern.startsWith("/")) {
        return {
          valid: false,
          error: `路径白名单格式错误: "${pattern}" 必须以 / 开头`,
        };
      }
    }
  }

  return { valid: true };
}
