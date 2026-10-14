"use client";

import { AuthLegalFooter } from "@/components/auth/auth-legal-footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { APP_NAME, BRAND_LOGO_FULL, BRAND_LOGO_FULL_WHITE } from "@/lib/brand";
import { safeRedirectPath } from "@/lib/security/request";
import { createClient } from "@/lib/supabase/client";
import { ShieldCheck } from "lucide-react";
import Image from "next/image";
import { FormEvent, useEffect, useState } from "react";

/** Second step of sign-in for accounts with two-step verification turned on. */
export default function MfaPage() {
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  const next = () =>
    safeRedirectPath(typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("next"));

  useEffect(() => {
    void (async () => {
      const supabase = createClient();
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (!aal || aal.currentLevel === "aal2" || aal.nextLevel !== "aal2") {
        // Nothing to verify (no 2FA, already verified, or signed out)
        window.location.replace(aal ? next() : "/login");
        return;
      }
      const { data } = await supabase.auth.mfa.listFactors();
      const totp = data?.totp?.find((f) => f.status === "verified");
      if (!totp) {
        window.location.replace(next());
        return;
      }
      setFactorId(totp.id);
      setReady(true);
    })();
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!factorId || code.length !== 6) {
      setError("Enter the 6-digit code from your authenticator app.");
      return;
    }
    setLoading(true);
    setError("");
    const { error: err } = await createClient().auth.mfa.challengeAndVerify({ factorId, code });
    setLoading(false);
    if (err) {
      setCode("");
      setError(/rate|too many/i.test(err.message) ? "Too many tries. Wait a minute and try again." : "That code didn't work. Codes change every 30 seconds - try the current one.");
      return;
    }
    window.location.assign(next());
  };

  const signOut = async () => {
    await createClient().auth.signOut();
    window.location.assign("/login");
  };

  return (
    <div className="relative flex min-h-dvh items-center justify-center bg-cloud px-4 py-6">
      <div className="panel relative w-full max-w-sm p-5 sm:p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="relative mb-4 h-12 w-[190px]">
            <Image src={BRAND_LOGO_FULL} alt={APP_NAME} fill priority className="object-contain dark:hidden" sizes="190px" />
            <Image src={BRAND_LOGO_FULL_WHITE} alt="" fill priority className="hidden object-contain dark:block" sizes="190px" />
          </div>
          <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <ShieldCheck className="h-6 w-6" />
          </span>
          <h1 className="font-display text-xl font-bold text-ink">Two-step verification</h1>
          <p className="mt-1 text-sm text-slate">Open your authenticator app and enter the 6-digit code for {APP_NAME}.</p>
        </div>

        {!ready ? (
          <p className="text-center text-sm text-slate">Checking your account…</p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <Input
              id="mfa-code"
              label="6-digit code"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            />
            {error && <p className="text-xs text-rose">{error}</p>}
            <Button type="submit" className="w-full" loading={loading} disabled={code.length !== 6}>
              Verify
            </Button>
          </form>
        )}

        <p className="mt-5 text-center text-xs text-slate">
          Lost your phone? Ask your business admin, or contact support to reset two-step verification.{" "}
          <button type="button" onClick={() => void signOut()} className="font-medium text-primary hover:underline">
            Sign out
          </button>
        </p>
        <AuthLegalFooter />
      </div>
    </div>
  );
}
