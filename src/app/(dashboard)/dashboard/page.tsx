"use client";

import { useState } from "react";
import {
  ArrowUpRight,
  BadgeCheck,
  BarChart3,
  Bell,
  CheckCircle2,
  ChevronRight,
  CircleDashed,
  Download,
  Grid2x2,
  Group,
  LayoutGrid,
  Menu,
  Package2,
  Plus,
  ReceiptText,
  Search,
  Share2,
  ShieldCheck,
  ShoppingBag,
  Store,
  TrendingUp,
  UserPlus,
  Users,
  WalletCards,
  Warehouse,
  X,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", icon: Grid2x2, active: true },
  { label: "Products", icon: Package2 },
  { label: "Inventory", icon: Warehouse },
  { label: "Warehouses", icon: Store },
  { label: "Customers", icon: Users },
  { label: "Outstanding", icon: WalletCards },
  { label: "Invoices", icon: ReceiptText },
  { label: "Reports", icon: BarChart3 },
];

const internalNavItems = [
  { label: "Business Data", icon: LayoutGrid },
  { label: "Settings", icon: ShieldCheck },
  { label: "Billing", icon: WalletCards },
  { label: "Users", icon: Group },
];

const quickActions = [
  { label: "+ New Invoice", subtitle: "GST or regular bill", icon: ReceiptText, accent: "bg-[#dbe1ff] text-[#004ac6]" },
  { label: "+ Add Customer", subtitle: "Contact & GSTIN", icon: UserPlus, accent: "bg-[#e2e7ff] text-[#131b2e]" },
  { label: "+ Add Product", subtitle: "Catalog & barcode", icon: ShoppingBag, accent: "bg-[#acedff] text-[#005e6e]" },
  { label: "+ Record Payment", subtitle: "Cash, UPI, NEFT", icon: WalletCards, accent: "bg-[#cce5ff] text-[#00476e]" },
];

const statCards = [
  { label: "Sales", value: "₹117.00", sub: "1 bill this month", tone: "bg-[#f2f3ff] text-[#004ac6]" },
  { label: "To Collect", value: "₹0.00", sub: "No pending payments", tone: "bg-[#cce5ff] text-[#00476e]" },
  { label: "Customers", value: "1", sub: "Active customer", tone: "bg-[#eef1ff] text-[#004ac6]" },
  { label: "Low Stock", value: "0", sub: "Everything stocked", tone: "bg-[#acedff] text-[#005e6e]" },
];

const bottomNav = [
  { label: "Dashboard", icon: Grid2x2, active: true },
  { label: "Invoices", icon: ReceiptText },
  { label: "Customers", icon: Users },
  { label: "Inventory", icon: Package2 },
  { label: "More", icon: Menu },
];

const timeframeTabs = ["7 days", "14 days", "30 days"];

