import { dueDates, nextRunDate } from "@/lib/recurring";
import { documentNumberPreview, isSafePaymentUrl, numberingPeriodLabel } from "@/lib/invoice-options";

/** Quick checks - run with: npx tsx src/lib/recurring.test.ts */

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

// ---------- recurring schedule ----------
assert(nextRunDate("2026-10-07", "weekly") === "2026-10-14", "weekly");
assert(nextRunDate("2026-12-28", "weekly") === "2027-01-04", "weekly across a year");
assert(nextRunDate("2026-01-31", "monthly") === "2026-02-28", `month end clamps (${nextRunDate("2026-01-31", "monthly")})`);
assert(nextRunDate("2026-02-28", "monthly", 31) === "2026-03-31", "anchor day comes back after a short month");
assert(nextRunDate("2028-01-31", "monthly") === "2028-02-29", "leap year");
assert(nextRunDate("2026-11-15", "quarterly") === "2027-02-15", "quarterly");
assert(nextRunDate("2026-10-07", "yearly") === "2027-10-07", "yearly");

const monthly = { next_run_date: "2026-07-31", frequency: "monthly" as const, end_date: null, active: true };
const due = dueDates(monthly, "2026-10-07");
assert(due.join() === "2026-07-31,2026-08-31,2026-09-30", `catch-up keeps the 31st (${due.join()})`);
assert(dueDates({ ...monthly, active: false }, "2026-10-07").length === 0, "paused schedules are never due");
assert(dueDates({ ...monthly, end_date: "2026-08-31" }, "2026-10-07").length === 2, "end date stops the series");
assert(dueDates({ ...monthly, next_run_date: "2026-10-08" }, "2026-10-07").length === 0, "future dates are not due");
assert(dueDates({ ...monthly, frequency: "weekly", next_run_date: "2025-01-01" }, "2026-10-07").length === 12, "catch-up is capped");

// ---------- numbering ----------
assert(numberingPeriodLabel("calendar", new Date(2026, 0, 5)) === "2026", "calendar year");
assert(numberingPeriodLabel("april", new Date(2026, 0, 5)) === "2025-26", "April-March before April");
assert(numberingPeriodLabel("april", new Date(2026, 3, 1)) === "2026-27", "April-March from April");
assert(documentNumberPreview("KY", "calendar", new Date(2026, 9, 7)) === "KY/2026/0001", "preview");

// ---------- payment links ----------
assert(isSafePaymentUrl("https://buy.stripe.com/abc"), "https accepted");
for (const bad of ["http://pay.example.com", "javascript:alert(1)", "data:text/html,hi", "https://localhost", "ftp://x.com", "not a url"]) {
  assert(!isSafePaymentUrl(bad), `rejected ${bad}`);
}

console.log("recurring.test.ts: all ok");
