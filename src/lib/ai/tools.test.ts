import type { SupabaseClient } from "@supabase/supabase-js";
import { AI_TOOLS, runAiTool } from "@/lib/ai/tools";

/** Quick checks - run with: npx tsx src/lib/ai/tools.test.ts */

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

// A stand-in for the Supabase query builder: every filter is accepted and the
// table's rows come back (filters are Postgres' job; the maths is ours).
function fakeSupabase(tables: Record<string, Record<string, unknown>[]>): SupabaseClient {
  const builder = (rows: Record<string, unknown>[]) => {
    const b: Record<string, unknown> = {};
    for (const m of ["select", "gte", "lte", "lt", "eq", "in", "or", "ilike", "order", "limit"]) b[m] = () => b;
    b.range = (a: number, z: number) => Promise.resolve({ data: rows.slice(a, z + 1), error: null });
    b.then = (ok: (v: unknown) => unknown) => ok({ data: rows, error: null });
    return b;
  };
  return { from: (t: string) => builder(tables[t] ?? []) } as unknown as SupabaseClient;
}

const sb = fakeSupabase({
  invoices: [
    { id: "i1", invoice_number: "KY/1", invoice_date: "2026-10-01", customer_id: "c1", subtotal: 100, total_vat: 5, grand_total: 105, amount_paid: 105, status: "paid", currency: "AED" },
    { id: "i2", invoice_number: "KY/2", invoice_date: "2026-10-02", customer_id: "c2", subtotal: 200, total_vat: 10, grand_total: 210, amount_paid: 50, status: "partially_paid", currency: "AED" },
    { id: "i3", invoice_number: "KY/3", invoice_date: "2026-10-02", customer_id: "c2", subtotal: 999, total_vat: 0, grand_total: 999, amount_paid: 0, status: "cancelled", currency: "AED" },
  ],
  invoice_items: [
    { product_id: "p1", quantity: 2, line_total: 105, unit: "pcs" },
    { product_id: "p2", quantity: 1.5, line_total: 210, unit: "kg" },
  ],
  customers: [
    { id: "c1", name: "Ahmed", phone: "050" },
    { id: "c2", name: "Priya", phone: "055" },
  ],
  products: [
    { id: "p1", name: "Soap", variant: null },
    { id: "p2", name: "Rice", variant: "Basmati" },
  ],
});
const ctx = { timeZone: "Asia/Dubai" };

async function main() {

const sales = JSON.parse((await runAiTool(sb, "sales_summary", { from: "2026-10-01", to: "2026-10-31" }, ctx)).content);
assert(sales.invoices === 2 && sales.cancelled === 1, `cancelled invoices are left out (${sales.invoices})`);
assert(sales.total_sales === 315 && sales.tax === 15 && sales.collected === 155 && sales.still_owed === 160, `sales totals ${JSON.stringify(sales)}`);
assert(sales.best_day.date === "2026-10-02", "best day");

const owed = JSON.parse((await runAiTool(sb, "money_owed", {}, ctx)).content);
assert(owed.customers.length === 1 && owed.customers[0].customer === "Priya" && owed.customers[0].owes === 160, `who owes (${JSON.stringify(owed)})`);

const top = JSON.parse((await runAiTool(sb, "top_products", { from: "2026-10-01", to: "2026-10-31" }, ctx)).content);
assert(top.products[0].product === "Rice (Basmati)" && top.products[0].quantity_sold === 1.5, `best sellers (${JSON.stringify(top)})`);

const bad = await runAiTool(sb, "sales_summary", { from: "yesterday", to: "today" }, ctx);
assert(bad.isError, "bad dates come back as an error the model can fix");
assert((await runAiTool(sb, "drop_tables", {}, ctx)).isError, "unknown tools are refused");

// Every tool the model can call has a handler and a closed schema
for (const t of AI_TOOLS) {
  const r = await runAiTool(fakeSupabase({}), t.name, { from: "2026-10-01", to: "2026-10-02", query: "x" }, ctx);
  assert(!/Unknown tool/.test(r.content), `${t.name} has a handler`);
  assert((t.input_schema as { additionalProperties?: boolean }).additionalProperties === false, `${t.name} schema is closed`);
}

console.log("ai tools tests passed");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
