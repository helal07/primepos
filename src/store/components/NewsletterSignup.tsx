import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function NewsletterSignup({ tenantId }: { tenantId: string }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    const { error } = await (supabase as any).from("newsletter_subscribers").insert({
      tenant_id: tenantId, email, source: "footer",
    });
    setLoading(false);
    if (error) {
      if (String(error.code) === "23505") toast.success("You're already subscribed!");
      else toast.error(error.message);
      return;
    }
    toast.success("Subscribed!");
    setEmail("");
  };
  return (
    <form onSubmit={submit} className="flex gap-2 max-w-sm">
      <Input type="email" required placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-9" />
      <Button type="submit" size="sm" disabled={loading}>{loading ? "..." : "Subscribe"}</Button>
    </form>
  );
}