import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export interface CartItem {
  productId: string;
  variationId?: string | null;
  name: string;
  price: number;
  qty: number;
  imageUrl?: string | null;
}

interface CartCtx {
  items: CartItem[];
  add: (item: CartItem) => void;
  remove: (productId: string, variationId?: string | null) => void;
  setQty: (productId: string, qty: number, variationId?: string | null) => void;
  clear: () => void;
  count: number;
  subtotal: number;
}

const Ctx = createContext<CartCtx | null>(null);

export function CartProvider({ tenantSlug, children }: { tenantSlug: string; children: React.ReactNode }) {
  const storageKey = `cart:${tenantSlug}`;
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(items));
    } catch {}
  }, [items, storageKey]);

  const keyOf = (p: string, v?: string | null) => `${p}:${v ?? ""}`;

  const add = useCallback((item: CartItem) => {
    setItems((prev) => {
      const k = keyOf(item.productId, item.variationId);
      const ix = prev.findIndex((i) => keyOf(i.productId, i.variationId) === k);
      if (ix >= 0) {
        const copy = [...prev];
        copy[ix] = { ...copy[ix], qty: copy[ix].qty + item.qty };
        return copy;
      }
      return [...prev, item];
    });
  }, []);

  const remove = useCallback((productId: string, variationId?: string | null) => {
    setItems((prev) => prev.filter((i) => keyOf(i.productId, i.variationId) !== keyOf(productId, variationId)));
  }, []);

  const setQty = useCallback((productId: string, qty: number, variationId?: string | null) => {
    setItems((prev) =>
      prev
        .map((i) =>
          keyOf(i.productId, i.variationId) === keyOf(productId, variationId) ? { ...i, qty: Math.max(1, qty) } : i,
        )
        .filter((i) => i.qty > 0),
    );
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartCtx>(
    () => ({
      items,
      add,
      remove,
      setQty,
      clear,
      count: items.reduce((s, i) => s + i.qty, 0),
      subtotal: items.reduce((s, i) => s + i.qty * i.price, 0),
    }),
    [items, add, remove, setQty, clear],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
