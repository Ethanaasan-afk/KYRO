/**
 * Pure business-insight helpers behind the dashboard and the Outstanding page.
 * Everything works on plain invoice / payment / purchase rows so it is easy to test.
 */

import type { Invoice, Purchase } from "@/lib/types";

export function dayKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

const live = (inv: Invoice) => inv.status !== "cancelled";
const money = (n: unknown) => Number(n) || 0;

export function balanceDue(inv: Invoice): number {
  if (!live(inv)) return 0;
  return Math.max(0, Math.round((money(inv.grand_total) - money(inv.amount_paid)) * 100) / 100);
}

// ---------- sales over time ----------

export type DayPoint = { date: string; label: string; revenue: number; count: number };

export function salesByDay(invoices: Invoice[], days: number, today = new Date()): DayPoint[] {
  const byDay = new Map<string, { revenue: number; count: number }>();
  for (const inv of invoices) {
    if (!live(inv)) continue;
    const cur = byDay.get(inv.invoice_date) ?? { revenue: 0, count: 0 };
    cur.revenue += money(inv.grand_total);
    cur.count += 1;
    byDay.set(inv.invoice_date, cur);
  }
  const start = addDays(today, -(days - 1));
  return Array.from({ length: days }, (_, i) => {
    const d = addDays(start, i);
    const key = dayKey(d);
    const v = byDay.get(key);
    return {
      date: key,
      label: d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
      revenue: Math.round((v?.revenue ?? 0) * 100) / 100,
      count: v?.count ?? 0,
    };
  });
}

/** 12 calendar months ending this month. */
export function salesByMonth(invoices: Invoice[], months = 12, today = new Date()): DayPoint[] {
  const byMonth = new Map<string, { revenue: number; count: number }>();
  for (const inv of invoices) {
    if (!live(inv)) continue;
    const key = inv.invoice_date.slice(0, 7);
    const cur = byMonth.get(key) ?? { revenue: 0, count: 0 };
    cur.revenue += money(inv.grand_total);
    cur.count += 1;
    byMonth.set(key, cur);
  }
  return Array.from({ length: months }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() - (months - 1 - i), 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const v = byMonth.get(key);
    return {
      date: key,
      label: d.toLocaleDateString("en-GB", { month: "short" }),
      revenue: Math.round((v?.revenue ?? 0) * 100) / 100,
      count: v?.count ?? 0,
    };
  });
}

export type PeriodSummary = {
  revenue: number;
  count: number;
  average: number;
  vat: number;
  collected: number;
};

export function summarize(invoices: Invoice[], from: string, to: string): PeriodSummary {
  let revenue = 0;
  let count = 0;
  let vat = 0;
  let collected = 0;
  for (const inv of invoices) {
    if (!live(inv) || inv.invoice_date < from || inv.invoice_date > to) continue;
    revenue += money(inv.grand_total);
    vat += money(inv.total_vat);
    collected += Math.min(money(inv.amount_paid), money(inv.grand_total));
    count += 1;
  }
  return { revenue, count, vat, collected, average: count ? revenue / count : 0 };
}

/** Same-length window right before [from, to]. */
export function previousWindow(from: string, to: string): { from: string; to: string } {
  const a = new Date(`${from}T00:00:00`);
  const b = new Date(`${to}T00:00:00`);
  const len = Math.round((b.getTime() - a.getTime()) / 86_400_000) + 1;
  return { from: dayKey(addDays(a, -len)), to: dayKey(addDays(a, -1)) };
}

/** % change, or null when there is nothing to compare against. */
export function delta(current: number, previous: number): number | null {
  if (!previous) return current ? null : 0;
  return ((current - previous) / previous) * 100;
}

// ---------- habits ----------

export type Streak = {
  /** Consecutive days billed, counting back from today (or yesterday if today is still empty) */
  current: number;
  best: number;
  billedToday: boolean;
};

export function billingStreak(invoices: Invoice[], today = new Date()): Streak {
  const days = new Set(invoices.filter(live).map((i) => i.invoice_date));
  const todayKey = dayKey(today);
  const billedToday = days.has(todayKey);
  let current = 0;
  let cursor = billedToday ? today : addDays(today, -1);
  while (days.has(dayKey(cursor))) {
    current += 1;
    cursor = addDays(cursor, -1);
  }
  const sorted = Array.from(days).sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of sorted) {
    run = prev && dayKey(addDays(new Date(`${prev}T00:00:00`), 1)) === d ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return { current, best: Math.max(best, current), billedToday };
}

export type HeatCell = { date: string; count: number; revenue: number; level: 0 | 1 | 2 | 3 | 4; future: boolean };

