export interface SaleTotals {
  subtotal: number;
  discount: number;
  tax: number;
  shipping: number;
  total: number;
  paid: number;
  balance: number; // total - paid; negative means advance
  status: "paid" | "partial" | "due";
}

/**
 * Ultimate POS style sale totals.
 * `sale_payments` is the source of truth for paid / balance.
 */
export function computeSaleTotals(sale: any, payments: any[] | null | undefined): SaleTotals {
  const subtotal = Number(sale?.subtotal) || 0;
  const discount = Number(sale?.discount_amount) || 0;
  const tax = Number(sale?.tax_amount) || 0;
  const shipping = Number(sale?.shipping_cost) || 0;
  const total = Number(sale?.total_amount) || 0;
  const paid = (payments ?? []).reduce(
    (s: number, p: any) => s + (Number(p?.amount) || 0),
    0
  );
  const balance = total - paid;
  const status: SaleTotals["status"] =
    paid <= 0 ? "due" : paid >= total ? "paid" : "partial";
  return { subtotal, discount, tax, shipping, total, paid, balance, status };
}