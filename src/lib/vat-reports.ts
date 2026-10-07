import { UAE_EMIRATES } from "@/lib/vat/countries";
import { normalizeVatCategory } from "@/lib/vat";
import { round2 } from "@/lib/utils";

/**
 * UAE VAT return (FTA form VAT 201) helpers.
 * Output tax: boxes 1 (standard-rated by emirate), 4 (zero-rated), 5 (exempt).
 * Input tax: box 9 (standard-rated expenses). Box 14 = net VAT payable.
 */

export interface VatReportItem {
  taxable_value: number;
  vat_amount: number;
  vat_rate: number;
  vat_category?: string | null;
  quantity?: number;
  product?: { name?: string } | null;
}

export interface VatReportDoc {
  number: string;
  date: string;
  status: string;
  currency?: string | null;
  subtotal: number;
  total_vat: number;
  grand_total: number;
  party?: { name?: string; tax_id?: string | null; state?: string | null } | null;
  items?: VatReportItem[];
}

export interface AmountVat {
  amount: number;
  vat: number;
}

export interface EmirateRow extends AmountVat {
  box: string;
  emirate: string;
}

export interface Vat201Summary {
  currency: string;
  emirates: EmirateRow[];
  zeroRated: number;
  exempt: number;
  totalOutputs: AmountVat;
  expenses: AmountVat;
  totalDue: number;
  recoverable: number;
  netPayable: number;
  /** Documents left out because they were issued in another currency (e.g. legacy INR) */
  skippedOtherCurrency: number;
  counts: { sales: number; creditNotes: number; purchases: number };
}

const EMIRATE_BOXES = ["1a", "1b", "1c", "1d", "1e", "1f", "1g"];

function num(n: unknown): number {
  return Number(n) || 0;
}

function isActive(doc: VatReportDoc): boolean {
  return doc.status !== "cancelled";
}

function sameCurrency(doc: VatReportDoc, currency: string): boolean {
  return (doc.currency || currency) === currency;
}

/** Split a document into standard / zero / exempt amounts from its lines. */
function splitDoc(doc: VatReportDoc): { standard: AmountVat; zero: number; exempt: number } {
  const out = { standard: { amount: 0, vat: 0 }, zero: 0, exempt: 0 };
  const items = doc.items ?? [];
  if (!items.length) {
    // No lines loaded: treat the whole document by whether it carried VAT
    if (num(doc.total_vat) > 0) out.standard = { amount: num(doc.subtotal), vat: num(doc.total_vat) };
    else out.zero = num(doc.subtotal);
    return out;
  }
  for (const it of items) {
    const cat = normalizeVatCategory(it.vat_category, num(it.vat_rate));
    if (cat === "exempt") out.exempt = round2(out.exempt + num(it.taxable_value));
    else if (cat === "zero") out.zero = round2(out.zero + num(it.taxable_value));
    else {
      out.standard.amount = round2(out.standard.amount + num(it.taxable_value));
      out.standard.vat = round2(out.standard.vat + num(it.vat_amount));
    }
  }
  return out;
}

function resolveEmirate(state: string | null | undefined, fallback: string): string {
  const s = (state ?? "").trim().toLowerCase();
  const hit = UAE_EMIRATES.find((e) => e.toLowerCase() === s);
  return hit ?? fallback;
}

