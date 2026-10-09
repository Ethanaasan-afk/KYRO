"use client";

import { AuthLegalFooter } from "@/components/auth/auth-legal-footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { isDemoMode } from "@/lib/demo/mode";
import { APP_NAME, BRAND_LOGO_FULL, BRAND_LOGO_FULL_WHITE } from "@/lib/brand";
import {
  BUSINESS_TYPE_OPTIONS,
  DEFAULT_BUSINESS_TYPE,
  type BusinessType,
} from "@/lib/business-types";
import { createClient } from "@/lib/supabase/client";
import { countryOptions, getCountryConfig, guessCountryFromTimeZone } from "@/lib/vat/countries";
import {
  passwordStrengthChecks,
  signupSchema,
  STRONG_PASSWORD_HINT,
} from "@/lib/validations";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

function friendlySignupError(message: string) {
  if (/already registered|already exists/i.test(message)) {
    return "An account with this email already exists. Sign in instead, or use a different email.";
  }
  if (/password/i.test(message)) return "Please choose a stronger password.";
  if (/rate limit|too many|security purposes/i.test(message)) {
    return "Too many attempts. Please wait a minute and try again.";
  }
  if (/invalid.*email|email.*invalid/i.test(message)) return "Enter a valid email address.";
  if (/signups? not allowed|disabled/i.test(message)) return "New sign-ups are paused right now. Please contact support.";
  return message;
}

