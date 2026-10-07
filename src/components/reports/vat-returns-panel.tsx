"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useOrganization } from "@/hooks/use-company";
import { APP_NAME } from "@/lib/brand";
import { isDemoMode } from "@/lib/demo/mode";
import { demoDb } from "@/lib/demo/store";
import { downloadXlsx } from "@/lib/excel";
import type { CreditNote, Invoice, Purchase } from "@/lib/types";
import {
  buildVat201,
  registerRows,
  vat201ToSheetRows,
  vatPeriodMonthBounds,
  type Vat201Summary,
  type VatReportDoc,
} from "@/lib/vat-reports";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils";
import { Download, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const DISCLAIMER = `This summary follows the FTA VAT 201 layout. Check the figures with your accountant before filing on EmaraTax. ${APP_NAME} does not file returns for you.`;

const REGISTER_HEADERS = [
  "Document No.",
  "Date",
  "Party",
  "TRN",
  "Emirate",
  "Standard rated",
  "Zero rated",
  "Exempt",
  "VAT",
  "Total",
];

type Party = { name?: string; tax_id?: string | null; state?: string | null } | null | undefined;

function toDoc(
  d: {
    status: string;
    subtotal: number;
    total_vat: number;
    grand_total: number;
    currency?: string | null;
    items?: VatReportDoc["items"];
  },
  number: string,
  date: string,
  party: Party
): VatReportDoc {
  return {
    number,
    date,
    status: d.status,
    currency: d.currency,
    subtotal: d.subtotal,
    total_vat: d.total_vat,
    grand_total: d.grand_total,
    party: party ? { name: party.name, tax_id: party.tax_id, state: party.state } : null,
    items: d.items,
  };
}

interface PeriodDocs {
  sales: VatReportDoc[];
  creditNotes: VatReportDoc[];
  purchases: VatReportDoc[];
}

export function VatReturnsPanel() {
  const bounds = vatPeriodMonthBounds();
  const [from, setFrom] = useState(bounds.from);
  const [to, setTo] = useState(bounds.to);
  const [loading, setLoading] = useState<"preview" | "export" | null>(null);
  const [message, setMessage] = useState("");
  const [summary, setSummary] = useState<Vat201Summary | null>(null);
  const { data: org } = useOrganization();
  const currency = org?.currency || "AED";
  const businessEmirate = org?.state?.trim() || "Dubai";

  const fetchDocs = useCallback(async (): Promise<PeriodDocs> => {
    const inRange = (date: string) => date >= from && date <= to;

    if (isDemoMode()) {
      return {
        sales: demoDb
          .getInvoices()
          .filter((i) => inRange(i.invoice_date))
          .map((i) => toDoc(i, i.invoice_number, i.invoice_date, i.customer)),
        creditNotes: demoDb
          .getCreditNotes()
          .filter((c) => inRange(c.credit_date))
          .map((c) => toDoc(c, c.credit_note_number, c.credit_date, c.customer)),
        purchases: demoDb
          .getPurchases()
          .filter((p) => inRange(p.purchase_date))
          .map((p) => toDoc(p, p.purchase_number, p.purchase_date, p.supplier)),
      };
    }

    const supabase = createClient();
    const [inv, cn, po] = await Promise.all([
      supabase
        .from("invoices")
        .select("*, customer:customers(name, tax_id, state), items:invoice_items(*)")
        .gte("invoice_date", from)
        .lte("invoice_date", to)
        .order("invoice_date"),
      supabase
        .from("credit_notes")
        .select("*, customer:customers(name, tax_id, state), items:credit_note_items(*)")
        .gte("credit_date", from)
        .lte("credit_date", to),
      supabase
        .from("purchases")
        .select("*, supplier:suppliers(name, tax_id, state), items:purchase_items(*)")
        .gte("purchase_date", from)
        .lte("purchase_date", to),
    ]);
    for (const r of [inv, cn, po]) if (r.error) throw r.error;

    return {
      sales: ((inv.data ?? []) as Invoice[]).map((i) =>
        toDoc(i, i.invoice_number, i.invoice_date, i.customer)
      ),
      creditNotes: ((cn.data ?? []) as CreditNote[]).map((c) =>
        toDoc(c, c.credit_note_number, c.credit_date, c.customer)
      ),
      purchases: ((po.data ?? []) as Purchase[]).map((p) =>
        toDoc(p, p.purchase_number, p.purchase_date, p.supplier)
      ),
    };
  }, [from, to]);

  const build = useCallback(
    (docs: PeriodDocs) => buildVat201({ ...docs, currency, businessEmirate }),
    [currency, businessEmirate]
  );

  const loadPreview = useCallback(async () => {
    setLoading("preview");
    setMessage("");
    try {
      setSummary(build(await fetchDocs()));
    } catch (e) {
      setMessage((e as Error).message);
      setSummary(null);
    } finally {
      setLoading(null);
    }
  }, [fetchDocs, build]);

  useEffect(() => {
    void loadPreview();
  }, [loadPreview]);

  const exportReturn = async () => {
    setLoading("export");
    setMessage("");
    try {
      const docs = await fetchDocs();
      const built = build(docs);
      setSummary(built);
      downloadXlsx(`VAT-201_${from}_to_${to}.xlsx`, [
        { name: "VAT 201", rows: vat201ToSheetRows(built) },
        { name: "Sales", rows: registerRows(docs.sales, currency), headers: REGISTER_HEADERS },
        {
          name: "Credit notes",
          rows: registerRows(docs.creditNotes, currency),
          headers: REGISTER_HEADERS,
        },
        { name: "Purchases", rows: registerRows(docs.purchases, currency), headers: REGISTER_HEADERS },
      ]);
      setMessage("VAT 201 workbook downloaded (summary, sales, credit notes, purchases).");
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setLoading(null);
    }
  };

  const money = (n: number) => formatCurrency(n, currency);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
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
        <Button
          type="button"
          variant="secondary"
          onClick={() => void loadPreview()}
          loading={loading === "preview"}
        >
          <RefreshCw className="h-4 w-4" />
          Refresh summary
        </Button>
        <Button type="button" onClick={() => void exportReturn()} loading={loading === "export"}>
          <Download className="h-4 w-4" />
          Export VAT 201 (Excel)
        </Button>
      </div>

      <p className="max-w-2xl text-xs leading-relaxed text-slate">{DISCLAIMER}</p>

      <div className="panel panel-accent-sun wash-sun overflow-hidden">
        <div className="border-b border-border/70 px-5 py-4">
          <h2 className="font-display text-sm font-semibold text-ink">VAT 201 · return preview</h2>
          <p className="mt-1 text-xs text-slate">
            {from} → {to} · {currency}
            {summary
              ? ` · ${summary.counts.sales} sale(s), ${summary.counts.creditNotes} credit note(s), ${summary.counts.purchases} purchase(s)`
              : ""}
          </p>
          {summary && summary.skippedOtherCurrency > 0 && (
            <p className="mt-1 text-xs text-amber">
              {summary.skippedOtherCurrency} document(s) issued in another currency (for example
              pre-VAT INR invoices) are not included.
            </p>
          )}
        </div>

        {!summary ? (
          <p className="px-5 py-10 text-center text-sm text-slate">
            {loading === "preview" ? "Loading…" : "No data for this period."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-cloud/80 text-xs uppercase tracking-wide text-slate">
                  <th className="px-5 py-3 font-medium">Box</th>
                  <th className="px-5 py-3 font-medium">Description</th>
                  <th className="px-5 py-3 text-right font-medium">Amount</th>
                  <th className="px-5 py-3 text-right font-medium">VAT</th>
                </tr>
              </thead>
              <tbody>
                {summary.emirates.map((r) => (
                  <tr key={r.box} className="border-b border-border/60 text-ink">
                    <td className="px-5 py-2.5 font-medium">{r.box}</td>
                    <td className="px-5 py-2.5">Standard rated supplies in {r.emirate}</td>
                    <td className="px-5 py-2.5 text-right tabular-nums">{money(r.amount)}</td>
                    <td className="px-5 py-2.5 text-right tabular-nums">{money(r.vat)}</td>
                  </tr>
                ))}
                <tr className="border-b border-border/60 text-ink">
                  <td className="px-5 py-2.5 font-medium">4</td>
                  <td className="px-5 py-2.5">Zero rated supplies</td>
                  <td className="px-5 py-2.5 text-right tabular-nums">{money(summary.zeroRated)}</td>
                  <td className="px-5 py-2.5 text-right tabular-nums">-</td>
                </tr>
                <tr className="border-b border-border/60 text-ink">
                  <td className="px-5 py-2.5 font-medium">5</td>
                  <td className="px-5 py-2.5">Exempt supplies</td>
                  <td className="px-5 py-2.5 text-right tabular-nums">{money(summary.exempt)}</td>
                  <td className="px-5 py-2.5 text-right tabular-nums">-</td>
                </tr>
                <tr className="border-b border-border/60 bg-cloud/60 font-semibold text-ink">
                  <td className="px-5 py-2.5">8</td>
                  <td className="px-5 py-2.5">Total outputs</td>
                  <td className="px-5 py-2.5 text-right tabular-nums">
                    {money(summary.totalOutputs.amount)}
                  </td>
                  <td className="px-5 py-2.5 text-right tabular-nums">
                    {money(summary.totalOutputs.vat)}
                  </td>
                </tr>
                <tr className="border-b border-border/60 text-ink">
                  <td className="px-5 py-2.5 font-medium">9</td>
                  <td className="px-5 py-2.5">Standard rated expenses (purchases)</td>
                  <td className="px-5 py-2.5 text-right tabular-nums">
                    {money(summary.expenses.amount)}
                  </td>
                  <td className="px-5 py-2.5 text-right tabular-nums">
                    {money(summary.expenses.vat)}
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="text-ink">
                  <td className="px-5 py-2.5 font-medium">12</td>
                  <td className="px-5 py-2.5">Total due tax</td>
                  <td />
                  <td className="px-5 py-2.5 text-right tabular-nums">{money(summary.totalDue)}</td>
                </tr>
                <tr className="text-ink">
                  <td className="px-5 py-2.5 font-medium">13</td>
                  <td className="px-5 py-2.5">Total recoverable tax</td>
                  <td />
                  <td className="px-5 py-2.5 text-right tabular-nums">
                    {money(summary.recoverable)}
                  </td>
                </tr>
                <tr className="bg-cloud/60 font-semibold text-ink">
                  <td className="px-5 py-3">14</td>
                  <td className="px-5 py-3">
                    {summary.netPayable >= 0 ? "Payable tax" : "Refundable tax"}
                  </td>
                  <td />
                  <td className="px-5 py-3 text-right tabular-nums">
                    {money(Math.abs(summary.netPayable))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {message && <p className="text-sm text-muted">{message}</p>}
    </div>
  );
}
