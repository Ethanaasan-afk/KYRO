"use client";

import { useAuth } from "@/components/auth-provider";
import { PunchPad } from "@/components/attendance/punch-pad";
import { useOrganization } from "@/hooks/use-company";
import { useAttendance, useAttendanceMutations, useEmployees, usePhotoUrls } from "@/hooks/use-staff";
import { addDays, browserTimeZone, localDate, localDayStart, localTime } from "@/lib/attendance";
import { APP_NAME } from "@/lib/brand";
import type { Employee } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ArrowLeft, Maximize, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function Clock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(t);
  }, []);
  if (!now) return null;
  return (
    <div className="text-right">
      <p className="font-display text-4xl font-bold tabular-nums text-white sm:text-5xl">
        {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </p>
      <p className="text-sm text-white/60">{now.toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" })}</p>
    </div>
  );
}

export default function KioskPage() {
  const { user, loading, isReadOnly } = useAuth();
  const { data: org } = useOrganization();
  const { data: employees, error } = useEmployees();
  const tz = browserTimeZone();
  const today = localDate(new Date(), tz);
  const from = localDayStart(today, tz).toISOString();
  const to = localDayStart(addDays(today, 1), tz).toISOString();
  const { data: punches } = useAttendance(from, to);
  const { punch } = useAttendanceMutations();
  const [picked, setPicked] = useState<Employee | null>(null);
  const [filter, setFilter] = useState("");

  const active = useMemo(() => (employees ?? []).filter((e) => e.active), [employees]);
  const photos = usePhotoUrls(active.map((e) => e.photo_path));
  const status = useMemo(() => {
    const map = new Map<string, { kind: string; at: string }>();
    for (const p of [...(punches ?? [])].sort((a, b) => a.at.localeCompare(b.at))) map.set(p.employee_id, p);
    return map;
  }, [punches]);

  const shown = active.filter((e) => e.full_name.toLowerCase().includes(filter.trim().toLowerCase()));

  if (!loading && user && isReadOnly) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#0d0a1a] p-6 text-center text-white">
        <p>Accountant accounts can&apos;t run the attendance kiosk. Sign in as an admin or staff user.</p>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-[radial-gradient(ellipse_at_top,#2a1650,#0d0a1a_60%)] text-white">
      <header className="flex items-start justify-between gap-4 px-4 pb-4 pt-5 sm:px-8">
        <div>
          <Link href="/attendance" className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Exit kiosk
          </Link>
          <h1 className="mt-2 font-display text-2xl font-bold sm:text-3xl">{org?.brand_name || org?.name || APP_NAME}</h1>
          <p className="text-white/60">Tap your name to check in or out</p>
        </div>
        <div className="flex items-start gap-3">
          <Clock />
          <button
            onClick={() => document.documentElement.requestFullscreen?.().catch(() => undefined)}
            className="hidden rounded-xl bg-white/10 p-2.5 text-white/70 hover:bg-white/15 sm:block"
            aria-label="Full screen"
            title="Full screen"
          >
            <Maximize className="h-5 w-5" />
          </button>
        </div>
      </header>

      <section className="px-4 pb-10 sm:px-8">
        {error ? (
          <p className="rounded-2xl bg-rose-500/15 p-4 text-rose-200">{(error as Error).message}</p>
        ) : !employees ? (
          <p className="text-white/50">Loading staff…</p>
        ) : !active.length ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
            <p className="text-lg">No staff added yet.</p>
            <Link href="/staff" className="mt-3 inline-block text-[#d9aaff] underline-offset-4 hover:underline">
              Add your team in Staff
            </Link>
          </div>
        ) : (
          <>
            {active.length > 12 && (
              <input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Find your name"
                className="mb-4 h-12 w-full max-w-sm rounded-2xl border border-white/15 bg-white/10 px-4 text-white placeholder:text-white/40 outline-none focus:border-white/40"
              />
            )}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {shown.map((e) => {
                const s = status.get(e.id);
                const isIn = s?.kind === "in";
                const photo = e.photo_path ? photos.data?.[e.photo_path] : null;
                return (
                  <button
                    key={e.id}
                    onClick={() => setPicked(e)}
                    className="flex flex-col items-center rounded-3xl border border-white/10 bg-white/[0.06] p-4 text-center transition-all hover:-translate-y-0.5 hover:bg-white/10 active:scale-[0.98]"
                  >
                    <span className="relative">
                      {photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={photo} alt="" className="h-20 w-20 rounded-full object-cover" />
                      ) : (
                        <span className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#7c1cf0] to-[#b65cff] text-2xl font-bold">
                          {initials(e.full_name)}
                        </span>
                      )}
                      <span
                        className={cn(
                          "absolute bottom-0.5 right-0.5 h-5 w-5 rounded-full border-[3px] border-[#1b1233]",
                          isIn ? "bg-emerald-400" : s ? "bg-amber-400" : "bg-white/30"
                        )}
                      />
                    </span>
                    <span className="mt-3 line-clamp-1 font-semibold">{e.full_name}</span>
                    <span className="text-xs text-white/50">
                      {isIn ? `In since ${localTime(s!.at, tz)}` : s ? `Out at ${localTime(s.at, tz)}` : e.job_title || "Not in yet"}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </section>

      {picked && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#0d0a1a]/95 p-4 backdrop-blur" role="dialog" aria-modal aria-label={`Check in ${picked.full_name}`}>
          <button
            onClick={() => setPicked(null)}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-3 text-white/70 hover:bg-white/20"
            aria-label="Cancel"
          >
            <X className="h-5 w-5" />
          </button>
          <PunchPad
            key={picked.id}
            name={picked.full_name}
            onSubmit={(pin, photo) => punch.mutateAsync({ employee_id: picked.id, pin, photo })}
            onDone={() => setPicked(null)}
          />
        </div>
      )}
    </main>
  );
}
