"use client";

import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { useEffect } from "react";

/** Number that glides to its new value (on mount and whenever it changes). */
export function CountUp({
  value,
  format,
  duration = 1.1,
  className,
}: {
  value: number;
  format: (n: number) => string;
  duration?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(reduce ? value : 0);
  useEffect(() => {
    if (reduce) {
      mv.set(value);
      return;
    }
    const c = animate(mv, value, { duration, ease: [0.22, 1, 0.36, 1] });
    return () => c.stop();
  }, [value, reduce, duration, mv]);
  const text = useTransform(mv, (n) => format(n));
  return <motion.span className={className}>{text}</motion.span>;
}

/** Circular progress with an animated stroke. */
export function ProgressRing({
  pct,
  size = 132,
  stroke = 12,
  children,
  trackClassName = "stroke-[var(--border)]",
  gradient = ["#7c1cf0", "#d58bff"],
  id = "ring",
}: {
  pct: number;
  size?: number;
  stroke?: number;
  children?: React.ReactNode;
  trackClassName?: string;
  gradient?: [string, string];
  id?: string;
}) {
  const r = (size - stroke) / 2;
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={`${id}-grad`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={gradient[0]} />
            <stop offset="100%" stopColor={gradient[1]} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className={trackClassName} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${id}-grad)`}
          strokeWidth={stroke}
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: clamped / 100 }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}

const CONFETTI = ["#7c1cf0", "#b65cff", "#34d399", "#fbbf24", "#f472b6", "#60a5fa"];

/** One-shot celebratory burst (respects reduced motion). */
export function ConfettiBurst({ fire }: { fire: boolean }) {
  const reduce = useReducedMotion();
  if (!fire || reduce) return null;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-visible">
      {Array.from({ length: 26 }, (_, i) => {
        const angle = (i / 26) * Math.PI * 2;
        const dist = 70 + (i % 5) * 18;
        return (
          <motion.span
            key={i}
            className="absolute left-1/2 top-1/2 h-2 w-1.5 rounded-[2px]"
            style={{ background: CONFETTI[i % CONFETTI.length] }}
            initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 1 }}
            animate={{
              x: Math.cos(angle) * dist,
              y: Math.sin(angle) * dist + 40,
              opacity: 0,
              rotate: 360 + i * 20,
              scale: 0.6,
            }}
            transition={{ duration: 1.6, ease: "easeOut", delay: 0.2 + (i % 4) * 0.04 }}
          />
        );
      })}
    </div>
  );
}
