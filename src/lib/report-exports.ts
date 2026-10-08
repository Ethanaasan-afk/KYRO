import type { Invoice } from "@/lib/types";
import { round2 } from "@/lib/utils";

/** "with" = amounts including VAT plus VAT columns; "without" = net (taxable) amounts only. */
export type TaxMode = "with" | "without";

export const TAX_MODE_LABELS: Record<TaxMode, string> = {
  with: "With VAT",
  without: "Without VAT",
};

/** One row per invoice line. Net unit price is derived from taxable value so VAT-inclusive pricing is stripped. */
export function salesLineRows(invoices: Invoice[], mode: TaxMode): Record<string, unknown>[] {
  return invoices.flatMap((inv): Record<string, unknown>[] => {
    const base = {
      invoice_number: inv.invoice_number,
      date: inv.invoice_date,
      customer: inv.customer?.name ?? "",
    };
    const items = inv.items ?? [];
    if (!items.length) {
      const row: Record<string, unknown> = { ...base, product: "", sku: "", qty: 0, net_amount: inv.subtotal };
      if (mode === "with") Object.assign(row, { vat_rate: "", vat: inv.total_vat, total: inv.grand_total });
      return [{ ...row, currency: inv.currency, status: inv.status }];
    }
    return items.map((item) => {
      const qty = Number(item.quantity);
      const net = Number(item.taxable_value);
      const row: Record<string, unknown> = {
        ...base,
        product: item.product?.name ?? "",
        sku: item.product?.sku ?? "",
        qty,
        net_unit_price: qty ? round2(net / qty) : 0,
        net_amount: net,
      };
      if (mode === "with") {
        Object.assign(row, {
          vat_rate: item.vat_rate,
          vat: item.vat_amount,
          total: item.line_total,
        });
      }
      return { ...row, currency: inv.currency, status: inv.status };
    });
  });
}

/** One row per bill. Without VAT, the bill value is the taxable subtotal. */
export function billRows(invoices: Invoice[], mode: TaxMode): Record<string, unknown>[] {
  return invoices.map((inv) => {
    const row: Record<string, unknown> = {
      invoice_number: inv.invoice_number,
      date: inv.invoice_date,
      customer: inv.customer?.name ?? "",
    };
    if (mode === "with") {
      Object.assign(row, {
        trn: inv.customer?.tax_id ?? "",
        emirate: inv.customer?.state ?? "",
        net_amount: inv.subtotal,
        vat: inv.total_vat,
        round_off: inv.round_off ?? 0,
        total: inv.grand_total,
        paid: inv.amount_paid ?? 0,
      });
    } else {
      row.net_amount = inv.subtotal;
    }
    return { ...row, currency: inv.currency, status: inv.status };
  });
}

/** Sums net and VAT for one currency (legacy documents in other currencies are listed but not summed). */
export function billTotals(invoices: Invoice[], currency: string) {
  return invoices
    .filter((inv) => inv.currency === currency && inv.status !== "cancelled")
    .reduce(
      (acc, inv) => ({
        net: round2(acc.net + Number(inv.subtotal)),
        vat: round2(acc.vat + Number(inv.total_vat)),
        total: round2(acc.total + Number(inv.grand_total)),
      }),
      { net: 0, vat: 0, total: 0 }
    );
}
