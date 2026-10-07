"use client";

import { BUSINESS_TYPE_CONFIG, BUSINESS_TYPE_OPTIONS, type BusinessType } from "@/lib/business-types";
import { formatQty, getUnit } from "@/lib/units";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { ChevronRight, Tag } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AnimatedMoney, EASE, Reveal, WordsReveal } from "./primitives";

type Line = { name: string; qty: number; unit: string; price: number; note?: string };
type Sample = { shop: string; path: [string, string]; lines: Line[] };

/** One believable bill per trade - all priced in AED with 5% VAT. */
const SAMPLES: Record<BusinessType, Sample> = {
  fresh_produce: {
    shop: "Al Mina Fresh Produce",
    path: ["Vegetables", "Leafy greens"],
    lines: [
      { name: "Tomatoes (Jordan)", qty: 2.5, unit: "kg", price: 4.5 },
      { name: "Coriander", qty: 3, unit: "bunch", price: 1.5 },
      { name: "Alphonso mangoes", qty: 1, unit: "box", price: 45 },
    ],
  },
  grocery: {
    shop: "Barsha Mini Mart",
    path: ["Rice, Flour & Grains", "Rice"],
    lines: [
      { name: "Basmati rice (loose)", qty: 5, unit: "kg", price: 7.5 },
      { name: "Fresh milk 2L", qty: 3, unit: "bottle", price: 6.75 },
      { name: "Arabic bread", qty: 2, unit: "pack", price: 2.5 },
    ],
  },
  restaurant: {
    shop: "Marina Bistro & Grill",
    path: ["Mains", "Rice & biryani"],
    lines: [
      { name: "Chicken biryani", qty: 2, unit: "plate", price: 32, note: "Table 4" },
      { name: "Mint lemonade", qty: 3, unit: "pcs", price: 14 },
      { name: "Kunafa", qty: 1, unit: "plate", price: 26 },
    ],
  },
  mobile_shop: {
    shop: "Deira Mobile Hub",
    path: ["Smartphones", "iPhone"],
    lines: [
      { name: "iPhone 16 Pro 256GB", qty: 1, unit: "pcs", price: 4699, note: "IMEI 356789104455210" },
      { name: "20W fast charger", qty: 1, unit: "pcs", price: 89 },
    ],
  },
  pharmacy: {
    shop: "Life Care Pharmacy",
    path: ["Tablets", "Pain relief"],
    lines: [
      { name: "Paracetamol 500mg", qty: 2, unit: "box", price: 8.5, note: "Batch PX-2207" },
      { name: "Vitamin C 1000mg", qty: 1, unit: "bottle", price: 42 },
    ],
  },
  cloth_shop: {
    shop: "Karama Fashion House",
    path: ["Men", "Kandura"],
    lines: [
      { name: "Kandura (white)", qty: 2, unit: "pcs", price: 160, note: "Size 56" },
      { name: "Shayla (chiffon)", qty: 3, unit: "pcs", price: 45 },
      { name: "Linen fabric", qty: 2.5, unit: "m", price: 38 },
    ],
  },
  perfumes_cosmetics: {
    shop: "Oud Al Layl Perfumes",
    path: ["Perfumes", "Attar & perfume oils"],
    lines: [
      { name: "Cambodi oud oil", qty: 2, unit: "tola", price: 180 },
      { name: "Musk attar", qty: 12, unit: "ml", price: 6 },
      { name: "Bakhoor gift set", qty: 1, unit: "set", price: 95 },
    ],
  },
  hardware: {
    shop: "Musaffah Building Supplies",
    path: ["Building Materials", "Cement"],
    lines: [
      { name: "OPC cement 50kg", qty: 20, unit: "bag", price: 18.5 },
      { name: "PVC pipe 4 inch", qty: 12, unit: "m", price: 9.75 },
      { name: "Floor tiles 60x60", qty: 32.5, unit: "sqm", price: 42 },
    ],
  },
  furniture_appliances: {
    shop: "Home Centre Showroom",
    path: ["Living Room", "Sofas"],
    lines: [
      { name: "L-shaped sofa", qty: 1, unit: "pcs", price: 4999, note: "S/N SF-2209-A · Grey linen" },
      { name: "Front-load washer 9kg", qty: 1, unit: "pcs", price: 1899, note: "S/N WM9-551204" },
      { name: "Delivery & installation", qty: 1, unit: "service", price: 150 },
    ],
  },
  auto_parts: {
    shop: "Al Quoz Auto Care",
    path: ["Oils & Fluids", "Engine oil"],
    lines: [
      { name: "Engine oil 5W-30", qty: 4.5, unit: "l", price: 28, note: "Dubai A 12345 · Corolla 2019" },
      { name: "Front brake pads", qty: 1, unit: "set", price: 260 },
      { name: "Labour", qty: 1.5, unit: "hour", price: 120 },
    ],
  },
  wholesale: {
    shop: "Jebel Ali Trading Co.",
    path: ["Food & Beverages", "Beverages"],
    lines: [
      { name: "Water 330ml (24 pack)", qty: 40, unit: "carton", price: 18 },
      { name: "Facial tissues (36 box)", qty: 25, unit: "carton", price: 54 },
    ],
  },
  salon_spa: {
    shop: "Jumeirah Glow Salon",
    path: ["Hair", "Haircut & styling"],
    lines: [
      { name: "Haircut & blow-dry", qty: 1, unit: "service", price: 120 },
      { name: "Moroccan bath", qty: 1, unit: "service", price: 220 },
      { name: "Argan hair serum", qty: 1, unit: "pcs", price: 85 },
    ],
  },
  service_freelancer: {
    shop: "Pixel & Co. Studio",
    path: ["Design", "Branding"],
    lines: [
      { name: "Brand identity design", qty: 1, unit: "service", price: 3500 },
      { name: "Strategy workshop", qty: 6, unit: "hour", price: 300 },
    ],
  },
  jewellery: {
    shop: "Gold Souk Jewellers",
    path: ["Chain", "22K gold"],
    lines: [
      { name: "22K gold chain", qty: 1, unit: "pcs", price: 3860, note: "12.35 g × AED 302/g + making" },
      { name: "Earrings (18K)", qty: 1, unit: "pcs", price: 1240, note: "Hallmark UAE-77821" },
    ],
  },
  hotel: {
    shop: "Creekside Guest House",
    path: ["Deluxe Room", "Room 204"],
    lines: [
      { name: "Deluxe room · 12-15 Oct", qty: 3, unit: "night", price: 450 },
      { name: "Airport pickup", qty: 1, unit: "service", price: 120 },
    ],
  },
  general: {
    shop: "Your Shop LLC",
    path: ["Household", "Storage"],
    lines: [
      { name: "Storage box 40L", qty: 6, unit: "pcs", price: 24 },
      { name: "Packing tape", qty: 3, unit: "roll", price: 7.5 },
    ],
  },
};

