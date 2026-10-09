import { roundTo } from "./utils";

export type VatCategory = "standard" | "zero" | "exempt";

export const VAT_CATEGORIES: VatCategory[] = ["standard", "zero", "exempt"];

export const VAT_CATEGORY_LABELS: Record<VatCategory, string> = {
  standard: "Standard rated",
  zero: "Zero-rated",
  exempt: "Exempt",
};

/**
 * How a whole invoice is taxed.
 *  - domestic        normal sale: each line carries its own rate
 *  - reverse_charge  business customer in another EU country (or similar):
 *                    no tax charged, the customer accounts for it
 *  - export          goods / services leaving the country: zero-rated
 */
export type TaxTreatment = "domestic" | "reverse_charge" | "export";

export const TAX_TREATMENTS: TaxTreatment[] = ["domestic", "reverse_charge", "export"];

/**
 * How the tax on a line is shown.
 *  - single     one VAT amount (VAT countries)
 *  - cgst_sgst  India, sale inside the seller's state: half CGST, half SGST
 *  - igst       India, sale to another state (or export): all IGST
 */
export type TaxSplit = "single" | "cgst_sgst" | "igst";

export interface LineInput {
  quantity: number;
  unitPrice: number;
  vatRate: number;
  vatCategory?: VatCategory;
}

export interface CalcOptions {
  /** When true, unitPrice already includes tax and is split back out. */
  pricesIncludeVat?: boolean;
  /** Currency minor digits: 2 (AED, INR, EUR) or 3 (BHD, OMR, KWD). Default 2. */
  decimals?: number;
  split?: TaxSplit;
  treatment?: TaxTreatment;
  /** Country without sales tax (Qatar, Kuwait): every line is 0% */
  taxFree?: boolean;
}

export interface TaxParts {
  cgst: number;
  sgst: number;
  igst: number;
}

export interface LineVatResult extends Partial<TaxParts> {
  taxableValue: number;
  vatRate: number;
  vatAmount: number;
  vatCategory: VatCategory;
  lineTotal: number;
}

export interface VatBreakdownRow extends TaxParts {
  vatCategory: VatCategory;
  vatRate: number;
  taxableValue: number;
  vatAmount: number;
}

export interface InvoiceTotals {
  subtotal: number;
  totalVat: number;
  /** Always 0: documents keep fils / paise precision, no whole-currency rounding. */
  roundOff: number;
  grandTotal: number;
  lines: LineVatResult[];
  breakdown: VatBreakdownRow[];
}

export function normalizeVatCategory(value: unknown, rate?: number): VatCategory {
  if (value === "standard" || value === "zero" || value === "exempt") return value;
  return rate && rate > 0 ? "standard" : "zero";
}

export function normalizeTaxTreatment(value: unknown): TaxTreatment {
  return value === "reverse_charge" || value === "export" ? value : "domestic";
}

export function normalizeTaxSplit(value: unknown): TaxSplit {
  return value === "cgst_sgst" || value === "igst" ? value : "single";
}

/** Zero-rated and exempt supplies never carry VAT, whatever rate was stored. */
export function effectiveVatRate(rate: number, category: VatCategory): number {
  return category === "standard" ? Math.max(0, rate) : 0;
}

/**
 * Split one line's tax into CGST / SGST / IGST. CGST takes the rounded half,
 * SGST the rest, so the two always add up to the line's tax.
 */
export function splitTax(vatAmount: number, split: TaxSplit, decimals = 2): TaxParts {
  if (split === "cgst_sgst") {
    const cgst = roundTo(vatAmount / 2, decimals);
    return { cgst, sgst: roundTo(vatAmount - cgst, decimals), igst: 0 };
  }
  if (split === "igst") return { cgst: 0, sgst: 0, igst: vatAmount };
  return { cgst: 0, sgst: 0, igst: 0 };
}

/**
 * Tax for one line. Amounts are rounded per line to the currency's minor
 * unit (fils, halalas, paise; 3 digits for dinars and rials); totals are the
 * sum of rounded lines so the invoice adds up.
 */
