/** @deprecated Prefer categoriesForBusinessType() - kept for legacy imports. */
export { GROCERY_CATEGORIES as PRODUCT_CATEGORIES } from "@/lib/business-types";
import { GROCERY_CATEGORIES } from "@/lib/business-types";
export type ProductCategory = (typeof GROCERY_CATEGORIES)[number];

export const PACK_SIZES = ["100ml", "250ml", "500ml", "1L", "5L", "10L"] as const;

/** Emirates for the UAE region pickers (customers, suppliers, organization). */
export { UAE_EMIRATES } from "@/lib/vat/countries";

export type UserRole = "admin" | "staff";
export type InvoiceStatus = "issued" | "paid" | "partially_paid" | "cancelled";
export type CustomerType = "b2b" | "b2c";
export type MovementType = "in" | "out" | "adjustment";

export const BUSINESS_DATA_CATEGORIES = [
  "product_purchase",
  "rent",
  "salary",
  "food",
  "tea_snacks",
  "fuel",
  "transport",
  "travel",
  "electricity",
  "utilities",
  "phone_internet",
  "stationery",
  "office_supplies",
  "courier",
  "packaging",
  "labour",
  "cleaning",
  "maintenance",
  "marketing",
  "bank_charges",
  "professional_fees",
  "insurance",
  "taxes_fees",
  "staff_welfare",
  "medical",
  "donations",
  "misc",
] as const;

export type BusinessDataCategory = (typeof BUSINESS_DATA_CATEGORIES)[number];

export const BUSINESS_DATA_CATEGORY_LABELS: Record<BusinessDataCategory, string> = {
  product_purchase: "Product Purchase",
  rent: "Rent",
  salary: "Salary",
  food: "Food & Meals",
  tea_snacks: "Chai & Snacks",
  fuel: "Petrol / Diesel",
  transport: "Transport",
  travel: "Travel",
  electricity: "Electricity",
  utilities: "Water & Utilities",
  phone_internet: "Phone & Internet",
  stationery: "Stationery & Printing",
  office_supplies: "Office Supplies",
  courier: "Courier & Postage",
  packaging: "Packaging",
  labour: "Labour / Loading",
  cleaning: "Cleaning",
  maintenance: "Repairs & Maintenance",
  marketing: "Marketing",
  bank_charges: "Bank Charges",
  professional_fees: "Professional Fees",
  insurance: "Insurance",
  taxes_fees: "Taxes & Govt Fees",
  staff_welfare: "Staff Welfare",
  medical: "Medical",
  donations: "Donations & Gifts",
  misc: "Misc",
};

/** @deprecated - prefer BUSINESS_DATA_CATEGORIES */
export const EXPENSE_CATEGORIES = [
  "rent",
  "salary",
  "utilities",
  "transport",
  "packaging",
  "marketing",
  "maintenance",
  "misc",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

/** @deprecated */
export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  rent: "Rent",
  salary: "Salary",
  utilities: "Utilities",
  transport: "Transport",
  packaging: "Packaging",
  marketing: "Marketing",
  maintenance: "Maintenance",
  misc: "Misc",
};

export const PAYMENT_MODES = [
  "cash",
  "bank_transfer",
  "upi",
  "cheque",
  "card",
] as const;

export type PaymentMode = (typeof PAYMENT_MODES)[number];

export const PAYMENT_MODE_LABELS: Record<PaymentMode, string> = {
  cash: "Cash",
  bank_transfer: "Bank Transfer",
  upi: "UPI (legacy)",
  cheque: "Cheque",
  card: "Card",
};

/** UI labels - DB still stores b2c / b2b */
export const CUSTOMER_TYPE_LABELS: Record<CustomerType, string> = {
  b2c: "Retail",
  b2b: "Wholesaler",
};

export function customerTypeLabel(type: CustomerType | string): string {
  if (type === "b2b" || type === "b2c") return CUSTOMER_TYPE_LABELS[type];
  return type;
}
