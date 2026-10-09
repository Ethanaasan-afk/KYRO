"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { EmptyState, LoadingBlock, PageHeader } from "@/components/ui/page-header";
import { SearchInput } from "@/components/ui/search-input";
import { BulkEmailModal } from "@/components/invoices/bulk-email-modal";
import { useAuth } from "@/components/auth-provider";
import { useInvoiceMutations, useInvoices } from "@/hooks/use-invoices";
import { useOrgAccess } from "@/hooks/use-org-access";
import type { EmailKind } from "@/lib/email/templates";
import { INVOICE_STATUS_LABELS } from "@/lib/invoice-payment";
import type { Invoice } from "@/lib/types";
import { cn, formatDate, formatCurrency } from "@/lib/utils";
import { AnimatePresence, motion } from "motion/react";
import { Ban, BellRing, CheckCircle2, Eye, Mail, Pencil, Plus, Repeat, X } from "lucide-react";
import { RowMenu } from "@/components/ui/row-menu";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useToast } from "@/components/ui/toast";
import { useRouter } from "next/navigation";

const statusVariant = {
  issued: "info" as const,
  paid: "success" as const,
  partially_paid: "warning" as const,
  cancelled: "danger" as const,
};

type Filter = "all" | "unpaid" | "partially_paid" | "paid" | "cancelled";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "unpaid", label: "Unpaid" },
  { id: "partially_paid", label: "Part paid" },
  { id: "paid", label: "Paid" },
  { id: "cancelled", label: "Void" },
];

const balance = (inv: Invoice) =>
  inv.status === "cancelled" ? 0 : Math.max(0, Number(inv.grand_total) - Number(inv.amount_paid ?? 0));

function matches(inv: Invoice, f: Filter) {
  if (f === "all") return true;
  if (f === "unpaid") return inv.status === "issued";
  return inv.status === f;
}

