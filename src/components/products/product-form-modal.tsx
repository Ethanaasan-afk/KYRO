"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { CategoryFields } from "@/components/products/category-fields";
import { Select } from "@/components/ui/select";
import { PACK_SIZES } from "@/lib/constants";
import { useCompanySettings } from "@/hooks/use-company";
import { VAT_CATEGORIES, VAT_CATEGORY_LABELS } from "@/lib/vat";
import { getCountryConfig } from "@/lib/vat/countries";
import {
  categoryOptionsForBusinessType,
  productFormFieldSet,
  type ProductFormFieldId,
} from "@/lib/business-types";
import {
  calcJewelleryTaxable,
  jewelleryPurityKey,
  JEWELLERY_DEFAULT_VAT,
  JEWELLERY_VAT_HELP,
  JEWELLERY_PURITY_OPTIONS,
  MAKING_CHARGE_TYPE_OPTIONS,
  parseJewelleryPurityKey,
  resolveJewelleryRatePerGram,
  type MakingChargeType,
  type MetalType,
} from "@/lib/jewellery";
import { calcProductMargin, MARGIN_BADGE_CLASS, priceWithVat } from "@/lib/product-margin";
import { formatCurrency, generateSku } from "@/lib/utils";
import { getUnit, unitAllowsDecimals, unitChoices } from "@/lib/units";
import { productSchemaForFields } from "@/lib/validations";
import type { Product } from "@/lib/types";
import { useProductMutations, useProducts } from "@/hooks/use-products";
import { useBusinessType } from "@/hooks/use-business-type";
import { useLiveMarketRates } from "@/hooks/use-live-market-rates";
import { findLatestRate, useMetalRates } from "@/hooks/use-metal-rates";
import { useToast } from "@/components/ui/toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

type FormValues = z.infer<ReturnType<typeof productSchemaForFields>>;

const FIELD_ORDER: ProductFormFieldId[] = [
  "name",
  "category",
  "subcategory",
  "unit",
  "variant",
  "pack_size",
  "sku",
  "barcode",
  "batch_number",
  "hsn_code",
  "base_price",
  "manufacturing_cost",
  "vat_rate",
  "is_service",
  "reorder_threshold",
  "mfg_date",
  "exp_date",
  "is_active",
];

