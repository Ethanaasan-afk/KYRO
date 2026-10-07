"use client";

import { APP_NAME, BRAND_LOGO_MARK } from "@/lib/brand";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Magnetic, Reveal, WordsReveal } from "./primitives";

export function FinalCta() {
  const reduce = useReducedMotion();
  return (
    <section className="relative overflow-hidden py-28 sm:py-40">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <motion.div
          className="absolute left-1/2 top-1/2 h-[820px] w-[820px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#7c1cf0]/35 blur-[140px]"
          animate={reduce ? undefined : { scale: [1, 1.18, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        />
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#b65cff]/30"
            animate={reduce ? undefined : { scale: [0.6, 2.4], opacity: [0.5, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeOut", delay: i * 1.6 }}
          />
        ))}
      </div>

      <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
        <Reveal y={16}>
          <Image src={BRAND_LOGO_MARK} alt="" width={84} height={84} className="mx-auto h-[84px] w-[84px] object-contain" />
        </Reveal>
        <h2 className="mt-8 font-display text-5xl font-extrabold leading-[1.03] tracking-[-0.04em] text-white sm:text-7xl">
          <WordsReveal text="Ready to let your" inView />
          <br />
          <WordsReveal text="billing flow?" inView delay={0.25} wordClassName="landing-sheen" />
        </h2>
        <Reveal delay={0.1}>
          <p className="mx-auto mt-6 max-w-xl text-lg text-white/65">
            Start your 14-day free trial on {APP_NAME}. No card required. Add your products and send your first VAT tax invoice this week.
          </p>
        </Reveal>
        <Reveal delay={0.2}>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Magnetic>
              <Link
                href="/signup"
                className="group inline-flex h-14 items-center gap-2 rounded-2xl bg-white px-8 text-[15px] font-bold text-[#14092b] shadow-[0_20px_60px_-15px_rgba(255,255,255,0.5)] transition-transform hover:scale-[1.03]"
              >
                Start free trial
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Magnetic>
            <Link
              href="/login"
              className="inline-flex h-14 items-center rounded-2xl border border-white/20 px-7 text-[15px] font-semibold text-white transition-colors hover:bg-white/10"
            >
              Log in
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
