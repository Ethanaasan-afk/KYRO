"use client";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useOrganization, useUpdateOrganization } from "@/hooks/use-company";
import { useEmailStatus } from "@/hooks/use-invoice-email";
import { DEFAULT_TEMPLATES, EMAIL_PLACEHOLDERS } from "@/lib/email/templates";
import { cn } from "@/lib/utils";
import { CheckCircle2, Mail, PlugZap } from "lucide-react";
import { useEffect, useState } from "react";

/** Email sending status + the default message every invoice email starts from. */
export function EmailSettingsSection() {
  const { data: org } = useOrganization();
  const { data: status, isLoading } = useEmailStatus();
  const update = useUpdateOrganization();
  const { toast } = useToast();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [bcc, setBcc] = useState(false);

  useEffect(() => {
    if (!org) return;
    setSubject(org.email_subject_template || DEFAULT_TEMPLATES.invoice.subject);
    setBody(org.email_body_template || DEFAULT_TEMPLATES.invoice.body);
    setBcc(!!org.email_bcc_self);
  }, [org]);

  const dirty =
    !!org &&
    (subject !== (org.email_subject_template || DEFAULT_TEMPLATES.invoice.subject) ||
      body !== (org.email_body_template || DEFAULT_TEMPLATES.invoice.body) ||
      bcc !== !!org.email_bcc_self);

  const save = () => {
    if (!org) return;
    update.mutate(
      {
        id: org.id,
        email_subject_template: subject === DEFAULT_TEMPLATES.invoice.subject ? null : subject,
        email_body_template: body === DEFAULT_TEMPLATES.invoice.body ? null : body,
        email_bcc_self: bcc,
      },
      {
        onSuccess: () => toast("Email settings saved"),
        onError: (e) =>
          toast(
            /column|schema cache/i.test((e as Error).message)
              ? "Email templates need the latest database update (migration 038)."
              : (e as Error).message,
            "error"
          ),
      }
    );
  };

  const insert = (key: string) => setBody((b) => `${b}{${key}}`);

  return (
    <section id="email" className="panel mt-6 max-w-2xl scroll-mt-24 space-y-5 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-display text-sm font-semibold text-ink">
            <Mail className="h-4 w-4 text-primary" /> Email invoices
          </h2>
          <p className="mt-1 text-sm text-slate">
            Customers get a branded email with the PDF attached and a secure download link. Replies come straight to{" "}
            <strong className="text-ink">{org?.email || "your business email"}</strong>.
          </p>
        </div>
      </div>

      <div
        className={cn(
          "flex items-start gap-3 rounded-[12px] border p-3.5 text-sm",
          status?.configured ? "border-sage/40 bg-sage-soft" : "border-amber/40 bg-amber/10"
        )}
      >
        {status?.configured ? (
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-sage" />
        ) : (
          <PlugZap className="mt-0.5 h-4 w-4 shrink-0 text-[#b45309]" />
        )}
        <div className="min-w-0 text-ink">
          {isLoading ? (
            "Checking email sending…"
          ) : status?.configured ? (
            <>
              <strong>One-click sending is on.</strong> Emails go out from{" "}
              <span className="font-mono text-xs">{status.fromAddress}</span> with your business name.
            </>
          ) : (
            <>
              <strong>Using your mail app for now.</strong> Each email opens ready-to-send in your own mail app with a PDF
              link. For one-click and bulk sending, your administrator adds <code className="rounded bg-surface px-1 text-xs">RESEND_API_KEY</code>{" "}
              and <code className="rounded bg-surface px-1 text-xs">EMAIL_FROM</code> to the server settings.
            </>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label className="field-label" htmlFor="tpl-subject">Default subject</label>
          <input
            id="tpl-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="mt-1.5 h-11 w-full rounded-[10px] border border-border bg-surface px-3 text-sm text-ink outline-none focus:border-primary focus:ring-4 focus:ring-primary/15"
          />
        </div>
        <div>
          <label className="field-label" htmlFor="tpl-body">Default message</label>
          <textarea
            id="tpl-body"
            rows={8}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="mt-1.5 w-full rounded-[10px] border border-border bg-surface px-3 py-2.5 text-sm leading-relaxed text-ink outline-none focus:border-primary focus:ring-4 focus:ring-primary/15"
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {EMAIL_PLACEHOLDERS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => insert(p.key)}
                title={`Insert ${p.label}`}
                className="rounded-full border border-border bg-cloud px-2.5 py-1 font-mono text-[11px] text-slate transition-colors hover:border-primary/40 hover:text-primary"
              >
                {`{${p.key}}`}
              </button>
            ))}
          </div>
        </div>
        <label className="flex cursor-pointer items-start gap-3 text-sm">
          <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[var(--primary)]" checked={bcc} onChange={(e) => setBcc(e.target.checked)} />
          <span>
            <span className="font-medium text-ink">Send me a copy</span>
            <span className="block text-xs text-slate">Blind-copies every invoice email to your business email.</span>
          </span>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" onClick={save} loading={update.isPending} disabled={!dirty}>
          Save email settings
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setSubject(DEFAULT_TEMPLATES.invoice.subject);
            setBody(DEFAULT_TEMPLATES.invoice.body);
          }}
        >
          Reset to default wording
        </Button>
      </div>
    </section>
  );
}
