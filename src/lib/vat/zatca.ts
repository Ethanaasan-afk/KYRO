/**
 * Saudi Arabia (ZATCA) e-invoicing QR code, phase 1 ("generation").
 *
 * The QR holds five TLV fields, Base64-encoded:
 *   1 seller name · 2 VAT number · 3 time stamp · 4 total incl. VAT · 5 VAT total
 *
 * Phase 2 ("integration": signed XML cleared through the Fatoora portal) needs
 * the business to be onboarded with ZATCA and is not done here.
 */

export interface ZatcaQrInput {
  sellerName: string;
  vatNumber: string;
  /** ISO 8601 date-time of the invoice */
  timestamp: string;
  total: number;
  vatTotal: number;
}

function tlv(tag: number, value: string): number[] {
  const bytes = Array.from(new TextEncoder().encode(value));
  if (bytes.length > 255) throw new Error(`ZATCA QR field ${tag} is too long`);
  return [tag, bytes.length, ...bytes];
}

function toBase64(bytes: number[]): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  if (typeof btoa === "function") return btoa(binary);
  return Buffer.from(bytes).toString("base64");
}

export function zatcaQrPayload(input: ZatcaQrInput): string {
  return toBase64([
    ...tlv(1, input.sellerName.trim()),
    ...tlv(2, input.vatNumber.trim()),
    ...tlv(3, input.timestamp),
    ...tlv(4, input.total.toFixed(2)),
    ...tlv(5, input.vatTotal.toFixed(2)),
  ]);
}

/** Invoice date (and creation time when known) as an ISO time stamp. */
export function zatcaTimestamp(invoiceDate: string, createdAt?: string | null): string {
  if (createdAt && createdAt.slice(0, 10) === invoiceDate.slice(0, 10)) {
    return new Date(createdAt).toISOString().replace(/\.\d{3}Z$/, "Z");
  }
  return `${invoiceDate.slice(0, 10)}T00:00:00Z`;
}

/** PNG data URL of the QR code, for the PDF and the invoice screen. */
export async function zatcaQrDataUrl(input: ZatcaQrInput): Promise<string> {
  const QRCode = (await import("qrcode")).default;
  return QRCode.toDataURL(zatcaQrPayload(input), {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 240,
  });
}
