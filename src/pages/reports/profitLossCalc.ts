// Pure calculation helpers for the Profit & Loss report.
// Extracted so they can be unit-tested independently of Supabase / React Query.

export interface PLInputs {
  sales: Array<{ total_amount?: number | string; discount_amount?: number | string; shipping_cost?: number | string; tax_amount?: number | string }>;
  purchases: Array<{ total_amount?: number | string; discount_amount?: number | string; shipping_cost?: number | string; tax_amount?: number | string }>;
  products: Array<{ stock_quantity?: number | string; purchase_price?: number | string; selling_price?: number | string }>;
  instSales?: Array<{ total_amount?: number | string; price?: number | string; discount?: number | string; interest_percent?: number | string; products?: { purchase_price?: number | string } | null }>;
  instColl?: Array<{ amount?: number | string }>;
  exchPurch?: Array<{ purchase_price?: number | string }>;
  exchSold?: Array<{ purchase_price?: number | string }>;
  expenses?: Array<{ total_amount?: number | string }>;
  hasInstallments?: boolean;
  hasExchange?: boolean;
}

const num = (v: unknown) => Number(v || 0);
const sum = <T,>(arr: T[], pick: (r: T) => number) => arr.reduce((s, r) => s + pick(r), 0);

export function computeProfitLoss(input: PLInputs) {
  const {
    sales, purchases, products,
    instSales = [], instColl = [], exchPurch = [], exchSold = [], expenses = [],
    hasInstallments = false, hasExchange = false,
  } = input;

  const totalSales = sum(sales, r => num(r.total_amount));
  const totalSalesDiscount = sum(sales, r => num(r.discount_amount));
  const sellShipping = sum(sales, r => num(r.shipping_cost));
  const sellTax = sum(sales, r => num(r.tax_amount));

  const totalPurchase = sum(purchases, r => num(r.total_amount));
  const purchaseDiscount = sum(purchases, r => num(r.discount_amount));
  const purchaseShipping = sum(purchases, r => num(r.shipping_cost));
  const purchaseTax = sum(purchases, r => num(r.tax_amount));

  const closingStockPurchase = sum(products, p => num(p.stock_quantity) * num(p.purchase_price));
  const closingStockSale = sum(products, p => num(p.stock_quantity) * num(p.selling_price));

  // Installments — only included if the module is enabled for the tenant.
  const installmentRevenue = hasInstallments ? sum(instSales, r => num(r.total_amount)) : 0;
  const installmentCollected = hasInstallments ? sum(instColl, r => num(r.amount)) : 0;
  const installmentInterest = hasInstallments
    ? sum(instSales, r => ((num(r.price) - num(r.discount)) * num(r.interest_percent)) / 100)
    : 0;
  const installmentCogs = hasInstallments ? sum(instSales, r => num(r.products?.purchase_price)) : 0;

  // Exchange — only included if the module is enabled.
  const exchangePurchaseCost = hasExchange ? sum(exchPurch, r => num(r.purchase_price)) : 0;
  const exchangeSoldCost = hasExchange ? sum(exchSold, r => num(r.purchase_price)) : 0;

  const moduleExpenses = sum(expenses, r => num(r.total_amount));

  const cogs = (totalPurchase - closingStockPurchase) + installmentCogs + exchangeSoldCost;
  const grossProfit = (totalSales + installmentCollected) - cogs;
  const totalExpenses = sellShipping + purchaseShipping + moduleExpenses;
  const netProfit = grossProfit - totalExpenses;

  return {
    totalSales, totalSalesDiscount, sellShipping, sellTax,
    totalPurchase, purchaseDiscount, purchaseShipping, purchaseTax,
    closingStockPurchase, closingStockSale,
    cogs, grossProfit, netProfit, totalExpenses, moduleExpenses,
    installmentRevenue, installmentCollected, installmentInterest, installmentCogs,
    exchangePurchaseCost, exchangeSoldCost,
  };
}