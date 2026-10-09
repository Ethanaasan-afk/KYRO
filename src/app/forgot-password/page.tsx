"use client";

import { AuthCard } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = window.setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [resendIn]);

  const send = async () => {
    setError("");
    const clean = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      setError("Enter the email you use to sign in.");
      return;
    }
    setLoading(true);
    const { error: err } = await createClient().auth.resetPasswordForEmail(clean, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });
    setLoading(false);
    // Same message whether or not the account exists, so this page can't be used
    // to find out who has an account.
    if (err && /rate limit|too many|security purposes/i.test(err.message)) {
      setError("Too many requests. Please wait a minute and try again.");
      return;
    }
    setSent(true);
    setResendIn(60);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await send();
  };

  return (
    <AuthCard title="Reset your password" subtitle="We'll email you a link to choose a new one.">
      {sent ? (
        <div className="space-y-4 text-center" role="status">
          <p className="text-sm text-slate">
            If an account exists for <span className="font-medium text-ink">{email.trim().toLowerCase()}</span>, a reset
            link is on its way. Open it on this device. It expires in an hour.
          </p>
          <p className="text-xs text-slate">Can&apos;t find it? Check your spam or promotions folder.</p>
          {error && <p className="text-xs text-rose">{error}</p>}
          <Button type="button" variant="secondary" className="w-full" disabled={resendIn > 0} loading={loading} onClick={() => void send()}>
            {resendIn > 0 ? `Send again in ${resendIn}s` : "Send the link again"}
          </Button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <Input
            id="email"
            label="Email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {error && <p className="text-xs text-rose">{error}</p>}
          <Button type="submit" className="w-full" loading={loading}>
            Send reset link
          </Button>
        </form>
      )}
      <p className="mt-6 text-center text-xs text-slate">
        Remembered it?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Back to sign in
        </Link>
      </p>
    </AuthCard>
  );
}
