"use client";

import {
  ArrowRight,
  Bell,
  BriefcaseBusiness,
  ChevronDown,
  CircleDollarSign,
  CreditCard,
  Download,
  Gauge,
  LayoutGrid,
  Package2,
  Plus,
  ReceiptText,
  Search,
  Settings,
  ShieldCheck,
  ShoppingCart,
  TrendingUp,
  UserRound,
  Users,
  WalletCards,
  Warehouse,
} from "lucide-react";

const sidebarItems = [
  { label: "Overview", icon: LayoutGrid, active: true },
  { label: "Invoices", icon: ReceiptText },
  { label: "Customers", icon: Users },
  { label: "Products", icon: Package2 },
  { label: "Inventory", icon: Warehouse },
  { label: "Reports", icon: Gauge },
  { label: "Billing", icon: CreditCard },
  { label: "Settings", icon: Settings },
];

const metricCards = [
  {
    label: "Revenue",
    value: "₹78,500",
    delta: "+12.4% vs last month",
    accent: "text-[#16A34A] bg-[#DCFCE7]",
    icon: CircleDollarSign,
  },
  {
    label: "Paid",
    value: "₹66,000",
    delta: "94% collection rate",
    accent: "text-[#0284C7] bg-[#EAF4FF]",
    icon: WalletCards,
  },
  {
    label: "Outstanding",
    value: "₹12,500",
    delta: "4 invoices due",
    accent: "text-[#D97706] bg-[#FEF3C7]",
    icon: CreditCard,
  },
  {
    label: "GST due",
    value: "₹4,240",
    delta: "Due in 6 days",
    accent: "text-[#DC2626] bg-[#FEE2E2]",
    icon: BriefcaseBusiness,
  },
];

const quickActions = [
  { label: "New Invoice", icon: ReceiptText, tone: "bg-[#EAF4FF] text-[#1677FF]" },
  { label: "Add Customer", icon: UserRound, tone: "bg-[#F4F9FF] text-[#14213D]" },
  { label: "Add Product", icon: ShoppingCart, tone: "bg-[#E9FBF4] text-[#065F46]" },
  { label: "Record Payment", icon: WalletCards, tone: "bg-[#EAF4FF] text-[#0284C7]" },
];

