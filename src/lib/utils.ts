import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Round to 2 decimal places using banker's-safe fixed-point approach */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Round to `decimals` places (2 for most currencies, 3 for BHD / OMR / KWD). */
export function roundTo(n: number, decimals = 2): number {
  const f = 10 ** decimals;
  return Math.round((n + Number.EPSILON) * f) / f;
}

/**
 * Round an amount of any currency: 3 places keeps dinar / rial fils exact and
 * changes nothing for 2-decimal currencies (it only clears float noise).
 */
export function roundMoney(n: number): number {
  return roundTo(n, 3);
}

const decimalsCache = new Map<string, number>();

/** Minor-unit digits of an ISO currency (AED 2, BHD 3, JPY 0). */
export function currencyDecimals(currency: string | null | undefined): number {
  const code = (currency || defaultCurrency).toUpperCase();
  const cached = decimalsCache.get(code);
  if (cached !== undefined) return cached;
  let digits = 2;
  try {
    digits = new Intl.NumberFormat("en", { style: "currency", currency: code }).resolvedOptions()
      .maximumFractionDigits ?? 2;
  } catch {
    digits = 2;
  }
  decimalsCache.set(code, digits);
  return digits;
}

/** Number locale that prints the currency the way its users expect. */
export function currencyLocale(currency: string): string {
  switch (currency) {
    case "INR":
      return "en-IN";
    case "GBP":
      return "en-GB";
    case "EUR":
      return "en-IE";
    default:
      return "en-AE";
  }
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
    return new Intl.NumberFormat(currencyLocale(code), {
      style: "currency",
      currency: code,
    }).format(amount);
  } catch {
    return `${code} ${amount.toFixed(currencyDecimals(code))}`;
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
