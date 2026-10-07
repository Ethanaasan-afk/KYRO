/**
 * Quick sanity checks - run with: npx tsx src/lib/vat-reports.test.ts
 */
import { buildVat201, registerRows, type VatReportDoc } from "./vat-reports";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

function doc(partial: Partial<VatReportDoc> & Pick<VatReportDoc, "number">): VatReportDoc {
  return {
    date: "2026-10-05",
    status: "issued",
    currency: "AED",
    subtotal: 1000,
    total_vat: 50,
    grand_total: 1050,
    party: { name: "Customer", tax_id: null, state: "Dubai" },
    items: [{ taxable_value: 1000, vat_amount: 50, vat_rate: 5, vat_category: "standard" }],
    ...partial,
  };
}

// Sales split by emirate, zero-rated and exempt lines, credit note, purchase
{
  const s = buildVat201({
    currency: "AED",
    businessEmirate: "Dubai",
    sales: [
      doc({ number: "NF-1" }),
      doc({ number: "NF-2", party: { name: "AD Co", state: "Abu Dhabi" } }),
      doc({
        number: "NF-3",
        subtotal: 300,
        total_vat: 10,
        grand_total: 310,
        items: [
          { taxable_value: 200, vat_amount: 10, vat_rate: 5, vat_category: "standard" },
          { taxable_value: 60, vat_amount: 0, vat_rate: 0, vat_category: "zero" },
          { taxable_value: 40, vat_amount: 0, vat_rate: 0, vat_category: "exempt" },
        ],
      }),
      doc({ number: "NF-4", status: "cancelled" }),
      doc({ number: "AB/2025-26/0001", currency: "INR" }),
    ],
    creditNotes: [
      doc({
        number: "CN-1",
        subtotal: 100,
        total_vat: 5,
        grand_total: 105,
        items: [{ taxable_value: 100, vat_amount: 5, vat_rate: 5, vat_category: "standard" }],
      }),
    ],
    purchases: [
      doc({
        number: "PO-1",
        subtotal: 400,
        total_vat: 20,
        grand_total: 420,
        items: [{ taxable_value: 400, vat_amount: 20, vat_rate: 5, vat_category: "standard" }],
      }),
    ],
  });

  const dubai = s.emirates.find((r) => r.emirate === "Dubai")!;
  const abuDhabi = s.emirates.find((r) => r.emirate === "Abu Dhabi")!;
  assert(dubai.amount === 1100 && dubai.vat === 55, `dubai ${dubai.amount}/${dubai.vat}`);
  assert(abuDhabi.amount === 1000 && abuDhabi.vat === 50, "abu dhabi");
  assert(abuDhabi.box === "1a", "box numbering");
  assert(s.zeroRated === 60, `zero ${s.zeroRated}`);
  assert(s.exempt === 40, `exempt ${s.exempt}`);
  assert(s.totalDue === 105, `due ${s.totalDue}`);
  assert(s.recoverable === 20, "recoverable");
  assert(s.netPayable === 85, `net ${s.netPayable}`);
  assert(s.skippedOtherCurrency === 1, "legacy INR skipped");
  assert(s.counts.sales === 3, `sales count ${s.counts.sales}`);
}

// Unknown emirate falls back to the business emirate
{
  const s = buildVat201({
    currency: "AED",
    businessEmirate: "Sharjah",
    sales: [doc({ number: "NF-9", party: { name: "Walk-in", state: "" } })],
  });
  assert(s.emirates.find((r) => r.emirate === "Sharjah")!.vat === 50, "fallback emirate");
}

// Register excludes cancelled + other currency
{
  const rows = registerRows(
    [doc({ number: "NF-1" }), doc({ number: "NF-2", status: "cancelled" }), doc({ number: "X", currency: "INR" })],
    "AED"
  );
  assert(rows.length === 1, "register rows");
}

console.log("vat-reports.test.ts: all ok");
