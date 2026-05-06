import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users, Building2, TrendingUp, DollarSign, Clock, AlertTriangle,
  CheckCircle2, MessageSquare, Activity, Package as PackageIcon,
} from "lucide-react";
import { useTenants, usePackages } from "@/hooks/useSaasAdmin";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";

const STATUS_COLOR: Record<string, string> = {
  active: "#10b981",
  trial: "#f59e0b",
  pending_approval: "#3b82f6",
  suspended: "#ef4444",
  expired: "#f97316",
};

const PIE_COLORS = ["#0ea5e9", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4"];

function daysBetween(a: Date, b: Date) {
  return Math.floor((b.getTime() - a.getTime()) / 86_400_000);
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { data: tenants } = useTenants();
  const { data: packages } = usePackages();

  const { data: smsRevenue } = useQuery({
    queryKey: ["admin_sms_revenue"],
    queryFn: async () => {
      const { data } = await supabase
        .from("sms_purchases")
        .select("amount, status, purchased_at")
        .eq("status", "approved");
      return data ?? [];
    },
  });

  const stats = useMemo(() => {
    const t = tenants ?? [];
    const now = new Date();
    const active = t.filter((x: any) => x.status === "active");
    const trial = t.filter((x: any) => x.status === "trial");
    const pending = t.filter((x: any) => x.status === "pending_approval");
    const suspended = t.filter((x: any) => x.status === "suspended");
    const expired = t.filter((x: any) => x.status === "expired");

    const mrr = active.reduce((s: number, x: any) => {
      const price = Number(x.saas_packages?.price ?? 0);
      const days = Number(x.saas_packages?.duration_days ?? 30);
      return s + (days > 0 ? (price / days) * 30 : 0);
    }, 0);

    const arr = mrr * 12;

    // Expiring soon (next 7 days)
    const expiringSoon = active.filter((x: any) => {
      if (!x.subscription_end) return false;
      const d = daysBetween(now, new Date(x.subscription_end));
      return d >= 0 && d <= 7;
    });

    // New signups last 30 days
    const newLast30 = t.filter((x: any) => {
      const d = daysBetween(new Date(x.created_at), now);
      return d <= 30;
    });

    return {
      total: t.length,
      active: active.length,
      trial: trial.length,
      pending: pending.length,
      suspended: suspended.length,
      expired: expired.length,
      mrr,
      arr,
      expiringSoon,
      newLast30: newLast30.length,
    };
  }, [tenants]);

  const signupSeries = useMemo(() => {
    const t = tenants ?? [];
    const now = new Date();
    const buckets: { day: string; signups: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = `${d.getMonth() + 1}/${d.getDate()}`;
      buckets.push({ day: key, signups: 0 });
    }
    t.forEach((x: any) => {
      const created = new Date(x.created_at);
      const diff = daysBetween(created, now);
      if (diff >= 0 && diff < 30) {
        const idx = 29 - diff;
        if (buckets[idx]) buckets[idx].signups += 1;
      }
    });
    return buckets;
  }, [tenants]);

  const planDistribution = useMemo(() => {
    const t = tenants ?? [];
    const map = new Map<string, number>();
    t.forEach((x: any) => {
      const name = x.saas_packages?.name ?? "No Package";
      map.set(name, (map.get(name) ?? 0) + 1);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [tenants]);

  const totalSmsRevenue = (smsRevenue ?? []).reduce((s, p: any) => s + Number(p.amount ?? 0), 0);

  const kpis = [
    {
      label: "Monthly Recurring Revenue", value: `৳${Math.round(stats.mrr).toLocaleString()}`,
      sub: `ARR ৳${Math.round(stats.arr).toLocaleString()}`, icon: DollarSign, accent: "text-emerald-400",
    },
    {
      label: "Active Tenants", value: stats.active, sub: `${stats.total} total`,
      icon: Building2, accent: "text-sky-400",
    },
    {
      label: "New Signups (30d)", value: stats.newLast30, sub: `${stats.pending} pending approval`,
      icon: TrendingUp, accent: "text-violet-400",
    },
    {
      label: "SMS Revenue", value: `৳${Math.round(totalSmsRevenue).toLocaleString()}`,
      sub: `${smsRevenue?.length ?? 0} purchases`, icon: MessageSquare, accent: "text-amber-400",
    },
  ];

  const statusBreakdown = [
    { label: "Active", count: stats.active, color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30", icon: CheckCircle2 },
    { label: "Trial", count: stats.trial, color: "bg-amber-500/10 text-amber-400 border-amber-500/30", icon: Clock },
    { label: "Pending", count: stats.pending, color: "bg-sky-500/10 text-sky-400 border-sky-500/30", icon: Activity },
    { label: "Suspended", count: stats.suspended, color: "bg-red-500/10 text-red-400 border-red-500/30", icon: AlertTriangle },
    { label: "Expired", count: stats.expired, color: "bg-orange-500/10 text-orange-400 border-orange-500/30", icon: AlertTriangle },
    { label: "Packages", count: packages?.length ?? 0, color: "bg-violet-500/10 text-violet-400 border-violet-500/30", icon: PackageIcon },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Platform Overview</h1>
          <p className="text-sm text-muted-foreground">SaaS health, revenue and tenant lifecycle at a glance</p>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{k.label}</div>
              <k.icon className={`h-4 w-4 ${k.accent}`} />
            </div>
            <div className="mt-2 text-2xl font-semibold">{k.value}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Status pills */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {statusBreakdown.map((s) => (
          <button
            key={s.label}
            onClick={() => navigate(s.label === "Packages" ? "/superadmin/packages" : "/superadmin/tenants")}
            className={`flex items-center justify-between rounded-lg border px-3 py-2.5 text-left transition hover:opacity-90 ${s.color}`}
          >
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider opacity-80">{s.label}</div>
              <div className="text-lg font-semibold">{s.count}</div>
            </div>
            <s.icon className="h-4 w-4 opacity-80" />
          </button>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border bg-card p-4 shadow-sm lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Signups — last 30 days</h3>
            <span className="text-xs text-muted-foreground">{stats.newLast30} total</span>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={signupSeries} margin={{ top: 5, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="signups" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#g1)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold">Plan distribution</h3>
          <div className="h-56">
            {planDistribution.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={planDistribution} dataKey="value" nameKey="name" innerRadius={42} outerRadius={70} paddingAngle={2}>
                    {planDistribution.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend wrapperStyle={{ fontSize: 11 }} iconSize={8} />
                  <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Two columns: Expiring + Recent signups */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h3 className="text-sm font-semibold">Expiring within 7 days</h3>
            <span className="text-xs text-muted-foreground">{stats.expiringSoon.length}</span>
          </div>
          <div className="divide-y">
            {stats.expiringSoon.length === 0 ? (
              <div className="px-4 py-8 text-center text-xs text-muted-foreground">No subscriptions expiring soon.</div>
            ) : (
              stats.expiringSoon.slice(0, 6).map((t: any) => {
                const left = daysBetween(new Date(), new Date(t.subscription_end));
                return (
                  <button
                    key={t.id}
                    onClick={() => navigate(`/superadmin/tenants/${t.id}`)}
                    className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/50"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{t.name}</div>
                      <div className="truncate text-xs text-muted-foreground">{t.email ?? t.phone ?? "—"}</div>
                    </div>
                    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                      left <= 2 ? "border-red-500/30 bg-red-500/10 text-red-500"
                      : "border-amber-500/30 bg-amber-500/10 text-amber-500"
                    }`}>
                      {left}d left
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="rounded-xl border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h3 className="text-sm font-semibold">Recent signups</h3>
            <button onClick={() => navigate("/superadmin/tenants")} className="text-xs text-primary hover:underline">View all</button>
          </div>
          <div className="divide-y">
            {!tenants?.length ? (
              <div className="px-4 py-8 text-center text-xs text-muted-foreground">No tenants yet.</div>
            ) : (
              tenants.slice(0, 6).map((t: any) => (
                <button
                  key={t.id}
                  onClick={() => navigate(`/superadmin/tenants/${t.id}`)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/50"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: STATUS_COLOR[t.status] ?? "#6b7280" }}
                    />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{t.name}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {t.saas_packages?.name ?? "No package"} · {new Date(t.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <span className="shrink-0 text-[11px] capitalize text-muted-foreground">
                    {t.status === "pending_approval" ? "pending" : t.status}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