/** Weeks × 7 grid (Sunday-first columns) ending this week, for a contribution heatmap. */
export function activityHeatmap(invoices: Invoice[], weeks = 16, today = new Date()): HeatCell[][] {
  const daily = new Map<string, { count: number; revenue: number }>();
  for (const inv of invoices) {
    if (!live(inv)) continue;
    const cur = daily.get(inv.invoice_date) ?? { count: 0, revenue: 0 };
    cur.count += 1;
    cur.revenue += money(inv.grand_total);
    daily.set(inv.invoice_date, cur);
  }
  const max = Math.max(1, ...Array.from(daily.values()).map((v) => v.revenue));
  const end = addDays(today, 6 - today.getDay());
  const start = addDays(end, -(weeks * 7 - 1));
  const todayKey = dayKey(today);
  const grid: HeatCell[][] = [];
  for (let w = 0; w < weeks; w++) {
    const col: HeatCell[] = [];
    for (let d = 0; d < 7; d++) {
      const date = dayKey(addDays(start, w * 7 + d));
      const v = daily.get(date);
      const ratio = v ? v.revenue / max : 0;
      const level = (v ? (ratio > 0.66 ? 4 : ratio > 0.33 ? 3 : ratio > 0.12 ? 2 : 1) : 0) as HeatCell["level"];
      col.push({ date, count: v?.count ?? 0, revenue: v?.revenue ?? 0, level, future: date > todayKey });
    }
    grid.push(col);
  }
  return grid;
}

// ---------- goals ----------

export type GoalProgress = {
  goal: number;
  achieved: number;
  pct: number;
  daysLeft: number;
  /** Straight-line projection for the month at the current daily pace */
  projected: number;
  /** Needed per remaining day (including today) to hit the goal */
  neededPerDay: number;
  hit: boolean;
};

export function monthGoal(invoices: Invoice[], goal: number, today = new Date()): GoalProgress {
  const first = new Date(today.getFullYear(), today.getMonth(), 1);
  const last = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const { revenue } = summarize(invoices, dayKey(first), dayKey(today));
  const daysElapsed = today.getDate();
  const daysInMonth = last.getDate();
  const daysLeft = daysInMonth - daysElapsed;
  const projected = daysElapsed ? (revenue / daysElapsed) * daysInMonth : 0;
  const remaining = Math.max(0, goal - revenue);
  return {
    goal,
    achieved: revenue,
    pct: goal > 0 ? Math.min(100, (revenue / goal) * 100) : 0,
    daysLeft,
    projected,
    neededPerDay: remaining / Math.max(1, daysLeft + 1),
    hit: goal > 0 && revenue >= goal,
  };
}

/** A goal that stretches but feels reachable: last full month + 10%, rounded. */
export function suggestGoal(invoices: Invoice[], today = new Date()): number {
  const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
  const { revenue } = summarize(invoices, dayKey(lastMonthStart), dayKey(lastMonthEnd));
  const base = revenue > 0 ? revenue * 1.1 : 10000;
  const step = base > 100000 ? 10000 : base > 10000 ? 1000 : 500;
  return Math.ceil(base / step) * step;
}

// ---------- money owed ----------

export type AgingBucket = { id: string; label: string; amount: number; count: number; tone: "ok" | "warn" | "late" | "danger" };

export function agingBuckets(invoices: Invoice[], today = new Date()): { buckets: AgingBucket[]; oldestDays: number; total: number } {
  const buckets: AgingBucket[] = [
    { id: "0-30", label: "0-30 days", amount: 0, count: 0, tone: "ok" },
    { id: "31-60", label: "31-60 days", amount: 0, count: 0, tone: "warn" },
    { id: "61-90", label: "61-90 days", amount: 0, count: 0, tone: "late" },
    { id: "90+", label: "90+ days", amount: 0, count: 0, tone: "danger" },
  ];
  let oldestDays = 0;
  let total = 0;
  for (const inv of invoices) {
    const due = balanceDue(inv);
    if (due <= 0) continue;
    const age = Math.max(0, Math.floor((today.getTime() - new Date(`${inv.invoice_date}T00:00:00`).getTime()) / 86_400_000));
    oldestDays = Math.max(oldestDays, age);
    const b = age <= 30 ? buckets[0] : age <= 60 ? buckets[1] : age <= 90 ? buckets[2] : buckets[3];
    b!.amount += due;
    b!.count += 1;
    total += due;
  }
  return { buckets, oldestDays, total };
}

export type Debtor = {
  customerId: string;
  name: string;
  email: string | null;
  phone: string | null;
  due: number;
  invoices: Invoice[];
  oldestDays: number;
};

export function debtors(invoices: Invoice[], today = new Date()): Debtor[] {
  const map = new Map<string, Debtor>();
  for (const inv of invoices) {
    const due = balanceDue(inv);
    if (due <= 0) continue;
    const d = map.get(inv.customer_id) ?? {
      customerId: inv.customer_id,
      name: inv.customer?.name ?? "Customer",
      email: inv.customer?.email ?? null,
      phone: inv.customer?.phone ?? null,
      due: 0,
      invoices: [],
      oldestDays: 0,
    };
    d.due += due;
    d.invoices.push(inv);
    d.oldestDays = Math.max(
      d.oldestDays,
      Math.floor((today.getTime() - new Date(`${inv.invoice_date}T00:00:00`).getTime()) / 86_400_000)
    );
    map.set(inv.customer_id, d);
  }
  return Array.from(map.values()).sort((a, b) => b.due - a.due);
}

