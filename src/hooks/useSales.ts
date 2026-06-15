import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toFriendlyError } from "@/lib/friendlyError";
import { useAuth } from "@/contexts/AuthContext";
import { rest } from "@/lib/restResource";
import { toast } from "sonner";

// Stage 9c — migrated to Laravel REST. Eloquent relations are returned
// under singular names (customer / product / variation); we alias them
// to the Supabase plural shape (`customers`, `products`, `product_variations`)
// so existing UI code keeps working unchanged.

type AnyRec = Record<string, unknown> & { [k: string]: any };

function aliasSale<T extends AnyRec>(row: T): T {
  if (row && row.customer && !row.customers) row.customers = row.customer;
  return row;
}

function aliasSaleItem<T extends AnyRec>(row: T): T {
  if (row && row.product && !row.products) row.products = row.product;
  if (row && row.variation && !row.product_variations) row.product_variations = row.variation;
  return row;
}

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
  warehouse_id?: string | null;
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
      const rows = await rest.all<AnyRec>("sales", {
        with: ["customer"],
        sort: "-created_at",
        perPage: 500,
      });
      return rows.map(aliasSale);
    },
  });
}

export function useSale(id: string | null) {
  return useQuery({
    queryKey: ["sale", id],
    enabled: !!id,
    queryFn: async () => {
      const row = await rest.get<AnyRec>("sales", id!, { with: ["customer"] });
      return row ? aliasSale(row) : row;
    },
  });
}

export function useSaleItems(saleId: string | null) {
  return useQuery({
    queryKey: ["sale_items", saleId],
    enabled: !!saleId,
    queryFn: async () => {
      const rows = await rest.all<AnyRec>("sale_items", {
        filter: { sale_id: saleId! },
        with: ["product", "variation"],
        perPage: 1000,
      });
      return rows.map(aliasSaleItem);
    },
  });
}

export function useSalePayments(saleId: string | null) {
  return useQuery({
    queryKey: ["sale_payments", saleId],
    enabled: !!saleId,
    queryFn: () =>
      rest.all("sale_payments", {
        filter: { sale_id: saleId! },
        sort: "created_at",
        perPage: 1000,
      }),
  });
}

export function useSaleMutations() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const createSale = useMutation({
    mutationFn: async (formData: SaleFormData) => {
      const { items, ...saleData } = formData;
      const sale = await rest.create<AnyRec>("sales", { ...saleData, created_by: user?.id });
      if (items.length > 0) {
        await Promise.all(
          items.map((item) =>
            rest.create("sale_items", {
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
              discount_type: item.discount_type || "fixed",
              unit: item.unit || null,
            }),
          ),
        );
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
      await Promise.all(
        payments.map((p) =>
          rest.create("sale_payments", {
            sale_id: saleId,
            amount: p.amount,
            payment_method: p.payment_method,
            payment_note: p.payment_note || null,
          }),
        ),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sale_payments"] });
    },
    onError: (e: Error) => toast.error(toFriendlyError(e)),
  });

  const updateSaleStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      rest.update("sales", id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      toast.success("Sale updated");
    },
    onError: (e: Error) => toast.error(toFriendlyError(e)),
  });

  const updateSale = useMutation({
    mutationFn: async ({ id, formData }: { id: string; formData: SaleFormData }) => {
      const { items, ...saleData } = formData;
      await rest.update("sales", id, saleData as unknown as Record<string, unknown>);

      const existing = await rest.all<AnyRec>("sale_items", {
        filter: { sale_id: id },
        perPage: 1000,
      });
      await Promise.all(existing.map((row) => rest.remove("sale_items", row.id as string)));

      if (items.length > 0) {
        await Promise.all(
          items.map((item) =>
            rest.create("sale_items", {
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
              discount_type: item.discount_type || "fixed",
              unit: item.unit || null,
            }),
          ),
        );
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
    mutationFn: (id: string) => rest.remove("sales", id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      toast.success("Sale deleted");
    },
    onError: (e: Error) => toast.error(toFriendlyError(e)),
  });

  return { createSale, createSalePayments, updateSaleStatus, updateSale, deleteSale };
}
