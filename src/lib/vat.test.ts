import { calcInvoiceTotals, calcLineVat } from "@/lib/vat";
import { amountInWords } from "@/lib/amount-in-words";
import { isValidTaxId } from "@/lib/vat/countries";

/** Quick sanity checks - run with: npx tsx src/lib/vat.test.ts */

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

// UAE standard rate, prices exclusive of VAT
{
  const line = calcLineVat({ quantity: 10, unitPrice: 100, vatRate: 5 });
  assert(line.taxableValue === 1000, "taxable");
  assert(line.vatAmount === 50, `vat got ${line.vatAmount}`);
  assert(line.lineTotal === 1050, "line total");
  assert(line.vatCategory === "standard", "category");
}

// Prices inclusive of VAT: 105 AED shelf price → 100 + 5
{
  const line = calcLineVat({ quantity: 1, unitPrice: 105, vatRate: 5 }, { pricesIncludeVat: true });
  assert(line.taxableValue === 100, `taxable got ${line.taxableValue}`);
  assert(line.vatAmount === 5, `vat got ${line.vatAmount}`);
  assert(line.lineTotal === 105, "inclusive total unchanged");
}

// Inclusive with awkward amount still adds up exactly
{
  const line = calcLineVat({ quantity: 3, unitPrice: 9.99, vatRate: 5 }, { pricesIncludeVat: true });
  assert(Math.abs(line.taxableValue + line.vatAmount - 29.97) < 1e-9, "inclusive split adds up");
}

// Zero-rated and exempt never carry VAT, even if a rate was stored
{
  const zero = calcLineVat({ quantity: 2, unitPrice: 50, vatRate: 5, vatCategory: "zero" });
  assert(zero.vatAmount === 0 && zero.vatRate === 0, "zero-rated");
  const exempt = calcLineVat({ quantity: 2, unitPrice: 50, vatRate: 5, vatCategory: "exempt" });
  assert(exempt.vatAmount === 0 && exempt.lineTotal === 100, "exempt");
}

// Totals: fils precision, no whole-currency round-off, breakdown by rate
{
  const totals = calcInvoiceTotals([
    { quantity: 1, unitPrice: 99.4, vatRate: 5 },
    { quantity: 1, unitPrice: 20, vatRate: 0, vatCategory: "zero" },
  ]);
  assert(totals.subtotal === 119.4, `subtotal ${totals.subtotal}`);
  assert(totals.totalVat === 4.97, `vat ${totals.totalVat}`);
  assert(totals.grandTotal === 124.37, `grand ${totals.grandTotal}`);
  assert(totals.roundOff === 0, "no round-off");
  assert(totals.breakdown.length === 2, "two breakdown rows");
  assert(totals.breakdown[0].vatCategory === "standard", "standard first");
}

assert(
  amountInWords(4200) === "UAE Dirhams Four Thousand Two Hundred Only",
  amountInWords(4200)
);
assert(
  amountInWords(1250.75) === "UAE Dirhams One Thousand Two Hundred Fifty and Seventy Five Fils Only",
  amountInWords(1250.75)
);
assert(amountInWords(2500000, "AED") === "UAE Dirhams Two Million Five Hundred Thousand Only", "million");
assert(amountInWords(0) === "UAE Dirhams Zero Only", "zero");
assert(amountInWords(100, "INR") === "Rupees One Hundred Only", "legacy INR");

assert(isValidTaxId("100123456700003", "AE"), "valid TRN");
assert(isValidTaxId("100 1234 5670 0003", "AE"), "TRN with spaces");
assert(!isValidTaxId("24ABCDE1234F1Z5", "AE"), "GSTIN is not a TRN");
assert(isValidTaxId("", "AE"), "empty allowed");

console.log("All VAT / amount-in-words checks passed.");
