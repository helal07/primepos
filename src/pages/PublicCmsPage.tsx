import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useEffect } from "react";
import { usePublishedCmsPage } from "@/hooks/useSaasAdmin";

interface Section {
  id: string;
  type: string;
  title?: string;
  content?: string;
  image_url?: string;
}

function setMeta(name: string, content: string) {
  if (!content) return;
  let tag = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!tag) { tag = document.createElement("meta"); tag.setAttribute("name", name); document.head.appendChild(tag); }
  tag.setAttribute("content", content);
}

export default function PublicCmsPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { data: page, isLoading } = usePublishedCmsPage(slug);

  useEffect(() => {
    if (!page) return;
    document.title = page.meta_title || page.title;
    setMeta("description", page.meta_description || "");
  }, [page]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  }
  if (!page) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8 text-center">
        <h1 className="text-3xl font-bold">Page not found</h1>
        <p className="text-muted-foreground">This page does not exist or is not published.</p>
        <Button onClick={() => navigate("/")}>Back to home</Button>
      </div>
    );
  }

  const sections: Section[] = Array.isArray(page.content) ? (page.content as any) : [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/50 bg-background/95 backdrop-blur sticky top-0 z-40">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Home
          </Button>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-4xl md:text-5xl font-bold mb-8">{page.title}</h1>
        {page.featured_image && (
          <img src={page.featured_image} alt={page.title} className="w-full rounded-lg mb-8" />
        )}
        <div className="space-y-10">
          {sections.map((s) => (
            <section key={s.id} className="space-y-3">
              {s.title && <h2 className="text-2xl font-semibold">{s.title}</h2>}
              {s.image_url && (s.type === "hero" || s.type === "image_text" || s.type === "gallery") && (
                <img src={s.image_url} alt={s.title || ""} className="w-full rounded-lg" />
              )}
              {s.type === "custom_html" && s.content ? (
                <div className="prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: s.content }} />
              ) : (
                s.content && <p className="text-base leading-relaxed text-muted-foreground whitespace-pre-line">{s.content}</p>
              )}
            </section>
          ))}
          {sections.length === 0 && (
            <p className="text-muted-foreground">No content yet.</p>
          )}
        </div>
      </article>
    </div>
  );
}