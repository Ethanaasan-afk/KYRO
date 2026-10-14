"use client";

import { useAuth } from "@/components/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { EmptyState, PageHeader } from "@/components/ui/page-header";
import { useToast } from "@/components/ui/toast";
import { ROLE_LABELS } from "@/lib/constants";
import { APP_NAME } from "@/lib/brand";
import { isDemoMode } from "@/lib/demo/mode";
import { createClient } from "@/lib/supabase/client";
import { KeyRound, ShieldCheck, Smartphone } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type Factor = { id: string; friendly_name?: string; status: string; created_at: string };

function PasswordCard() {
  const { toast } = useToast();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <section className="panel p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <KeyRound className="h-5 w-5" />
        </span>
        <div>
          <h2 className="font-display text-lg font-semibold text-ink">Password</h2>
          <p className="text-sm text-slate">Set or change the password you sign in with.</p>
        </div>
      </div>
      <form
        className="mt-5 grid gap-4 sm:grid-cols-2"
        onSubmit={async (e) => {
          e.preventDefault();
          setError("");
          if (pw.length < 8) return setError("Use at least 8 characters.");
          if (pw !== pw2) return setError("The two passwords don't match.");
          setBusy(true);
          const { error: err } = await createClient().auth.updateUser({ password: pw });
          setBusy(false);
          if (err) {
            setError(
              /reauthenticat|recent/i.test(err.message)
                ? "For safety, sign out and sign in again, then change your password."
                : /aal2|assurance/i.test(err.message)
                  ? "Enter your two-step code first (sign out and in again)."
                  : err.message
            );
            return;
          }
          setPw("");
          setPw2("");
          toast("Password updated");
        }}
      >
        <Input label="New password" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
        <Input label="Type it again" type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
        {error && <p className="text-sm text-coral-deep sm:col-span-2">{error}</p>}
        <div className="sm:col-span-2">
          <Button type="submit" loading={busy} disabled={!pw || !pw2}>
            Update password
          </Button>
        </div>
      </form>
    </section>
  );
}

