"use client";

import { SelfieCamera, type SelfieCameraHandle } from "@/components/attendance/selfie-camera";
import { cn } from "@/lib/utils";
import { Check, Delete, LogIn, LogOut } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export type PunchResult = { kind: "in" | "out"; at: string; name: string };

function greeting(d: Date) {
  const h = d.getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

/**
 * PIN keypad with a live selfie preview. The photo is taken the moment the
 * PIN is confirmed, so it shows the person who typed it.
 */
export function PunchPad({
  name,
  onSubmit,
  onDone,
  doneAfterMs = 4000,
}: {
  name: string;
  onSubmit: (pin: string, photo: string) => Promise<PunchResult>;
  onDone?: () => void;
  doneAfterMs?: number;
}) {
  const camRef = useRef<SelfieCameraHandle>(null);
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fallbackPhoto, setFallbackPhoto] = useState<string | null>(null);
  const [result, setResult] = useState<(PunchResult & { photo: string }) | null>(null);

  useEffect(() => {
    if (!result || !onDone) return;
    const t = window.setTimeout(onDone, doneAfterMs);
    return () => window.clearTimeout(t);
  }, [result, onDone, doneAfterMs]);

  const submit = async () => {
    if (pin.length < 4 || busy) return;
    const photo = camRef.current?.capture() ?? fallbackPhoto;
    if (!photo) {
      setError("We need your photo. Allow the camera, or tap the box to take one.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const r = await onSubmit(pin, photo);
      setResult({ ...r, photo });
    } catch (e) {
      setError((e as Error).message);
      setPin("");
    } finally {
      setBusy(false);
    }
  };

  const press = (k: string) => {
    setError("");
    if (k === "del") setPin((p) => p.slice(0, -1));
    else if (k === "ok") void submit();
    else setPin((p) => (p.length < 6 ? p + k : p));
  };

  useEffect(() => {
    if (result) return;
    const onKey = (e: KeyboardEvent) => {
      const key = /^\d$/.test(e.key) ? e.key : e.key === "Backspace" ? "del" : e.key === "Enter" ? "ok" : null;
      if (!key) return;
      // Stop Enter from also "clicking" whichever keypad button has focus
      e.preventDefault();
      press(key);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (result) {
    const at = new Date(result.at);
    const isIn = result.kind === "in";
    return (
      <div className="flex flex-col items-center py-4 text-center" role="status">
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={result.photo} alt="" className="h-36 w-36 rounded-full object-cover ring-4 ring-white/20" />
          <span
            className={cn(
              "absolute -bottom-1 -right-1 flex h-11 w-11 items-center justify-center rounded-full text-white",
              isIn ? "bg-emerald-500" : "bg-amber-500"
            )}
          >
            {isIn ? <LogIn className="h-5 w-5" /> : <LogOut className="h-5 w-5" />}
          </span>
        </div>
        <p className="mt-5 text-lg text-white/70">{isIn ? greeting(at) : "See you next time"},</p>
        <p className="font-display text-3xl font-bold text-white">{result.name.split(" ")[0]}</p>
        <p className={cn("mt-3 rounded-full px-4 py-1.5 text-base font-semibold", isIn ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-200")}>
          Checked {isIn ? "in" : "out"} at {at.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
        {onDone && (
          <button onClick={onDone} className="mt-6 text-sm text-white/60 underline-offset-4 hover:underline">
            Done
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col items-center">
      <p className="text-sm text-white/60">Hi {name.split(" ")[0]}, look at the camera and enter your PIN</p>
      <div className="relative mt-4 w-48">
        {fallbackPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={fallbackPhoto} alt="Your photo" className="aspect-square w-full rounded-full object-cover" />
        ) : (
          <SelfieCamera ref={camRef} round onFallbackPhoto={setFallbackPhoto} />
        )}
      </div>

      <div className="mt-5 flex h-6 items-center gap-3" aria-label={`${pin.length} digits entered`}>
        {Array.from({ length: Math.max(4, pin.length) }).map((_, i) => (
          <span key={i} className={cn("h-3.5 w-3.5 rounded-full border-2 border-white/50", i < pin.length && "border-white bg-white")} />
        ))}
      </div>
      <p className="mt-2 min-h-[20px] text-center text-sm text-rose-300" role="alert">
        {error}
      </p>

      <div className="mt-2 grid w-full grid-cols-3 gap-3">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "del", "0", "ok"].map((k) => (
          <button
            key={k}
            type="button"
            disabled={busy || (k === "ok" && pin.length < 4)}
            onClick={() => press(k)}
            aria-label={k === "del" ? "Delete" : k === "ok" ? "Confirm" : k}
            className={cn(
              "flex h-16 items-center justify-center rounded-2xl text-2xl font-semibold transition-all active:scale-95 disabled:opacity-40",
              k === "ok"
                ? "bg-gradient-to-b from-[#b65cff] to-[#7c1cf0] text-white"
                : "bg-white/10 text-white hover:bg-white/15"
            )}
          >
            {k === "del" ? <Delete className="h-6 w-6" /> : k === "ok" ? busy ? <span className="h-6 w-6 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <Check className="h-7 w-7" /> : k}
          </button>
        ))}
      </div>
    </div>
  );
}
