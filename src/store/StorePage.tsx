import { useOutletContext, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { StoreCtx } from "./StoreLayout";
export default function StorePage() {
  const { tenant } = useOutletContext<StoreCtx>();
  const { pageSlug } = useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["store_page", tenant.id, pageSlug],
    queryFn: async () => {
      const { data } = await supabase.from("cms_pages").select("*").eq("tenant_id", tenant.id).eq("slug", pageSlug!).eq("status", "published").maybeSingle();
      return data;
    },
  });
  if (isLoading) return <div className="container mx-auto px-4 py-8">Loading…</div>;
  if (!data) return <div className="container mx-auto px-4 py-16 text-center"><h1 className="text-2xl">Page not found</h1></div>;
  const sections = Array.isArray(data.content) ? (data.content as any[]) : [];
  return (
    <article className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-4xl font-bold mb-8">{data.title}</h1>
      <div className="space-y-8">
        {sections.map((s: any) => (
          <section key={s.id} className="space-y-3">
            {s.title && <h2 className="text-2xl font-semibold">{s.title}</h2>}
            {s.image_url && <img src={s.image_url} alt={s.title ?? ""} className="rounded-lg w-full" />}
            {s.content && <p className="whitespace-pre-wrap text-muted-foreground">{s.content}</p>}
          </section>
        ))}
      </div>
    </article>
  );
}
