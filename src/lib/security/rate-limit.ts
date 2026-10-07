import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

/**
 * Rate limiting.
 *
 * - `memoryLimit` is a per-instance fixed window. It runs in middleware (edge)
 *   and API routes, and stops floods cheaply, but every serverless instance
 *   keeps its own counters.
 * - `rateLimit` uses the shared `rate_limit_hit` function in Postgres
 *   (migration 039) so limits hold across instances. If that function is not
 *   installed yet it falls back to the memory window.
 */

export type RateLimitResult = { ok: boolean; retryAfter: number };

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();
let lastSweep = 0;

export function memoryLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  if (now - lastSweep > 60_000) {
    lastSweep = now;
    buckets.forEach((b, k) => {
      if (b.resetAt <= now) buckets.delete(k);
    });
  }
  let b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    b = { count: 0, resetAt: now + windowMs };
    buckets.set(key, b);
  }
  b.count += 1;
  return { ok: b.count <= limit, retryAfter: Math.max(1, Math.ceil((b.resetAt - now) / 1000)) };
}

export async function rateLimit(
  admin: SupabaseClient,
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  try {
    const { data, error } = await admin.rpc("rate_limit_hit", {
      p_key: key,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });
    if (error) throw error;
    const row = (Array.isArray(data) ? data[0] : data) as
      | { allowed: boolean; retry_after: number }
      | undefined;
    if (!row) throw new Error("rate_limit_hit returned nothing");
    return { ok: Boolean(row.allowed), retryAfter: Math.max(1, Number(row.retry_after) || 1) };
  } catch {
    return memoryLimit(key, limit, windowSeconds * 1000);
  }
}

/** Check several limits; the first one that is exceeded wins. */
export async function rateLimitAll(
  admin: SupabaseClient,
  rules: Array<{ key: string; limit: number; windowSeconds: number }>
): Promise<RateLimitResult> {
  for (const r of rules) {
    const res = await rateLimit(admin, r.key, r.limit, r.windowSeconds);
    if (!res.ok) return res;
  }
  return { ok: true, retryAfter: 0 };
}

export function tooManyRequests(retryAfter: number, message?: string) {
  const minutes = Math.ceil(retryAfter / 60);
  return NextResponse.json(
    {
      error:
        message ??
        `Too many requests. Please wait ${minutes <= 1 ? "a minute" : `${minutes} minutes`} and try again.`,
    },
    { status: 429, headers: { "Retry-After": String(retryAfter) } }
  );
}

/** Client IP as seen by Vercel / a reverse proxy. */
export function clientIp(request: Request): string {
  const h = request.headers;
  const real = h.get("x-real-ip")?.trim();
  if (real) return real;
  const fwd = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return fwd || "unknown";
}