// ---------- VAT set-aside ----------

export type VatQuarter = {
  label: string;
  from: string;
  to: string;
  outputVat: number;
  inputVat: number;
  net: number;
  /** UAE returns are due 28 days after the period ends */
  dueDate: string;
  daysToDue: number;
};

export function vatThisQuarter(
  invoices: Invoice[],
  purchases: Purchase[],
  currency: string,
  today = new Date()
): VatQuarter {
  const q = Math.floor(today.getMonth() / 3);
  const start = new Date(today.getFullYear(), q * 3, 1);
  const end = new Date(today.getFullYear(), q * 3 + 3, 0);
  const due = addDays(end, 28);
  const from = dayKey(start);
  const to = dayKey(end);
  let outputVat = 0;
  for (const inv of invoices) {
    if (!live(inv) || inv.currency !== currency) continue;
    if (inv.invoice_date >= from && inv.invoice_date <= to) outputVat += money(inv.total_vat);
  }
  let inputVat = 0;
  for (const p of purchases) {
    if (p.status === "cancelled" || p.currency !== currency) continue;
    if (p.purchase_date >= from && p.purchase_date <= to) inputVat += money(p.total_vat);
  }
  const months = [start, addDays(start, 32), end].map((d) => d.toLocaleDateString("en-GB", { month: "short" }));
  return {
    label: `Q${q + 1} ${today.getFullYear()} (${months[0]}-${months[2]})`,
    from,
    to,
    outputVat,
    inputVat,
    net: outputVat - inputVat,
    dueDate: dayKey(due),
    daysToDue: Math.ceil((due.getTime() - today.getTime()) / 86_400_000),
  };
}

// ---------- rankings ----------

export type Ranked = { id: string; name: string; value: number; count: number; share: number };

export function topCustomers(invoices: Invoice[], from: string, to: string, limit = 5): Ranked[] {
  const map = new Map<string, Ranked>();
  let total = 0;
  for (const inv of invoices) {
    if (!live(inv) || inv.invoice_date < from || inv.invoice_date > to) continue;
    const r = map.get(inv.customer_id) ?? {
      id: inv.customer_id,
      name: inv.customer?.name ?? "Customer",
      value: 0,
      count: 0,
      share: 0,
    };
    r.value += money(inv.grand_total);
    r.count += 1;
    total += money(inv.grand_total);
    map.set(inv.customer_id, r);
  }
  return Array.from(map.values())
    .map((r) => ({ ...r, share: total ? (r.value / total) * 100 : 0 }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

export type SoldItem = { product_id: string | null; quantity: number; line_total: number; invoice_date: string };

export function topProducts(
  items: SoldItem[],
  names: Map<string, { name: string; unit?: string }>,
  limit = 5
): (Ranked & { qty: number; unit?: string })[] {
  const map = new Map<string, Ranked & { qty: number; unit?: string }>();
  let total = 0;
  for (const it of items) {
    if (!it.product_id) continue;
    const meta = names.get(it.product_id);
    const r = map.get(it.product_id) ?? {
      id: it.product_id,
      name: meta?.name ?? "Item",
      unit: meta?.unit,
      value: 0,
      count: 0,
      qty: 0,
      share: 0,
    };
    r.value += money(it.line_total);
    r.qty += money(it.quantity);
    r.count += 1;
    total += money(it.line_total);
    map.set(it.product_id, r);
  }
  return Array.from(map.values())
    .map((r) => ({ ...r, share: total ? (r.value / total) * 100 : 0 }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

// ---------- milestones ----------

export type Milestone = { id: string; label: string; detail: string; achieved: boolean; progress: number };

export function milestones(
  invoices: Invoice[],
  streak: Streak,
  monthRevenue: number,
  currency = "AED"
): Milestone[] {
  const count = invoices.filter(live).length;
  const lifetime = invoices.filter(live).reduce((s, i) => s + money(i.grand_total), 0);
  const step = (value: number, target: number) => Math.min(100, (value / target) * 100);
  return [
    { id: "first", label: "First invoice", detail: "You're officially in business", achieved: count >= 1, progress: step(count, 1) },
    { id: "ten", label: "10 invoices", detail: `${Math.min(count, 10)} / 10`, achieved: count >= 10, progress: step(count, 10) },
    { id: "hundred", label: "100 invoices", detail: `${Math.min(count, 100)} / 100`, achieved: count >= 100, progress: step(count, 100) },
    { id: "streak7", label: "7-day streak", detail: `Best run: ${streak.best} days`, achieved: streak.best >= 7, progress: step(streak.best, 7) },
    { id: "month50k", label: `${currency} 50k month`, detail: "Sales in a single month", achieved: monthRevenue >= 50000, progress: step(monthRevenue, 50000) },
    { id: "lifetime250k", label: `${currency} 250k billed`, detail: "Lifetime sales", achieved: lifetime >= 250000, progress: step(lifetime, 250000) },
  ];
}

export function greeting(now = new Date()): string {
  const h = now.getHours();
  if (h < 5) return "Working late";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}
