"use client";

const summaryStats = [
  { label: "Sales", value: "0", meta: "Today 8 · Paid 8", accent: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300" },
  { label: "SKUs active", value: "0/0", meta: "Out 0 · Low 0", accent: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
  { label: "Retail", value: "0", meta: "1 retail · 0 wholesale", accent: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300" },
  { label: "Outstanding", value: "₹0.00", meta: "0 customers with balance", accent: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300" },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[1.6fr_0.9fr]">
        <div className="rounded-[18px] border border-border bg-surface shadow-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2 text-primary">
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
                  <path d="M4 18h16v2H4zm1-3h2v2H5zm4-3h2v5h-2zm4-6h2v11h-2zm4 2h2v9h-2z" />
                </svg>
              </div>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate">Revenue</div>
                <div className="text-3xl font-bold tracking-tight text-ink">₹0.00</div>
              </div>
            </div>
            <div className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
              Today
            </div>
          </div>

          <div className="p-5">
            <div className="mb-3 text-sm text-slate">0 invoices this month · no sales in range yet</div>
            <div className="h-52 overflow-hidden rounded-[14px] bg-gradient-to-br from-[#1d4ed8] via-[#2563eb] to-[#38bdf8] p-4 text-white">
              <svg viewBox="0 0 560 180" className="h-full w-full" preserveAspectRatio="none" aria-label="Revenue chart">
                {[0, 25, 50, 75, 100].map((line) => (
                  <line key={line} x1="0" x2="560" y1={line} y2={line} stroke="rgba(255,255,255,0.16)" strokeDasharray="4 6" />
                ))}
                <path d="M0 150 C 60 120, 120 120, 170 130 S 260 150, 310 140 S 420 90, 560 90" fill="none" stroke="rgba(255,255,255,0.96)" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
            <div className="mt-3 text-center text-xs text-slate">No invoice revenue recorded yet · chart fills as sales are booked.</div>
          </div>
        </div>

        <div className="rounded-[18px] border border-border bg-surface p-5 shadow-card">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate">Units on hand</div>
            <div className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">0</div>
          </div>
          <div className="mt-6 text-3xl font-bold tracking-tight text-ink">0</div>
          <div className="mt-2 text-sm text-slate">No stock movements yet · trend appears after stock in/out activity.</div>
          <div className="mt-6 h-20 rounded-[12px] border border-border bg-cloud" />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryStats.map((stat) => (
          <div key={stat.label} className="rounded-[16px] border border-border bg-surface p-4 shadow-card">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate">{stat.label}</span>
              <span className={`rounded-lg p-2 ${stat.accent}`}>
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
                  <path d="M12 2l8 4v6c0 5-3.5 9.5-8 10-4.5-.5-8-5-8-10V6l8-4zm0 5.5L7 9v5c0 3.2 2.1 6.3 5 6.8 2.9-.5 5-3.6 5-6.8V9l-5-1.5z" />
                </svg>
              </span>
            </div>
            <div className="text-4xl font-bold tracking-tight text-ink">{stat.value}</div>
            <div className="mt-3 text-sm text-slate">{stat.meta}</div>
          </div>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[18px] border border-border bg-surface p-5 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate">This month</div>
              <div className="mt-1 text-[28px] font-bold tracking-tight text-ink">₹0.00</div>
            </div>
            <div className="rounded-lg bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
              Net
            </div>
          </div>
          <div className="mb-3 flex items-center justify-between text-xs text-slate">
            <span>Revenue</span>
            <span>₹0.00</span>
          </div>
          <div className="h-28 rounded-[12px] border border-dashed border-border bg-cloud/60" />
        </div>

        <div className="rounded-[18px] border border-border bg-surface p-5 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate">Stock mix</div>
            <div className="rounded-lg bg-cyan-100 p-2 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300">
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
                <path d="M4 6h16v12H4zm2 2v8h12V8zm2 2h8v2H8zm0 4h6v2H8z" />
              </svg>
            </div>
          </div>
          <div className="flex items-center justify-center">
            <div className="relative h-28 w-28 rounded-full border-[10px] border-cyan-300 bg-cyan-50 dark:border-cyan-500 dark:bg-cyan-900/20">
              <div className="absolute inset-3 rounded-full border-[16px] border-transparent border-t-cyan-500 border-r-cyan-500" />
            </div>
          </div>
          <div className="mt-4 space-y-2 text-sm text-slate">
            <div className="flex items-center justify-between"><span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-cyan-500" />In stock</span><span>2</span></div>
            <div className="flex items-center justify-between"><span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-amber-400" />Low</span><span>8</span></div>
            <div className="flex items-center justify-between"><span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-rose-400" />Out</span><span>0</span></div>
          </div>
        </div>
      </section>
    </div>
  );
}
