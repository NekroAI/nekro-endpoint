import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AccessKey, PermissionGroup } from "../../../../common/types";
import { request, requestData } from "../../lib/api";

export const accessKeys = {
  all: ["signal", "access"] as const,
  groups: () => [...accessKeys.all, "groups"] as const,
  keys: (groupId: string) => [...accessKeys.all, "keys", groupId] as const,
};

export function useGroups() {
  return useQuery({
    queryKey: accessKeys.groups(),
    queryFn: async () => (await requestData<{ groups: PermissionGroup[] }>("/permission-groups")).groups,
    staleTime: 30_000,
  });
}

export function useGroupKeys(groupId: string | undefined) {
  return useQuery({
    queryKey: accessKeys.keys(groupId ?? ""),
    queryFn: async () =>
      (await requestData<{ keys: AccessKey[] }>(`/permission-groups/${encodeURIComponent(groupId!)}/keys`)).keys,
    enabled: Boolean(groupId),
    staleTime: 15_000,
  });
}

/** Keys of several groups at once (sharing a protected endpoint). */
export function useKeysForGroups(groupIds: string[]) {
  const results = useQueries({
    queries: groupIds.map((groupId) => ({
      queryKey: accessKeys.keys(groupId),
      queryFn: async () =>
        (await requestData<{ keys: AccessKey[] }>(`/permission-groups/${encodeURIComponent(groupId)}/keys`)).keys,
      staleTime: 15_000,
    })),
  });
  return {
    keys: results.flatMap((result) => result.data ?? []),
    isLoading: results.some((result) => result.isLoading),
  };
}

function useInvalidateAccess() {
  const client = useQueryClient();
  return () => {
    void client.invalidateQueries({ queryKey: accessKeys.all });
    void client.invalidateQueries({ queryKey: ["permissionGroups"] });
    void client.invalidateQueries({ queryKey: ["accessKeys"] });
  };
}

export function useCreateGroup() {
  const invalidate = useInvalidateAccess();
  return useMutation({
    mutationFn: async (input: { name: string; description?: string }) =>
      (await requestData<{ group: PermissionGroup }>("/permission-groups", { method: "POST", body: input })).group,
    onSuccess: invalidate,
  });
}

export function useUpdateGroup() {
  const invalidate = useInvalidateAccess();
  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string; name?: string; description?: string }) =>
      requestData<unknown>(`/permission-groups/${encodeURIComponent(id)}`, { method: "PATCH", body: input }),
    onSuccess: invalidate,
  });
}

export function useDeleteGroup() {
  const invalidate = useInvalidateAccess();
  return useMutation({
    mutationFn: async (id: string) => request(`/permission-groups/${encodeURIComponent(id)}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });
}

export function useIssueKey() {
  const invalidate = useInvalidateAccess();
  return useMutation({
    mutationFn: async ({ groupId, ...input }: { groupId: string; description?: string; expiresAt?: string }) =>
      (
        await requestData<{ key: AccessKey }>(`/permission-groups/${encodeURIComponent(groupId)}/keys`, {
          method: "POST",
          body: input,
        })
      ).key,
    onSuccess: invalidate,
  });
}

export function useRevokeKey() {
  const invalidate = useInvalidateAccess();
  return useMutation({
    mutationFn: async (id: string) => request(`/access-keys/${encodeURIComponent(id)}/revoke`, { method: "POST" }),
    onSuccess: invalidate,
  });
}

export function useDeleteKey() {
  const invalidate = useInvalidateAccess();
  return useMutation({
    mutationFn: async (id: string) => request(`/access-keys/${encodeURIComponent(id)}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });
}
