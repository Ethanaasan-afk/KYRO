import {
  buildVatBreakdown,
  normalizeTaxSplit,
  normalizeTaxTreatment,
  normalizeVatCategory,
  type CalcOptions,
  type TaxSplit,
  type TaxTreatment,
  type VatBreakdownRow,
} from "@/lib/vat";
import { currencyDecimals, roundTo } from "@/lib/utils";
import {
  getCountryConfig,
  indiaStateLabel,
  isIndiaUnionTerritory,
  type CountryVatConfig,
} from "@/lib/vat/countries";

/**
 * Everything about how ONE invoice is taxed, worked out from the seller's
 * country / region and the customer. The invoice form resolves it once and
 * stores the result on the invoice (tax_treatment, tax_split,
 * place_of_supply, tax_country), so a later change of the business address
 * never rewrites an issued invoice.
 */
export interface TaxContext {
  country: CountryVatConfig;
  currency: string;
  decimals: number;
  treatment: TaxTreatment;
  split: TaxSplit;
  /** Printed "Place of supply" (India: "Karnataka (29)") */
  placeOfSupply: string;
  taxFree: boolean;
}

export interface TaxParty {
  country?: string | null;
  state?: string | null;
  tax_id?: string | null;
}

function sameRegion(a: string | null | undefined, b: string | null | undefined): boolean {
  return (a ?? "").trim().toLowerCase() === (b ?? "").trim().toLowerCase();
}

/** The treatment a new invoice to this customer should start with. */
export function suggestTreatment(seller: CountryVatConfig, customer?: TaxParty | null): TaxTreatment {
  if (seller.taxSystem === "none") return "domestic";
  const buyerCode = (customer?.country || seller.code).toUpperCase();
  if (buyerCode === seller.code) return "domestic";
  const buyer = getCountryConfig(buyerCode);
  const buyerKnown = buyer.code === buyerCode;
  // Inside the EU a sale to a VAT-registered business is reverse charged;
  // a sale to a consumer is taxed like a local sale.
  if (seller.vatZone && buyerKnown && buyer.vatZone === seller.vatZone) {
    return customer?.tax_id?.trim() ? "reverse_charge" : "domestic";
  }
  return "export";
}

/** Treatments the seller's country can use (none for Qatar / Kuwait). */
export function availableTreatments(country: CountryVatConfig): TaxTreatment[] {
  if (country.taxSystem === "none") return ["domestic"];
  return ["domestic", "reverse_charge", "export"];
}

export function resolveTaxContext(input: {
  sellerCountry: string | null | undefined;
  sellerState?: string | null;
  currency?: string | null;
  customer?: TaxParty | null;
  /** Explicit choice; otherwise suggested from the customer */
  treatment?: TaxTreatment | null;
}): TaxContext {
  const country = getCountryConfig(input.sellerCountry);
  const currency = input.currency || country.currency;
  const treatment =
    country.taxSystem === "none"
      ? "domestic"
      : input.treatment ?? suggestTreatment(country, input.customer);

  const customerCountry = (input.customer?.country || country.code).toUpperCase();
  const foreign = customerCountry !== country.code;

  let split: TaxSplit = "single";
  if (country.taxSystem === "gst") {
    // Inside the seller's state: CGST + SGST. Another state, abroad or no state given
    // for a foreign buyer: IGST. A local customer with no state is treated as local.
    const buyerState = input.customer?.state;
    split =
      !foreign && (!buyerState?.trim() || sameRegion(buyerState, input.sellerState))
        ? "cgst_sgst"
        : "igst";
    if (treatment !== "domestic") split = "igst";
  }

  let placeOfSupply: string;
  if (foreign) {
    placeOfSupply = getCountryConfig(customerCountry).code === customerCountry
      ? getCountryConfig(customerCountry).name
      : customerCountry;
  } else {
    const region = input.customer?.state?.trim() || input.sellerState?.trim() || "";
    placeOfSupply =
      country.taxSystem === "gst" ? indiaStateLabel(region) || country.name : region || country.name;
  }

  return {
    country,
    currency,
    decimals: currencyDecimals(currency),
    treatment,
    split,
    placeOfSupply,
    taxFree: country.taxSystem === "none",
  };
}

