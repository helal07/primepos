import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3, ShieldCheck, Smartphone, Globe, Users, Package,
  ShoppingCart, Calculator, Star, ArrowRight, CheckCircle2, Menu, X,
  Zap, HeadphonesIcon, Lock
} from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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

const features = [
  { icon: ShoppingCart, title: "Point of Sale", desc: "Lightning-fast POS with barcode scanning, receipt printing, and offline mode." },
  { icon: Package, title: "Inventory Management", desc: "Track stock levels, serial numbers, warranties, and manage multiple warehouses." },
  { icon: BarChart3, title: "Sales & Analytics", desc: "Real-time dashboards, revenue tracking, and AI-powered business insights." },
  { icon: Calculator, title: "Accounting", desc: "Full double-entry accounting with journal entries, trial balance, and cash flow." },
  { icon: Users, title: "HRM & Payroll", desc: "Employee management, GPS attendance, leave tracking, and automated payroll." },
  { icon: Globe, title: "CMS & Website", desc: "Built-in website builder with dynamic pages, SEO tools, and media management." },
  { icon: ShieldCheck, title: "Warranty & Servicing", desc: "End-to-end warranty tracking, claim management, and service scheduling." },
  { icon: Smartphone, title: "Mobile First", desc: "Fully responsive design that works beautifully on phones, tablets, and desktops." },
];

const reviews = [
  { name: "Rahim Ahmed", role: "Retail Store Owner", rating: 5, text: "Prime POS transformed how we manage our store. Inventory tracking and POS are seamless. Highly recommended!" },
  { name: "Fatima Begum", role: "Restaurant Manager", rating: 5, text: "The mobile-first design means I can check sales from anywhere. The analytics dashboard is incredibly powerful." },
  { name: "Kamal Hossain", role: "Electronics Shop", rating: 5, text: "Warranty tracking and serial number management saved us hours every week. Best ERP for small businesses." },
  { name: "Sarah Khan", role: "Boutique Owner", rating: 4, text: "Easy to set up and the customer support is excellent. The POS system is fast and reliable." },
];

