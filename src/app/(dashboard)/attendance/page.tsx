"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { EmptyState, LoadingBlock, PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { useAttendance, useAttendanceMutations, useEmployees, usePhotoUrls } from "@/hooks/use-staff";
import {
  addDays,
  attendanceDays,
  browserTimeZone,
  datesBetween,
  formatMinutes,
  localDate,
  localDayStart,
  localTime,
} from "@/lib/attendance";
import { downloadXlsx } from "@/lib/excel";
import type { AttendancePunch, Employee } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Download, MapPin, MonitorSmartphone, Plus, Smartphone, Trash2, Users } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

type Range = "today" | "week" | "month" | "last_month";

const RANGE_LABELS: Record<Range, string> = {
  today: "Today",
  week: "This week",
  month: "This month",
  last_month: "Last month",
};

function rangeDates(range: Range, today: string): { from: string; to: string } {
  const d = new Date(`${today}T00:00:00Z`);
  if (range === "today") return { from: today, to: today };
  if (range === "week") {
    const back = (d.getUTCDay() + 6) % 7; // Monday
    return { from: addDays(today, -back), to: today };
  }
  const first = `${today.slice(0, 7)}-01`;
  if (range === "month") return { from: first, to: today };
  const prevLast = addDays(first, -1);
  return { from: `${prevLast.slice(0, 7)}-01`, to: prevLast };
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function Face({ url, name, size = 40 }: { url?: string; name: string; size?: number }) {
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" style={{ width: size, height: size }} className="shrink-0 rounded-full object-cover" />
  ) : (
    <span
      style={{ width: size, height: size }}
      className="flex shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary"
    >
      {initials(name)}
    </span>
  );
}

