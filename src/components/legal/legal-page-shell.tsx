import { LandingFooter } from "@/components/marketing/landing/landing-footer";
import { LandingNav } from "@/components/marketing/landing/landing-nav";
import { APP_NAME, LEGAL_ENTITY_NAME, LEGAL_SUPPORT_EMAIL } from "@/lib/brand";
import type { ReactNode } from "react";

/** Legal pages share the dark website shell (nav, footer) with readable long-form text. */
export function LegalPageShell({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <div className="dark landing relative min-h-screen overflow-x-clip">
      <LandingNav />
      <div aria-hidden className="pointer-events-none absolute -top-56 left-1/2 h-[560px] w-[860px] -translate-x-1/2 rounded-full bg-[#7c1cf0]/20 blur-[130px]" />
      <main className="relative mx-auto max-w-3xl px-4 pb-20 pt-32 sm:px-6 sm:pt-40">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#c98bff]">Legal</p>
        <h1 className="mt-3 font-display text-4xl font-extrabold tracking-[-0.035em] text-white sm:text-5xl">{title}</h1>
        <p className="mt-3 text-sm text-white/50">Last updated: {updated}</p>

        <article className="mt-10 space-y-10 rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-[15px] leading-relaxed text-white/80 sm:p-10">
          {children}
        </article>

        <p className="mt-10 text-center text-xs text-white/40">
          {APP_NAME} is a product of {LEGAL_ENTITY_NAME}. Questions?{" "}
          <a href={`mailto:${LEGAL_SUPPORT_EMAIL}`} className="font-medium text-[#d9aaff] hover:underline">
            {LEGAL_SUPPORT_EMAIL}
          </a>
        </p>
      </main>
      <LandingFooter />
    </div>
  );
}

export function LegalSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-28 space-y-3">
      <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>
      <div className="space-y-3 text-slate [&_strong]:font-semibold [&_strong]:text-ink [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
        {children}
      </div>
    </section>
  );
}
