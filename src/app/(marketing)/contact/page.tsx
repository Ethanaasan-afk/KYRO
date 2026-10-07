"use client";

import { PageHero } from "@/components/marketing/landing/page-hero";
import { EASE, Reveal } from "@/components/marketing/landing/primitives";
import { APP_NAME, LEGAL_ENTITY_NAME, LEGAL_SUPPORT_EMAIL } from "@/lib/brand";
import { BUSINESS_TYPE_OPTIONS } from "@/lib/business-types";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, CalendarCheck, CheckCircle2, LifeBuoy, Mail, Send } from "lucide-react";
import Link from "next/link";
import { type FormEvent, useState } from "react";

const TOPICS = ["Sales question", "Book a walkthrough", "Support", "Partnership"] as const;

const field =
  "h-12 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 text-[15px] text-white placeholder:text-white/30 outline-none transition-all focus:border-[#b65cff]/60 focus:bg-white/[0.06] focus:ring-4 focus:ring-[#b65cff]/15";

export default function ContactPage() {
  const [topic, setTopic] = useState<(typeof TOPICS)[number]>("Sales question");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [business, setBusiness] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const subject = `${APP_NAME} · ${topic} from ${name || "website"}`;
    const body = [
      `Name: ${name}`,
      `Email: ${email}`,
      business ? `Business type: ${business}` : null,
      "",
      message,
    ]
      .filter((l) => l !== null)
      .join("\n");
    const params = new URLSearchParams({ subject, body }).toString().replace(/\+/g, "%20");
    window.location.href = `mailto:${LEGAL_SUPPORT_EMAIL}?${params}`;
    setSent(true);
  };

  const cards = [
    {
      icon: Mail,
      title: "Email us",
      body: "Questions about plans, VAT or moving from another system.",
      action: LEGAL_SUPPORT_EMAIL,
      href: `mailto:${LEGAL_SUPPORT_EMAIL}`,
    },
    {
      icon: CalendarCheck,
      title: "See it with your data",
      body: "A 20-minute walkthrough set up for your kind of business.",
      action: "Book a walkthrough",
      href: `mailto:${LEGAL_SUPPORT_EMAIL}?subject=${encodeURIComponent(`${APP_NAME} walkthrough request`)}`,
    },
    {
      icon: LifeBuoy,
      title: "Already a customer?",
      body: "Log in and use the in-app guide, or read the how-to.",
      action: "Read the guide",
      href: "/how-it-works",
    },
  ];

  return (
    <main>
      <PageHero
        eyebrow="Contact"
        title="Talk to a human."
        accent="We reply fast."
        body="Sales, support or partnerships - tell us a little about your business and we'll get back to you by email."
      />

      <section className="relative pb-24">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:px-6 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="space-y-3">
            {cards.map((c, i) => (
              <Reveal key={c.title} delay={i * 0.08}>
                <Link
                  href={c.href}
                  className="group flex gap-4 rounded-3xl border border-white/10 bg-white/[0.03] p-5 transition-all hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.05]"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-b from-[#b65cff]/30 to-[#7c1cf0]/20 text-[#e2c2ff]">
                    <c.icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-display text-lg font-bold text-white">{c.title}</span>
                    <span className="mt-1 block text-sm leading-relaxed text-white/55">{c.body}</span>
                    <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[#d9aaff] group-hover:text-white">
                      {c.action}
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </span>
                  </span>
                </Link>
              </Reveal>
            ))}
            <Reveal delay={0.3}>
              <p className="px-2 pt-3 text-xs text-white/35">{APP_NAME} is a product of {LEGAL_ENTITY_NAME}.</p>
            </Reveal>
          </div>

          <Reveal delay={0.1}>
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#110c22]/80 p-6 shadow-[0_40px_120px_-40px_rgba(124,28,240,0.6)] backdrop-blur sm:p-8">
              <AnimatePresence mode="wait">
                {sent ? (
                  <motion.div
                    key="sent"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, ease: EASE }}
                    className="flex flex-col items-center py-12 text-center"
                  >
                    <motion.span
                      initial={{ scale: 0, rotate: -25 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 360, damping: 16 }}
                      className="flex h-16 w-16 items-center justify-center rounded-full bg-[#34d399]/15 text-[#6ee7b7]"
                    >
                      <CheckCircle2 className="h-9 w-9" />
                    </motion.span>
                    <p className="mt-5 font-display text-2xl font-extrabold text-white">Your email is ready</p>
                    <p className="mt-2 max-w-sm text-sm text-white/60">
                      Your mail app should have opened with the message filled in - just press send. If nothing opened, write to{" "}
                      <a className="text-[#d9aaff] underline" href={`mailto:${LEGAL_SUPPORT_EMAIL}`}>
                        {LEGAL_SUPPORT_EMAIL}
                      </a>
                      .
                    </p>
                    <button type="button" onClick={() => setSent(false)} className="mt-6 text-sm font-semibold text-white/70 hover:text-white">
                      Write another message
                    </button>
                  </motion.div>
                ) : (
                  <motion.form key="form" onSubmit={onSubmit} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
                    <div>
                      <p className="text-sm font-medium text-white/70">What&apos;s this about?</p>
                      <div className="mt-2.5 flex flex-wrap gap-2">
                        {TOPICS.map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setTopic(t)}
                            className={cn(
                              "relative rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                              topic === t ? "border-[#b65cff]/60 text-white" : "border-white/10 text-white/60 hover:text-white"
                            )}
                          >
                            {topic === t && (
                              <motion.span layoutId="topic" className="absolute inset-0 rounded-full bg-[#7c1cf0]/30" transition={{ type: "spring", stiffness: 380, damping: 30 }} />
                            )}
                            <span className="relative">{t}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block">
                        <span className="text-sm font-medium text-white/70">Your name</span>
                        <input required value={name} onChange={(e) => setName(e.target.value)} className={cn(field, "mt-2")} placeholder="Aisha Khan" />
                      </label>
                      <label className="block">
                        <span className="text-sm font-medium text-white/70">Email</span>
                        <input
                          required
                          type="email"
                          autoComplete="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className={cn(field, "mt-2")}
                          placeholder="you@business.ae"
                        />
                      </label>
                    </div>
                    <label className="block">
                      <span className="text-sm font-medium text-white/70">Your business</span>
                      <select value={business} onChange={(e) => setBusiness(e.target.value)} className={cn(field, "mt-2 appearance-none")}>
                        <option value="" className="bg-[#110c22]">
                          Choose your trade (optional)
                        </option>
                        {BUSINESS_TYPE_OPTIONS.map((o) => (
                          <option key={o.value} value={o.label} className="bg-[#110c22]">
                            {o.emoji} {o.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-sm font-medium text-white/70">Message</span>
                      <textarea
                        required
                        rows={5}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Tell us what you sell and how you bill today…"
                        className={cn(field, "mt-2 h-auto py-3 leading-relaxed")}
                      />
                    </label>
                    <button
                      type="submit"
                      className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-[#b65cff] to-[#7c1cf0] text-[15px] font-semibold text-white shadow-[0_18px_50px_-12px_rgba(182,92,255,0.9)] transition-transform hover:scale-[1.01] active:scale-[0.99] sm:w-auto sm:px-8"
                    >
                      <Send className="h-4 w-4" /> Send message
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </Reveal>
        </div>
      </section>
    </main>
  );
}
