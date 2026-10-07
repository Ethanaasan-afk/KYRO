"use client";

import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { useCompanySettings, useOrganization } from "@/hooks/use-company";
import { useCustomerMutations } from "@/hooks/use-customers";
import { draftEmail, useEmailStatus, useSendInvoiceEmail } from "@/hooks/use-invoice-email";
import { isValidEmail, parseEmailList, type EmailKind } from "@/lib/email/templates";
import type { Invoice } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";
import { AnimatePresence, motion } from "motion/react";
import { BellRing, CheckCircle2, FileText, Mail, Paperclip, Send } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

export function EmailInvoiceModal({
  open,
  onClose,
  invoice,
  initialKind,
}: {
  open: boolean;
  onClose: () => void;
  invoice: Invoice;
  initialKind?: EmailKind;
}) {
  const { data: company } = useCompanySettings();
  const { data: org } = useOrganization();
  const { data: status } = useEmailStatus();
  const send = useSendInvoiceEmail();
  const { upsert: saveCustomer } = useCustomerMutations();
  const { toast } = useToast();

  const due = Math.max(0, Number(invoice.grand_total) - Number(invoice.amount_paid ?? 0));
  const [kind, setKind] = useState<EmailKind>(initialKind ?? "invoice");
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [showCc, setShowCc] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [saveToCustomer, setSaveToCustomer] = useState(true);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<null | "sent" | "mailto">(null);
  const [error, setError] = useState("");

  const customerEmail = invoice.customer?.email?.trim() ?? "";

  useEffect(() => {
    if (!open) return;
    setKind(initialKind ?? "invoice");
    setTo(customerEmail);
    setCc("");
    setShowCc(false);
    setDone(null);
    setError("");
    setBusy(false);
  }, [open, customerEmail, initialKind]);

  useEffect(() => {
    if (!open) return;
    const d = draftEmail(invoice, company, kind, {
      subject: org?.email_subject_template,
      body: org?.email_body_template,
    });
    setSubject(d.subject);
    setMessage(d.message);
  }, [open, kind, invoice, company, org?.email_subject_template, org?.email_body_template]);

  const recipients = parseEmailList(to);
  const invalid = [...recipients, ...parseEmailList(cc)].filter((e) => !isValidEmail(e));
  const canSend = recipients.length > 0 && invalid.length === 0 && !busy && !!company;
  const typedNewEmail = !customerEmail && recipients.length === 1 && isValidEmail(recipients[0]!);
  const preview = useMemo(() => message.replace(/\{link\}/g, "🔗 download link"), [message]);

  const onSend = async () => {
    if (!company || !canSend) return;
    setBusy(true);
    setError("");
    try {
      if (typedNewEmail && saveToCustomer && invoice.customer) {
        saveCustomer.mutate({
          ...invoice.customer,
          email: recipients[0]!,
          name: invoice.customer.name,
          state: invoice.customer.state ?? "",
          customer_type: invoice.customer.customer_type,
        });
      }
      const result = await send({ invoice, company, to, cc, subject, message, kind });
      setDone(result.mode);
      if (result.mode === "sent") {
        toast(`${kind === "reminder" ? "Reminder" : "Invoice"} sent to ${recipients.join(", ")}`);
        window.setTimeout(onClose, 1500);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={`Email ${invoice.invoice_number}`} size="lg">
      <AnimatePresence mode="wait">
        {done ? (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center px-4 py-10 text-center"
          >
            <motion.span
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 16 }}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-sage-soft text-sage"
            >
              <CheckCircle2 className="h-9 w-9" />
            </motion.span>
            <h3 className="mt-4 font-display text-xl font-semibold text-ink">
              {done === "sent" ? "On its way!" : "Opened in your mail app"}
            </h3>
            <p className="mt-1 max-w-sm text-sm text-slate">
              {done === "sent"
                ? `${recipients.join(", ")} will get the PDF in a moment.`
                : "Your email app has the message ready with a download link to the PDF. Hit send there."}
            </p>
            {done === "mailto" && (
              <button type="button" onClick={onClose} className="mt-5 text-sm font-semibold text-primary hover:underline">
                Close
              </button>
            )}
          </motion.div>
        ) : (
          <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="grid grid-cols-2 gap-1 rounded-[12px] bg-cloud p-1">
              {(
                [
                  { id: "invoice", label: "Send invoice", icon: FileText },
                  { id: "reminder", label: "Payment reminder", icon: BellRing, disabled: due <= 0 },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  disabled={"disabled" in t && t.disabled}
                  onClick={() => setKind(t.id)}
                  className={cn(
                    "relative flex h-10 items-center justify-center gap-2 rounded-[10px] text-sm font-semibold transition-colors disabled:opacity-40",
                    kind === t.id ? "text-ink" : "text-slate hover:text-ink"
                  )}
                >
                  {kind === t.id && (
                    <motion.span
                      layoutId="email-kind"
                      className="absolute inset-0 rounded-[10px] bg-surface shadow-sm"
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    />
                  )}
                  <t.icon className="relative h-4 w-4" />
                  <span className="relative">{t.label}</span>
                </button>
              ))}
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <div className="flex items-center justify-between">
                  <label className="field-label" htmlFor="email-to">To</label>
                  {!showCc && (
                    <button type="button" onClick={() => setShowCc(true)} className="text-xs font-semibold text-primary hover:underline">
                      + CC
                    </button>
                  )}
                </div>
                <input
                  id="email-to"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  placeholder="customer@example.com"
                  className="mt-1.5 h-11 w-full rounded-[10px] border border-border bg-surface px-3 text-sm text-ink outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/15"
                />
                {typedNewEmail && (
                  <label className="mt-1.5 flex items-center gap-2 text-xs text-slate">
                    <input type="checkbox" checked={saveToCustomer} onChange={(e) => setSaveToCustomer(e.target.checked)} />
                    Save this email to {invoice.customer?.name ?? "the customer"} for next time
                  </label>
                )}
              </div>
              {showCc && (
                <div>
                  <label className="field-label" htmlFor="email-cc">CC</label>
                  <input
                    id="email-cc"
                    value={cc}
                    onChange={(e) => setCc(e.target.value)}
                    placeholder="accounts@example.com"
                    className="mt-1.5 h-11 w-full rounded-[10px] border border-border bg-surface px-3 text-sm text-ink outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/15"
                  />
                </div>
              )}
              <div>
                <label className="field-label" htmlFor="email-subject">Subject</label>
                <input
                  id="email-subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="mt-1.5 h-11 w-full rounded-[10px] border border-border bg-surface px-3 text-sm text-ink outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/15"
                />
              </div>
              <div>
                <label className="field-label" htmlFor="email-message">Message</label>
                <textarea
                  id="email-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={7}
                  className="mt-1.5 w-full rounded-[10px] border border-border bg-surface px-3 py-2.5 text-sm leading-relaxed text-ink outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/15"
                />
                <p className="mt-1 text-[11px] text-slate">
                  <code className="rounded bg-cloud px-1">{"{link}"}</code> becomes a secure download link to the PDF.
                </p>
              </div>
            </div>

            {/* What the customer sees */}
            <div className="mt-4 overflow-hidden rounded-[14px] border border-border bg-cloud">
              <div className={cn("h-1", kind === "reminder" ? "bg-amber" : "bg-primary")} />
              <div className="p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate">Preview</p>
                <p className="mt-1 truncate text-sm font-semibold text-ink">{subject}</p>
                <div className="mt-3 grid grid-cols-3 gap-2 rounded-[10px] bg-surface p-3 text-[11px] text-slate">
                  <span>
                    Invoice
                    <strong className="block font-mono text-xs text-ink">{invoice.invoice_number}</strong>
                  </span>
                  <span>
                    Total
                    <strong className="block font-mono text-xs text-ink">{formatCurrency(invoice.grand_total, invoice.currency)}</strong>
                  </span>
                  <span className="text-right">
                    Due
                    <strong className={cn("block font-mono text-xs", due > 0 ? "text-rose" : "text-sage")}>
                      {formatCurrency(due, invoice.currency)}
                    </strong>
                  </span>
                </div>
                <p className="mt-3 line-clamp-4 whitespace-pre-line text-xs leading-relaxed text-slate">{preview}</p>
                <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] font-medium text-ink">
                  <Paperclip className="h-3 w-3" /> {invoice.invoice_number}.pdf
                </span>
              </div>
            </div>

            {invoice.last_emailed_at && (
              <p className="mt-3 text-xs text-slate">
                <Mail className="mr-1 inline h-3.5 w-3.5" />
                Last emailed {timeAgo(invoice.last_emailed_at)}
                {invoice.email_count && invoice.email_count > 1 ? ` · ${invoice.email_count} times in total` : ""}
              </p>
            )}
            {status && !status.configured && (
              <p className="mt-3 rounded-[10px] bg-amber/10 px-3 py-2 text-xs text-ink">
                Direct sending isn&apos;t switched on yet, so this opens your own mail app with a link to the PDF.
                An admin can turn on one-click sending in Settings → Email.
              </p>
            )}
            {invalid.length > 0 && <p className="mt-3 text-xs text-rose">Check this address: {invalid[0]}</p>}
            {error && <p className="mt-3 text-sm text-rose">{error}</p>}

            <div className="mt-5 flex items-center justify-end gap-2">
              <button type="button" onClick={onClose} className="h-11 rounded-[10px] px-4 text-sm font-medium text-slate hover:text-ink">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void onSend()}
                disabled={!canSend}
                className="inline-flex h-11 items-center gap-2 rounded-[10px] bg-gradient-to-r from-[#7c1cf0] to-[#b65cff] px-5 text-sm font-semibold text-white shadow-[0_8px_20px_-6px_rgba(124,28,240,0.55)] transition-all hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-50"
              >
                {busy ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {busy ? "Preparing PDF…" : status && !status.configured ? "Open in mail app" : "Send email"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  );
}
