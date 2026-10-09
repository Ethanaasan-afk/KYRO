"use client";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useProductMutations, useProducts } from "@/hooks/use-products";
import { getCountryConfig } from "@/lib/vat/countries";
import { useMemo } from "react";

/**
 * After a change of country, products still carry the old rates (5% from the
 * UAE in a 15% Saudi business). Offer to move them to the new standard rate.
 * Only shows when some standard-rated product uses a rate the country doesn't have.
 */
export function ProductTaxRatesSection({ countryCode }: { countryCode: string }) {
  const country = getCountryConfig(countryCode);
  const { data: products } = useProducts();
  const { setTaxRate } = useProductMutations();
  const { toast } = useToast();

  const offRate = useMemo(() => {
    if (country.taxSystem === "none") return [];
    const known = new Set(country.rates.map((r) => r.rate));
    return (products ?? []).filter(
      (p) => p.vat_category === "standard" && !known.has(Number(p.vat_rate))
    );
  }, [products, country]);

  if (!offRate.length) return null;
  const oldRates = Array.from(new Set(offRate.map((p) => `${Number(p.vat_rate)}%`))).join(", ");

  return (
    <div className="panel mt-6 max-w-2xl space-y-3 border-amber/40 p-5">
      <h2 className="font-display text-sm font-semibold text-ink">Product {country.taxName} rates</h2>
      <p className="text-sm text-slate">
        {offRate.length} product{offRate.length === 1 ? "" : "s"} still use {oldRates}, which is not a{" "}
        {country.name} rate. Move {offRate.length === 1 ? "it" : "them"} to the {country.standardRate}%
        standard rate? You can still give single products a reduced rate afterwards.
      </p>
      <Button
        type="button"
        variant="secondary"
        loading={setTaxRate.isPending}
        onClick={async () => {
          try {
            const n = await setTaxRate.mutateAsync({ products: offRate, rate: country.standardRate });
            toast(`Updated ${n} product${n === 1 ? "" : "s"} to ${country.standardRate}%`);
          } catch (e) {
            toast((e as Error).message || "Could not update the products", "error");
          }
        }}
      >
        Set {offRate.length} product{offRate.length === 1 ? "" : "s"} to {country.standardRate}%
      </Button>
    </div>
  );
}