/** Options for calcInvoiceTotals from a context. */
export function calcOptionsFor(ctx: TaxContext, pricesIncludeVat: boolean): CalcOptions {
  return {
    pricesIncludeVat,
    decimals: ctx.decimals,
    split: ctx.split,
    treatment: ctx.treatment,
    taxFree: ctx.taxFree,
  };
}

type StoredTaxDoc = {
  currency?: string | null;
  tax_country?: string | null;
  tax_treatment?: string | null;
  tax_split?: string | null;
  place_of_supply?: string | null;
};

/** Credit notes repeat the credited invoice's rules: same decimals, same CGST/SGST split. */
export function calcOptionsForDocument(doc: StoredTaxDoc, pricesIncludeVat: boolean): CalcOptions {
  return {
    pricesIncludeVat,
    decimals: currencyDecimals(doc.currency),
    split: normalizeTaxSplit(doc.tax_split),
    treatment: normalizeTaxTreatment(doc.tax_treatment),
    taxFree: !!doc.tax_country && getCountryConfig(doc.tax_country).taxSystem === "none",
  };
}

/** Tax fields to copy from an invoice onto its credit note (only the ones it has). */
export function copiedTaxFields(doc: StoredTaxDoc) {
  if (!doc.tax_country) return {};
  return {
    tax_country: doc.tax_country,
    tax_treatment: normalizeTaxTreatment(doc.tax_treatment),
    tax_split: normalizeTaxSplit(doc.tax_split),
    place_of_supply: doc.place_of_supply ?? null,
  };
}

/** What gets stored on the invoice row. */
export function taxFieldsFor(ctx: TaxContext) {
  return {
    tax_country: ctx.country.code,
    tax_treatment: ctx.treatment,
    tax_split: ctx.split,
    place_of_supply: ctx.placeOfSupply,
  };
}

/**
 * Context of an issued document: the stored fields win, older invoices
 * (issued before these columns existed) fall back to the organization.
 */
export function contextForDocument(
  doc: {
    currency?: string | null;
    tax_country?: string | null;
    tax_treatment?: string | null;
    tax_split?: string | null;
    place_of_supply?: string | null;
  },
  org: { country?: string | null; state?: string | null },
  customer?: TaxParty | null
): TaxContext {
  if (doc.tax_country) {
    const country = getCountryConfig(doc.tax_country);
    const currency = doc.currency || country.currency;
    return {
      country,
      currency,
      decimals: currencyDecimals(currency),
      treatment: normalizeTaxTreatment(doc.tax_treatment),
      split: normalizeTaxSplit(doc.tax_split),
      placeOfSupply: doc.place_of_supply || country.name,
      taxFree: country.taxSystem === "none",
    };
  }
  const ctx = resolveTaxContext({
    sellerCountry: org.country,
    sellerState: org.state,
    currency: doc.currency,
    customer,
    treatment: "domestic",
  });
  return { ...ctx, placeOfSupply: doc.place_of_supply || ctx.placeOfSupply };
}

export const TREATMENT_LABELS: Record<TaxTreatment, string> = {
  domestic: "Local sale",
  reverse_charge: "Reverse charge (business customer abroad)",
  export: "Export (zero-rated)",
};

/** Invoice title for this sale (Saudi: "Simplified Tax Invoice" for consumers). */
export function invoiceTitleFor(ctx: TaxContext, customerTaxId?: string | null): string {
  const c = ctx.country;
  if (c.simplifiedInvoiceTitle && !customerTaxId?.trim()) return c.simplifiedInvoiceTitle;
  return c.invoiceTitle;
}

/** Legal wording printed on reverse-charge and export invoices. */
export function treatmentNote(ctx: TaxContext): string | null {
  const c = ctx.country;
  if (ctx.treatment === "reverse_charge") {
    if (c.vatZone === "EU") {
      return "Reverse charge: VAT to be accounted for by the customer (Article 196, Council Directive 2006/112/EC).";
    }
    if (c.code === "GB") return "Reverse charge: customer to account for VAT to HMRC.";
    if (c.taxSystem === "gst") return "Tax payable on reverse charge basis: Yes.";
    return "Reverse charge: VAT to be accounted for by the recipient.";
  }
  if (ctx.treatment === "export") {
    if (c.taxSystem === "gst") return "Supply meant for export under LUT without payment of IGST.";
    if (c.vatZone === "EU") return "Export outside the EU: exempt from VAT (Article 146, Council Directive 2006/112/EC).";
    return `Export: zero-rated for ${c.taxName}.`;
  }
  return null;
}

