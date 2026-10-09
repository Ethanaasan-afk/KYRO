/**
 * Quick sanity checks - run with: npx tsx src/lib/vat-reports.test.ts
 */
import { buildTaxReturn, buildVat201, registerRows, type VatReportDoc } from "./vat-reports";

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

// UAE: exports and reverse-charged sales are reported as zero-rated (box 4), not standard
{
  const s = buildVat201({
    currency: "AED",
    businessEmirate: "Dubai",
    sales: [
      doc({ number: "EX-1", tax_treatment: "export", subtotal: 500, total_vat: 0, grand_total: 500,
        items: [{ taxable_value: 500, vat_amount: 0, vat_rate: 0, vat_category: "zero" }] }),
      doc({ number: "RC-1", tax_treatment: "reverse_charge", subtotal: 200, total_vat: 0, grand_total: 200,
        items: [{ taxable_value: 200, vat_amount: 0, vat_rate: 0, vat_category: "standard" }] }),
    ],
  });
  assert(s.zeroRated === 700, `exports in box 4 (${s.zeroRated})`);
  assert(s.emirates.every((r) => r.amount === 0), "nothing in the standard-rated emirate boxes");
}

// India GSTR-3B: CGST/SGST inside the state, IGST across states, ITC from purchases
{
  const r = buildTaxReturn({
    country: "IN",
    currency: "INR",
    sales: [
      doc({ number: "S1", currency: "INR", tax_split: "cgst_sgst", subtotal: 1000, total_vat: 180, grand_total: 1180,
        items: [{ taxable_value: 1000, vat_amount: 180, vat_rate: 18, vat_category: "standard" }] }),
      doc({ number: "S2", currency: "INR", tax_split: "igst", subtotal: 500, total_vat: 25, grand_total: 525,
        items: [{ taxable_value: 500, vat_amount: 25, vat_rate: 5, vat_category: "standard" }] }),
      doc({ number: "S3", currency: "INR", tax_treatment: "export", tax_split: "igst", subtotal: 800, total_vat: 0, grand_total: 800,
        items: [{ taxable_value: 800, vat_amount: 0, vat_rate: 0, vat_category: "zero" }] }),
    ],
    purchases: [
      doc({ number: "P1", currency: "INR", tax_split: "cgst_sgst", subtotal: 400, total_vat: 72, grand_total: 472,
        items: [{ taxable_value: 400, vat_amount: 72, vat_rate: 18, vat_category: "standard" }] }),
    ],
  });
  const outward = r.rows[0];
  assert(r.gst && outward.box === "3.1(a)", "GSTR-3B layout");
  assert(outward.amount === 1500 && outward.gst!.cgst === 90 && outward.gst!.sgst === 90 && outward.gst!.igst === 25, `outward heads ${JSON.stringify(outward.gst)}`);
  assert(r.rows[1].amount === 800, "exports in 3.1(b)");
  assert(r.netGst!.cgst === 54 && r.netGst!.sgst === 54 && r.netGst!.igst === 25, `net heads ${JSON.stringify(r.netGst)}`);
  assert(r.netPayable === 133, `net payable ${r.netPayable}`);
}

// UK 9-box
{
  const r = buildTaxReturn({
    country: "GB",
    currency: "GBP",
    sales: [doc({ number: "S1", currency: "GBP", subtotal: 1000, total_vat: 200, grand_total: 1200,
      items: [{ taxable_value: 1000, vat_amount: 200, vat_rate: 20, vat_category: "standard" }] })],
    creditNotes: [doc({ number: "C1", currency: "GBP", subtotal: 100, total_vat: 20, grand_total: 120,
      items: [{ taxable_value: 100, vat_amount: 20, vat_rate: 20, vat_category: "standard" }] })],
    purchases: [doc({ number: "P1", currency: "GBP", subtotal: 300, total_vat: 60, grand_total: 360,
      items: [{ taxable_value: 300, vat_amount: 60, vat_rate: 20, vat_category: "standard" }] })],
  });
  const box = (b: string) => r.rows.find((x) => x.box === b)!;
  assert(box("1").tax === 180 && box("4").tax === 60 && box("5").tax === 120, "boxes 1, 4, 5");
  assert(box("6").amount === 900 && box("7").amount === 300, "boxes 6 and 7");
}

// Germany: rates listed separately, EU reverse charge on its own line
{
  const r = buildTaxReturn({
    country: "DE",
    currency: "EUR",
    sales: [
      doc({ number: "S1", currency: "EUR", subtotal: 200, total_vat: 26, grand_total: 226, items: [
        { taxable_value: 100, vat_amount: 19, vat_rate: 19, vat_category: "standard" },
        { taxable_value: 100, vat_amount: 7, vat_rate: 7, vat_category: "standard" },
      ] }),
      doc({ number: "S2", currency: "EUR", tax_treatment: "reverse_charge", subtotal: 1000, total_vat: 0, grand_total: 1000,
        items: [{ taxable_value: 1000, vat_amount: 0, vat_rate: 0, vat_category: "standard" }] }),
    ],
  });
  assert(r.rows[0].description === "Sales taxed at 19%" && r.rows[1].description === "Sales taxed at 7%", "rates in order");
  assert(r.rows.find((x) => /reverse charge/.test(x.description))!.amount === 1000, "reverse charge line");
  assert(r.netPayable === 26, "net 26");
}

// Kuwait: no tax, sales summary only
{
  const r = buildTaxReturn({
    country: "KW",
    currency: "KWD",
    sales: [doc({ number: "S1", currency: "KWD", subtotal: 12.345, total_vat: 0, grand_total: 12.345,
      items: [{ taxable_value: 12.345, vat_amount: 0, vat_rate: 0, vat_category: "standard" }] })],
  });
  assert(r.netPayable === null && r.rows[0].amount === 12.345, "KWD summary keeps 3 decimals");
}

console.log("vat-reports.test.ts: all ok");
