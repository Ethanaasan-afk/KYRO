"use client";

import { AuthCard } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { passwordStrengthChecks, strongPasswordSchema, STRONG_PASSWORD_HINT } from "@/lib/validations";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

/** Reached from the reset email (via /auth/callback, which signs the user in). */
export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    void createClient()
      .auth.getUser()
      .then(({ data }) => setHasSession(Boolean(data.user)));
  }, []);

  const strength = useMemo(() => passwordStrengthChecks(password), [password]);
  const strengthItems = [
    { ok: strength.minLength, label: "8+ characters" },
    { ok: strength.upper, label: "Uppercase letter" },
    { ok: strength.lower, label: "Lowercase letter" },
    { ok: strength.number, label: "Number" },
    { ok: strength.symbol, label: "Symbol (! @ # $)" },
  ];

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    const parsed = strongPasswordSchema.safeParse(password);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? STRONG_PASSWORD_HINT);
      return;
    }
    if (password !== confirm) {
      setError("The two passwords don't match.");
      return;
    }
    setLoading(true);
    const { error: err } = await createClient().auth.updateUser({ password });
    setLoading(false);
    if (err) {
      setError(
        /same|different from the old/i.test(err.message)
          ? "Choose a password you haven't used before."
          : /session|expired|jwt/i.test(err.message)
            ? "This reset link has expired. Request a new one."
            : err.message
      );
      return;
    }
    setDone(true);
    window.setTimeout(() => window.location.assign("/dashboard"), 1500);
  };

  if (hasSession === false) {
    return (
      <AuthCard title="Link expired" subtitle="Reset links work once and expire after an hour.">
        <Link href="/forgot-password">
          <Button type="button" className="w-full">
            Send a new reset link
          </Button>
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Choose a new password" subtitle="You'll stay signed in after saving it.">
      {done ? (
        <p className="text-center text-sm text-emerald" role="status">
          Password updated. Taking you to your dashboard…
        </p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Input
              id="password"
              label="New password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {password.length > 0 && (
              <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                {strengthItems.map((item) => (
                  <li key={item.label} className={item.ok ? "text-emerald" : "text-slate-dim"}>
                    {item.ok ? "✓" : "○"} {item.label}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <Input
            id="confirm"
            label="Type it again"
            type="password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
          {error && <p className="text-xs text-rose">{error}</p>}
          <Button type="submit" className="w-full" loading={loading || hasSession === null}>
            Save new password
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
