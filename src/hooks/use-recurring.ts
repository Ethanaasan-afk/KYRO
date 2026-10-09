"use client";

import { useAuth } from "@/components/auth-provider";
import { useCompanySettings } from "@/hooks/use-company";
import { useInvoiceMutations } from "@/hooks/use-invoices";
import { DEFAULT_INVOICE_PREFIX } from "@/lib/brand";
import { isDemoMode } from "@/lib/demo/mode";
import { demoDb } from "@/lib/demo/store";
import { requireOrganizationId } from "@/lib/org";
import { dueDates, isoDate, nextRunDate } from "@/lib/recurring";
import { createClient } from "@/lib/supabase/client";
import type { RecurringInvoice } from "@/lib/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";

const MISSING_TABLE = /recurring_invoices|schema cache|does not exist|relation/i;

function mapRow(row: Record<string, unknown>): RecurringInvoice {
  return {
    ...(row as unknown as RecurringInvoice),
    items: Array.isArray(row.items) ? (row.items as RecurringInvoice["items"]) : [],
    run_count: Number(row.run_count ?? 0),
    customer: (row.customer as RecurringInvoice["customer"]) ?? null,
  };
}

async function fetchRecurring(): Promise<RecurringInvoice[]> {
  if (isDemoMode()) return demoDb.getRecurringInvoices();
  const { data, error } = await createClient()
    .from("recurring_invoices")
    .select("*, customer:customers(id, name)")
    .order("next_run_date");
  if (error) {
    // Before migration 041 the table does not exist yet
    if (MISSING_TABLE.test(error.message)) return [];
    throw error;
  }
  return (data ?? []).map((r) => mapRow(r as Record<string, unknown>));
}

export function useRecurringInvoices() {
  const { user, loading } = useAuth();
  return useQuery({
    queryKey: ["recurring_invoices"],
    enabled: !loading && !!user,
    queryFn: fetchRecurring,
  });
}

/** Recurring invoices with at least one scheduled date on or before today. */
export function useDueRecurring() {
  const q = useRecurringInvoices();
  const due = useMemo(() => {
    const today = isoDate(new Date());
    return (q.data ?? [])
      .map((r) => ({ recurring: r, dates: dueDates(r, today) }))
      .filter((x) => x.dates.length > 0);
  }, [q.data]);
  return { ...q, due, dueCount: due.reduce((n, d) => n + d.dates.length, 0) };
}

export type RunResult = { created: number; failed: string | null };

export function useRecurringMutations() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: company } = useCompanySettings();
  const { create: createInvoice } = useInvoiceMutations();

  const invalidate = () => qc.invalidateQueries({ queryKey: ["recurring_invoices"] });

  const save = useMutation({
    mutationFn: async (input: Partial<RecurringInvoice> & { id?: string }) => {
      if (isDemoMode()) return demoDb.upsertRecurringInvoice(input);
      const supabase = createClient();
      const { customer: _customer, ...row } = input;
      void _customer;
      if (input.id) {
        const { data, error } = await supabase
          .from("recurring_invoices")
          .update({ ...row, updated_at: new Date().toISOString() })
          .eq("id", input.id)
          .select()
          .single();
        if (error) throw error;
        return mapRow(data as Record<string, unknown>);
      }
      const { data, error } = await supabase
        .from("recurring_invoices")
        .insert({ ...row, organization_id: requireOrganizationId(user), created_by: user?.id ?? null })
        .select()
        .single();
      if (error) {
        if (MISSING_TABLE.test(error.message)) {
          throw new Error("Recurring invoices need the latest database update (migration 041).");
        }
        throw error;
      }
      return mapRow(data as Record<string, unknown>);
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (recurringId: string) => {
      if (isDemoMode()) return demoDb.deleteRecurringInvoice(recurringId);
      const { error } = await createClient().from("recurring_invoices").delete().eq("id", recurringId);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  /**
   * Create every invoice that is due, one per scheduled date (oldest first),
   * moving each schedule forward as it goes. Stops at the first error (for
   * example a plan limit) and reports how many were created.
   */
  const runDue = useMutation({
    mutationFn: async (rows: RecurringInvoice[]): Promise<RunResult> => {
      if (!user) throw new Error("Please sign in again.");
      const today = isoDate(new Date());
      let created = 0;
      for (const r of rows) {
        const anchor = Number(r.next_run_date.slice(8, 10));
        let made = 0;
        for (const date of dueDates(r, today)) {
          if (!r.items.length) break;
          try {
            const invoice = await createInvoice.mutateAsync({
              customer_id: r.customer_id,
              invoice_date: date,
              notes: r.notes ?? undefined,
              warehouse_id: r.warehouse_id,
              prices_include_vat: r.prices_include_vat,
              items: r.items.map((it) => ({
                product_id: it.product_id,
                quantity: it.quantity,
                unit: it.unit,
                unit_price: it.unit_price,
                price_overridden: true,
              })),
              user_id: user.id,
              prefix: company?.invoice_prefix || DEFAULT_INVOICE_PREFIX,
            });
            created += 1;
            made += 1;
            await save.mutateAsync({
              id: r.id,
              next_run_date: nextRunDate(date, r.frequency, anchor),
              last_invoice_id: invoice.id,
              last_run_at: new Date().toISOString(),
              run_count: r.run_count + made,
            });
          } catch (e) {
            return { created, failed: (e as Error).message || "Could not create the invoice." };
          }
        }
      }
      return { created, failed: null };
    },
    onSettled: () => {
      invalidate();
      qc.invalidateQueries({ queryKey: ["invoices"] });
    },
  });

  return { save, remove, runDue };
}
