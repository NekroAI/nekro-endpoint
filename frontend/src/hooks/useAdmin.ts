import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { User, ApiResponse, UsersListData } from "../../../common/types";
import { getApiBase } from "../../../common/config/api";

const API_BASE = getApiBase();

// 管理员统计数据
export interface AdminStats {
  totalUsers: number;
  activatedUsers: number;
  totalEndpoints: number;
  publishedEndpoints: number;
  totalPermissionGroups: number;
  totalAccessKeys: number;
}

// ==================== 查询用户列表 ====================

export function useAdminUsers(params?: {
  page?: number;
  pageSize?: number;
  role?: "user" | "admin";
  isActivated?: boolean;
  search?: string;
}) {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append("page", params.page.toString());
  if (params?.pageSize) queryParams.append("pageSize", params.pageSize.toString());
  if (params?.role) queryParams.append("role", params.role);
  if (params?.isActivated !== undefined) queryParams.append("isActivated", params.isActivated.toString());
  if (params?.search) queryParams.append("search", params.search);

  return useQuery({
    queryKey: ["adminUsers", params],
    queryFn: async () => {
      const sessionToken = localStorage.getItem("auth_token");
      if (!sessionToken) {
        throw new Error("Not authenticated");
      }

      const url = queryParams.toString() ? `${API_BASE}/api/admin/users?${queryParams}` : `${API_BASE}/api/admin/users`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({ message: "获取用户列表失败" }))) as any;
        throw new Error(errorData.message || "获取用户列表失败");
      }

      return response.json() as Promise<ApiResponse<UsersListData>>;
    },
  });
}

// ==================== 激活用户 ====================

export function useActivateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const sessionToken = localStorage.getItem("auth_token");
      if (!sessionToken) {
        throw new Error("Not authenticated");
      }

      const response = await fetch(`${API_BASE}/api/admin/users/${userId}/activate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({ message: "激活用户失败" }))) as any;
        throw new Error(errorData.message || "激活用户失败");
      }

      return response.json() as Promise<ApiResponse>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
    },
  });
}

// ==================== 停用用户 ====================

export function useDeactivateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const sessionToken = localStorage.getItem("auth_token");
      if (!sessionToken) {
        throw new Error("Not authenticated");
      }

      const response = await fetch(`${API_BASE}/api/admin/users/${userId}/deactivate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({ message: "停用用户失败" }))) as any;
        throw new Error(errorData.message || "停用用户失败");
      }

      return response.json() as Promise<ApiResponse>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
    },
  });
}

// ==================== 删除用户 ====================

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const sessionToken = localStorage.getItem("auth_token");
      if (!sessionToken) {
        throw new Error("Not authenticated");
      }

      const response = await fetch(`${API_BASE}/api/admin/users/${userId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({ message: "删除用户失败" }))) as any;
        throw new Error(errorData.message || "删除用户失败");
      }

      return response.json() as Promise<ApiResponse>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
    },
  });
}

// ==================== 获取系统统计 ====================

export function useAdminStats() {
  return useQuery({
    queryKey: ["adminStats"],
    queryFn: async () => {
      const sessionToken = localStorage.getItem("auth_token");
      if (!sessionToken) {
        throw new Error("Not authenticated");
      }

      const response = await fetch(`${API_BASE}/api/admin/stats`, {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({ message: "获取统计数据失败" }))) as any;
        throw new Error(errorData.message || "获取统计数据失败");
      }

      return response.json() as Promise<ApiResponse<AdminStats>>;
    },
  });
}