export default function InvoicesPage() {
  const { isAdmin, user, isReadOnly } = useAuth();
  const { writesBlocked } = useOrgAccess();
  const { data: invoices, isLoading } = useInvoices();
  const { updateStatus } = useInvoiceMutations();
  const { toast } = useToast();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkKind, setBulkKind] = useState<EmailKind | null>(null);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [forceEditId, setForceEditId] = useState<string | null>(null);

  const searched = useMemo(() => {
    const q = search.toLowerCase();
    return (invoices ?? []).filter(
      (inv) =>
        !q ||
        inv.invoice_number.toLowerCase().includes(q) ||
        (inv.customer?.name ?? "").toLowerCase().includes(q)
    );
  }, [invoices, search]);

  const filtered = useMemo(() => searched.filter((inv) => matches(inv, filter)), [searched, filter]);

  const tabStats = useMemo(
    () =>
      Object.fromEntries(
        FILTERS.map((f) => {
          const list = searched.filter((inv) => matches(inv, f.id));
          return [f.id, { count: list.length, due: list.reduce((s, inv) => s + balance(inv), 0) }];
        })
      ) as Record<Filter, { count: number; due: number }>,
    [searched]
  );

  const selectedInvoices = filtered.filter((inv) => selected.has(inv.id));
  const allSelected = filtered.length > 0 && filtered.every((inv) => selected.has(inv.id));
  const selectedDue = selectedInvoices.reduce((s, inv) => s + balance(inv), 0);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="pb-24">
      <PageHeader
        eyebrow="Billing"
        title="Invoices"
        description="VAT tax invoices - standard, zero-rated and exempt supplies"
        accent="teal"
        actions={
          <>
            <Link href="/invoices/recurring">
              <Button variant="outline">
                <Repeat className="h-4 w-4" /> Recurring
              </Button>
            </Link>
            {writesBlocked || isReadOnly ? null : (
              <Link href="/invoices/new">
                <Button>
                  <Plus className="h-4 w-4" /> New Invoice
                </Button>
              </Link>
            )}
          </>
        }
      />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => {
                setFilter(f.id);
                setSelected(new Set());
              }}
              className={cn(
                "relative shrink-0 rounded-[10px] px-3.5 py-2 text-left text-xs font-semibold transition-colors",
                filter === f.id ? "text-ink" : "text-slate hover:text-ink"
              )}
            >
              {filter === f.id && (
                <motion.span
                  layoutId="invoice-filter"
                  className="absolute inset-0 rounded-[10px] border border-border bg-surface shadow-sm"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              <span className="relative">
                {f.label} <span className="font-mono text-slate">{tabStats[f.id]?.count ?? 0}</span>
                {(f.id === "unpaid" || f.id === "partially_paid") && (tabStats[f.id]?.due ?? 0) > 0 && (
                  <span className="block font-mono text-[10px] font-medium text-rose">
                    {formatCurrency(tabStats[f.id].due)} due
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search invoice # or customer…"
          className="lg:max-w-xs"
        />
      </div>

      {isLoading ? (
        <LoadingBlock />
      ) : !filtered.length ? (
        <EmptyState
          title={(invoices ?? []).length ? "Nothing here" : "No invoices yet - create your first one"}
          description={(invoices ?? []).length ? "Try another tab or clear the search." : undefined}
          action={
            writesBlocked || (invoices ?? []).length ? undefined : (
              <Link href="/invoices/new">
                <Button>Create first invoice</Button>
              </Link>
            )
          }
        />
      ) : (
        <div className="panel panel-accent-teal overflow-x-auto panel-lift">
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-10">
                  <input
                    type="checkbox"
                    aria-label="Select all"
                    className="h-4 w-4 accent-[var(--primary)]"
                    checked={allSelected}
                    onChange={() =>
                      setSelected(allSelected ? new Set() : new Set(filtered.map((inv) => inv.id)))
                    }
                  />
                </th>
                <th>Invoice #</th>
                <th>Date</th>
                <th>Customer</th>
                <th className="num">Total</th>
                <th className="num">Balance</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv) => {
                const due = balance(inv);
                return (
                  <tr key={inv.id} className={selected.has(inv.id) ? "bg-primary/5" : undefined}>
                    <td>
                      <input
                        type="checkbox"
                        aria-label={`Select ${inv.invoice_number}`}
                        className="h-4 w-4 accent-[var(--primary)]"
                        checked={selected.has(inv.id)}
                        onChange={() => toggle(inv.id)}
                      />
                    </td>
                    <td className="whitespace-nowrap">
                      <Link
                        href={`/invoices/${inv.id}`}
                        className="font-mono text-xs font-medium text-emerald hover:underline"
                      >
                        {inv.invoice_number}
                      </Link>
                      {inv.last_emailed_at && (
                        <Mail
                          className="ml-1.5 inline h-3 w-3 text-primary"
                          aria-label={`Emailed ${formatDate(inv.last_emailed_at)}`}
                        />
                      )}
                    </td>
                    <td className="whitespace-nowrap font-mono text-xs text-slate">
                      {formatDate(inv.invoice_date)}
                    </td>
                    <td className="max-w-[220px] truncate" title={inv.customer?.name ?? ""}>
                      {inv.customer?.name ?? "-"}
                    </td>
                    <td className="num whitespace-nowrap font-medium">{formatCurrency(inv.grand_total, inv.currency)}</td>
                    <td className={cn("num whitespace-nowrap font-mono text-xs", due > 0 ? "text-rose" : "text-slate-dim")}>
                      {due > 0 ? formatCurrency(due, inv.currency) : "—"}
                    </td>
                    <td className="whitespace-nowrap">
                      <Badge variant={statusVariant[inv.status]}>{INVOICE_STATUS_LABELS[inv.status]}</Badge>
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-0.5">
                        {inv.status !== "cancelled" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/invoices/${inv.id}?send=email`)}
                          >
                            <Mail className="h-3.5 w-3.5" /> Email
                          </Button>
                        )}
                        <RowMenu
                          items={[
                            { label: "Open", icon: Eye, onSelect: () => router.push(`/invoices/${inv.id}`) },
                            {
                              label: "Edit",
                              icon: Pencil,
                              hidden: !(inv.status === "issued" || inv.status === "partially_paid"),
                              onSelect: () => router.push(`/invoices/${inv.id}/edit`),
                            },
                            {
                              label: "Edit (admin)",
                              icon: Pencil,
                              hidden: !(isAdmin && inv.status === "paid"),
                              onSelect: () => setForceEditId(inv.id),
                            },
                            {
                              label: "Mark paid",
                              icon: CheckCircle2,
                              hidden: !(inv.status === "issued" || inv.status === "partially_paid"),
                              onSelect: async () => {
                                await updateStatus.mutateAsync({ id: inv.id, status: "paid", user_id: user!.id });
                                toast("Invoice marked paid");
                              },
                            },
                            {
                              label: "Void invoice",
                              icon: Ban,
                              danger: true,
                              hidden: !(isAdmin && inv.status !== "cancelled"),
                              onSelect: () => setCancelId(inv.id),
                            },
                          ]}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Bulk actions */}
      <AnimatePresence>
        {selectedInvoices.length > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed inset-x-0 bottom-20 z-40 flex justify-center px-4 md:bottom-6"
          >
            <div className="flex w-full max-w-2xl flex-wrap items-center gap-2 rounded-[16px] border border-border bg-surface/95 p-2.5 pl-4 shadow-lift backdrop-blur">
              <span className="mr-auto text-sm text-ink">
                <strong>{selectedInvoices.length}</strong> selected
                {selectedDue > 0 && (
                  <span className="ml-1 font-mono text-xs text-rose">· {formatCurrency(selectedDue)} due</span>
                )}
              </span>
              <Button size="sm" onClick={() => setBulkKind("invoice")}>
                <Mail className="h-3.5 w-3.5" /> Email invoices
              </Button>
              {selectedDue > 0 && (
                <Button size="sm" variant="secondary" onClick={() => setBulkKind("reminder")}>
                  <BellRing className="h-3.5 w-3.5" /> Email reminders
                </Button>
              )}
              <button
                type="button"
                onClick={() => setSelected(new Set())}
                className="flex h-9 w-9 items-center justify-center rounded-[10px] text-slate hover:bg-cloud hover:text-ink"
                aria-label="Clear selection"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <BulkEmailModal
        open={!!bulkKind}
        onClose={() => setBulkKind(null)}
        invoices={
          bulkKind === "reminder" ? selectedInvoices.filter((inv) => balance(inv) > 0) : selectedInvoices
        }
        kind={bulkKind ?? "invoice"}
        onDone={() => setSelected(new Set())}
      />

      <ConfirmModal
        open={!!cancelId}
        onClose={() => {
          setCancelId(null);
          setCancelReason("");
        }}
        title="Void invoice?"
        message="Stock will be restored. Enter a reason, then confirm."
        confirmLabel="Void invoice"
        danger
        loading={updateStatus.isPending}
        onConfirm={async () => {
          if (!cancelId || !user || !cancelReason.trim()) return;
          await updateStatus.mutateAsync({
            id: cancelId,
            status: "cancelled",
            cancelled_reason: cancelReason,
            user_id: user.id,
            restoreStock: true,
          });
          toast("Invoice voided");
          setCancelId(null);
          setCancelReason("");
        }}
      />

      <ConfirmModal
        open={!!forceEditId}
        onClose={() => setForceEditId(null)}
        title="Edit a paid invoice?"
        message="This invoice is already paid. Editing can cause accounting inconsistencies. Continue only if you must?"
        confirmLabel="Edit anyway"
        danger
        onConfirm={() => {
          if (!forceEditId) return;
          const id = forceEditId;
          setForceEditId(null);
          router.push(`/invoices/${id}/edit?force=1`);
        }}
      />

      {cancelId && (
        <div className="pointer-events-none fixed inset-x-0 bottom-8 z-[60] flex justify-center px-4">
          <div className="pointer-events-auto w-full max-w-md panel p-4">
            <label className="text-xs text-slate">Cancellation reason (required)</label>
            <input
              className="mt-1 h-10 w-full rounded-[10px] border border-border bg-surface px-3 text-sm text-ink focus:border-emerald focus:outline-none"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. Duplicate entry / wrong customer"
              autoFocus
            />
          </div>
        </div>
      )}
    </div>
  );
}