export default function SignupPage() {
  const router = useRouter();
  const [businessName, setBusinessName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [businessType, setBusinessType] = useState<BusinessType>(DEFAULT_BUSINESS_TYPE);
  const [country, setCountry] = useState<string>("AE");
  // Start from the visitor's own country (by time zone); they can change it
  useEffect(() => setCountry(guessCountryFromTimeZone()), []);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const demo = isDemoMode();

  useEffect(() => {
    if (demo) router.replace("/dashboard");
  }, [demo, router]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = window.setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [resendIn]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (demo) {
      router.push("/dashboard");
      return;
    }
    setError("");
    const parsed = signupSchema.safeParse({
      business_name: businessName,
      owner_name: ownerName,
      email,
      password,
      business_type: businessType,
      country,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the form and try again");
      return;
    }
    setLoading(true);
    const cleanEmail = email.trim().toLowerCase();
    try {
      const supabase = createClient();
      // Supabase emails a confirmation link (when "Confirm email" is on). The business
      // details ride along in the user's metadata and are used to create the workspace
      // the first time they come back signed in (see /complete-setup).
      const { data, error: signErr } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/complete-setup`,
          data: {
            full_name: ownerName.trim(),
            business_name: businessName.trim(),
            business_type: businessType,
            country,
          },
        },
      });
      if (signErr) {
        setError(friendlySignupError(signErr.message));
        return;
      }
      // An existing, confirmed email comes back as a user with no identities
      if (data.user && (data.user.identities?.length ?? 0) === 0) {
        setError("An account with this email already exists. Sign in instead, or use a different email.");
        return;
      }
      if (!data.session) {
        setSentTo(cleanEmail);
        return;
      }

      // Email confirmation is switched off in Supabase: create the workspace right away
      const res = await fetch("/api/auth/complete-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_name: businessName,
          owner_name: ownerName,
          business_type: businessType,
          country,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        organization_id?: string;
        business_type?: string;
      };
      if (!res.ok) {
        setError(json.error ?? "Your account was created, but setting up the business failed. Sign in to finish.");
        return;
      }
      if (json.organization_id) {
        const { writeLocalBusinessType } = await import("@/lib/business-type-storage");
        const { normalizeBusinessType } = await import("@/lib/business-types");
        writeLocalBusinessType(
          json.organization_id,
          normalizeBusinessType(json.business_type ?? businessType)
        );
      }
      window.location.assign("/dashboard");
    } catch (err) {
      setError((err as Error).message || "Signup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const resendConfirmation = async () => {
    if (!sentTo || resendIn > 0) return;
    setError("");
    const supabase = createClient();
    const { error: err } = await supabase.auth.resend({
      type: "signup",
      email: sentTo,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/complete-setup` },
    });
    if (err) {
      setError(friendlySignupError(err.message));
      return;
    }
    setResendIn(60);
  };

  // FIX: Moved useMemo hook ABOVE the early return so it always runs
  const strength = useMemo(() => passwordStrengthChecks(password), [password]);
  const strengthItems = [
    { ok: strength.minLength, label: "8+ characters" },
    { ok: strength.upper, label: "Uppercase letter" },
    { ok: strength.lower, label: "Lowercase letter" },
    { ok: strength.number, label: "Number" },
    { ok: strength.symbol, label: "Symbol (! @ # $)" },
  ];

  if (demo) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cloud text-sm text-slate">
        Entering demo mode…
      </div>
    );
  }

  const selectedDesc =
    BUSINESS_TYPE_OPTIONS.find((o) => o.value === businessType)?.description ?? "";

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-x-hidden bg-cloud px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))]">
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 20% -10%, rgba(124,28,240,0.18), transparent), radial-gradient(ellipse 60% 40% at 100% 100%, rgba(182,92,255,0.12), transparent)",
        }}
      />
      <div className="panel relative w-full max-w-md p-5 sm:p-8">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="relative mb-3 h-12 w-[200px]">
            <Image
              src={BRAND_LOGO_FULL}
              alt={APP_NAME}
              fill
              priority
              className="object-contain object-center dark:hidden"
              sizes="200px"
            />
            <Image
              src={BRAND_LOGO_FULL_WHITE}
              alt=""
              fill
              priority
              className="hidden object-contain object-center dark:block"
              sizes="200px"
            />
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Start free trial</h1>
          <p className="mt-1 text-xs text-slate">14 days · your own isolated workspace on {APP_NAME}</p>
        </div>

        {sentTo ? (
          <div className="space-y-4 text-center" role="status">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-2xl">
              ✉️
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold text-ink">Check your email</h2>
              <p className="mt-1 text-sm text-slate">
                We sent a confirmation link to <span className="font-medium text-ink">{sentTo}</span>. Open it
                on this device to finish setting up {businessName.trim() || "your business"}.
              </p>
            </div>
            <p className="text-xs text-slate">Can&apos;t find it? Check your spam or promotions folder.</p>
            {error && <p className="text-xs text-rose">{error}</p>}
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              disabled={resendIn > 0}
              onClick={() => void resendConfirmation()}
            >
              {resendIn > 0 ? `Resend link in ${resendIn}s` : "Resend confirmation email"}
            </Button>
            <button
              type="button"
              className="text-xs font-medium text-primary hover:underline"
              onClick={() => {
                setSentTo(null);
                setError("");
              }}
            >
              Use a different email
            </button>
          </div>
        ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <Input
            id="business_name"
            label="Business name"
            required
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
          />
          <div>
            <Select
              id="business_type"
              label="What kind of business is this?"
              required
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value as BusinessType)}
              options={BUSINESS_TYPE_OPTIONS.map((o) => ({
                value: o.value,
                label: `${o.emoji}  ${o.label}`,
              }))}
            />
            <p className="mt-1.5 text-[11px] text-slate">{selectedDesc}</p>
          </div>
          <Select
            id="country"
            label="Country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            options={countryOptions()}
          />
          <p className="-mt-2 text-[11px] text-slate">
            Sets your currency and tax: {getCountryConfig(country).currency},{" "}
            {getCountryConfig(country).taxSystem === "none"
              ? "no VAT"
              : `${getCountryConfig(country).taxName} ${getCountryConfig(country).standardRate}% standard rate`}
            . You can change it later in Settings.
          </p>
          <Input
            id="owner_name"
            label="Your name"
            required
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
          />
          <Input
            id="email"
            label="Email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <div>
            <Input
              id="password"
              label="Password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <p className="mt-1.5 text-[11px] text-slate">{STRONG_PASSWORD_HINT}</p>
            {password.length > 0 && (
              <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                {strengthItems.map((item) => (
                  <li
                    key={item.label}
                    className={item.ok ? "text-emerald" : "text-slate-dim"}
                  >
                    {item.ok ? "✓" : "○"} {item.label}
                  </li>
                ))}
              </ul>
            )}
          </div>
          {error && <p className="text-xs text-rose">{error}</p>}
          <Button type="submit" className="w-full" loading={loading}>
            Create account
          </Button>
          <p className="text-center text-[11px] leading-relaxed text-slate-dim">
            By signing up, you agree to our{" "}
            <Link href="/terms" className="font-medium text-primary hover:underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link
              href="/privacy-policy"
              className="font-medium text-primary hover:underline"
            >
              Privacy Policy
            </Link>
          </p>
        </form>
        )}

        <p className="mt-6 text-center text-xs text-slate">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
        <AuthLegalFooter />
      </div>
    </div>
  );
}
