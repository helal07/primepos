import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

/**
 * Exchange Sell uses the standard POS flow. We pass the linked product
 * via query string so POS / staff can pick it up and complete a regular sale.
 * After sale completion the staff can mark the exchange as sold from the
 * purchase view.
 */
export default function ExchangeSell() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  useEffect(() => {
    const productId = params.get("product");
    const exchangeId = params.get("exchange");
    toast.info("Use POS to sell the exchange device. Profit is auto-calculated from the original buy price.");
    const search = new URLSearchParams();
    if (productId) search.set("product", productId);
    if (exchangeId) search.set("exchange", exchangeId);
    navigate(`/pos${search.toString() ? `?${search.toString()}` : ""}`, { replace: true });
  }, [navigate, params]);

  return null;
}