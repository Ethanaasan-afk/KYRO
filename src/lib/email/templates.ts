/**
 * Invoice email copy. Templates are plain text with {placeholders}; the HTML
 * email is built from the same text so what the shop previews is what is sent.
 */

import { APP_NAME } from "@/lib/brand";

export type EmailKind = "invoice" | "reminder";

export type EmailVars = {
  customer: string;
  invoice_number: string;
  date: string;
  amount: string;
  amount_due: string;
  company: string;
  link: string;
};

export const EMAIL_PLACEHOLDERS: { key: keyof EmailVars; label: string }[] = [
  { key: "customer", label: "Customer name" },
  { key: "invoice_number", label: "Invoice number" },
  { key: "date", label: "Invoice date" },
  { key: "amount", label: "Invoice total" },
  { key: "amount_due", label: "Balance due" },
  { key: "company", label: "Your business name" },
  { key: "link", label: "PDF link" },
];

export const DEFAULT_TEMPLATES: Record<EmailKind, { subject: string; body: string }> = {
  invoice: {
    subject: "Tax invoice {invoice_number} from {company}",
    body: [
      "Hi {customer},",
      "",
      "Please find attached tax invoice {invoice_number} dated {date} for {amount}.",
      "",
      "You can also view and download it here: {link}",
      "",
      "Thank you for your business!",
      "{company}",
    ].join("\n"),
  },
  reminder: {
    subject: "Payment reminder: {invoice_number} ({amount_due} due)",
    body: [
      "Hi {customer},",
      "",
      "A friendly reminder that {amount_due} is still due on invoice {invoice_number} dated {date}.",
      "",
      "The invoice is attached for your reference, and you can view it here: {link}",
      "",
      "If you have already paid, please ignore this message. Thank you!",
      "{company}",
    ].join("\n"),
  },
};

export function fillTemplate(template: string, vars: Partial<EmailVars>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = vars[key as keyof EmailVars];
    if (key === "link" && !value) return "(PDF attached)";
    return value != null && value !== "" ? String(value) : match;
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Text → safe HTML paragraphs, with URLs turned into links. */
function textToHtml(text: string): string {
  return escapeHtml(text)
    .split(/\n{2,}/)
    .map((para) =>
      `<p style="margin:0 0 14px;line-height:1.6">${para
        .replace(/\n/g, "<br>")
        .replace(
          /(https?:\/\/[^\s<]+)/g,
          '<a href="$1" style="color:#7c1cf0;text-decoration:underline">$1</a>'
        )}</p>`
    )
    .join("");
}

/** Branded, client-safe HTML email (tables + inline styles for Outlook/Gmail). */
export function renderInvoiceEmailHtml(input: {
  kind: EmailKind;
  message: string;
  company: string;
  invoiceNumber: string;
  date: string;
  total: string;
  due: string;
  link?: string | null;
}): string {
  const accent = input.kind === "reminder" ? "#f59e0b" : "#7c1cf0";
  const label = input.kind === "reminder" ? "Payment reminder" : "Tax invoice";
  const button = input.link
    ? `<tr><td style="padding:6px 32px 28px"><a href="${escapeHtml(input.link)}" style="display:inline-block;background:${accent};color:#ffffff;font-weight:600;font-size:15px;text-decoration:none;padding:13px 22px;border-radius:12px">View &amp; download PDF</a></td></tr>`
    : "";
  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(label)} ${escapeHtml(input.invoiceNumber)}</title></head>
<body style="margin:0;background:#f4f2fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1d1530">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f2fa;padding:28px 12px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e9e4f5">
<tr><td style="height:6px;background:${accent}"></td></tr>
<tr><td style="padding:26px 32px 6px">
<div style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:${accent};font-weight:700">${escapeHtml(label)}</div>
<div style="font-size:22px;font-weight:800;margin-top:6px">${escapeHtml(input.company)}</div>
</td></tr>
<tr><td style="padding:16px 32px 4px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8f6fd;border-radius:14px">
<tr>
<td style="padding:14px 16px;font-size:12px;color:#6b6385">Invoice<br><strong style="font-size:15px;color:#1d1530">${escapeHtml(input.invoiceNumber)}</strong></td>
<td style="padding:14px 16px;font-size:12px;color:#6b6385">Date<br><strong style="font-size:15px;color:#1d1530">${escapeHtml(input.date)}</strong></td>
<td style="padding:14px 16px;font-size:12px;color:#6b6385;text-align:right">${input.kind === "reminder" ? "Balance due" : "Total"}<br><strong style="font-size:17px;color:${accent}">${escapeHtml(input.kind === "reminder" ? input.due : input.total)}</strong></td>
</tr></table>
</td></tr>
<tr><td style="padding:22px 32px 6px;font-size:15px;color:#2b2340">${textToHtml(input.message)}</td></tr>
${button}
<tr><td style="padding:16px 32px 24px;border-top:1px solid #f0edf7;font-size:12px;color:#8a83a3">The PDF tax invoice is attached to this email. Reply to this email to reach ${escapeHtml(input.company)} directly.<br><span style="color:#b3adc8">Sent with ${APP_NAME}</span></td></tr>
</table>
</td></tr></table>
</body></html>`;
}

/** Comma / semicolon / space separated list → unique, trimmed addresses. */
export function parseEmailList(raw: string | null | undefined): string[] {
  return Array.from(
    new Set(
      (raw ?? "")
        .split(/[\s,;]+/)
        .map((s) => s.trim())
        .filter(Boolean)
    )
  );
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}
