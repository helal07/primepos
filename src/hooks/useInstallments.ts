import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toFriendlyError } from "@/lib/friendlyError";
import { rest } from "@/lib/restResource";
import { api } from "@/lib/apiClient";
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
  if (out.invoice_no && !out.invoice_number) out.invoice_number = out.invoice_no;
  if (out.invoice_number && !out.invoice_no) out.invoice_no = out.invoice_number;
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
        try {
          // Sequential so a failure never leaves a half-written schedule set.
          for (const s of schedules) {
            await rest.create("installment_schedules", { ...s, installment_sale_id: created.id });
          }
        } catch (e) {
          // Roll the sale back so the user never gets an invoice without a schedule.
          try { await rest.remove("installment_sales", created.id); } catch { /* keep original error */ }
          throw e;
        }
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
        with: ["collections"],
        sort: "serial_no", perPage: 2000,
      });
    },
  });
}

export function useAllSchedules() {
  return useQuery({
    queryKey: ["installment_schedules_all"],
    queryFn: async () => {
      const rows = await rest.all<any>("installment_schedules", {
        with: [
          "installmentSale",
          "installmentSale.customer",
          "installmentSale.product",
          "installmentSale.installmentCustomer",
        ],
        sort: "due_date", perPage: 2000,
      });
      return rows.map(aliasSchedule);
    },
  });
}

/** Single installment sale with every relation needed for the invoice view. */
export function useInstallmentSale(id: string | null) {
  return useQuery({
    queryKey: ["installment_sale", id],
    enabled: !!id,
    queryFn: async () => {
      const row = await rest.get<any>("installment_sales", id!, {
        with: ["customer", "product", "installmentCustomer", "schedules", "collections"],
      });
      return aliasInstallmentSale(row);
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

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["installment_collections"] });
    qc.invalidateQueries({ queryKey: ["installment_schedules"] });
    qc.invalidateQueries({ queryKey: ["installment_schedules_all"] });
    qc.invalidateQueries({ queryKey: ["installment_sales"] });
    qc.invalidateQueries({ queryKey: ["installment_sale"] });
  };

  /** Server-side transactional collection: schedule + sale totals stay in sync. */
  const collect = useMutation({
    mutationFn: async (row: {
      installment_sale_id: string;
      schedule_id: string;
      amount: number;
      payment_method?: string;
      paid_date?: string | null;
      reference?: string | null;
      notes?: string | null;
    }) => api.post<any>("/api/installments/collect", row),
    onSuccess: () => { invalidate(); toast({ title: "Payment collected" }); },
    onError: (e: Error) => toast({ title: "Error", description: toFriendlyError(e), variant: "destructive" }),
  });

  return { collect };
}

/** Real SMS due-date reminder (fails loudly when no gateway is configured). */
export function useSmsReminder() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (scheduleId: string) =>
      api.post<{ sent: boolean; phone?: string; reason?: string | null }>(
        `/api/installments/schedules/${scheduleId}/reminder`,
      ),
    onSuccess: (res) => {
      toast({ title: "Reminder sent", description: res.phone ? `SMS sent to ${res.phone}` : undefined });
    },
    onError: (e: Error) =>
      toast({ title: "SMS not sent", description: toFriendlyError(e), variant: "destructive" }),
  });
}


// ── Cross-tenant NID risk check ──
export interface NidRiskShop {
  shop_name: string;
  shop_phone: string | null;
  customer_name: string | null;
  financed_amount: number;
  paid_amount: number;
  due_amount: number;
  sales_count: number;
  overdue_count: number;
  last_payment_at: string | null;
}
export interface NidRiskResult {
  nid: string;
  has_risk: boolean;
  shops: NidRiskShop[];
}

/**
 * Checks the given NID against installment customers of OTHER tenants and
 * returns any outstanding installment dues, grouped per shop.
 */
export function useNidRiskCheck() {
  return useMutation({
    mutationFn: async (nid: string) =>
      api.post<NidRiskResult>("/api/installments/nid-risk-check", { nid }),
  });
}
