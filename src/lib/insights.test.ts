import {
  agingBuckets,
  billingStreak,
  debtors,
  monthGoal,
  previousWindow,
  salesByDay,
  summarize,
  suggestGoal,
  topCustomers,
  vatThisQuarter,
} from "@/lib/insights";
import { formatQty, getUnit, roundQty, unitAllowsDecimals, unitStep } from "@/lib/units";
import { buildCategoryTree, categoryPath, subcategoryNames } from "@/lib/categories";
import { fillTemplate, isValidEmail, parseEmailList } from "@/lib/email/templates";
import type { Invoice, Purchase } from "@/lib/types";

/** Quick sanity checks - run with: npx tsx src/lib/insights.test.ts */

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

const TODAY = new Date(2026, 9, 7, 12); // 7 Oct 2026, local time

function inv(p: Partial<Invoice> & { invoice_date: string; grand_total: number }): Invoice {
  return {
    id: p.id ?? Math.random().toString(36).slice(2),
    invoice_number: p.invoice_number ?? "NF-1",
    customer_id: p.customer_id ?? "c1",
    subtotal: p.grand_total / 1.05,
    total_vat: p.total_vat ?? p.grand_total - p.grand_total / 1.05,
    round_off: 0,
    currency: p.currency ?? "AED",
    status: p.status ?? "issued",
    amount_paid: p.amount_paid ?? 0,
    cancelled_reason: null,
    notes: null,
    created_by: null,
    created_at: `${p.invoice_date}T10:00:00.000Z`,
    customer: p.customer ?? { id: p.customer_id ?? "c1", name: p.customer_id === "c2" ? "Beta LLC" : "Alpha LLC" } as Invoice["customer"],
    ...p,
  } as Invoice;
}

// ---------- units ----------
{
  assert(unitAllowsDecimals("kg") && !unitAllowsDecimals("pcs"), "kg decimals, pcs whole");
  assert(unitStep("kg") === "0.001" && unitStep("box") === "1", "steps");
  assert(roundQty(1.23456, "kg") === 1.235, "kg rounds to grams");
  assert(roundQty(2.6, "pcs") === 3, "pieces round to whole");
  assert(formatQty(1.25, "kg") === "1.25 kg", `formatQty ${formatQty(1.25, "kg")}`);
  assert(formatQty(3, "l") === "3 L", "litre short label");
  assert(getUnit("Crate").short === "Crate" && getUnit("Crate").decimals === 3, "custom units allowed");
  assert(getUnit(undefined).id === "pcs", "default unit");
}

// ---------- categories ----------
{
  const tree = buildCategoryTree({
    defaults: { Vegetables: ["Leafy greens"], Fruits: [] },
    custom: [
      { id: "r1", name: "Fruits", parent_id: null, sort_order: 0, created_at: "" },
      { id: "r2", name: "Dates", parent_id: "r1", sort_order: 0, created_at: "" },
      { id: "r3", name: "Nuts", parent_id: null, sort_order: 1, created_at: "" },
    ],
    products: [
      { category: "vegetables", subcategory: "Leafy greens" },
      { category: "Vegetables", subcategory: "Roots" },
      { category: "Spices", subcategory: null },
    ],
  });
  assert(tree.map((n) => n.name).join(",") === "Vegetables,Fruits,Nuts,Spices", `order ${tree.map((n) => n.name)}`);
  const veg = tree[0]!;
  assert(veg.productCount === 2, "case-insensitive product counts");
  assert(subcategoryNames(tree, "VEGETABLES").join(",") === "Leafy greens,Roots", "subcategories merged");
  assert(tree[1]!.id === "r1" && tree[1]!.subcategories[0]!.id === "r2", "custom ids attach to built-ins");
  assert(categoryPath("Vegetables", "Roots") === "Vegetables › Roots", "path");
}

// ---------- email ----------
{
  assert(parseEmailList("a@b.ae, c@d.com;a@b.ae  e@f.org").length === 3, "dedupe + separators");
  assert(isValidEmail("owner@shop.ae") && !isValidEmail("owner@shop"), "email check");
  const text = fillTemplate("Hi {customer}, {amount} due. {link} {unknown}", { customer: "Sam", amount: "AED 5.00" });
  assert(text === "Hi Sam, AED 5.00 due. (PDF attached) {unknown}", `template ${text}`);
}

