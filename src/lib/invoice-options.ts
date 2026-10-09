import type { NumberingPeriod } from "@/lib/types";

/** The period part of a document number: "2026" or "2026-27". Mirrors the database. */
export function numberingPeriodLabel(period: NumberingPeriod, date = new Date()): string {
  const y = date.getFullYear();
  if (period === "calendar") return String(y);
  const start = date.getMonth() >= 3 ? y : y - 1;
  return `${start}-${String(start + 1).slice(-2)}`;
}

/** What the first invoice of a series looks like, e.g. KY/2026/0001. */
export function documentNumberPreview(prefix: string, period: NumberingPeriod, date = new Date()): string {
  return `${prefix || "KY"}/${numberingPeriodLabel(period, date)}/0001`;
}

/** Payment links must be plain https URLs (no javascript:, data: or http). */
export function isSafePaymentUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" && Boolean(url.hostname) && url.hostname.includes(".") && value.length <= 500;
  } catch {
    return false;
  }
}
