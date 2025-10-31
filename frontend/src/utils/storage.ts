// 检查是否在浏览器环境中
const isBrowser = typeof window !== "undefined";

// 安全的 localStorage 操作工具
export const safeLocalStorage = {
  getItem: (key: string): string | null => {
    if (!isBrowser) return null;
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error("localStorage.getItem error:", error);
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    if (!isBrowser) return;
    try {
      localStorage.setItem(key, value);
      // 触发自定义事件通知其他组件 localStorage 已更改
      if (key === "auth_token") {
        window.dispatchEvent(new Event("auth_token_changed"));
      }
    } catch (error) {
      console.error("localStorage.setItem error:", error);
    }
  },
  removeItem: (key: string): void => {
    if (!isBrowser) return;
    try {
      localStorage.removeItem(key);
      // 触发自定义事件通知其他组件 localStorage 已更改
      if (key === "auth_token") {
        window.dispatchEvent(new Event("auth_token_changed"));
      }
    } catch (error) {
      console.error("localStorage.removeItem error:", error);
    }
  },
};

// 检查是否在浏览器环境中的便捷函数
export { isBrowser };