export function ProductFormModal({
  open,
  onClose,
  product,
}: {
  open: boolean;
  onClose: () => void;
  product: Product | null;
}) {
  const { upsert } = useProductMutations();
  const { toast } = useToast();
  const { labels, businessType, isJewellery, isHotel, config } = useBusinessType();
  const { data: company } = useCompanySettings();
  const country = getCountryConfig(company?.country);
  const taxName = country.taxName;
  const taxFree = country.taxSystem === "none";
  // Gold / jewellery: India 3% GST, elsewhere the jewellery default or the standard rate
  const jewelleryRate = taxFree ? 0 : country.jewelleryRate ?? (country.code === "AE" ? JEWELLERY_DEFAULT_VAT : country.standardRate);
  const { data: allProducts } = useProducts();
  const { data: metalRates } = useMetalRates();
  const { data: liveMarket } = useLiveMarketRates(isJewellery);

  const visible = useMemo(() => productFormFieldSet(businessType), [businessType]);

  const categoryOptions = useMemo(
    () =>
      categoryOptionsForBusinessType(
        businessType,
        (allProducts ?? []).map((p) => p.category)
      ),
    [businessType, allProducts]
  );

  // New products start in the category the shop uses most
  const usualCategory = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of allProducts ?? []) counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0];
  }, [allProducts]);

  const emptyDefaults: FormValues = useMemo(
    () => ({
      name: "",
      category: usualCategory ?? categoryOptions[0] ?? "Other",
      subcategory: "",
      unit: config.defaultUnit,
      variant: "",
      sku: "",
      barcode: "",
      pack_size: visible.has("pack_size") ? "Unit" : "Pcs",
      hsn_code: "",
      base_price: 0,
      manufacturing_cost: null,
      vat_rate: isJewellery ? jewelleryRate : country.standardRate,
      vat_category: "standard",
      reorder_threshold: visible.has("reorder_threshold") ? 10 : 0,
      is_active: true,
      mfg_date: "",
      exp_date: "",
      imei_serial: "",
      batch_number: "",
      is_service: isHotel ? true : config.defaultIsService,
      metal_type: isJewellery ? "gold" : null,
      purity: isJewellery ? "22k" : "",
      huid_number: "",
      gross_weight: null,
      net_weight: null,
      making_charge_type: isJewellery ? "flat" : null,
      making_charge_value: 0,
      stone_value: 0,
      wastage_percent: 0,
    }),
    [categoryOptions, usualCategory, visible, isJewellery, isHotel, country.standardRate, jewelleryRate, config.defaultUnit, config.defaultIsService]
  );

  const schema = useMemo(() => productSchemaForFields(visible), [visible]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyDefaults,
  });

  const [metalType, setMetalType] = useState<MetalType>("gold");
  const [purity, setPurity] = useState("22k");
  const [huid, setHuid] = useState("");
  const [weightGrams, setWeightGrams] = useState("");
  const [makingType, setMakingType] = useState<MakingChargeType>("flat");
  const [makingValue, setMakingValue] = useState("0");
  const [stoneValue, setStoneValue] = useState("0");
  const [wastagePercent, setWastagePercent] = useState("0");

  useEffect(() => {
    if (!open) return;
    if (product) {
      reset({
        name: product.name,
        category: product.category,
        subcategory: product.subcategory ?? "",
        unit: product.unit ?? "pcs",
        variant: product.variant ?? "",
        sku: product.sku,
        barcode: product.barcode ?? "",
        pack_size: product.pack_size,
        hsn_code: product.hsn_code,
        base_price: product.base_price,
        manufacturing_cost: product.manufacturing_cost ?? null,
        vat_rate: product.vat_rate,
        vat_category: product.vat_category,
        reorder_threshold: product.reorder_threshold,
        is_active: product.is_active,
        mfg_date: product.mfg_date ?? "",
        exp_date: product.exp_date ?? "",
        imei_serial: product.imei_serial ?? "",
        batch_number: product.batch_number ?? "",
        is_service: Boolean(product.is_service),
        metal_type: product.metal_type ?? null,
        purity: product.purity ?? "",
        huid_number: product.huid_number ?? "",
        gross_weight: product.gross_weight ?? null,
        net_weight: product.net_weight ?? null,
        making_charge_type: product.making_charge_type ?? null,
        making_charge_value: product.making_charge_value ?? 0,
        stone_value: product.stone_value ?? 0,
        wastage_percent: product.wastage_percent ?? 0,
      });
      if (isJewellery) {
        setMetalType((product.metal_type as MetalType) || "gold");
        setPurity(product.purity || "22k");
        setHuid(product.huid_number ?? "");
        const w = product.net_weight ?? product.gross_weight;
        setWeightGrams(w != null ? String(w) : "");
        const mt = (product.making_charge_type as MakingChargeType) || "flat";
        setMakingType(mt === "percent" ? "percent" : "flat");
        setMakingValue(String(product.making_charge_value ?? 0));
        setStoneValue(String(product.stone_value ?? 0));
        setWastagePercent(String(product.wastage_percent ?? 0));
      }
    } else {
      reset(emptyDefaults);
      if (isJewellery) {
        setMetalType("gold");
        setPurity("22k");
        setHuid("");
        setWeightGrams("");
        setMakingType("flat");
        setMakingValue("0");
        setStoneValue("0");
        setWastagePercent("0");
      }
    }
  }, [product, open, reset, emptyDefaults, isJewellery]);

  const name = watch("name");
  const pack = watch("pack_size");
  const variant = watch("variant");
  const category = watch("category");
  const subcategory = watch("subcategory") ?? "";
  const unit = watch("unit") || "pcs";
  // Only the units this kind of business uses, unless the owner asks for more
  const [showAllUnits, setShowAllUnits] = useState(false);
  const unitDef = getUnit(unit);
  const isService = Boolean(watch("is_service"));
  const basePrice = Number(watch("base_price")) || 0;
  const vatCategory = watch("vat_category");
  const vatRate = vatCategory === "standard" ? Number(watch("vat_rate")) || 0 : 0;
  const mfgCostRaw = watch("manufacturing_cost");
  const mfgCost =
    mfgCostRaw == null || (typeof mfgCostRaw === "string" && mfgCostRaw === "")
      ? null
      : Number(mfgCostRaw);

  const shopRate = useMemo(
    () => findLatestRate(metalRates, metalType, purity),
    [metalRates, metalType, purity]
  );

  const resolvedRate = useMemo(
    () =>
      resolveJewelleryRatePerGram({
        metal: metalType,
        purity,
        liveRates: liveMarket?.rates,
        shopRatePerGram: shopRate?.rate_per_gram ?? null,
      }),
    [metalType, purity, liveMarket?.rates, shopRate]
  );

  const jewelleryPreview = useMemo(() => {
    if (!isJewellery) return null;
    const w = Number(weightGrams) || 0;
    return calcJewelleryTaxable({
      netWeight: w,
      grossWeight: w,
      ratePerGram: resolvedRate.ratePerGram,
      makingChargeType: makingType,
      makingChargeValue: Number(makingValue) || 0,
      stoneValue: Number(stoneValue) || 0,
      wastagePercent: Number(wastagePercent) || 0,
    });
  }, [
    isJewellery,
    weightGrams,
    resolvedRate,
    makingType,
    makingValue,
    stoneValue,
    wastagePercent,
  ]);

  const finalWithVat = useMemo(() => {
    const taxable = isJewellery ? jewelleryPreview?.taxableValue ?? 0 : basePrice;
    return priceWithVat(taxable, vatRate);
  }, [isJewellery, jewelleryPreview, basePrice, vatRate]);

  const margin = useMemo(
    () =>
      calcProductMargin(
        basePrice,
        Number.isFinite(mfgCost as number) ? mfgCost : null
      ),
    [basePrice, mfgCost]
  );

  const purityOptions = useMemo(
    () =>
      JEWELLERY_PURITY_OPTIONS.map((o) => ({
        value: jewelleryPurityKey(o.metal_type, o.purity),
        label: o.label,
      })),
    []
  );

  const puritySelectValue = jewelleryPurityKey(metalType, purity);

  const show = (field: ProductFormFieldId) => {
    if (!visible.has(field)) return false;
    if (field === "reorder_threshold" && isService) return false;
    return true;
  };

  const onSubmit = async (values: FormValues) => {
    const sku =
      (show("sku") ? values.sku : "")?.trim() ||
      generateSku(values.name || "ITEM", values.pack_size || "Unit", values.variant);
    const pack_size = show("pack_size")
      ? values.pack_size || "Unit"
      : isJewellery || isHotel
        ? "Pcs"
        : values.pack_size?.trim() || "Unit";
    const hsn_code = show("hsn_code") ? values.hsn_code?.trim() ?? "" : values.hsn_code?.trim() || "";
    const asService = Boolean(show("is_service") && values.is_service);

    if (isJewellery) {
      const w = Number(weightGrams);
      if (!(w > 0)) {
        toast("Weight (grams) is required for jewellery.", "error");
        return;
      }
    }

    // Jewellery: never persist a fixed catalog price — estimates recalculate from live rates.
    const computedBase = isJewellery ? 0 : values.base_price;

    await upsert.mutateAsync({
      ...(product?.id ? { id: product.id } : {}),
      name: values.name,
      category: values.category,
      subcategory: show("subcategory") ? values.subcategory?.trim() || null : null,
      unit: show("unit") ? values.unit || "pcs" : isHotel ? "night" : "pcs",
      variant: show("variant") ? values.variant || null : null,
      sku,
      barcode: show("barcode") ? values.barcode || null : null,
      pack_size,
      hsn_code,
      base_price: computedBase,
      manufacturing_cost: show("manufacturing_cost")
        ? values.manufacturing_cost ?? null
        : null,
      vat_category: values.vat_category as Product["vat_category"],
      vat_rate: !taxFree && values.vat_category === "standard" ? values.vat_rate : 0,
      reorder_threshold: asService
        ? 0
        : show("reorder_threshold")
          ? values.reorder_threshold
          : 0,
      is_active: values.is_active,
      mfg_date: show("mfg_date") ? values.mfg_date || null : null,
      exp_date: show("exp_date") ? values.exp_date || null : null,
      batch_number: show("batch_number") ? values.batch_number || null : null,
      is_service: isHotel ? true : show("is_service") ? asService : false,
      imei_serial: null,
      metal_type: isJewellery ? metalType : null,
      purity: isJewellery ? purity : null,
      huid_number: isJewellery ? huid.trim() || null : null,
      gross_weight: isJewellery ? Number(weightGrams) || null : null,
      net_weight: isJewellery ? Number(weightGrams) || null : null,
      making_charge_type: isJewellery ? makingType : null,
      making_charge_value: isJewellery ? Number(makingValue) || 0 : null,
      stone_value: isJewellery ? Number(stoneValue) || 0 : null,
      wastage_percent: isJewellery ? Number(wastagePercent) || 0 : null,
    });
    toast(product ? `${labels.product} updated` : `${labels.product} created`);
    onClose();
  };

  const fieldsToRender = FIELD_ORDER.filter((f) => show(f));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={product ? labels.editProduct : labels.addProduct}
      size="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
        {fieldsToRender.map((field) => {
          switch (field) {
            case "name":
              return (
                <Input
                  key={field}
                  label={labels.productName}
                  error={errors.name?.message}
                  {...register("name")}
                />
              );
            case "category":
              return (
                <CategoryFields
                  key={field}
                  category={category ?? ""}
                  subcategory={subcategory ?? ""}
                  showSubcategory={visible.has("subcategory")}
                  error={errors.category?.message}
                  onCategory={(v) => setValue("category", v, { shouldValidate: true, shouldDirty: true })}
                  onSubcategory={(v) => setValue("subcategory", v, { shouldDirty: true })}
                />
              );
            case "subcategory":
              // rendered together with the category picker
              return null;
            case "unit":
              return (
                <div key={field} className="space-y-1.5">
                  <Select
                    label="Sold by (unit)"
                    options={unitChoices(config.units, unit, showAllUnits)}
                    {...register("unit")}
                  />
                  {!showAllUnits && (
                    <button
                      type="button"
                      onClick={() => setShowAllUnits(true)}
                      className="text-[11px] font-medium text-primary hover:underline"
                    >
                      Need a different unit? Show all units
                    </button>
                  )}
                  <p className="text-[11px] text-slate">
                    {unitAllowsDecimals(unit)
                      ? `Bill any amount, e.g. 1.25 ${unitDef.short}. Price below is per ${unitDef.short}.`
                      : `Whole ${unitDef.label.toLowerCase()}s only. Price below is per ${unitDef.short}.`}
                  </p>
                </div>
              );
            case "variant":
              return (
                <Input
                  key={field}
                  label={labels.variant}
                  placeholder={
                    businessType === "cloth_shop" ? "e.g. L, Red" : undefined
                  }
                  {...register("variant")}
                />
              );
            case "pack_size":
              return (
                <div key={field} className="contents">
                  <Select
                    label={labels.packSize}
                    options={[
                      ...PACK_SIZES.map((p) => ({ value: p, label: p })),
                      { value: "Unit", label: "Unit" },
                      { value: "Pcs", label: "Pcs" },
                      { value: "custom", label: "Custom (type below)" },
                    ]}
                    {...register("pack_size")}
                  />
                  {!PACK_SIZES.includes(pack as (typeof PACK_SIZES)[number]) &&
                    pack !== "Unit" &&
                    pack !== "Pcs" && (
                      <Input
                        label={`Custom ${labels.packSize.toLowerCase()}`}
                        {...register("pack_size")}
                        className="sm:col-span-2"
                      />
                    )}
                </div>
              );
            case "sku":
              return (
                <div key={field} className="flex items-end gap-2">
                  <Input label="SKU" error={errors.sku?.message} {...register("sku")} />
                  {!product && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mb-0.5 shrink-0"
                      onClick={() =>
                        setValue("sku", generateSku(name || "ITEM", pack || "1", variant))
                      }
                    >
                      Auto
                    </Button>
                  )}
                </div>
              );
            case "barcode":
              return (
                <Input
                  key={field}
                  label="Barcode / EAN (optional)"
                  helpKey="barcode"
                  placeholder="Scan or type barcode"
                  {...register("barcode")}
                />
              );
            case "batch_number":
              return (
                <Input
                  key={field}
                  label={`${labels.productBatchNumber} (optional)`}
                  placeholder="e.g. BN-2026-01"
                  className="sm:col-span-2"
                  {...register("batch_number")}
                />
              );
            case "hsn_code":
              return (
                <Input
                  key={field}
                  label={country.taxSystem === "gst" ? "HSN / SAC code" : "Item code (optional)"}
                  helpKey="hsn_code"
                  error={errors.hsn_code?.message}
                  {...register("hsn_code")}
                />
              );
            case "base_price":
              return (
                <Input
                  key={field}
                  label={taxFree ? `Price per ${unitDef.short}` : `Price per ${unitDef.short} (excl. ${taxName})`}
                  type="number"
                  step="any"
                  error={errors.base_price?.message}
                  {...register("base_price")}
                />
              );
            case "manufacturing_cost":
              return (
                <div key={field} className="space-y-1.5">
                  <div className="flex items-end gap-2">
                    <Input
                      label="Manufacturing cost"
                      type="number"
                      step="0.01"
                      placeholder="Internal only"
                      emptyAsZero={false}
                      error={errors.manufacturing_cost?.message as string | undefined}
                      className="flex-1"
                      {...register("manufacturing_cost")}
                    />
                    {margin && (
                      <span
                        className={`mb-0.5 shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${MARGIN_BADGE_CLASS[margin.tone]}`}
                        title="(Base - cost) / base - internal only; does not affect invoices"
                      >
                        Margin {margin.label}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate">
                    Quick reference only - not used on invoices. Detailed costs stay in Business
                    Data.
                  </p>
                </div>
              );
            case "vat_rate":
              // No sales tax in this country: every product is 0%
              if (taxFree) return null;
              return (
                <div key={field} className="contents">
                  <Select
                    label={`${taxName} treatment`}
                    helpKey="vat_category"
                    options={VAT_CATEGORIES.map((c) => ({ value: c, label: VAT_CATEGORY_LABELS[c] }))}
                    error={errors.vat_category?.message}
                    {...register("vat_category", {
                      onChange: (e) =>
                        setValue(
                          "vat_rate",
                          e.target.value === "standard"
                            ? isJewellery
                              ? jewelleryRate
                              : country.standardRate
                            : 0
                        ),
                    })}
                  />
                  {vatCategory === "standard" ? (
                    <div>
                      <Input
                        label={`${taxName} rate %`}
                        helpKey="vat_rate"
                        help={isJewellery && country.code === "AE" ? JEWELLERY_VAT_HELP : undefined}
                        type="number"
                        step="0.01"
                        error={errors.vat_rate?.message}
                        {...register("vat_rate")}
                      />
                      {/* Quick-pick the rates used in this country */}
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {country.rates
                          .filter((r) => r.rate > 0)
                          .map((r) => (
                            <button
                              key={r.rate}
                              type="button"
                              title={r.label}
                              onClick={() => setValue("vat_rate", r.rate, { shouldDirty: true })}
                              className={`rounded-full border px-2 py-0.5 text-[11px] ${
                                Number(watch("vat_rate")) === r.rate
                                  ? "border-primary bg-primary/10 text-primary"
                                  : "border-border text-slate hover:border-primary/40"
                              }`}
                            >
                              {r.rate}%
                            </button>
                          ))}
                      </div>
                    </div>
                  ) : null}
                  <p className="self-end font-mono text-xs text-slate sm:pb-2">
                    Final price with {taxName}:{" "}
                    <span className="font-medium text-ink">{formatCurrency(finalWithVat)}</span>
                  </p>
                </div>
              );
            case "is_service":
              return (
                <label
                  key={field}
                  className="flex items-start gap-2 text-sm text-ink sm:col-span-2"
                >
                  <input type="checkbox" className="mt-0.5" {...register("is_service")} />
                  <span>
                    <span className="font-medium">{labels.serviceToggle}</span>
                    <span className="mt-0.5 block text-[11px] text-slate">
                      Hides reorder/stock settings and skips stock deduction when invoiced.
                    </span>
                  </span>
                </label>
              );
            case "reorder_threshold":
              return (
                <Input
                  key={field}
                  label={`${labels.reorderThreshold} (${unitDef.short})`}
                  helpKey="reorder_threshold"
                  type="number"
                  step="any"
                  error={errors.reorder_threshold?.message}
                  {...register("reorder_threshold")}
                />
              );
            case "mfg_date":
              return (
                <Input
                  key={field}
                  label="Manufacturing date"
                  type="date"
                  error={errors.mfg_date?.message}
                  {...register("mfg_date")}
                />
              );
            case "exp_date":
              return (
                <Input
                  key={field}
                  label="Expiry date"
                  type="date"
                  error={errors.exp_date?.message}
                  {...register("exp_date")}
                />
              );
            case "is_active":
              return (
                <label
                  key={field}
                  className="flex items-center gap-2 text-sm text-muted sm:col-span-2"
                >
                  <input type="checkbox" {...register("is_active")} />
                  Active {labels.product.toLowerCase()}
                </label>
              );
            default:
              return null;
          }
        })}

        {isJewellery && (
          <div className="sm:col-span-2 space-y-4 rounded-[12px] border border-border bg-cloud p-4">
            <div>
              <h3 className="font-display text-sm font-semibold text-ink">
                Jewellery pricing
              </h3>
              <p className="mt-0.5 text-[11px] text-slate">
                Weight × today&apos;s live rate + making + wastage. Not stored as a fixed base
                price — recalculates daily.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Select
                id="jewellery_purity"
                label="Purity"
                options={purityOptions}
                value={puritySelectValue}
                onChange={(e) => {
                  const parsed = parseJewelleryPurityKey(e.target.value);
                  setMetalType(parsed.metal_type);
                  setPurity(parsed.purity);
                }}
              />
              <Input
                id="weight_grams"
                label="Weight (grams)"
                type="number"
                step="0.001"
                min={0}
                value={weightGrams}
                onChange={(e) => setWeightGrams(e.target.value)}
                onFocus={(e) => e.target.select()}
              />
              <div className="sm:col-span-2 space-y-1.5">
                <Input
                  id="huid"
                  label="Hallmark / certificate no. (optional)"
                  value={huid}
                  onChange={(e) => setHuid(e.target.value)}
                  placeholder="BIS hallmark unique ID"
                />
                <p className="text-[11px] text-amber">
                  Optional hallmark / certificate number for this piece.
                </p>
              </div>
              <Select
                id="making_type"
                label="Making charge type"
                options={[...MAKING_CHARGE_TYPE_OPTIONS]}
                value={makingType === "percent" ? "percent" : "flat"}
                onChange={(e) =>
                  setMakingType(e.target.value === "percent" ? "percent" : "flat")
                }
              />
              <Input
                id="making_value"
                label={
                  makingType === "percent"
                    ? "Making charge (%)"
                    : "Making charge (fixed amount)"
                }
                type="number"
                step="0.01"
                min={0}
                value={makingValue}
                onChange={(e) => setMakingValue(e.target.value)}
                onFocus={(e) => e.target.select()}
              />
              <Input
                id="wastage_percent"
                label="Wastage % (optional)"
                type="number"
                step="0.01"
                min={0}
                value={wastagePercent}
                onChange={(e) => setWastagePercent(e.target.value)}
                onFocus={(e) => e.target.select()}
              />
              <Input
                id="stone_value"
                label="Stone / diamond value"
                type="number"
                step="0.01"
                min={0}
                value={stoneValue}
                onChange={(e) => setStoneValue(e.target.value)}
                onFocus={(e) => e.target.select()}
              />
            </div>

            <div className="rounded-[10px] border border-sage bg-sage-soft px-3 py-3 text-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-sage">
                Estimated price at today&apos;s rate
              </p>
              {resolvedRate.ratePerGram > 0 ? (
                <>
                  <p className="mt-2 font-display text-lg font-semibold text-ink">
                    {formatCurrency(jewelleryPreview?.taxableValue ?? 0)}
                    <span className="ml-2 text-xs font-normal text-slate">{taxFree ? "" : `excl. ${taxName}`}</span>
                  </p>
                  <p className="mt-2 font-mono text-xs text-ink">
                    Metal {formatCurrency(jewelleryPreview?.metalValue ?? 0)} (
                    {Number(weightGrams) || 0} g × {formatCurrency(resolvedRate.ratePerGram)}
                    /g) + Making {formatCurrency(jewelleryPreview?.makingCharge ?? 0)}
                    {(jewelleryPreview?.wastageAmount ?? 0) > 0
                      ? ` + Wastage ${formatCurrency(jewelleryPreview?.wastageAmount ?? 0)}`
                      : ""}
                    {(jewelleryPreview?.stoneValue ?? 0) > 0
                      ? ` + Stone ${formatCurrency(jewelleryPreview?.stoneValue ?? 0)}`
                      : ""}
                  </p>
                  <p className="mt-1 text-[11px] text-slate">
                    Rate source:{" "}
                    {resolvedRate.source === "live_metal_rates"
                      ? "Live market rates"
                      : "Today's Rates (shop)"}
                    . Not saved on the product — locked only when you invoice.
                  </p>
                </>
              ) : (
                <p className="mt-2 text-xs text-amber">
                  No live or shop rate for this purity yet. Check Live rates / Today&apos;s
                  Rates.
                </p>
              )}
            </div>
          </div>
        )}

        {upsert.isError && (
          <p className="sm:col-span-2 text-xs text-danger">
            {(upsert.error as Error).message}
          </p>
        )}

        <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={upsert.isPending}>
            {product ? "Save changes" : labels.addProduct}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
