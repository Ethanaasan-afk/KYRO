import { getCountryConfig, UAE_EMIRATES, type CountryVatConfig } from "@/lib/vat/countries";
import { normalizeTaxSplit, normalizeTaxTreatment, normalizeVatCategory, splitTax, type TaxSplit } from "@/lib/vat";
import { currencyDecimals, roundMoney } from "@/lib/utils";

/**
 * Tax return helpers. Every country gets a summary laid out like its own
 * return so the numbers can be copied box by box:
 *  - UAE      FTA VAT 201 (sales by emirate)
 *  - Saudi    ZATCA VAT return
 *  - UK       HMRC 9-box VAT return
 *  - India    GSTR-3B (IGST / CGST / SGST)
 *  - others   output VAT by rate, input VAT, net payable
 *  - Qatar / Kuwait (no VAT) a plain sales and purchases summary
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
  /** domestic | reverse_charge | export (missing = domestic) */
  tax_treatment?: string | null;
  /** India: cgst_sgst | igst */
  tax_split?: string | null;
  party?: { name?: string; tax_id?: string | null; state?: string | null; country?: string | null } | null;
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

interface DocSplit {
  standard: AmountVat;
  zero: number;
  exempt: number;
  /** Exports (zero-rated by treatment) */
  exports: number;
  /** Reverse-charged supplies to businesses abroad */
  reverse: number;
  /** Standard-rated amounts and tax per rate */
  byRate: Map<number, AmountVat>;
}

