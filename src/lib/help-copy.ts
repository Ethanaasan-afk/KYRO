/** Everyday explanations for tax/inventory jargon (labels stay legal). */
export const HELP = {
  vat_rate: "The VAT / GST percentage charged on this item. Tap a rate below to use one of your country's rates",
  vat_category:
    "Standard rated items carry tax. Zero-rated (e.g. exports) and exempt items (e.g. some financial services) carry 0%",
  hsn_code: "Optional item or customs code. In India this is the HSN (goods) or SAC (services) code printed on GST invoices",
  vat: "Tax (VAT or GST) collected on this sale and paid to your tax authority",
  prices_include_vat:
    "Turn on if the prices you enter already include tax (common for retail). The tax is then worked out from the total",
  reorder_threshold: "When stock drops below this number, we'll warn you to restock",
  tax_id: "The customer's tax registration number (TRN, VAT number or GSTIN). Required on invoices to registered businesses, and for reverse charge",
  barcode: "Optional product barcode so you can scan items when billing",
} as const;

export type HelpKey = keyof typeof HELP;
