import { round2 } from "./utils";

export type VatCategory = "standard" | "zero" | "exempt";

export const VAT_CATEGORIES: VatCategory[] = ["standard", "zero", "exempt"];

export const VAT_CATEGORY_LABELS: Record<VatCategory, string> = {
  standard: "Standard rated",
  zero: "Zero-rated",
  exempt: "Exempt",
};

export interface LineInput {
  quantity: number;
  unitPrice: number;
  vatRate: number;
  vatCategory?: VatCategory;
}

export interface CalcOptions {
  /** When true, unitPrice already includes VAT and is split back out. */
  pricesIncludeVat?: boolean;
}

export interface LineVatResult {
  taxableValue: number;
  vatRate: number;
  vatAmount: number;
  vatCategory: VatCategory;
  lineTotal: number;
}

export interface VatBreakdownRow {
  vatCategory: VatCategory;
  vatRate: number;
  taxableValue: number;
  vatAmount: number;
}

export interface InvoiceTotals {
  subtotal: number;
  totalVat: number;
  /** Always 0 for VAT invoices; kept so stored documents keep one shape. */
  roundOff: number;
  grandTotal: number;
  lines: LineVatResult[];
  breakdown: VatBreakdownRow[];
}

export function normalizeVatCategory(value: unknown, rate?: number): VatCategory {
  if (value === "standard" || value === "zero" || value === "exempt") return value;
  return rate && rate > 0 ? "standard" : "zero";
}

/** Zero-rated and exempt supplies never carry VAT, whatever rate was stored. */
export function effectiveVatRate(rate: number, category: VatCategory): number {
  return category === "standard" ? Math.max(0, rate) : 0;
}

/**
 * VAT for one line. Amounts are rounded per line to 2 decimals, which the
 * UAE FTA accepts; totals are the sum of rounded lines so the invoice adds up.
 */
export function calcLineVat(line: LineInput, opts: CalcOptions = {}): LineVatResult {
  const vatCategory = normalizeVatCategory(line.vatCategory, line.vatRate);
  const vatRate = effectiveVatRate(line.vatRate, vatCategory);
  const gross = round2(line.quantity * line.unitPrice);

  if (opts.pricesIncludeVat) {
    const taxableValue = round2(gross / (1 + vatRate / 100));
    const vatAmount = round2(gross - taxableValue);
    return { taxableValue, vatRate, vatAmount, vatCategory, lineTotal: gross };
  }

  const vatAmount = round2(gross * (vatRate / 100));
  return {
    taxableValue: gross,
    vatRate,
    vatAmount,
    vatCategory,
    lineTotal: round2(gross + vatAmount),
  };
}

/** Group lines by category + rate, as printed on a tax invoice and the VAT return. */
export function buildVatBreakdown(lines: LineVatResult[]): VatBreakdownRow[] {
  const map = new Map<string, VatBreakdownRow>();
  for (const l of lines) {
    const key = `${l.vatCategory}:${l.vatRate}`;
    const row = map.get(key) ?? {
      vatCategory: l.vatCategory,
      vatRate: l.vatRate,
      taxableValue: 0,
      vatAmount: 0,
    };
    row.taxableValue = round2(row.taxableValue + l.taxableValue);
    row.vatAmount = round2(row.vatAmount + l.vatAmount);
    map.set(key, row);
  }
  return Array.from(map.values()).sort(
    (a, b) =>
      VAT_CATEGORIES.indexOf(a.vatCategory) - VAT_CATEGORIES.indexOf(b.vatCategory) ||
      b.vatRate - a.vatRate
  );
}

export function calcInvoiceTotals(lines: LineInput[], opts: CalcOptions = {}): InvoiceTotals {
  const lineResults = lines.map((l) => calcLineVat(l, opts));

  const subtotal = round2(lineResults.reduce((s, l) => s + l.taxableValue, 0));
  const totalVat = round2(lineResults.reduce((s, l) => s + l.vatAmount, 0));
  const grandTotal = round2(subtotal + totalVat);

  return {
    subtotal,
    totalVat,
    roundOff: 0,
    grandTotal,
    lines: lineResults,
    breakdown: buildVatBreakdown(lineResults),
  };
}
