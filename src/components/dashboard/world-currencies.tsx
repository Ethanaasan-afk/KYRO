"use client";

import { useExchangeRates } from "@/hooks/use-exchange-rates";
import { WORLD_CURRENCIES, formatMoney } from "@/lib/currencies";
import { formatCurrency } from "@/lib/utils";
import { useMemo, useState } from "react";

export function WorldCurrenciesSection() {
  const { data, isFetching, isError } = useExchangeRates();
  const [amountInput, setAmountInput] = useState("1000");

  const amount = useMemo(() => {
    const n = Number(amountInput.replace(/,/g, ""));
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }, [amountInput]);

  const rates = data?.rates ?? {};
  const usdRate = rates.USD ?? 0;
  const mostUsed = WORLD_CURRENCIES.find((c) => c.mostUsed)!;

  return (
    <section className="panel mb-6 overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate">
            Reference rates
          </p>
          <h2 className="font-display text-base font-semibold text-ink">World currencies</h2>
          <p className="mt-1 text-xs text-slate">
            Base AED · major &amp; most-traded currencies
            {data?.updatedAt ? (
              <span className="font-mono">
                {" "}
                · updated {new Date(data.updatedAt).toLocaleString("en-GB")}
              </span>
            ) : null}
            {data?.source === "fallback" || isError ? " · offline estimate" : null}
            {isFetching ? " · refreshing…" : null}
          </p>
        </div>
        <div className="flex items-end gap-2">
          <div>
            <label htmlFor="fx-amount" className="mb-1 block text-[10px] uppercase tracking-[0.05em] text-slate">
              Amount (AED)
            </label>
            <input
              id="fx-amount"
              type="text"
              inputMode="decimal"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              className="h-10 w-36 rounded-[10px] border border-border bg-surface px-3 font-mono text-sm text-ink focus:border-emerald focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Most used - USD */}
      <div className="border-b border-border bg-emerald-soft/60 px-5 py-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-emerald">
              Most used worldwide
            </p>
            <p className="mt-1 font-display text-xl font-semibold text-ink">
              {mostUsed.name}{" "}
              <span className="font-mono text-emerald">{mostUsed.code}</span>
            </p>
            <p className="mt-1 text-xs text-slate">Global reserve &amp; trade currency</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-[0.05em] text-slate">1 USD =</p>
            <p className="font-display text-3xl font-semibold text-ink">
              <span className="font-mono text-emerald">
                {usdRate > 0 ? formatCurrency(1 / usdRate, "AED") : "-"}
              </span>
            </p>
            <p className="mt-1 font-mono text-xs text-slate">
              {formatCurrency(amount, "AED")} → {usdRate > 0 ? formatMoney(amount * usdRate, "USD") : "-"}
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Currency</th>
              <th>Code</th>
              <th className="num">AED per 1 unit</th>
              <th className="num">Units per AED 1</th>
              <th className="num">{formatCurrency(amount, "AED")} equals</th>
            </tr>
          </thead>
          <tbody>
            {WORLD_CURRENCIES.map((c) => {
              const perAed = rates[c.code];
              const aedPerUnit = perAed > 0 ? 1 / perAed : 0;
              const converted = perAed > 0 ? amount * perAed : 0;
              return (
                <tr
                  key={c.code}
                  className={c.mostUsed ? "bg-emerald-soft/40" : undefined}
                >
                  <td>
                    {c.name}
                    {c.mostUsed && (
                      <span className="ml-2 text-[10px] font-medium uppercase tracking-[0.06em] text-emerald">
                        Most used
                      </span>
                    )}
                  </td>
                  <td className="font-mono text-xs">{c.code}</td>
                  <td className="num">{aedPerUnit ? formatCurrency(aedPerUnit, "AED") : "-"}</td>
                  <td className="num">
                    {perAed
                      ? perAed.toLocaleString("en-AE", {
                          maximumFractionDigits: 6,
                        })
                      : "-"}
                  </td>
                  <td className="num text-emerald">
                    {converted ? formatMoney(converted, c.code) : "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="border-t border-border px-5 py-3 text-xs text-slate">
        For reference only. Invoices and catalog prices stay in your organization currency.
      </p>
    </section>
  );
}