// ---------- sales & habits ----------
const invoices = [
  inv({ invoice_date: "2026-10-07", grand_total: 105, amount_paid: 105, status: "paid" }),
  inv({ invoice_date: "2026-10-06", grand_total: 210, customer_id: "c2" }),
  inv({ invoice_date: "2026-10-05", grand_total: 315, amount_paid: 100, status: "partially_paid" }),
  inv({ invoice_date: "2026-10-03", grand_total: 999, status: "cancelled" }),
  inv({ invoice_date: "2026-09-30", grand_total: 420 }),
  inv({ invoice_date: "2026-07-20", grand_total: 1050, customer_id: "c2" }),
];
{
  const s = summarize(invoices, "2026-10-01", "2026-10-07");
  assert(s.count === 3 && s.revenue === 630, `summarize ${s.count} ${s.revenue}`);
  assert(Math.abs(s.collected - 205) < 0.001, "collected caps at total");

  const days = salesByDay(invoices, 7, TODAY);
  assert(days.length === 7 && days[6]!.date === "2026-10-07" && days[6]!.revenue === 105, "salesByDay");
  assert(days.find((d) => d.date === "2026-10-03")!.revenue === 0, "cancelled excluded");

  const prev = previousWindow("2026-10-01", "2026-10-07");
  assert(prev.from === "2026-09-24" && prev.to === "2026-09-30", `previous ${prev.from} ${prev.to}`);

  const streak = billingStreak(invoices, TODAY);
  assert(streak.current === 3 && streak.billedToday, `streak ${streak.current}`);
  const yesterday = billingStreak(invoices.slice(1), TODAY);
  assert(yesterday.current === 2 && !yesterday.billedToday, "streak still alive until midnight");
}

// ---------- goals ----------
{
  const g = monthGoal(invoices, 1000, TODAY);
  assert(g.achieved === 630 && Math.round(g.pct) === 63 && !g.hit, `goal ${g.achieved} ${g.pct}`);
  assert(g.daysLeft === 24, `daysLeft ${g.daysLeft}`);
  assert(Math.abs(g.neededPerDay - 370 / 25) < 0.001, "needed per remaining day");
  assert(monthGoal(invoices, 500, TODAY).hit, "goal hit");
  assert(suggestGoal(invoices, TODAY) === 500, `suggested ${suggestGoal(invoices, TODAY)}`); // Sept 420 × 1.1 → 462 → 500
}

// ---------- money owed ----------
{
  const a = agingBuckets(invoices, TODAY);
  assert(Math.abs(a.total - (210 + 215 + 420 + 1050)) < 0.001, `aging total ${a.total}`);
  assert(a.buckets[0]!.count === 3 && a.buckets[2]!.amount === 1050 && a.buckets[3]!.amount === 0, "buckets");
  assert(a.oldestDays === 79, `oldest ${a.oldestDays}`);
  const d = debtors(invoices, TODAY);
  assert(d[0]!.customerId === "c2" && Math.abs(d[0]!.due - 1260) < 0.001, "largest debtor first");
}

// ---------- rankings & VAT ----------
{
  const top = topCustomers(invoices, "2026-07-01", "2026-10-07");
  assert(top[0]!.id === "c2" && top[0]!.count === 2, "top customer by value");
  const purchases = [
    { purchase_date: "2026-10-02", total_vat: 7.5, currency: "AED", status: "received" },
    { purchase_date: "2026-09-02", total_vat: 99, currency: "AED", status: "received" },
  ] as Purchase[];
  const vat = vatThisQuarter(invoices, purchases, "AED", TODAY);
  assert(vat.from === "2026-10-01" && vat.to === "2026-12-31", "Q4 window");
  assert(Math.abs(vat.outputVat - (5 + 10 + 15)) < 0.001, `output vat ${vat.outputVat}`);
  assert(vat.inputVat === 7.5 && Math.abs(vat.net - 22.5) < 0.001, "net vat");
  assert(vat.dueDate === "2027-01-28", `due ${vat.dueDate}`);
}

console.log("insights, units, categories and email: all checks passed");
