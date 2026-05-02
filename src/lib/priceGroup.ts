export type PriceOverride = { price: number; price_type: "fixed" | "percent" };

/**
 * Resolve the effective unit price for a product/variation given an active
 * selling price group and the loaded overrides map.
 *
 * Map key format: `${product_id}:${variation_id ?? "base"}:${group_id}`
 */
export function resolvePrice(
  product: { id: string; selling_price: number | string },
  variationId: string | null | undefined,
  defaultPrice: number,
  priceGroupId: string | null,
  overrides: Record<string, PriceOverride>,
): number {
  const base = Number(defaultPrice ?? product.selling_price ?? 0);
  if (!priceGroupId) return base;
  const key = `${product.id}:${variationId ?? "base"}:${priceGroupId}`;
  const o = overrides[key];
  if (!o) return base;
  if (o.price_type === "fixed") return Number(o.price);
  // percent: positive = markup, negative = discount
  return Math.max(0, base * (1 + Number(o.price) / 100));
}