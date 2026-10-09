/** Arabic wording for bilingual (English + Arabic) tax invoices and receipts. */
export const AR = {
  taxInvoice: "فاتورة ضريبية",
  simplifiedTaxInvoice: "فاتورة ضريبية مبسطة",
  trn: "رقم التسجيل الضريبي",
  notRegistered: "غير مسجل في ضريبة القيمة المضافة",
  vat: "ضريبة القيمة المضافة",
  zeroRated: "خاضع لنسبة الصفر",
  exempt: "معفى",
  total: "الإجمالي",
  thankYou: "شكراً لتعاملكم معنا",
} as const;

export type InvoiceLanguage = "en" | "en_ar";

export const INVOICE_LANGUAGE_OPTIONS: Array<{ value: InvoiceLanguage; label: string; hint: string }> = [
  { value: "en", label: "English", hint: "Standard tax invoice in English." },
  {
    value: "en_ar",
    label: "English + Arabic",
    hint: "Every label in English with Arabic underneath, plus your Arabic business name.",
  },
];
