import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toFriendlyError } from "@/lib/friendlyError";
import { rest } from "@/lib/restResource";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantRealtime } from "@/hooks/useTenantRealtime";

/** Map Laravel singular relation names → plural Supabase shape expected by legacy UI. */
function aliasInstallmentCustomer<T extends Record<string, any>>(row: T): T {
  if (!row) return row;
  const out: any = { ...row };
  if (out.customer && !out.customers) out.customers = out.customer;
  return out;
}
function aliasInstallmentSale<T extends Record<string, any>>(row: T): T {
  if (!row) return row;
  const out: any = { ...row };
  if (out.customer && !out.customers) out.customers = out.customer;
  if (out.product && !out.products) out.products = out.product;
  if (out.installmentCustomer && !out.installment_customers) out.installment_customers = out.installmentCustomer;
  return out;
}
function aliasSchedule<T extends Record<string, any>>(row: T): T {
  if (!row) return row;
  const out: any = { ...row };
  if (out.installmentSale && !out.installment_sales) {
    const s = aliasInstallmentSale(out.installmentSale);
    out.installment_sales = s;
  }
  return out;
}
function aliasCollection<T extends Record<string, any>>(row: T): T {
  if (!row) return row;
  const out: any = { ...row };
  if (out.schedule && !out.installment_schedules) out.installment_schedules = out.schedule;
  return out;
}

// ── Installment Customers ──
export function useInstallmentCustomers() {
  return useQuery({
    queryKey: ["installment_customers"],
    queryFn: async () => {
      const rows = await rest.all<any>("installment_customers", {
        with: ["customer"], sort: "-created_at", perPage: 500,
      });
      return rows.map(aliasInstallmentCustomer);
    },
  });
}

export function useInstallmentCustomerMutations() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const inv = () => qc.invalidateQueries({ queryKey: ["installment_customers"] });

  const create = useMutation({
    mutationFn: async (row: any) => { await rest.create("installment_customers", row); },
    onSuccess: () => { inv(); toast({ title: "Installment customer created" }); },
    onError: (e: Error) => toast({ title: "Error", description: toFriendlyError(e), variant: "destructive" }),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...patch }: any) => { await rest.update("installment_customers", id, patch); },
    onSuccess: () => { inv(); toast({ title: "Customer updated" }); },
    onError: (e: Error) => toast({ title: "Error", description: toFriendlyError(e), variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => { await rest.remove("installment_customers", id); },
    onSuccess: () => { inv(); toast({ title: "Customer deleted" }); },
    onError: (e: Error) => toast({ title: "Error", description: toFriendlyError(e), variant: "destructive" }),
  });

  return { create, update, remove };
}

// ── Installment Sales ──
export function useInstallmentSales() {
  return useQuery({
    queryKey: ["installment_sales"],
    queryFn: async () => {
      const rows = await rest.all<any>("installment_sales", {
        with: ["customer", "product", "installmentCustomer"],
        sort: "-created_at", perPage: 500,
      });
      return rows.map(aliasInstallmentSale);
    },
  });
}

export function useInstallmentSaleMutations() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const inv = () => {
    qc.invalidateQueries({ queryKey: ["installment_sales"] });
    qc.invalidateQueries({ queryKey: ["installment_schedules"] });
  };

  const create = useMutation({
    mutationFn: async ({ schedules, ...sale }: any) => {
      const created = await rest.create<any>("installment_sales", { ...sale, created_by: user?.id });
      if (schedules?.length) {
        await Promise.all(schedules.map((s: any) =>
          rest.create("installment_schedules", { ...s, installment_sale_id: created.id })));
      }
      return { id: created.id };
    },
    onSuccess: () => { inv(); toast({ title: "Installment sale created" }); },
    onError: (e: Error) => toast({ title: "Error", description: toFriendlyError(e), variant: "destructive" }),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await rest.update("installment_sales", id, { status });
    },
    onSuccess: () => { inv(); toast({ title: "Status updated" }); },
    onError: (e: Error) => toast({ title: "Error", description: toFriendlyError(e), variant: "destructive" }),
  });

  return { create, updateStatus };
}

// ── Installment Schedules ──
export function useInstallmentSchedules(saleId: string | null) {
  return useQuery({
    queryKey: ["installment_schedules", saleId],
    enabled: !!saleId,
    queryFn: async () => {
      return await rest.all<any>("installment_schedules", {
        filter: { installment_sale_id: saleId! },
        sort: "installment_no", perPage: 2000,
      });
    },
  });
}

export function useAllSchedules() {
  return useQuery({
    queryKey: ["installment_schedules_all"],
    queryFn: async () => {
      const rows = await rest.all<any>("installment_schedules", {
        with: ["installmentSale", "installmentSale.customer", "installmentSale.product"],
        sort: "due_date", perPage: 2000,
      });
      return rows.map(aliasSchedule);
    },
  });
}

// ── Installment Collections ──
export function useInstallmentCollections(saleId?: string | null) {
  useTenantRealtime(
    ["installment_collections"],
    [["installment_collections"], ["installment_schedules"]],
  );
  return useQuery({
    queryKey: ["installment_collections", saleId],
    enabled: saleId !== undefined,
    queryFn: async () => {
      const filter: Record<string, any> = {};
      if (saleId) filter.installment_sale_id = saleId;
      const rows = await rest.all<any>("installment_collections", {
        filter, with: ["schedule"], sort: "-collected_at", perPage: 1000,
      });
      return rows.map(aliasCollection);
    },
  });
}

export function useCollectionMutations() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  const collect = useMutation({
    mutationFn: async (row: any) => {
      await rest.create("installment_collections", { ...row, collected_by: user?.id });
      const schedule = await rest.get<any>("installment_schedules", row.schedule_id);
      if (schedule) {
        const newPaid = (schedule.paid_amount || 0) + row.amount;
        const newStatus = newPaid >= schedule.amount ? "paid" : "partial";
        await rest.update("installment_schedules", row.schedule_id, {
          paid_amount: newPaid,
          paid_date: newPaid >= schedule.amount ? new Date().toISOString().split("T")[0] : null,
          status: newStatus,
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["installment_collections"] });
      qc.invalidateQueries({ queryKey: ["installment_schedules"] });
      toast({ title: "Payment collected" });
    },
    onError: (e: Error) => toast({ title: "Error", description: toFriendlyError(e), variant: "destructive" }),
  });

  return { collect };
}
