import { toast } from "sonner";
import { rest } from "@/lib/restResource";

async function findOne(resource: string, filter: Record<string, any>): Promise<any | null> {
  const rows = await rest.all<any>(resource, { filter, perPage: 1 });
  return rows[0] ?? null;
}

export async function checkImeiUniqueness(
  serial: string,
  excludeSaleId?: string,
  excludePurchaseId?: string,
): Promise<boolean> {
  if (!serial.trim()) return true;

  const filterPurchase: Record<string, any> = { serial_number: serial };
  if (excludePurchaseId) filterPurchase.purchase_id = { neq: excludePurchaseId };
  if (await findOne("purchase_items", filterPurchase)) {
    toast.error(`IMEI "${serial}" already exists in purchases`);
    return false;
  }

  if (await findOne("exchange_purchases", { imei: serial })) {
    toast.error(`IMEI "${serial}" already exists in exchange stock`);
    return false;
  }

  const filterSale: Record<string, any> = { serial_number: serial };
  if (excludeSaleId) filterSale.sale_id = { neq: excludeSaleId };
  if (await findOne("sale_items", filterSale)) {
    toast.error(`IMEI "${serial}" already sold`);
    return false;
  }

  return true;
}

export async function searchImeiInPurchases(
  query: string,
): Promise<{ product_id: string; serial_number: string } | null> {
  if (!query.trim()) return null;
  const serial = query.trim();

  // Already sold?
  if (await findOne("sale_items", { serial_number: serial })) return null;

  const purchased = await findOne("purchase_items", { serial_number: serial });
  if (purchased?.product_id && purchased.serial_number) {
    return { product_id: purchased.product_id, serial_number: purchased.serial_number };
  }

  const ex = await findOne("exchange_purchases", { imei: serial });
  if (ex?.linked_product_id && ex.imei && ex.status === "in_stock") {
    return { product_id: ex.linked_product_id, serial_number: ex.imei };
  }

  return null;
}
