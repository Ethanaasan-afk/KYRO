/** Everyday explanations for tax/inventory jargon (labels stay legal). */
export const HELP = {
  vat_rate: "The VAT percentage charged on this item. UAE standard rate is 5%",
  vat_category:
    "Standard rated items carry VAT. Zero-rated (e.g. exports) and exempt items (e.g. some financial services) carry 0%",
  hsn_code: "Optional internal or customs code to identify this item",
  vat: "Value Added Tax collected on this sale and paid to the FTA",
  prices_include_vat:
    "Turn on if the prices you enter already include VAT (common for retail). VAT is then worked out from the total",
  reorder_threshold: "When stock drops below this number, we'll warn you to restock",
  tax_id: "The customer's Tax Registration Number (TRN). Required on tax invoices to VAT-registered businesses",
  barcode: "Optional product barcode so you can scan items when billing",
} as const;

export type HelpKey = keyof typeof HELP;