export default function DashboardPage() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState("14 days");

  return (
    <div className="min-h-screen bg-[#faf8ff] text-[#131b2e]">
      <header className="fixed inset-x-0 top-0 z-40 border-b border-[#e9ecff] bg-[#faf8ff]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-[640px] items-center justify-between gap-3 px-4">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              aria-label="Open menu drawer"
              onClick={() => setDrawerOpen(true)}
              className="flex h-11 w-11 items-center justify-center rounded-xl text-[#131b2e] transition-transform active:scale-95 hover:bg-[#eaedff]"
            >
              <Menu className="h-6 w-6" />
            </button>

            <div className="flex min-w-0 items-center gap-2">
              <img
                alt="AasanBill Logo"
                src="https://lh3.googleusercontent.com/aida/AEtjO1VhC1Z7RSh2wl4iN56CAc-MLoU9kWHjTNt4vaUNag2ZPD1p2OItKYpHmUXFadKz0sNhJBTAQl_65XTNtFMQ4u7oXgfZMSbZCrcnZeoOzmtaqLpXIQePzIq5FyrRCtU2xtxZ7r1iUjshi1FEIsZqrcqOAL98TrxPXUd6z6baiByfHzYB7Au-hJf_h8_mX6ZRJLko8D1p1jwnQAi3F7Sx95ljf4u90Gor90r_CUwzbipb_B4SktCHSzd2FOo"
                className="h-8 w-auto object-contain"
              />
              <div className="min-w-0 leading-none">
                <div className="truncate font-['Plus_Jakarta_Sans'] text-[1.125rem] font-bold tracking-tight text-[#004ac6]">
                  AasanBill
                </div>
                <div className="mt-0.5 text-[0.6875rem] font-medium uppercase tracking-[0.06em] text-[#434655]">
                  Dashboard
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Search transactions and parties"
              className="flex h-11 w-11 items-center justify-center rounded-xl text-[#434655] transition-transform active:scale-95 hover:bg-[#eaedff] hover:text-[#131b2e]"
            >
              <Search className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Notifications"
              className="relative flex h-11 w-11 items-center justify-center rounded-xl text-[#434655] transition-transform active:scale-95 hover:bg-[#eaedff] hover:text-[#131b2e]"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-[#ba1a1a]" />
            </button>
            <div className="flex h-11 w-11 items-center justify-center pl-1">
              <img
                alt="Profile"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuC6JswMTcdbja_eSjLEbwWPY-NrtxDZfQSHP0NRXtgcdkzrZvrAxOLeP3_jUjsmBSF6Jak1NyTqp9501yzBDZBulU_9N3-wy0VW46CP-_sNDMJaFdv5xHrkOGFWM7j6_cBo2TNLy_rH-j-tdSwiaz5cxtl9S5Ky_olTo-09U3wzGZujEcTocuL3iqABCxuwFc2oa8duyIE5jGG5qIWsRqgEs50g1eLKMWe9yl0JRKFe0t4fC8lT4exl"
                className="h-8 w-8 rounded-full object-cover shadow-[0_1px_4px_rgba(0,0,0,0.08)]"
              />
            </div>
          </div>
        </div>
      </header>

      <div
        aria-modal="true"
        role="dialog"
        className={`fixed inset-0 z-50 transition-opacity duration-300 ${drawerOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}
      >
        <div
          className={`absolute inset-0 bg-[#283044]/30 backdrop-blur-sm transition-opacity ${drawerOpen ? "opacity-100" : "opacity-0"}`}
          onClick={() => setDrawerOpen(false)}
        />

        <aside
          className={`absolute inset-y-0 left-0 flex h-full w-[82vw] max-w-[320px] flex-col bg-[#ffffff] shadow-2xl transition-transform duration-300 ease-out ${drawerOpen ? "translate-x-0" : "-translate-x-full"}`}
        >
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <img
                alt="AasanBill Logo"
                src="https://lh3.googleusercontent.com/aida/AEtjO1VhC1Z7RSh2wl4iN56CAc-MLoU9kWHjTNt4vaUNag2ZPD1p2OItKYpHmUXFadKz0sNhJBTAQl_65XTNtFMQ4u7oXgfZMSbZCrcnZeoOzmtaqLpXIQePzIq5FyrRCtU2xtxZ7r1iUjshi1FEIsZqrcqOAL98TrxPXUd6z6baiByfHzYB7Au-hJf_h8_mX6ZRJLko8D1p1jwnQAi3F7Sx95ljf4u90Gor90r_CUwzbipb_B4SktCHSzd2FOo"
                className="h-8 w-auto object-contain"
              />
              <div>
                <h2 className="font-['Plus_Jakarta_Sans'] text-[1.125rem] font-bold leading-tight text-[#004ac6]">
                  AasanBill
                </h2>
                <p className="text-[0.6875rem] font-medium uppercase tracking-[0.06em] text-[#434655]">
                  Bill banao, tension bhagao
                </p>
              </div>
            </div>
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setDrawerOpen(false)}
              className="flex h-11 w-11 items-center justify-center rounded-xl text-[#434655] transition-colors hover:bg-[#f2f3ff]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto px-3 py-2">
            <div className="space-y-1">
              {navItems.map(({ label, icon: Icon, active }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className={`flex h-12 w-full items-center gap-3 rounded-xl px-4 text-left transition-colors ${active ? "bg-[#f2f3ff] text-[#131b2e]" : "text-[#434655] hover:bg-[#f2f3ff]"}`}
                >
                  <Icon className="h-[22px] w-[22px]" />
                  <span className="text-[0.875rem] font-semibold">{label}</span>
                </button>
              ))}
            </div>

            <div className="px-4 pb-1 pt-4 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[#434655]">
              Internal
            </div>
            <div className="space-y-1">
              {internalNavItems.map(({ label, icon: Icon }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="flex h-12 w-full items-center gap-3 rounded-xl px-4 text-left text-[#434655] transition-colors hover:bg-[#f2f3ff]"
                >
                  <Icon className="h-[22px] w-[22px]" />
                  <span className="text-[0.875rem] font-semibold">{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="m-4 flex items-center justify-between rounded-2xl bg-[#f2f3ff] p-3">
            <div className="flex min-w-0 items-center gap-3">
              <img
                alt="Profile"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuC6JswMTcdbja_eSjLEbwWPY-NrtxDZfQSHP0NRXtgcdkzrZvrAxOLeP3_jUjsmBSF6Jak1NyTqp9501yzBDZBulU_9N3-wy0VW46CP-_sNDMJaFdv5xHrkOGFWM7j6_cBo2TNLy_rH-j-tdSwiaz5cxtl9S5Ky_olTo-09U3wzGZujEcTocuL3iqABCxuwFc2oa8duyIE5jGG5qIWsRqgEs50g1eLKMWe9yl0JRKFe0t4fC8lT4exl"
                className="h-9 w-9 rounded-full object-cover"
              />
              <div className="min-w-0">
                <div className="truncate text-[0.75rem] font-semibold text-[#131b2e]">Taiyab</div>
                <div className="truncate text-[0.6875rem] text-[#434655]">Admin</div>
              </div>
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-[0.75rem] font-semibold text-[#ba1a1a] transition-colors hover:bg-white"
            >
              <ChevronRight className="h-4 w-4" />
              Exit
            </button>
          </div>
        </aside>
      </div>

      <main className="mx-auto flex w-full max-w-[640px] flex-col gap-5 px-4 pb-28 pt-20">
        <section className="pt-1">
          <div className="rounded-[1.5rem] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)] ring-1 ring-[#e9ecff]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#eef1ff] px-2.5 py-1 text-[0.6875rem] font-semibold text-[#004ac6]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#004ac6] animate-pulse" />
                  Live Store Overview
                </div>
                <h1 className="font-['Plus_Jakarta_Sans'] text-[1.5rem] font-bold leading-tight tracking-tight text-[#131b2e]">
                  Good afternoon, Taiyab 👋
                </h1>
                <p className="mt-1 text-[0.9375rem] text-[#434655]">
                  Here&apos;s what&apos;s happening with your business today.
                </p>
              </div>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#f2f3ff] text-[#004ac6]">
                <Store className="h-6 w-6" />
              </div>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                className="flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl bg-[#2563eb] px-4 text-[0.875rem] font-semibold text-white shadow-[0_4px_14px_rgba(37,99,235,0.28)] transition-transform active:scale-[0.98]"
              >
                <Plus className="h-5 w-5" />
                <span>+ New Invoice</span>
              </button>
              <button
                type="button"
                aria-label="Quick share summary"
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#f2f3ff] text-[#434655] transition-transform active:scale-95"
              >
                <Share2 className="h-5 w-5" />
              </button>
            </div>
          </div>
        </section>

        <section className="space-y-2">
          <div className="flex items-center justify-between px-0.5">
            <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[#434655]">
              Today & This Month
            </span>
            <span className="inline-flex items-center gap-1 text-[0.6875rem] font-semibold text-[#004ac6]">
              <CircleDashed className="h-3.5 w-3.5" />
              Synced
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {statCards.map(({ label, value, sub, tone }) => (
              <div key={label} className="flex h-[126px] flex-col justify-between rounded-[1.5rem] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)] ring-1 ring-[#e9ecff]">
                <div className="flex items-center justify-between">
                  <span className="text-[0.6875rem] font-medium text-[#434655]">{label}</span>
                  <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${tone}`}>
                    {label === "Sales" ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : label === "To Collect" ? (
                      <BadgeCheck className="h-4 w-4" />
                    ) : label === "Customers" ? (
                      <Users className="h-4 w-4" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                  </span>
                </div>
                <div>
                  <div className="font-['Plus_Jakarta_Sans'] text-[1.5rem] font-bold tracking-tight text-[#131b2e]">
                    {value}
                  </div>
                  <p className="truncate text-[0.6875rem] text-[#434655]">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <div className="flex items-center justify-between px-0.5">
            <h2 className="font-['Plus_Jakarta_Sans'] text-[1.125rem] font-bold text-[#131b2e]">
              Quick Actions
            </h2>
            <span className="text-[0.6875rem] text-[#434655]">Tap to start</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {quickActions.map(({ label, subtitle, icon: Icon, accent }) => (
              <button
                key={label}
                type="button"
                className="min-h-[92px] rounded-[1.5rem] bg-white p-4 text-left shadow-[0_1px_3px_rgba(0,0,0,0.03)] ring-1 ring-[#e9ecff] transition-transform active:scale-[0.98]"
              >
                <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${accent}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="block text-[0.875rem] font-semibold text-[#131b2e]">{label}</div>
                  <div className="mt-1 text-[0.6875rem] text-[#434655]">{subtitle}</div>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-4 rounded-[1.5rem] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)] ring-1 ring-[#e9ecff]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-['Plus_Jakarta_Sans'] text-[1.125rem] font-bold text-[#131b2e]">
                Sales Overview
              </h2>
              <p className="text-[0.8125rem] text-[#434655]">Cash & credit performance</p>
            </div>

            <div className="flex rounded-lg bg-[#f2f3ff] p-1">
              {timeframeTabs.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setSelectedTimeframe(item)}
                  className={`rounded-md px-2.5 py-1 text-[0.6875rem] font-medium transition-colors ${
                    selectedTimeframe === item
                      ? "bg-[#2563eb] text-white shadow-sm"
                      : "text-[#434655]"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="w-full">
            <div className="relative h-40 w-full">
              <svg viewBox="0 0 320 120" className="h-full w-full overflow-visible" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="blueGlow" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <line x1="0" x2="320" y1="20" y2="20" stroke="#dae2fd" strokeDasharray="3,3" strokeWidth="0.8" />
                <line x1="0" x2="320" y1="65" y2="65" stroke="#dae2fd" strokeDasharray="3,3" strokeWidth="0.8" />
                <line x1="0" x2="320" y1="110" y2="110" stroke="#eaedff" strokeWidth="1" />
                <polygon fill="url(#blueGlow)" points="0,110 0,110 50,110 110,110 170,110 230,30 285,110 320,110" />
                <polyline
                  fill="none"
                  points="0,110 60,110 120,110 180,110 230,30 280,110 320,110"
                  stroke="#005e6e"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                />
                <polyline
                  fill="none"
                  points="0,110 50,110 110,110 170,110 230,30 285,110 320,110"
                  stroke="#2563eb"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                />
                <circle cx="230" cy="30" r="5" fill="#2563eb" stroke="#ffffff" strokeWidth="2" />
                <circle cx="230" cy="30" r="8" fill="#2563eb" fillOpacity="0.25" />
              </svg>
            </div>

            <div className="mt-1 flex justify-between px-1 text-[0.6875rem] text-[#434655]">
              <span>01 Sep</span>
              <span>05 Sep</span>
              <span className="font-semibold text-[#004ac6]">10 Sep</span>
              <span>14 Sep</span>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl bg-[#f2f3ff] px-3 py-2 text-[0.6875rem]">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#2563eb]" />
              <span className="text-[#131b2e]">
                Billed: <strong className="font-semibold text-[#004ac6]">₹117.00</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#005e6e]" />
              <span className="text-[#131b2e]">
                Collected: <strong className="font-semibold text-[#005e6e]">₹117.00</strong>
              </span>
            </div>
          </div>
        </section>

        <section className="space-y-3 rounded-[1.5rem] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)] ring-1 ring-[#e9ecff]">
          <div className="flex items-center justify-between">
            <span className="text-[0.75rem] font-medium text-[#434655]">Money to Collect</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#eef1ff] px-2.5 py-1 text-[0.6875rem] font-semibold text-[#004ac6]">
              You&apos;re all caught up 🎉
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-['Plus_Jakarta_Sans'] text-[1.5rem] font-bold tracking-tight text-[#131b2e]">
              ₹0.00
            </span>
            <span className="text-[0.8125rem] text-[#434655]">Total outstanding balance</span>
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className="inline-flex items-center gap-1 text-[0.6875rem] text-[#434655]">
              <CheckCircle2 className="h-4 w-4 text-[#005e6e]" />
              0 Overdue bills
            </span>
            <button type="button" className="inline-flex items-center gap-1 text-[0.6875rem] font-semibold text-[#004ac6]">
              View Outstanding
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </section>

        <section className="space-y-4 rounded-[1.5rem] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)] ring-1 ring-[#e9ecff]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-['Plus_Jakarta_Sans'] text-[1.125rem] font-bold text-[#131b2e]">
                Billing Flow This Month
              </h2>
              <p className="text-[0.8125rem] text-[#434655]">Zero bottlenecks detected</p>
            </div>
            <span className="rounded bg-[#eef1ff] px-2 py-1 text-[0.6875rem] font-semibold text-[#004ac6]">
              100% Cleared
            </span>
          </div>

          <div className="grid grid-cols-4 gap-1 pt-2">
            {[
              { icon: Users, title: "1 Customer", subtitle: "Verified" },
              { icon: ReceiptText, title: "1 Bill", subtitle: "Generated" },
              { icon: WalletCards, title: "₹117", subtitle: "Billed" },
              { icon: CheckCircle2, title: "₹117 Paid", subtitle: "Settled" },
            ].map((step, idx) => {
              const Icon = step.icon;
              return (
                <div key={step.title} className="flex flex-col items-center text-center">
                  <div
                    className={`mb-2 flex h-9 w-9 items-center justify-center rounded-full ${idx === 3 ? "bg-[#acedff] text-[#005e6e]" : "bg-[#dbe1ff] text-[#004ac6]"}`}
                  >
                    <Icon className="h-[18px] w-[18px]" />
                  </div>
                  <span className="text-[0.6875rem] font-semibold text-[#131b2e]">{step.title}</span>
                  <span className={`text-[0.625rem] ${idx === 3 ? "text-[#005e6e] font-semibold" : "text-[#434655]"}`}>
                    {step.subtitle}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <div className="flex items-center gap-3 rounded-[1.5rem] bg-[#f2f3ff] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)] ring-1 ring-[#e9ecff]">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-[#005e6e] shadow-sm">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-2">
                <h3 className="font-['Plus_Jakarta_Sans'] text-[1.125rem] font-bold text-[#131b2e]">
                  You&apos;re all caught up
                </h3>
                <span className="rounded-full bg-[#acedff] px-2 py-0.5 text-[0.5625rem] font-semibold uppercase tracking-[0.08em] text-[#004e5c]">
                  Healthy
                </span>
              </div>
              <p className="text-[0.8125rem] text-[#434655]">
                No urgent actions right now. All inventory is healthy and invoices are settled.
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-2">
          <div className="flex items-center justify-between px-0.5">
            <h2 className="font-['Plus_Jakarta_Sans'] text-[1.125rem] font-bold text-[#131b2e]">Recent Bills</h2>
            <button type="button" className="inline-flex items-center gap-1 text-[0.6875rem] font-semibold text-[#004ac6]">
              View all
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="rounded-[1.5rem] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)] ring-1 ring-[#e9ecff]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold text-[#131b2e]">Focused Folks Solutions LLP</div>
                <p className="mt-1 text-[0.6875rem] text-[#434655]">
                  AB/2026-27/0001 • 10 Sep 2026
                </p>
              </div>
              <div className="text-right">
                <div className="font-['Plus_Jakarta_Sans'] text-[1.125rem] font-bold text-[#131b2e]">₹117.00</div>
                <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-[#cce5ff] px-2 py-0.5 text-[0.625rem] font-semibold text-[#00476e]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#00476e]" />
                  PAID
                </span>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between rounded-b-[1rem] bg-[#f2f3ff] px-3 py-2 text-[0.6875rem]">
              <span className="inline-flex items-center gap-1 text-[#434655]">
                <BadgeCheck className="h-4 w-4 text-[#004ac6]" />
                Tax invoice saved
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 font-semibold text-[#005e6e] shadow-sm"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  WhatsApp
                </button>
                <button type="button" className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-[#434655] shadow-sm">
                  <Download className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4 rounded-[1.5rem] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)] ring-1 ring-[#e9ecff]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-['Plus_Jakarta_Sans'] text-[1.125rem] font-bold text-[#131b2e]">Inventory Health</h2>
              <p className="text-[0.8125rem] text-[#434655]">Current product status</p>
            </div>
            <button type="button" className="inline-flex items-center gap-1 text-[0.6875rem] font-semibold text-[#004ac6]">
              View Inventory
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="h-3 w-full overflow-hidden rounded-full bg-[#eaedff]">
            <div className="h-full w-full rounded-full bg-[#2563eb]" />
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              ["In Stock", "1 item (100%)", "text-[#004ac6]"],
              ["Low Stock", "0 items", "text-[#131b2e]"],
              ["Out of Stock", "0 items", "text-[#131b2e]"],
            ].map(([label, value, tone]) => (
              <div key={label} className="rounded-xl bg-[#f2f3ff] p-2">
                <span className="block text-[0.6875rem] text-[#434655]">{label}</span>
                <span className={`mt-1 block text-[0.875rem] font-bold ${tone}`}>{value}</span>
              </div>
            ))}
          </div>
        </section>

        <footer className="pb-2 pt-1 text-center">
          <div className="inline-flex items-center justify-center gap-2 rounded-full bg-[#f2f3ff] px-3 py-1.5 text-[0.6875rem] text-[#434655]">
            <ShieldCheck className="h-4 w-4 text-[#004ac6]" />
            GST Compliant • Backed up automatically
          </div>
        </footer>
      </main>

      <div className="fixed bottom-20 right-4 z-40">
        <button type="button" className="inline-flex items-center gap-2 rounded-full bg-[#2563eb] px-5 py-3 text-[0.875rem] font-semibold text-white shadow-[0_4px_12px_rgba(37,99,235,0.35)] transition-transform active:scale-95">
          <Plus className="h-5 w-5" />
          + New Invoice
        </button>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[#e9ecff] bg-[#faf8ff]/90 backdrop-blur-xl pb-[max(env(safe-area-inset-bottom),0px)]">
        <div className="mx-auto flex h-16 max-w-[640px] items-center justify-around px-2">
          {bottomNav.map(({ label, icon: Icon, active }) => (
            <button
              key={label}
              type="button"
              className={`flex min-h-[44px] flex-1 flex-col items-center justify-center ${active ? "text-[#004ac6]" : "text-[#434655]"}`}
            >
              <Icon className="h-[22px] w-[22px]" />
              <span className={`mt-0.5 text-[0.6875rem] ${active ? "font-semibold" : "font-medium"}`}>
                {label}
              </span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
