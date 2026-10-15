/** Everyday explanations for tax/inventory jargon (labels stay legal). */
export const HELP = {
  vat_rate: "The tax percentage for this item when it isn't one of your country's usual rates",
  vat_category:
    "Pick the rate this item is taxed at. 0% items (zero-rated for VAT, nil-rated for GST) and exempt items carry no tax but are reported differently on your return. Pick 'Other rate' for anything not listed",
  hsn_code: "Optional item or customs code. In India this is the HSN (goods) or SAC (services) code printed on GST invoices",
  vat: "Tax (VAT or GST) collected on this sale and paid to your tax authority",
  prices_include_vat:
    "Example with a 100 price and 18% tax. Add on top: the customer pays 118 (100 + 18 tax). Already included: the customer pays 100, of which 15.25 is tax. Pick 'already included' if your price tags show the final price",
  reorder_threshold: "When stock drops below this number, we'll warn you to restock",
  tax_id: "The customer's tax registration number (TRN, VAT number or GSTIN). Required on invoices to registered businesses, and for reverse charge",
  barcode: "Optional product barcode so you can scan items when billing",
} as const;

export type HelpKey = keyof typeof HELP;
