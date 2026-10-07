/** WhatsApp deep-link helpers for bill share & payment reminders */

import { formatCurrency } from "@/lib/utils";

/** Local UAE numbers (05x xxx xxxx / 5x xxx xxxx) get the +971 country code. */
export function normalizeWhatsAppPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("00")) return digits.slice(2);
  if (digits.startsWith("05") && digits.length === 10) return `971${digits.slice(1)}`;
  if (digits.startsWith("5") && digits.length === 9) return `971${digits}`;
  return digits;
}

/** Opens chat with a specific number. Returns null if phone is missing. */
export function whatsappUrl(phone: string | null | undefined, text: string): string | null {
  const n = normalizeWhatsAppPhone(phone);
  if (!n) return null;
  return `https://wa.me/${n}?text=${encodeURIComponent(text)}`;
}

/**
 * Prefer customer phone when present; otherwise general share chooser
 * (`https://wa.me/?text=...`).
 */
export function whatsappShareUrl(phone: string | null | undefined, text: string): string {
  const n = normalizeWhatsAppPhone(phone);
  if (n) return `https://wa.me/${n}?text=${encodeURIComponent(text)}`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function invoiceShareMessage(input: {
  companyName: string;
  invoiceNumber: string;
  amount: number;
  currency?: string | null;
  customerName: string;
  pdfUrl?: string | null;
}): string {
  const lines = [
    `Hi ${input.customerName} 👋`,
    ``,
    `Your tax invoice from *${input.companyName}* is ready.`,
    ``,
    `🧾 Invoice No: *${input.invoiceNumber}*`,
    `💰 Amount Due: *${formatCurrency(input.amount, input.currency)}*`,
  ];
  if (input.pdfUrl) {
    lines.push(``, `📄 Download: ${input.pdfUrl}`);
  }
  lines.push(``, `Thank you for your business! 🙏`);
  return lines.join("\n");
}

export function paymentReminderMessage(input: {
  companyName: string;
  invoiceNumber: string;
  amount: number;
  currency?: string | null;
  customerName: string;
  invoiceDate: string;
}): string {
  return [
    `Hello ${input.customerName},`,
    ``,
    `Friendly reminder from *${input.companyName}*:`,
    `Invoice *${input.invoiceNumber}* dated ${input.invoiceDate} for ${formatCurrency(input.amount, input.currency)} is still unpaid.`,
    ``,
    `Please ignore if already paid. Thank you.`,
  ].join("\n");
}

export function outstandingReminderMessage(input: {
  companyName: string;
  customerName: string;
  amount: number;
}): string {
  return [
    `Hi ${input.customerName},`,
    ``,
    `Your outstanding balance with *${input.companyName}* is ${formatCurrency(input.amount)}.`,
    `Please clear it at your convenience.`,
    ``,
    `Thank you!`,
  ].join("\n");
}