export function buildVat201(input: {
  sales: VatReportDoc[];
  creditNotes?: VatReportDoc[];
  purchases?: VatReportDoc[];
  currency: string;
  /** Supplier's own emirate: place of supply when the customer has none */
  businessEmirate: string;
}): Vat201Summary {
  const { currency } = input;
  const fallbackEmirate = resolveEmirate(input.businessEmirate, "Dubai");
  const byEmirate = new Map<string, AmountVat>(UAE_EMIRATES.map((e) => [e, { amount: 0, vat: 0 }]));
  let zeroRated = 0;
  let exempt = 0;
  let skipped = 0;

  const apply = (docs: VatReportDoc[] | undefined, sign: 1 | -1) => {
    let used = 0;
    for (const doc of docs ?? []) {
      if (!isActive(doc)) continue;
      if (!sameCurrency(doc, currency)) {
        skipped += 1;
        continue;
      }
      used += 1;
      const split = splitDoc(doc);
      const emirate = resolveEmirate(doc.party?.state, fallbackEmirate);
      const row = byEmirate.get(emirate)!;
      row.amount = round2(row.amount + sign * split.standard.amount);
      row.vat = round2(row.vat + sign * split.standard.vat);
      zeroRated = round2(zeroRated + sign * split.zero);
      exempt = round2(exempt + sign * split.exempt);
    }
    return used;
  };

  const salesCount = apply(input.sales, 1);
  const creditCount = apply(input.creditNotes, -1);

  const expenses = { amount: 0, vat: 0 };
  let purchaseCount = 0;
  for (const doc of input.purchases ?? []) {
    if (!isActive(doc)) continue;
    if (!sameCurrency(doc, currency)) {
      skipped += 1;
      continue;
    }
    purchaseCount += 1;
    const split = splitDoc(doc);
    expenses.amount = round2(expenses.amount + split.standard.amount);
    expenses.vat = round2(expenses.vat + split.standard.vat);
  }

  const emirates: EmirateRow[] = UAE_EMIRATES.map((emirate, i) => ({
    box: EMIRATE_BOXES[i],
    emirate,
    ...byEmirate.get(emirate)!,
  }));

  const standardAmount = round2(emirates.reduce((s, r) => s + r.amount, 0));
  const totalDue = round2(emirates.reduce((s, r) => s + r.vat, 0));
  const totalOutputs = { amount: round2(standardAmount + zeroRated + exempt), vat: totalDue };

  return {
    currency,
    emirates,
    zeroRated,
    exempt,
    totalOutputs,
    expenses,
    totalDue,
    recoverable: expenses.vat,
    netPayable: round2(totalDue - expenses.vat),
    skippedOtherCurrency: skipped,
    counts: { sales: salesCount, creditNotes: creditCount, purchases: purchaseCount },
  };
}

/** Rows for the "VAT 201" sheet of the Excel export. */
export function vat201ToSheetRows(s: Vat201Summary): Record<string, string | number>[] {
  const rows: Record<string, string | number>[] = s.emirates.map((r) => ({
    Box: r.box,
    Description: `Standard rated supplies in ${r.emirate}`,
    [`Amount (${s.currency})`]: r.amount,
    [`VAT (${s.currency})`]: r.vat,
  }));
  const amountKey = `Amount (${s.currency})`;
  const vatKey = `VAT (${s.currency})`;
  rows.push(
    { Box: "4", Description: "Zero rated supplies", [amountKey]: s.zeroRated, [vatKey]: 0 },
    { Box: "5", Description: "Exempt supplies", [amountKey]: s.exempt, [vatKey]: 0 },
    { Box: "8", Description: "Totals (outputs)", [amountKey]: s.totalOutputs.amount, [vatKey]: s.totalOutputs.vat },
    { Box: "9", Description: "Standard rated expenses", [amountKey]: s.expenses.amount, [vatKey]: s.expenses.vat },
    { Box: "12", Description: "Total value of due tax for the period", [amountKey]: "", [vatKey]: s.totalDue },
    { Box: "13", Description: "Total value of recoverable tax for the period", [amountKey]: "", [vatKey]: s.recoverable },
    { Box: "14", Description: "Payable tax for the period", [amountKey]: "", [vatKey]: s.netPayable }
  );
  return rows;
}

/** Line-by-line register (sales or purchases) for the accountant. */
export function registerRows(docs: VatReportDoc[], currency: string): Record<string, string | number>[] {
  return docs
    .filter((d) => isActive(d) && sameCurrency(d, currency))
    .map((d) => {
      const split = splitDoc(d);
      return {
        "Document No.": d.number,
        Date: d.date,
        Party: d.party?.name ?? "",
        TRN: d.party?.tax_id?.trim() ?? "",
        Emirate: d.party?.state ?? "",
        "Standard rated": split.standard.amount,
        "Zero rated": split.zero,
        Exempt: split.exempt,
        VAT: round2(num(d.total_vat)),
        Total: round2(num(d.grand_total)),
      };
    });
}

/** First and last day of the month containing `date` (local). */
export function vatPeriodMonthBounds(date = new Date()): { from: string; to: string } {
  const y = date.getFullYear();
  const m = date.getMonth();
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { from: iso(new Date(y, m, 1)), to: iso(new Date(y, m + 1, 0)) };
}
