import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import * as Icons from "lucide-react";
import { ArrowRight, CheckCircle2, Menu, X, Star } from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  useLandingFeatures,
  useLandingReviews,
  useLandingPricing,
} from "@/hooks/useSaasAdmin";

function setMeta(name: string, content: string, attr: "name" | "property" = "name") {
  if (!content) return;
  let tag = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`);
  if (!tag) { tag = document.createElement("meta"); tag.setAttribute(attr, name); document.head.appendChild(tag); }
  tag.setAttribute("content", content);
}
function setLink(rel: string, href: string) {
  if (!href) return;
  let tag = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!tag) { tag = document.createElement("link"); tag.setAttribute("rel", rel); document.head.appendChild(tag); }
  tag.setAttribute("href", href);
}

function getLucideIcon(name?: string) {
  if (!name) return Icons.Sparkles;
  const Icon = (Icons as any)[name];
  return Icon || Icons.Sparkles;
}

function useGlobalSetting<T = any>(key: string) {
  return useQuery({
    queryKey: ["business_settings", key, "global"],
    queryFn: async () => {
      const { data } = await supabase
        .from("business_settings")
        .select("value")
        .eq("key", key)
        .is("tenant_id", null)
        .maybeSingle();
      return (data?.value ?? null) as T | null;
    },
  });
}

const DEFAULT_STATS = [
  { value: "5,000+", label: "Active Businesses" },
  { value: "1M+", label: "Transactions/Month" },
  { value: "99.9%", label: "Uptime" },
  { value: "24/7", label: "Support" },
];

const DEFAULT_WHY = [
  { icon: "Zap", title: "Lightning Fast", desc: "Optimized for speed. Your POS checkout takes under 2 seconds, even with thousands of products." },
  { icon: "Lock", title: "Bank-Grade Security", desc: "End-to-end encryption, role-based access control, and automatic backups keep your data safe." },
  { icon: "HeadphonesIcon", title: "Local Support", desc: "Dedicated support team available 24/7 via phone, chat, and email in Bengali and English." },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { data: branding } = useGlobalSetting<Record<string, string>>("cms_branding");
  const { data: hero } = useGlobalSetting<Record<string, string>>("cms_hero");
  const { data: stats } = useGlobalSetting<Record<string, string>>("cms_stats");
  const { data: why } = useGlobalSetting<Record<string, string>>("cms_why");
  const { data: footer } = useGlobalSetting<Record<string, string>>("cms_footer");
  const { data: featuresMeta } = useGlobalSetting<Record<string, string>>("cms_features");
  const { data: reviewsMeta } = useGlobalSetting<Record<string, string>>("cms_testimonials");
  const { data: seo } = useGlobalSetting<Record<string, string>>("cms_seo");
  const { data: promo } = useGlobalSetting<Record<string, string>>("cms_promo");

  const { data: featuresList = [] } = useLandingFeatures();
  const { data: reviewsList = [] } = useLandingReviews();
  const { data: pricing = [] } = useLandingPricing();

  const { data: faqs = [] } = useQuery({
    queryKey: ["faq_entries_public"],
    queryFn: async () => {
      const { data } = await supabase.from("faq_entries").select("*").eq("is_active", true).order("sort_order");
      return data ?? [];
    },
  });

  const brandName = branding?.brand_name || "Prime POS";
  const brandShort = branding?.brand_short || brandName.charAt(0);
  const logoUrl = branding?.logo_url;

  useEffect(() => {
    if (seo?.title) document.title = seo.title;
    else if (brandName) document.title = `${brandName} — All-in-One Business Management`;
    setMeta("description", seo?.description || "");
    setMeta("keywords", seo?.keywords || "");
    setMeta("og:title", seo?.og_title || seo?.title || brandName, "property");
    setMeta("og:description", seo?.og_description || seo?.description || "", "property");
    setMeta("og:image", seo?.og_image || branding?.og_default_image || "", "property");
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:site", seo?.twitter_handle || "");
    setLink("canonical", seo?.canonical_url || "");

    if (faqs.length) {
      const ld = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqs.map((f: any) => ({
          "@type": "Question",
          name: f.question,
          acceptedAnswer: { "@type": "Answer", text: f.answer },
        })),
      };
      let s = document.head.querySelector<HTMLScriptElement>('script[data-faq-jsonld="1"]');
      if (!s) { s = document.createElement("script"); s.type = "application/ld+json"; s.dataset.faqJsonld = "1"; document.head.appendChild(s); }
      s.textContent = JSON.stringify(ld);
    }
  }, [seo, faqs, brandName, branding]);

  const statsData = stats
    ? [
        { value: stats.stat1_value, label: stats.stat1_label },
        { value: stats.stat2_value, label: stats.stat2_label },
        { value: stats.stat3_value, label: stats.stat3_label },
        { value: stats.stat4_value, label: stats.stat4_label },
      ].filter((s) => s.value || s.label)
    : DEFAULT_STATS;

  const whyData = why
    ? [
        { icon: why.card1_icon || "Zap", title: why.card1_title, desc: why.card1_desc },
        { icon: why.card2_icon || "Lock", title: why.card2_title, desc: why.card2_desc },
        { icon: why.card3_icon || "HeadphonesIcon", title: why.card3_title, desc: why.card3_desc },
      ].filter((c) => c.title || c.desc)
    : DEFAULT_WHY;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              {logoUrl ? (
                <img src={logoUrl} alt={brandName} className="h-9 w-auto max-w-[140px] object-contain" />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
                  {brandShort}
                </div>
              )}
              <span className="text-xl font-bold">{brandName}</span>
            </Link>
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
              <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
              <a href="#reviews" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Reviews</a>
              <Button variant="outline" size="sm" onClick={() => navigate("/login")}>Sign In</Button>
              <Button size="sm" onClick={() => navigate("/register")}>Get Started</Button>
            </div>
            <button className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
          {mobileMenuOpen && (
            <div className="md:hidden pb-4 space-y-3">
              <a href="#features" className="block text-sm text-muted-foreground" onClick={() => setMobileMenuOpen(false)}>Features</a>
              <a href="#pricing" className="block text-sm text-muted-foreground" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
              <a href="#reviews" className="block text-sm text-muted-foreground" onClick={() => setMobileMenuOpen(false)}>Reviews</a>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => navigate("/login")}>Sign In</Button>
                <Button size="sm" className="flex-1" onClick={() => navigate("/register")}>Get Started</Button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 md:py-32 relative">
          <div className="text-center max-w-4xl mx-auto">
            {(hero?.badge ?? "🚀 All-in-One Business Management") && (
              <Badge variant="secondary" className="mb-6 px-4 py-1.5 text-sm">
                {hero?.badge || "🚀 All-in-One Business Management"}
              </Badge>
            )}
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-tight">
              {hero?.title || "Run Your Entire Business with"}{" "}
              <span className="text-primary">{hero?.title_highlight || brandName}</span>
            </h1>
            <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              {hero?.subtitle || "POS, Inventory, Accounting, HRM, CMS & more — all in one powerful platform."}
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="text-base px-8 py-6" onClick={() => navigate(hero?.cta_link || "/register")}>
                {hero?.cta_text || "Start Free Trial"} <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button size="lg" variant="outline" className="text-base px-8 py-6"
                onClick={() => {
                  if (hero?.secondary_link) navigate(hero.secondary_link);
                  else document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
                }}>
                {hero?.secondary_text || "See All Features"}
              </Button>
            </div>
            <div className="mt-12 flex flex-wrap justify-center gap-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> No credit card required</div>
              <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Free forever plan</div>
              <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Setup in 2 minutes</div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-border/50 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {statsData.map((stat, i) => (
              <div key={i}>
                <div className="text-2xl md:text-3xl font-bold text-primary">{stat.value}</div>
                <div className="mt-1 text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      {featuresList.length > 0 && (
        <section id="features" className="py-20 md:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <Badge variant="secondary" className="mb-4">Features</Badge>
              <h2 className="text-3xl md:text-4xl font-bold">{featuresMeta?.heading || "Everything You Need to Grow"}</h2>
              <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                {featuresMeta?.subheading || "One platform to manage your entire business — from sales to accounting, HR to warranties."}
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuresList.map((f: any) => {
                const Icon = getLucideIcon(f.icon);
                return (
                  <Card key={f.id} className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-border/50">
                    <CardHeader className="pb-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        <Icon className="h-6 w-6" />
                      </div>
                      <CardTitle className="text-lg mt-3">{f.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Why Choose Us */}
      <section className="py-20 bg-muted/30 border-y border-border/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">Why {brandName}</Badge>
            <h2 className="text-3xl md:text-4xl font-bold">{why?.heading || "Built for Real Businesses"}</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {whyData.map((item, i) => {
              const Icon = getLucideIcon(item.icon);
              return (
                <div key={i} className="text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4">
                    <Icon className="h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                  <p className="text-muted-foreground">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing */}
      {pricing.length > 0 && (
        <section id="pricing" className="py-20 md:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <Badge variant="secondary" className="mb-4">Pricing</Badge>
              <h2 className="text-3xl md:text-4xl font-bold">Simple, Transparent Pricing</h2>
              <p className="mt-4 text-lg text-muted-foreground">Start free, upgrade as you grow. No hidden fees.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {pricing.map((plan: any, idx: number) => {
                const popular = idx === Math.floor(pricing.length / 2);
                const features = Array.isArray(plan.features) ? plan.features : [];
                return (
                  <Card key={plan.id} className={`relative flex flex-col ${popular ? "border-primary shadow-lg scale-105" : "border-border/50"}`}>
                    {popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <Badge className="bg-primary text-primary-foreground">Most Popular</Badge>
                      </div>
                    )}
                    <CardHeader className="text-center pb-2">
                      <CardTitle className="text-xl">{plan.name}</CardTitle>
                      <div className="mt-4">
                        <span className="text-4xl font-bold">৳{Number(plan.price).toLocaleString()}</span>
                        <span className="text-muted-foreground">/{plan.duration_days || 30}d</span>
                      </div>
                      {plan.description && <p className="text-sm text-muted-foreground mt-2">{plan.description}</p>}
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col">
                      <ul className="space-y-3 flex-1">
                        {features.map((f: string, i: number) => (
                          <li key={i} className="flex items-center gap-2 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                            {f}
                          </li>
                        ))}
                      </ul>
                      <Button className="w-full mt-6" variant={popular ? "default" : "outline"} onClick={() => navigate("/register")}>
                        Get Started
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Reviews */}
      {reviewsList.length > 0 && (
        <section id="reviews" className="py-20 bg-muted/30 border-y border-border/50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <Badge variant="secondary" className="mb-4">Testimonials</Badge>
              <h2 className="text-3xl md:text-4xl font-bold">{reviewsMeta?.heading || "Loved by Businesses"}</h2>
              <p className="mt-4 text-lg text-muted-foreground">{reviewsMeta?.subheading || `See what our customers have to say about ${brandName}.`}</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {reviewsList.map((r: any) => (
                <Card key={r.id} className="border-border/50">
                  <CardContent className="pt-6">
                    <div className="flex gap-0.5 mb-3">
                      {Array.from({ length: r.rating }).map((_, i) => <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />)}
                      {Array.from({ length: Math.max(0, 5 - r.rating) }).map((_, i) => <Star key={`o${i}`} aria-hidden="true" className="h-4 w-4 text-muted-foreground" />)}
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-4">"{r.text}"</p>
                    <div>
                      <div className="font-medium text-sm">{r.name}</div>
                      {r.role && <div className="text-xs text-muted-foreground">{r.role}</div>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Promo / CTA */}
      <section className="py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl bg-primary p-8 md:p-16 text-center text-primary-foreground">
            {promo?.badge && <Badge variant="secondary" className="mb-4">{promo.badge}</Badge>}
            <h2 className="text-3xl md:text-4xl font-bold">{promo?.heading || "Ready to Transform Your Business?"}</h2>
            <p className="mt-4 text-lg opacity-90 max-w-2xl mx-auto">
              {promo?.subheading || `Join thousands of businesses already using ${brandName}. Start your free trial today.`}
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" variant="secondary" className="text-base px-8" onClick={() => navigate(promo?.cta_link || "/register")}>
                {promo?.cta_text || "Start Free Trial"} <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      {faqs.length > 0 && (
        <section id="faq" className="py-20 md:py-28 border-t border-border/50">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold">Frequently Asked Questions</h2>
              <p className="mt-4 text-muted-foreground">Everything you need to know about {brandName}.</p>
            </div>
            <div className="space-y-4">
              {faqs.map((f: any) => (
                <Card key={f.id} className="border-border/50">
                  <CardContent className="pt-6">
                    <h3 className="font-semibold mb-2">{f.question}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{f.answer}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-border/50 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                {logoUrl ? (
                  <img src={logoUrl} alt={brandName} className="h-8 w-auto max-w-[120px] object-contain" />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-xs">{brandShort}</div>
                )}
                <span className="font-bold">{brandName}</span>
              </div>
              <p className="text-sm text-muted-foreground">{footer?.tagline || "All-in-one ERP & POS solution for modern businesses."}</p>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a></li>
                <li><a href="#reviews" className="hover:text-foreground transition-colors">Reviews</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm">Resources</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground transition-colors">Features</a></li>
                <li><a href="#modules" className="hover:text-foreground transition-colors">Modules</a></li>
                <li><a href="#faq" className="hover:text-foreground transition-colors">FAQ</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm">Get Started</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/register" className="hover:text-foreground transition-colors">Sign Up</Link></li>
                <li><Link to="/login" className="hover:text-foreground transition-colors">Sign In</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-border/50 text-center text-sm text-muted-foreground">
            {footer?.copyright || `© ${new Date().getFullYear()} ${brandName}. All rights reserved.`}
          </div>
        </div>
      </footer>
    </div>
  );
}
