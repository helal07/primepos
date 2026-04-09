import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
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

export function usePurchases() {
  return useQuery({
    queryKey: ["purchases"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchases")
        .select("*, suppliers(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function usePurchase(id: string | null) {
  return useQuery({
    queryKey: ["purchase", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchases")
        .select("*, suppliers(name, phone, address, email)")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function usePurchaseItems(purchaseId: string | null) {
  return useQuery({
    queryKey: ["purchase_items", purchaseId],
    enabled: !!purchaseId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_items")
        .select("*, products(name), product_variations(name)")
        .eq("purchase_id", purchaseId!);
      if (error) throw error;
      return data;
    },
  });
}

export function usePurchasePayments(purchaseId: string | null) {
  return useQuery({
    queryKey: ["purchase_payments", purchaseId],
    enabled: !!purchaseId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_payments")
        .select("*")
        .eq("purchase_id", purchaseId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function usePurchaseOrders() {
  return useQuery({
    queryKey: ["purchase_orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_orders")
        .select("*, suppliers(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function usePurchaseOrderItems(poId: string | null) {
  return useQuery({
    queryKey: ["purchase_order_items", poId],
    enabled: !!poId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_order_items")
        .select("*, products(name, purchase_price, tax_percent, product_type, sku, brands(name))")
        .eq("purchase_order_id", poId!);
      if (error) throw error;
      return data;
    },
  });
}

export function usePurchaseMutations() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const createPurchase = useMutation({
    mutationFn: async (formData: PurchaseFormData) => {
      const { items, ...purchaseData } = formData;
      const { data: purchase, error } = await supabase
        .from("purchases")
        .insert({ ...purchaseData, created_by: user?.id })
        .select()
        .single();
      if (error) throw error;

      if (items.length > 0) {
        const purchaseItems = items.map((item) => ({
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
        }));
        const { error: itemsError } = await supabase
          .from("purchase_items")
          .insert(purchaseItems);
        if (itemsError) throw itemsError;
      }
      return purchase;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      toast.success("Purchase created successfully");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updatePurchaseStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("purchases")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      toast.success("Purchase updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const receivePurchase = useMutation({
    mutationFn: async ({ purchaseId, items }: { purchaseId: string; items: { id: string; received_quantity: number; product_id: string; quantity: number }[] }) => {
      for (const item of items) {
        const { error: itemError } = await supabase
          .from("purchase_items")
          .update({ received_quantity: item.received_quantity })
          .eq("id", item.id);
        if (itemError) throw itemError;

        // Update product stock
        const { data: product } = await supabase
          .from("products")
          .select("stock_quantity")
          .eq("id", item.product_id)
          .single();
        if (product) {
          await supabase
            .from("products")
            .update({ stock_quantity: product.stock_quantity + item.received_quantity })
            .eq("id", item.product_id);
        }
      }
      // Mark as received if all items fully received
      const allReceived = items.every((i) => i.received_quantity >= i.quantity);
      await supabase
        .from("purchases")
        .update({ status: allReceived ? "received" : "partial" })
        .eq("id", purchaseId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      queryClient.invalidateQueries({ queryKey: ["purchase_items"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Stock received successfully");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updatePurchase = useMutation({
    mutationFn: async ({ id, formData }: { id: string; formData: PurchaseFormData }) => {
      const { items, ...purchaseData } = formData;
      const { error: pError } = await supabase
        .from("purchases")
        .update(purchaseData)
        .eq("id", id);
      if (pError) throw pError;

      const { error: delError } = await supabase
        .from("purchase_items")
        .delete()
        .eq("purchase_id", id);
      if (delError) throw delError;

      if (items.length > 0) {
        const purchaseItems = items.map((item) => ({
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
        }));
        const { error: itemsError } = await supabase
          .from("purchase_items")
          .insert(purchaseItems);
        if (itemsError) throw itemsError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      queryClient.invalidateQueries({ queryKey: ["purchase"] });
      queryClient.invalidateQueries({ queryKey: ["purchase_items"] });
      toast.success("Purchase updated successfully");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deletePurchase = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("purchases").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      toast.success("Purchase deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { createPurchase, updatePurchaseStatus, updatePurchase, receivePurchase, deletePurchase };
}
