import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toFriendlyError } from "@/lib/friendlyError";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface SaleItem {
  id?: string;
  product_id: string;
  variation_id?: string | null;
  quantity: number;
  unit_price: number;
  discount: number;
  tax_percent: number;
  total: number;
  serial_number?: string | null;
  product_name?: string;
  variation_name?: string;
  warranty_id?: string | null;
  warranty_name?: string | null;
  imei_text?: string | null;
  discount_type?: string;
  unit?: string | null;
}

export interface SaleFormData {
  customer_id?: string | null;
  sale_date?: string;
  status?: string;
  subtotal: number;
  discount_type: string;
  discount_value: number;
  discount_amount: number;
  tax_amount: number;
  shipping_cost: number;
  total_amount: number;
  payment_method: string;
  payment_status: string;
  notes?: string;
  items: SaleItem[];
  pay_term_number?: number | null;
  pay_term_unit?: string | null;
  order_no?: string | null;
  attach_document_url?: string | null;
  shipping_details?: string | null;
  shipping_address?: string | null;
  shipping_status?: string | null;
  delivered_to?: string | null;
  delivery_person_id?: string | null;
  shipping_documents_url?: string | null;
  additional_expenses?: { name: string; amount: number }[];
}

export function useSales() {
  return useQuery({
    queryKey: ["sales"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select("*, customers(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useSale(id: string | null) {
  return useQuery({
    queryKey: ["sale", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select("*, customers(name, phone, address, email)")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useSaleItems(saleId: string | null) {
  return useQuery({
    queryKey: ["sale_items", saleId],
    enabled: !!saleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sale_items")
        .select("*, products(name), product_variations(name)")
        .eq("sale_id", saleId!);
      if (error) throw error;
      return data;
    },
  });
}

export function useSalePayments(saleId: string | null) {
  return useQuery({
    queryKey: ["sale_payments", saleId],
    enabled: !!saleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sale_payments")
        .select("*")
        .eq("sale_id", saleId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useSaleMutations() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const createSale = useMutation({
    mutationFn: async (formData: SaleFormData) => {
      const { items, ...saleData } = formData;
      const { data: sale, error: saleError } = await supabase
        .from("sales")
        .insert({ ...saleData, created_by: user?.id })
        .select()
        .single();
      if (saleError) throw saleError;

      if (items.length > 0) {
        const saleItems = items.map((item) => ({
          sale_id: sale.id,
          product_id: item.product_id,
          variation_id: item.variation_id || null,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount: item.discount,
          tax_percent: item.tax_percent,
          total: item.total,
          serial_number: item.serial_number || null,
          warranty_id: item.warranty_id || null,
          warranty_name: item.warranty_name || null,
          imei_text: item.imei_text || null,
          discount_type: item.discount_type || 'fixed',
          unit: item.unit || null,
        }));
        const { error: itemsError } = await supabase
          .from("sale_items")
          .insert(saleItems);
        if (itemsError) throw itemsError;
      }
      return sale;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      toast.success("Sale created successfully");
    },
    onError: (e: Error) => toast.error(toFriendlyError(e)),
  });

  const createSalePayments = useMutation({
    mutationFn: async ({ saleId, payments }: { saleId: string; payments: { amount: number; payment_method: string; payment_note: string }[] }) => {
      if (payments.length === 0) return;
      const rows = payments.map(p => ({ sale_id: saleId, amount: p.amount, payment_method: p.payment_method, payment_note: p.payment_note || null }));
      const { error } = await supabase.from("sale_payments").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sale_payments"] });
    },
    onError: (e: Error) => toast.error(toFriendlyError(e)),
  });

  const updateSaleStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("sales")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      toast.success("Sale updated");
    },
    onError: (e: Error) => toast.error(toFriendlyError(e)),
  });

  const updateSale = useMutation({
    mutationFn: async ({ id, formData }: { id: string; formData: SaleFormData }) => {
      const { items, ...saleData } = formData;
      const { error: saleError } = await supabase
        .from("sales")
        .update(saleData)
        .eq("id", id);
      if (saleError) throw saleError;

      const { error: delError } = await supabase
        .from("sale_items")
        .delete()
        .eq("sale_id", id);
      if (delError) throw delError;

      if (items.length > 0) {
        const saleItems = items.map((item) => ({
          sale_id: id,
          product_id: item.product_id,
          variation_id: item.variation_id || null,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount: item.discount,
          tax_percent: item.tax_percent,
          total: item.total,
          serial_number: item.serial_number || null,
          warranty_id: item.warranty_id || null,
          warranty_name: item.warranty_name || null,
          imei_text: item.imei_text || null,
          discount_type: item.discount_type || 'fixed',
          unit: item.unit || null,
        }));
        const { error: itemsError } = await supabase
          .from("sale_items")
          .insert(saleItems);
        if (itemsError) throw itemsError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["sale"] });
      queryClient.invalidateQueries({ queryKey: ["sale_items"] });
      toast.success("Sale updated successfully");
    },
    onError: (e: Error) => toast.error(toFriendlyError(e)),
  });

  const deleteSale = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sales").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      toast.success("Sale deleted");
    },
    onError: (e: Error) => toast.error(toFriendlyError(e)),
  });

  return { createSale, createSalePayments, updateSaleStatus, updateSale, deleteSale };
}
