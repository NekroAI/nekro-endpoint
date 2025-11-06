/**
 * API 配置文件
 * 统一管理 API 基础路径和通用配置
 */

/** API 基础路径 */
export const getApiBase = () => {
  // 开发环境使用 localhost:8787（wrangler dev）
  // 生产环境使用相对路径（同域名）
  if (typeof window !== "undefined" && import.meta.env?.DEV) {
    return "http://localhost:8787";
  }
  return "";
};

/** 获取认证 header */
export const getAuthHeaders = (sessionToken?: string | null): Record<string, string> => {
  const token = sessionToken || (typeof localStorage !== "undefined" ? localStorage.getItem("auth_token") : null);

  if (!token) {
    return {};
  }

  return {
    Authorization: `Bearer ${token}`,
  };
};

/** 构建完整的 API URL */
export const buildApiUrl = (path: string): string => {
  const base = getApiBase();
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${cleanPath}`;
};
