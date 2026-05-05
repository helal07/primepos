import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export async function checkImeiUniqueness(serial: string, excludeSaleId?: string, excludePurchaseId?: string): Promise<boolean> {
  if (!serial.trim()) return true;

  // Check purchase_items
  let pQuery = supabase.from("purchase_items").select("id").eq("serial_number", serial);
  if (excludePurchaseId) pQuery = pQuery.neq("purchase_id", excludePurchaseId);
  const { data: pData } = await pQuery.maybeSingle();
  if (pData) {
    toast.error(`IMEI "${serial}" already exists in purchases`);
    return false;
  }

  // Check exchange_purchases
  const { data: exData } = await supabase
    .from("exchange_purchases")
    .select("id")
    .eq("imei", serial)
    .maybeSingle();
  if (exData) {
    toast.error(`IMEI "${serial}" already exists in exchange stock`);
    return false;
  }

  // Check sale_items
  let sQuery = supabase.from("sale_items").select("id").eq("serial_number", serial);
  if (excludeSaleId) sQuery = sQuery.neq("sale_id", excludeSaleId);
  const { data: sData } = await sQuery.maybeSingle();
  if (sData) {
    toast.error(`IMEI "${serial}" already sold`);
    return false;
  }

  return true;
}

export async function searchImeiInPurchases(query: string): Promise<{ product_id: string; serial_number: string } | null> {
  if (!query.trim()) return null;
  const serial = query.trim();

  // Check if already sold first
  const { data: sold } = await supabase
    .from("sale_items")
    .select("id")
    .eq("serial_number", serial)
    .maybeSingle();
  if (sold) return null;

  // 1. Find in purchase_items
  const { data: purchased } = await supabase
    .from("purchase_items")
    .select("product_id, serial_number")
    .eq("serial_number", serial)
    .maybeSingle();
  if (purchased?.product_id && purchased.serial_number) {
    return { product_id: purchased.product_id, serial_number: purchased.serial_number };
  }

  // 2. Find in exchange_purchases (used phone stock)
  const { data: ex } = await supabase
    .from("exchange_purchases")
    .select("linked_product_id, imei, status")
    .eq("imei", serial)
    .maybeSingle();
  if (ex?.linked_product_id && ex.imei && ex.status === "in_stock") {
    return { product_id: ex.linked_product_id, serial_number: ex.imei };
  }

  return null;
}
