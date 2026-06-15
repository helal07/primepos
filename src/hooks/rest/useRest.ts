/**
 * React Query bindings for the generic REST resource layer.
 *
 * Query key convention: ["rest", resource, query?]  — every mutation invalidates
 * ["rest", resource] so any list/detail view refreshes automatically.
 */
import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import { rest, type ListQuery, type ListResult } from "@/lib/restResource";

export function useRestList<T = unknown>(
  resource: string,
  query?: ListQuery,
  options?: Omit<UseQueryOptions<ListResult<T>>, "queryKey" | "queryFn">,
) {
  return useQuery<ListResult<T>>({
    queryKey: ["rest", resource, "list", query ?? {}],
    queryFn: () => rest.list<T>(resource, query),
    ...options,
  });
}

/** Same as useRestList but unwraps `data` for the common case. */
export function useRestAll<T = unknown>(
  resource: string,
  query?: ListQuery,
  options?: Omit<UseQueryOptions<T[]>, "queryKey" | "queryFn">,
) {
  return useQuery<T[]>({
    queryKey: ["rest", resource, "all", query ?? {}],
    queryFn: () => rest.all<T>(resource, query),
    ...options,
  });
}

export function useRestOne<T = unknown>(
  resource: string,
  id: string | null | undefined,
  opts: { with?: string[] } = {},
  options?: Omit<UseQueryOptions<T>, "queryKey" | "queryFn" | "enabled">,
) {
  return useQuery<T>({
    queryKey: ["rest", resource, "one", id, opts],
    queryFn: () => rest.get<T>(resource, id as string, opts),
    enabled: !!id,
    ...options,
  });
}

/** Factory returning create/update/remove mutations with automatic invalidation. */
export function useRestMutations<T = unknown>(resource: string) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["rest", resource] });

  const create = useMutation({
    mutationFn: (body: Record<string, unknown>) => rest.create<T>(resource, body),
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Record<string, unknown> }) =>
      rest.update<T>(resource, id, patch),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id: string) => rest.remove(resource, id),
    onSuccess: invalidate,
  });

  return { create, update, remove, invalidate };
}