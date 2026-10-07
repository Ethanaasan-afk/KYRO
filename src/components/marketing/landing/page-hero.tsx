"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { EASE, WordsReveal } from "./primitives";

/** Animated header for sub-pages (pricing, how it works, contact). */
export function PageHero({
  eyebrow,
  title,
  accent,
  body,
  children,
}: {
  eyebrow: string;
  title: string;
  /** Second line, rendered in the gradient sheen */
  accent?: string;
  body?: string;
  children?: ReactNode;
}) {
  const reduce = useReducedMotion();
  return (
    <section className="relative overflow-hidden pb-14 pt-32 sm:pb-20 sm:pt-40">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <motion.div
          className="absolute -top-56 left-1/2 h-[620px] w-[920px] -translate-x-1/2 rounded-full bg-[#7c1cf0]/25 blur-[130px]"
          animate={reduce ? undefined : { scale: [1, 1.08, 1], opacity: [0.85, 1, 0.85] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
        <div
          className="absolute inset-0 opacity-50"
          style={{
            backgroundImage:
              "linear-gradient(rgba(182,140,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(182,140,255,0.07) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
            WebkitMaskImage: "radial-gradient(ellipse 60% 55% at 50% 20%, #000 15%, transparent 100%)",
            maskImage: "radial-gradient(ellipse 60% 55% at 50% 20%, #000 15%, transparent 100%)",
          }}
        />
      </div>
      <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
        <motion.p
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-4 py-1.5 text-[13px] font-medium text-white/80 backdrop-blur"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-[#b65cff]" />
          {eyebrow}
        </motion.p>
        <h1 className="mt-6 font-display text-[42px] font-extrabold leading-[1.04] tracking-[-0.045em] text-white sm:text-6xl lg:text-7xl">
          <WordsReveal text={title} delay={0.1} />
          {accent && (
            <>
              <br />
              <WordsReveal text={accent} wordClassName="landing-sheen" delay={0.3} />
            </>
          )}
        </h1>
        {body && (
          <motion.p
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE, delay: 0.6 }}
            className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/60"
          >
            {body}
          </motion.p>
        )}
        {children && (
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE, delay: 0.75 }}
            className="mt-8"
          >
            {children}
          </motion.div>
        )}
      </div>
    </section>
  );
}
