"use client";

import { useQuery } from "@tanstack/react-query";
import { useOrganization } from "@/hooks/use-company";
import { normalizeLiveCurrency, type LiveMetalRateRow } from "@/lib/live-metal-rates";

export type LiveMarketRatesData = {
  ok: boolean;
  currency: string;
  rates: LiveMetalRateRow[];
  history: LiveMetalRateRow[];
  unavailable: string | null;
};

/**
 * Live market metal rates in the business's own currency (₹ for India, AED for
 * the UAE...). Pass `currency` to look at another one, e.g. US dollars.
 */
export function useLiveMarketRates(enabled = true, refetchMs = 0, currency?: string) {
  const { data: org } = useOrganization();
  const code = normalizeLiveCurrency(currency ?? org?.currency);
  // Wait for the business to load so we never fetch (and pay for) the wrong currency
  const ready = Boolean(currency || org);

  return useQuery<LiveMarketRatesData>({
    queryKey: ["live_metal_rates_market", code],
    enabled: enabled && ready,
    staleTime: refetchMs ? Math.min(refetchMs, 20_000) : 5 * 60 * 1000,
    refetchInterval: refetchMs || false,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const res = await fetch(`/api/metal-rates/live?currency=${encodeURIComponent(code)}`, {
        cache: "no-store",
      });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        detail?: string;
        rates?: LiveMetalRateRow[];
        history?: LiveMetalRateRow[];
        warning?: string;
      };
      return {
        ok: Boolean(json.ok && (json.rates?.length ?? 0) > 0),
        currency: code,
        rates: json.rates ?? [],
        history: json.history ?? [],
        unavailable:
          !json.ok && !(json.rates && json.rates.length)
            ? json.detail || json.error || "Live rates unavailable right now"
            : json.warning ?? null,
      };
    },
  });
}
