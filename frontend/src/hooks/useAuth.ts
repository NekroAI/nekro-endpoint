import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useMemo } from "react";
import { safeLocalStorage, isBrowser } from "../utils/storage";
import type { User, ApiResponse } from "../../../common/types";
import { UserInfoSchema } from "../../../common/validators/auth.schema";

// 认证响应类型
interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    user: User;
    sessionToken: string;
  };
}

// API 函数
const authApi = {
  // 获取 GitHub OAuth 登录 URL
  getLoginUrl: async (): Promise<{ authUrl: string; state: string }> => {
    const response = await fetch("/api/auth/github");
    const data: any = await response.json();
    if (!data.success) {
      throw new Error(data.message);
    }
    return data.data;
  },

  // 获取当前用户信息
  getCurrentUser: async (): Promise<User> => {
    const token = safeLocalStorage.getItem("auth_token");
    if (!token) {
      throw new Error("No auth token found");
    }

    const response = await fetch("/api/auth/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        safeLocalStorage.removeItem("auth_token");
        throw new Error("Token expired");
      }
      throw new Error("Failed to fetch user");
    }

    // 使用 Zod Schema 验证并确保类型正确
    const data = await response.json();
    return UserInfoSchema.parse(data) as User;
  },

  // 登出
  logout: async (): Promise<void> => {
    const token = safeLocalStorage.getItem("auth_token");
    if (token) {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      safeLocalStorage.removeItem("auth_token");
    }
  },
};

// 封装 fetch 并添加认证头
export const fetchWithAuth = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const token = safeLocalStorage.getItem("auth_token");
  const headers = new Headers(init?.headers);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const newInit: RequestInit = {
    ...init,
    headers,
  };

  return fetch(input, newInit);
};

// 自定义 Hook
export function useAuth(): {
  user: User | undefined;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: Error | null;
  login: () => void;
  logout: () => void;
  refetch: () => Promise<any>;
  isLoginLoading: boolean;
  isLogoutLoading: boolean;
} {
  const queryClient = useQueryClient();
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasToken, setHasToken] = useState(() => !!safeLocalStorage.getItem("auth_token"));

  // 查询当前用户
  const {
    data: user,
    isLoading,
    error,
    refetch,
  } = useQuery<User>({
    queryKey: ["auth", "user"],
    queryFn: authApi.getCurrentUser,
    enabled: hasToken,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  // 获取登录 URL
  const loginMutation = useMutation({
    mutationFn: authApi.getLoginUrl,
    onSuccess: (data) => {
      // 跳转到 GitHub 授权页面
      if (isBrowser) {
        window.location.href = data.authUrl;
      }
    },
    onError: (error: Error) => {
      console.error("登录失败:", error);
      if (isBrowser) {
        alert(
          `登录失败: ${error.message}\n\n请检查：\n1. GitHub OAuth 是否已配置\n2. .dev.vars 文件是否存在并包含正确的 GITHUB_CLIENT_ID 和 GITHUB_CLIENT_SECRET`,
        );
      }
    },
  });

  // 登出
  const logoutMutation = useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      safeLocalStorage.removeItem("auth_token");
      setHasToken(false);
      queryClient.clear();
      if (isBrowser) {
        window.location.href = "/";
      }
    },
  });

  useEffect(() => {
    setHasToken(!!safeLocalStorage.getItem("auth_token"));
    setIsInitialized(true);

    // 监听 storage 事件，当其他标签页或组件修改 localStorage 时同步状态
    const handleStorageChange = () => {
      const newToken = !!safeLocalStorage.getItem("auth_token");
      console.log("Auth token changed, updating hasToken:", newToken);
      setHasToken(newToken);
    };

    if (isBrowser) {
      window.addEventListener("storage", handleStorageChange);
      // 添加自定义事件监听，用于同一标签页内的 localStorage 变化
      window.addEventListener("auth_token_changed", handleStorageChange);
    }

    return () => {
      if (isBrowser) {
        window.removeEventListener("storage", handleStorageChange);
        window.removeEventListener("auth_token_changed", handleStorageChange);
      }
    };
  }, []);

  // 增强的 refetch 函数，同时更新 hasToken 状态
  const enhancedRefetch = async () => {
    const currentToken = !!safeLocalStorage.getItem("auth_token");
    setHasToken(currentToken);
    if (currentToken) {
      return await refetch();
    }
  };

  // 登录函数
  const login = () => {
    loginMutation.mutate();
  };

  // 登出函数
  const logout = () => {
    logoutMutation.mutate();
  };

  // 检查是否已登录 - 使用 useMemo 稳定引用
  const isAuthenticated = useMemo(() => !!user && hasToken, [user, hasToken]);

  // 调试日志
  // console.log("useAuth 状态:", {
  //   user: user ? `${user.username} (${user.id})` : null,
  //   hasToken,
  //   isAuthenticated,
  //   isLoading,
  //   isInitialized,
  // });

  return {
    user,
    isAuthenticated,
    isLoading: isLoading || !isInitialized,
    error,
    login,
    logout,
    refetch: enhancedRefetch,
    isLoginLoading: loginMutation.isPending,
    isLogoutLoading: logoutMutation.isPending,
  };
}
