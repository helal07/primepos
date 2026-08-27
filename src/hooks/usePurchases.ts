import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toFriendlyError } from "@/lib/friendlyError";
import { rest } from "@/lib/restResource";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantRealtime } from "@/hooks/useTenantRealtime";
import { toast } from "sonner";

export interface PurchaseItem {
  id?: string;
  product_id: string;
  variation_id?: string | null;
  quantity: number;
  received_quantity?: number;
  unit_cost: number;
  discount: number;
  tax_percent: number;
  total: number;
  serial_number?: string | null;
  product_name?: string;
  product_type?: string;
  brand_name?: string;
  sku?: string;
}

export interface PurchaseFormData {
  supplier_id?: string | null;
  warehouse_id?: string | null;
  purchase_date?: string;
  reference_number?: string;
  status?: string;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  shipping_cost: number;
  total_amount: number;
  payment_status: string;
  payment_method: string;
  notes?: string;
  items: PurchaseItem[];
}

/** Map Laravel singular relation names → legacy plural Supabase shape so UI components keep working. */
function aliasPurchase<T extends Record<string, any>>(row: T): T {
  if (!row) return row;
  const out: any = { ...row };
  if (out.supplier && !out.suppliers) out.suppliers = out.supplier;
  return out;
}
function aliasPurchaseItem<T extends Record<string, any>>(row: T): T {
  if (!row) return row;
  const out: any = { ...row };
  if (out.product && !out.products) out.products = out.product;
  if (out.variation && !out.product_variations) out.product_variations = out.variation;
  if (out.products?.brand && !out.products?.brands) out.products = { ...out.products, brands: out.products.brand };
  return out;
}

export function usePurchases() {
  useTenantRealtime(["purchases"], [["purchases"]]);
  return useQuery({
    queryKey: ["purchases"],
    queryFn: async () => {
      const rows = await rest.all<any>("purchases", {
        with: ["supplier"],
        sort: "-created_at",
        perPage: 500,
      });
      return rows.map(aliasPurchase);
    },
  });
}

export function usePurchase(id: string | null) {
  return useQuery({
    queryKey: ["purchase", id],
    enabled: !!id,
    queryFn: async () => {
      const row = await rest.get<any>("purchases", id!, { with: ["supplier"] });
      return aliasPurchase(row);
    },
  });
}

export function usePurchaseItems(purchaseId: string | null) {
  return useQuery({
    queryKey: ["purchase_items", purchaseId],
    enabled: !!purchaseId,
    queryFn: async () => {
      const rows = await rest.all<any>("purchase_items", {
        filter: { purchase_id: purchaseId! },
        with: ["product", "variation"],
        perPage: 1000,
      });
      return rows.map(aliasPurchaseItem);
    },
  });
}

export function usePurchasePayments(purchaseId: string | null) {
  return useQuery({
    queryKey: ["purchase_payments", purchaseId],
    enabled: !!purchaseId,
    queryFn: async () => {
      return await rest.all<any>("purchase_payments", {
        filter: { purchase_id: purchaseId! },
        sort: "created_at",
        perPage: 1000,
      });
    },
  });
}

export function usePurchaseOrders() {
  return useQuery({
    queryKey: ["purchase_orders"],
    queryFn: async () => {
      const rows = await rest.all<any>("purchase_orders", {
        with: ["supplier"],
        sort: "-created_at",
        perPage: 500,
      });
      return rows.map(aliasPurchase);
    },
  });
}

export function usePurchaseOrderItems(poId: string | null) {
  return useQuery({
    queryKey: ["purchase_order_items", poId],
    enabled: !!poId,
    queryFn: async () => {
      const rows = await rest.all<any>("purchase_order_items", {
        filter: { purchase_order_id: poId! },
        with: ["product", "product.brand", "variation"],
        perPage: 1000,
      });
      return rows.map(aliasPurchaseItem);
    },
  });
}

