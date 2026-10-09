"use client";

import { useAuth } from "@/components/auth-provider";
import { CustomerFormModal } from "@/components/customers/customer-form-modal";
import { InvoiceStepProgress } from "@/components/invoices/invoice-step-progress";
import { Button } from "@/components/ui/button";
import { HelpTip } from "@/components/ui/help-tip";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { ProductSwatch } from "@/components/ui/product-swatch";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { useBusinessType } from "@/hooks/use-business-type";
import { useCompanySettings } from "@/hooks/use-company";
import { useCustomers } from "@/hooks/use-customers";
import { useRoomBookings } from "@/hooks/use-hotel";
import { useInvoiceMutations } from "@/hooks/use-invoices";
import { findLatestRate, useMetalRates } from "@/hooks/use-metal-rates";
import { useProducts } from "@/hooks/use-products";
import { useWarehouses } from "@/hooks/use-warehouses";
import { customerTypeLabel } from "@/lib/constants";
import { calcInvoiceTotals, normalizeVatCategory, type VatCategory } from "@/lib/vat";
import { DEFAULT_INVOICE_PREFIX } from "@/lib/brand";
import { getCountryConfig } from "@/lib/vat/countries";
import { bookingNights, isActiveBookingStatus } from "@/lib/hotel";
import {
  calcJewelleryTaxable,
  formatJewelleryCatalogLabel,
  formatPurityLabel,
  isJewelleryProduct,
  jewelleryLineFromProduct,
  resolveJewelleryRatePerGram,
  type RateSource,
} from "@/lib/jewellery";
import { productColor } from "@/lib/product-color";
import type { Customer, Invoice, Product, RoomBooking } from "@/lib/types";
import { cn, formatDate, formatCurrency } from "@/lib/utils";
import { getNumberInputHandlers } from "@/lib/number-input";
import { formatQty, getUnit, roundQty, unitStep } from "@/lib/units";
import { categoryPath } from "@/lib/categories";
import { useCategoryTree } from "@/hooks/use-product-categories";
import { Camera, LayoutGrid, Mail, Minus, Plus, ScanBarcode, Search, Trash2, UserPlus } from "lucide-react";
import { CameraScanner } from "@/components/invoices/camera-scanner";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLiveMarketRates } from "@/hooks/use-live-market-rates";

