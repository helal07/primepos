import { Link, useOutletContext } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import type { StoreCtx } from "./StoreLayout";
export default function StoreCart() {
  const { tenant, settings } = useOutletContext<StoreCtx>();
  const { items, setQty, remove, subtotal } = useCart();
  if (items.length === 0) return <div className="container mx-auto px-4 py-16 text-center"><h1 className="text-2xl font-semibold">Your cart is empty</h1><Button asChild className="mt-4"><Link to={`/store/${tenant.slug}/shop`}>Browse products</Link></Button></div>;
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-3xl font-bold mb-6">Cart</h1>
      <div className="border rounded-lg divide-y">
        {items.map((i) => (
          <div key={`${i.productId}:${i.variationId ?? ""}`} className="flex items-center gap-3 p-3">
            {i.imageUrl && <img src={i.imageUrl} alt="" className="h-16 w-16 rounded object-cover" />}
            <div className="flex-1 min-w-0"><p className="font-medium truncate">{i.name}</p><p className="text-sm text-muted-foreground">{settings.currency} {i.price.toLocaleString()}</p></div>
            <div className="flex items-center border rounded"><button type="button" className="px-2 py-1" onClick={() => setQty(i.productId, i.qty - 1, i.variationId)}>-</button><span className="px-2 text-sm">{i.qty}</span><button type="button" className="px-2 py-1" onClick={() => setQty(i.productId, i.qty + 1, i.variationId)}>+</button></div>
            <p className="w-24 text-right font-medium">{settings.currency} {(i.qty * i.price).toLocaleString()}</p>
            <Button size="icon" variant="ghost" onClick={() => remove(i.productId, i.variationId)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </div>
        ))}
      </div>
      <div className="mt-6 flex justify-between items-center">
        <p className="text-lg">Subtotal: <span className="font-bold">{settings.currency} {subtotal.toLocaleString()}</span></p>
        <Button size="lg" disabled>Checkout (Phase 2)</Button>
      </div>
    </div>
  );
}
