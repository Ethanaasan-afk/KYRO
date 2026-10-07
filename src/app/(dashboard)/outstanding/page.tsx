"use client";

import { BulkEmailModal } from "@/components/invoices/bulk-email-modal";
import { Button } from "@/components/ui/button";
import { EmptyState, LoadingBlock, PageHeader } from "@/components/ui/page-header";
import { useCompanySettings } from "@/hooks/use-company";
import { useCustomers } from "@/hooks/use-customers";
import { useInvoices } from "@/hooks/use-invoices";
import { usePayments } from "@/hooks/use-payments";
import { buildOutstandingRows } from "@/lib/customer-ledger";
import { agingBuckets, debtors } from "@/lib/insights";
import type { Invoice } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";
import { outstandingReminderMessage, whatsappShareUrl } from "@/lib/whatsapp";
import { motion } from "motion/react";
import { BellRing, Clock, Mail, MessageCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

const TONE = {
  ok: "bg-[#34d399]",
  warn: "bg-[#fbbf24]",
  late: "bg-[#fb923c]",
  danger: "bg-[#f43f5e]",
} as const;

export default function OutstandingPage() {
  const router = useRouter();
  const { data: customers, isLoading: loadingCust } = useCustomers();
  const { data: invoices, isLoading: loadingInv } = useInvoices();
  const { data: payments, isLoading: loadingPay } = usePayments();
  const { data: company } = useCompanySettings();
  const [reminding, setReminding] = useState<Invoice[] | null>(null);

  const rows = useMemo(
    () => buildOutstandingRows(customers ?? [], invoices ?? [], payments ?? []),
    [customers, invoices, payments]
  );
  const owed = useMemo(() => debtors(invoices ?? []), [invoices]);
  const aging = useMemo(() => agingBuckets(invoices ?? []), [invoices]);
  const totalOutstanding = useMemo(() => rows.reduce((s, r) => s + r.outstanding, 0), [rows]);
  const unpaidInvoices = useMemo(() => owed.flatMap((d) => d.invoices), [owed]);
  const reachable = owed.filter((d) => d.email).length;

  if (loadingCust || loadingInv || loadingPay) return <LoadingBlock />;

  return (
    <div>
      <PageHeader
        eyebrow="Credit"
        title="Outstanding balances"
        description="Who owes you, how long it's been, and a one-tap nudge for each"
        accent="tangerine"
        actions={
          unpaidInvoices.length ? (
            <Button onClick={() => setReminding(unpaidInvoices)}>
              <BellRing className="h-4 w-4" /> Remind everyone ({reachable})
            </Button>
          ) : undefined
        }
      />

      {!rows.length ? (
        <EmptyState
          title="Everyone has paid up 🎉"
          description="When customers have unpaid invoices, they will show up here with their age and a reminder button."
        />
      ) : (
        <>
          <section className="panel mb-5 overflow-hidden p-5 sm:p-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate">Waiting to be collected</p>
                <p className="mt-1 font-display text-3xl font-bold tracking-tight text-coral-deep sm:text-4xl">
                  {formatCurrency(totalOutstanding)}
                </p>
                <p className="mt-1 text-sm text-slate">
                  across {owed.length} customer{owed.length === 1 ? "" : "s"} · oldest bill{" "}
                  <span className={cn("font-semibold", aging.oldestDays > 60 ? "text-rose" : "text-ink")}>
                    {aging.oldestDays} days
                  </span>
                </p>
              </div>
              <p className="max-w-xs text-xs text-slate">
                Bills older than 60 days are far less likely to be paid. A friendly reminder today keeps cash flowing.
              </p>
            </div>

            <div className="mt-5 flex h-3 overflow-hidden rounded-full bg-cloud">
              {aging.buckets.map((b) =>
                b.amount > 0 ? (
                  <motion.div
                    key={b.id}
                    className={cn("h-full", TONE[b.tone])}
                    initial={{ width: 0 }}
                    animate={{ width: `${(b.amount / Math.max(1, aging.total)) * 100}%` }}
                    transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                    title={`${b.label}: ${formatCurrency(b.amount)}`}
                  />
                ) : null
              )}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {aging.buckets.map((b) => (
                <div key={b.id} className="rounded-[10px] border border-border bg-cloud/60 px-3 py-2">
                  <p className="flex items-center gap-1.5 text-[11px] font-medium text-slate">
                    <span className={cn("h-2 w-2 rounded-full", TONE[b.tone])} />
                    {b.label}
                  </p>
                  <p className="mt-0.5 font-mono text-sm font-semibold text-ink">{formatCurrency(b.amount)}</p>
                  <p className="text-[11px] text-slate">
                    {b.count} bill{b.count === 1 ? "" : "s"}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <div className="panel overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-cloud/80 text-xs uppercase tracking-wide text-slate">
                    <th className="px-5 py-3 font-medium">Customer</th>
                    <th className="px-5 py-3 font-medium">Oldest bill</th>
                    <th className="px-5 py-3 text-right font-medium">Total billed</th>
                    <th className="px-5 py-3 text-right font-medium">Paid</th>
                    <th className="px-5 py-3 text-right font-medium">Outstanding</th>
                    <th className="px-5 py-3 text-right font-medium">Nudge</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const d = owed.find((x) => x.customerId === r.customer_id);
                    const age = d?.oldestDays ?? 0;
                    const wa = whatsappShareUrl(
                      r.phone,
                      outstandingReminderMessage({
                        companyName: company?.brand_name || company?.company_name || "our shop",
                        customerName: r.name,
                        amount: r.outstanding,
                      })
                    );
                    return (
                      <tr
                        key={r.customer_id}
                        className="cursor-pointer border-b border-border/60 text-ink transition-colors hover:bg-surface-hover/60"
                        onClick={() => router.push(`/customers/${r.customer_id}`)}
                      >
                        <td className="px-5 py-3 font-medium">
                          <Link
                            href={`/customers/${r.customer_id}`}
                            className="text-primary hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {r.name}
                          </Link>
                          <span className="block text-[11px] font-normal text-slate">
                            {d?.invoices.length ?? 0} unpaid bill{d?.invoices.length === 1 ? "" : "s"}
                            {r.phone ? ` · ${r.phone}` : ""}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                              age > 90
                                ? "bg-rose/15 text-rose"
                                : age > 60
                                  ? "bg-[#fb923c]/15 text-[#c2410c] dark:text-[#fdba74]"
                                  : age > 30
                                    ? "bg-amber/15 text-[#b45309] dark:text-[#fcd34d]"
                                    : "bg-sage-soft text-sage"
                            )}
                          >
                            <Clock className="h-3 w-3" /> {age} days
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums">{formatCurrency(r.totalBilled)}</td>
                        <td className="px-5 py-3 text-right tabular-nums">{formatCurrency(r.totalPaid)}</td>
                        <td className="px-5 py-3 text-right font-semibold tabular-nums text-coral-deep">
                          {formatCurrency(r.outstanding)}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <a href={wa} target="_blank" rel="noreferrer">
                              <Button size="sm" variant="outline" type="button">
                                <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                              </Button>
                            </a>
                            <Button
                              size="sm"
                              variant="outline"
                              type="button"
                              disabled={!d?.invoices.length}
                              onClick={() => d && setReminding(d.invoices)}
                              title={d?.email ? `Email ${d.email}` : "No email on file"}
                            >
                              <Mail className="h-3.5 w-3.5" /> Email
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <BulkEmailModal
        open={!!reminding}
        onClose={() => setReminding(null)}
        invoices={reminding ?? []}
        kind="reminder"
      />
    </div>
  );
}