/** Quantity box with − / + nudges and the unit printed inside. */
function QtyStepper({
  value,
  unit,
  label,
  onChange,
}: {
  value: number | string;
  unit?: string | null;
  label: string;
  onChange: (next: number | string) => void;
}) {
  const u = getUnit(unit);
  const n = Number(value) || 0;
  const step = u.decimals > 0 ? (u.id === "g" || u.id === "ml" ? 50 : 0.5) : 1;
  const bump = (dir: 1 | -1) => onChange(Math.max(0, roundQty(n + dir * step, u.id)));
  return (
    <div>
      <label className="mb-1 block text-[10px] uppercase tracking-[0.05em] text-slate">{label}</label>
      <div className="flex h-11 min-h-[44px] items-stretch overflow-hidden rounded-[8px] border border-border bg-surface focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
        <button
          type="button"
          onClick={() => bump(-1)}
          disabled={n <= step}
          className="flex w-9 shrink-0 items-center justify-center text-slate transition-colors hover:bg-cloud hover:text-ink disabled:opacity-30"
          aria-label="Less"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <input
          type="number"
          min={0}
          step={unitStep(u.id)}
          inputMode={u.decimals > 0 ? "decimal" : "numeric"}
          className="w-full min-w-0 bg-transparent text-center font-mono text-sm text-ink outline-none"
          value={value}
          {...getNumberInputHandlers({
            onChange: (e) => onChange(e.target.value),
            onBlur: (e) => {
              if (e.target.value !== "") onChange(roundQty(Number(e.target.value), u.id));
            },
          })}
        />
        <span className="flex items-center pr-1 text-[11px] font-medium text-slate">{u.short}</span>
        <button
          type="button"
          onClick={() => bump(1)}
          className="flex w-9 shrink-0 items-center justify-center text-slate transition-colors hover:bg-cloud hover:text-ink"
          aria-label="More"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

interface DraftLine {
  key: string;
  product: Product | null;
  quantity: number | string;
  unit_price: number | string;
  price_overridden: boolean;
  search: string;
  imei_serial: string;
  batch_number: string;
  variant_tag: string;
  /** Jewellery: rate per gram used for metal value (overridable) — locked at sale */
  metal_rate_used: number | null;
  rate_locked_at_sale: number | null;
  rate_source: RateSource | null;
  gross_weight: number | null;
  net_weight: number | null;
  making_charge_amount: number | null;
  stone_value: number | null;
  jewellery_purity: string | null;
  jewellery_huid: string | null;
  wastage_amount: number | null;
  /** Hotel folio */
  check_in_date: string;
  check_out_date: string;
  guest_id_proof: string;
  room_booking_id: string | null;
  booking_label: string;
  /** Hotel lines carry their own rate (no catalog product) */
  vat_rate: number;
  vat_category: VatCategory;
  hsn_code: string;
}

function newLine(): DraftLine {
  return {
    key: Math.random().toString(36).slice(2),
    product: null,
    quantity: 1,
    unit_price: 0,
    price_overridden: false,
    search: "",
    imei_serial: "",
    batch_number: "",
    variant_tag: "",
    metal_rate_used: null,
    rate_locked_at_sale: null,
    rate_source: null,
    gross_weight: null,
    net_weight: null,
    making_charge_amount: null,
    stone_value: null,
    jewellery_purity: null,
    jewellery_huid: null,
    wastage_amount: null,
    check_in_date: "",
    check_out_date: "",
    guest_id_proof: "",
    room_booking_id: null,
    booking_label: "",
    vat_rate: 0,
    vat_category: "standard",
    hsn_code: "",
  };
}

function bookingLineLabel(b: RoomBooking): string {
  const roomNo = b.room?.room_number ?? "Room";
  const typeName = b.room?.room_type?.name ?? "Stay";
  return `${roomNo} · ${typeName}`;
}

function linesFromInvoice(invoice: Invoice, products: Product[] | undefined): DraftLine[] {
  const items = invoice.items ?? [];
  if (!items.length) return [newLine()];
  return items.map((it) => {
    const product =
      it.product ??
      (it.product_id ? products?.find((p) => p.id === it.product_id) : null) ??
      null;
    const name = it.room_booking_id
      ? `Stay ${it.check_in_date ?? ""} → ${it.check_out_date ?? ""}`
      : product
        ? `${product.name}${product.variant ? ` (${product.variant})` : ""}`
        : "Item";
    return {
      key: Math.random().toString(36).slice(2),
      product,
      quantity: it.quantity,
      unit_price: it.unit_price,
      price_overridden: it.price_overridden,
      search: name,
      imei_serial: it.imei_serial ?? "",
      batch_number: it.batch_number ?? "",
      variant_tag: it.variant_tag ?? "",
      metal_rate_used: it.metal_rate_used ?? it.rate_locked_at_sale ?? null,
      rate_locked_at_sale: it.rate_locked_at_sale ?? it.metal_rate_used ?? null,
      rate_source: (it.rate_source as RateSource | null) ?? null,
      gross_weight: it.gross_weight ?? null,
      net_weight: it.net_weight ?? null,
      making_charge_amount: it.making_charge_amount ?? null,
      stone_value: it.stone_value ?? null,
      jewellery_purity: it.jewellery_purity ?? product?.purity ?? null,
      jewellery_huid: it.jewellery_huid ?? product?.huid_number ?? null,
      wastage_amount: null,
      check_in_date: it.check_in_date ?? "",
      check_out_date: it.check_out_date ?? "",
      guest_id_proof: it.guest_id_proof ?? "",
      room_booking_id: it.room_booking_id ?? null,
      booking_label: name,
      vat_rate: Number(it.vat_rate) || 0,
      vat_category: normalizeVatCategory(it.vat_category, Number(it.vat_rate)),
      hsn_code: it.hsn_code ?? "",
    };
  });
}

function isValidDraftLine(line: DraftLine, hotelStay: boolean): boolean {
  if (Number(line.quantity) <= 0) return false;
  if (hotelStay) return !!line.room_booking_id;
  return !!line.product;
}

function LeaderRow({
  label,
  value,
  helpKey,
}: {
  label: string;
  value: string;
  helpKey?: "vat";
}) {
  return (
    <div className="leader-row">
      <span className="inline-flex shrink-0 items-center gap-1 text-slate">
        {label}
        {helpKey ? <HelpTip helpKey={helpKey} /> : null}
      </span>
      <span className="leader-line" aria-hidden />
      <span className="shrink-0 font-mono text-ink">{value}</span>
    </div>
  );
}

export function InvoiceForm({
  mode,
  invoice,
  force = false,
}: {
  mode: "create" | "edit";
  invoice?: Invoice;
  force?: boolean;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const { data: customers } = useCustomers();
  const { data: products } = useProducts(true);
  const { data: bookings } = useRoomBookings();
  const { labels, config: bizConfig, isHotel, isJewellery } = useBusinessType();
  const lineFields = bizConfig.invoiceLineFields;
  const hotelStay = lineFields.hotelStay;
  const hideCustomerType = isHotel || isJewellery;
  const { data: company } = useCompanySettings();
  const { data: warehouses } = useWarehouses(true);
  const { data: metalRates } = useMetalRates();
  const { data: liveMarket } = useLiveMarketRates(isJewellery);
  const { create, update } = useInvoiceMutations();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [customerId, setCustomerId] = useState(invoice?.customer_id ?? "");
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerDrop, setShowCustomerDrop] = useState(false);
  const [quickAdd, setQuickAdd] = useState(false);
  const [invoiceDate, setInvoiceDate] = useState(
    invoice?.invoice_date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10)
  );
  const [notes, setNotes] = useState(invoice?.notes ?? "");
  /** null = follow the organization default */
  const [pricesIncludeVatChoice, setPricesIncludeVat] = useState<boolean | null>(
    invoice ? !!invoice.prices_include_vat : null
  );
  const pricesIncludeVat = pricesIncludeVatChoice ?? !!company?.prices_include_vat;
  // Editing keeps the document currency (pre-VAT invoices stay in INR)
  const docCurrency = invoice?.currency ?? company?.currency;
  const money = (n: number) => formatCurrency(n, docCurrency);
  const taxIdLabel = getCountryConfig(company?.country).taxIdLabel;
  const [warehouseId, setWarehouseId] = useState(invoice?.warehouse_id ?? "");
  const [barcodeScan, setBarcodeScan] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [bookingPick, setBookingPick] = useState("");
  const [lines, setLines] = useState<DraftLine[]>(() =>
    invoice ? linesFromInvoice(invoice, undefined) : hotelStay ? [] : [newLine()]
  );
  const [activeLine, setActiveLine] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [hydrated, setHydrated] = useState(mode === "create");
  const searchRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const { tree: categoryTree } = useCategoryTree();
  const [quickCat, setQuickCat] = useState("");
  const [quickSearch, setQuickSearch] = useState("");
  const [showQuick, setShowQuick] = useState(true);
  /** null = follow whether the customer has an email address */
  const [emailAfterChoice, setEmailAfter] = useState<boolean | null>(null);

  useEffect(() => {
    if (mode !== "edit" || !invoice || hydrated) return;
    if (!hotelStay && !products?.length) return;
    setLines(linesFromInvoice(invoice, products));
    setCustomerId(invoice.customer_id);
    setInvoiceDate(invoice.invoice_date.slice(0, 10));
    setNotes(invoice.notes ?? "");
    setWarehouseId(invoice.warehouse_id ?? "");
    setHydrated(true);
  }, [mode, invoice, products, hydrated, hotelStay]);

  useEffect(() => {
    if (warehouseId || !warehouses?.length) return;
    const def = warehouses.find((w) => w.is_default) ?? warehouses[0];
    if (def) setWarehouseId(def.id);
  }, [warehouses, warehouseId]);

  const selectedCustomer = customers?.find((c) => c.id === customerId) ?? null;
  const customerEmail = selectedCustomer?.email?.trim() || "";
  const emailAfter = emailAfterChoice ?? !!customerEmail;

  // Quick-pick catalog: categories that hold active products, then the tiles
  const quickCats = useMemo(() => {
    const list = products ?? [];
    return categoryTree
      .map((n) => ({
        name: n.name,
        count: list.filter((p) => p.category.toLowerCase() === n.name.toLowerCase()).length,
      }))
      .filter((c) => c.count > 0);
  }, [categoryTree, products]);
  const quickProducts = useMemo(() => {
    const q = quickSearch.trim().toLowerCase();
    return (products ?? [])
      .filter((p) => !quickCat || p.category.toLowerCase() === quickCat.toLowerCase())
      .filter(
        (p) =>
          !q ||
          p.name.toLowerCase().includes(q) ||
          (p.subcategory ?? "").toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q)
      )
      .slice(0, 18);
  }, [products, quickCat, quickSearch]);

  const billableBookings = useMemo(() => {
    const used = new Set(lines.map((l) => l.room_booking_id).filter(Boolean));
    return (bookings ?? []).filter(
      (b) =>
        isActiveBookingStatus(b.status) &&
        !used.has(b.id) &&
        (!customerId || b.customer_id === customerId)
    );
  }, [bookings, lines, customerId]);

  const filteredCustomers = useMemo(() => {
    const q = customerSearch.toLowerCase();
    return (customers ?? [])
      .filter(
        (c) =>
          !q ||
          c.name.toLowerCase().includes(q) ||
          (c.phone ?? "").includes(q) ||
          (c.tax_id ?? "").toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [customers, customerSearch]);

  const totals = useMemo(() => {
    if (!selectedCustomer) return null;
    const valid = lines.filter((l) => isValidDraftLine(l, hotelStay));
    if (!valid.length) return null;
    return calcInvoiceTotals(
      valid.map((l) => ({
        quantity: Number(l.quantity),
        unitPrice: Number(l.unit_price),
        vatRate: hotelStay ? l.vat_rate : l.product!.vat_rate,
        vatCategory: hotelStay ? l.vat_category : l.product!.vat_category,
      })),
      { pricesIncludeVat }
    );
  }, [lines, selectedCustomer, hotelStay, pricesIncludeVat]);

  const pickProduct = (key: string, product: Product) => {
    const jewellery = lineFields.jewelleryPricing && isJewelleryProduct(product);
    const shop = jewellery
      ? findLatestRate(metalRates, product.metal_type, product.purity)
      : null;
    const resolved = jewellery
      ? resolveJewelleryRatePerGram({
          metal: product.metal_type,
          purity: product.purity,
          liveRates: liveMarket?.rates,
          shopRatePerGram: shop?.rate_per_gram ?? null,
        })
      : { ratePerGram: 0, source: null as RateSource | null };
    const j = jewellery
      ? jewelleryLineFromProduct(product, resolved.ratePerGram)
      : null;

    setLines((prev) =>
      prev.map((l) =>
        l.key === key
          ? {
              ...l,
              product,
              quantity: j?.quantity ?? 1,
              unit_price: j?.unit_price ?? product.base_price,
              price_overridden: false,
              search: `${product.name}${product.variant ? ` (${product.variant})` : ""}`,
              imei_serial: lineFields.lineImeiSerial ? l.imei_serial || "" : "",
              batch_number: lineFields.lineBatchNumber
                ? product.batch_number ?? l.batch_number ?? ""
                : "",
              variant_tag: lineFields.lineVariantTag
                ? product.variant ?? l.variant_tag ?? ""
                : "",
              metal_rate_used: j?.ratePerGram ?? null,
              rate_locked_at_sale: j?.ratePerGram ?? null,
              rate_source: resolved.source,
              gross_weight: j?.grossWeight ?? null,
              net_weight: j?.netWeight ?? null,
              making_charge_amount: j?.makingCharge ?? null,
              stone_value: j?.stoneValue ?? null,
              jewellery_purity: j?.jewellery_purity ?? null,
              jewellery_huid: j?.jewellery_huid ?? null,
              wastage_amount: j?.wastageAmount ?? null,
            }
          : l
      )
    );
    setActiveLine(null);
    if (jewellery && !(resolved.ratePerGram > 0)) {
      toast(
        `No live/shop rate for ${formatJewelleryCatalogLabel(product.metal_type, product.purity)}. Override rate/g on the line.`,
        "info"
      );
    }
  };

  const addBookingLine = (booking: RoomBooking) => {
    const type = booking.room?.room_type;
    const nights = bookingNights(booking);
    const label = bookingLineLabel(booking);
    const line: DraftLine = {
      ...newLine(),
      product: null,
      room_booking_id: booking.id,
      booking_label: label,
      search: label,
      quantity: nights,
      unit_price: Number(type?.base_price ?? 0),
      price_overridden: false,
      vat_rate: Number(type?.vat_rate ?? getCountryConfig(company?.country).standardRate),
      vat_category: "standard",
      hsn_code: type?.sac_code ?? "",
      check_in_date: booking.check_in_date,
      check_out_date: booking.check_out_date,
      guest_id_proof: booking.guest_id_proof ?? "",
    };
    setLines((prev) => [...prev, line]);
    if (!customerId) setCustomerId(booking.customer_id);
    setBookingPick("");
  };

  const productSuggestions = (search: string) => {
    const q = search.toLowerCase();
    return (products ?? [])
      .filter(
        (p) =>
          !q ||
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          (p.variant ?? "").toLowerCase().includes(q) ||
          (p.barcode ?? "").toLowerCase().includes(q)
      )
      .slice(0, 8);
  };

  const applyBarcode = (raw: string) => {
    const code = raw.trim();
    if (!code) return;
    const product =
      (products ?? []).find(
        (p) =>
          (p.barcode && p.barcode === code) ||
          p.sku.toLowerCase() === code.toLowerCase()
      ) ?? null;
    if (!product) {
      toast(
        `We couldn't find a product for "${code}". Check the barcode or add the product first.`,
        "error"
      );
      return;
    }
    setLines((prev) => {
      const existing = prev.find((l) => l.product?.id === product.id);
      if (existing) {
        return prev.map((l) =>
          l.key === existing.key ? { ...l, quantity: Number(l.quantity) + 1 } : l
        );
      }
      const empty = prev.find((l) => !l.product && !l.room_booking_id);
      const filled: DraftLine = {
        ...newLine(),
        product,
        unit_price: product.base_price,
        price_overridden: false,
        search: `${product.name}${product.variant ? ` (${product.variant})` : ""}`,
        quantity: 1,
        batch_number: lineFields.lineBatchNumber ? product.batch_number ?? "" : "",
        variant_tag: lineFields.lineVariantTag ? product.variant ?? "" : "",
      };
      if (empty) {
        return prev.map((l) => (l.key === empty.key ? { ...filled, key: l.key } : l));
      }
      return [...prev, filled];
    });
    toast(`Added ${product.name}`);
    // Re-pick through jewellery engine when applicable
    if (lineFields.jewelleryPricing && isJewelleryProduct(product)) {
      // find the line we just set - defer by updating via pick on matching product
      setLines((prev) => {
        const target = prev.find((l) => l.product?.id === product.id);
        if (!target) return prev;
        const rateRow = findLatestRate(metalRates, product.metal_type, product.purity);
        const j = jewelleryLineFromProduct(product, rateRow?.rate_per_gram ?? 0);
        return prev.map((l) =>
          l.key === target.key
            ? {
                ...l,
                quantity: j.quantity,
                unit_price: j.unit_price,
                metal_rate_used: j.ratePerGram,
                gross_weight: j.grossWeight,
                net_weight: j.netWeight,
                making_charge_amount: j.makingCharge,
                stone_value: j.stoneValue,
                jewellery_purity: j.jewellery_purity,
                jewellery_huid: j.jewellery_huid,
              }
            : l
        );
      });
    }
  };

  /** Tap a tile: bump the line if it is already on the bill, else fill/append a line. */
  const addFromCatalog = (product: Product) => {
    const jewellery = lineFields.jewelleryPricing && isJewelleryProduct(product);
    const existing = !jewellery ? lines.find((l) => l.product?.id === product.id) : undefined;
    if (existing) {
      setLines((prev) =>
        prev.map((l) =>
          l.key === existing.key
            ? { ...l, quantity: roundQty(Number(l.quantity) + 1, product.unit) }
            : l
        )
      );
      return;
    }
    const empty = lines.find((l) => !l.product && !l.room_booking_id);
    if (empty) {
      pickProduct(empty.key, product);
      return;
    }
    const line = newLine();
    setLines((prev) => [...prev, line]);
    pickProduct(line.key, product);
  };

  const goNext = () => {
    setError("");
    if (step === 1 && !customerId) {
      setError("Pick who this invoice is for, or add a new customer.");
      return;
    }
    if (step === 2) {
      const valid = lines.filter((l) => isValidDraftLine(l, hotelStay));
      if (!valid.length) {
        setError(
          hotelStay
            ? "Add at least one room booking to bill."
            : `Add at least one ${labels.product.toLowerCase()} they're buying.`
        );
        return;
      }
    }
    setStep((s) => Math.min(4, s + 1));
  };

  const submit = async () => {
    setError("");
    if (!user) return;
    if (!customerId) {
      setError("Pick who this invoice is for.");
      setStep(1);
      return;
    }
    const valid = lines.filter((l) => isValidDraftLine(l, hotelStay));
    if (!valid.length) {
      setError(
        hotelStay
          ? "Add at least one room booking."
          : `Add at least one ${labels.product.toLowerCase()}.`
      );
      setStep(2);
      return;
    }

    const items = valid.map((l) => {
      if (hotelStay) {
        return {
          product_id: null,
          room_booking_id: l.room_booking_id,
          quantity: Number(l.quantity),
          unit_price: Number(l.unit_price),
          price_overridden: l.price_overridden,
          hsn_code: l.hsn_code || null,
          vat_rate: l.vat_rate,
          vat_category: l.vat_category,
          check_in_date: l.check_in_date || null,
          check_out_date: l.check_out_date || null,
          guest_id_proof: l.guest_id_proof || null,
        };
      }
      const jewellery =
        lineFields.jewelleryPricing && isJewelleryProduct(l.product);
      return {
        product_id: l.product!.id,
        quantity: roundQty(Number(l.quantity), l.product!.unit),
        unit: l.product!.unit ?? "pcs",
        unit_price: Number(l.unit_price),
        price_overridden: l.price_overridden,
        imei_serial: lineFields.lineImeiSerial ? l.imei_serial || null : null,
        batch_number: lineFields.lineBatchNumber ? l.batch_number || null : null,
        variant_tag: lineFields.lineVariantTag ? l.variant_tag || null : null,
        metal_rate_used: jewellery ? l.metal_rate_used : null,
        rate_locked_at_sale: jewellery
          ? l.rate_locked_at_sale ?? l.metal_rate_used
          : null,
        rate_source: jewellery
          ? l.price_overridden
            ? "manual"
            : l.rate_source
          : null,
        gross_weight: jewellery ? l.gross_weight : null,
        net_weight: jewellery ? l.net_weight : null,
        making_charge_amount: jewellery ? l.making_charge_amount : null,
        stone_value: jewellery ? l.stone_value : null,
        jewellery_purity: jewellery ? l.jewellery_purity : null,
        jewellery_huid: jewellery ? l.jewellery_huid : null,
        check_in_date: null,
        check_out_date: null,
        guest_id_proof: null,
      };
    });

    try {
      if (mode === "edit" && invoice) {
        await update.mutateAsync({
          invoice_id: invoice.id,
          customer_id: customerId,
          invoice_date: invoiceDate,
          notes: notes || undefined,
          warehouse_id: warehouseId || null,
          user_id: user.id,
          force,
          prices_include_vat: pricesIncludeVat,
          items,
        });
        toast(`Done! ${invoice.invoice_number} is updated.`);
        router.push(`/invoices/${invoice.id}`);
      } else {
        const created = await create.mutateAsync({
          customer_id: customerId,
          invoice_date: invoiceDate,
          notes: notes || undefined,
          warehouse_id: warehouseId || null,
          user_id: user.id,
          prefix: company?.invoice_prefix ?? DEFAULT_INVOICE_PREFIX,
          prices_include_vat: pricesIncludeVat,
          items,
        });
        toast(`Done! Invoice ${created.invoice_number} is ready.`);
        if (!created.id) {
          throw new Error("Create succeeded but no invoice id was returned");
        }
        router.push(`/invoices/${created.id}${emailAfter ? "?send=email" : "?created=1"}`);
      }
    } catch (e) {
      const msg = (e as Error).message || "Something went wrong";
      const friendly = msg.includes("limit")
        ? msg
        : `We couldn't save this invoice. ${msg.includes("stock") ? "Check stock levels and try again." : "Please check the details and try again."}`;
      setError(friendly);
      toast(friendly, "error");
    }
  };

  const saving = create.isPending || update.isPending;
  const cancelHref = mode === "edit" && invoice ? `/invoices/${invoice.id}` : "/invoices";
  const validLines = lines.filter((l) => isValidDraftLine(l, hotelStay));

  return (
    <div>
      <PageHeader
        eyebrow="Billing"
        title={
          mode === "edit"
            ? `Edit ${invoice?.invoice_number ?? "Invoice"}`
            : "New Invoice"
        }
        description={
          mode === "edit"
            ? "Update the customer, products, and notes - same invoice number"
            : "Create a bill in four easy steps"
        }
        actions={
          <Button variant="secondary" onClick={() => router.push(cancelHref)}>
            Cancel
          </Button>
        }
      />

      {force && mode === "edit" && (
        <div className="mb-4 rounded-[10px] border border-brass/40 bg-brass/10 px-4 py-3 text-sm text-ink">
          Admin override: this invoice is <strong>{invoice?.status}</strong>. Saving will still
          reverse and re-apply stock for the new line items.
        </div>
      )}

      <InvoiceStepProgress
        step={step}
        onStepClick={(s) => {
          if (s < step) setStep(s);
        }}
      />

      {step === 1 && (
        <section className="panel mx-auto max-w-2xl p-5 sm:p-6">
          <h2 className="font-display text-lg font-semibold text-ink">Who is this for?</h2>
          <p className="mt-1 text-sm text-slate">
            Choose the customer receiving this invoice - or add someone new.
          </p>
          <div className="mt-4 flex items-center justify-end">
            <Button variant="ghost" onClick={() => setQuickAdd(true)}>
              <UserPlus className="h-4 w-4" /> Add new customer
            </Button>
          </div>
          <div className="relative mt-2">
            <input
              className="h-11 min-h-[44px] w-full rounded-[10px] border border-border bg-surface px-3 text-sm text-ink placeholder:text-slate-dim focus:border-emerald focus:outline-none"
              placeholder={`Search by name, phone, or ${taxIdLabel}…`}
              value={selectedCustomer ? selectedCustomer.name : customerSearch}
              onChange={(e) => {
                setCustomerId("");
                setCustomerSearch(e.target.value);
                setShowCustomerDrop(true);
              }}
              onFocus={() => setShowCustomerDrop(true)}
            />
            {showCustomerDrop && !selectedCustomer && (
              <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-[10px] border border-border bg-surface">
                {filteredCustomers.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className="flex w-full flex-col px-3 py-3 text-left text-sm transition-colors hover:bg-surface-hover"
                    onClick={() => {
                      setCustomerId(c.id);
                      setCustomerSearch("");
                      setShowCustomerDrop(false);
                    }}
                  >
                    <span className="font-medium text-ink">{c.name}</span>
                    <span className="text-xs text-slate">
                      {c.state}
                      {!hideCustomerType && ` · ${customerTypeLabel(c.customer_type)}`}
                      {c.tax_id ? ` · ${taxIdLabel} ${c.tax_id}` : ""}
                    </span>
                  </button>
                ))}
                {!filteredCustomers.length && (
                  <p className="px-3 py-3 text-sm text-slate">
                    No matches - try Add new customer above.
                  </p>
                )}
              </div>
            )}
          </div>
          {selectedCustomer && (
            <p className="mt-3 text-sm text-slate">
              {selectedCustomer.state || "-"}
              {" · "}
              {selectedCustomer.tax_id ? (
                <span className="text-emerald">
                  VAT registered ({taxIdLabel} {selectedCustomer.tax_id})
                </span>
              ) : (
                <span>Not VAT registered</span>
              )}
            </p>
          )}
          {error && <p className="mt-3 text-sm text-rose">{error}</p>}
          <div className="mt-6 flex justify-end">
            <Button size="lg" onClick={goNext} disabled={!customerId}>
              {hotelStay ? "Next: Bill a room stay" : "Next: What are they buying?"}
            </Button>
          </div>
        </section>
      )}

      {step === 2 && hotelStay && (
        <section className="panel mx-auto max-w-3xl p-5 sm:p-6">
          <h2 className="font-display text-lg font-semibold text-ink">Bill a room stay</h2>
          <p className="mt-1 text-sm text-slate">
            Pick an existing booking. Nights and rate come from the stay and room type — no product quantity.
          </p>

          <div className="mt-4 flex flex-wrap items-end gap-2">
            <div className="min-w-[220px] flex-1">
              <Select
                label="Room booking"
                value={bookingPick}
                onChange={(e) => setBookingPick(e.target.value)}
                placeholder="Select a booking…"
                options={billableBookings.map((b) => ({
                  value: b.id,
                  label: `${bookingLineLabel(b)} · ${formatDate(b.check_in_date)} → ${formatDate(b.check_out_date)} · ${b.customer?.name ?? "Guest"}`,
                }))}
              />
            </div>
            <Button
              onClick={() => {
                const b = billableBookings.find((x) => x.id === bookingPick);
                if (b) addBookingLine(b);
              }}
              disabled={!bookingPick}
            >
              <Plus className="h-4 w-4" /> Add stay
            </Button>
          </div>
          {!billableBookings.length && (
            <p className="mt-3 text-sm text-slate">
              No open bookings for this guest.{" "}
              <Link href="/bookings" className="text-emerald underline">
                Create a booking
              </Link>{" "}
              first.
            </p>
          )}

          <div className="mt-4 space-y-3">
            {lines.length === 0 && (
              <p className="rounded-[10px] border border-dashed border-border bg-cloud px-4 py-6 text-center text-sm text-slate">
                No stays on this invoice yet.
              </p>
            )}
            {lines.map((line) => (
              <div
                key={line.key}
                className="grid gap-2 rounded-[10px] border border-border bg-cloud p-3 sm:grid-cols-12"
              >
                <div className="sm:col-span-5">
                  <p className="text-[10px] uppercase tracking-[0.05em] text-slate">Stay</p>
                  <p className="mt-1 text-sm font-medium text-ink">{line.booking_label}</p>
                  <p className="mt-0.5 font-mono text-xs text-slate">
                    {formatDate(line.check_in_date)} → {formatDate(line.check_out_date)}
                    {line.vat_rate ? ` · VAT ${line.vat_rate}%` : ""}
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-[10px] uppercase tracking-[0.05em] text-slate">
                    Nights
                  </label>
                  <input
                    type="number"
                    min={1}
                    className="h-11 min-h-[44px] w-full rounded-[8px] border border-border bg-surface px-2 font-mono text-sm text-ink focus:border-emerald focus:outline-none"
                    value={line.quantity}
                    {...getNumberInputHandlers({
                      onChange: (e) =>
                        setLines((prev) =>
                          prev.map((l) =>
                            l.key === line.key
                              ? {
                                  ...l,
                                  quantity: e.target.value,
                                }
                              : l
                          )
                        ),
                    })}
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="mb-1 block text-[10px] uppercase tracking-[0.05em] text-slate">
                    Rate / night{" "}
                    {line.price_overridden && <span className="text-brass">(override)</span>}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="h-11 min-h-[44px] w-full rounded-[8px] border border-border bg-surface px-2 font-mono text-sm text-ink focus:border-emerald focus:outline-none"
                    value={line.unit_price}
                    {...getNumberInputHandlers({
                      onChange: (e) => {
                        const raw = e.target.value;
                        const booking = bookings?.find((b) => b.id === line.room_booking_id);
                        const catalog = Number(booking?.room?.room_type?.base_price ?? 0);
                        setLines((prev) =>
                          prev.map((l) =>
                            l.key === line.key
                              ? {
                                  ...l,
                                  unit_price: raw,
                                  price_overridden: Number(raw) !== catalog,
                                }
                              : l
                          )
                        );
                      },
                    })}
                  />
                </div>
                <div className="flex items-end justify-between gap-2 sm:col-span-2">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.05em] text-slate">Line</p>
                    <p className="font-mono text-sm font-medium text-ink">
                      {money(Number(line.quantity) * Number(line.unit_price))}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    onClick={() => setLines((prev) => prev.filter((l) => l.key !== line.key))}
                  >
                    <Trash2 className="h-4 w-4 text-rose" /> Remove
                  </Button>
                </div>
                <div className="sm:col-span-12">
                  <label className="mb-1 block text-[10px] uppercase tracking-[0.05em] text-slate">
                    Guest ID proof{" "}
                    <span className="normal-case tracking-normal text-slate-dim">(optional)</span>
                  </label>
                  <input
                    className="h-11 min-h-[44px] w-full rounded-[8px] border border-border bg-surface px-2 text-sm text-ink focus:border-emerald focus:outline-none"
                    value={line.guest_id_proof}
                    placeholder="Aadhaar / passport last 4…"
                    onChange={(e) =>
                      setLines((prev) =>
                        prev.map((l) =>
                          l.key === line.key ? { ...l, guest_id_proof: e.target.value } : l
                        )
                      )
                    }
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <Input
              label="Notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any extra note for this bill…"
            />
          </div>

          {error && <p className="mt-3 text-sm text-rose">{error}</p>}
          <div className="mt-6 flex flex-wrap justify-between gap-2">
            <Button variant="secondary" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button size="lg" onClick={goNext}>
              Next: Check everything
            </Button>
          </div>
        </section>
      )}

      {step === 2 && !hotelStay && (
        <section className="panel mx-auto max-w-3xl p-5 sm:p-6">
          <h2 className="font-display text-lg font-semibold text-ink">What are they buying?</h2>
          <p className="mt-1 text-sm text-slate">
            Add {labels.productPlural.toLowerCase()}, quantities, and prices. You can scan a barcode if you have one.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <div className="relative">
              <ScanBarcode className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-dim" />
              <input
                className="h-11 min-h-[44px] w-52 rounded-[10px] border border-border bg-surface pl-9 pr-3 text-sm text-ink placeholder:text-slate-dim focus:border-emerald focus:outline-none sm:w-60"
                placeholder="Scan barcode / SKU"
                value={barcodeScan}
                onChange={(e) => setBarcodeScan(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    applyBarcode(barcodeScan);
                    setBarcodeScan("");
                  }
                }}
              />
            </div>
            <Button variant="outline" type="button" onClick={() => setCameraOpen(true)} aria-label="Scan a barcode with the camera">
              <Camera className="h-4 w-4" /> Camera
            </Button>
            <Button variant="secondary" onClick={() => setLines((p) => [...p, newLine()])}>
              <Plus className="h-4 w-4" /> Add another {labels.product.toLowerCase()}
            </Button>
            {(products ?? []).length > 0 && (
              <button
                type="button"
                onClick={() => setShowQuick((v) => !v)}
                className="ml-auto inline-flex h-11 items-center gap-1.5 rounded-[10px] px-3 text-sm font-medium text-primary transition-colors hover:bg-primary/5"
              >
                <LayoutGrid className="h-4 w-4" />
                {showQuick ? "Hide catalog" : "Tap to add"}
              </button>
            )}
          </div>

          <CameraScanner open={cameraOpen} onClose={() => setCameraOpen(false)} onDetected={applyBarcode} />

          {showQuick && (products ?? []).length > 0 && (
            <div className="mt-4 rounded-[12px] border border-border bg-cloud/60 p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="-mx-1 flex min-w-0 flex-1 gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
                  {[{ name: "", count: (products ?? []).length }, ...quickCats].map((c) => (
                    <button
                      key={c.name || "all"}
                      type="button"
                      onClick={() => setQuickCat(c.name)}
                      className={cn(
                        "shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all",
                        quickCat === c.name
                          ? "border-primary bg-primary text-white"
                          : "border-border bg-surface text-slate hover:text-ink"
                      )}
                    >
                      {c.name || "All"} <span className="opacity-60">{c.count}</span>
                    </button>
                  ))}
                </div>
                <div className="relative sm:w-48">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-dim" />
                  <input
                    value={quickSearch}
                    onChange={(e) => setQuickSearch(e.target.value)}
                    placeholder="Filter…"
                    className="h-9 w-full rounded-[8px] border border-border bg-surface pl-8 pr-2 text-sm text-ink outline-none focus:border-primary"
                  />
                </div>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {quickProducts.map((p) => {
                  const inBill = lines
                    .filter((l) => l.product?.id === p.id)
                    .reduce((sum, l) => sum + Number(l.quantity || 0), 0);
                  const stock = Number(p.current_stock ?? 0);
                  const low = !p.is_service && stock <= Number(p.reorder_threshold ?? 0);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => addFromCatalog(p)}
                      className={cn(
                        "group relative flex min-h-[64px] flex-col items-start rounded-[10px] border bg-surface p-2.5 text-left transition-all hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-[0.98]",
                        inBill > 0 ? "border-primary/50 ring-2 ring-primary/15" : "border-border"
                      )}
                    >
                      <span className="flex w-full items-start gap-1.5">
                        <ProductSwatch productId={p.id} className="mt-1 shrink-0" />
                        <span className="line-clamp-2 text-[13px] font-semibold leading-snug text-ink">
                          {p.name}
                          {p.variant ? <span className="font-normal text-slate"> · {p.variant}</span> : null}
                        </span>
                      </span>
                      <span className="mt-1 font-mono text-[11px] text-slate">
                        {money(p.base_price)} / {getUnit(p.unit).short}
                        {!p.is_service && (
                          <span className={cn("ml-1", low ? "text-rose" : "")}>· {formatQty(stock, p.unit)}</span>
                        )}
                      </span>
                      {inBill > 0 && (
                        <span className="absolute -right-1.5 -top-1.5 rounded-full bg-primary px-1.5 py-0.5 font-mono text-[10px] font-bold text-white shadow">
                          {formatQty(inBill, p.unit, false)}
                        </span>
                      )}
                    </button>
                  );
                })}
                {!quickProducts.length && (
                  <p className="col-span-full py-4 text-center text-sm text-slate">Nothing matches that filter.</p>
                )}
              </div>
            </div>
          )}

          <div className="mt-4 space-y-3">
            {lines.map((line) => (
              <div
                key={line.key}
                className="grid gap-2 rounded-[10px] border border-border bg-cloud p-3 sm:grid-cols-12"
                style={
                  line.product
                    ? { boxShadow: `inset 3px 0 0 ${productColor(line.product.id)}` }
                    : undefined
                }
              >
                <div className="relative sm:col-span-5">
                  <label className="mb-1 block text-[10px] uppercase tracking-[0.05em] text-slate">
                    {labels.product}
                  </label>
                  <input
                    ref={(el) => {
                      searchRefs.current[line.key] = el;
                    }}
                    className="h-11 min-h-[44px] w-full rounded-[8px] border border-border bg-surface px-2 text-sm text-ink focus:border-emerald focus:outline-none"
                    value={line.search}
                    placeholder={labels.searchProduct}
                    onFocus={() => setActiveLine(line.key)}
                    onChange={(e) => {
                      setActiveLine(line.key);
                      setLines((prev) =>
                        prev.map((l) =>
                          l.key === line.key
                            ? { ...l, search: e.target.value, product: null }
                            : l
                        )
                      );
                    }}
                  />
                  {activeLine === line.key && !line.product && (
                    <div className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-[10px] border border-border bg-surface">
                      {productSuggestions(line.search).map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          className="flex w-full justify-between px-3 py-2.5 text-left text-sm hover:bg-surface-hover"
                          onClick={() => pickProduct(line.key, p)}
                        >
                          <span className="inline-flex min-w-0 items-center gap-2 text-ink">
                            <ProductSwatch productId={p.id} />
                            <span className="min-w-0">
                              <span className="block truncate">
                                {p.name}
                                {p.variant ? ` (${p.variant})` : ""}
                              </span>
                              <span className="block truncate text-[11px] text-slate">
                                {categoryPath(p.category, p.subcategory)}
                              </span>
                            </span>
                          </span>
                          <span className="shrink-0 pl-2 text-right font-mono text-xs text-slate">
                            {money(p.base_price)} / {getUnit(p.unit).short}
                            {!lineFields.hotelStay && !p.is_service && (
                              <span className="block text-[11px]">{formatQty(p.current_stock ?? 0, p.unit)} left</span>
                            )}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="sm:col-span-3">
                  <QtyStepper
                    label={labels.quantity}
                    unit={line.product?.unit}
                    value={line.quantity}
                    onChange={(next) =>
                      setLines((prev) =>
                        prev.map((l) => (l.key === line.key ? { ...l, quantity: next } : l))
                      )
                    }
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-[10px] uppercase tracking-[0.05em] text-slate">
                    {lineFields.jewelleryPricing && isJewelleryProduct(line.product)
                      ? "Rate / g"
                      : lineFields.hotelStay
                        ? "Rate / night"
                        : line.product
                          ? `Rate / ${getUnit(line.product.unit).short}`
                          : "Rate"}{" "}
                    {line.price_overridden && <span className="text-brass">(override)</span>}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="h-11 min-h-[44px] w-full rounded-[8px] border border-border bg-surface px-2 font-mono text-sm text-ink focus:border-emerald focus:outline-none"
                    value={
                      lineFields.jewelleryPricing && isJewelleryProduct(line.product)
                        ? line.metal_rate_used ?? ""
                        : line.unit_price
                    }
                    {...getNumberInputHandlers({
                      onChange: (e) =>
                        setLines((prev) =>
                          prev.map((l) => {
                            if (l.key !== line.key) return l;
                            const raw = e.target.value;
                            if (raw === "") {
                              return {
                                ...l,
                                metal_rate_used: null,
                                rate_locked_at_sale: null,
                                unit_price: "",
                                price_overridden: false,
                              };
                            }
                            const numericRaw = Number(raw);
                            if (
                              lineFields.jewelleryPricing &&
                              isJewelleryProduct(l.product)
                            ) {
                              const catalog = resolveJewelleryRatePerGram({
                                metal: l.product!.metal_type,
                                purity: l.product!.purity,
                                liveRates: liveMarket?.rates,
                                shopRatePerGram:
                                  findLatestRate(
                                    metalRates,
                                    l.product!.metal_type,
                                    l.product!.purity
                                  )?.rate_per_gram ?? null,
                              });
                              const breakdown = calcJewelleryTaxable({
                                netWeight: Number(l.net_weight) || 0,
                                grossWeight: Number(l.gross_weight) || 0,
                                ratePerGram: numericRaw,
                                makingChargeType: l.product!.making_charge_type,
                                makingChargeValue:
                                  Number(l.product!.making_charge_value) || 0,
                                stoneValue: Number(l.product!.stone_value) || 0,
                                wastagePercent:
                                  Number(l.product!.wastage_percent) || 0,
                              });
                              return {
                                ...l,
                                metal_rate_used: numericRaw,
                                rate_locked_at_sale: numericRaw,
                                rate_source:
                                  numericRaw !== catalog.ratePerGram
                                    ? "manual"
                                    : catalog.source,
                                making_charge_amount: breakdown.makingCharge,
                                stone_value: breakdown.stoneValue,
                                wastage_amount: breakdown.wastageAmount,
                                unit_price: breakdown.taxableValue,
                                price_overridden: numericRaw !== catalog.ratePerGram,
                              };
                            }
                            return {
                              ...l,
                              unit_price: raw,
                              price_overridden:
                                !!l.product && Number(raw) !== l.product.base_price,
                            };
                          })
                        ),
                    })}
                  />
                </div>
                <div className="flex items-end justify-between gap-2 sm:col-span-2">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.05em] text-slate">
                      {lineFields.jewelleryPricing && isJewelleryProduct(line.product)
                        ? "Taxable"
                        : "Line"}
                    </p>
                    <p className="font-mono text-sm font-medium text-ink">
                      {line.product
                        ? money(Number(line.quantity) * Number(line.unit_price))
                        : "-"}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    disabled={lines.length === 1}
                    onClick={() => setLines((prev) => prev.filter((l) => l.key !== line.key))}
                  >
                    <Trash2 className="h-4 w-4 text-rose" /> Remove
                  </Button>
                </div>
                {lineFields.jewelleryPricing && isJewelleryProduct(line.product) && (
                  <div className="sm:col-span-12 rounded-[8px] border border-border/80 bg-surface px-3 py-2 font-mono text-[11px] text-slate">
                    Locked rate {money(line.rate_locked_at_sale ?? line.metal_rate_used ?? 0)}
                    /g
                    {line.rate_source ? ` · ${line.rate_source}` : ""} ·{" "}
                    {formatPurityLabel(line.jewellery_purity)} ·{" "}
                    {line.net_weight ?? 0} g ×{" "}
                    {money(line.metal_rate_used ?? 0)}/g = Metal{" "}
                    {money(
                      calcJewelleryTaxable({
                        netWeight: Number(line.net_weight) || 0,
                        ratePerGram: Number(line.metal_rate_used) || 0,
                        makingChargeType: "flat",
                        makingChargeValue: 0,
                        stoneValue: 0,
                      }).metalValue
                    )}{" "}
                    + Making {money(line.making_charge_amount ?? 0)}
                    {(line.wastage_amount ?? 0) > 0
                      ? ` + Wastage ${money(line.wastage_amount ?? 0)}`
                      : ""}{" "}
                    + Stone {money(line.stone_value ?? 0)}
                    {line.jewellery_huid ? ` · HUID ${line.jewellery_huid}` : ""}
                  </div>
                )}
                {(lineFields.lineImeiSerial ||
                  lineFields.lineBatchNumber ||
                  lineFields.lineVariantTag) && (
                  <div className="grid gap-2 sm:col-span-12 sm:grid-cols-3">
                    {lineFields.lineImeiSerial && (
                      <div>
                        <label className="mb-1 block text-[10px] uppercase tracking-[0.05em] text-slate">
                          {labels.lineImeiSerial}{" "}
                          <span className="normal-case tracking-normal text-slate-dim">(optional)</span>
                        </label>
                        <input
                          className="h-11 min-h-[44px] w-full rounded-[8px] border border-border bg-surface px-2 font-mono text-sm text-ink focus:border-emerald focus:outline-none"
                          value={line.imei_serial}
                          placeholder={labels.lineImeiSerialPlaceholder}
                          onChange={(e) =>
                            setLines((prev) =>
                              prev.map((l) =>
                                l.key === line.key ? { ...l, imei_serial: e.target.value } : l
                              )
                            )
                          }
                        />
                      </div>
                    )}
                    {lineFields.lineBatchNumber && (
                      <div>
                        <label className="mb-1 block text-[10px] uppercase tracking-[0.05em] text-slate">
                          {labels.lineBatchNumber}{" "}
                          <span className="normal-case tracking-normal text-slate-dim">(optional)</span>
                        </label>
                        <input
                          className="h-11 min-h-[44px] w-full rounded-[8px] border border-border bg-surface px-2 font-mono text-sm text-ink focus:border-emerald focus:outline-none"
                          value={line.batch_number}
                          placeholder="Batch / lot"
                          onChange={(e) =>
                            setLines((prev) =>
                              prev.map((l) =>
                                l.key === line.key ? { ...l, batch_number: e.target.value } : l
                              )
                            )
                          }
                        />
                      </div>
                    )}
                    {lineFields.lineVariantTag && (
                      <div
                        className={
                          lineFields.lineImeiSerial || lineFields.lineBatchNumber
                            ? ""
                            : "sm:col-span-2"
                        }
                      >
                        <label className="mb-1 block text-[10px] uppercase tracking-[0.05em] text-slate">
                          {labels.lineVariantTag}{" "}
                          <span className="normal-case tracking-normal text-slate-dim">(optional)</span>
                        </label>
                        <input
                          className="h-11 min-h-[44px] w-full rounded-[8px] border border-border bg-surface px-2 text-sm text-ink focus:border-emerald focus:outline-none"
                          value={line.variant_tag}
                          placeholder={labels.lineVariantTagPlaceholder}
                          onChange={(e) =>
                            setLines((prev) =>
                              prev.map((l) =>
                                l.key === line.key ? { ...l, variant_tag: e.target.value } : l
                              )
                            )
                          }
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {totals && (
            <div className="mt-3 flex items-center justify-between rounded-[10px] bg-primary-soft px-4 py-2.5 text-sm">
              <span className="text-slate">
                {validLines.length} item{validLines.length === 1 ? "" : "s"} · VAT {money(totals.totalVat)}
              </span>
              <span className="font-mono font-semibold text-ink">{money(totals.grandTotal)}</span>
            </div>
          )}

          <div className="mt-4">
            <Input
              label="Notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any extra note for this bill…"
            />
          </div>

          {error && <p className="mt-3 text-sm text-rose">{error}</p>}
          <div className="mt-6 flex flex-wrap justify-between gap-2">
            <Button variant="secondary" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button size="lg" onClick={goNext}>
              Next: Check everything
            </Button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="panel mx-auto max-w-xl p-5 sm:p-6">
          <h2 className="font-display text-lg font-semibold text-ink">Check everything</h2>
          <p className="mt-1 text-sm text-slate">
            Confirm the date, warehouse, and totals before you create the invoice.
          </p>

          {mode === "edit" && invoice && (
            <p className="mt-3 font-mono text-xs text-slate">No. {invoice.invoice_number}</p>
          )}

          <div className="mt-4 space-y-3">
            <Input
              label="Invoice date"
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
            />
            {(warehouses ?? []).length > 0 && !hotelStay && (
              <Select
                label="Warehouse"
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                options={(warehouses ?? []).map((w) => ({ value: w.id, label: w.name }))}
              />
            )}
          </div>

          <div className="mt-5 rounded-[10px] border border-border bg-cloud p-4 text-sm">
            <p className="font-medium text-ink">{selectedCustomer?.name}</p>
            <p className="mt-1 text-slate">
              {validLines.length} {hotelStay ? "stay(s)" : "product(s)"}
            </p>
            <ul className="mt-2 space-y-1 text-slate">
              {validLines.map((l) => (
                <li key={l.key}>
                  {hotelStay
                    ? `${l.booking_label} × ${l.quantity} night(s)`
                    : `${l.product?.name} × ${formatQty(l.quantity, l.product?.unit)}`}{" "}
                  - {money(Number(l.quantity) * Number(l.unit_price))}
                </li>
              ))}
            </ul>
          </div>

          <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-[10px] border border-border bg-surface p-3 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-[var(--primary)]"
              checked={pricesIncludeVat}
              onChange={(e) => setPricesIncludeVat(e.target.checked)}
            />
            <span>
              <span className="inline-flex items-center gap-1 font-medium text-ink">
                Prices include VAT <HelpTip helpKey="prices_include_vat" />
              </span>
              <span className="block text-xs text-slate">
                {pricesIncludeVat
                  ? "VAT is worked out from the prices you entered."
                  : "VAT is added on top of the prices you entered."}
              </span>
            </span>
          </label>

          {totals ? (
            <div className="mt-5 space-y-2.5">
              <LeaderRow label="Taxable amount" value={money(totals.subtotal)} />
              {totals.breakdown.map((b) => (
                <LeaderRow
                  key={`${b.vatCategory}-${b.vatRate}`}
                  label={
                    b.vatCategory === "standard"
                      ? `VAT ${b.vatRate}% on ${money(b.taxableValue)}`
                      : `${b.vatCategory === "zero" ? "Zero-rated" : "Exempt"} ${money(b.taxableValue)}`
                  }
                  value={money(b.vatAmount)}
                  helpKey={b.vatCategory === "standard" ? "vat" : undefined}
                />
              ))}
              <LeaderRow label="Total VAT" value={money(totals.totalVat)} />
              <div className="mt-3 rounded-[10px] border border-sage bg-sage-soft px-3 py-3">
                <div className="flex items-end justify-between gap-3">
                  <span className="font-display text-xs font-semibold uppercase tracking-[0.06em] text-sage">
                    Total (incl. VAT)
                  </span>
                  <span className="font-display text-2xl font-semibold tracking-tight text-sage">
                    <span className="font-mono">{money(totals.grandTotal)}</span>
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate">Add a customer and products to see totals.</p>
          )}

          {error && <p className="mt-3 text-sm text-rose">{error}</p>}
          <div className="mt-6 flex flex-wrap justify-between gap-2">
            <Button variant="secondary" onClick={() => setStep(2)}>
              Back
            </Button>
            <Button size="lg" onClick={goNext}>
              Next: Send it
            </Button>
          </div>
        </section>
      )}

      {step === 4 && (
        <section className="panel mx-auto max-w-xl p-5 sm:p-6">
          <h2 className="font-display text-lg font-semibold text-ink">Send it</h2>
          <p className="mt-1 text-sm text-slate">
            {mode === "edit"
              ? "Save your changes. You can share the invoice on WhatsApp from the invoice page."
              : "Create the invoice, then you can print, download PDF, or share on WhatsApp."}
          </p>

          <div className="mt-5 rounded-[10px] border border-border bg-cloud p-4 text-sm space-y-2">
            <p>
              <span className="text-slate">Customer:</span>{" "}
              <span className="font-medium text-ink">{selectedCustomer?.name}</span>
            </p>
            <p>
              <span className="text-slate">Items:</span>{" "}
              <span className="font-medium text-ink">{validLines.length}</span>
            </p>
            <p>
              <span className="text-slate">Total:</span>{" "}
              <span className="font-mono font-semibold text-ink">
                {totals ? money(totals.grandTotal) : "-"}
              </span>
            </p>
          </div>

          {mode === "create" && (
            <label
              className={cn(
                "mt-4 flex cursor-pointer items-start gap-3 rounded-[10px] border p-3 text-sm transition-colors",
                emailAfter ? "border-primary/40 bg-primary-soft" : "border-border bg-surface"
              )}
            >
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 accent-[var(--primary)]"
                checked={emailAfter}
                onChange={(e) => setEmailAfter(e.target.checked)}
              />
              <span className="min-w-0">
                <span className="inline-flex items-center gap-1.5 font-medium text-ink">
                  <Mail className="h-4 w-4 text-primary" /> Email it to the customer
                </span>
                <span className="block text-xs text-slate">
                  {customerEmail
                    ? `We'll open a ready-to-send email to ${customerEmail} with the PDF attached.`
                    : "No email on file - you can type one in before sending."}
                </span>
              </span>
            </label>
          )}

          {error && <p className="mt-3 text-sm text-rose">{error}</p>}

          <div className="mt-6 flex flex-wrap justify-between gap-2">
            <Button variant="secondary" onClick={() => setStep(3)}>
              Back
            </Button>
            <Button size="lg" loading={saving} onClick={() => void submit()}>
              {mode === "edit" ? "Save changes" : "Generate invoice"}
            </Button>
          </div>
        </section>
      )}

      <CustomerFormModal
        open={quickAdd}
        onClose={() => setQuickAdd(false)}
        customer={null}
        onCreated={(c: Customer) => {
          setCustomerId(c.id);
          setCustomerSearch("");
        }}
      />
    </div>
  );
}
