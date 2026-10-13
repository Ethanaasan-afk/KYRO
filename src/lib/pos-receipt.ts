/**
 * Till receipt for 58/80 mm thermal printers. Built as a standalone HTML page
 * so it prints the same from any browser, inside a hidden iframe, without the
 * app's own styles getting in the way.
 */

export interface ReceiptData {
  business: string;
  businessAr?: string | null;
  addressLines: string[];
  taxIdLine?: string | null;
  title: string;
  number: string;
  dateTime: string;
  cashier?: string | null;
  customer?: string | null;
  lines: { name: string; qty: string; price: string; total: string }[];
  totals: { label: string; value: string; strong?: boolean }[];
  payments: { label: string; value: string }[];
  note?: string | null;
  qrDataUrl?: string | null;
  footer?: string;
}

const esc = (s: string | null | undefined) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function receiptHtml(d: ReceiptData, width: "58mm" | "80mm" = "80mm"): string {
  const row = (l: string, r: string, cls = "") => `<div class="row ${cls}"><span>${l}</span><span>${r}</span></div>`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(d.number)}</title>
<style>
@page { size: ${width} auto; margin: 0; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: #fff; color: #000; }
body { width: ${width}; padding: 3mm 3.5mm 6mm; font: 12px/1.35 ui-monospace, "Cascadia Mono", Menlo, Consolas, monospace; }
.c { text-align: center; }
h1 { font-size: 15px; margin: 0 0 1mm; font-family: system-ui, sans-serif; font-weight: 800; }
.ar { font-size: 13px; direction: rtl; }
.muted { color: #333; font-size: 11px; }
.title { margin: 2mm 0 1mm; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; }
hr { border: 0; border-top: 1px dashed #000; margin: 2mm 0; }
.row { display: flex; justify-content: space-between; gap: 2mm; }
.row span:last-child { text-align: right; white-space: nowrap; }
.item { margin-bottom: 1.2mm; }
.item .name { font-weight: 600; word-break: break-word; }
.strong { font-weight: 800; font-size: 14px; }
.qr { display: block; margin: 2mm auto 0; width: 30mm; height: 30mm; }
.note { font-size: 10.5px; margin-top: 2mm; }
</style></head><body>
<div class="c">
<h1>${esc(d.business)}</h1>
${d.businessAr ? `<div class="ar">${esc(d.businessAr)}</div>` : ""}
${d.addressLines.map((l) => `<div class="muted">${esc(l)}</div>`).join("")}
${d.taxIdLine ? `<div class="muted">${esc(d.taxIdLine)}</div>` : ""}
<div class="title">${esc(d.title)}</div>
</div>
${row("No.", esc(d.number))}
${row("Date", esc(d.dateTime))}
${d.cashier ? row("Cashier", esc(d.cashier)) : ""}
${d.customer ? row("Customer", esc(d.customer)) : ""}
<hr>
${d.lines
  .map(
    (l) =>
      `<div class="item"><div class="name">${esc(l.name)}</div>${row(`${esc(l.qty)} × ${esc(l.price)}`, esc(l.total))}</div>`
  )
  .join("")}
<hr>
${d.totals.map((t) => row(esc(t.label), esc(t.value), t.strong ? "strong" : "")).join("")}
${d.payments.length ? `<hr>${d.payments.map((p) => row(esc(p.label), esc(p.value))).join("")}` : ""}
${d.note ? `<div class="note">${esc(d.note)}</div>` : ""}
${d.qrDataUrl ? `<img class="qr" src="${esc(d.qrDataUrl)}" alt="">` : ""}
<hr>
<div class="c">${esc(d.footer ?? "Thank you! Please come again.")}</div>
</body></html>`;
}

/** Print through a hidden iframe so only the receipt goes to the printer. */
export function printReceipt(html: string): void {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
  document.body.appendChild(frame);
  const doc = frame.contentDocument!;
  doc.open();
  doc.write(html);
  doc.close();
  const go = () => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    window.setTimeout(() => frame.remove(), 60_000);
  };
  const imgs = Array.from(doc.images);
  if (imgs.every((i) => i.complete)) window.setTimeout(go, 50);
  else Promise.all(imgs.map((i) => new Promise((r) => ((i.onload = r), (i.onerror = r))))).then(go);
}
