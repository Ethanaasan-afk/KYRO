"use client";

import { useAuth } from "@/components/auth-provider";
import { APP_NAME, BRAND_LOGO_MARK } from "@/lib/brand";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion, useMotionValueEvent, useScroll, useSpring } from "motion/react";
import { ArrowRight, Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { EASE } from "./primitives";

const LINKS = [
  { href: "/#tour", label: "Product", match: "/" },
  { href: "/#industries", label: "Industries", match: "/" },
  { href: "/pricing", label: "Pricing", match: "/pricing" },
  { href: "/how-it-works", label: "How it works", match: "/how-it-works" },
  { href: "/contact", label: "Contact", match: "/contact" },
];

export function LandingNav() {
  const { user, loading } = useAuth();
  const signedIn = !loading && !!user;
  const pathname = usePathname();
  const { scrollY, scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 28, mass: 0.3 });
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);

  useMotionValueEvent(scrollY, "change", (v) => setScrolled(v > 24));
  useEffect(() => setOpen(false), [pathname]);

  // Sub-pages highlight their own link; the home page highlights nothing
  const activeHref = LINKS.find((l) => l.match !== "/" && pathname.startsWith(l.match))?.href ?? null;
  const pill = hovered ?? activeHref;

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <motion.div
        aria-hidden
        className="absolute inset-x-0 top-0 h-[2px] origin-left bg-gradient-to-r from-[#7c1cf0] via-[#b65cff] to-[#e879f9]"
        style={{ scaleX: progress }}
      />
      <div
        className={cn(
          "mx-3 mt-3 flex h-14 max-w-6xl items-center justify-between gap-4 rounded-2xl border px-4 transition-all duration-500 sm:px-5 lg:mx-auto",
          scrolled || open
            ? "border-white/10 bg-[#0e0b1a]/75 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.6)] backdrop-blur-xl"
            : "border-transparent bg-transparent"
        )}
      >
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <Image src={BRAND_LOGO_MARK} alt="" width={30} height={30} className="h-[30px] w-[30px] object-contain" priority />
          <span className="font-display text-[17px] font-extrabold tracking-tight text-white">{APP_NAME}</span>
        </Link>

        <nav className="hidden items-center md:flex" aria-label="Main" onMouseLeave={() => setHovered(null)}>
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onMouseEnter={() => setHovered(l.href)}
              aria-current={activeHref === l.href ? "page" : undefined}
              className={cn(
                "relative rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                activeHref === l.href ? "text-white" : "text-white/65 hover:text-white"
              )}
            >
              {pill === l.href && (
                <motion.span
                  layoutId="nav-pill"
                  className="absolute inset-0 rounded-lg bg-white/[0.08]"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
              <span className="relative">{l.label}</span>
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {signedIn ? (
            <Link
              href="/dashboard"
              className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-white px-4 text-sm font-semibold text-[#14092b] transition-transform hover:scale-[1.03]"
            >
              Dashboard <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden h-10 items-center px-3 text-sm font-medium text-white/70 transition-colors hover:text-white sm:inline-flex"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="inline-flex h-10 items-center rounded-xl bg-gradient-to-b from-[#b65cff] to-[#7c1cf0] px-4 text-sm font-semibold text-white shadow-[0_8px_30px_-8px_rgba(182,92,255,0.8)] transition-transform hover:scale-[1.04] active:scale-[0.98]"
              >
                Start free
              </Link>
            </>
          )}
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-white md:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            aria-label="Mobile"
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.28, ease: EASE }}
            className="mx-3 mt-2 overflow-hidden rounded-2xl border border-white/10 bg-[#0e0b1a]/95 p-2 backdrop-blur-xl md:hidden"
          >
            {LINKS.map((l, i) => (
              <motion.div key={l.href} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.04 * i }}>
                <Link
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "block rounded-xl px-4 py-3 text-[15px] font-medium hover:bg-white/5",
                    activeHref === l.href ? "bg-white/[0.06] text-white" : "text-white/85"
                  )}
                >
                  {l.label}
                </Link>
              </motion.div>
            ))}
            {!signedIn && (
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="block rounded-xl px-4 py-3 text-[15px] font-medium text-white/85 hover:bg-white/5"
              >
                Log in
              </Link>
            )}
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
