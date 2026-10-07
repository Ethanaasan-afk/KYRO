/**
 * Join optional letterhead fields without dangling commas / dashes / labels.
 */

export function presentText(value: unknown): string | null {
  if (value == null) return null;
  const t = String(value).trim();
  return t ? t : null;
}

/** Skip empty strings and known placeholder defaults. */
export function presentEmail(value: unknown): string | null {
  const t = presentText(value);
  if (!t) return null;
  if (t.toLowerCase() === "admin@example.com") return null;
  return t;
}

/**
 * Address block: join non-empty address / city / state with ", ",
 * then append " - P.O. Box {pincode}" only when one exists.
 */
export function formatCompanyAddress(parts: {
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
}): string {
  const locality = [presentText(parts.address), presentText(parts.city), presentText(parts.state)]
    .filter((p): p is string => Boolean(p))
    .join(", ");
  const pin = presentText(parts.pincode);
  const box = pin ? `P.O. Box ${pin}` : null;
  if (locality && box) return `${locality} - ${box}`;
  return locality || box || "";
}

/**
 * Contact line: only include TRN / Ph / email when values exist.
 * Returns "" when nothing to show (caller should omit the row).
 */
export function formatCompanyContact(parts: {
  tax_id?: string | null;
  /** Label for the registration number, e.g. "TRN" */
  taxIdLabel?: string;
  phone?: string | null;
  email?: string | null;
}): string {
  const chunks: string[] = [];
  const taxId = presentText(parts.tax_id);
  if (taxId) chunks.push(`${parts.taxIdLabel ?? "TRN"}: ${taxId}`);
  const phone = presentText(parts.phone);
  if (phone) chunks.push(`Ph: ${phone}`);
  const email = presentEmail(parts.email);
  if (email) chunks.push(email);
  return chunks.join(" · ");
}

/** Bank footer line - omit empty segments. */
export function formatCompanyBankLine(parts: {
  bank_name?: string | null;
  bank_account?: string | null;
  bank_swift?: string | null;
  bank_branch?: string | null;
}): string {
  const chunks: string[] = [];
  const name = presentText(parts.bank_name);
  if (name) chunks.push(name);
  const account = presentText(parts.bank_account);
  if (account) chunks.push(`IBAN ${account}`);
  const swift = presentText(parts.bank_swift);
  if (swift) chunks.push(`SWIFT ${swift}`);
  const branch = presentText(parts.bank_branch);
  if (branch) chunks.push(branch);
  return chunks.length ? `Bank: ${chunks.join(" · ")}` : "";
}
