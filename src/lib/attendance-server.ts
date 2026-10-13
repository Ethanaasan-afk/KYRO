import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

export const ATTENDANCE_BUCKET = "attendance";
export const MAX_PHOTO_BYTES = 1_500_000;

export function isValidPin(pin: unknown): pin is string {
  return typeof pin === "string" && /^\d{4,6}$/.test(pin);
}

/** PINs are hashed with scrypt; the hash never leaves the server. */
export async function hashPin(pin: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(pin, salt, 32);
  return `scrypt$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export async function verifyPin(pin: string, stored: string | null | undefined): Promise<boolean> {
  if (!stored) return false;
  const [scheme, saltB64, hashB64] = stored.split("$");
  if (scheme !== "scrypt" || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, "base64");
  const actual = await scrypt(pin, Buffer.from(saltB64, "base64"), expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/**
 * Decode a selfie sent as a data URL. Only real JPEG, PNG or WebP images are
 * accepted, whatever the data URL claims.
 */
export function decodePhoto(dataUrl: unknown): { bytes: Buffer; type: string; ext: string } | null {
  if (typeof dataUrl !== "string" || dataUrl.length > MAX_PHOTO_BYTES * 1.4) return null;
  const m = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!m) return null;
  const bytes = Buffer.from(m[2], "base64");
  if (bytes.length < 100 || bytes.length > MAX_PHOTO_BYTES) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { bytes, type: "image/jpeg", ext: "jpg" };
  if (bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
    return { bytes, type: "image/png", ext: "png" };
  if (bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP")
    return { bytes, type: "image/webp", ext: "webp" };
  return null;
}

export function numberOrNull(v: unknown, min: number, max: number): number | null {
  const n = typeof v === "number" ? v : Number.NaN;
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
}