export interface TaxSummaryRow {
  key: string;
  label: string;
  amount: number;
  /** Rows with tax (VAT / CGST / ...) vs. informational rows (zero-rated base) */
  kind: "tax" | "info";
  helpVat?: boolean;
}

/**
 * Rows under "Total excl. tax" on the form, the invoice page, the PDF and the
 * receipt: one per rate, split into CGST / SGST or IGST for India.
 */
export function taxSummaryRows(
  ctx: TaxContext,
  breakdown: VatBreakdownRow[],
  money: (n: number) => string
): TaxSummaryRow[] {
  const rows: TaxSummaryRow[] = [];
  if (ctx.taxFree) return rows;
  const sgstName = isIndiaUnionTerritory(ctx.placeOfSupply.replace(/\s*\(\d+\)$/, "")) ? "UTGST" : "SGST";
  const base = breakdown.reduce((s, b) => s + b.taxableValue, 0);

  if (ctx.treatment === "reverse_charge") {
    rows.push({ key: "rc", label: `Reverse charge supplies ${money(base)}`, amount: 0, kind: "info" });
    return rows;
  }
  if (ctx.treatment === "export") {
    rows.push({ key: "export", label: `Export, zero-rated ${money(base)}`, amount: 0, kind: "info" });
    return rows;
  }

  for (const b of breakdown) {
    const id = `${b.vatCategory}-${b.vatRate}`;
    if (b.vatCategory !== "standard") {
      const what =
        b.vatCategory === "zero" ? (ctx.country.taxSystem === "gst" ? "Nil-rated" : "Zero-rated") : "Exempt";
      rows.push({ key: id, label: `${what} supplies ${money(b.taxableValue)}`, amount: 0, kind: "info" });
      continue;
    }
    if (ctx.split === "cgst_sgst") {
      const half = roundTo(b.vatRate / 2, 3);
      rows.push(
        { key: `${id}-c`, label: `CGST ${half}% on ${money(b.taxableValue)}`, amount: b.cgst, kind: "tax" },
        { key: `${id}-s`, label: `${sgstName} ${half}% on ${money(b.taxableValue)}`, amount: b.sgst, kind: "tax" }
      );
    } else if (ctx.split === "igst") {
      rows.push({
        key: `${id}-i`,
        label: `IGST ${b.vatRate}% on ${money(b.taxableValue)}`,
        amount: b.igst || b.vatAmount,
        kind: "tax",
      });
    } else {
      rows.push({
        key: id,
        label: `${ctx.country.taxName} ${b.vatRate}% on ${money(b.taxableValue)}`,
        amount: b.vatAmount,
        kind: "tax",
        helpVat: true,
      });
    }
  }
  return rows;
}

/** Breakdown of stored invoice lines, split the way the invoice was issued. */
export function documentBreakdown(
  ctx: TaxContext,
  items: { taxable_value: number; vat_rate: number; vat_amount: number; vat_category?: unknown; line_total?: number }[]
): VatBreakdownRow[] {
  return buildVatBreakdown(
    items.map((it) => ({
      taxableValue: Number(it.taxable_value),
      vatRate: Number(it.vat_rate),
      vatAmount: Number(it.vat_amount),
      vatCategory: normalizeVatCategory(it.vat_category, Number(it.vat_rate)),
      lineTotal: Number(it.line_total ?? Number(it.taxable_value) + Number(it.vat_amount)),
    })),
    { split: ctx.split, decimals: ctx.decimals }
  );
}

/** "VAT 5%", "GST 18%", "Zero", "Exempt", "RC" for a line's rate column. */
export function lineRateLabel(ctx: TaxContext, rate: number, category: unknown): string {
  if (ctx.treatment === "reverse_charge") return "RC";
  const cat = normalizeVatCategory(category, rate);
  if (cat === "exempt") return "Exempt";
  if (cat === "zero") return ctx.country.taxSystem === "gst" ? "Nil" : "0%";
  return `${rate}%`;
}
