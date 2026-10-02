"use client";

import { LoadingBlock, PageHeader } from "@/components/ui/page-header";
import { useCustomers } from "@/hooks/use-customers";
import { useInvoices } from "@/hooks/use-invoices";
import { usePayments } from "@/hooks/use-payments";
import { useProducts } from "@/hooks/use-products";
import { useStockMovements } from "@/hooks/use-inventory";
import { buildOutstandingRows } from "@/lib/customer-ledger";
import { formatINR } from "@/lib/utils";
import { ArrowUpRight, Boxes, CircleAlert, Package, Plus, ReceiptText, Users } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const tooltipStyle = {
  borderRadius: 10,
  border: "1px solid var(--border)",
  background: "var(--surface)",
  color: "var(--ink)",
  fontSize: 12,
  boxShadow: "var(--card-shadow)",
};

const stockColors = ["#84cc16", "#ec4899", "#34d399", "#2dd4bf", "#a855f7"];

export default function DashboardPage() {
  const { data: invoices, isLoading: loadingInvoices } = useInvoices();
  const { data: products, isLoading: loadingProducts } = useProducts();
  const { data: customers, isLoading: loadingCustomers } = useCustomers();
  const { data: payments, isLoading: loadingPayments } = usePayments();
  const { data: movements, isLoading: loadingMovements } = useStockMovements();

  const stats = useMemo(() => {
    const today = new Date();
    const todayKey = dateKey(today);
    const monthPrefix = todayKey.slice(0, 7);
    const start = new Date(today);
    start.setDate(start.getDate() - 29);
    const startKey = dateKey(start);
    const activeInvoices = (invoices ?? []).filter((invoice) => invoice.status !== "cancelled");
    const todayInvoices = activeInvoices.filter((invoice) => invoice.invoice_date === todayKey);
    const monthInvoices = activeInvoices.filter((invoice) => invoice.invoice_date.startsWith(monthPrefix));
    const revenueByDay = new Map<string, number>();

    for (const invoice of activeInvoices) {
      if (invoice.invoice_date >= startKey && invoice.invoice_date <= todayKey) {
        revenueByDay.set(
          invoice.invoice_date,
          (revenueByDay.get(invoice.invoice_date) ?? 0) + Number(invoice.grand_total)
        );
      }
    }

    const revenueTrend = Array.from({ length: 30 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      const key = dateKey(date);
      return {
        date: key,
        label: date.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
        revenue: revenueByDay.get(key) ?? 0,
      };
    });

    const activeProducts = (products ?? []).filter((product) => product.is_active);
    const recentMovements = (movements ?? [])
      .filter((movement) => {
        const timestamp = new Date(movement.created_at).getTime();
        return timestamp >= start.getTime() && timestamp <= today.getTime();
      })
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
    const movementGroups = new Map<string, typeof recentMovements>();
    for (const movement of recentMovements) {
      const productMovements = movementGroups.get(movement.product_id) ?? [];
      productMovements.push(movement);
      movementGroups.set(movement.product_id, productMovements);
    }
    const stockTrend = activeProducts
      .flatMap((product) => {
        const productMovements = movementGroups.get(product.id) ?? [];
        if (!productMovements.length) return [];
        const movementTotal = productMovements.reduce((sum, movement) => sum + Number(movement.quantity), 0);
        let runningUnits = Number(product.current_stock ?? 0) - movementTotal;
        const points = productMovements.map((movement) => {
          runningUnits += Number(movement.quantity);
          return { x: new Date(movement.created_at).getTime(), y: runningUnits };
        });
        return [{ id: product.id, name: product.name, points, movementCount: points.length }];
      })
      .sort((a, b) => b.movementCount - a.movementCount)
      .slice(0, 5)
      .map((series, index) => ({ ...series, color: stockColors[index] }));
    const lowStock = activeProducts.filter((product) => {
      const quantity = Number(product.current_stock ?? 0);
      return quantity > 0 && quantity <= Number(product.reorder_threshold ?? 0);
    }).length;
    const outOfStock = activeProducts.filter((product) => Number(product.current_stock ?? 0) <= 0).length;
    const outstandingRows = buildOutstandingRows(customers ?? [], invoices ?? [], payments ?? []);
    const totalOutstanding = outstandingRows.reduce((sum, row) => sum + row.outstanding, 0);

    return {
      todayRevenue: todayInvoices.reduce((sum, invoice) => sum + Number(invoice.grand_total), 0),
      todayCount: todayInvoices.length,
      todayPaidCount: todayInvoices.filter((invoice) => invoice.status === "paid").length,
      monthCount: monthInvoices.length,
      last30Revenue: revenueTrend.reduce((sum, day) => sum + day.revenue, 0),
      revenueTrend,
      chartStart: start.getTime(),
      chartEnd: today.getTime(),
      activeProductCount: activeProducts.length,
      totalProductCount: (products ?? []).length,
      totalUnits: activeProducts.reduce((sum, product) => sum + Number(product.current_stock ?? 0), 0),
      stockValue: activeProducts.reduce(
        (sum, product) => sum + Number(product.current_stock ?? 0) * Number(product.base_price ?? 0),
        0
      ),
      lowStock,
      outOfStock,
      stockTrend,
      retailCount: (customers ?? []).filter((customer) => customer.customer_type === "b2c").length,
      wholesaleCount: (customers ?? []).filter((customer) => customer.customer_type === "b2b").length,
      totalOutstanding,
      outstandingCount: outstandingRows.length,
    };
  }, [customers, invoices, movements, payments, products]);

  if (loadingInvoices || loadingProducts || loadingCustomers || loadingPayments || loadingMovements) return <LoadingBlock />;

  return (
    <div>
      <PageHeader
        eyebrow="Overview"
        title="Dashboard"
        description="Your live billing pulse: sales, stock and customers."
        actions={
          <Link
            href="/invoices/new"
            className="btn-gradient inline-flex min-h-[44px] items-center gap-2 rounded-button px-4 text-sm font-semibold"
          >
            <Plus className="h-4 w-4" aria-hidden />
            New invoice
          </Link>
        }
      />

      <section className="grid gap-4 xl:grid-cols-[1.9fr_0.9fr]">
        <article className="relative min-h-[400px] overflow-hidden rounded-[14px] bg-gradient-to-br from-[#1d4ed8] via-[#2563eb] to-[#38bdf8] p-5 text-white shadow-[0_12px_30px_rgba(29,78,216,0.18)] sm:p-6">
          <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -right-4 -top-12 h-44 w-44 rounded-full border border-white/10" />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/80">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15">
                  <ReceiptText className="h-4 w-4" aria-hidden />
                </span>
                Revenue · Last 30 days
              </div>
              <div className="mt-3 font-display text-4xl font-bold tracking-tight sm:text-[2.75rem]">
                {formatINR(stats.last30Revenue)}
              </div>
              <p className="mt-1 text-sm text-white/85">
                {stats.monthCount} invoice{stats.monthCount === 1 ? "" : "s"} this month
              </p>
            </div>
            <div className="shrink-0 rounded-[10px] border border-white/15 bg-white/15 px-3 py-2 text-right backdrop-blur-sm">
              <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/75">Today</div>
              <div className="font-mono text-base font-semibold tabular-nums">{formatINR(stats.todayRevenue)}</div>
            </div>
          </div>

          <div className="relative mt-7 h-[170px] sm:mt-9 sm:h-[190px]">
            {stats.last30Revenue > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.revenueTrend} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.2)" strokeDasharray="3 6" />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "rgba(255,255,255,0.75)", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    interval={6}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value) => [formatINR(Number(value ?? 0)), "Revenue"]}
                    labelStyle={{ color: "var(--slate)" }}
                  />
                  <Bar dataKey="revenue" fill="rgba(255,255,255,0.9)" radius={[3, 3, 0, 0]} maxBarSize={14} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center rounded-[10px] border border-white/15 bg-white/[0.06] px-5 text-center text-sm font-medium text-white/80">
                No invoice revenue recorded yet. Your chart will fill as sales are booked.
              </div>
            )}
          </div>
        </article>

        <article className="rounded-[14px] border border-sky-200/70 bg-gradient-to-br from-sky-50 to-surface p-5 shadow-card dark:border-sky-900/60 dark:from-sky-950/30 dark:to-surface xl:min-h-[400px]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate">
                <Package className="h-4 w-4 text-primary" aria-hidden />
                Units on hand
              </div>
              <div className="mt-2 font-display text-3xl font-bold tracking-tight text-ink">
                {stats.totalUnits.toLocaleString()}
              </div>
            </div>
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
              {stats.activeProductCount} SKUs
            </span>
          </div>
          <p className="mt-1 text-right font-mono text-xs tabular-nums text-slate">{formatINR(stats.stockValue)}</p>

          <div className="mt-4 h-[210px]">
            {stats.stockTrend.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 6" />
                  <XAxis
                    type="number"
                    dataKey="x"
                    domain={[stats.chartStart, stats.chartEnd]}
                    tickFormatter={(timestamp: number) => new Date(timestamp).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    tick={{ fill: "var(--slate)", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    minTickGap={22}
                  />
                  <YAxis type="number" dataKey="y" tick={{ fill: "var(--slate)", fontSize: 10 }} axisLine={false} tickLine={false} width={28} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    labelFormatter={(timestamp) => new Date(Number(timestamp)).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    formatter={(value) => [`${Number(value ?? 0).toLocaleString()} units`, "On hand"]}
                    labelStyle={{ color: "var(--slate)" }}
                  />
                  {stats.stockTrend.map((series) => (
                    <Scatter key={series.id} name={series.name} data={series.points} fill={series.color} isAnimationActive={false} />
                  ))}
                </ScatterChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center rounded-[10px] border border-dashed border-border px-4 text-center text-sm text-slate">
                No stock movements in the last 30 days.
              </div>
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-2.5 gap-y-1 text-[10px] text-slate">
            {stats.stockTrend.map((series) => (
              <span key={series.id} className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: series.color }} />
                {series.name}
              </span>
            ))}
          </div>
          <p className="mt-2 text-[10px] text-slate">Reconstructed from stock movements · last 30 days</p>
        </article>
      </section>

      <section className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Business summary">
        <Link href="/invoices" className="group rounded-[12px] border border-border bg-surface p-4 shadow-card transition-colors hover:border-primary/40">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate">Sales today</span>
            <span className="rounded-lg bg-sky-100 p-2 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300"><ReceiptText className="h-4 w-4" aria-hidden /></span>
          </div>
          <div className="mt-3 font-display text-3xl font-bold tracking-tight text-ink">{stats.todayCount}</div>
          <div className="mt-1 flex items-center justify-between gap-2 text-xs text-slate">
            <span>{stats.todayPaidCount} paid · {formatINR(stats.todayRevenue)}</span>
            <ArrowUpRight className="h-4 w-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
          </div>
        </Link>

        <Link href="/inventory" className="group rounded-[12px] border border-border bg-surface p-4 shadow-card transition-colors hover:border-primary/40">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate">Active SKUs</span>
            <span className="rounded-lg bg-amber-100 p-2 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"><Boxes className="h-4 w-4" aria-hidden /></span>
          </div>
          <div className="mt-3 font-display text-3xl font-bold tracking-tight text-ink">
            {stats.activeProductCount}<span className="text-lg font-medium text-slate"> / {stats.totalProductCount}</span>
          </div>
          <div className="mt-1 text-xs text-slate">{stats.outOfStock} out · {stats.lowStock} low stock</div>
        </Link>

        <Link href="/customers" className="group rounded-[12px] border border-border bg-surface p-4 shadow-card transition-colors hover:border-primary/40">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate">Customers</span>
            <span className="rounded-lg bg-violet-100 p-2 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300"><Users className="h-4 w-4" aria-hidden /></span>
          </div>
          <div className="mt-3 font-display text-3xl font-bold tracking-tight text-ink">{stats.retailCount + stats.wholesaleCount}</div>
          <div className="mt-1 text-xs text-slate">{stats.retailCount} retail · {stats.wholesaleCount} wholesale</div>
        </Link>

        <Link href="/outstanding" className="group rounded-[12px] border border-border bg-surface p-4 shadow-card transition-colors hover:border-primary/40">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate">Outstanding</span>
            <span className="rounded-lg bg-rose-100 p-2 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"><CircleAlert className="h-4 w-4" aria-hidden /></span>
          </div>
          <div className="mt-3 font-display text-2xl font-bold tracking-tight text-ink">{formatINR(stats.totalOutstanding)}</div>
          <div className="mt-1 text-xs text-slate">{stats.outstandingCount} customer{stats.outstandingCount === 1 ? "" : "s"} with balance</div>
        </Link>
      </section>
    </div>
  );
}