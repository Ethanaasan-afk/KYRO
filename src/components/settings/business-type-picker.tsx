"use client";

import { BUSINESS_TYPE_OPTIONS, type BusinessType } from "@/lib/business-types";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import { Check } from "lucide-react";

/** Visual picker: one tile per business type (vegetable stall to furniture showroom). */
export function BusinessTypePicker({
  value,
  onChange,
  compact = false,
  tone = "app",
}: {
  value: BusinessType | string | undefined;
  onChange: (value: BusinessType) => void;
  compact?: boolean;
  /** "auth" renders on the signup card */
  tone?: "app" | "auth";
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Business type"
      className={cn("grid gap-2", compact ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4")}
    >
      {BUSINESS_TYPE_OPTIONS.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "group relative flex min-h-[64px] items-start gap-2.5 rounded-[12px] border p-2.5 text-left transition-all",
              active
                ? "border-primary bg-primary-soft shadow-[0_6px_16px_-8px_rgba(124,28,240,0.45)]"
                : tone === "auth"
                  ? "border-border bg-surface hover:border-primary/40"
                  : "border-border bg-surface hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm"
            )}
          >
            <span className="text-xl leading-none" aria-hidden>
              {o.emoji}
            </span>
            <span className="min-w-0">
              <span className={cn("block text-[13px] font-semibold leading-tight", active ? "text-primary" : "text-ink")}>
                {o.label}
              </span>
              {!compact && <span className="mt-0.5 line-clamp-2 block text-[11px] leading-snug text-slate">{o.tagline}</span>}
            </span>
            {active && (
              <motion.span
                layoutId={`bt-check-${tone}`}
                className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-white"
              >
                <Check className="h-2.5 w-2.5" />
              </motion.span>
            )}
          </button>
        );
      })}
    </div>
  );
}