export function usePurchaseMutations() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const createPurchase = useMutation({
    mutationFn: async (formData: PurchaseFormData) => {
      const { items, ...purchaseData } = formData;
      const purchase = await rest.create<any>("purchases", { ...purchaseData, created_by: user?.id });
      if (items.length > 0) {
        await Promise.all(items.map((item) => rest.create("purchase_items", {
          purchase_id: purchase.id,
          product_id: item.product_id,
          variation_id: item.variation_id || null,
          quantity: item.quantity,
          received_quantity: item.received_quantity || 0,
          unit_cost: item.unit_cost,
          discount: item.discount,
          tax_percent: item.tax_percent,
          total: item.total,
          serial_number: item.serial_number || null,
        })));
      }
      return purchase;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      toast.success("Purchase created successfully");
    },
    onError: (e: Error) => toast.error(toFriendlyError(e)),
  });

  const updatePurchaseStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await rest.update("purchases", id, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      toast.success("Purchase updated");
    },
    onError: (e: Error) => toast.error(toFriendlyError(e)),
  });

  const receivePurchase = useMutation({
    mutationFn: async ({ purchaseId, items }: { purchaseId: string; items: { id: string; received_quantity: number; product_id: string; quantity: number }[] }) => {
      for (const item of items) {
        await rest.update("purchase_items", item.id, { received_quantity: item.received_quantity });
        const product = await rest.get<any>("products", item.product_id);
        if (product) {
          await rest.update("products", item.product_id, {
            stock_quantity: (product.stock_quantity ?? 0) + item.received_quantity,
          });
        }
      }
      const allReceived = items.every((i) => i.received_quantity >= i.quantity);
      await rest.update("purchases", purchaseId, { status: allReceived ? "received" : "partial" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      queryClient.invalidateQueries({ queryKey: ["purchase_items"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Stock received successfully");
    },
    onError: (e: Error) => toast.error(toFriendlyError(e)),
  });

  const updatePurchase = useMutation({
    mutationFn: async ({ id, formData }: { id: string; formData: PurchaseFormData }) => {
      const { items, ...purchaseData } = formData;
      await rest.update("purchases", id, purchaseData);
      // Replace child items: delete existing, then insert fresh.
      const existing = await rest.all<any>("purchase_items", { filter: { purchase_id: id }, perPage: 1000 });
      await Promise.all(existing.map((row: any) => rest.remove("purchase_items", row.id)));
      if (items.length > 0) {
        await Promise.all(items.map((item) => rest.create("purchase_items", {
          purchase_id: id,
          product_id: item.product_id,
          variation_id: item.variation_id || null,
          quantity: item.quantity,
          received_quantity: item.received_quantity || 0,
          unit_cost: item.unit_cost,
          discount: item.discount,
          tax_percent: item.tax_percent,
          total: item.total,
          serial_number: item.serial_number || null,
        })));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      queryClient.invalidateQueries({ queryKey: ["purchase"] });
      queryClient.invalidateQueries({ queryKey: ["purchase_items"] });
      toast.success("Purchase updated successfully");
    },
    onError: (e: Error) => toast.error(toFriendlyError(e)),
  });

  const deletePurchase = useMutation({
    mutationFn: async (id: string) => {
      await rest.remove("purchases", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      toast.success("Purchase deleted");
    },
    onError: (e: Error) => toast.error(toFriendlyError(e)),
  });

  const createPurchasePayments = useMutation({
    mutationFn: async ({ purchaseId, payments }: { purchaseId: string; payments: { amount: number; payment_method: string; payment_note: string }[] }) => {
      if (payments.length === 0) return;
      await Promise.all(payments.map(p => rest.create("purchase_payments", {
        purchase_id: purchaseId,
        amount: p.amount,
        payment_method: p.payment_method,
        payment_note: p.payment_note || null,
      })));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase_payments"] });
    },
    onError: (e: Error) => toast.error(toFriendlyError(e)),
  });

  return { createPurchase, createPurchasePayments, updatePurchaseStatus, updatePurchase, receivePurchase, deletePurchase };
}
