"use client";

import { amountInWords } from "@/lib/amount-in-words";
import { calcLineVat, type VatCategory } from "@/lib/vat";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useMemo, useState } from "react";
import { AnimatedMoney, EASE, Reveal, WordsReveal } from "./primitives";

const TREATMENTS: { id: VatCategory; label: string; hint: string }[] = [
  { id: "standard", label: "Standard 5%", hint: "Most goods and services" },
  { id: "zero", label: "Zero-rated", hint: "e.g. qualifying exports" },
  { id: "exempt", label: "Exempt", hint: "No VAT, no recovery" },
];

function Row({ label, children, strong }: { label: string; children: React.ReactNode; strong?: boolean }) {
  return (
    <div className={cn("flex items-baseline justify-between gap-4 py-3.5", strong ? "text-white" : "text-white/70")}>
      <span className={cn("text-[15px]", strong && "font-semibold")}>{label}</span>
      <span className={cn("font-mono tabular-nums", strong ? "text-2xl font-bold text-[#34d399] sm:text-3xl" : "text-lg font-semibold text-white")}>
        {children}
      </span>
    </div>
  );
}

export function VatCalculator() {
  const reduce = useReducedMotion();
  const [price, setPrice] = useState("350");
  const [qty, setQty] = useState("12");
  const [category, setCategory] = useState<VatCategory>("standard");
  const [inclusive, setInclusive] = useState(false);

  const result = useMemo(() => {
    const p = Math.max(0, Number(price) || 0);
    const q = Math.max(0, Number(qty) || 0);
    return calcLineVat(
      { quantity: q, unitPrice: p, vatRate: category === "standard" ? 5 : 0, vatCategory: category },
      { pricesIncludeVat: inclusive }
    );
  }, [price, qty, category, inclusive]);

  const words = useMemo(() => amountInWords(result.lineTotal, "AED"), [result.lineTotal]);

  return (
    <section id="calculator" className="relative scroll-mt-4 py-24 sm:py-32">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-1/2 -z-0 mx-auto h-[520px] max-w-4xl -translate-y-1/2 rounded-full bg-[#7c1cf0]/15 blur-[130px]" />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#c98bff]">Try it right here</p>
          </Reveal>
          <h2 className="mt-3 font-display text-4xl font-extrabold tracking-[-0.035em] text-white sm:text-6xl">
            <WordsReveal text="VAT, worked out." inView />
            <br />
            <WordsReveal text="To the fils." inView delay={0.2} className="text-[#c98bff]" />
          </h2>
          <Reveal delay={0.1}>
            <p className="mx-auto mt-5 max-w-xl text-lg text-white/60">
              This is the same engine that prices every KYRO invoice. Change anything and watch it recalculate.
            </p>
          </Reveal>
        </div>

        <Reveal delay={0.1} className="mx-auto mt-14 grid max-w-5xl gap-6 lg:grid-cols-2">
          {/* inputs */}
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur sm:p-8">
            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-white/50">Unit price (AED)</span>
                <input
                  inputMode="decimal"
                  value={price}
                  onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ""))}
                  className="h-14 w-full rounded-2xl border border-white/12 bg-black/30 px-4 font-mono text-xl font-semibold text-white outline-none transition focus:border-[#b65cff] focus:ring-4 focus:ring-[#b65cff]/20"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-white/50">Quantity</span>
                <input
                  inputMode="numeric"
                  value={qty}
                  onChange={(e) => setQty(e.target.value.replace(/[^0-9]/g, ""))}
                  className="h-14 w-full rounded-2xl border border-white/12 bg-black/30 px-4 font-mono text-xl font-semibold text-white outline-none transition focus:border-[#b65cff] focus:ring-4 focus:ring-[#b65cff]/20"
                />
              </label>
            </div>

            <fieldset className="mt-6">
              <legend className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-white/50">VAT treatment</legend>
              <div className="grid gap-2 sm:grid-cols-3">
                {TREATMENTS.map((t) => {
                  const on = category === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setCategory(t.id)}
                      className={cn(
                        "relative rounded-2xl border px-4 py-3 text-left transition-colors",
                        on ? "border-[#b65cff] text-white" : "border-white/12 text-white/70 hover:border-white/25"
                      )}
                    >
                      {on && (
                        <motion.span
                          layoutId="vat-treatment"
                          className="absolute inset-0 rounded-2xl bg-[#b65cff]/18"
                          transition={{ type: "spring", stiffness: 380, damping: 32 }}
                        />
                      )}
                      <span className="relative block text-[15px] font-semibold">{t.label}</span>
                      <span className="relative mt-0.5 block text-xs text-white/50">{t.hint}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <button
              type="button"
              role="switch"
              aria-checked={inclusive}
              onClick={() => setInclusive((v) => !v)}
              className="mt-6 flex w-full items-center justify-between gap-4 rounded-2xl border border-white/12 bg-black/20 px-4 py-4 text-left transition-colors hover:border-white/25"
            >
              <span>
                <span className="block text-[15px] font-semibold text-white">Prices already include VAT</span>
                <span className="mt-0.5 block text-xs text-white/50">
                  {inclusive ? "VAT is worked out of the price you entered" : "VAT is added on top of the price you entered"}
                </span>
              </span>
              <span className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors duration-300", inclusive ? "bg-[#b65cff]" : "bg-white/20")}>
                <motion.span
                  className="absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow"
                  animate={{ x: inclusive ? 20 : 0 }}
                  transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 30 }}
                />
              </span>
            </button>
          </div>

          {/* receipt */}
          <div className="relative overflow-hidden rounded-3xl border border-white/12 bg-gradient-to-b from-[#1d1738] to-[#120e24] p-6 shadow-[0_40px_120px_-40px_rgba(124,28,240,0.7)] sm:p-8">
            <div className="flex items-center justify-between">
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#c98bff]">Tax invoice · line</p>
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={category + String(inclusive)}
                  initial={reduce ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                  className="rounded-full border border-white/12 px-3 py-1 text-xs font-semibold text-white/70"
                >
                  {category === "standard" ? "VAT 5%" : category === "zero" ? "0% zero-rated" : "Exempt"}
                  {inclusive ? " · incl." : " · excl."}
                </motion.span>
              </AnimatePresence>
            </div>

            <div className="mt-5 divide-y divide-white/10">
              <Row label="Taxable amount">
                <AnimatedMoney value={result.taxableValue} />
              </Row>
              <Row label={category === "standard" ? "VAT 5%" : "VAT"}>
                <AnimatedMoney value={result.vatAmount} />
              </Row>
              <Row label="Total" strong>
                <AnimatedMoney value={result.lineTotal} />
              </Row>
            </div>

            <p className="mt-5 min-h-[3.25rem] text-sm leading-relaxed text-white/50">
              <span className="font-semibold text-white/70">In words: </span>
              {words}
            </p>

            <motion.div
              aria-hidden
              className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#b65cff]/25 blur-[70px]"
              animate={reduce ? undefined : { scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 6, repeat: Infinity, ease: EASE }}
            />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
