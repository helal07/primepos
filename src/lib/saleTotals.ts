export interface SaleTotals {
  subtotal: number;
  discount: number;
  tax: number;
  shipping: number;
  total: number;
  paid: number;
  balance: number; // total - paid; negative means advance
  status: "paid" | "partial" | "due";
  /** Outstanding amount from the customer's earlier sales (0 when unknown). */
  previousDue: number;
  /** previousDue + total */
  receivable: number;
  /** Money received against this invoice today (same as `paid`). */
  paidToday: number;
  /** receivable - paidToday; negative means advance */
  totalBalance: number;
}

/**
 * Ultimate POS style sale totals.
 * `sale_payments` is the source of truth for paid / balance.
 */
export function computeSaleTotals(
  sale: any,
  payments: any[] | null | undefined,
  previousDue: number = 0
): SaleTotals {
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
  const prev = Number(previousDue) || 0;
  const receivable = prev + total;
  return {
    subtotal,
    discount,
    tax,
    shipping,
    total,
    paid,
    balance,
    status,
    previousDue: prev,
    receivable,
    paidToday: paid,
    totalBalance: receivable - paid,
  };
}
