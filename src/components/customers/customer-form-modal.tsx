"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useBusinessType } from "@/hooks/use-business-type";
import { useCustomerMutations } from "@/hooks/use-customers";
import { useToast } from "@/components/ui/toast";
import { useCompanySettings } from "@/hooks/use-company";
import { DEFAULT_COUNTRY, countryOptions, getCountryConfig } from "@/lib/vat/countries";
import type { Customer } from "@/lib/types";
import { customerSchema } from "@/lib/validations";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

type FormValues = z.infer<typeof customerSchema>;

export function CustomerFormModal({
  open,
  onClose,
  customer,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  customer: Customer | null;
  onCreated?: (c: Customer) => void;
}) {
  const { isHotel, isJewellery } = useBusinessType();
  /** Retail / wholesaler is for trade verticals only — not hotel guests or jewellery clients. */
  const hideCustomerType = isHotel || isJewellery;
  const { upsert } = useCustomerMutations();
  const { data: company } = useCompanySettings();
  const orgCountry = company?.country ?? DEFAULT_COUNTRY;
  const sellerCountry = getCountryConfig(orgCountry);
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      billing_address: "",
      state: "",
      country: DEFAULT_COUNTRY,
      tax_id: "",
      customer_type: "b2c",
    },
  });


  useEffect(() => {
    if (customer) {
      reset({
        name: customer.name,
        phone: customer.phone ?? "",
        email: customer.email ?? "",
        billing_address: customer.billing_address ?? "",
        state: customer.state ?? "",
        country: customer.country || orgCountry,
        tax_id: customer.tax_id ?? "",
        customer_type: hideCustomerType ? "b2c" : customer.customer_type,
      });
    } else {
      reset({
        name: "",
        phone: "",
        email: "",
        billing_address: "",
        state: "",
        country: orgCountry,
        tax_id: "",
        customer_type: "b2c",
      });
    }
  }, [customer, open, reset, hideCustomerType, orgCountry]);

  // Region list, tax number format and phone prefix follow the customer's own country
  const country = getCountryConfig(watch("country") || orgCountry);
  const foreign = country.code !== sellerCountry.code;

  const onSubmit = async (values: FormValues) => {
    const result = await upsert.mutateAsync({
      ...(customer?.id ? { id: customer.id } : {}),
      ...values,
      customer_type: hideCustomerType ? "b2c" : values.customer_type,
      email: values.email || null,
      phone: values.phone || null,
      tax_id: values.tax_id || null,
      billing_address: values.billing_address || null,
    });
    toast(customer ? "Customer updated" : "Customer created");
    onCreated?.(result);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={customer ? "Edit customer" : "Add customer"}
      size="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Name / Business name"
          className="sm:col-span-2"
          error={errors.name?.message}
          {...register("name")}
        />
        {!hideCustomerType && (
          <Select
            label="Customer type"
            options={[
              { value: "b2c", label: "Retail" },
              { value: "b2b", label: "Wholesaler" },
            ]}
            {...register("customer_type")}
            onChange={(e) => setValue("customer_type", e.target.value as "b2b" | "b2c")}
          />
        )}
        <Select
          label="Country"
          options={countryOptions()}
          {...register("country", {
            onChange: (e) => {
              const next = getCountryConfig(e.target.value);
              if (next.regions.length) setValue("state", "");
            },
          })}
        />
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
        <Input label="Phone" placeholder={`${country.dialCode} …`} {...register("phone")} />
        <Input label="Email" type="email" {...register("email")} />
        <Input
          label={
            country.taxSystem === "none"
              ? `${country.taxIdLabel} (optional)`
              : `${country.taxIdLabel} (if ${country.taxName} registered)`
          }
          helpKey="tax_id"
          placeholder={country.taxIdPlaceholder}
          className="sm:col-span-2"
          error={errors.tax_id?.message}
          {...register("tax_id")}
        />
        {foreign && sellerCountry.taxSystem !== "none" ? (
          <p className="sm:col-span-2 text-xs text-slate">
            Customer abroad: invoices start as{" "}
            {sellerCountry.vatZone && country.vatZone === sellerCountry.vatZone
              ? "reverse charge when you add their VAT number (no VAT charged), otherwise a local sale"
              : "an export (zero-rated)"}
            . You can change it on each invoice.
          </p>
        ) : null}
        <Textarea
          label="Billing address"
          className="sm:col-span-2"
          {...register("billing_address")}
        />

        {upsert.isError && (
          <p className="sm:col-span-2 text-xs text-danger">{(upsert.error as Error).message}</p>
        )}

        <div className="sm:col-span-2 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={upsert.isPending}>
            Save
          </Button>
        </div>
      </form>
    </Modal>
  );
}
