/** Major / most-traded world currencies for reference pricing (base = AED). */

export type CurrencyInfo = {
  code: string;
  name: string;
  /** Highlight as globally most used */
  mostUsed?: boolean;
};

/** Ordered: most-used first, then other major & regionally useful codes */
export const WORLD_CURRENCIES: CurrencyInfo[] = [
  { code: "USD", name: "US Dollar", mostUsed: true },
  { code: "EUR", name: "Euro" },
  { code: "GBP", name: "British Pound" },
  { code: "JPY", name: "Japanese Yen" },
  { code: "CNY", name: "Chinese Yuan" },
  { code: "INR", name: "Indian Rupee" },
  { code: "SAR", name: "Saudi Riyal" },
  { code: "AUD", name: "Australian Dollar" },
  { code: "CAD", name: "Canadian Dollar" },
  { code: "CHF", name: "Swiss Franc" },
  { code: "SGD", name: "Singapore Dollar" },
  { code: "HKD", name: "Hong Kong Dollar" },
  { code: "MYR", name: "Malaysian Ringgit" },
  { code: "THB", name: "Thai Baht" },
  { code: "IDR", name: "Indonesian Rupiah" },
  { code: "KRW", name: "South Korean Won" },
  { code: "NZD", name: "New Zealand Dollar" },
  { code: "ZAR", name: "South African Rand" },
  { code: "BRL", name: "Brazilian Real" },
  { code: "MXN", name: "Mexican Peso" },
  { code: "TRY", name: "Turkish Lira" },
  { code: "RUB", name: "Russian Ruble" },
];

export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-AE", {
      style: "currency",
      currency,
      minimumFractionDigits: currency === "JPY" || currency === "KRW" || currency === "IDR" ? 0 : 2,
      maximumFractionDigits: currency === "JPY" || currency === "KRW" || currency === "IDR" ? 0 : 4,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

/** Fallback rates: foreign units per 1 AED (approx Jul 2026) */
export const FALLBACK_RATES: Record<string, number> = {
  USD: 0.2724,
  EUR: 0.2395,
  GBP: 0.2045,
  JPY: 44.63,
  CNY: 1.847,
  INR: 26.32,
  SAR: 1.021,
  AUD: 0.3895,
  CAD: 0.3842,
  CHF: 0.2226,
  SGD: 0.3526,
  HKD: 2.137,
  MYR: 1.116,
  THB: 9.184,
  IDR: 4882,
  KRW: 398.2,
  NZD: 0.4711,
  ZAR: 4.579,
  BRL: 1.384,
  MXN: 4.763,
  TRY: 12.89,
  RUB: 21.32,
};
