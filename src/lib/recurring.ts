import type { Invoice, RecurringFrequency, RecurringInvoice, RecurringItem } from "@/lib/types";

export const RECURRING_FREQUENCIES: Array<{ value: RecurringFrequency; label: string; every: string }> = [
  { value: "weekly", label: "Every week", every: "week" },
  { value: "monthly", label: "Every month", every: "month" },
  { value: "quarterly", label: "Every 3 months", every: "quarter" },
  { value: "yearly", label: "Every year", every: "year" },
];

export function frequencyLabel(f: RecurringFrequency): string {
  return RECURRING_FREQUENCIES.find((x) => x.value === f)?.label ?? f;
}

/** "YYYY-MM-DD" in local time. */
export function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseIso(date: string): Date {
  const [y, m, d] = date.slice(0, 10).split("-").map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1);
}

/**
 * Next date after `date`. Month-based schedules keep the same day of the month,
 * moving to the last day when a month is shorter (31 Jan -> 28/29 Feb -> 31 Mar).
 */
export function nextRunDate(date: string, frequency: RecurringFrequency, anchorDay?: number): string {
  const d = parseIso(date);
  if (frequency === "weekly") {
    d.setDate(d.getDate() + 7);
    return isoDate(d);
  }
  const months = frequency === "monthly" ? 1 : frequency === "quarterly" ? 3 : 12;
  const day = anchorDay ?? d.getDate();
  const target = new Date(d.getFullYear(), d.getMonth() + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(day, lastDay));
  return isoDate(target);
}

/** Every scheduled date that is due on or before `today` (at most `max`). */
export function dueDates(r: Pick<RecurringInvoice, "next_run_date" | "frequency" | "end_date" | "active">, today = isoDate(new Date()), max = 12): string[] {
  if (!r.active) return [];
  const out: string[] = [];
  const anchor = parseIso(r.next_run_date).getDate();
  let date = r.next_run_date.slice(0, 10);
  while (date <= today && (!r.end_date || date <= r.end_date) && out.length < max) {
    out.push(date);
    date = nextRunDate(date, r.frequency, anchor);
  }
  return out;
}

/** The template lines a recurring invoice repeats (catalog products only). */
export function recurringItemsFromInvoice(invoice: Invoice): RecurringItem[] {
  return (invoice.items ?? [])
    .filter((it) => it.product_id && !it.room_booking_id)
    .map((it) => ({
      product_id: it.product_id as string,
      name: it.product?.name ?? "Item",
      quantity: Number(it.quantity),
      unit: it.unit ?? it.product?.unit ?? null,
      unit_price: Number(it.unit_price),
    }));
}

export function recurringTotal(items: RecurringItem[]): number {
  return items.reduce((sum, it) => sum + it.quantity * it.unit_price, 0);
}
