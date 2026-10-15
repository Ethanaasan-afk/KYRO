import { createClient } from "@/lib/supabase/server";
import {
  backfillLiveRateHistory,
  ensureDiamondIndexFromHistory,
  refreshLiveMetalRates,
} from "@/lib/live-metal-rates-server";
import { NextResponse } from "next/server";
import { memoryLimit, tooManyRequests } from "@/lib/security/rate-limit";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    // Each refresh spends paid Metals.Dev quota
    const limited = memoryLimit(`metals:user:${user.id}`, 6, 10 * 60 * 1000);
    if (!limited.ok) return tooManyRequests(limited.retryAfter);

    const currency = new URL(request.url).searchParams.get("currency") ?? undefined;
    const result = await refreshLiveMetalRates(currency);
    try {
      await backfillLiveRateHistory(7, currency);
      await ensureDiamondIndexFromHistory(7, currency);
    } catch {
      /* trend backfill is best-effort */
    }
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("[metal-rates/refresh]", e);
    return NextResponse.json({ ok: false, error: "Live rates unavailable right now" }, { status: 502 });
  }
}
