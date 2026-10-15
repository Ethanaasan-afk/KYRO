/**
 * How a product's tax is picked and named, in the words each country uses.
 *
 * VAT countries talk about "standard", "zero-rated" and "exempt" supplies.
 * India's GST does not: goods are taxed at a slab rate, "nil-rated" (0%) or
 * "exempt", and "zero-rated" means exports only (an invoice-level choice).
 * Both store the same values (vat_category + vat_rate), so reports and the
 * GSTR-3B summary keep working: nil-rated goods are reported in box 3.1(c).
 */
import type { VatCategory } from "@/lib/vat";
import type { CountryVatConfig } from "@/lib/vat/countries";

export type TaxChoice = {
  /** Stable key for a <select>: "standard:18", "zero", "exempt" or "custom" */
  key: string;
  category: VatCategory;
  rate: number;
  label: string;
};

export const CUSTOM_TAX_CHOICE = "custom";

/** Name of a tax category in this country's words. */
export function taxCategoryLabel(category: VatCategory, country: CountryVatConfig): string {
  const gst = country.taxSystem === "gst";
  if (category === "zero") return gst ? "Nil-rated" : "Zero-rated";
  if (category === "exempt") return "Exempt";
  return gst ? "Taxable" : "Standard rated";
}

/** Short text for a product's tax, e.g. "18%", "Nil-rated", "Exempt". */
export function productTaxLabel(
  product: { vat_category: VatCategory; vat_rate: number },
  country: CountryVatConfig
): string {
  return product.vat_category === "standard"
    ? `${Number(product.vat_rate)}%`
    : taxCategoryLabel(product.vat_category, country);
}

/** Every tax a product can have in this country, as one list: rates, then 0%, then exempt. */
export function taxChoices(country: CountryVatConfig): TaxChoice[] {
  const name = country.taxName;
  const gst = country.taxSystem === "gst";
  const rates: TaxChoice[] = country.rates
    .filter((r) => r.rate > 0)
    .map((r) => ({ key: `standard:${r.rate}`, category: "standard" as const, rate: r.rate, label: r.label }));
  return [
    ...rates,
    {
      key: "zero",
      category: "zero",
      rate: 0,
      label: gst ? "0% · Nil-rated (no GST charged)" : `0% · Zero-rated (no ${name} charged, still reported)`,
    },
    { key: "exempt", category: "exempt", rate: 0, label: `Exempt (outside ${name})` },
  ];
}

/** Which choice a product's stored values match ("custom" for a rate not in the list). */
export function taxChoiceKey(
  category: VatCategory | string | null | undefined,
  rate: number | string | null | undefined,
  country: CountryVatConfig
): string {
  if (category === "zero") return "zero";
  if (category === "exempt") return "exempt";
  const r = Number(rate);
  const hit = taxChoices(country).find((c) => c.category === "standard" && c.rate === r);
  return hit ? hit.key : CUSTOM_TAX_CHOICE;
}
