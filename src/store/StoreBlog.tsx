import { useOutletContext, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { StoreCtx } from "./StoreLayout";

export default function StoreBlog() {
  const { tenant } = useOutletContext<StoreCtx>();
  const { data: posts = [] } = useQuery({
    queryKey: ["blog_posts", tenant.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("blog_posts")
        .select("id, slug, title, excerpt, cover_url, published_at, author_name")
        .eq("tenant_id", tenant.id)
        .eq("is_published", true)
        .order("published_at", { ascending: false });
      return data || [];
    },
  });
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Blog</h1>
      {posts.length === 0 ? (
        <p className="text-muted-foreground">No posts yet.</p>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((p: any) => (
            <Link key={p.id} to={`/store/${tenant.slug}/blog/${p.slug}`} className="group">
              {p.cover_url && <img src={p.cover_url} alt={p.title} className="w-full aspect-video object-cover rounded-lg mb-3" />}
              <h2 className="font-semibold text-lg group-hover:text-primary">{p.title}</h2>
              <p className="text-sm text-muted-foreground line-clamp-3 mt-1">{p.excerpt}</p>
              {p.published_at && <p className="text-xs text-muted-foreground mt-2">{new Date(p.published_at).toLocaleDateString()}</p>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}