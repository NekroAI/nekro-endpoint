import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateEndpointInput, UpdateEndpointInput } from "../../../../common/types";
import { request, requestData } from "../../lib/api";
import { toView, type EndpointView, type EndpointWire } from "./model";

export const endpointKeys = {
  all: ["signal", "endpoints"] as const,
  list: () => [...endpointKeys.all, "list"] as const,
  detail: (id: string) => [...endpointKeys.all, "detail", id] as const,
};

/** Every endpoint including disabled ones: the UI shows them dimmed. */
export function useEndpointList() {
  return useQuery({
    queryKey: endpointKeys.list(),
    queryFn: async () => {
      const data = await requestData<{ endpoints: EndpointWire[] }>("/endpoints?view=flat&includeDisabled=true");
      return data.endpoints.map(toView);
    },
    staleTime: 15_000,
  });
}

export function useEndpointDetail(id: string | undefined) {
  return useQuery({
    queryKey: endpointKeys.detail(id ?? ""),
    queryFn: async () => toView(await requestData<EndpointWire>(`/endpoints/${encodeURIComponent(id!)}`)),
    enabled: Boolean(id),
    staleTime: 0,
  });
}

function useInvalidate() {
  const client = useQueryClient();
  return (endpoint?: EndpointView) => {
    void client.invalidateQueries({ queryKey: endpointKeys.list() });
    if (endpoint) client.setQueryData(endpointKeys.detail(endpoint.id), endpoint);
    // Legacy pages share the backend; keep their caches honest too.
    void client.invalidateQueries({ queryKey: ["endpoints"] });
  };
}

export function useCreateEndpoint() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (input: CreateEndpointInput) =>
      toView((await requestData<{ endpoint: EndpointWire }>("/endpoints", { method: "POST", body: input })).endpoint),
    onSuccess: (endpoint) => invalidate(endpoint),
  });
}

export function useUpdateEndpoint() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ id, ...patch }: UpdateEndpointInput & { id: string }) =>
      toView(
        (await requestData<{ endpoint: EndpointWire }>(`/endpoints/${encodeURIComponent(id)}`, {
          method: "PATCH",
          body: patch,
        })).endpoint,
      ),
    onSuccess: (endpoint) => invalidate(endpoint),
  });
}

export function useSetPublished() {
  const client = useQueryClient();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ id, publish }: { id: string; publish: boolean }) => {
      await request(`/endpoints/${encodeURIComponent(id)}/${publish ? "publish" : "unpublish"}`, { method: "POST" });
      return { id, publish };
    },
    onSuccess: ({ id, publish }) => {
      const detail = client.getQueryData<EndpointView>(endpointKeys.detail(id));
      if (detail) client.setQueryData(endpointKeys.detail(id), { ...detail, isPublished: publish });
      client.setQueryData<EndpointView[]>(endpointKeys.list(), (list) =>
        list?.map((endpoint) => (endpoint.id === id ? { ...endpoint, isPublished: publish } : endpoint)),
      );
      invalidate();
    },
  });
}

export function useDeleteEndpoint() {
  const client = useQueryClient();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (id: string) => {
      await request(`/endpoints/${encodeURIComponent(id)}`, { method: "DELETE" });
      return id;
    },
    onSuccess: (id) => {
      client.setQueryData<EndpointView[]>(endpointKeys.list(), (list) => list?.filter((endpoint) => endpoint.id !== id));
      client.removeQueries({ queryKey: endpointKeys.detail(id) });
      invalidate();
    },
  });
}

export function useReorderEndpoints() {
  const client = useQueryClient();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (orders: { id: string; sortOrder: number }[]) => {
      await request("/endpoints/reorder", { method: "POST", body: { orders } });
      return orders;
    },
    onMutate: (orders) => {
      const map = new Map(orders.map((order) => [order.id, order.sortOrder]));
      client.setQueryData<EndpointView[]>(endpointKeys.list(), (list) =>
        list?.map((endpoint) => (map.has(endpoint.id) ? { ...endpoint, sortOrder: map.get(endpoint.id)! } : endpoint)),
      );
    },
    onSettled: () => invalidate(),
  });
}