const ORDER: BusinessType[] = [
  "fresh_produce",
  "restaurant",
  "hardware",
  "furniture_appliances",
  "perfumes_cosmetics",
  "auto_parts",
  "mobile_shop",
  "pharmacy",
  "cloth_shop",
  "grocery",
  "wholesale",
  "salon_spa",
  "jewellery",
  "hotel",
  "service_freelancer",
  "general",
];

const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function Industries() {
  const reduce = useReducedMotion();
  const [type, setType] = useState<BusinessType>("fresh_produce");
  const [touched, setTouched] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-20% 0px" });

  // Gently tour the industries until the visitor picks one
  useEffect(() => {
    if (touched || reduce || !inView) return;
    const t = window.setInterval(() => {
      setType((cur) => ORDER[(ORDER.indexOf(cur) + 1) % ORDER.length]!);
    }, 3200);
    return () => window.clearInterval(t);
  }, [touched, reduce, inView]);

  const sample = SAMPLES[type];
  const cfg = BUSINESS_TYPE_CONFIG[type];
  const subtotal = sample.lines.reduce((s, l) => s + Math.round(l.qty * l.price * 100) / 100, 0);
  const vat = Math.round(subtotal * 0.05 * 100) / 100;
  const meta = BUSINESS_TYPE_OPTIONS.find((o) => o.value === type)!;

  return (
    <section id="industries" className="relative scroll-mt-20 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#c98bff]">Every kind of business</p>
          </Reveal>
          <h2 className="mt-3 font-display text-4xl font-extrabold tracking-[-0.035em] text-white sm:text-6xl">
            <WordsReveal text="From kilos of tomatoes" inView />
            <br />
            <WordsReveal text="to king-size beds." inView delay={0.25} className="text-[#c98bff]" />
          </h2>
          <Reveal delay={0.2}>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-white/60">
              Sixteen trades built in. Each one brings its own units, categories and invoice fields - weights with decimals,
              serial numbers, vehicle plates, room nights - on the same VAT engine.
            </p>
          </Reveal>
        </div>

        <div ref={ref} className="mt-14 grid items-start gap-8 lg:grid-cols-[1fr_1.05fr]">
          <Reveal>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
              {ORDER.map((id) => {
                const o = BUSINESS_TYPE_OPTIONS.find((x) => x.value === id)!;
                const active = id === type;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setType(id);
                      setTouched(true);
                    }}
                    className={cn(
                      "relative flex items-center gap-2.5 rounded-2xl border px-3 py-3 text-left transition-colors",
                      active ? "border-[#b65cff]/60 text-white" : "border-white/8 bg-white/[0.025] text-white/65 hover:border-white/20 hover:text-white"
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="industry-active"
                        className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#7c1cf0]/35 to-[#b65cff]/15"
                        transition={{ type: "spring", stiffness: 380, damping: 32 }}
                      />
                    )}
                    <span className="relative text-xl leading-none">{o.emoji}</span>
                    <span className="relative text-[13px] font-semibold leading-tight">{o.label}</span>
                  </button>
                );
              })}
            </div>
          </Reveal>

          <Reveal delay={0.1} className="lg:sticky lg:top-28">
            <div className="relative">
              <div aria-hidden className="absolute -inset-6 rounded-[40px] bg-gradient-to-br from-[#7c1cf0]/30 to-transparent blur-3xl" />
              <div className="relative overflow-hidden rounded-3xl border border-white/12 bg-[#120d24]/90 shadow-[0_40px_120px_-30px_rgba(124,28,240,0.6)] backdrop-blur">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={type}
                    initial={{ opacity: 0, y: 16, filter: "blur(6px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, y: -12, filter: "blur(6px)" }}
                    transition={{ duration: 0.45, ease: EASE }}
                    className="p-6 sm:p-7"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/45">Tax invoice · NF-2026-27-0042</p>
                        <p className="mt-1.5 flex items-center gap-2 font-display text-xl font-extrabold text-white">
                          <span>{meta.emoji}</span> {sample.shop}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full border border-white/15 px-2.5 py-1 font-mono text-[10px] text-white/60">TRN ✓</span>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.07] px-2.5 py-1 text-white/80">
                        <Tag className="h-3 w-3 text-[#c98bff]" /> {sample.path[0]}
                      </span>
                      <ChevronRight className="h-3 w-3 text-white/30" />
                      <span className="rounded-full bg-[#b65cff]/20 px-2.5 py-1 text-[#e2c2ff]">{sample.path[1]}</span>
                    </div>

                    <div className="mt-5 divide-y divide-white/[0.07] rounded-2xl border border-white/[0.08] bg-black/25">
                      {sample.lines.map((l, i) => (
                        <motion.div
                          key={l.name}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.12 + i * 0.08, duration: 0.4, ease: EASE }}
                          className="flex items-start justify-between gap-3 px-4 py-3"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-white">{l.name}</p>
                            <p className="mt-0.5 font-mono text-[11px] text-white/50">
                              {formatQty(l.qty, l.unit)} × AED {fmt(l.price)} / {getUnit(l.unit).short}
                            </p>
                            {l.note && <p className="mt-0.5 truncate text-[11px] text-[#d9aaff]">{l.note}</p>}
                          </div>
                          <p className="shrink-0 font-mono text-sm text-white/90">AED {fmt(l.qty * l.price)}</p>
                        </motion.div>
                      ))}
                    </div>

                    <div className="mt-4 space-y-1.5 text-sm">
                      <div className="flex justify-between text-white/55">
                        <span>Taxable amount</span>
                        <span className="font-mono">AED {fmt(subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-white/55">
                        <span>VAT 5%</span>
                        <span className="font-mono">AED {fmt(vat)}</span>
                      </div>
                      <div className="flex items-end justify-between pt-1">
                        <span className="font-semibold text-white">Total</span>
                        <AnimatedMoney value={subtotal + vat} className="font-mono text-2xl font-semibold text-[#6ee7b7]" />
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-1.5">
                      {cfg.units.slice(0, 7).map((u) => (
                        <span key={u} className="rounded-full border border-white/10 px-2 py-0.5 font-mono text-[10px] text-white/55">
                          {getUnit(u).short}
                        </span>
                      ))}
                      <span className="text-[10px] leading-5 text-white/40">units ready to use</span>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
