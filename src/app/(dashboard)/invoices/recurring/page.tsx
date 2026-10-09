"use client";

import { useAuth } from "@/components/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { EmptyState, LoadingBlock, PageHeader } from "@/components/ui/page-header";
import { useToast } from "@/components/ui/toast";
import { useDueRecurring, useRecurringMutations } from "@/hooks/use-recurring";
import { useCompanySettings } from "@/hooks/use-company";
import { frequencyLabel, recurringTotal } from "@/lib/recurring";
import type { RecurringInvoice } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CalendarClock, Pause, Play, Repeat, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function RecurringInvoicesPage() {
  const { isReadOnly } = useAuth();
  const { data: rows, isLoading, due, dueCount } = useDueRecurring();
  const { data: company } = useCompanySettings();
  const { save, remove, runDue } = useRecurringMutations();
  const { toast } = useToast();
  const [deleting, setDeleting] = useState<RecurringInvoice | null>(null);
  const currency = company?.currency ?? "AED";

  const createDue = () => {
    runDue.mutate(
      due.map((d) => d.recurring),
      {
        onSuccess: (r) => {
          if (r.failed) {
            toast(r.created ? `Created ${r.created}, then stopped: ${r.failed}` : r.failed, "error");
          } else {
            toast(`Created ${r.created} invoice${r.created === 1 ? "" : "s"}`);
          }
        },
        onError: (e) => toast((e as Error).message, "error"),
      }
    );
  };

  const toggle = (r: RecurringInvoice) =>
    save.mutate(
      { id: r.id, active: !r.active },
      {
        onSuccess: () => toast(r.active ? "Paused" : "Resumed"),
        onError: (e) => toast((e as Error).message, "error"),
      }
    );

  return (
    <div>
      <PageHeader
        title="Recurring invoices"
        description="Invoices that repeat for the same customer: rent, retainers, monthly supplies."
        actions={
          <Link href="/invoices">
            <Button variant="outline">Back to invoices</Button>
          </Link>
        }
      />

      {dueCount > 0 && !isReadOnly && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-primary/30 bg-primary/5 p-4">
          <p className="flex items-center gap-2 text-sm text-ink">
            <CalendarClock className="h-4 w-4 text-primary" />
            <span>
              <strong>{dueCount}</strong> invoice{dueCount === 1 ? " is" : "s are"} due today or earlier.
            </span>
          </p>
          <Button onClick={createDue} loading={runDue.isPending}>
            Create {dueCount === 1 ? "it" : `all ${dueCount}`} now
          </Button>
        </div>
      )}

      {isLoading ? (
        <LoadingBlock />
      ) : !rows?.length ? (
        <EmptyState
          title="No recurring invoices yet"
          description="Open any invoice and tap Repeat to bill the same customer every week, month, quarter or year."
        />
      ) : (
        <div className="panel overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Repeats</th>
                <th>Next invoice</th>
                <th className="text-right">Amount (excl. VAT)</th>
                <th>Status</th>
                {!isReadOnly && <th className="text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const isDue = due.some((d) => d.recurring.id === r.id);
                const ended = !!r.end_date && r.next_run_date > r.end_date;
                return (
                  <tr key={r.id}>
                    <td>
                      <p className="font-medium text-ink">{r.customer?.name ?? "Customer"}</p>
                      <p className="text-xs text-slate">
                        {r.items.length} item{r.items.length === 1 ? "" : "s"}
                        {r.run_count ? ` · ${r.run_count} created so far` : ""}
                      </p>
                    </td>
                    <td className="whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5">
                        <Repeat className="h-3.5 w-3.5 text-primary" /> {frequencyLabel(r.frequency)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap">
                      {ended ? "Finished" : formatDate(r.next_run_date)}
                      {r.end_date && !ended && <p className="text-xs text-slate">until {formatDate(r.end_date)}</p>}
                    </td>
                    <td className="num text-right">{formatCurrency(recurringTotal(r.items), currency)}</td>
                    <td>
                      {!r.active ? (
                        <Badge>Paused</Badge>
                      ) : ended ? (
                        <Badge>Finished</Badge>
                      ) : isDue ? (
                        <Badge variant="warning">Due</Badge>
                      ) : (
                        <Badge variant="success">Active</Badge>
                      )}
                    </td>
                    {!isReadOnly && (
                      <td className="whitespace-nowrap text-right">
                        <Button size="sm" variant="ghost" onClick={() => toggle(r)} aria-label={r.active ? "Pause" : "Resume"}>
                          {r.active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                          {r.active ? "Pause" : "Resume"}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setDeleting(r)} aria-label="Delete schedule">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmModal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Delete this schedule?"
        message="Invoices already created stay. Only future repeats stop."
        danger
        loading={remove.isPending}
        confirmLabel="Delete schedule"
        onConfirm={() => {
          if (!deleting) return;
          remove.mutate(deleting.id, {
            onSuccess: () => {
              toast("Schedule deleted");
              setDeleting(null);
            },
            onError: (e) => toast((e as Error).message, "error"),
          });
        }}
      />
    </div>
  );
}
