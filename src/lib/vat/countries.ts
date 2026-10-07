/**
 * VAT country configuration. Adding a country = adding an entry here;
 * the tax engine, forms and invoice PDF read everything from this table.
 *
 * Only `enabled` countries can be picked by an organization. Others are
 * staged for later phases (Saudi Arabia needs ZATCA e-invoicing, Europe
 * needs reverse charge) and must not be enabled until that work ships.
 */

export type CountryCode = "AE" | "SA" | "BH" | "OM";

export interface VatRateOption {
  rate: number;
  label: string;
}

export interface CountryVatConfig {
  code: CountryCode;
  name: string;
  enabled: boolean;
  currency: string;
  /** Minor-unit digits for the currency (AED 2, BHD/OMR 3) */
  currencyDecimals: number;
  standardRate: number;
  /** Rates offered on products / invoice lines, standard first */
  rates: VatRateOption[];
  /** Label for the VAT registration number, e.g. "TRN" */
  taxIdLabel: string;
  taxIdPlaceholder: string;
  /** Validates a normalized (spaces stripped) registration number */
  taxIdPattern: RegExp;
  taxIdHint: string;
  /** Title printed on a VAT invoice */
  invoiceTitle: string;
  /** Label for the region field (emirate, province, governorate) */
  regionLabel: string;
  regions: readonly string[];
  postalLabel: string;
  dialCode: string;
}

export const UAE_EMIRATES = [
  "Abu Dhabi",
  "Dubai",
  "Sharjah",
  "Ajman",
  "Umm Al Quwain",
  "Ras Al Khaimah",
  "Fujairah",
] as const;

export const COUNTRIES: Record<CountryCode, CountryVatConfig> = {
  AE: {
    code: "AE",
    name: "United Arab Emirates",
    enabled: true,
    currency: "AED",
    currencyDecimals: 2,
    standardRate: 5,
    rates: [
      { rate: 5, label: "Standard 5%" },
      { rate: 0, label: "Zero-rated 0%" },
    ],
    taxIdLabel: "TRN",
    taxIdPlaceholder: "100123456700003",
    taxIdPattern: /^\d{15}$/,
    taxIdHint: "15-digit Tax Registration Number issued by the FTA",
    invoiceTitle: "Tax Invoice",
    regionLabel: "Emirate",
    regions: UAE_EMIRATES,
    postalLabel: "P.O. Box",
    dialCode: "+971",
  },
  SA: {
    code: "SA",
    name: "Saudi Arabia",
    enabled: false,
    currency: "SAR",
    currencyDecimals: 2,
    standardRate: 15,
    rates: [
      { rate: 15, label: "Standard 15%" },
      { rate: 0, label: "Zero-rated 0%" },
    ],
    taxIdLabel: "VAT No.",
    taxIdPlaceholder: "300000000000003",
    taxIdPattern: /^3\d{13}3$/,
    taxIdHint: "15-digit VAT number starting and ending with 3",
    invoiceTitle: "Tax Invoice",
    regionLabel: "Province",
    regions: [],
    postalLabel: "Postal code",
    dialCode: "+966",
  },
  BH: {
    code: "BH",
    name: "Bahrain",
    enabled: false,
    currency: "BHD",
    currencyDecimals: 3,
    standardRate: 10,
    rates: [
      { rate: 10, label: "Standard 10%" },
      { rate: 0, label: "Zero-rated 0%" },
    ],
    taxIdLabel: "VAT Account No.",
    taxIdPlaceholder: "200000000000002",
    taxIdPattern: /^\d{15}$/,
    taxIdHint: "15-digit VAT account number",
    invoiceTitle: "Tax Invoice",
    regionLabel: "Governorate",
    regions: [],
    postalLabel: "Postal code",
    dialCode: "+973",
  },
  OM: {
    code: "OM",
    name: "Oman",
    enabled: false,
    currency: "OMR",
    currencyDecimals: 3,
    standardRate: 5,
    rates: [
      { rate: 5, label: "Standard 5%" },
      { rate: 0, label: "Zero-rated 0%" },
    ],
    taxIdLabel: "VATIN",
    taxIdPlaceholder: "OM1100000000",
    taxIdPattern: /^OM\d{10}$/,
    taxIdHint: "VAT identification number (OM + 10 digits)",
    invoiceTitle: "Tax Invoice",
    regionLabel: "Governorate",
    regions: [],
    postalLabel: "Postal code",
    dialCode: "+968",
  },
};

export const DEFAULT_COUNTRY: CountryCode = "AE";

export const ENABLED_COUNTRIES = Object.values(COUNTRIES).filter((c) => c.enabled);

export function getCountryConfig(code: string | null | undefined): CountryVatConfig {
  const key = (code ?? "").toUpperCase() as CountryCode;
  return COUNTRIES[key] ?? COUNTRIES[DEFAULT_COUNTRY];
}

export function normalizeTaxId(value: string | null | undefined): string {
  return (value ?? "").replace(/[\s-]/g, "").toUpperCase();
}

/** Empty is valid (not every customer is VAT-registered). */
export function isValidTaxId(value: string | null | undefined, country: string | null | undefined): boolean {
  const v = normalizeTaxId(value);
  if (!v) return true;
  return getCountryConfig(country).taxIdPattern.test(v);
}