export function calcLineVat(line: LineInput, opts: CalcOptions = {}): LineVatResult {
  const decimals = opts.decimals ?? 2;
  const split = opts.split ?? "single";
  const round = (n: number) => roundTo(n, decimals);
  const treatment = opts.treatment ?? "domestic";

  let vatCategory = normalizeVatCategory(line.vatCategory, line.vatRate);
  // Exports are zero-rated whatever the product normally carries
  if (treatment === "export" && vatCategory === "standard") vatCategory = "zero";
  const noTax = opts.taxFree || treatment !== "domestic";
  const vatRate = noTax ? 0 : effectiveVatRate(line.vatRate, vatCategory);
  const gross = round(line.quantity * line.unitPrice);

  let taxableValue: number;
  let vatAmount: number;
  let lineTotal: number;

  if (opts.pricesIncludeVat) {
    taxableValue = round(gross / (1 + vatRate / 100));
    vatAmount = round(gross - taxableValue);
    lineTotal = gross;
  } else {
    taxableValue = gross;
    // India: CGST and SGST are each rounded, so the two halves are always equal
    vatAmount =
      split === "cgst_sgst"
        ? round(round((gross * vatRate) / 200) * 2)
        : round((gross * vatRate) / 100);
    lineTotal = round(gross + vatAmount);
  }

  const result: LineVatResult = { taxableValue, vatRate, vatAmount, vatCategory, lineTotal };
  if (split !== "single") Object.assign(result, splitTax(vatAmount, split, decimals));
  return result;
}

/** Group lines by category + rate, as printed on a tax invoice and the tax return. */
export function buildVatBreakdown(
  lines: LineVatResult[],
  opts: { split?: TaxSplit; decimals?: number } = {}
): VatBreakdownRow[] {
  const decimals = opts.decimals ?? 2;
  const split = opts.split ?? "single";
  const round = (n: number) => roundTo(n, decimals);
  const map = new Map<string, VatBreakdownRow>();
  for (const l of lines) {
    const key = `${l.vatCategory}:${l.vatRate}`;
    const row = map.get(key) ?? {
      vatCategory: l.vatCategory,
      vatRate: l.vatRate,
      taxableValue: 0,
      vatAmount: 0,
      cgst: 0,
      sgst: 0,
      igst: 0,
    };
    const parts =
      l.cgst !== undefined || l.igst !== undefined
        ? { cgst: l.cgst ?? 0, sgst: l.sgst ?? 0, igst: l.igst ?? 0 }
        : splitTax(l.vatAmount, split, decimals);
    row.taxableValue = round(row.taxableValue + l.taxableValue);
    row.vatAmount = round(row.vatAmount + l.vatAmount);
    row.cgst = round(row.cgst + parts.cgst);
    row.sgst = round(row.sgst + parts.sgst);
    row.igst = round(row.igst + parts.igst);
    map.set(key, row);
  }
  return Array.from(map.values()).sort(
    (a, b) =>
      VAT_CATEGORIES.indexOf(a.vatCategory) - VAT_CATEGORIES.indexOf(b.vatCategory) ||
      b.vatRate - a.vatRate
  );
}

export function calcInvoiceTotals(lines: LineInput[], opts: CalcOptions = {}): InvoiceTotals {
  const decimals = opts.decimals ?? 2;
  const round = (n: number) => roundTo(n, decimals);
  const lineResults = lines.map((l) => calcLineVat(l, opts));

  const subtotal = round(lineResults.reduce((s, l) => s + l.taxableValue, 0));
  const totalVat = round(lineResults.reduce((s, l) => s + l.vatAmount, 0));
  const grandTotal = round(subtotal + totalVat);

  return {
    subtotal,
    totalVat,
    roundOff: 0,
    grandTotal,
    lines: lineResults,
    breakdown: buildVatBreakdown(lineResults, { split: opts.split, decimals }),
  };
}
