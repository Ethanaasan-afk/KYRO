"use client";

import { PageHeader } from "@/components/ui/page-header";
import {
  DASHBOARD_KPI_ICONS,
  DashboardError,
  DashboardSkeleton,
  KpiCard,
  ManufacturingCostCard,
  NetCard,
  RevenueCard,
  StockMixCard,
  UnitsOnHandCard,
} from "@/components/dashboard/dashboard-panels";
import { useDashboardStats } from "@/hooks/use-dashboard-stats";
import { formatINR } from "@/lib/utils";
import { Plus } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const { stats, isLoading, isError, retry } = useDashboardStats();
  if (isLoading) return <DashboardSkeleton />;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="OVERVIEW"
        title="Dashboard"
        titleClassName="text-2xl md:text-[2rem]"
        description="Live billing pulse - sales, stock & customers."
        actions={
          <Link
            href="/invoices/new"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-button bg-gradient-to-r from-[#2455e6] to-[#31b5e8] px-4 text-sm font-semibold text-white shadow-[0_5px_16px_rgba(36,85,230,0.22)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(36,85,230,0.28)]"
          >
            <Plus className="h-4 w-4" aria-hidden />
            New invoice
          </Link>
        }
      />

      {isError ? (
        <DashboardError onRetry={() => void retry()} />
      ) : (
        <>
          <section className="grid gap-4 xl:grid-cols-[1.9fr_0.9fr]" aria-label="Revenue and inventory overview">
            <RevenueCard stats={stats} />
            <UnitsOnHandCard stats={stats} />
          </section>

          <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5" aria-label="Business summary">
            <KpiCard
              href="/invoices"
              icon={DASHBOARD_KPI_ICONS.sales}
              label="Sales"
              value={String(stats.todayInvoiceCount)}
              subtitle={`Today ${stats.todayInvoiceCount} · Paid ${stats.todayPaidInvoiceCount}`}
              tone="blue"
            />
            <KpiCard
              href="/inventory"
              icon={DASHBOARD_KPI_ICONS.skus}
              label="SKUs Active"
              value={`${stats.activeSkuCount}/${stats.totalSkuCount}`}
              subtitle="Active products"
              tone="amber"
            />
            <KpiCard
              href="/inventory"
              icon={DASHBOARD_KPI_ICONS.alerts}
              label="Stock Alerts"
              value={String(stats.stockAlertCount)}
              subtitle={`${stats.stockMix.out} out · ${stats.stockMix.low} low`}
              tone="rose"
            />
            <KpiCard
              href="/customers"
              icon={DASHBOARD_KPI_ICONS.customers}
              label="Customers"
              value={String(stats.customerCount)}
              subtitle={`${stats.customersByType.retail} retail · ${stats.customersByType.wholesale} wholesale`}
              tone="violet"
            />
            <KpiCard
              href="/outstanding"
              icon={DASHBOARD_KPI_ICONS.outstanding}
              label="Total Outstanding (Udhaar)"
              value={formatINR(stats.totalOutstanding)}
              subtitle={`${stats.outstandingCount} customers with balance`}
              tone="rose"
              prominent
            />
          </section>

          <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3" aria-label="Financial and inventory detail">
            <NetCard stats={stats} />
            <ManufacturingCostCard stats={stats} />
            <StockMixCard stats={stats} />
          </section>
        </>
      )}
    </div>
  );
}