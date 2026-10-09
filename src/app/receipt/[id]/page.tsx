"use client";

import { useCompanySettings } from "@/hooks/use-company";
import { useInvoice } from "@/hooks/use-invoices";
import { AR } from "@/lib/invoice-arabic";
import { invoiceAmountDue } from "@/lib/invoice-payment";
import { formatQty } from "@/lib/units";
import { getCountryConfig } from "@/lib/vat/countries";
import { contextForDocument, documentBreakdown, invoiceTitleFor, taxSummaryRows, treatmentNote } from "@/lib/vat/context";
import { currencyDecimals } from "@/lib/utils";
import { ZatcaQr } from "@/components/invoices/zatca-qr";
import { ArrowLeft, Printer } from "lucide-react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

type Width = "80" | "58";

function amount(n: number, currency: string) {
  const digits = currencyDecimals(currency);
  return Number(n).toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function money(n: number, currency: string) {
  return `${currency} ${amount(n, currency)}`;
}

/** Point-of-sale receipt for 80 mm / 58 mm thermal printers. */
function ReceiptView() {
  const params = useParams();
  const search = useSearchParams();
  const id = String(params.id ?? "");
  const { data: invoice, isLoading, error } = useInvoice(id);
  const { data: company } = useCompanySettings();
  const [width, setWidth] = useState<Width>(search.get("w") === "58" ? "58" : "80");
  const printed = useRef(false);

  // Opened with ?print=1: print as soon as everything is on screen
  useEffect(() => {
    if (printed.current || !invoice || !company || search.get("print") !== "1") return;
    printed.current = true;
    const t = window.setTimeout(() => window.print(), 300);
    return () => window.clearTimeout(t);
  }, [invoice, company, search]);

  if (isLoading || !company) {
    return <p className="p-6 text-sm text-slate">Loading receipt…</p>;
  }
  if (error || !invoice) {
    return (
      <div className="p-6 text-sm text-slate">
        Receipt not found.{" "}
        <Link href="/invoices" className="font-medium text-primary underline">
          Back to invoices
        </Link>
      </div>
    );
  }

  const taxCtx = contextForDocument(invoice, company, invoice.customer);
  const country = taxCtx.country;
  const currency = invoice.currency || company.currency || country.currency;
  const bilingual = company.invoice_language === "en_ar";
  const items = invoice.items ?? [];
  const taxRows = taxSummaryRows(taxCtx, documentBreakdown(taxCtx, items), (n) => money(n, currency)).filter(
    (r) => r.kind === "tax"
  );
  const note = treatmentNote(taxCtx);
  const due = invoice.status === "paid" ? 0 : invoiceAmountDue(Number(invoice.grand_total), Number(invoice.amount_paid ?? 0));
  const paid = Math.max(0, Number(invoice.grand_total) - due);
  const created = new Date(invoice.created_at || invoice.invoice_date);
  const line = (en: string, ar: string) => (bilingual ? `${en} · ${ar}` : en);

  return (
    <div className="receipt-shell min-h-dvh bg-cloud py-6 print:bg-white print:py-0">
      <style>{`
        @page { size: ${width}mm auto; margin: 0; }
        @media print {
          html, body { background: #fff !important; }
          .no-print { display: none !important; }
          .receipt { box-shadow: none !important; border: 0 !important; margin: 0 !important; }
        }
      `}</style>

      <div className="no-print mx-auto mb-4 flex max-w-md flex-wrap items-center justify-between gap-2 px-4">
        <Link
          href={`/invoices/${invoice.id}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" /> Back to invoice
        </Link>
        <div className="flex items-center gap-2">
          <div className="flex rounded-[10px] border border-border bg-surface p-0.5 text-xs font-semibold" role="group" aria-label="Paper width">
            {(["80", "58"] as Width[]).map((w) => (
              <button
                key={w}
                type="button"
                aria-pressed={width === w}
                onClick={() => setWidth(w)}
                className={`rounded-[8px] px-2.5 py-1.5 ${width === w ? "bg-primary text-white" : "text-slate"}`}
              >
                {w} mm
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-[10px] bg-primary px-3.5 py-2 text-sm font-semibold text-white"
          >
            <Printer className="h-4 w-4" /> Print receipt
          </button>
        </div>
      </div>

      <div
        className="receipt mx-auto bg-white px-3 py-4 font-mono text-[11.5px] leading-snug text-black shadow-lift"
        style={{ width: `${width}mm` }}
      >
        <div className="text-center">
          <p className="text-[14px] font-bold leading-tight">{company.brand_name || company.company_name}</p>
          {bilingual && company.name_ar && (
            <p className="text-[13px] font-bold" dir="rtl" lang="ar">
              {company.name_ar}
            </p>
          )}
          {company.address && <p>{[company.address, company.city, company.state].filter(Boolean).join(", ")}</p>}
          {company.phone && <p>Tel {company.phone}</p>}
          {company.tax_id && (
            <p>
              {getCountryConfig(company.country).taxIdLabel} {company.tax_id}
            </p>
          )}
          <p className="mt-2 border-y border-dashed border-black py-1 text-[12px] font-bold uppercase">
            {line(invoiceTitleFor(taxCtx, invoice.customer?.tax_id), AR.taxInvoice)}
          </p>
        </div>

        <div className="mt-2 space-y-0.5">
          <p className="flex justify-between gap-2">
            <span>No.</span>
            <span className="font-bold">{invoice.invoice_number}</span>
          </p>
          <p className="flex justify-between gap-2">
            <span>Date</span>
            <span>
              {created.toLocaleDateString("en-GB")} {created.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </p>
          {invoice.customer?.name && (
            <p className="flex justify-between gap-2">
              <span>Customer</span>
              <span className="text-right">{invoice.customer.name}</span>
            </p>
          )}
          {invoice.customer?.tax_id && (
            <p className="flex justify-between gap-2">
              <span>Cust. {getCountryConfig(invoice.customer.country || country.code).taxIdLabel}</span>
              <span>{invoice.customer.tax_id}</span>
            </p>
          )}
        </div>

        <div className="my-2 border-t border-dashed border-black" />
        <ul className="space-y-1.5">
          {items.map((it) => {
            const unit = it.unit ?? it.product?.unit ?? null;
            const lineTotal = Number(it.taxable_value) + Number(it.vat_amount);
            return (
              <li key={it.id}>
                <p className="font-bold">{it.product?.name ?? (it.room_booking_id ? "Room stay" : "Item")}</p>
                <p className="flex justify-between gap-2">
                  <span>
                    {formatQty(it.quantity, unit)} × {amount(Number(it.unit_price), currency)}
                  </span>
                  <span>{amount(lineTotal, currency)}</span>
                </p>
              </li>
            );
          })}
        </ul>
        <div className="my-2 border-t border-dashed border-black" />

        <div className="space-y-0.5">
          <p className="flex justify-between">
            <span>{line("Subtotal", "المجموع")}</span>
            <span>{money(invoice.subtotal, currency)}</span>
          </p>
          {taxRows.map((r) => (
            <p key={r.key} className="flex justify-between gap-2">
              <span>{line(r.label.replace(/ on .*$/, ""), AR.vat)}</span>
              <span>{money(r.amount, currency)}</span>
            </p>
          ))}
          {Number(invoice.round_off) !== 0 && (
            <p className="flex justify-between">
              <span>Round off</span>
              <span>{money(invoice.round_off, currency)}</span>
            </p>
          )}
          <p className="mt-1 flex justify-between border-t border-black pt-1 text-[13px] font-bold">
            <span>{line("TOTAL", AR.total)}</span>
            <span>{money(invoice.grand_total, currency)}</span>
          </p>
          {paid > 0 && (
            <p className="flex justify-between">
              <span>Paid</span>
              <span>{money(paid, currency)}</span>
            </p>
          )}
          {due > 0.0004 && (
            <p className="flex justify-between font-bold">
              <span>Balance due</span>
              <span>{money(due, currency)}</span>
            </p>
          )}
        </div>

        {note && <p className="mt-2 text-[10px]">{note}</p>}

        {country.zatcaQr && company.tax_id && (
          <div className="mt-3 flex justify-center">
            <ZatcaQr
              sellerName={company.company_name}
              vatNumber={company.tax_id}
              invoiceDate={invoice.invoice_date}
              createdAt={invoice.created_at}
              total={Number(invoice.grand_total)}
              vatTotal={Number(invoice.total_vat)}
              size={120}
            />
          </div>
        )}

        <div className="mt-3 text-center">
          <p>Thank you for your business!</p>
          {bilingual && (
            <p dir="rtl" lang="ar">
              {AR.thankYou}
            </p>
          )}
          {company.payment_link_url && <p className="mt-1 break-all text-[10px]">Pay online: {company.payment_link_url}</p>}
        </div>
      </div>
    </div>
  );
}

export default function ReceiptPage() {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-slate">Loading receipt…</p>}>
      <ReceiptView />
    </Suspense>
  );
}
