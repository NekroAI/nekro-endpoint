import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  PermissionGroup,
  CreatePermissionGroupInput,
  UpdatePermissionGroupInput,
  ApiResponse,
  PermissionGroupsListData,
} from "../../../common/types";
import { getApiBase } from "../../../common/config/api";

const API_BASE = getApiBase();

// ==================== 查询权限组列表 ====================

export function usePermissionGroups() {
  return useQuery({
    queryKey: ["permissionGroups"],
    queryFn: async () => {
      const sessionToken = localStorage.getItem("auth_token");
      if (!sessionToken) {
        throw new Error("Not authenticated");
      }

      const response = await fetch(`${API_BASE}/api/permission-groups`, {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("获取权限组列表失败");
      }

      return response.json() as Promise<ApiResponse<PermissionGroupsListData>>;
    },
  });
}

// ==================== 查询单个权限组详情 ====================

export function usePermissionGroup(id: string) {
  return useQuery({
    queryKey: ["permissionGroup", id],
    queryFn: async () => {
      const sessionToken = localStorage.getItem("auth_token");
      if (!sessionToken) {
        throw new Error("Not authenticated");
      }

      const response = await fetch(`${API_BASE}/api/permission-groups/${id}`, {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("获取权限组详情失败");
      }

      return response.json() as Promise<
        ApiResponse<{ group: PermissionGroup; keysCount?: number; endpointsCount?: number }>
      >;
    },
    enabled: !!id,
  });
}

// ==================== 创建权限组 ====================

export function useCreatePermissionGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreatePermissionGroupInput) => {
      const sessionToken = localStorage.getItem("auth_token");
      if (!sessionToken) {
        throw new Error("Not authenticated");
      }

      const response = await fetch(`${API_BASE}/api/permission-groups`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({ message: "创建权限组失败" }))) as any;
        throw new Error(errorData.message || "创建权限组失败");
      }

      return response.json() as Promise<ApiResponse<{ group: PermissionGroup }>>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["permissionGroups"] });
    },
  });
}

// ==================== 更新权限组 ====================

export function useUpdatePermissionGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdatePermissionGroupInput & { id: string }) => {
      const sessionToken = localStorage.getItem("auth_token");
      if (!sessionToken) {
        throw new Error("Not authenticated");
      }

      const response = await fetch(`${API_BASE}/api/permission-groups/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({ message: "更新权限组失败" }))) as any;
        throw new Error(errorData.message || "更新权限组失败");
      }

      return response.json() as Promise<ApiResponse<{ group: PermissionGroup }>>;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["permissionGroups"] });
      queryClient.invalidateQueries({ queryKey: ["permissionGroup", variables.id] });
    },
  });
}

// ==================== 删除权限组 ====================

export function useDeletePermissionGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const sessionToken = localStorage.getItem("auth_token");
      if (!sessionToken) {
        throw new Error("Not authenticated");
      }

      const response = await fetch(`${API_BASE}/api/permission-groups/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({ message: "删除权限组失败" }))) as any;
        throw new Error(errorData.message || "删除权限组失败");
      }

      return response.json() as Promise<ApiResponse>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["permissionGroups"] });
    },
  });
}