/** Split a document into standard / zero / exempt / export / reverse-charge amounts. */
function splitDoc(doc: VatReportDoc): DocSplit {
  const out: DocSplit = {
    standard: { amount: 0, vat: 0 },
    zero: 0,
    exempt: 0,
    exports: 0,
    reverse: 0,
    byRate: new Map(),
  };
  const treatment = normalizeTaxTreatment(doc.tax_treatment);
  if (treatment !== "domestic") {
    const base = num(doc.subtotal);
    if (treatment === "export") out.exports = base;
    else out.reverse = base;
    return out;
  }
  const items = doc.items ?? [];
  if (!items.length) {
    // No lines loaded: treat the whole document by whether it carried VAT
    if (num(doc.total_vat) > 0) {
      out.standard = { amount: num(doc.subtotal), vat: num(doc.total_vat) };
    } else out.zero = num(doc.subtotal);
    return out;
  }
  for (const it of items) {
    const cat = normalizeVatCategory(it.vat_category, num(it.vat_rate));
    if (cat === "exempt") out.exempt = roundMoney(out.exempt + num(it.taxable_value));
    else if (cat === "zero" || num(it.vat_rate) === 0) out.zero = roundMoney(out.zero + num(it.taxable_value));
    else {
      out.standard.amount = roundMoney(out.standard.amount + num(it.taxable_value));
      out.standard.vat = roundMoney(out.standard.vat + num(it.vat_amount));
      const rate = num(it.vat_rate);
      const row = out.byRate.get(rate) ?? { amount: 0, vat: 0 };
      row.amount = roundMoney(row.amount + num(it.taxable_value));
      row.vat = roundMoney(row.vat + num(it.vat_amount));
      out.byRate.set(rate, row);
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
      row.amount = roundMoney(row.amount + sign * split.standard.amount);
      row.vat = roundMoney(row.vat + sign * split.standard.vat);
      // Exports and supplies reverse-charged to the customer are reported as zero-rated (box 4)
      zeroRated = roundMoney(zeroRated + sign * (split.zero + split.exports + split.reverse));
      exempt = roundMoney(exempt + sign * split.exempt);
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
    expenses.amount = roundMoney(expenses.amount + split.standard.amount);
    expenses.vat = roundMoney(expenses.vat + split.standard.vat);
  }

  const emirates: EmirateRow[] = UAE_EMIRATES.map((emirate, i) => ({
    box: EMIRATE_BOXES[i],
    emirate,
    ...byEmirate.get(emirate)!,
  }));

  const standardAmount = roundMoney(emirates.reduce((s, r) => s + r.amount, 0));
  const totalDue = roundMoney(emirates.reduce((s, r) => s + r.vat, 0));
  const totalOutputs = { amount: roundMoney(standardAmount + zeroRated + exempt), vat: totalDue };

  return {
    currency,
    emirates,
    zeroRated,
    exempt,
    totalOutputs,
    expenses,
    totalDue,
    recoverable: expenses.vat,
    netPayable: roundMoney(totalDue - expenses.vat),
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

// ---------------------------------------------------------------------------
// Every other country
// ---------------------------------------------------------------------------

export interface GstParts {
  igst: number;
  cgst: number;
  sgst: number;
}

export interface ReturnRow {
  box: string;
  description: string;
  /** null = not applicable for this line */
  amount: number | null;
  tax: number | null;
  /** India: tax by head */
  gst?: GstParts;
  /** Bold total line */
  total?: boolean;
}

export interface TaxReturnSummary {
  country: CountryVatConfig;
  currency: string;
  title: string;
  rows: ReturnRow[];
  /** Positive = payable, negative = refundable / carried forward; null when there is no tax */
  netPayable: number | null;
  /** India: net payable per head */
  netGst?: GstParts;
  gst: boolean;
  skippedOtherCurrency: number;
  counts: { sales: number; creditNotes: number; purchases: number };
}

interface Totals {
  byRate: Map<number, AmountVat>;
  standard: AmountVat;
  zero: number;
  exempt: number;
  exports: number;
  reverse: number;
  gst: GstParts;
}

function emptyTotals(): Totals {
  return {
    byRate: new Map(),
    standard: { amount: 0, vat: 0 },
    zero: 0,
    exempt: 0,
    exports: 0,
    reverse: 0,
    gst: { igst: 0, cgst: 0, sgst: 0 },
  };
}

function addDoc(t: Totals, doc: VatReportDoc, sign: 1 | -1, defaultSplit: TaxSplit, decimals: number) {
  const s = splitDoc(doc);
  for (const [rate, row] of s.byRate) {
    const cur = t.byRate.get(rate) ?? { amount: 0, vat: 0 };
    cur.amount = roundMoney(cur.amount + sign * row.amount);
    cur.vat = roundMoney(cur.vat + sign * row.vat);
    t.byRate.set(rate, cur);
  }
  t.standard.amount = roundMoney(t.standard.amount + sign * s.standard.amount);
  t.standard.vat = roundMoney(t.standard.vat + sign * s.standard.vat);
  t.zero = roundMoney(t.zero + sign * s.zero);
  t.exempt = roundMoney(t.exempt + sign * s.exempt);
  t.exports = roundMoney(t.exports + sign * s.exports);
  t.reverse = roundMoney(t.reverse + sign * s.reverse);

  const docSplit = doc.tax_split ? normalizeTaxSplit(doc.tax_split) : defaultSplit;
  for (const it of doc.items ?? []) {
    const parts = splitTax(num(it.vat_amount), docSplit === "single" ? defaultSplit : docSplit, decimals);
    t.gst.igst = roundMoney(t.gst.igst + sign * parts.igst);
    t.gst.cgst = roundMoney(t.gst.cgst + sign * parts.cgst);
    t.gst.sgst = roundMoney(t.gst.sgst + sign * parts.sgst);
  }
}

export function buildTaxReturn(input: {
  sales: VatReportDoc[];
  creditNotes?: VatReportDoc[];
  purchases?: VatReportDoc[];
  currency: string;
  country: string | null | undefined;
}): TaxReturnSummary {
  const country = getCountryConfig(input.country);
  const { currency } = input;
  const decimals = currencyDecimals(currency);
  const gst = country.taxSystem === "gst";
  const defaultSplit: TaxSplit = gst ? "cgst_sgst" : "single";
  let skipped = 0;
  const out = emptyTotals();
  const inp = emptyTotals();

  const tally = (docs: VatReportDoc[] | undefined, t: Totals, sign: 1 | -1) => {
    let used = 0;
    for (const doc of docs ?? []) {
      if (!isActive(doc)) continue;
      if (!sameCurrency(doc, currency)) {
        skipped += 1;
        continue;
      }
      used += 1;
      addDoc(t, doc, sign, defaultSplit, decimals);
    }
    return used;
  };
  const counts = {
    sales: tally(input.sales, out, 1),
    creditNotes: tally(input.creditNotes, out, -1),
    purchases: tally(input.purchases, inp, 1),
  };

  const totalSales = roundMoney(out.standard.amount + out.zero + out.exempt + out.exports + out.reverse);
  const totalPurchases = roundMoney(inp.standard.amount + inp.zero + inp.exempt + inp.exports + inp.reverse);
  const net = roundMoney(out.standard.vat - inp.standard.vat);
  const base = { country, currency, gst, skippedOtherCurrency: skipped, counts };
  const rates = Array.from(out.byRate.entries()).sort((a, b) => b[0] - a[0]);

  if (country.taxSystem === "none") {
    return {
      ...base,
      title: "Sales & purchases summary",
      netPayable: null,
      rows: [
        { box: "", description: "Sales (after credit notes)", amount: totalSales, tax: null, total: true },
        { box: "", description: "Purchases", amount: totalPurchases, tax: null },
      ],
    };
  }

  if (gst) {
    const netGst = {
      igst: roundMoney(out.gst.igst - inp.gst.igst),
      cgst: roundMoney(out.gst.cgst - inp.gst.cgst),
      sgst: roundMoney(out.gst.sgst - inp.gst.sgst),
    };
    return {
      ...base,
      title: "GSTR-3B summary",
      netPayable: net,
      netGst,
      rows: [
        { box: "3.1(a)", description: "Outward taxable supplies (other than zero, nil and exempt)", amount: out.standard.amount, tax: out.standard.vat, gst: out.gst },
        { box: "3.1(b)", description: "Outward taxable supplies, zero rated (exports)", amount: roundMoney(out.exports + out.reverse), tax: 0 },
        { box: "3.1(c)", description: "Other outward supplies, nil rated and exempted", amount: roundMoney(out.zero + out.exempt), tax: 0 },
        { box: "4(A)(5)", description: "Input tax credit: all other ITC (purchases)", amount: inp.standard.amount, tax: inp.standard.vat, gst: inp.gst },
        { box: "6.1", description: net >= 0 ? "Tax payable (output - ITC)" : "ITC carried forward", amount: null, tax: Math.abs(net), gst: netGst, total: true },
      ],
    };
  }

  if (country.code === "GB") {
    return {
      ...base,
      title: "VAT return (9 boxes)",
      netPayable: net,
      rows: [
        { box: "1", description: "VAT due on sales and other outputs", amount: null, tax: out.standard.vat },
        { box: "2", description: "VAT due on acquisitions from EU (Northern Ireland goods only)", amount: null, tax: 0 },
        { box: "3", description: "Total VAT due (box 1 + box 2)", amount: null, tax: out.standard.vat, total: true },
        { box: "4", description: "VAT reclaimed on purchases and other inputs", amount: null, tax: inp.standard.vat },
        { box: "5", description: net >= 0 ? "Net VAT to pay HMRC" : "Net VAT to reclaim from HMRC", amount: null, tax: Math.abs(net), total: true },
        { box: "6", description: "Total value of sales and outputs, excluding VAT", amount: totalSales, tax: null },
        { box: "7", description: "Total value of purchases and inputs, excluding VAT", amount: totalPurchases, tax: null },
        { box: "8", description: "Supplies of goods to EU (Northern Ireland only)", amount: 0, tax: null },
        { box: "9", description: "Acquisitions of goods from EU (Northern Ireland only)", amount: 0, tax: null },
      ],
    };
  }

  if (country.code === "SA") {
    return {
      ...base,
      title: "VAT return",
      netPayable: net,
      rows: [
        { box: "1", description: "Standard rated sales", amount: out.standard.amount, tax: out.standard.vat },
        { box: "3", description: "Zero rated domestic sales", amount: out.zero, tax: 0 },
        { box: "4", description: "Exports", amount: roundMoney(out.exports + out.reverse), tax: 0 },
        { box: "5", description: "Exempt sales", amount: out.exempt, tax: 0 },
        { box: "6", description: "Total sales", amount: totalSales, tax: out.standard.vat, total: true },
        { box: "7", description: "Standard rated domestic purchases", amount: inp.standard.amount, tax: inp.standard.vat },
        { box: "10", description: "Zero rated and exempt purchases", amount: roundMoney(inp.zero + inp.exempt), tax: 0 },
        { box: "12", description: "Total purchases", amount: totalPurchases, tax: inp.standard.vat, total: true },
        { box: "13", description: "Total VAT due for the period", amount: null, tax: net },
        { box: "16", description: net >= 0 ? "Net VAT due" : "VAT credit to carry forward", amount: null, tax: Math.abs(net), total: true },
      ],
    };
  }

  // Bahrain, Oman, EU member states: output by rate, input, net
  const rows: ReturnRow[] = rates.map(([rate, r]) => ({
    box: "",
    description: `Sales taxed at ${rate}%`,
    amount: r.amount,
    tax: r.vat,
  }));
  rows.push(
    { box: "", description: "Zero-rated sales", amount: out.zero, tax: 0 },
    { box: "", description: "Exempt sales", amount: out.exempt, tax: 0 },
    {
      box: "",
      description: country.vatZone ? "Exports outside the EU" : "Exports",
      amount: out.exports,
      tax: 0,
    }
  );
  if (country.vatZone || out.reverse) {
    rows.push({
      box: "",
      description: country.vatZone
        ? "Supplies to businesses in other EU countries (reverse charge)"
        : "Reverse-charged supplies",
      amount: out.reverse,
      tax: 0,
    });
  }
  rows.push(
    { box: "", description: "Total sales / output VAT", amount: totalSales, tax: out.standard.vat, total: true },
    { box: "", description: "Purchases / input VAT", amount: totalPurchases, tax: inp.standard.vat },
    {
      box: "",
      description: net >= 0 ? "Net VAT payable" : "Net VAT refundable",
      amount: null,
      tax: Math.abs(net),
      total: true,
    }
  );
  return { ...base, title: country.returnName, netPayable: net, rows };
}

/** Summary sheet of the Excel export (any country). */
export function taxReturnToSheetRows(s: TaxReturnSummary): Record<string, string | number>[] {
  const amountKey = `Amount (${s.currency})`;
  const taxKey = `${s.country.taxName} (${s.currency})`;
  return s.rows.map((r) => {
    const row: Record<string, string | number> = {
      Box: r.box,
      Description: r.description,
      [amountKey]: r.amount ?? "",
      [taxKey]: r.tax ?? "",
    };
    if (s.gst) {
      row.IGST = r.gst?.igst ?? "";
      row.CGST = r.gst?.cgst ?? "";
      row["SGST / UTGST"] = r.gst?.sgst ?? "";
    }
    return row;
  });
}

const TREATMENT_TEXT: Record<string, string> = {
  domestic: "Local",
  reverse_charge: "Reverse charge",
  export: "Export",
};

/** Line-by-line register (sales or purchases) for the accountant. */
export function registerRows(
  docs: VatReportDoc[],
  currency: string,
  labels: { taxId?: string; region?: string; tax?: string } = {}
): Record<string, string | number>[] {
  const taxId = labels.taxId ?? "TRN";
  const region = labels.region ?? "Emirate";
  const tax = labels.tax ?? "VAT";
  return docs
    .filter((d) => isActive(d) && sameCurrency(d, currency))
    .map((d) => {
      const split = splitDoc(d);
      return {
        "Document No.": d.number,
        Date: d.date,
        Party: d.party?.name ?? "",
        [taxId]: d.party?.tax_id?.trim() ?? "",
        [region]: d.party?.state ?? "",
        Country: d.party?.country ?? "",
        Treatment: TREATMENT_TEXT[normalizeTaxTreatment(d.tax_treatment)],
        "Standard rated": split.standard.amount,
        "Zero rated": roundMoney(split.zero + split.exports + split.reverse),
        Exempt: split.exempt,
        [tax]: roundMoney(num(d.total_vat)),
        Total: roundMoney(num(d.grand_total)),
      };
    });
}

/** Column order for the register sheets. */
export function registerHeaders(labels: { taxId?: string; region?: string; tax?: string } = {}): string[] {
  return [
    "Document No.",
    "Date",
    "Party",
    labels.taxId ?? "TRN",
    labels.region ?? "Emirate",
    "Country",
    "Treatment",
    "Standard rated",
    "Zero rated",
    "Exempt",
    labels.tax ?? "VAT",
    "Total",
  ];
}

/** First and last day of the month containing `date` (local). */
export function vatPeriodMonthBounds(date = new Date()): { from: string; to: string } {
  const y = date.getFullYear();
  const m = date.getMonth();
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { from: iso(new Date(y, m, 1)), to: iso(new Date(y, m + 1, 0)) };
}
