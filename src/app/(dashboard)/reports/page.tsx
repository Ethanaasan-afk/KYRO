"use client";

import { VatReturnsPanel } from "@/components/reports/vat-returns-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { isDemoMode } from "@/lib/demo/mode";
import { demoDb } from "@/lib/demo/store";
import { createClient } from "@/lib/supabase/client";
import type { Invoice } from "@/lib/types";
import { cn, downloadCsv, formatCurrency, getDefaultCurrency, roundMoney } from "@/lib/utils";
import { useOrganization } from "@/hooks/use-company";
import { getCountryConfig } from "@/lib/vat/countries";
import { Download } from "lucide-react";
import { useState } from "react";

type ReportsTab = "csv" | "vat";

export default function ReportsPage() {
  const [tab, setTab] = useState<ReportsTab>("vat");
  const { data: org } = useOrganization();
  const country = getCountryConfig(org?.country);
  const taxName = country.taxName;
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

  const exportSales = async () => {
    setLoading("sales");
    setMessage("");
    try {
      const data = await fetchInvoices();
      const rows = data.flatMap((inv): Record<string, unknown>[] => {
        const items = inv.items ?? [];
        if (!items.length) {
          return [
            {
              invoice_number: inv.invoice_number,
              date: inv.invoice_date,
              customer: inv.customer?.name,
              product: "",
              sku: "",
              qty: 0,
              taxable: inv.subtotal,
              vat_rate: "",
              vat: inv.total_vat,
              line_total: inv.grand_total,
              currency: inv.currency,
              status: inv.status,
            },
          ];
        }
        return items.map((item) => ({
          invoice_number: inv.invoice_number,
          date: inv.invoice_date,
          customer: inv.customer?.name,
          product: item.product?.name ?? "",
          sku: item.product?.sku ?? "",
          qty: item.quantity,
          taxable: item.taxable_value,
          vat_rate: item.vat_rate,
          vat: item.vat_amount,
          line_total: item.line_total,
          currency: inv.currency,
          status: inv.status,
        }));
      });

      downloadCsv(`sales-${from}-to-${to}.csv`, rows);
      setMessage(`Exported ${rows.length} sales rows.`);
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

  const exportVatSummary = async () => {
    setLoading("vat");
    setMessage("");
    try {
      const data = await fetchInvoices();
      const rows = data.map((inv) => ({
        invoice_number: inv.invoice_number,
        date: inv.invoice_date,
        customer: inv.customer?.name,
        tax_number: inv.customer?.tax_id ?? "",
        region: inv.customer?.state ?? "",
        country: inv.customer?.country ?? "",
        treatment: inv.tax_treatment ?? "domestic",
        taxable: inv.subtotal,
        tax: inv.total_vat,
        total: inv.grand_total,
        currency: inv.currency,
      }));

      // Only total the organization currency; legacy INR invoices are listed but not summed
      const currency = getDefaultCurrency();
      const totals = rows
        .filter((r) => r.currency === currency)
        .reduce(
          (acc, r) => ({
            taxable: roundMoney(acc.taxable + Number(r.taxable)),
            vat: roundMoney(acc.vat + Number(r.tax)),
          }),
          { taxable: 0, vat: 0 }
        );

      downloadCsv(`${taxName.toLowerCase()}-summary-${from}-to-${to}.csv`, rows);
      setMessage(
        `Exported ${rows.length} invoices. Totals (${currency}) - Taxable ${formatCurrency(totals.taxable)}, ${taxName} ${formatCurrency(totals.vat)}`
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
        description={`${country.returnName} and CSV exports for your accountant`}
        accent="tangerine"
      />

      <div
        className="mb-6 flex flex-wrap gap-1 border-b border-border"
        role="tablist"
        aria-label="Report sections"
      >
        <TabButton active={tab === "vat"} onClick={() => setTab("vat")} label={country.taxSystem === "none" ? "Sales summary" : `${taxName} return (${country.returnName})`} />
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
              description={`Invoices & line items with ${taxName} for the date range`}
              onClick={exportSales}
              loading={loading === "sales"}
              accent="teal"
            />
            <ReportCard
              title="Stock snapshot"
              description="Current stock across all products"
              onClick={exportStock}
              loading={loading === "stock"}
              accent="aqua"
            />
            <ReportCard
              title={`${taxName} summary`}
              description={`Taxable value and ${taxName} per invoice, with customer ${country.taxIdLabel}`}
              onClick={exportVatSummary}
              loading={loading === "vat"}
              accent="sun"
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
  onClick,
  loading,
  accent,
}: {
  title: string;
  description: string;
  onClick: () => void;
  loading: boolean;
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
      <Button className="mt-4" variant="secondary" onClick={onClick} loading={loading}>
        <Download className="h-4 w-4" /> Export CSV
      </Button>
    </div>
  );
}
