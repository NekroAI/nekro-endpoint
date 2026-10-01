import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { request, requestData } from "../../lib/api";

export type ActivationStatus = "pending" | "approved" | "rejected";
export type ActivationRequest = {
  id: string;
  message: string | null;
  status: ActivationStatus;
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
};
export type AdminActivationRequest = ActivationRequest & {
  user: { id: string; username: string; email: string | null; avatarUrl: string | null; createdAt: string };
};

const keys = {
  mine: ["signal", "activation", "mine"] as const,
  admin: ["signal", "activation", "admin"] as const,
};

export function useMyActivation(enabled = true) {
  return useQuery({
    queryKey: keys.mine,
    queryFn: () => requestData<{ activated: boolean; request: ActivationRequest | null }>("/activation-request"),
    enabled,
    retry: false,
  });
}

export function useSubmitActivation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (message: string) => requestData<{ request: ActivationRequest }>("/activation-request", { method: "POST", body: { message } }),
    onSuccess: () => client.invalidateQueries({ queryKey: keys.mine }),
  });
}

export function useAdminActivations(enabled = true) {
  return useQuery({
    queryKey: keys.admin,
    queryFn: () => requestData<{ requests: AdminActivationRequest[]; pending: number }>("/admin/activation-requests"),
    enabled,
    retry: false,
    staleTime: 30_000,
  });
}

export function useReviewActivation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action, note }: { id: string; action: "approve" | "reject"; note?: string }) =>
      request(`/admin/activation-requests/${encodeURIComponent(id)}/${action}`, { method: "POST", body: { note } }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: keys.admin });
      void client.invalidateQueries({ queryKey: ["signal", "admin"] });
    },
  });
}
