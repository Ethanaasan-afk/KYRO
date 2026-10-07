"use client";

import { useAuth } from "@/components/auth-provider";
import { isDemoMode } from "@/lib/demo/mode";
import { demoDb } from "@/lib/demo/store";
import { createClient } from "@/lib/supabase/client";
import {
  DEFAULT_TEMPLATES,
  fillTemplate,
  parseEmailList,
  type EmailKind,
  type EmailVars,
} from "@/lib/email/templates";
import type { CompanySettings, Invoice, InvoiceEmailLog } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

export type EmailStatus = { configured: boolean; provider: string | null; fromAddress: string | null };

export function useEmailStatus() {
  return useQuery({
    queryKey: ["email_status"],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<EmailStatus> => {
      const res = await fetch("/api/email/status", { cache: "no-store" });
      if (!res.ok) return { configured: false, provider: null, fromAddress: null };
      return (await res.json()) as EmailStatus;
    },
  });
}

export function useInvoiceEmailLog(invoiceId?: string) {
  const { user, loading } = useAuth();
  return useQuery({
    queryKey: ["invoice_emails", invoiceId ?? "all"],
    enabled: !loading && !!user,
    queryFn: async (): Promise<InvoiceEmailLog[]> => {
      if (isDemoMode()) return demoDb.getInvoiceEmails(invoiceId);
      const supabase = createClient();
      let q = supabase.from("invoice_emails").select("*").order("created_at", { ascending: false }).limit(200);
      if (invoiceId) q = q.eq("invoice_id", invoiceId);
      const { data, error } = await q;
      if (error) return []; // table arrives with migration 038
      return (data ?? []) as InvoiceEmailLog[];
    },
  });
}

/** Everything except {link}, which the server fills once the PDF is stored. */
export function emailVarsFor(invoice: Invoice, company?: CompanySettings | null): Omit<EmailVars, "link"> {
  const total = Number(invoice.grand_total) || 0;
  const due = Math.max(0, total - Number(invoice.amount_paid ?? 0));
  return {
    customer: invoice.customer?.name ?? "there",
    invoice_number: invoice.invoice_number,
    date: formatDate(invoice.invoice_date),
    amount: formatCurrency(total, invoice.currency),
    amount_due: formatCurrency(due, invoice.currency),
    company: company?.brand_name || company?.company_name || "",
  };
}

export function draftEmail(
  invoice: Invoice,
  company: CompanySettings | null | undefined,
  kind: EmailKind,
  templates?: { subject?: string | null; body?: string | null }
) {
  const vars = emailVarsFor(invoice, company);
  const base = DEFAULT_TEMPLATES[kind];
  const subject = (kind === "invoice" && templates?.subject) || base.subject;
  const body = (kind === "invoice" && templates?.body) || base.body;
  // keep {link} as a placeholder for the server
  const partial = { ...vars, link: "{link}" };
  return { subject: fillTemplate(subject, partial), message: fillTemplate(body, partial) };
}

export type SendResult = { mode: "sent" | "mailto"; pdfUrl?: string | null };

function openMailApp(to: string[], cc: string[], subject: string, text: string) {
  const params = new URLSearchParams();
  if (cc.length) params.set("cc", cc.join(","));
  params.set("subject", subject);
  params.set("body", text);
  // URLSearchParams encodes spaces as "+", which mail apps show literally
  const query = params.toString().replace(/\+/g, "%20");
  window.location.href = `mailto:${to.map(encodeURIComponent).join(",")}?${query}`;
}

/** Renders the PDF in the browser and emails it (or opens the mail app as a fallback). */
export function useSendInvoiceEmail() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useCallback(
    async (input: {
      invoice: Invoice;
      company: CompanySettings;
      to: string;
      cc?: string;
      subject: string;
      message: string;
      kind: EmailKind;
      /** Bulk sends never open the mail app */
      allowMailto?: boolean;
    }): Promise<SendResult> => {
      const to = parseEmailList(input.to);
      const cc = parseEmailList(input.cc);
      if (!to.length) throw new Error("Add an email address first.");

      if (isDemoMode()) {
        await new Promise((r) => setTimeout(r, 650));
        demoDb.logInvoiceEmail({
          invoice_id: input.invoice.id,
          customer_id: input.invoice.customer_id,
          kind: input.kind,
          to_email: to.join(", "),
          cc: cc.length ? cc.join(", ") : null,
          subject: input.subject,
          sent_by: user?.id ?? null,
        });
        qc.invalidateQueries({ queryKey: ["invoice_emails"] });
        qc.invalidateQueries({ queryKey: ["invoices"] });
        return { mode: "sent" };
      }

      const { buildPdfBlob } = await import("@/lib/invoice-pdf-download");
      const blob = await buildPdfBlob(input.invoice, input.company, 0);
      const form = new FormData();
      form.append("pdf", blob, `${input.invoice.invoice_number}.pdf`);
      form.append("to", to.join(","));
      form.append("cc", cc.join(","));
      form.append("subject", input.subject);
      form.append("message", input.message);
      form.append("kind", input.kind);

      const res = await fetch(`/api/invoices/${input.invoice.id}/email`, { method: "POST", body: form });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        pdfUrl?: string | null;
        subject?: string;
        text?: string;
      };

      if (res.status === 503 && body.error === "not_configured") {
        if (input.allowMailto === false) {
          throw new Error("Email sending isn't set up yet - see Settings → Email.");
        }
        openMailApp(to, cc, body.subject ?? input.subject, body.text ?? input.message);
        return { mode: "mailto", pdfUrl: body.pdfUrl };
      }
      if (!res.ok) throw new Error(body.error || "Email failed - please try again.");

      qc.invalidateQueries({ queryKey: ["invoice_emails"] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
      return { mode: "sent", pdfUrl: body.pdfUrl };
    },
    [qc, user?.id]
  );
}
