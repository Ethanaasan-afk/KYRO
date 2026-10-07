"use client";

import { useAuth } from "@/components/auth-provider";
import { VAT_CATEGORY_LABELS } from "@/lib/vat";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { EmptyState, LoadingBlock, PageHeader } from "@/components/ui/page-header";
import { SearchInput } from "@/components/ui/search-input";
import { ProductFormModal } from "@/components/products/product-form-modal";
import { useProductMutations, useProducts } from "@/hooks/use-products";
import { useOrgAccess } from "@/hooks/use-org-access";
import { useBusinessType } from "@/hooks/use-business-type";
import { useLiveMarketRates } from "@/hooks/use-live-market-rates";
import { findLatestRate, useMetalRates } from "@/hooks/use-metal-rates";
import { CategoryManager } from "@/components/products/category-manager";
import { useCategoryTree } from "@/hooks/use-product-categories";
import { formatQty, getUnit } from "@/lib/units";
import { cn } from "@/lib/utils";
import {
  calcJewelleryTaxable,
  isJewelleryProduct,
  resolveJewelleryRatePerGram,
} from "@/lib/jewellery";
import { calcProductMargin, MARGIN_BADGE_CLASS } from "@/lib/product-margin";
import { productColor } from "@/lib/product-color";
import type { Product } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { FolderTree, Pencil, Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { useMemo, useState } from "react";
import { useToast } from "@/components/ui/toast";
import { ProductSwatch, ProductTag } from "@/components/ui/product-swatch";

export default function ProductsPage() {
  const { isAdmin } = useAuth();
  const { writesBlocked } = useOrgAccess();
  const { labels, isHotel, isJewellery } = useBusinessType();
  const { tree } = useCategoryTree();
  const { data: products, isLoading } = useProducts();
  const { data: metalRates } = useMetalRates();
  const { data: liveMarket } = useLiveMarketRates(isJewellery);
  const { remove } = useProductMutations();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [manageOpen, setManageOpen] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  if (isHotel) {
    redirect("/room-types");
  }

  const estimatePrice = (p: Product) => {
    if (!isJewellery || !isJewelleryProduct(p)) return p.base_price;
    const shop = findLatestRate(metalRates, p.metal_type, p.purity);
    const { ratePerGram } = resolveJewelleryRatePerGram({
      metal: p.metal_type,
      purity: p.purity,
      liveRates: liveMarket?.rates,
      shopRatePerGram: shop?.rate_per_gram ?? null,
    });
    if (!(ratePerGram > 0)) return null;
    return calcJewelleryTaxable({
      netWeight: Number(p.net_weight) || 0,
      grossWeight: Number(p.gross_weight) || Number(p.net_weight) || 0,
      ratePerGram,
      makingChargeType: p.making_charge_type,
      makingChargeValue: Number(p.making_charge_value) || 0,
      stoneValue: Number(p.stone_value) || 0,
      wastagePercent: Number(p.wastage_percent) || 0,
    }).taxableValue;
  };

  const pool = useMemo(
    () => (products ?? []).filter((p) => showInactive || p.is_active),
    [products, showInactive]
  );
  // Only categories that actually hold products become filter chips
  const chips = useMemo(
    () =>
      tree
        .map((n) => {
          const inCat = pool.filter((p) => p.category.toLowerCase() === n.name.toLowerCase());
          return {
            name: n.name,
            count: inCat.length,
            subs: n.subcategories
              .map((s) => ({
                name: s.name,
                count: inCat.filter(
                  (p) => (p.subcategory ?? "").toLowerCase() === s.name.toLowerCase()
                ).length,
              }))
              .filter((s) => s.count > 0),
          };
        })
        .filter((n) => n.count > 0),
    [tree, pool]
  );
  const activeChip = chips.find((c) => c.name === category);

  const filtered = useMemo(() => {
    return (products ?? []).filter((p) => {
      if (!showInactive && !p.is_active) return false;
      if (category && p.category.toLowerCase() !== category.toLowerCase()) return false;
      if (subcategory && (p.subcategory ?? "").toLowerCase() !== subcategory.toLowerCase()) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          (p.variant ?? "").toLowerCase().includes(q) ||
          (p.imei_serial ?? "").toLowerCase().includes(q) ||
          p.hsn_code.includes(q) ||
          p.category.toLowerCase().includes(q) ||
          (p.subcategory ?? "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [products, search, category, subcategory, showInactive]);

  return (
    <div>
      <PageHeader
        eyebrow="Catalog"
        title={labels.productPlural}
        description="Catalog, pricing & VAT rates"
        accent="sun"
        actions={
          writesBlocked ? undefined : (
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => setManageOpen(true)}>
                <FolderTree className="h-4 w-4" /> Categories
              </Button>
              <Button
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                <Plus className="h-4 w-4" /> {labels.addProduct}
              </Button>
            </div>
          )
        }
      />

      {chips.length > 0 && (
        <div className="mb-3 space-y-2">
          <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
            <button
              type="button"
              onClick={() => {
                setCategory("");
                setSubcategory("");
              }}
              className={cn(
                "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all",
                !category
                  ? "border-primary bg-primary text-white shadow-[0_4px_14px_rgba(124,28,240,0.25)]"
                  : "border-border bg-surface text-slate hover:border-primary/40 hover:text-ink"
              )}
            >
              All <span className="ml-1 opacity-70">{pool.length}</span>
            </button>
            {chips.map((c) => (
              <button
                key={c.name}
                type="button"
                onClick={() => {
                  setCategory(c.name === category ? "" : c.name);
                  setSubcategory("");
                }}
                className={cn(
                  "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all",
                  category === c.name
                    ? "border-primary bg-primary text-white shadow-[0_4px_14px_rgba(124,28,240,0.25)]"
                    : "border-border bg-surface text-slate hover:border-primary/40 hover:text-ink"
                )}
              >
                {c.name} <span className="ml-1 opacity-70">{c.count}</span>
              </button>
            ))}
          </div>
          {activeChip && activeChip.subs.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pl-1">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-dim">
                {activeChip.name} ›
              </span>
              {activeChip.subs.map((sub) => (
                <button
                  key={sub.name}
                  type="button"
                  onClick={() => setSubcategory(sub.name === subcategory ? "" : sub.name)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors",
                    subcategory === sub.name
                      ? "border-primary/50 bg-primary/10 text-primary"
                      : "border-border bg-cloud text-slate hover:text-ink"
                  )}
                >
                  {sub.name} <span className="opacity-60">{sub.count}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search name, SKU, category…"
          className="sm:max-w-xs"
        />
        <label className="flex items-center gap-2 text-xs text-slate">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
          />
          Show inactive
        </label>
      </div>

      {isLoading ? (
        <LoadingBlock />
      ) : !filtered.length ? (
        <EmptyState
          title={`No ${labels.productPlural.toLowerCase()} yet`}
          description="Add what you sell - name, price, and tax details - then you can put them on invoices."
          action={
            writesBlocked ? undefined : (
              <Button
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                <Plus className="h-4 w-4" /> Add your first product
              </Button>
            )
          }
        />
      ) : (
        <div className="panel panel-accent-sun overflow-x-auto panel-lift">
          <table className="data-table">
            <thead>
              <tr>
                <th>{labels.product}</th>
                <th>SKU</th>
                <th>Pack</th>
                <th>Item code</th>
                <th className="num">{isJewellery ? "Est. @ today" : "Price"}</th>
                <th className="num">Margin %</th>
                <th className="num">VAT</th>
                <th className="num">Stock</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
                  {filtered.map((p) => {
                const qty = p.current_stock ?? 0;
                const out = qty <= 0;
                const low = !out && qty <= p.reorder_threshold;
                const healthyTarget = Math.max(p.reorder_threshold * 2, p.reorder_threshold + 1, 1);
                const fill = Math.min(1, Math.max(0, qty / healthyTarget));
                const est = estimatePrice(p);
                const margin = calcProductMargin(
                  isJewellery ? est ?? 0 : p.base_price,
                  p.manufacturing_cost
                );
                return (
                  <tr
                    key={p.id}
                    className={
                      out ? "row-out-of-stock" : low ? "row-low-stock" : undefined
                    }
                    style={{ boxShadow: `inset 3px 0 0 ${productColor(p.id)}` }}
                  >
                    <td>
                      <div className="flex items-start gap-2">
                        <ProductSwatch productId={p.id} className="mt-1.5" />
                        <div className="min-w-0">
                          <Link
                            href={`/products/${p.id}`}
                            className="font-medium text-ink hover:text-emerald"
                          >
                            {p.name}
                          </Link>
                          {p.variant && (
                            <span className="ml-1 text-xs text-slate">· {p.variant}</span>
                          )}
                          <div className="mt-1 flex flex-wrap items-center gap-1">
                            <ProductTag productId={p.id}>{p.category}</ProductTag>
                            {p.subcategory ? (
                              <span className="text-[11px] font-medium text-slate">› {p.subcategory}</span>
                            ) : null}
                          </div>
                          {(p.mfg_date || p.exp_date) && (
                            <p className="mt-1 font-mono text-[11px] text-slate">
                              {p.mfg_date ? `Mfg ${formatDate(p.mfg_date)}` : null}
                              {p.mfg_date && p.exp_date ? " · " : null}
                              {p.exp_date ? `Exp ${formatDate(p.exp_date)}` : null}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="font-mono text-xs">{p.sku}</td>
                    <td>{p.pack_size}</td>
                    <td className="font-mono text-xs">{p.hsn_code || "-"}</td>
                    <td className="num whitespace-nowrap">
                      {est == null ? (
                        <span className="text-slate">—</span>
                      ) : (
                        <>
                          {formatCurrency(est)}
                          <span className="ml-1 text-[11px] text-slate">/ {getUnit(p.unit).short}</span>
                        </>
                      )}
                    </td>
                    <td className="num">
                      {margin ? (
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${MARGIN_BADGE_CLASS[margin.tone]}`}
                        >
                          {margin.label}
                        </span>
                      ) : (
                        <span className="text-slate">-</span>
                      )}
                    </td>
                    <td className="num">
                      {p.vat_category === "standard" ? `${p.vat_rate}%` : VAT_CATEGORY_LABELS[p.vat_category]}
                    </td>
                    <td
                      className={`num num-stock ${
                        out ? "text-coral-deep" : low ? "text-tangerine-deep" : "num-stock-ok"
                      }`}
                    >
                      <div className="flex items-center justify-end gap-2">
                        <div
                          className={`stock-bar ${
                            out ? "stock-bar-out" : low ? "stock-bar-low" : ""
                          }`}
                          aria-hidden
                        >
                          <span
                            style={{
                              width: `${out ? 0 : Math.max(fill * 100, 4)}%`,
                              background: out
                                ? undefined
                                : `linear-gradient(90deg, ${productColor(p.id, 65, 42)}, ${productColor(p.id)})`,
                            }}
                          />
                        </div>
                        <span>{p.is_service ? "—" : formatQty(qty, p.unit)}</span>
                        {out && <span className="text-[11px] text-coral-deep">Out</span>}
                        {low && !out && (
                          <span className="text-[11px] text-tangerine-deep">Low</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <Badge
                        variant={p.is_active ? "success" : "default"}
                        color={productColor(p.id)}
                      >
                        {p.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditing(p);
                            setFormOpen(true);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </Button>
                        {isAdmin && (
                          <Button variant="ghost" size="sm" onClick={() => setDeleteId(p.id)}>
                            Delete
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <CategoryManager open={manageOpen} onClose={() => setManageOpen(false)} />

      <ProductFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        product={editing}
      />

      <ConfirmModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Delete this product?"
        message={`Are you sure you want to delete ${
          products?.find((p) => p.id === deleteId)?.name ?? "this product"
        }? This cannot be undone.`}
        confirmLabel="Yes, delete"
        danger
        loading={remove.isPending}
        onConfirm={async () => {
          if (deleteId) {
            await remove.mutateAsync(deleteId);
            toast("Done - product removed.");
            setDeleteId(null);
          }
        }}
      />
    </div>
  );
}
