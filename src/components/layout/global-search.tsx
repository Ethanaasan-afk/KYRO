"use client";

import { useBusinessType } from "@/hooks/use-business-type";
import { useCustomers } from "@/hooks/use-customers";
import { useInvoices } from "@/hooks/use-invoices";
import { useProducts } from "@/hooks/use-products";
import { categoryPath } from "@/lib/categories";
import { INVOICE_STATUS_LABELS } from "@/lib/invoice-payment";
import { cn, formatCurrency } from "@/lib/utils";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight,
  BarChart3,
  Banknote,
  FileText,
  LayoutDashboard,
  Package,
  Search,
  Settings,
  Users,
  Warehouse,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

type Result = {
  id: string;
  group: string;
  title: string;
  detail?: string;
  href: string;
  icon: LucideIcon;
};

const PAGES: { label: string; href: string; icon: LucideIcon; keywords: string }[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, keywords: "home overview goal streak" },
  { label: "New invoice", href: "/invoices/new", icon: FileText, keywords: "bill sale create tax invoice" },
  { label: "Invoices", href: "/invoices", icon: FileText, keywords: "bills sales email" },
  { label: "Products", href: "/products", icon: Package, keywords: "catalog items categories price" },
  { label: "Inventory", href: "/inventory", icon: Warehouse, keywords: "stock in out adjust" },
  { label: "Customers", href: "/customers", icon: Users, keywords: "clients contacts trn" },
  { label: "Outstanding", href: "/outstanding", icon: Banknote, keywords: "credit due collect remind" },
  { label: "Reports & tax return", href: "/reports", icon: BarChart3, keywords: "vat gst return 201 gstr fta hmrc zatca excel" },
  { label: "Settings", href: "/settings", icon: Settings, keywords: "business trn email logo bank" },
];

/** Search everything from the top bar - press "/" or Ctrl+K anywhere. */
export function GlobalSearch() {
  const router = useRouter();
  const { labels } = useBusinessType();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const { data: invoices } = useInvoices();
  const { data: customers } = useCustomers();
  const { data: products } = useProducts();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if ((e.key === "k" && (e.ctrlKey || e.metaKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        input.current?.focus();
        setOpen(true);
      }
    };
    const onDown = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, []);

  const results = useMemo<Result[]>(() => {
    const term = q.trim().toLowerCase();
    const pages = PAGES.filter(
      (p) => !term || p.label.toLowerCase().includes(term) || p.keywords.includes(term)
    ).map((p) => ({ id: `page-${p.href}`, group: "Go to", title: p.label, href: p.href, icon: p.icon }));
    if (!term) return pages.slice(0, 6);

    const inv = (invoices ?? [])
      .filter(
        (i) =>
          i.invoice_number.toLowerCase().includes(term) ||
          (i.customer?.name ?? "").toLowerCase().includes(term)
      )
      .slice(0, 5)
      .map((i) => ({
        id: `inv-${i.id}`,
        group: "Invoices",
        title: `${i.invoice_number} · ${i.customer?.name ?? ""}`,
        detail: `${formatCurrency(i.grand_total, i.currency)} · ${INVOICE_STATUS_LABELS[i.status]}`,
        href: `/invoices/${i.id}`,
        icon: FileText,
      }));
    const cust = (customers ?? [])
      .filter(
        (c) =>
          c.name.toLowerCase().includes(term) ||
          (c.phone ?? "").replace(/\s/g, "").includes(term.replace(/\s/g, "")) ||
          (c.email ?? "").toLowerCase().includes(term) ||
          (c.tax_id ?? "").includes(term)
      )
      .slice(0, 4)
      .map((c) => ({
        id: `cust-${c.id}`,
        group: "Customers",
        title: c.name,
        detail: [c.phone, c.email].filter(Boolean).join(" · "),
        href: `/customers/${c.id}`,
        icon: Users,
      }));
    const prod = (products ?? [])
      .filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.sku.toLowerCase().includes(term) ||
          (p.barcode ?? "").includes(term) ||
          p.category.toLowerCase().includes(term) ||
          (p.subcategory ?? "").toLowerCase().includes(term)
      )
      .slice(0, 4)
      .map((p) => ({
        id: `prod-${p.id}`,
        group: labels.productPlural,
        title: p.name,
        detail: `${categoryPath(p.category, p.subcategory)} · ${formatCurrency(p.base_price)}`,
        href: `/products/${p.id}`,
        icon: Package,
      }));
    return [...inv, ...cust, ...prod, ...pages.slice(0, 3)];
  }, [q, invoices, customers, products, labels.productPlural]);

  useEffect(() => setActive(0), [q]);

  const go = (r: Result | undefined) => {
    if (!r) return;
    setOpen(false);
    setQ("");
    input.current?.blur();
    router.push(r.href);
  };

  let lastGroup = "";

  return (
    <div ref={box} className="relative min-w-0 flex-1">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-dim" />
      <input
        ref={input}
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(results.length - 1, a + 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(0, a - 1));
          } else if (e.key === "Enter") {
            e.preventDefault();
            go(results[active]);
          } else if (e.key === "Escape") {
            setOpen(false);
            input.current?.blur();
          }
        }}
        placeholder="Search invoices, customers, products…"
        className="h-11 w-full rounded-[10px] border border-border bg-surface pl-10 pr-14 text-base text-ink shadow-card placeholder:text-slate-dim transition-all duration-200 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15 md:text-sm"
        aria-label="Search"
        role="combobox"
        aria-expanded={open}
        aria-controls="global-search-results"
        autoComplete="off"
      />
      <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-border bg-cloud px-1.5 py-0.5 font-mono text-[10px] text-slate md:block">
        Ctrl K
      </kbd>

      <AnimatePresence>
        {open && (
          <motion.div
            id="global-search-results"
            role="listbox"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 top-[calc(100%+6px)] z-40 max-h-[60vh] overflow-y-auto rounded-[14px] border border-border bg-surface p-1.5 shadow-lift"
          >
            {results.length ? (
              results.map((r, i) => {
                const header = r.group !== lastGroup ? r.group : null;
                lastGroup = r.group;
                return (
                  <div key={r.id}>
                    {header && (
                      <p className="px-2.5 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-dim">{header}</p>
                    )}
                    <button
                      type="button"
                      role="option"
                      aria-selected={i === active}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => go(r)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-[10px] px-2.5 py-2 text-left transition-colors",
                        i === active ? "bg-primary/10" : "hover:bg-cloud"
                      )}
                    >
                      <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px]", i === active ? "bg-primary text-white" : "bg-cloud text-slate")}>
                        <r.icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-ink">{r.title}</span>
                        {r.detail && <span className="block truncate text-[11px] text-slate">{r.detail}</span>}
                      </span>
                      {i === active && <ArrowRight className="h-4 w-4 shrink-0 text-primary" />}
                    </button>
                  </div>
                );
              })
            ) : (
              <p className="px-3 py-6 text-center text-sm text-slate">No matches for “{q}”.</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
