import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toFriendlyError } from "@/lib/friendlyError";
import { rest } from "@/lib/restResource";
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

/** Alias singular Laravel relations → plural Supabase shape expected by legacy UI. */
function aliasExpense<T extends Record<string, any>>(row: T): T {
  if (!row) return row;
  const out: any = { ...row };
  if (out.category && !out.expense_categories) out.expense_categories = out.category;
  if (out.subCategory && !out.sub) out.sub = out.subCategory;
  if (out.warehouse && !out.warehouses) out.warehouses = out.warehouse;
  return out;
}

export function useExpenses(filters?: { from?: string; to?: string; categoryId?: string; status?: string }) {
  return useQuery({
    queryKey: ["expenses", filters],
    queryFn: async () => {
      const filter: Record<string, any> = {};
      if (filters?.from) filter.expense_date = { ...(filter.expense_date || {}), gte: filters.from };
      if (filters?.to) filter.expense_date = { ...(filter.expense_date || {}), lte: filters.to + "T23:59:59" };
      if (filters?.categoryId) filter.category_id = filters.categoryId;
      if (filters?.status && filters.status !== "all") filter.payment_status = filters.status;
      const rows = await rest.all<any>("expenses", {
        filter,
        with: ["category", "subCategory", "warehouse"],
        sort: "-expense_date",
        perPage: 500,
      });
      return rows.map(aliasExpense);
    },
  });
}

export function useExpense(id: string | undefined) {
  return useQuery({
    queryKey: ["expense", id],
    enabled: !!id,
    queryFn: async () => {
      return await rest.get<any>("expenses", id!);
    },
  });
}

export function useExpenseMutations() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const create = useMutation({
    mutationFn: async (input: ExpenseInput) => {
      await rest.create("expenses", { ...input, created_by: user?.id });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["expenses"] }); toast.success("Expense added"); },
    onError: (e: Error) => toast.error(toFriendlyError(e)),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...input }: ExpenseInput & { id: string }) => {
      await rest.update("expenses", id, input as Record<string, unknown>);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["expenses"] }); toast.success("Expense updated"); },
    onError: (e: Error) => toast.error(toFriendlyError(e)),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await rest.remove("expenses", id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["expenses"] }); toast.success("Expense deleted"); },
    onError: (e: Error) => toast.error(toFriendlyError(e)),
  });

  return { create, update, remove };
}

export function useExpenseCategories() {
  return useQuery({
    queryKey: ["expense_categories"],
    queryFn: async () => {
      return await rest.all<any>("expense_categories", { sort: "name", perPage: 500 });
    },
  });
}

export function useExpenseCategoryMutations() {
  const qc = useQueryClient();
  const create = useMutation({
    mutationFn: async (input: { name: string; parent_id?: string | null; is_active?: boolean }) => {
      await rest.create("expense_categories", input);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["expense_categories"] }); toast.success("Category created"); },
    onError: (e: Error) => toast.error(toFriendlyError(e)),
  });
  const update = useMutation({
    mutationFn: async ({ id, ...input }: { id: string; name?: string; parent_id?: string | null; is_active?: boolean }) => {
      await rest.update("expense_categories", id, input);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["expense_categories"] }); toast.success("Category updated"); },
    onError: (e: Error) => toast.error(toFriendlyError(e)),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      await rest.remove("expense_categories", id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["expense_categories"] }); toast.success("Category deleted"); },
    onError: (e: Error) => toast.error(toFriendlyError(e)),
  });
  return { create, update, remove };
}