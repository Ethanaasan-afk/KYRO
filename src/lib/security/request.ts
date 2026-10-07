import { NextResponse } from "next/server";

/**
 * Only allow redirects to paths on this site ("/dashboard"), never to another
 * host ("https://evil.com", "//evil.com", "/\\evil.com").
 */
export function safeRedirectPath(next: string | null | undefined, fallback = "/dashboard"): string {
  if (!next) return fallback;
  const value = next.trim();
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001f\\]/.test(value)) return fallback;
  try {
    const url = new URL(value, "http://local.invalid");
    if (url.origin !== "http://local.invalid") return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

/** Real PDF files start with "%PDF-". Stops other content being stored as a PDF. */
export function looksLikePdf(bytes: Uint8Array): boolean {
  return (
    bytes.length > 5 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  );
}

/**
 * Log the real error on the server, send a generic message to the browser.
 * Database and provider errors can reveal table names, columns or internals.
 */
export function serverError(tag: string, error: unknown, message = "Something went wrong. Please try again.") {
  console.error(`[${tag}]`, error);
  return NextResponse.json({ error: message }, { status: 500 });
}
