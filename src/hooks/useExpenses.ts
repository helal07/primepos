import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface ExpenseInput {
  expense_date: string;
  category_id?: string | null;
  sub_category_id?: string | null;
  location_id?: string | null;
  account_id?: string | null;
  payment_status: string;
  payment_method?: string | null;
  tax_amount: number;
  total_amount: number;
  payment_due: number;
  contact_name?: string | null;
  expense_for_user_id?: string | null;
  expense_note?: string | null;
  recurring?: boolean;
  recurring_interval?: string | null;
  recurring_repetitions?: number | null;
  attachment_url?: string | null;
}

export function useExpenses(filters?: { from?: string; to?: string; categoryId?: string; status?: string }) {
  return useQuery({
    queryKey: ["expenses", filters],
    queryFn: async () => {
      let q = supabase
        .from("expenses" as any)
        .select("*, expense_categories!expenses_category_id_fkey(name), sub:expense_categories!expenses_sub_category_id_fkey(name), warehouses(name)")
        .order("expense_date", { ascending: false });
      if (filters?.from) q = q.gte("expense_date", filters.from);
      if (filters?.to) q = q.lte("expense_date", filters.to + "T23:59:59");
      if (filters?.categoryId) q = q.eq("category_id", filters.categoryId);
      if (filters?.status && filters.status !== "all") q = q.eq("payment_status", filters.status);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

export function useExpense(id: string | undefined) {
  return useQuery({
    queryKey: ["expense", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("expenses" as any).select("*").eq("id", id!).maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });
}

export function useExpenseMutations() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const create = useMutation({
    mutationFn: async (input: ExpenseInput) => {
      const { error } = await supabase.from("expenses" as any).insert({ ...input, created_by: user?.id });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["expenses"] }); toast.success("Expense added"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...input }: ExpenseInput & { id: string }) => {
      const { error } = await supabase.from("expenses" as any).update(input).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["expenses"] }); toast.success("Expense updated"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("expenses" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["expenses"] }); toast.success("Expense deleted"); },
    onError: (e: Error) => toast.error(e.message),
  });

  return { create, update, remove };
}

export function useExpenseCategories() {
  return useQuery({
    queryKey: ["expense_categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("expense_categories" as any).select("*").order("name");
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

export function useExpenseCategoryMutations() {
  const qc = useQueryClient();
  const create = useMutation({
    mutationFn: async (input: { name: string; parent_id?: string | null; is_active?: boolean }) => {
      const { error } = await supabase.from("expense_categories" as any).insert(input);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["expense_categories"] }); toast.success("Category created"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const update = useMutation({
    mutationFn: async ({ id, ...input }: { id: string; name?: string; parent_id?: string | null; is_active?: boolean }) => {
      const { error } = await supabase.from("expense_categories" as any).update(input).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["expense_categories"] }); toast.success("Category updated"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("expense_categories" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["expense_categories"] }); toast.success("Category deleted"); },
    onError: (e: Error) => toast.error(e.message),
  });
  return { create, update, remove };
}