/**
 * Quick sanity checks - run with: npx tsx src/lib/live-metal-rates.test.ts
 */
import {
  buildLiveRateInserts,
  buildLiveRateInsertsFromMetals,
  goldKaratPerGram,
  isLiveRatesStale,
  normalizeLiveCurrency,
  tozToPerGramInr,
} from "./live-metal-rates";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

const perG = tozToPerGramInr(3110.35);
assert(perG === 100, `toz->g got ${perG}`);

assert(goldKaratPerGram(10000, "22k") === 9160, "22k");
assert(goldKaratPerGram(10000, "18k") === 7500, "18k");
assert(goldKaratPerGram(10000, "14k") === 5850, "14k");

const rows = buildLiveRateInserts({
  status: "success",
  currency: "AED",
  metals: { gold: 62207, silver: 777.5875, platinum: 31103.5, palladium: 31103.5 },
});
assert(rows.length === 7, "7 rows");
assert(rows.find((r) => r.karat_or_purity === "24k")!.rate_per_gram_inr === 2000, "gold24");

assert(isLiveRatesStale(null) === true, "null stale");
assert(isLiveRatesStale(new Date().toISOString()) === false, "fresh");


// A timeseries day in US dollars with no exchange rate must not be stored as if it were AED
{
  const noFx = buildLiveRateInsertsFromMetals({ gold: 4000, silver: 50, platinum: 1000, palladium: 1000 }, "2026-10-14T12:00:00.000Z", { currency: "USD", unit: "toz" });
  const gold24 = noFx.find((r) => r.metal_type === "gold" && r.karat_or_purity === "24k");
  assert(!!gold24 && Math.abs(gold24.rate_per_gram_inr - (4000 * 3.6725) / 31.1035) < 0.02, "USD day converts to AED with the peg");
}


// Rupees: a USD timeseries day converts with that day's INR rate (USD per 1 INR)
{
  const inr = buildLiveRateInsertsFromMetals(
    { gold: 4000, silver: 50, platinum: 1000, palladium: 1000 },
    "2026-10-14T12:00:00.000Z",
    { currency: "USD", unit: "toz", currencies: { INR: 1 / 88 }, target: "INR" }
  );
  const g = inr.find((r) => r.metal_type === "gold" && r.karat_or_purity === "24k");
  assert(!!g && Math.abs(g.rate_per_gram_inr - (4000 * 88) / 31.1035) < 0.02, "USD day converts to INR");
  // No INR rate that day: skip rather than store dollars as rupees
  const none = buildLiveRateInsertsFromMetals(
    { gold: 4000, silver: 50, platinum: 1000, palladium: 1000 },
    "2026-10-14T12:00:00.000Z",
    { currency: "USD", unit: "toz", target: "INR" }
  );
  assert(none.length === 0, "unknown INR rate skips the day");
  // US dollars need no conversion
  const usd = buildLiveRateInsertsFromMetals(
    { gold: 3110.35, silver: 50, platinum: 1000, palladium: 1000 },
    "2026-10-14T12:00:00.000Z",
    { currency: "USD", unit: "toz", target: "USD" }
  );
  assert(usd.find((r) => r.karat_or_purity === "24k")!.rate_per_gram_inr === 100, "USD stays USD");
}

assert(normalizeLiveCurrency("inr") === "INR", "inr");
assert(normalizeLiveCurrency("usd") === "USD", "usd");
assert(normalizeLiveCurrency("XYZ") === "AED", "unknown currency falls back");

console.log("live-metal-rates.test.ts: ok");
