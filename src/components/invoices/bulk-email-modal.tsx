"use client";

import { Modal } from "@/components/ui/modal";
import { useCompanySettings, useOrganization } from "@/hooks/use-company";
import { draftEmail, useEmailStatus, useSendInvoiceEmail } from "@/hooks/use-invoice-email";
import { fetchInvoiceDetail } from "@/hooks/use-invoices";
import { isValidEmail, type EmailKind } from "@/lib/email/templates";
import type { Invoice } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";
import { motion } from "motion/react";
import { AlertTriangle, CheckCircle2, CircleDashed, Loader2, Mail, XCircle } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

const canEmail = (inv: Invoice) => isValidEmail(inv.customer?.email?.trim() ?? "") && inv.status !== "cancelled";

type RowState = "queued" | "sending" | "sent" | "failed" | "skipped";

/** Emails many invoices (or reminders) one after another, with live progress. */
export function BulkEmailModal({
  open,
  onClose,
  invoices,
  kind,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  invoices: Invoice[];
  kind: EmailKind;
  onDone?: () => void;
}) {
  const { data: company } = useCompanySettings();
  const { data: org } = useOrganization();
  const { data: status } = useEmailStatus();
  const send = useSendInvoiceEmail();
  const [rows, setRows] = useState<Record<string, { state: RowState; note?: string }>>({});
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  // Freeze the list when the dialog opens, so clearing the page selection afterwards
  // never wipes the progress the user is looking at.
  const [list, setList] = useState<Invoice[]>([]);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (open && !wasOpen.current) {
      setList(invoices);
      const init: Record<string, { state: RowState; note?: string }> = {};
      for (const inv of invoices) {
        init[inv.id] = canEmail(inv)
          ? { state: "queued" }
          : { state: "skipped", note: inv.status === "cancelled" ? "Void" : "No email on file" };
      }
      setRows(init);
      setRunning(false);
      setFinished(false);
    }
    wasOpen.current = open;
  }, [open, invoices]);

  const sendable = useMemo(() => list.filter(canEmail), [list]);
  const skipped = list.length - sendable.length;

  const counts = Object.values(rows).reduce(
    (acc, r) => ((acc[r.state] = (acc[r.state] ?? 0) + 1), acc),
    {} as Record<RowState, number>
  );
  const done = (counts.sent ?? 0) + (counts.failed ?? 0);
  const pct = sendable.length ? Math.round((done / sendable.length) * 100) : 0;
  const blocked = status ? !status.configured : false;

  const run = async () => {
    if (!company || running) return;
    setRunning(true);
    for (const inv of sendable) {
      setRows((r) => ({ ...r, [inv.id]: { state: "sending" } }));
      try {
        const full = await fetchInvoiceDetail(inv.id);
        const draft = draftEmail(full, company, kind, {
          subject: org?.email_subject_template,
          body: org?.email_body_template,
        });
        await send({
          invoice: full,
          company,
          to: full.customer?.email ?? "",
          subject: draft.subject,
          message: draft.message,
          kind,
          allowMailto: false,
        });
        setRows((r) => ({ ...r, [inv.id]: { state: "sent" } }));
      } catch (e) {
        setRows((r) => ({ ...r, [inv.id]: { state: "failed", note: (e as Error).message } }));
      }
    }
    setRunning(false);
    setFinished(true);
    onDone?.();
  };

  const icon = (s: RowState) =>
    s === "sent" ? (
      <CheckCircle2 className="h-4 w-4 text-sage" />
    ) : s === "failed" ? (
      <XCircle className="h-4 w-4 text-rose" />
    ) : s === "sending" ? (
      <Loader2 className="h-4 w-4 animate-spin text-primary" />
    ) : s === "skipped" ? (
      <AlertTriangle className="h-4 w-4 text-amber" />
    ) : (
      <CircleDashed className="h-4 w-4 text-slate-dim" />
    );

  return (
    <Modal
      open={open}
      onClose={running ? () => undefined : onClose}
      title={kind === "reminder" ? "Email payment reminders" : "Email invoices"}
      size="lg"
    >
      <div className="rounded-[12px] bg-primary-soft p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-ink">
            <strong>{sendable.length}</strong> {kind === "reminder" ? "reminder" : "invoice"}
            {sendable.length === 1 ? "" : "s"} ready
            {skipped > 0 && <span className="text-slate"> · {skipped} skipped</span>}
          </p>
          <span className="font-mono text-sm font-semibold text-primary">{pct}%</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-[#7c1cf0] to-[#b65cff]"
            animate={{ width: `${pct}%` }}
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
          />
        </div>
        <p className="mt-2 text-xs text-slate">
          Each customer gets their own email with the PDF attached and a secure download link.
        </p>
      </div>

      {blocked && (
        <p className="mt-3 rounded-[10px] bg-amber/10 px-3 py-2 text-xs text-ink">
          Bulk email needs one-click sending switched on (Settings → Email). Single invoices can still be sent from
          your own mail app.
        </p>
      )}

      <ul className="mt-4 max-h-[300px] divide-y divide-border overflow-y-auto rounded-[12px] border border-border">
        {list.map((inv) => {
          const r = rows[inv.id] ?? { state: "queued" as RowState };
          return (
            <li key={inv.id} className={cn("flex items-center gap-3 px-3 py-2.5 text-sm", r.state === "sending" && "bg-primary/5")}>
              {icon(r.state)}
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-ink">{inv.customer?.name ?? "Customer"}</span>
                <span className="block truncate text-[11px] text-slate">
                  {inv.invoice_number} · {inv.customer?.email || "no email"}
                  {r.note ? ` · ${r.note}` : ""}
                </span>
              </span>
              <span className="shrink-0 font-mono text-xs text-ink">
                {formatCurrency(
                  kind === "reminder"
                    ? Math.max(0, Number(inv.grand_total) - Number(inv.amount_paid ?? 0))
                    : Number(inv.grand_total),
                  inv.currency
                )}
              </span>
            </li>
          );
        })}
      </ul>

      {finished && (
        <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-4 text-sm font-medium text-ink">
          Done - {counts.sent ?? 0} sent
          {counts.failed ? `, ${counts.failed} failed` : ""}
          {counts.skipped ? `, ${counts.skipped} skipped` : ""}.
        </motion.p>
      )}

      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          disabled={running}
          className="h-11 rounded-[10px] px-4 text-sm font-medium text-slate hover:text-ink disabled:opacity-40"
        >
          {finished ? "Close" : "Cancel"}
        </button>
        {!finished && (
          <button
            type="button"
            onClick={() => void run()}
            disabled={running || !sendable.length || blocked || !company}
            className="inline-flex h-11 items-center gap-2 rounded-[10px] bg-gradient-to-r from-[#7c1cf0] to-[#b65cff] px-5 text-sm font-semibold text-white shadow-[0_8px_20px_-6px_rgba(124,28,240,0.55)] transition-all hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-50"
          >
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
            {running ? `Sending ${done + 1} of ${sendable.length}…` : `Send ${sendable.length} email${sendable.length === 1 ? "" : "s"}`}
          </button>
        )}
      </div>
    </Modal>
  );
}
