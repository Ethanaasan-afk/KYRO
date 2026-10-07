"use client";

import { useAuth } from "@/components/auth-provider";
import { useOrganization } from "@/hooks/use-company";
import { useCustomers } from "@/hooks/use-customers";
import { useEmailStatus, useInvoiceEmailLog } from "@/hooks/use-invoice-email";
import { usePayments } from "@/hooks/use-payments";
import { useProducts } from "@/hooks/use-products";
import { usePurchases } from "@/hooks/use-purchases";
import { isDemoMode } from "@/lib/demo/mode";
import { demoDb } from "@/lib/demo/store";
import { addDays, dayKey, type SoldItem } from "@/lib/insights";
import { createClient } from "@/lib/supabase/client";
import type { Invoice } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";

/** ~13 months of invoices with their customer - enough for streaks, goals and a 12-month chart. */
export function useInvoiceHistory() {
  const { user, loading } = useAuth();
  return useQuery({
    queryKey: ["invoices", "history"],
    enabled: !loading && !!user,
    queryFn: async (): Promise<Invoice[]> => {
      if (isDemoMode()) return demoDb.getInvoices();
      const since = dayKey(addDays(new Date(), -400));
      const supabase = createClient();
      const { data, error } = await supabase
        .from("invoices")
        .select("*, customer:customers(id, name, email, phone, customer_type, state)")
        .gte("invoice_date", since)
        .order("invoice_date", { ascending: false })
        .limit(5000);
      if (error) throw error;
      return (data ?? []).map((row) => ({
        ...(row as Invoice),
        subtotal: Number(row.subtotal),
        total_vat: Number(row.total_vat ?? 0),
        grand_total: Number(row.grand_total),
        amount_paid: Number(row.amount_paid ?? 0),
        currency: String(row.currency ?? "AED"),
      }));
    },
  });
}

/** Invoice lines sold since a date (for "top products"). */
export function useSoldItems(since: string) {
  const { user, loading } = useAuth();
  return useQuery({
    queryKey: ["invoice_items", "sold", since],
    enabled: !loading && !!user,
    queryFn: async (): Promise<SoldItem[]> => {
      if (isDemoMode()) {
        return demoDb
          .getInvoices()
          .filter((inv) => inv.status !== "cancelled" && inv.invoice_date >= since)
          .flatMap((inv) =>
            (inv.items ?? []).map((it) => ({
              product_id: it.product_id ?? null,
              quantity: Number(it.quantity),
              line_total: Number(it.line_total),
              invoice_date: inv.invoice_date,
            }))
          );
      }
      const supabase = createClient();
      const { data, error } = await supabase
        .from("invoice_items")
        .select("product_id, quantity, line_total, invoices!inner(invoice_date, status)")
        .gte("invoices.invoice_date", since)
        .neq("invoices.status", "cancelled")
        .limit(10000);
      if (error) return [];
      return (data ?? []).map((row) => {
        const inv = (Array.isArray(row.invoices) ? row.invoices[0] : row.invoices) as
          | { invoice_date: string }
          | undefined;
        return {
          product_id: (row.product_id as string | null) ?? null,
          quantity: Number(row.quantity),
          line_total: Number(row.line_total),
          invoice_date: inv?.invoice_date ?? since,
        };
      });
    },
  });
}

export function useDashboardData() {
  const since90 = dayKey(addDays(new Date(), -89));
  const invoices = useInvoiceHistory();
  const products = useProducts();
  const customers = useCustomers();
  const payments = usePayments();
  const purchases = usePurchases();
  const org = useOrganization();
  const sold = useSoldItems(since90);
  const emails = useInvoiceEmailLog();
  const emailStatus = useEmailStatus();

  const core = [invoices, products, customers, org];
  return {
    invoices: invoices.data ?? [],
    products: products.data ?? [],
    customers: customers.data ?? [],
    payments: payments.data ?? [],
    purchases: purchases.data ?? [],
    org: org.data,
    sold: sold.data ?? [],
    emails: emails.data ?? [],
    emailConfigured: emailStatus.data?.configured ?? false,
    since90,
    isLoading: core.some((q) => q.isLoading),
    isError: core.some((q) => q.isError),
    retry: () => Promise.all(core.map((q) => q.refetch())),
  };
}
