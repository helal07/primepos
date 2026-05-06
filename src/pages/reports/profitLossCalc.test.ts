import { describe, it, expect } from "vitest";
import { computeProfitLoss } from "./profitLossCalc";

const baseSales = [
  { total_amount: 1000, discount_amount: 50, shipping_cost: 20, tax_amount: 30 },
  { total_amount: 500, discount_amount: 0, shipping_cost: 10, tax_amount: 15 },
];
const basePurchases = [
  { total_amount: 800, discount_amount: 20, shipping_cost: 25, tax_amount: 40 },
];
const baseProducts = [
  { stock_quantity: 10, purchase_price: 30, selling_price: 50 }, // 300 / 500
  { stock_quantity: 5, purchase_price: 20, selling_price: 35 },  // 100 / 175
];

describe("computeProfitLoss", () => {
  it("computes core P&L with both modules disabled", () => {
    const r = computeProfitLoss({ sales: baseSales, purchases: basePurchases, products: baseProducts });
    expect(r.totalSales).toBe(1500);
    expect(r.totalPurchase).toBe(800);
    expect(r.closingStockPurchase).toBe(400);
    expect(r.closingStockSale).toBe(675);
    // cogs = 800 - 400 = 400
    expect(r.cogs).toBe(400);
    // gross = 1500 - 400 = 1100
    expect(r.grossProfit).toBe(1100);
    // expenses = sellShipping(30) + purchaseShipping(25) = 55
    expect(r.totalExpenses).toBe(55);
    expect(r.netProfit).toBe(1045);
    expect(r.installmentRevenue).toBe(0);
    expect(r.exchangeSoldCost).toBe(0);
  });

  it("ignores installment data when module is disabled", () => {
    const r = computeProfitLoss({
      sales: baseSales, purchases: basePurchases, products: baseProducts,
      instSales: [{ total_amount: 9999, price: 5000, interest_percent: 10, products: { purchase_price: 4000 } }],
      instColl: [{ amount: 9999 }],
      hasInstallments: false,
    });
    expect(r.installmentRevenue).toBe(0);
    expect(r.installmentCollected).toBe(0);
    expect(r.installmentCogs).toBe(0);
    expect(r.netProfit).toBe(1045); // identical to base
  });

  it("includes installments when enabled (cash basis)", () => {
    const r = computeProfitLoss({
      sales: baseSales, purchases: basePurchases, products: baseProducts,
      instSales: [
        { total_amount: 1200, price: 1000, discount: 100, interest_percent: 20, products: { purchase_price: 700 } },
        { total_amount: 600, price: 500, discount: 0, interest_percent: 10, products: { purchase_price: 300 } },
      ],
      instColl: [{ amount: 200 }, { amount: 150 }],
      hasInstallments: true,
    });
    expect(r.installmentRevenue).toBe(1800);
    expect(r.installmentCollected).toBe(350);
    // interest = (1000-100)*0.20 + 500*0.10 = 180 + 50 = 230
    expect(r.installmentInterest).toBe(230);
    expect(r.installmentCogs).toBe(1000);
    // cogs = (800-400) + 1000 = 1400
    expect(r.cogs).toBe(1400);
    // gross = (1500 + 350) - 1400 = 450
    expect(r.grossProfit).toBe(450);
    // net = 450 - 55 = 395
    expect(r.netProfit).toBe(395);
  });

  it("ignores exchange data when module is disabled", () => {
    const r = computeProfitLoss({
      sales: baseSales, purchases: basePurchases, products: baseProducts,
      exchPurch: [{ purchase_price: 5000 }],
      exchSold: [{ purchase_price: 5000 }],
      hasExchange: false,
    });
    expect(r.exchangePurchaseCost).toBe(0);
    expect(r.exchangeSoldCost).toBe(0);
    expect(r.netProfit).toBe(1045);
  });

  it("includes exchange COGS only for sold units when enabled", () => {
    const r = computeProfitLoss({
      sales: baseSales, purchases: basePurchases, products: baseProducts,
      exchPurch: [{ purchase_price: 300 }, { purchase_price: 200 }], // bought = inventory only
      exchSold: [{ purchase_price: 250 }],                            // sold contributes COGS
      hasExchange: true,
    });
    expect(r.exchangePurchaseCost).toBe(500);
    expect(r.exchangeSoldCost).toBe(250);
    // cogs = (800-400) + 250 = 650
    expect(r.cogs).toBe(650);
    // gross = 1500 - 650 = 850
    expect(r.grossProfit).toBe(850);
    // net = 850 - 55 = 795
    expect(r.netProfit).toBe(795);
  });

  it("combines both modules correctly", () => {
    const r = computeProfitLoss({
      sales: baseSales, purchases: basePurchases, products: baseProducts,
      instSales: [{ total_amount: 1200, price: 1000, discount: 0, interest_percent: 20, products: { purchase_price: 700 } }],
      instColl: [{ amount: 400 }],
      exchPurch: [{ purchase_price: 300 }],
      exchSold: [{ purchase_price: 250 }],
      hasInstallments: true,
      hasExchange: true,
    });
    // cogs = 400 + 700 + 250 = 1350
    expect(r.cogs).toBe(1350);
    // gross = (1500 + 400) - 1350 = 550
    expect(r.grossProfit).toBe(550);
    expect(r.netProfit).toBe(550 - 55);
  });

  it("handles empty/null inputs without NaN", () => {
    const r = computeProfitLoss({ sales: [], purchases: [], products: [] });
    expect(r.totalSales).toBe(0);
    expect(r.cogs).toBe(0);
    expect(r.netProfit).toBe(0);
    expect(Number.isNaN(r.netProfit)).toBe(false);
  });

  it("coerces string numerics from Supabase numeric columns", () => {
    const r = computeProfitLoss({
      sales: [{ total_amount: "100.50" as any, discount_amount: "0", shipping_cost: "5", tax_amount: "0" }],
      purchases: [],
      products: [],
    });
    expect(r.totalSales).toBe(100.5);
    expect(r.sellShipping).toBe(5);
  });
});