import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Round to 2 decimal places using banker's-safe fixed-point approach */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

let defaultCurrency = "AED";

/** Set once the organization loads, so screens format in the org's currency. */
export function setDefaultCurrency(currency: string | null | undefined) {
  defaultCurrency = currency || "AED";
}

export function getDefaultCurrency(): string {
  return defaultCurrency;
}

/**
 * Format money in the organization currency, or an explicit one (documents
 * issued before the VAT switch are stamped INR and must keep showing rupees).
 */
export function formatCurrency(amount: number, currency: string | null | undefined = defaultCurrency): string {
  const code = currency || defaultCurrency;
  try {
    return new Intl.NumberFormat(code === "INR" ? "en-IN" : "en-AE", {
      style: "currency",
      currency: code,
    }).format(amount);
  } catch {
    return `${code} ${amount.toFixed(2)}`;
  }
}

export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function generateSku(name: string, packSize: string, variant?: string | null): string {
  const base = name
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.slice(0, 3).toUpperCase())
    .join("")
    .slice(0, 9);
  const pack = packSize.replace(/\s+/g, "").toUpperCase();
  const varPart = variant
    ? "-" + variant.replace(/[^a-zA-Z0-9]/g, "").slice(0, 4).toUpperCase()
    : "";
  const suffix = Date.now().toString(36).slice(-3).toUpperCase();
  return `${base}${varPart}-${pack}-${suffix}`;
}

export function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    let s = v == null ? "" : String(v);
    // A customer or product name like "=HYPERLINK(...)" must not run as a formula in Excel
    if (typeof v === "string" && /^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) {
      s = `'${s}`;
    }
    if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const csv = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Indian financial year label e.g. 2026-27 */
export function getFinancialYear(date = new Date()): string {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  if (m >= 4) return `${y}-${String(y + 1).slice(-2)}`;
  return `${y - 1}-${String(y).slice(-2)}`;
}
