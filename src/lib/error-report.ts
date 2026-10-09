"use client";

/**
 * Report a browser error to /api/client-error, which writes it to the server
 * logs (Vercel → Logs, filter "[client-error]"). No third-party service, no
 * personal data: only the message, stack, page path and browser.
 */
const sent = new Set<string>();
const MAX_PER_PAGE_LOAD = 10;

export function reportError(error: unknown, context: string = "app") {
  if (typeof window === "undefined" || sent.size >= MAX_PER_PAGE_LOAD) return;
  const err = error instanceof Error ? error : new Error(typeof error === "string" ? error : "Unknown error");
  const key = `${err.message}|${context}`;
  if (sent.has(key)) return;
  sent.add(key);
  const body = JSON.stringify({
    message: err.message.slice(0, 500),
    stack: (err.stack ?? "").slice(0, 2000),
    digest: (error as { digest?: string })?.digest ?? null,
    context: context.slice(0, 60),
    path: window.location.pathname.slice(0, 200),
  });
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/client-error", new Blob([body], { type: "application/json" }));
    } else {
      void fetch("/api/client-error", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true });
    }
  } catch {
    /* reporting must never break the page */
  }
}
