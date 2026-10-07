import { NextResponse } from "next/server";
import { FALLBACK_RATES, WORLD_CURRENCIES } from "@/lib/currencies";

export const revalidate = 3600;

/** Reference rates are quoted against the UAE dirham. */
const BASE = "AED";

export async function GET() {
  try {
    const res = await fetch(`https://open.er-api.com/v6/latest/${BASE}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error(`Upstream ${res.status}`);
    const data = (await res.json()) as {
      result?: string;
      rates?: Record<string, number>;
      time_last_update_utc?: string;
    };
    if (data.result !== "success" || !data.rates) throw new Error("Bad payload");

    const codes = WORLD_CURRENCIES.map((c) => c.code);
    const rates: Record<string, number> = { [BASE]: 1 };
    for (const code of codes) {
      if (typeof data.rates[code] === "number") rates[code] = data.rates[code];
    }

    return NextResponse.json({
      base: BASE,
      rates,
      updatedAt: data.time_last_update_utc ?? new Date().toUTCString(),
      source: "live",
    });
  } catch {
    return NextResponse.json({
      base: BASE,
      rates: { [BASE]: 1, ...FALLBACK_RATES },
      updatedAt: new Date().toUTCString(),
      source: "fallback",
    });
  }
}
