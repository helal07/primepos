import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toFriendlyError } from "@/lib/friendlyError";
import { useToast } from "@/hooks/use-toast";
import { rest } from "@/lib/restResource";
import type { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

// Stage 9c — migrated from supabase.from() to /api/rest. Query keys preserved
// so consumer pages continue to work without changes.

export function useCustomers() {
  return useQuery({
    queryKey: ["customers"],
    queryFn: () => rest.all("customers", { sort: "name", perPage: 500 }),
  });
}

export function useCustomerMutations() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["customers"] });

  const create = useMutation({
    mutationFn: (c: TablesInsert<"customers">) =>
      rest.create("customers", c as unknown as Record<string, unknown>),
    onSuccess: () => { invalidate(); toast({ title: "Customer created" }); },
    onError: (e: Error) => toast({ title: "Error", description: toFriendlyError(e), variant: "destructive" }),
  });

  const update = useMutation({
    mutationFn: ({ id, ...updates }: TablesUpdate<"customers"> & { id: string }) =>
      rest.update("customers", id, updates as Record<string, unknown>),
    onSuccess: () => { invalidate(); toast({ title: "Customer updated" }); },
    onError: (e: Error) => toast({ title: "Error", description: toFriendlyError(e), variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => rest.remove("customers", id),
    onSuccess: () => { invalidate(); toast({ title: "Customer deleted" }); },
    onError: (e: Error) => toast({ title: "Error", description: toFriendlyError(e), variant: "destructive" }),
  });

  return { create, update, remove };
}

export function useSuppliers() {
  return useQuery({
    queryKey: ["suppliers"],
    queryFn: () => rest.all("suppliers", { sort: "name", perPage: 500 }),
  });
}

export function useSupplierMutations() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["suppliers"] });

  const create = useMutation({
    mutationFn: (s: TablesInsert<"suppliers">) =>
      rest.create("suppliers", s as unknown as Record<string, unknown>),
    onSuccess: () => { invalidate(); toast({ title: "Supplier created" }); },
    onError: (e: Error) => toast({ title: "Error", description: toFriendlyError(e), variant: "destructive" }),
  });

  const update = useMutation({
    mutationFn: ({ id, ...updates }: TablesUpdate<"suppliers"> & { id: string }) =>
      rest.update("suppliers", id, updates as Record<string, unknown>),
    onSuccess: () => { invalidate(); toast({ title: "Supplier updated" }); },
    onError: (e: Error) => toast({ title: "Error", description: toFriendlyError(e), variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => rest.remove("suppliers", id),
    onSuccess: () => { invalidate(); toast({ title: "Supplier deleted" }); },
    onError: (e: Error) => toast({ title: "Error", description: toFriendlyError(e), variant: "destructive" }),
  });

  return { create, update, remove };
}
