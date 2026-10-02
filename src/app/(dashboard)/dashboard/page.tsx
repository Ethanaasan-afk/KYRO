"use client";

const chartRows = [
  { label: "Organic", value: 4250, pct: 85, color: "#60a5fa" },
  { label: "Paid", value: 3120, pct: 62, color: "#a78bfa" },
  { label: "Email", value: 2100, pct: 42, color: "#fbbf24" },
  { label: "Social", value: 1580, pct: 32, color: "#34d399" },
  { label: "Referral", value: 1050, pct: 21, color: "#f87171" },
  { label: "Direct", value: 747, pct: 15, color: "#38bdf8" },
];

const profitLine = [
  { x: 0, y: 68 },
  { x: 1, y: 62 },
  { x: 2, y: 40 },
  { x: 3, y: 58 },
  { x: 4, y: 88 },
  { x: 5, y: 70 },
  { x: 6, y: 52 },
  { x: 7, y: 60 },
  { x: 8, y: 46 },
  { x: 9, y: 58 },
  { x: 10, y: 74 },
  { x: 11, y: 62 },
  { x: 12, y: 47 },
  { x: 13, y: 66 },
  { x: 14, y: 50 },
];

function buildPath(points: { x: number; y: number }[]) {
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x * 30 + 20},${point.y}`)
    .join(" ");
}

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-[#050b12] px-4 py-8 text-white sm:px-8 lg:px-10">
      <div className="mx-auto max-w-6xl space-y-12">
        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-[18px] border border-[#2b3745] bg-[#0c121a] p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-sm text-slate-300">Docs</div>
              <button className="rounded-md border border-[#3a4655] bg-[#121b25] px-3 py-1.5 text-sm text-slate-100">
                Open in Studio
              </button>
            </div>
            <div className="relative h-64 overflow-hidden rounded-[14px] bg-[#0b1118]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.06),_transparent_60%)]" />
              <svg viewBox="0 0 600 220" className="absolute inset-0 h-full w-full">
                {[30, 70, 110, 150, 190].map((y) => (
                  <line key={y} x1="0" x2="600" y1={y} y2={y} stroke="rgba(255,255,255,0.08)" strokeDasharray="3 8" />
                ))}
                <path d="M0 180 C 80 150, 130 120, 180 140 S 300 170, 350 120 S 470 60, 600 110" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" />
                <path d="M0 165 C 80 175, 130 50, 180 60 S 320 90, 360 130 S 480 170, 600 140" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" />
              </svg>
            </div>
          </div>

          <div className="rounded-[18px] border border-[#2b3745] bg-[#0c121a] p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
            <div className="mb-5 flex items-center justify-between">
              <div className="text-sm text-slate-300">Overview</div>
              <button className="rounded-md border border-[#3a4655] bg-[#121b25] px-3 py-1.5 text-sm text-slate-100">
                Copy Page
              </button>
            </div>
            <div className="flex items-center justify-center">
              <div className="relative flex h-56 w-56 items-center justify-center rounded-full bg-[#131d27] ring-[18px] ring-[#2d3944]">
                <div className="absolute inset-[22px] rounded-full border-[16px] border-[#d1d5db] border-r-transparent border-b-transparent" style={{ transform: "rotate(35deg)" }} />
                <div className="absolute inset-[22px] rounded-full border-[16px] border-[#a5aeb8] border-l-transparent" style={{ transform: "rotate(130deg)" }} />
                <div className="absolute inset-0 rounded-full border-[18px] border-[#374351]" />
                <div className="absolute inset-[22px] rounded-full bg-[#101922]" />
                <div className="relative z-10 text-center text-white">
                  <div className="text-4xl font-bold">100</div>
                  <div className="mt-1 text-sm text-slate-300">Total</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-5xl font-bold tracking-[-0.04em] text-white">Profit/Loss Line</h2>
              <p className="mt-3 max-w-3xl text-2xl font-medium text-slate-300">
                Sign-colored line segments for profit and loss on a shared zero baseline
              </p>
            </div>
            <button className="rounded-md border border-[#3a4655] bg-[#121b25] px-3 py-2 text-sm text-white">
              Copy Page
            </button>
          </div>

          <div className="rounded-[18px] border border-[#2b3745] bg-[#0c121a] p-4">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-2xl font-semibold text-white">Preview</h3>
              <div className="flex gap-2">
                <button className="rounded-md border border-[#3a4655] bg-[#121b25] px-3 py-2 text-sm text-slate-200">
                  Open in Studio
                </button>
                <button className="rounded-md border border-[#d9d9d9] bg-white px-3 py-2 text-sm font-medium text-slate-900">
                  Open in <span className="font-semibold">⎈</span>
                </button>
              </div>
            </div>

            <div className="relative h-[360px] overflow-hidden rounded-[14px] border border-[#2b3745] bg-[#070d13]">
              <svg viewBox="0 0 800 300" className="absolute inset-0 h-full w-full">
                {[30, 75, 120, 165, 210, 255].map((y) => (
                  <line key={y} x1="0" x2="800" y1={y} y2={y} stroke="rgba(255,255,255,0.08)" strokeDasharray="4 8" />
                ))}
                <line x1="0" x2="800" y1="150" y2="150" stroke="rgba(255,255,255,0.12)" />
                <path d="M0 150 C 80 90, 150 120, 220 140 S 330 170, 400 150 S 520 60, 590 130 S 700 200, 800 150" fill="none" stroke="#2dd4bf" strokeWidth="3" />
                <path d="M0 150 C 80 170, 150 210, 220 190 S 330 120, 400 160 S 540 220, 610 175 S 720 110, 800 140" fill="none" stroke="#f87171" strokeWidth="3" />
              </svg>
              <div className="absolute inset-x-0 bottom-0 flex justify-between px-6 pb-6 text-base text-slate-400">
                <span>Jan 1</span>
                <span>Jan 9</span>
                <span>Jan 17</span>
                <span>Jan 24</span>
              </div>
            </div>

            <div className="mt-6 flex justify-center gap-8 text-lg text-slate-200">
              <div className="flex items-center gap-3">
                <span className="h-4 w-4 rounded-full bg-[#2dd4bf]" />
                <span>Profit</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="h-4 w-4 rounded-full bg-[#f87171]" />
                <span>Loss</span>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-5xl font-bold tracking-[-0.04em] text-white">Ring Chart</h2>
              <p className="mt-3 max-w-4xl text-2xl font-medium text-slate-300">
                A composable multi-ring progress chart with animated arcs, hover interactions, and a reusable legend component
              </p>
            </div>
            <button className="rounded-md border border-[#3a4655] bg-[#121b25] px-3 py-2 text-sm text-white">
              Copy Page
            </button>
          </div>

          <div className="rounded-[18px] border border-[#2b3745] bg-[#0c121a] p-4">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-2xl font-semibold text-white">Preview</h3>
              <div className="flex gap-2">
                <button className="rounded-md border border-[#3a4655] bg-[#121b25] px-3 py-2 text-sm text-slate-200">
                  Open in Studio
                </button>
                <button className="rounded-md border border-[#d9d9d9] bg-white px-3 py-2 text-sm font-medium text-slate-900">
                  Open in <span className="font-semibold">⎈</span>
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-8 rounded-[14px] border border-[#2b3745] bg-[#091019] p-8 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative mx-auto h-[280px] w-[280px]">
                <svg viewBox="0 0 220 220" className="h-full w-full -rotate-90">
                  <circle cx="110" cy="110" r="78" stroke="rgba(255,255,255,0.12)" strokeWidth="16" fill="none" />
                  <circle cx="110" cy="110" r="78" stroke="#3b82f6" strokeWidth="16" strokeDasharray="160 300" fill="none" strokeLinecap="round" />
                  <circle cx="110" cy="110" r="78" stroke="#a78bfa" strokeWidth="16" strokeDasharray="130 300" strokeDashoffset="-160" fill="none" strokeLinecap="round" />
                  <circle cx="110" cy="110" r="78" stroke="#34d399" strokeWidth="16" strokeDasharray="115 300" strokeDashoffset="-290" fill="none" strokeLinecap="round" />
                  <circle cx="110" cy="110" r="78" stroke="#f59e0b" strokeWidth="16" strokeDasharray="90 300" strokeDashoffset="-405" fill="none" strokeLinecap="round" />
                  <circle cx="110" cy="110" r="78" stroke="#f87171" strokeWidth="16" strokeDasharray="70 300" strokeDashoffset="-495" fill="none" strokeLinecap="round" />
                  <circle cx="110" cy="110" r="78" stroke="#38bdf8" strokeWidth="16" strokeDasharray="52 300" strokeDashoffset="-565" fill="none" strokeLinecap="round" />
                </svg>
                <div className="absolute inset-[38px] flex items-center justify-center rounded-full bg-[#091019] text-center">
                  <div>
                    <div className="text-4xl font-bold text-white">12,847</div>
                    <div className="mt-2 text-sm uppercase tracking-wide text-slate-300">Total Sessions</div>
                  </div>
                </div>
              </div>

              <div className="min-w-[290px] space-y-5">
                {chartRows.map((row) => (
                  <div key={row.label} className="space-y-2">
                    <div className="flex items-center justify-between text-lg text-slate-200">
                      <div className="flex items-center gap-3">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: row.color }} />
                        <span>{row.label}</span>
                      </div>
                      <span>
                        {row.value.toLocaleString()} {row.pct}%
                      </span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-[#1c2733]">
                      <div className="h-full rounded-full" style={{ width: `${row.pct}%`, backgroundColor: row.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-5xl font-bold tracking-[-0.04em] text-white">Line Chart</h2>
              <p className="mt-3 max-w-4xl text-2xl font-medium text-slate-300">
                A composable line chart with tooltips, markers, and hover interactions
              </p>
            </div>
            <button className="rounded-md border border-[#3a4655] bg-[#121b25] px-3 py-2 text-sm text-white">
              Copy Page
            </button>
          </div>

          <div className="rounded-[18px] border border-[#2b3745] bg-[#0c121a] p-4">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-2xl font-semibold text-white">Preview</h3>
              <div className="flex gap-2">
                <button className="rounded-md border border-[#3a4655] bg-[#121b25] px-3 py-2 text-sm text-slate-200">
                  Open in Studio
                </button>
                <button className="rounded-md border border-[#d9d9d9] bg-white px-3 py-2 text-sm font-medium text-slate-900">
                  Open in <span className="font-semibold">⎈</span>
                </button>
              </div>
            </div>

            <div className="relative h-[360px] overflow-hidden rounded-[14px] border border-[#2b3745] bg-[#070d13]">
              <svg viewBox="0 0 900 320" className="absolute inset-0 h-full w-full">
                {[30, 80, 130, 180, 230, 280].map((y) => (
                  <line key={y} x1="0" x2="900" y1={y} y2={y} stroke="rgba(255,255,255,0.08)" strokeDasharray="4 8" />
                ))}
                <path d="M0 200 C 130 150, 210 110, 300 120 S 450 150, 520 160 S 690 220, 900 160" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="3" />
                <path d="M0 220 C 130 240, 210 180, 320 200 S 470 170, 560 210 S 700 250, 900 225" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2" />
              </svg>

              <div className="absolute inset-x-0 bottom-6 flex justify-between px-6 text-base text-slate-400">
                <span>Jul 17</span>
                <span>Jul 24</span>
                <span>Aug 1</span>
                <span>Aug 8</span>
                <span>Aug 15</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
