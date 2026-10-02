"use client";

import type { DashboardStats } from "@/hooks/use-dashboard-stats";
import { formatINR } from "@/lib/utils";
import {
  ArrowDownRight,
  ArrowUpRight,
  Boxes,
  CircleAlert,
  IndianRupee,
  Package,
  ReceiptText,
  RotateCw,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const chartTooltip = {
  borderRadius: 10,
  border: "1px solid var(--border)",
  background: "var(--surface)",
  color: "var(--ink)",
  fontSize: 12,
  boxShadow: "var(--card-shadow)",
};

const compactINR = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  notation: "compact",
  maximumFractionDigits: 1,
});

export function RevenueCard({ stats }: { stats: DashboardStats }) {
  const hasRevenue = stats.revenueTrend.some((point) => point.revenue > 0);

  return (
    <section className="relative min-h-[340px] overflow-hidden rounded-[16px] bg-gradient-to-br from-[#2455e6] via-[#2563eb] to-[#31b5e8] p-5 text-white shadow-[0_12px_30px_rgba(36,85,230,0.2)] sm:min-h-[370px] sm:p-6" aria-labelledby="revenue-title">
      <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full border border-white/10" />
      <div className="pointer-events-none absolute -right-4 -top-12 h-44 w-44 rounded-full border border-white/10" />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-white/15">
              <TrendingUp className="h-[18px] w-[18px]" aria-hidden />
            </span>
            <h2 id="revenue-title" className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/85">
              Revenue · Last 30 days
            </h2>
          </div>
          <div className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-[2.5rem]">
            {formatINR(stats.last30Revenue)}
          </div>
          <p className="mt-1 text-sm text-white/80">
            {stats.monthInvoiceCount} invoice{stats.monthInvoiceCount === 1 ? "" : "s"} this month
          </p>
        </div>
        <div className="shrink-0 rounded-[10px] border border-white/15 bg-white/15 px-3 py-2 text-right backdrop-blur-sm">
          <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/75">Today</div>
          <div className="mt-0.5 font-mono text-sm font-semibold tabular-nums sm:text-base">
            {formatINR(stats.todayRevenue)}
          </div>
        </div>
      </div>

      <div className="relative mt-6 h-[175px] sm:mt-7 sm:h-[195px]">
        {hasRevenue ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={stats.revenueTrend} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="dashboard-revenue-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#ffffff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.2)" strokeDasharray="3 6" />
              <XAxis
                dataKey="label"
                tick={{ fill: "rgba(255,255,255,0.8)", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                interval={6}
              />
              <YAxis
                width={48}
                tickFormatter={(value: number) => compactINR.format(value)}
                tick={{ fill: "rgba(255,255,255,0.78)", fontSize: 9 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={chartTooltip}
                formatter={(value) => [formatINR(Number(value ?? 0)), "Revenue"]}
                labelStyle={{ color: "var(--slate)" }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#ffffff"
                strokeWidth={2.5}
                fill="url(#dashboard-revenue-fill)"
                activeDot={{ r: 4, strokeWidth: 2, stroke: "#ffffff", fill: "#2455e6" }}
                isAnimationActive
                animationDuration={240}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center rounded-[11px] border border-white/15 bg-white/[0.06] px-5 text-center text-sm font-medium text-white/85">
            No invoice revenue recorded yet - chart fills as sales are booked.
          </div>
        )}
      </div>
    </section>
  );
}

export function UnitsOnHandCard({ stats }: { stats: DashboardStats }) {
  const hasMovements = stats.stockTrend.length > 0;

  return (
    <section className="rounded-[16px] border border-sky-200/70 bg-gradient-to-br from-sky-50 to-surface p-5 shadow-card dark:border-sky-900/60 dark:from-sky-950/30 dark:to-surface sm:p-6" aria-labelledby="units-title">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate">
            <Package className="h-4 w-4 text-primary" aria-hidden />
            <h2 id="units-title">Units on hand</h2>
          </div>
          <div className="mt-2 font-display text-3xl font-bold tracking-tight text-ink">
            {stats.totalStockUnits.toLocaleString("en-IN")}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate">Stock value</div>
          <div className="mt-1 font-mono text-sm font-semibold tabular-nums text-ink">{formatINR(stats.totalStockValue)}</div>
        </div>
      </div>

      <div className="mt-4 h-[180px]">
        {hasMovements ? (
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 8, right: 5, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 6" />
              <XAxis
                type="number"
                dataKey="x"
                domain={[stats.startTimestamp, stats.endTimestamp]}
                tickFormatter={(timestamp: number) => new Date(timestamp).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                tick={{ fill: "var(--slate)", fontSize: 9 }}
                axisLine={false}
                tickLine={false}
                minTickGap={24}
              />
              <YAxis type="number" dataKey="y" tick={{ fill: "var(--slate)", fontSize: 9 }} axisLine={false} tickLine={false} width={26} />
              <Tooltip
                contentStyle={chartTooltip}
                labelFormatter={(timestamp) => new Date(Number(timestamp)).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                formatter={(value) => [`${Number(value ?? 0).toLocaleString("en-IN")} units`, "On hand"]}
              />
              {stats.stockTrend.map((series) => (
                <Scatter key={series.id} name={series.name} data={series.points} fill={series.color} isAnimationActive={false} />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center rounded-[11px] border border-dashed border-border px-4 text-center text-sm text-slate">
            No recent stock movements - trend appears after stock in/out activity.
          </div>
        )}
      </div>

      <div className="mt-2 flex min-h-5 flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate">
        {stats.stockTrend.map((series) => (
          <span key={series.id} className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: series.color }} />
            {series.name}
          </span>
        ))}
      </div>
      <p className="mt-1 text-[10px] text-slate-dim">Reconstructed from stock movements · last 30 days</p>
    </section>
  );
}

export function KpiCard({
  href,
  icon: Icon,
  label,
  value,
  subtitle,
  tone,
  prominent = false,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  value: string;
  subtitle: string;
  tone: "blue" | "amber" | "rose" | "violet" | "green";
  prominent?: boolean;
}) {
  const toneClasses = {
    blue: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
    amber: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    rose: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
    violet: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
    green: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  };

  return (
    <Link
      href={href}
      className={`group flex min-h-[132px] flex-col justify-between rounded-[14px] border border-border bg-surface p-4 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lift ${prominent ? "border-rose-200/80 dark:border-rose-900/60" : ""}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate sm:text-[11px]">{label}</span>
        <span className="flex items-center gap-2">
          <ArrowUpRight className="h-4 w-4 text-slate-dim opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] ${toneClasses[tone]}`}>
            <Icon className="h-4 w-4" aria-hidden />
          </span>
        </span>
      </div>
      <div>
        <div className={`font-display font-bold tracking-tight text-ink ${value.length > 12 ? "text-xl sm:text-2xl" : "text-2xl sm:text-[1.75rem]"}`}>
          {value}
        </div>
        <div className="mt-1 truncate text-[11px] text-slate">{subtitle}</div>
      </div>
    </Link>
  );
}

export function NetCard({ stats }: { stats: DashboardStats }) {
  const positive = stats.net >= 0;
  const DirectionIcon = positive ? ArrowUpRight : ArrowDownRight;

  return (
    <section className="rounded-[14px] border border-border bg-surface p-5 shadow-card" aria-labelledby="net-title">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="net-title" className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate">Net · This month</h2>
          <p className={`mt-2 font-display text-3xl font-bold tracking-tight ${positive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
            {formatINR(stats.net)}
          </p>
        </div>
        <span className={`flex h-9 w-9 items-center justify-center rounded-[10px] ${positive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"}`}>
          <DirectionIcon className="h-5 w-5" aria-hidden />
        </span>
      </div>
      <div className="mt-5 flex items-center justify-between border-t border-border pt-3 text-xs">
        <span className="text-slate">Recorded expenses</span>
        <span className="font-mono font-medium tabular-nums text-ink">{formatINR(stats.monthExpenses)}</span>
      </div>
      <p className="mt-2 text-[10px] text-slate-dim">Revenue less recorded expenses and estimated manufacturing cost.</p>
    </section>
  );
}

export function ManufacturingCostCard({ stats }: { stats: DashboardStats }) {
  return (
    <section className="rounded-[14px] border border-border bg-surface p-5 shadow-card" aria-labelledby="mfg-title">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="mfg-title" className="text-sm font-semibold text-ink">Mfg cost of stock sold</h2>
          <p className="mt-1 text-[11px] text-slate">Invoice stock-outs × product manufacturing cost</p>
        </div>
        <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-primary">This month</span>
      </div>
      <p className="mt-4 font-display text-3xl font-bold tracking-tight text-ink">{formatINR(stats.manufacturingCostSold)}</p>
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate">Revenue - mfg cost</p>
          <p className="mt-1 font-mono text-base font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">{formatINR(stats.monthCostAfterMfg)}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate">Revenue</p>
          <p className="mt-1 font-mono text-sm font-medium tabular-nums text-ink">{formatINR(stats.monthRevenue)}</p>
        </div>
      </div>
      {stats.uncostedSoldUnits > 0 && (
        <p className="mt-2 text-[10px] text-amber-700 dark:text-amber-300">
          {stats.uncostedSoldUnits} sold unit{stats.uncostedSoldUnits === 1 ? "" : "s"} missing a saved manufacturing cost.
        </p>
      )}
    </section>
  );
}

export function StockMixCard({ stats }: { stats: DashboardStats }) {
  const hasStock = stats.stockMixChart.some((item) => item.value > 0);
  const chartData = hasStock
    ? stats.stockMixChart
    : [{ name: "No stock", value: 1, color: "var(--border)" }];

  return (
    <section className="rounded-[14px] border border-border bg-surface p-5 shadow-card" aria-labelledby="stock-mix-title">
      <div className="flex items-center justify-between">
        <h2 id="stock-mix-title" className="text-sm font-semibold text-ink">Stock mix</h2>
        <Boxes className="h-4 w-4 text-primary" aria-hidden />
      </div>
      <div className="mt-2 flex items-center gap-3">
        <div className="relative h-[124px] w-[124px] shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={chartData} dataKey="value" innerRadius={39} outerRadius={56} paddingAngle={hasStock ? 3 : 0} stroke="var(--surface)" strokeWidth={2}>
                {chartData.map((item) => <Cell key={item.name} fill={item.color} />)}
              </Pie>
              <Tooltip contentStyle={chartTooltip} formatter={(value) => [Number(value ?? 0), "SKUs"]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="font-display text-xl font-bold text-ink">{stats.activeSkuCount}</span>
          </div>
        </div>
        <ul className="min-w-0 flex-1 space-y-2 text-xs">
          {stats.stockMixChart.map((item) => (
            <li key={item.name} className="flex items-center justify-between gap-2 text-slate">
              <span className="flex min-w-0 items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="truncate">{item.name}</span>
              </span>
              <span className="font-mono tabular-nums text-ink">{item.value}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-5" aria-label="Loading dashboard" role="status">
      <div className="h-20 animate-pulse rounded-[12px] bg-surface" />
      <div className="grid gap-4 xl:grid-cols-[1.9fr_0.9fr]">
        <div className="min-h-[340px] animate-pulse rounded-[16px] bg-surface" />
        <div className="min-h-[340px] animate-pulse rounded-[16px] bg-surface" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => <div key={index} className="h-[132px] animate-pulse rounded-[14px] bg-surface" />)}
      </div>
    </div>
  );
}

export function DashboardError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="rounded-[14px] border border-rose-300/70 bg-rose-50 p-5 text-rose-900 dark:border-rose-900/70 dark:bg-rose-950/30 dark:text-rose-100" role="alert">
      <div className="flex items-center gap-2 font-semibold">
        <CircleAlert className="h-4 w-4" aria-hidden />
        Unable to load dashboard data.
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-[9px] border border-current/20 px-3 text-sm font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/5"
      >
        <RotateCw className="h-4 w-4" aria-hidden />
        Retry
      </button>
    </div>
  );
}

export const DASHBOARD_KPI_ICONS = {
  sales: ReceiptText,
  skus: Boxes,
  alerts: CircleAlert,
  customers: Users,
  outstanding: IndianRupee,
  inventory: Package,
} satisfies Record<string, LucideIcon>;