function TwoStepCard() {
  const { toast } = useToast();
  const [factors, setFactors] = useState<Factor[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [setup, setSetup] = useState<{ factorId: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmOff, setConfirmOff] = useState<Factor | null>(null);

  const load = useCallback(async () => {
    const { data, error: err } = await createClient().auth.mfa.listFactors();
    if (err) {
      setLoadError(err.message);
      return;
    }
    setFactors((data?.all ?? []).filter((f) => f.factor_type === "totp") as Factor[]);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const verified = (factors ?? []).filter((f) => f.status === "verified");

  const start = async () => {
    setError("");
    setBusy(true);
    const supabase = createClient();
    // Clear any half-finished setup so the friendly name is free again
    for (const f of (factors ?? []).filter((x) => x.status !== "verified")) {
      await supabase.auth.mfa.unenroll({ factorId: f.id });
    }
    const { data, error: err } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: `Authenticator ${new Date().toISOString().slice(0, 10)}`,
      issuer: APP_NAME,
    });
    setBusy(false);
    if (err || !data) {
      setError(
        /not enabled|disabled/i.test(err?.message ?? "")
          ? "Two-step verification isn't switched on for this site yet. Ask the site owner to enable TOTP in Supabase → Authentication → Multi-Factor."
          : err?.message ?? "Could not start setup."
      );
      return;
    }
    setSetup({ factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
    setCode("");
  };

  const finish = async () => {
    if (!setup || code.length !== 6) return;
    setBusy(true);
    setError("");
    const { error: err } = await createClient().auth.mfa.challengeAndVerify({ factorId: setup.factorId, code });
    setBusy(false);
    if (err) {
      setError("That code didn't work. Make sure your phone's time is correct and try the current code.");
      return;
    }
    setSetup(null);
    toast("Two-step verification is on");
    await load();
  };

  const turnOff = async (f: Factor) => {
    setBusy(true);
    const { error: err } = await createClient().auth.mfa.unenroll({ factorId: f.id });
    setBusy(false);
    setConfirmOff(null);
    if (err) {
      toast(/aal2/i.test(err.message) ? "Sign out and in again with your code, then turn it off." : err.message, "error");
      return;
    }
    toast("Two-step verification is off");
    await load();
  };

  return (
    <section className="panel p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg font-semibold text-ink">Two-step verification</h2>
          <p className="text-sm text-slate">
            After your password, also enter a code from an authenticator app on your phone. A stolen password alone
            can&apos;t open your business.
          </p>
        </div>
        {factors && (verified.length ? <Badge variant="success">On</Badge> : <Badge variant="warning">Off</Badge>)}
      </div>

      <div className="mt-5">
        {loadError ? (
          <p className="text-sm text-coral-deep">{loadError}</p>
        ) : !factors ? (
          <p className="text-sm text-slate">Loading…</p>
        ) : verified.length ? (
          <ul className="space-y-2">
            {verified.map((f) => (
              <li key={f.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
                <Smartphone className="h-5 w-5 text-slate" />
                <div className="min-w-0 flex-1 text-sm">
                  <p className="font-medium text-ink">{f.friendly_name || "Authenticator app"}</p>
                  <p className="text-xs text-slate">Added {new Date(f.created_at).toLocaleDateString()}</p>
                </div>
                <Button variant="danger" size="sm" onClick={() => setConfirmOff(f)}>
                  Turn off
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <>
            <ol className="mb-4 list-decimal space-y-1 pl-5 text-sm text-slate">
              <li>Install Google Authenticator, Microsoft Authenticator or a similar app.</li>
              <li>Scan the QR code we show you.</li>
              <li>Type the 6-digit code it gives you.</li>
            </ol>
            <Button onClick={start} loading={busy}>
              Turn on two-step verification
            </Button>
            {error && !setup && <p className="mt-3 text-sm text-coral-deep">{error}</p>}
          </>
        )}
      </div>

      {setup && (
        <Modal open onClose={() => setSetup(null)} title="Scan with your authenticator app" size="sm">
          <div className="flex flex-col items-center text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={setup.qr} alt="QR code for your authenticator app" className="h-48 w-48 rounded-xl bg-white p-2" />
            <p className="mt-3 text-xs text-slate">Can&apos;t scan? Enter this key in the app:</p>
            <code className="mt-1 break-all rounded-lg bg-surface-hover px-3 py-1.5 font-mono text-sm text-ink">{setup.secret}</code>
          </div>
          <form
            className="mt-5 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              void finish();
            }}
          >
            <Input
              label="6-digit code from the app"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            />
            {error && <p className="text-sm text-coral-deep">{error}</p>}
            <Button type="submit" className="w-full" loading={busy} disabled={code.length !== 6}>
              Turn on
            </Button>
          </form>
        </Modal>
      )}

      {confirmOff && (
        <Modal open onClose={() => setConfirmOff(null)} title="Turn off two-step verification?" size="sm">
          <p className="text-sm text-slate">Your account will be protected by your password only.</p>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setConfirmOff(null)}>
              Keep it on
            </Button>
            <Button variant="danger" loading={busy} onClick={() => void turnOff(confirmOff)}>
              Turn off
            </Button>
          </div>
        </Modal>
      )}
    </section>
  );
}

export default function AccountPage() {
  const { user, sessionEmail } = useAuth();
  if (isDemoMode()) {
    return (
      <div>
        <PageHeader eyebrow="You" title="My account" description="Password and sign-in security." />
        <EmptyState title="Not available in the demo" description="Sign in to your own account to change your password or turn on two-step verification." />
      </div>
    );
  }
  return (
    <div className="max-w-3xl">
      <PageHeader
        eyebrow="You"
        title="My account"
        description={`${user?.full_name ?? ""}${sessionEmail ? ` · ${sessionEmail}` : ""}${user ? ` · ${ROLE_LABELS[user.role] ?? user.role}` : ""}`}
      />
      <div className="space-y-5">
        <TwoStepCard />
        <PasswordCard />
      </div>
    </div>
  );
}
