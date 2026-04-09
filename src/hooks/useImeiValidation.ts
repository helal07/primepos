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
  
  // Find in purchase_items where serial matches and not yet sold
  const { data: purchased } = await supabase
    .from("purchase_items")
    .select("product_id, serial_number")
    .eq("serial_number", query.trim())
    .maybeSingle();
  
  if (!purchased) return null;

  // Check if already sold
  const { data: sold } = await supabase
    .from("sale_items")
    .select("id")
    .eq("serial_number", query.trim())
    .maybeSingle();
  
  if (sold) return null; // already sold
  
  return { product_id: purchased.product_id, serial_number: purchased.serial_number! };
}
