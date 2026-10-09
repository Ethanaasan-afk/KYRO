"use client";

import { SignatureUploadSection } from "@/components/settings/signature-upload-section";
import { BusinessTypePicker } from "@/components/settings/business-type-picker";
import { EmailSettingsSection } from "@/components/settings/email-settings-section";
import { InvoiceOptionsSection } from "@/components/settings/invoice-options-section";
import { DataSection } from "@/components/settings/data-section";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { EmptyState, LoadingBlock, PageHeader } from "@/components/ui/page-header";
import { useToast } from "@/components/ui/toast";
import { useCompanySettings, useUpdateCompanySettings } from "@/hooks/use-company";
import { BUSINESS_TYPE_OPTIONS, type BusinessType } from "@/lib/business-types";
import { DEFAULT_INVOICE_PREFIX } from "@/lib/brand";
import { DEFAULT_COUNTRY, ENABLED_COUNTRIES, getCountryConfig } from "@/lib/vat/countries";
import { isDemoMode } from "@/lib/demo/mode";
import { companySettingsSchema } from "@/lib/validations";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

type FormValues = z.infer<typeof companySettingsSchema>;

export default function SettingsPage() {
  const { isAdmin, user, loading: authLoading } = useAuth();
  const { data, isLoading, isError, error, refetch } = useCompanySettings();
  const update = useUpdateCompanySettings();
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(companySettingsSchema),
  });

  const watchedType = watch("business_type");
  const country = getCountryConfig(watch("country"));
  const typeHint =
    BUSINESS_TYPE_OPTIONS.find((o) => o.value === watchedType)?.description ?? "";

  useEffect(() => {
    if (!data) return;
    reset({
      company_name: data.company_name ?? "",
      brand_name: data.brand_name ?? "",
      country: data.country ?? DEFAULT_COUNTRY,
      tax_id: data.tax_id ?? "",
      prices_include_vat: data.prices_include_vat ?? false,
      address: data.address ?? "",
      city: data.city ?? "",
      state: data.state ?? "",
      pincode: data.pincode ?? "",
      phone: data.phone ?? "",
      email: data.email ?? "",
      bank_name: data.bank_name ?? "",
      bank_account: data.bank_account ?? "",
      bank_swift: data.bank_swift ?? "",
      bank_branch: data.bank_branch ?? "",
      invoice_prefix: data.invoice_prefix ?? DEFAULT_INVOICE_PREFIX,
      business_type: data.business_type ?? "general",
    });
    // FIX: Added `data` to the dependency array to satisfy ESLint
  }, [data, reset]);

  if (authLoading) return <LoadingBlock />;

  if (!isAdmin) {
    return (
      <EmptyState
        title="Admin only"
        description={`Signed in as ${user?.role ?? "staff"}. Only an admin account can open Settings. Ask an admin to change your role, or log in with an admin user.`}
      />
    );
  }

  if (isLoading) return <LoadingBlock />;

  if (isError || !data) {
    return (
      <EmptyState
        title="Could not load settings"
        description={(error as Error)?.message || "Check your connection / Supabase organizations table."}
        action={
          <Button type="button" variant="secondary" onClick={() => refetch()}>
            Retry
          </Button>
        }
      />
    );
  }

  const onSubmit = async (values: FormValues) => {
    try {
      await update.mutateAsync({ id: data.id, ...values });
      toast("Settings saved");
      reset(values);
    } catch (e) {
      const msg = (e as Error).message || "Save failed";
      toast(msg, /Saved, but/.test(msg) ? "info" : "error");
      if (/Saved, but/.test(msg)) reset(values);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Settings"
        title="Organization settings"
        description="Letterhead, VAT registration and bank details - stored on your organization"
      />

      <form
        onSubmit={handleSubmit(onSubmit, () =>
          toast("Please fix the highlighted fields", "error")
        )}
        className="panel max-w-2xl space-y-6 p-5"
      >
        <div>
          <h2 className="mb-1 text-sm font-semibold text-ink">Business type</h2>
          <p className="mb-3 text-xs text-slate">
            Pick what fits best - it sets your categories, units (kg, litres, metres…) and the extra invoice fields.
          </p>
          <BusinessTypePicker
            value={watchedType}
            onChange={(v: BusinessType) => setValue("business_type", v, { shouldDirty: true })}
          />
          {typeHint ? <p className="mt-2 text-xs text-slate">{typeHint}</p> : null}
          <p className="mt-1 text-[11px] text-slate-dim">
            Changes labels and optional fields only - VAT, stock and billing stay exactly the same.
          </p>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold text-ink">VAT registration</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Country"
              options={ENABLED_COUNTRIES.map((c) => ({ value: c.code, label: c.name }))}
              error={errors.country?.message}
              {...register("country")}
            />
            <Input
              label={`${country.taxIdLabel} (VAT registration number)`}
              placeholder={country.taxIdPlaceholder}
              error={errors.tax_id?.message}
              {...register("tax_id")}
            />
          </div>
          <p className="mt-1.5 text-xs text-slate">
            {country.taxIdHint}. Printed on every tax invoice. Invoices are issued in {country.currency}
            {" "}at the {country.standardRate}% standard rate unless an item is zero-rated or exempt.
          </p>
          <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-[var(--primary)]"
              {...register("prices_include_vat")}
            />
            <span>
              <span className="font-medium text-ink">My prices include VAT</span>
              <span className="block text-xs text-slate">
                Default for new invoices. Turn on if your shelf/catalog prices already include VAT
                (common in retail). You can still change it on each invoice.
              </span>
            </span>
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Company name" error={errors.company_name?.message} {...register("company_name")} />
          <Input label="Brand name" error={errors.brand_name?.message} {...register("brand_name")} />
          <Input label="Invoice prefix" error={errors.invoice_prefix?.message} {...register("invoice_prefix")} />
          <div className="sm:col-span-2">
            <Input label="Address" error={errors.address?.message} {...register("address")} />
          </div>
          <Input label="City / Area" error={errors.city?.message} {...register("city")} />
          {country.regions.length ? (
            <Select
              label={country.regionLabel}
              placeholder={`Select ${country.regionLabel.toLowerCase()}`}
              options={country.regions.map((r) => ({ value: r, label: r }))}
              error={errors.state?.message}
              {...register("state")}
            />
          ) : (
            <Input label={country.regionLabel} error={errors.state?.message} {...register("state")} />
          )}
          <Input label={country.postalLabel} error={errors.pincode?.message} {...register("pincode")} />
          <Input label="Phone" placeholder={`${country.dialCode} …`} error={errors.phone?.message} {...register("phone")} />
          <Input label="Email" error={errors.email?.message} {...register("email")} />
        </div>

        <SignatureUploadSection
          organizationId={data.id}
          signatureUrl={data.signature_url}
        />

        <div>
          <h2 className="mb-3 text-sm font-semibold">Bank details (invoice footer)</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Bank name" {...register("bank_name")} />
            <Input label="IBAN" placeholder="AE07 0331 2345 6789 0123 456" {...register("bank_account")} />
            <Input label="SWIFT / BIC" {...register("bank_swift")} />
            <Input label="Branch" {...register("bank_branch")} />
          </div>
        </div>

        {update.isError && (
          <p className="text-xs text-coral-deep">{(update.error as Error).message}</p>
        )}

        <div
          className={
            isDirty
              ? "sticky bottom-20 z-20 -mx-2 flex items-center justify-between gap-3 rounded-[14px] border border-primary/30 bg-surface/95 px-4 py-3 shadow-lift backdrop-blur md:bottom-4"
              : "flex"
          }
        >
          {isDirty && <p className="text-sm font-medium text-ink">You have unsaved changes</p>}
          <Button type="submit" loading={update.isPending || isSubmitting} disabled={!isDirty}>
            Save settings
          </Button>
        </div>
      </form>

      <InvoiceOptionsSection />

      <EmailSettingsSection />

      <DataSection />

      <div className="panel mt-6 max-w-2xl space-y-3 p-5">
        <h2 className="font-display text-sm font-semibold text-ink">Help &amp; tour</h2>
        <p className="text-sm text-slate">
          Replay the welcome walkthrough that opens and explains every section of the app.
        </p>
        <Button
          type="button"
          variant="secondary"
          onClick={async () => {
            const { requestOnboardingReplay } = await import("@/lib/onboarding-storage");
            requestOnboardingReplay();
            if (user?.id && !isDemoMode()) {
              try {
                const { createClient } = await import("@/lib/supabase/client");
                await createClient()
                  .from("users")
                  .update({ has_seen_onboarding: false })
                  .eq("id", user.id);
              } catch {
                /* local replay still works */
              }
            }
            toast("Starting the tour…");
            window.location.href = "/dashboard";
          }}
        >
          Replay welcome tour
        </Button>
      </div>
    </div>
  );
}