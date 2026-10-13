import { attendanceDays, isLate, localDate, localDayStart, localTime, summariseAttendance } from "@/lib/attendance";

/** Quick checks - run with: npx tsx src/lib/attendance.test.ts */

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

// ---------- local days and times ----------
assert(localDate("2026-10-12T21:30:00Z", "Asia/Dubai") === "2026-10-13", "Dubai is 4h ahead: next day");
assert(localTime("2026-10-13T05:04:00Z", "Asia/Dubai") === "09:04", "Dubai local time");
assert(localTime("2026-10-13T03:34:00Z", "Asia/Kolkata") === "09:04", "India half-hour offset");
assert(localDayStart("2026-10-13", "Asia/Dubai").toISOString() === "2026-10-12T20:00:00.000Z", "Dubai midnight");
assert(localDayStart("2026-10-13", "Asia/Kolkata").toISOString() === "2026-10-12T18:30:00.000Z", "India midnight");
assert(localDayStart("2026-07-01", "Europe/London").toISOString() === "2026-06-30T23:00:00.000Z", "London summer time");
assert(localDayStart("2026-03-29", "Europe/London").toISOString() === "2026-03-29T00:00:00.000Z", "London on the DST change day");

// ---------- late ----------
assert(!isLate("09:10", "09:00:00"), "10 minutes of grace");
assert(isLate("09:11", "09:00:00"), "11 minutes is late");
assert(!isLate("08:55", null), "no shift, never late");

// ---------- days, hours and open check-ins ----------
const tz = "Asia/Dubai";
const punches = [
  { employee_id: "e1", kind: "in", at: "2026-10-12T05:20:00Z" }, // 09:20 late
  { employee_id: "e1", kind: "out", at: "2026-10-12T09:20:00Z" }, // 13:20 (4h)
  { employee_id: "e1", kind: "in", at: "2026-10-12T10:00:00Z" }, // 14:00
  { employee_id: "e1", kind: "out", at: "2026-10-12T14:30:00Z" }, // 18:30 (4h30)
  { employee_id: "e1", kind: "in", at: "2026-10-13T04:58:00Z" }, // 08:58 on time, still in
];
const days = attendanceDays(punches, tz, "09:00:00");
const d12 = days.get("2026-10-12")!;
assert(d12.minutes === 510 && d12.late && d12.firstIn === "09:20" && d12.lastOut === "18:30", `split shift (${JSON.stringify(d12)})`);
const d13 = days.get("2026-10-13")!;
assert(d13.open && !d13.late && d13.minutes === 0, "still checked in today");

const summary = summariseAttendance(
  [
    { id: "e1", full_name: "Ravi", shift_start: "09:00:00" },
    { id: "e2", full_name: "Sara", shift_start: "09:00:00" },
  ],
  punches,
  { from: "2026-10-12", to: "2026-10-13", timeZone: tz }
);
assert(summary[0].days_present === 2 && summary[0].late_days === 1 && summary[0].hours_worked === 8.5, "Ravi's totals");
assert(summary[0].still_checked_in, "Ravi is still in on the last day");
assert(summary[1].days_present === 0 && summary[1].days_absent === 2, "Sara was absent");

console.log("attendance tests passed");
