import { roundMoney } from "@/lib/utils";
import type { InvoiceStatus } from "@/lib/constants";

/** Derive invoice status from amount paid vs grand total (non-cancelled). */
export function invoiceStatusFromPaid(
  amountPaid: number,
  grandTotal: number,
  current?: InvoiceStatus | string
): Exclude<InvoiceStatus, "cancelled"> {
  if (current === "cancelled") {
    // callers should not use this for cancelled; keep issued as safe fallback type-wise
    return "issued";
  }
  const paid = roundMoney(Math.max(0, amountPaid));
  const total = roundMoney(Math.max(0, grandTotal));
  if (total > 0 && paid >= total) return "paid";
  if (paid > 0) return "partially_paid";
  return "issued";
}

export function invoiceAmountDue(grandTotal: number, amountPaid: number): number {
  return Math.max(0, roundMoney(grandTotal - Math.max(0, amountPaid)));
}

/** Human labels for invoice statuses (never show raw ids like "partially_paid"). */
export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  issued: "Unpaid",
  paid: "Paid",
  partially_paid: "Part paid",
  cancelled: "Void",
};