const recentInvoices = [
  { id: "INV-1042", customer: "Naina Traders", amount: "₹18,400", status: "Paid", tone: "bg-[#DCFCE7] text-[#16A34A]" },
  { id: "INV-1041", customer: "Apex Sweets", amount: "₹12,960", status: "Pending", tone: "bg-[#FEF3C7] text-[#D97706]" },
  { id: "INV-1040", customer: "Sundar Jewellers", amount: "₹27,800", status: "Overdue", tone: "bg-[#FEE2E2] text-[#DC2626]" },
  { id: "INV-1039", customer: "Prime Foods", amount: "₹9,240", status: "Paid", tone: "bg-[#DCFCE7] text-[#16A34A]" },
];

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-[#F7F9FC] text-[#14213D]">
      <div className="flex min-h-screen">
        <aside className="fixed inset-y-0 left-0 z-30 w-60 border-r border-[#E2E8F0] bg-white">
          <div className="flex h-20 items-center gap-3 border-b border-[#E2E8F0] px-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EAF4FF] text-[#1677FF] shadow-soft">
              <ShoppingCart className="h-5 w-5" />
            </div>
            <div>
              <div className="font-display text-lg font-bold tracking-[-0.02em] text-[#1677FF]">
                AasanBill
              </div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#64748B]">
                Clarity Ledger
              </div>
            </div>
          </div>

          <nav className="space-y-1 px-3 py-4">
            {sidebarItems.map(({ label, icon: Icon, active }) => (
              <button
                key={label}
                type="button"
                className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-medium transition-all ${
                  active
                    ? "bg-gradient-to-r from-[#1677FF] to-[#249BFF] text-white shadow-brand-glow"
                    : "text-slate-600 hover:bg-[#F4F9FF] hover:text-[#14213D]"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </button>
            ))}
          </nav>

          <div className="absolute bottom-0 left-0 right-0 border-t border-[#E2E8F0] p-4">
            <div className="flex items-center gap-3 rounded-2xl bg-[#F4F9FF] p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#1677FF] shadow-soft">
                <UserRound className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-[#14213D]">Taiyab</div>
                <div className="truncate text-[11px] text-[#64748B]">Admin</div>
              </div>
            </div>
          </div>
        </aside>

        <main className="ml-60 flex-1">
          <header className="sticky top-0 z-20 border-b border-[#E2E8F0] bg-white/80 backdrop-blur-md">
            <div className="flex h-20 items-center justify-between px-6">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748B]">
                  Finance overview
                </p>
                <h1 className="font-display text-2xl font-bold tracking-[-0.02em] text-[#14213D]">
                  Dashboard
                </h1>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative hidden sm:block">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
                  <input
                    type="text"
                    placeholder="Search invoices"
                    className="h-10 w-64 rounded-xl border border-[#E2E8F0] bg-[#F7F9FC] pl-9 pr-3 text-sm text-[#14213D] outline-none placeholder:text-[#64748B]"
                  />
                </div>

                <button
                  type="button"
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#E2E8F0] bg-white text-[#64748B] transition-all hover:bg-[#F4F9FF] hover:text-[#14213D]"
                  aria-label="Notifications"
                >
                  <Bell className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  className="flex items-center gap-2 rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-sm font-medium text-[#14213D] transition-all hover:bg-[#F4F9FF]"
                >
                  <span>Apr 2026</span>
                  <ChevronDown className="h-4 w-4 text-[#64748B]" />
                </button>
              </div>
            </div>
          </header>

          <div className="space-y-6 px-6 py-6">
            <section className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-soft">
              <div className="flex items-start justify-between gap-6">
                <div>
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#EAF4FF] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#1677FF]">
                    <span className="h-2 w-2 rounded-full bg-[#1677FF]" />
                    Live business snapshot
                  </div>
                  <h2 className="font-display text-3xl font-bold tracking-[-0.025em] text-[#14213D]">
                    Good afternoon, Taiyab.
                  </h2>
                  <p className="mt-2 max-w-xl text-sm text-[#64748B]">
                    Your cash flow is stable, collections are ahead of plan, and 4 invoices require follow-up this week.
                  </p>
                </div>

                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#1677FF] to-[#249BFF] px-4 py-3 text-sm font-semibold text-white shadow-brand-glow transition-all hover:from-[#1455D9] hover:to-[#1677FF] active:scale-[0.98]"
                >
                  <Plus className="h-4 w-4" />
                  New invoice
                </button>
              </div>
            </section>

            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {metricCards.map(({ label, value, delta, accent, icon: Icon }) => (
                <article
                  key={label}
                  className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-soft transition-all duration-200 hover:shadow-hover"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748B]">
                      {label}
                    </div>
                    <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${accent}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                  </div>

                  <div className="mt-5 font-display text-[2rem] font-bold tracking-[-0.03em] text-[#14213D] tabular-nums">
                    {value}
                  </div>

                  <div className="mt-3 flex items-center gap-2 text-xs text-[#64748B]">
                    <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold ${accent}`}>
                      {delta}
                    </span>
                  </div>
                </article>
              ))}
            </section>

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.65fr_1fr]">
              <article className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-soft">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-display text-xl font-bold tracking-[-0.02em] text-[#14213D]">
                      Payment health
                    </h3>
                    <p className="text-sm text-[#64748B]">Cash flow trend across the last 14 days</p>
                  </div>

                  <div className="flex items-center rounded-lg bg-[#F4F9FF] p-1">
                    {['7D', '14D', '30D'].map((item, index) => (
                      <button
                        key={item}
                        type="button"
                        className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                          index === 1
                            ? "bg-white text-[#1677FF] shadow-sm"
                            : "text-[#64748B]"
                        }`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="h-52 rounded-xl border border-[#E2E8F0] bg-[#F7F9FC] p-3">
                  <svg viewBox="0 0 520 220" className="h-full w-full" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="areaFill" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#1677FF" stopOpacity="0.22" />
                        <stop offset="100%" stopColor="#1677FF" stopOpacity="0.02" />
                      </linearGradient>
                    </defs>
                    {[20, 70, 120, 170].map((y) => (
                      <line key={y} x1="0" x2="520" y1={y} y2={y} stroke="#E2E8F0" strokeDasharray="4 6" />
                    ))}
                    <path
                      d="M0 165 C 60 120, 90 125, 120 150 S 200 110, 240 130 S 320 75, 360 90 S 430 36, 520 60 L 520 220 L 0 220 Z"
                      fill="url(#areaFill)"
                    />
                    <path
                      d="M0 165 C 60 120, 90 125, 120 150 S 200 110, 240 130 S 320 75, 360 90 S 430 36, 520 60"
                      fill="none"
                      stroke="#1677FF"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                    <circle cx="360" cy="90" r="5" fill="#1677FF" />
                    <circle cx="360" cy="90" r="11" fill="#1677FF" opacity="0.12" />
                  </svg>
                </div>

                <div className="mt-4 flex items-center justify-between text-[11px] font-medium text-[#64748B]">
                  <span>May 01</span>
                  <span>May 05</span>
                  <span>May 09</span>
                  <span>May 12</span>
                  <span>May 15</span>
                </div>
              </article>

              <article className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-soft">
                <div className="mb-5 flex items-center justify-between">
                  <h3 className="font-display text-xl font-bold tracking-[-0.02em] text-[#14213D]">
                    Quick actions
                  </h3>
                  <button type="button" className="text-xs font-semibold text-[#1677FF]">
                    Manage
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {quickActions.map(({ label, icon: Icon, tone }) => (
                    <button
                      key={label}
                      type="button"
                      className="rounded-2xl border border-[#E2E8F0] bg-white p-4 text-left transition-all hover:shadow-hover"
                    >
                      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="text-sm font-semibold text-[#14213D]">{label}</div>
                    </button>
                  ))}
                </div>
              </article>
            </section>

            <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1.3fr_0.7fr]">
              <article className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-soft">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-display text-xl font-bold tracking-[-0.02em] text-[#14213D]">
                      Recent invoices
                    </h3>
                    <p className="text-sm text-[#64748B]">Latest billing activity</p>
                  </div>
                  <button type="button" className="inline-flex items-center gap-1 text-sm font-semibold text-[#1677FF]">
                    View all
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>

                <div className="overflow-hidden rounded-xl border border-[#E2E8F0]">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead className="bg-[#F7F9FC] text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748B]">
                      <tr>
                        <th className="px-4 py-3">Invoice</th>
                        <th className="px-4 py-3">Customer</th>
                        <th className="px-4 py-3 text-right">Amount</th>
                        <th className="px-4 py-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentInvoices.map(({ id, customer, amount, status, tone }) => (
                        <tr key={id} className="border-t border-[#E2E8F0]">
                          <td className="px-4 py-3 font-medium text-[#14213D]">{id}</td>
                          <td className="px-4 py-3 text-[#64748B]">{customer}</td>
                          <td className="px-4 py-3 text-right font-semibold tabular-nums text-[#14213D]">{amount}</td>
                          <td className="px-4 py-3 text-right">
                            <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${tone}`}>
                              {status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>

              <article className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-soft">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-xl font-bold tracking-[-0.02em] text-[#14213D]">
                    Business health
                  </h3>
                  <ShieldCheck className="h-5 w-5 text-[#16A34A]" />
                </div>

                <div className="mt-5 space-y-4">
                  <div className="rounded-2xl bg-[#F4F9FF] p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748B]">
                        Collection rate
                      </div>
                      <div className="text-sm font-semibold text-[#1677FF]">94%</div>
                    </div>
                    <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white">
                      <div className="h-full w-[94%] rounded-full bg-gradient-to-r from-[#1677FF] to-[#249BFF]" />
                    </div>
                  </div>

                  <div className="rounded-2xl bg-[#E9FBF4] p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#065F46]">
                        On-time payments
                      </div>
                      <div className="text-sm font-semibold text-[#16A34A]">86%</div>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-[#FEE2E2] p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#7F1D1D]">
                        Overdue invoices
                      </div>
                      <div className="text-sm font-semibold text-[#DC2626]">3</div>
                    </div>
                  </div>
                </div>
              </article>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
