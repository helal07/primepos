import { useOutletContext, useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { StoreCtx } from "./StoreLayout";

export default function StoreBlogPost() {
  const { tenant, base } = useOutletContext<StoreCtx>();
  const { postSlug } = useParams();
  const { data: post, isLoading } = useQuery({
    queryKey: ["blog_post", tenant.id, postSlug],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("blog_posts").select("*")
        .eq("tenant_id", tenant.id).eq("slug", postSlug).eq("is_published", true).maybeSingle();
      return data;
    },
  });
  if (isLoading) return <div className="container mx-auto px-4 py-8">Loading…</div>;
  if (!post) return <div className="container mx-auto px-4 py-8">Post not found. <Link className="text-primary underline" to={`${base}/blog`}>Back to blog</Link></div>;
  return (
    <article className="container mx-auto px-4 py-8 max-w-3xl">
      {post.cover_url && <img src={post.cover_url} alt={post.title} className="w-full aspect-video object-cover rounded-lg mb-6" />}
      <h1 className="text-3xl md:text-4xl font-bold mb-2">{post.title}</h1>
      {post.published_at && <p className="text-sm text-muted-foreground mb-6">{new Date(post.published_at).toLocaleDateString()} {post.author_name ? `• ${post.author_name}` : ""}</p>}
      <div className="prose prose-neutral max-w-none whitespace-pre-wrap">{post.content}</div>
    </article>
  );
}