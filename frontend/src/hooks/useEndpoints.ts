import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Endpoint,
  EndpointTreeNode,
  CreateEndpointInput,
  UpdateEndpointInput,
  ApiResponse,
  EndpointsListData,
} from "../../../common/types";
import { getApiBase, getAuthHeaders } from "../../../common/config/api";

const API_BASE = getApiBase();

// ==================== 查询端点列表 ====================

export function useEndpoints(view: "tree" | "flat" = "flat") {
  return useQuery({
    queryKey: ["endpoints", view],
    queryFn: async () => {
      const sessionToken = localStorage.getItem("auth_token");
      if (!sessionToken) {
        throw new Error("Not authenticated");
      }

      const response = await fetch(`${API_BASE}/api/endpoints?view=${view}`, {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({ message: "获取端点列表失败" }))) as any;
        throw new Error(errorData.message || "获取端点列表失败");
      }

      return response.json() as Promise<ApiResponse<EndpointsListData>>;
    },
  });
}

// ==================== 查询单个端点详情 ====================

export function useEndpoint(id: string | null) {
  return useQuery({
    queryKey: ["endpoint", id],
    queryFn: async () => {
      if (!id) {
        throw new Error("No endpoint ID provided");
      }

      const sessionToken = localStorage.getItem("auth_token");
      if (!sessionToken) {
        throw new Error("Not authenticated");
      }

      const response = await fetch(`${API_BASE}/api/endpoints/${id}`, {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({ message: "获取端点详情失败" }))) as any;
        throw new Error(errorData.message || "获取端点详情失败");
      }

      return response.json() as Promise<ApiResponse<Endpoint>>;
    },
    enabled: !!id,
    staleTime: 0, // 总是重新获取最新数据
    gcTime: 5 * 60 * 1000, // 垃圾回收时间5分钟
  });
}

// ==================== 创建端点 ====================

export function useCreateEndpoint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateEndpointInput) => {
      const sessionToken = localStorage.getItem("auth_token");
      if (!sessionToken) {
        throw new Error("Not authenticated");
      }

      const response = await fetch(`${API_BASE}/api/endpoints`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({ message: "创建端点失败" }))) as any;

        // 提取详细错误信息
        let errorMessage = "创建端点失败";

        if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.error?.issues) {
          // Zod 验证错误
          const issues = errorData.error.issues;
          const messages = issues.map((issue: any) => {
            const path = issue.path?.join(".") || "";
            return `${path ? path + ": " : ""}${issue.message}`;
          });
          errorMessage = messages.join("; ");
        }

        throw new Error(errorMessage);
      }

      return response.json() as Promise<ApiResponse<{ endpoint: Endpoint }>>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["endpoints"] });
    },
  });
}

// ==================== 更新端点 ====================

export function useUpdateEndpoint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateEndpointInput & { id: string }) => {
      const sessionToken = localStorage.getItem("auth_token");
      if (!sessionToken) {
        throw new Error("Not authenticated");
      }

      const response = await fetch(`${API_BASE}/api/endpoints/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({ message: "更新端点失败" }))) as any;

        let errorMessage = "更新端点失败";
        if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.error?.issues) {
          const issues = errorData.error.issues;
          const messages = issues.map((issue: any) => {
            const path = issue.path?.join(".") || "";
            return `${path ? path + ": " : ""}${issue.message}`;
          });
          errorMessage = messages.join("; ");
        }

        throw new Error(errorMessage);
      }

      return response.json() as Promise<ApiResponse<Endpoint>>;
    },
    onSuccess: (data, variables) => {
      // 刷新树列表
      queryClient.invalidateQueries({ queryKey: ["endpoints"] });
      // 刷新当前端点的详情缓存
      queryClient.invalidateQueries({ queryKey: ["endpoint", variables.id] });
    },
  });
}

// ==================== 删除端点 ====================

export function useDeleteEndpoint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const sessionToken = localStorage.getItem("auth_token");
      if (!sessionToken) {
        throw new Error("Not authenticated");
      }

      const response = await fetch(`${API_BASE}/api/endpoints/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({ message: "删除端点失败" }))) as any;
        throw new Error(errorData.message || "删除端点失败");
      }

      return response.json() as Promise<ApiResponse>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["endpoints"] });
    },
  });
}

// ==================== 发布端点 ====================

export function usePublishEndpoint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const sessionToken = localStorage.getItem("auth_token");
      if (!sessionToken) {
        throw new Error("Not authenticated");
      }

      const response = await fetch(`${API_BASE}/api/endpoints/${id}/publish`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({ message: "发布端点失败" }))) as any;
        throw new Error(errorData.message || "发布端点失败");
      }

      return response.json() as Promise<ApiResponse>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["endpoints"] });
    },
  });
}

// ==================== 取消发布端点 ====================

export function useUnpublishEndpoint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const sessionToken = localStorage.getItem("auth_token");
      if (!sessionToken) {
        throw new Error("Not authenticated");
      }

      const response = await fetch(`${API_BASE}/api/endpoints/${id}/unpublish`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({ message: "取消发布失败" }))) as any;
        throw new Error(errorData.message || "取消发布失败");
      }

      return response.json() as Promise<ApiResponse>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["endpoints"] });
    },
  });
}
