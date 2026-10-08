"use client";

import { VatReturnsPanel } from "@/components/reports/vat-returns-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { isDemoMode } from "@/lib/demo/mode";
import { demoDb } from "@/lib/demo/store";
import { createClient } from "@/lib/supabase/client";
import type { Invoice } from "@/lib/types";
import {
  billRows,
  billTotals,
  salesLineRows,
  TAX_MODE_LABELS,
  type TaxMode,
} from "@/lib/report-exports";
import { cn, downloadCsv, formatCurrency, getDefaultCurrency } from "@/lib/utils";
import { Download } from "lucide-react";
import { useState } from "react";

type ReportsTab = "csv" | "vat";

const TAX_MODES: TaxMode[] = ["with", "without"];

export default function ReportsPage() {
  const [tab, setTab] = useState<ReportsTab>("vat");
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  /** Active invoices in range, with customer + lines. */
  const fetchInvoices = async (): Promise<Invoice[]> => {
    if (isDemoMode()) {
      return demoDb
        .getInvoices()
        .filter(
          (inv) => inv.status !== "cancelled" && inv.invoice_date >= from && inv.invoice_date <= to
        );
    }
    const supabase = createClient();
    const { data: rows, error } = await supabase
      .from("invoices")
      .select("*, customer:customers(*), items:invoice_items(*, product:products(name, sku))")
      .gte("invoice_date", from)
      .lte("invoice_date", to)
      .neq("status", "cancelled")
      .order("invoice_date");
    if (error) throw error;
    return (rows ?? []) as Invoice[];
  };

  const exportSales = async (mode: TaxMode) => {
    setLoading(`sales-${mode}`);
    setMessage("");
    try {
      const rows = salesLineRows(await fetchInvoices(), mode);
      const suffix = mode === "with" ? "with-vat" : "without-vat";
      downloadCsv(`sales-${suffix}-${from}-to-${to}.csv`, rows);
      setMessage(`Exported ${rows.length} sales rows (${TAX_MODE_LABELS[mode]}).`);
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setLoading(null);
    }
  };

  const exportStock = async () => {
    setLoading("stock");
    setMessage("");
    try {
      let rows: Record<string, unknown>[];
      if (isDemoMode()) {
        rows = demoDb.getProducts().map((p) => ({
          name: p.name,
          variant: p.variant ?? "",
          sku: p.sku,
          category: p.category,
          pack_size: p.pack_size,
          current_stock: p.current_stock ?? 0,
          reorder_threshold: p.reorder_threshold,
          base_price: p.base_price,
          vat_rate: p.vat_rate,
          stock_value: (p.current_stock ?? 0) * p.base_price,
          is_active: p.is_active,
        }));
      } else {
        const supabase = createClient();
        const { data: products, error } = await supabase
          .from("products")
          .select("*")
          .order("name");
        if (error) throw error;
        const { fetchProductStockMap } = await import("@/lib/stock");
        const map = await fetchProductStockMap(supabase);
        rows = (products ?? []).map((p) => ({
          name: p.name,
          variant: p.variant ?? "",
          sku: p.sku,
          category: p.category,
          pack_size: p.pack_size,
          current_stock: map.get(p.id) ?? 0,
          reorder_threshold: p.reorder_threshold,
          base_price: p.base_price,
          vat_rate: p.vat_rate,
          stock_value: (map.get(p.id) ?? 0) * Number(p.base_price),
          is_active: p.is_active,
        }));
      }

      downloadCsv(`stock-snapshot-${new Date().toISOString().slice(0, 10)}.csv`, rows);
      setMessage(`Exported ${rows.length} products.`);
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setLoading(null);
    }
  };

  const exportBills = async (mode: TaxMode) => {
    setLoading(`bills-${mode}`);
    setMessage("");
    try {
      const data = await fetchInvoices();
      const suffix = mode === "with" ? "with-vat" : "without-vat";
      downloadCsv(`bills-${suffix}-${from}-to-${to}.csv`, billRows(data, mode));
      const currency = getDefaultCurrency();
      const totals = billTotals(data, currency);
      setMessage(
        mode === "with"
          ? `Exported ${data.length} bills. Totals (${currency}) - Net ${formatCurrency(totals.net)}, VAT ${formatCurrency(totals.vat)}, Total ${formatCurrency(totals.total)}`
          : `Exported ${data.length} bills. Net total (${currency}) ${formatCurrency(totals.net)}`
      );
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Reports"
        title="Reports"
        description="VAT return summary and CSV exports (with or without VAT) for your accountant"
        accent="tangerine"
      />

      <div
        className="mb-6 flex flex-wrap gap-1 border-b border-border"
        role="tablist"
        aria-label="Report sections"
      >
        <TabButton active={tab === "vat"} onClick={() => setTab("vat")} label="VAT Return (VAT 201)" />
        <TabButton active={tab === "csv"} onClick={() => setTab("csv")} label="CSV Exports" />
      </div>

      {tab === "vat" ? (
        <VatReturnsPanel />
      ) : (
        <>
          <div className="mb-6 flex flex-wrap gap-3">
            <Input
              label="From"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-auto"
            />
            <Input
              label="To"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-auto"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <ReportCard
              title="Sales report"
              description="Every invoice line item for the date range"
              accent="teal"
              actions={TAX_MODES.map((mode) => ({
                label: TAX_MODE_LABELS[mode],
                onClick: () => exportSales(mode),
                loading: loading === `sales-${mode}`,
              }))}
            />
            <ReportCard
              title="Billing report"
              description="One row per bill. With VAT adds customer TRN, VAT and totals"
              accent="sun"
              actions={TAX_MODES.map((mode) => ({
                label: TAX_MODE_LABELS[mode],
                onClick: () => exportBills(mode),
                loading: loading === `bills-${mode}`,
              }))}
            />
            <ReportCard
              title="Stock snapshot"
              description="Current stock across all products"
              accent="aqua"
              actions={[{ label: "Export CSV", onClick: exportStock, loading: loading === "stock" }]}
            />
          </div>

          {message && <p className="mt-4 text-sm text-muted">{message}</p>}
        </>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "-mb-px border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
        active
          ? "border-primary text-primary"
          : "border-transparent text-slate hover:text-ink"
      )}
    >
      {label}
    </button>
  );
}

function ReportCard({
  title,
  description,
  actions,
  accent,
}: {
  title: string;
  description: string;
  actions: { label: string; onClick: () => void; loading: boolean }[];
  accent: "teal" | "aqua" | "sun";
}) {
  const accentClass =
    accent === "teal"
      ? "panel-accent-teal wash-teal"
      : accent === "aqua"
        ? "panel-accent-aqua wash-aqua"
        : "panel-accent-sun wash-sun";

  return (
    <div className={`panel p-5 panel-lift ${accentClass}`}>
      <h2 className="font-display text-sm font-semibold text-ink">{title}</h2>
      <p className="mt-1 text-xs text-slate">{description}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {actions.map((a) => (
          <Button key={a.label} variant="secondary" onClick={a.onClick} loading={a.loading}>
            <Download className="h-4 w-4" /> {a.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
