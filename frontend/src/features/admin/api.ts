import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { request, requestData } from "../../lib/api";
import { toView, type EndpointView, type EndpointWire } from "../endpoints/model";

export type AdminUser = {
  id: string;
  username: string;
  email: string | null;
  avatarUrl: string | null;
  role: "user" | "admin";
  isActivated: boolean;
  lastLoginAt: string | null;
  createdAt: string;
};

export type AdminStats = {
  totalUsers: number;
  activatedUsers: number;
  totalEndpoints: number;
  publishedEndpoints: number;
  totalPermissionGroups: number;
  totalAccessKeys: number;
};

const keys = {
  all: ["signal", "admin"] as const,
  stats: () => [...keys.all, "stats"] as const,
  users: (search: string, activated: string) => [...keys.all, "users", search, activated] as const,
  userEndpoints: (id: string) => [...keys.all, "user-endpoints", id] as const,
};

export function useAdminStats() {
  return useQuery({ queryKey: keys.stats(), queryFn: () => requestData<AdminStats>("/admin/stats"), staleTime: 30_000 });
}

export function useAdminUsers(search: string, activated: "all" | "true" | "false") {
  return useQuery({
    queryKey: keys.users(search, activated),
    queryFn: async () => {
      const params = new URLSearchParams({ pageSize: "100" });
      if (search.trim()) params.set("search", search.trim());
      if (activated !== "all") params.set("isActivated", activated);
      return requestData<{ users: AdminUser[]; total: number }>(`/admin/users?${params}`);
    },
    placeholderData: keepPreviousData,
  });
}

type TreeNode = EndpointWire & { children?: TreeNode[] };

/** The admin tree nests by parentId; flatten it and let the namespace derive structure from paths. */
export function useAdminUserEndpoints(userId: string | undefined) {
  return useQuery({
    queryKey: keys.userEndpoints(userId ?? ""),
    queryFn: async () => {
      const { tree } = await requestData<{ tree: TreeNode[] }>(`/admin/users/${encodeURIComponent(userId!)}/endpoints`);
      const flat: EndpointView[] = [];
      const walk = (nodes: TreeNode[]) =>
        nodes.forEach(({ children, ...node }) => {
          flat.push(toView(node));
          if (children?.length) walk(children);
        });
      walk(tree);
      return flat;
    },
    enabled: Boolean(userId),
  });
}

function useInvalidateAdmin() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: keys.all });
}

export function useSetActivation() {
  const invalidate = useInvalidateAdmin();
  return useMutation({
    mutationFn: ({ id, activate }: { id: string; activate: boolean }) =>
      request(`/admin/users/${encodeURIComponent(id)}/${activate ? "activate" : "deactivate"}`, { method: "POST" }),
    onSuccess: invalidate,
  });
}

export function useDeleteUser() {
  const invalidate = useInvalidateAdmin();
  return useMutation({
    mutationFn: (id: string) => request(`/admin/users/${encodeURIComponent(id)}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });
}

export function useForceUnpublish() {
  const invalidate = useInvalidateAdmin();
  return useMutation({
    mutationFn: (id: string) => request(`/admin/endpoints/${encodeURIComponent(id)}/force-unpublish`, { method: "POST" }),
    onSuccess: invalidate,
  });
}
