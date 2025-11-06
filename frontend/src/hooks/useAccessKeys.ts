import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AccessKey,
  AccessKeyWithPlain,
  CreateAccessKeyInput,
  UpdateAccessKeyInput,
  ApiResponse,
  AccessKeysListData,
} from "../../../common/types";
import { getApiBase } from "../../../common/config/api";

const API_BASE = getApiBase();

// ==================== 查询权限组的访问密钥列表 ====================

export function useAccessKeys(groupId: string) {
  return useQuery({
    queryKey: ["accessKeys", groupId],
    queryFn: async () => {
      const sessionToken = localStorage.getItem("auth_token");
      if (!sessionToken) {
        throw new Error("Not authenticated");
      }

      const response = await fetch(`${API_BASE}/api/permission-groups/${groupId}/keys`, {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("获取访问密钥列表失败");
      }

      return response.json() as Promise<ApiResponse<AccessKeysListData>>;
    },
    enabled: !!groupId,
  });
}

// ==================== 创建访问密钥 ====================

export function useCreateAccessKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ groupId, ...data }: CreateAccessKeyInput & { groupId: string }) => {
      const sessionToken = localStorage.getItem("auth_token");
      if (!sessionToken) {
        throw new Error("Not authenticated");
      }

      const response = await fetch(`${API_BASE}/api/permission-groups/${groupId}/keys`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({ message: "创建访问密钥失败" }))) as any;
        throw new Error(errorData.message || "创建访问密钥失败");
      }

      return response.json() as Promise<ApiResponse<{ key: AccessKeyWithPlain }>>;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["accessKeys", variables.groupId] });
    },
  });
}

// ==================== 更新访问密钥 ====================

export function useUpdateAccessKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, groupId, ...data }: UpdateAccessKeyInput & { id: string; groupId: string }) => {
      const sessionToken = localStorage.getItem("auth_token");
      if (!sessionToken) {
        throw new Error("Not authenticated");
      }

      const response = await fetch(`${API_BASE}/api/access-keys/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({ message: "更新访问密钥失败" }))) as any;
        throw new Error(errorData.message || "更新访问密钥失败");
      }

      return response.json() as Promise<ApiResponse<{ key: AccessKey }>>;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["accessKeys", variables.groupId] });
    },
  });
}

// ==================== 撤销访问密钥 ====================

export function useRevokeAccessKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, groupId }: { id: string; groupId: string }) => {
      const sessionToken = localStorage.getItem("auth_token");
      if (!sessionToken) {
        throw new Error("Not authenticated");
      }

      const response = await fetch(`${API_BASE}/api/access-keys/${id}/revoke`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({ message: "撤销访问密钥失败" }))) as any;
        throw new Error(errorData.message || "撤销访问密钥失败");
      }

      return response.json() as Promise<ApiResponse>;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["accessKeys", variables.groupId] });
    },
  });
}

// ==================== 删除访问密钥 ====================

export function useDeleteAccessKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, groupId }: { id: string; groupId: string }) => {
      const sessionToken = localStorage.getItem("auth_token");
      if (!sessionToken) {
        throw new Error("Not authenticated");
      }

      const response = await fetch(`${API_BASE}/api/access-keys/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({ message: "删除访问密钥失败" }))) as any;
        throw new Error(errorData.message || "删除访问密钥失败");
      }

      return response.json() as Promise<ApiResponse>;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["accessKeys", variables.groupId] });
    },
  });
}