function ManualModal({ employees, onClose }: { employees: Employee[]; onClose: () => void }) {
  const { addManual } = useAttendanceMutations();
  const { toast } = useToast();
  const now = new Date();
  const [v, setV] = useState({
    employee_id: employees[0]?.id ?? "",
    kind: "in" as "in" | "out",
    date: localDate(now, browserTimeZone()),
    time: localTime(now, browserTimeZone()),
    note: "",
  });
  return (
    <Modal open onClose={onClose} title="Add a check-in or check-out" size="sm">
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const at = new Date(`${v.date}T${v.time}:00`);
          if (Number.isNaN(at.getTime())) return toast("Pick a date and time", "error");
          try {
            await addManual.mutateAsync({ employee_id: v.employee_id, kind: v.kind, at: at.toISOString(), note: v.note.trim() || null });
            toast("Added");
            onClose();
          } catch (err) {
            toast((err as Error).message, "error");
          }
        }}
      >
        <Select
          label="Employee"
          value={v.employee_id}
          onChange={(e) => setV({ ...v, employee_id: e.target.value })}
          options={employees.map((e) => ({ value: e.id, label: e.full_name }))}
        />
        <Select
          label="Type"
          value={v.kind}
          onChange={(e) => setV({ ...v, kind: e.target.value as "in" | "out" })}
          options={[
            { value: "in", label: "Check in" },
            { value: "out", label: "Check out" },
          ]}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Date" type="date" value={v.date} onChange={(e) => setV({ ...v, date: e.target.value })} />
          <Input label="Time" type="time" value={v.time} onChange={(e) => setV({ ...v, time: e.target.value })} />
        </div>
        <Input label="Reason" placeholder="Forgot to check in" value={v.note} maxLength={200} onChange={(e) => setV({ ...v, note: e.target.value })} />
        <p className="text-xs text-slate">Manual entries are marked as manual in the register, without a photo.</p>
        <div className="flex justify-end">
          <Button type="submit" loading={addManual.isPending}>
            Add
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function AttendancePage() {
  const tz = browserTimeZone();
  const today = localDate(new Date(), tz);
  const [range, setRange] = useState<Range>("today");
  const [manual, setManual] = useState(false);
  const [viewing, setViewing] = useState<AttendancePunch | null>(null);
  const { toast } = useToast();
  const { from, to } = rangeDates(range, today);
  const fromIso = localDayStart(from, tz).toISOString();
  const toIso = localDayStart(addDays(to, 1), tz).toISOString();

  const { data: employees, isLoading: loadingEmp, error } = useEmployees();
  const { data: punches, isLoading: loadingPunch } = useAttendance(fromIso, toIso);
  const { remove } = useAttendanceMutations();

  const empById = useMemo(() => new Map((employees ?? []).map((e) => [e.id, e])), [employees]);
  const photos = usePhotoUrls([
    ...(employees ?? []).map((e) => e.photo_path),
    ...(punches ?? []).map((p) => p.photo_path),
  ]);
  const url = (p: string | null | undefined) => (p ? photos.data?.[p] : undefined);

  const span = datesBetween(from, to);
  const rows = useMemo(() => {
    const byEmp = new Map<string, AttendancePunch[]>();
    for (const p of punches ?? []) {
      const list = byEmp.get(p.employee_id) ?? [];
      list.push(p);
      byEmp.set(p.employee_id, list);
    }
    return (employees ?? [])
      .filter((e) => e.active || byEmp.has(e.id))
      .map((e) => {
        const list = byEmp.get(e.id) ?? [];
        const days = attendanceDays(list, tz, e.shift_start);
        const present = Array.from(days.values()).filter((d) => d.firstIn);
        const firstToday = [...list].filter((p) => p.kind === "in").sort((a, b) => a.at.localeCompare(b.at))[0];
        const last = [...list].sort((a, b) => b.at.localeCompare(a.at))[0];
        return {
          e,
          days,
          last,
          firstPhoto: firstToday?.photo_path ?? null,
          present: present.length,
          late: present.filter((d) => d.late).length,
          minutes: present.reduce((s, d) => s + d.minutes, 0),
        };
      });
  }, [employees, punches, tz]);

  const inNow = rows.filter((r) => range === "today" && r.last?.kind === "in").length;
  const lateCount = rows.reduce((s, r) => s + r.late, 0);
  const absentToday = range === "today" ? rows.filter((r) => r.e.active && !r.present).length : 0;

  const exportExcel = () => {
    downloadXlsx(`attendance-${from}-to-${to}`, [
      {
        name: "Summary",
        rows: rows.map((r) => ({
          Employee: r.e.full_name,
          "Job title": r.e.job_title ?? "",
          "Days present": r.present,
          "Days absent": Math.max(0, span.length - r.present),
          "Late days": r.late,
          "Hours worked": Math.round((r.minutes / 60) * 100) / 100,
        })),
      },
      {
        name: "Daily",
        rows: rows.flatMap((r) =>
          span.map((d) => {
            const day = r.days.get(d);
            return {
              Date: d,
              Employee: r.e.full_name,
              In: day?.firstIn ?? "",
              Out: day?.lastOut ?? "",
              Hours: day ? Math.round((day.minutes / 60) * 100) / 100 : 0,
              Late: day?.late ? "Yes" : "",
              Status: day?.firstIn ? "Present" : "Absent",
            };
          })
        ),
      },
      {
        name: "Check-ins",
        rows: [...(punches ?? [])]
          .sort((a, b) => a.at.localeCompare(b.at))
          .map((p) => ({
            Date: localDate(p.at, tz),
            Time: localTime(p.at, tz),
            Employee: empById.get(p.employee_id)?.full_name ?? "",
            Type: p.kind === "in" ? "Check in" : "Check out",
            From: p.source,
            Location: p.latitude != null ? `${p.latitude},${p.longitude}` : "",
            Note: p.note ?? "",
          })),
      },
    ]);
  };

  const loading = loadingEmp || loadingPunch;

  return (
    <div>
      <PageHeader
        eyebrow="Team"
        title="Attendance"
        description="Who checked in, when, and the selfie they took - from the shop kiosk or their own phone."
        accent="sage"
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/kiosk">
              <Button>
                <MonitorSmartphone className="h-4 w-4" /> Open kiosk
              </Button>
            </Link>
            <Link href="/staff">
              <Button variant="secondary">
                <Users className="h-4 w-4" /> Staff
              </Button>
            </Link>
          </div>
        }
      />

      {error ? (
        <EmptyState title="Attendance isn't set up yet" description={(error as Error).message} />
      ) : loading ? (
        <LoadingBlock />
      ) : !employees?.length ? (
        <EmptyState
          title="No staff yet"
          description="Add your team first, then they can check in with a PIN and a selfie."
          action={
            <Link href="/staff">
              <Button>Add staff</Button>
            </Link>
          }
        />
      ) : (
        <>
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <div className="flex rounded-xl border border-border bg-surface p-1">
              {(Object.keys(RANGE_LABELS) as Range[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                    range === r ? "bg-primary text-white" : "text-slate hover:text-ink"
                  )}
                >
                  {RANGE_LABELS[r]}
                </button>
              ))}
            </div>
            <div className="ml-auto flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setManual(true)}>
                <Plus className="h-4 w-4" /> Add manually
              </Button>
              <Button variant="secondary" size="sm" onClick={exportExcel}>
                <Download className="h-4 w-4" /> Excel
              </Button>
            </div>
          </div>

          <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              range === "today"
                ? { label: "In now", value: inNow, tone: "text-emerald-600" }
                : { label: "Days", value: span.length, tone: "text-ink" },
              { label: range === "today" ? "Came in today" : "Present days", value: rows.reduce((s, r) => s + r.present, 0), tone: "text-ink" },
              { label: "Late arrivals", value: lateCount, tone: lateCount ? "text-amber-600" : "text-ink" },
              range === "today"
                ? { label: "Not in yet", value: absentToday, tone: absentToday ? "text-coral-deep" : "text-ink" }
                : { label: "Hours worked", value: formatMinutes(rows.reduce((s, r) => s + r.minutes, 0)), tone: "text-ink" },
            ].map((s) => (
              <div key={s.label} className="panel p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate">{s.label}</p>
                <p className={cn("mt-1 font-display text-2xl font-bold", s.tone)}>{s.value}</p>
              </div>
            ))}
          </div>

          {range === "today" ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {rows.map((r) => {
                const day = r.days.get(today);
                const isIn = r.last?.kind === "in";
                return (
                  <div key={r.e.id} className="panel flex items-center gap-3 p-4">
                    <button
                      onClick={() => r.last && setViewing(r.last)}
                      disabled={!r.last}
                      className="relative"
                      aria-label={`See ${r.e.full_name}'s check-in`}
                    >
                      <Face url={url(r.firstPhoto) ?? url(r.e.photo_path)} name={r.e.full_name} size={52} />
                      <span
                        className={cn(
                          "absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-[var(--surface)]",
                          isIn ? "bg-emerald-500" : r.last ? "bg-amber-400" : "bg-slate-300"
                        )}
                      />
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-ink">{r.e.full_name}</p>
                      <p className="text-sm text-slate">
                        {day?.firstIn
                          ? `In ${day.firstIn}${day.lastOut && !isIn ? ` · Out ${day.lastOut}` : ""}${day.minutes ? ` · ${formatMinutes(day.minutes)}` : ""}`
                          : r.e.shift_start
                            ? `Shift ${r.e.shift_start.slice(0, 5)} · not in yet`
                            : "Not in yet"}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {isIn ? <Badge variant="success">In</Badge> : r.last ? <Badge>Out</Badge> : <Badge variant="warning">Absent</Badge>}
                      {day?.late && <Badge variant="warning">Late</Badge>}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="panel overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-slate">
                    <th className="sticky left-0 bg-surface px-4 py-3 font-semibold">Employee</th>
                    <th className="px-3 py-3 text-right font-semibold">Present</th>
                    <th className="px-3 py-3 text-right font-semibold">Late</th>
                    <th className="px-3 py-3 text-right font-semibold">Hours</th>
                    {span.map((d) => (
                      <th key={d} className="px-1 py-3 text-center font-semibold" title={d}>
                        {Number(d.slice(8))}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.e.id} className="border-b border-border/60 last:border-0">
                      <td className="sticky left-0 bg-surface px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <Face url={url(r.e.photo_path)} name={r.e.full_name} size={28} />
                          <span className="truncate font-medium text-ink">{r.e.full_name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{r.present}</td>
                      <td className={cn("px-3 py-2.5 text-right tabular-nums", r.late && "text-amber-600")}>{r.late}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{formatMinutes(r.minutes)}</td>
                      {span.map((d) => {
                        const day = r.days.get(d);
                        return (
                          <td key={d} className="px-0.5 py-2.5 text-center">
                            <span
                              title={day?.firstIn ? `In ${day.firstIn}${day.lastOut ? `, out ${day.lastOut}` : ""}` : d > today ? "" : "Absent"}
                              className={cn(
                                "mx-auto block h-5 w-5 rounded-md",
                                d > today
                                  ? "bg-transparent"
                                  : day?.firstIn
                                    ? day.late
                                      ? "bg-amber-400"
                                      : "bg-emerald-500"
                                    : "bg-slate-200 dark:bg-white/10"
                              )}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="flex flex-wrap gap-4 px-4 py-3 text-xs text-slate">
                <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-emerald-500" /> On time</span>
                <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-amber-400" /> Late</span>
                <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-slate-200 dark:bg-white/10" /> Absent</span>
              </p>
            </div>
          )}

          <h2 className="mb-3 mt-8 font-display text-lg font-semibold text-ink">Check-ins and check-outs</h2>
          {!punches?.length ? (
            <p className="text-sm text-slate">Nobody has checked in {range === "today" ? "yet today" : "in this period"}.</p>
          ) : (
            <div className="panel divide-y divide-border/60">
              {punches.slice(0, 200).map((p) => {
                const e = empById.get(p.employee_id);
                return (
                  <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                    <button onClick={() => setViewing(p)} aria-label="View photo">
                      <Face url={url(p.photo_path)} name={e?.full_name ?? "?"} size={40} />
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">
                        {e?.full_name ?? "Removed employee"}{" "}
                        <span className={p.kind === "in" ? "text-emerald-600" : "text-amber-600"}>
                          checked {p.kind}
                        </span>
                      </p>
                      <p className="flex flex-wrap items-center gap-x-2 text-xs text-slate">
                        {range !== "today" && <span>{localDate(p.at, tz)}</span>}
                        <span>{localTime(p.at, tz)}</span>
                        <span className="inline-flex items-center gap-1">
                          {p.source === "phone" ? <Smartphone className="h-3 w-3" /> : p.source === "kiosk" ? <MonitorSmartphone className="h-3 w-3" /> : null}
                          {p.source === "phone" ? "Own phone" : p.source === "kiosk" ? "Kiosk" : "Manual"}
                        </span>
                        {p.latitude != null && (
                          <a
                            href={`https://www.google.com/maps?q=${p.latitude},${p.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-primary hover:underline"
                          >
                            <MapPin className="h-3 w-3" /> Map
                          </a>
                        )}
                        {p.note && <span className="italic">{p.note}</span>}
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        window.confirm("Delete this entry?") &&
                        remove.mutate(p.id, { onError: (err) => toast(err.message, "error") })
                      }
                      className="rounded-lg p-2 text-slate hover:bg-rose-soft hover:text-coral-deep"
                      aria-label="Delete entry"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {manual && employees && <ManualModal employees={employees.filter((e) => e.active)} onClose={() => setManual(false)} />}

      {viewing && (
        <Modal open onClose={() => setViewing(null)} title={empById.get(viewing.employee_id)?.full_name ?? "Check-in"} size="sm">
          <div className="flex flex-col items-center text-center">
            {url(viewing.photo_path) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={url(viewing.photo_path)} alt="Check-in selfie" className="w-64 rounded-2xl object-cover" />
            ) : (
              <p className="py-8 text-sm text-slate">No photo (manual entry).</p>
            )}
            {url(empById.get(viewing.employee_id)?.photo_path) && (
              <div className="mt-3 flex items-center gap-2 text-xs text-slate">
                <Face url={url(empById.get(viewing.employee_id)?.photo_path)} name="" size={36} /> Saved photo, to compare
              </div>
            )}
            <p className="mt-3 text-sm text-ink">
              Checked {viewing.kind} at {localTime(viewing.at, tz)} on {localDate(viewing.at, tz)} ·{" "}
              {viewing.source === "phone" ? "own phone" : viewing.source}
            </p>
            {viewing.latitude != null && (
              <a
                className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline"
                href={`https://www.google.com/maps?q=${viewing.latitude},${viewing.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MapPin className="h-4 w-4" /> See where (±{Math.round(viewing.accuracy_m ?? 0)} m)
              </a>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
