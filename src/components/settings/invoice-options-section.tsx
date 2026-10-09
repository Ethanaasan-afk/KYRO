"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useOrganization, useUpdateOrganization } from "@/hooks/use-company";
import { INVOICE_LANGUAGE_OPTIONS, type InvoiceLanguage } from "@/lib/invoice-arabic";
import { documentNumberPreview, isSafePaymentUrl } from "@/lib/invoice-options";
import type { NumberingPeriod } from "@/lib/types";
import { cn } from "@/lib/utils";
import { FileText } from "lucide-react";
import { useEffect, useState } from "react";

const PERIODS: Array<{ value: NumberingPeriod; label: string; hint: string }> = [
  { value: "calendar", label: "Calendar year", hint: "January to December, the UAE standard." },
  { value: "april", label: "April to March", hint: "Keep this if your earlier invoices used it." },
];

/** Invoice language, Arabic business name, online payment link and numbering. */
export function InvoiceOptionsSection() {
  const { data: org } = useOrganization();
  const update = useUpdateOrganization();
  const { toast } = useToast();
  const [language, setLanguage] = useState<InvoiceLanguage>("en");
  const [nameAr, setNameAr] = useState("");
  const [payUrl, setPayUrl] = useState("");
  const [period, setPeriod] = useState<NumberingPeriod>("calendar");
  const [urlError, setUrlError] = useState("");

  useEffect(() => {
    if (!org) return;
    setLanguage(org.invoice_language ?? "en");
    setNameAr(org.name_ar ?? "");
    setPayUrl(org.payment_link_url ?? "");
    setPeriod(org.numbering_period ?? "calendar");
  }, [org]);

  if (!org) return null;

  const saved = {
    language: org.invoice_language ?? "en",
    nameAr: org.name_ar ?? "",
    payUrl: org.payment_link_url ?? "",
    period: org.numbering_period ?? "calendar",
  };
  const dirty =
    language !== saved.language || nameAr.trim() !== saved.nameAr || payUrl.trim() !== saved.payUrl || period !== saved.period;
  const periodChanged = period !== saved.period;

  const save = () => {
    const url = payUrl.trim();
    if (url && !isSafePaymentUrl(url)) {
      setUrlError("Use a full https:// link, e.g. https://buy.stripe.com/…");
      return;
    }
    setUrlError("");
    update.mutate(
      {
        id: org.id,
        invoice_language: language,
        name_ar: nameAr.trim() || null,
        payment_link_url: url || null,
        numbering_period: period,
      },
      {
        onSuccess: () => toast("Invoice options saved"),
        onError: (e) =>
          toast(
            /column|schema cache/i.test((e as Error).message)
              ? "These options need the latest database update (migration 041)."
              : (e as Error).message,
            "error"
          ),
      }
    );
  };

  return (
    <section id="invoice-options" className="panel mt-6 max-w-2xl scroll-mt-24 space-y-6 p-5">
      <div>
        <h2 className="flex items-center gap-2 font-display text-sm font-semibold text-ink">
          <FileText className="h-4 w-4 text-primary" /> Invoice options
        </h2>
        <p className="mt-1 text-sm text-slate">How your tax invoices look and how they are numbered.</p>
      </div>

      <fieldset className="space-y-2">
        <legend className="field-label">Invoice language</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {INVOICE_LANGUAGE_OPTIONS.map((o) => (
            <label
              key={o.value}
              className={cn(
                "flex cursor-pointer gap-3 rounded-[12px] border p-3 transition-colors",
                language === o.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
              )}
            >
              <input
                type="radio"
                name="invoice_language"
                className="mt-1 accent-[var(--primary)]"
                checked={language === o.value}
                onChange={() => setLanguage(o.value)}
              />
              <span>
                <span className="block text-sm font-semibold text-ink">{o.label}</span>
                <span className="block text-xs text-slate">{o.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="space-y-1.5">
        <Input
          id="name_ar"
          label="Business name in Arabic"
          dir="rtl"
          lang="ar"
          placeholder="مثال: الواحة للتجارة العامة ذ.م.م"
          value={nameAr}
          maxLength={120}
          onChange={(e) => setNameAr(e.target.value)}
        />
        <p className="text-[11px] text-slate">Printed under your business name on English + Arabic invoices.</p>
      </div>

      <div className="space-y-1.5">
        <Input
          id="payment_link_url"
          label="Online payment link (optional)"
          type="url"
          inputMode="url"
          placeholder="https://buy.stripe.com/…"
          value={payUrl}
          error={urlError}
          onChange={(e) => {
            setPayUrl(e.target.value);
            setUrlError("");
          }}
        />
        <p className="text-[11px] text-slate">
          Your own Stripe, PayTabs, Network International or bank payment page. It appears on every invoice PDF and email
          as a &quot;Pay online&quot; link.
        </p>
      </div>

      <fieldset className="space-y-2">
        <legend className="field-label">Number invoices by</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {PERIODS.map((p) => (
            <label
              key={p.value}
              className={cn(
                "flex cursor-pointer gap-3 rounded-[12px] border p-3 transition-colors",
                period === p.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
              )}
            >
              <input
                type="radio"
                name="numbering_period"
                className="mt-1 accent-[var(--primary)]"
                checked={period === p.value}
                onChange={() => setPeriod(p.value)}
              />
              <span>
                <span className="block text-sm font-semibold text-ink">{p.label}</span>
                <span className="block text-xs text-slate">{p.hint}</span>
                <span className="mt-1 block font-mono text-xs text-ink">{documentNumberPreview(org.invoice_prefix, p.value)}</span>
              </span>
            </label>
          ))}
        </div>
        {periodChanged && (
          <p className="rounded-[10px] bg-amber/10 px-3 py-2 text-xs text-ink">
            Your next invoice starts a new series: <strong className="font-mono">{documentNumberPreview(org.invoice_prefix, period)}</strong>.
            Invoices you already issued keep their numbers.
          </p>
        )}
      </fieldset>

      <div className="flex justify-end">
        <Button type="button" onClick={save} loading={update.isPending} disabled={!dirty}>
          Save invoice options
        </Button>
      </div>
    </section>
  );
}