const pricingPlans = [
  { name: "Starter", price: "Free", period: "", desc: "Perfect for small businesses getting started", features: ["1 User", "Basic POS", "Up to 100 Products", "Sales Reports", "Email Support"], popular: false },
  { name: "Business", price: "৳1,499", period: "/mo", desc: "For growing businesses that need more power", features: ["5 Users", "Full POS + Inventory", "Unlimited Products", "Accounting Module", "HRM & Payroll", "Priority Support"], popular: true },
  { name: "Enterprise", price: "৳4,999", period: "/mo", desc: "For large operations with advanced needs", features: ["Unlimited Users", "All Modules", "Multi-branch Support", "API Access", "Custom Reports", "Dedicated Account Manager", "White-label Option"], popular: false },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { data: seo } = useQuery({
    queryKey: ["business_settings", "cms_seo"],
    queryFn: async () => {
      const { data } = await supabase.from("business_settings").select("value").eq("key", "cms_seo").maybeSingle();
      return (data?.value as Record<string, string>) ?? {};
    },
  });
  const { data: promo } = useQuery({
    queryKey: ["business_settings", "cms_promo"],
    queryFn: async () => {
      const { data } = await supabase.from("business_settings").select("value").eq("key", "cms_promo").maybeSingle();
      return (data?.value as Record<string, string>) ?? {};
    },
  });
  const { data: faqs = [] } = useQuery({
    queryKey: ["faq_entries_public"],
    queryFn: async () => {
      const { data } = await supabase.from("faq_entries").select("*").eq("is_active", true).order("sort_order");
      return data ?? [];
    },
  });

  useEffect(() => {
    if (!seo) return;
    if (seo.title) document.title = seo.title;
    setMeta("description", seo.description || "");
    setMeta("keywords", seo.keywords || "");
    setMeta("og:title", seo.og_title || seo.title || "", "property");
    setMeta("og:description", seo.og_description || seo.description || "", "property");
    setMeta("og:image", seo.og_image || "", "property");
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:site", seo.twitter_handle || "");
    setLink("canonical", seo.canonical_url || "");

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
  }, [seo, faqs]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
                P
              </div>
              <span className="text-xl font-bold">Prime POS</span>
            </div>
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
              <a href="#features" className="block text-sm text-muted-foreground hover:text-foreground" onClick={() => setMobileMenuOpen(false)}>Features</a>
              <a href="#pricing" className="block text-sm text-muted-foreground hover:text-foreground" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
              <a href="#reviews" className="block text-sm text-muted-foreground hover:text-foreground" onClick={() => setMobileMenuOpen(false)}>Reviews</a>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => navigate("/login")}>Sign In</Button>
                <Button size="sm" className="flex-1" onClick={() => navigate("/register")}>Get Started</Button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 md:py-32 relative">
          <div className="text-center max-w-4xl mx-auto">
            <Badge variant="secondary" className="mb-6 px-4 py-1.5 text-sm">
              🚀 All-in-One Business Management
            </Badge>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-tight">
              Run Your Entire Business with{" "}
              <span className="text-primary">Prime POS</span>
            </h1>
            <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              POS, Inventory, Accounting, HRM, CMS & more — all in one powerful platform. 
              Built for modern businesses in Bangladesh and beyond.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="text-base px-8 py-6" onClick={() => navigate("/register")}>
                Start Free Trial <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button size="lg" variant="outline" className="text-base px-8 py-6" onClick={() => {
                document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
              }}>
                See All Features
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
            {[
              { value: "5,000+", label: "Active Businesses" },
              { value: "1M+", label: "Transactions/Month" },
              { value: "99.9%", label: "Uptime" },
              { value: "24/7", label: "Support" },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-2xl md:text-3xl font-bold text-primary">{stat.value}</div>
                <div className="mt-1 text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">Features</Badge>
            <h2 className="text-3xl md:text-4xl font-bold">Everything You Need to Grow</h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              One platform to manage your entire business — from sales to accounting, HR to warranties.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f) => (
              <Card key={f.title} className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-border/50">
                <CardHeader className="pb-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <f.icon className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-lg mt-3">{f.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-20 bg-muted/30 border-y border-border/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">Why Prime POS</Badge>
            <h2 className="text-3xl md:text-4xl font-bold">Built for Real Businesses</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Zap, title: "Lightning Fast", desc: "Optimized for speed. Your POS checkout takes under 2 seconds, even with thousands of products." },
              { icon: Lock, title: "Bank-Grade Security", desc: "End-to-end encryption, role-based access control, and automatic backups keep your data safe." },
              { icon: HeadphonesIcon, title: "Local Support", desc: "Dedicated support team available 24/7 via phone, chat, and email in Bengali and English." },
            ].map((item) => (
              <div key={item.title} className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4">
                  <item.icon className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                <p className="text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">Pricing</Badge>
            <h2 className="text-3xl md:text-4xl font-bold">Simple, Transparent Pricing</h2>
            <p className="mt-4 text-lg text-muted-foreground">Start free, upgrade as you grow. No hidden fees.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {pricingPlans.map((plan) => (
              <Card key={plan.name} className={`relative flex flex-col ${plan.popular ? "border-primary shadow-lg scale-105" : "border-border/50"}`}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">Most Popular</Badge>
                  </div>
                )}
                <CardHeader className="text-center pb-2">
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">{plan.desc}</p>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <ul className="space-y-3 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full mt-6"
                    variant={plan.popular ? "default" : "outline"}
                    onClick={() => navigate("/register")}
                  >
                    Get Started
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Reviews */}
      <section id="reviews" className="py-20 bg-muted/30 border-y border-border/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">Testimonials</Badge>
            <h2 className="text-3xl md:text-4xl font-bold">Loved by Businesses</h2>
            <p className="mt-4 text-lg text-muted-foreground">See what our customers have to say about Prime POS.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {reviews.map((r) => (
              <Card key={r.name} className="border-border/50">
                <CardContent className="pt-6">
                  <div className="flex gap-0.5 mb-3">
                    {Array.from({ length: r.rating }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                    {Array.from({ length: 5 - r.rating }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 text-muted-foreground/30" />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">"{r.text}"</p>
                  <div>
                    <div className="font-medium text-sm">{r.name}</div>
                    <div className="text-xs text-muted-foreground">{r.role}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl bg-primary p-8 md:p-16 text-center text-primary-foreground">
            {promo?.badge && <Badge variant="secondary" className="mb-4">{promo.badge}</Badge>}
            <h2 className="text-3xl md:text-4xl font-bold">{promo?.heading || "Ready to Transform Your Business?"}</h2>
            <p className="mt-4 text-lg opacity-90 max-w-2xl mx-auto">
              {promo?.subheading || "Join thousands of businesses already using Prime POS. Start your free trial today."}
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
              <p className="mt-4 text-muted-foreground">Everything you need to know about Prime POS.</p>
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
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-xs">P</div>
                <span className="font-bold">Prime POS</span>
              </div>
              <p className="text-sm text-muted-foreground">All-in-one ERP & POS solution for modern businesses.</p>
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
              <h4 className="font-semibold mb-3 text-sm">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">About</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Blog</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-border/50 text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} Prime POS. All rights reserved. <a href="https://messkhata.click" className="hover:text-foreground transition-colors">messkhata.click</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
