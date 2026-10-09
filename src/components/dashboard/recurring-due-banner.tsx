"use client";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useDueRecurring, useRecurringMutations } from "@/hooks/use-recurring";
import { CalendarClock } from "lucide-react";
import Link from "next/link";

/** Shown on the dashboard when recurring invoices are due: one tap creates them. */
export function RecurringDueBanner() {
  const { due, dueCount } = useDueRecurring();
  const { runDue } = useRecurringMutations();
  const { toast } = useToast();
  if (!dueCount) return null;

  const customers = Array.from(new Set(due.map((d) => d.recurring.customer?.name).filter(Boolean))).slice(0, 3);

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[16px] border border-primary/30 bg-primary/5 p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <CalendarClock className="h-4 w-4" />
        </span>
        <div>
          <p className="text-sm font-semibold text-ink">
            {dueCount} recurring invoice{dueCount === 1 ? " is" : "s are"} due
          </p>
          <p className="text-xs text-slate">
            {customers.join(", ")}
            {due.length > customers.length ? ` and ${due.length - customers.length} more` : ""}
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <Link href="/invoices/recurring">
          <Button variant="ghost" type="button">
            Review
          </Button>
        </Link>
        <Button
          type="button"
          loading={runDue.isPending}
          onClick={() =>
            runDue.mutate(
              due.map((d) => d.recurring),
              {
                onSuccess: (r) =>
                  r.failed
                    ? toast(r.created ? `Created ${r.created}, then stopped: ${r.failed}` : r.failed, "error")
                    : toast(`Created ${r.created} invoice${r.created === 1 ? "" : "s"}`),
                onError: (e) => toast((e as Error).message, "error"),
              }
            )
          }
        >
          Create {dueCount === 1 ? "it" : "them"} now
        </Button>
      </div>
    </div>
  );
}
