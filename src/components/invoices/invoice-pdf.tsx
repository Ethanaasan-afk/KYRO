import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import { amountInWords } from "@/lib/amount-in-words";
import { APP_NAME, BRAND_COLORS } from "@/lib/brand";
import { buildVatBreakdown, normalizeVatCategory } from "@/lib/vat";
import { getCountryConfig } from "@/lib/vat/countries";
import {
  getBusinessTypeConfig,
  showsProductFormField,
  type BusinessType,
} from "@/lib/business-types";
import {
  formatCompanyAddress,
  formatCompanyBankLine,
  formatCompanyContact,
} from "@/lib/invoice-letterhead";
import { invoicePdfFontFamily } from "@/lib/invoice-pdf-fonts";
import type { CompanySettings, Invoice, InvoiceItem } from "@/lib/types";
import { formatQty } from "@/lib/units";

/** Approximate printable content width on A4 with 32pt side padding. */
const CONTENT_WIDTH = 531;

function createStyles(fontFamily: string) {
  const bold = fontFamily === "Helvetica" ? "Helvetica-Bold" : fontFamily;
  return StyleSheet.create({
    page: {
      paddingTop: 28,
      paddingBottom: 72,
      paddingHorizontal: 32,
      fontSize: 9,
      fontFamily,
      color: BRAND_COLORS.ink,
      backgroundColor: "#FFFFFF",
    },
    headerTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 8,
    },
    brandRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    logoIcon: {
      width: 28,
      height: 28,
      marginRight: 8,
      objectFit: "contain",
    },
    logoWordmark: {
      height: 40,
      width: 180,
      objectFit: "contain",
    },
    brandFallback: {
      fontSize: 13,
      fontFamily: bold,
      fontWeight: 700,
      color: BRAND_COLORS.primary,
    },
    copyPill: {
      borderWidth: 1,
      borderColor: BRAND_COLORS.primary,
      borderRadius: 10,
      paddingVertical: 3,
      paddingHorizontal: 8,
      backgroundColor: "#F5F0FF",
    },
    copyPillText: {
      fontSize: 7,
      fontFamily: bold,
      fontWeight: 600,
      textTransform: "uppercase",
      letterSpacing: 0.6,
      color: BRAND_COLORS.primary,
    },
    gradientBar: {
      flexDirection: "row",
      height: 4,
      marginBottom: 10,
      borderRadius: 2,
      overflow: "hidden",
    },
    gradientSeg1: { flex: 1, backgroundColor: BRAND_COLORS.primary },
    gradientSeg2: { flex: 1, backgroundColor: "#8B2CF5" },
    gradientSeg3: { flex: 1, backgroundColor: "#A040FA" },
    gradientSeg4: { flex: 1, backgroundColor: BRAND_COLORS.primaryLight },
    footerAccent: {
      flexDirection: "row",
      height: 2,
      marginBottom: 8,
      borderRadius: 1,
      overflow: "hidden",
    },
    businessBlock: {
      marginBottom: 8,
    },
    businessName: {
      fontSize: 18,
      fontFamily: bold,
      fontWeight: 700,
      color: BRAND_COLORS.ink,
      letterSpacing: -0.2,
    },
    taxInvoiceLabel: {
      fontSize: 8,
      fontFamily: bold,
      fontWeight: 600,
      color: BRAND_COLORS.muted,
      textTransform: "uppercase",
      letterSpacing: 1.2,
      marginTop: 3,
      marginBottom: 4,
    },
    companyLine: {
      fontSize: 8.5,
      color: BRAND_COLORS.ink,
      marginTop: 1,
    },
    muted: {
      color: BRAND_COLORS.muted,
      fontSize: 7.5,
      marginTop: 1.5,
    },
    metaRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 6,
      marginBottom: 10,
    },
    metaBlock: {
      flex: 1,
      paddingRight: 10,
    },
    metaBlockRight: {
      width: 210,
      alignItems: "flex-end",
    },
    sectionLabel: {
      fontSize: 7.5,
      color: BRAND_COLORS.primary,
      marginBottom: 3,
      textTransform: "uppercase",
      letterSpacing: 0.7,
      fontFamily: bold,
      fontWeight: 700,
    },
    bold: { fontFamily: bold, fontWeight: 700 },
    bodyText: { fontSize: 8.5, color: BRAND_COLORS.ink, marginTop: 1 },
    metaLine: {
      flexDirection: "row",
      justifyContent: "flex-end",
      marginTop: 2,
    },
    metaKey: {
      fontSize: 7.5,
      color: BRAND_COLORS.primary,
      fontFamily: bold,
      fontWeight: 600,
      textTransform: "uppercase",
      letterSpacing: 0.4,
      marginRight: 6,
    },
    metaVal: {
      fontSize: 8.5,
      color: BRAND_COLORS.ink,
      fontFamily: bold,
      fontWeight: 700,
    },
    table: { marginTop: 2 },
    th: {
      flexDirection: "row",
      backgroundColor: BRAND_COLORS.tableHeader,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: BRAND_COLORS.border,
      paddingVertical: 5,
      alignItems: "center",
    },
    thText: {
      fontFamily: bold,
      fontWeight: 700,
      color: BRAND_COLORS.ink,
      fontSize: 7.5,
      textTransform: "uppercase",
      letterSpacing: 0.3,
    },
    tr: {
      flexDirection: "row",
      borderBottomWidth: 0.5,
      borderColor: BRAND_COLORS.border,
      paddingVertical: 5,
      alignItems: "flex-start",
    },
    trAlt: {
      backgroundColor: "#F8FAFC",
    },
    cell: { paddingHorizontal: 3 },
    cellRight: { paddingHorizontal: 3, textAlign: "right" },
    lineMeta: { fontSize: 7, color: BRAND_COLORS.muted, marginTop: 1 },
    totalsWrap: {
      marginTop: 10,
      alignSelf: "flex-end",
      width: 230,
      backgroundColor: "#F8FAFC",
      borderWidth: 1,
      borderColor: BRAND_COLORS.border,
      borderRadius: 4,
      paddingVertical: 8,
      paddingHorizontal: 10,
    },
    totalRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 2.5,
    },
    totalLabel: { fontSize: 8.5, color: BRAND_COLORS.ink },
    totalValue: { fontSize: 8.5, color: BRAND_COLORS.ink, textAlign: "right" },
    grand: {
      flexDirection: "row",
      justifyContent: "space-between",
      borderTopWidth: 1.5,
      borderTopColor: BRAND_COLORS.primary,
      marginTop: 5,
      paddingTop: 6,
    },
    grandLabel: {
      fontSize: 11,
      fontFamily: bold,
      fontWeight: 700,
      color: BRAND_COLORS.primary,
    },
    grandValue: {
      fontSize: 12,
      fontFamily: bold,
      fontWeight: 700,
      color: BRAND_COLORS.primary,
      textAlign: "right",
    },
    words: {
      marginTop: 12,
      fontSize: 8.5,
      color: BRAND_COLORS.ink,
      paddingRight: 8,
    },
    wordsLabel: {
      fontFamily: bold,
      fontWeight: 700,
      color: BRAND_COLORS.muted,
    },
    signatureBlock: {
      marginTop: 22,
      alignSelf: "flex-end",
      width: 160,
      alignItems: "center",
    },
    signatureLabel: {
      fontSize: 7.5,
      color: BRAND_COLORS.muted,
      marginBottom: 4,
      textAlign: "center",
    },
    signatureImage: {
      width: 130,
      height: 48,
      marginBottom: 4,
      objectFit: "contain",
    },
    signatureSpacer: { height: 36 },
    signatureLine: {
      width: "100%",
      borderTopWidth: 0.75,
      borderColor: BRAND_COLORS.border,
      marginBottom: 4,
    },
    signatureTitle: {
      fontSize: 8,
      fontFamily: bold,
      fontWeight: 700,
      textAlign: "center",
      color: BRAND_COLORS.ink,
    },
    footer: {
      position: "absolute",
      bottom: 22,
      left: 32,
      right: 32,
      width: CONTENT_WIDTH,
    },
    footerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-end",
    },
    footerText: {
      flex: 1,
      fontSize: 7.5,
      color: BRAND_COLORS.muted,
      paddingRight: 10,
    },
    footerMark: {
      width: 18,
      height: 18,
      opacity: 0.35,
      objectFit: "contain",
    },
  });
}

/** PDF-only money format: currency code prefix, since standard PDF fonts lack symbols like ₹. */
function pdfMoney(n: number, currency: string) {
  const code = currency === "INR" ? "Rs." : currency;
  return `${code} ${Number(n).toLocaleString(currency === "INR" ? "en-IN" : "en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function vatLabel(item: InvoiceItem): string {
  const cat = normalizeVatCategory(item.vat_category, Number(item.vat_rate));
  if (cat === "exempt") return "Exempt";
  if (cat === "zero") return "0%";
  return `${item.vat_rate}%`;
}

const COPY_LABELS = ["Original for Recipient", "Duplicate", "Triplicate"] as const;

function BrandGradientBar({
  barStyle,
  styles,
}: {
  barStyle: "gradientBar" | "footerAccent";
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles[barStyle]}>
      <View style={styles.gradientSeg1} />
      <View style={styles.gradientSeg2} />
      <View style={styles.gradientSeg3} />
      <View style={styles.gradientSeg4} />
    </View>
  );
}

function lineParticulars(
  item: InvoiceItem,
  businessType: BusinessType,
  inr: (n: number) => string
): { title: string; meta: string[] } {
  const cfg = getBusinessTypeConfig(businessType);
  const name = item.room_booking_id
    ? "Room stay"
    : (item.product?.name ?? "Item");
  const variant = item.product?.variant ? ` (${item.product.variant})` : "";
  const meta: string[] = [];

  if (
    showsProductFormField(businessType, "pack_size") &&
    item.product?.pack_size
  ) {
    meta.push(item.product.pack_size);
  }
  if (cfg.invoiceLineFields.lineImeiSerial && item.imei_serial) {
    meta.push(`IMEI/S/N: ${item.imei_serial}`);
  }
  if (cfg.invoiceLineFields.lineBatchNumber && item.batch_number) {
    meta.push(`Batch: ${item.batch_number}`);
  }
  if (cfg.invoiceLineFields.lineVariantTag && item.variant_tag) {
    meta.push(item.variant_tag);
  }
  if (cfg.invoiceLineFields.jewelleryPricing) {
    const huid = item.jewellery_huid || item.product?.huid_number;
    const purity = item.jewellery_purity || item.product?.purity;
    const locked = item.rate_locked_at_sale ?? item.metal_rate_used;
    if (huid) meta.push(`Hallmark: ${huid}`);
    if (purity) meta.push(`Purity: ${purity.toUpperCase()}`);
    if (locked != null) meta.push(`Rate locked: ${inr(locked)}/g`);
    if (item.rate_source) meta.push(`Source: ${item.rate_source}`);
    if (item.gross_weight != null) meta.push(`Gross: ${item.gross_weight}g`);
    if (item.net_weight != null) meta.push(`Net: ${item.net_weight}g`);
    if (item.making_charge_amount != null) {
      meta.push(`Making: ${inr(item.making_charge_amount)}`);
    }
    if (item.stone_value != null && Number(item.stone_value) > 0) {
      meta.push(`Stone: ${inr(item.stone_value)}`);
    }
  }
  if (cfg.invoiceLineFields.hotelStay) {
    if (item.check_in_date) meta.push(`Check-in: ${item.check_in_date}`);
    if (item.check_out_date) meta.push(`Check-out: ${item.check_out_date}`);
    if (item.guest_id_proof) meta.push(`ID: ${item.guest_id_proof}`);
    meta.push(`${item.quantity} night${item.quantity === 1 ? "" : "s"}`);
  }

  return { title: `${name}${variant}`, meta };
}

export function InvoicePdfDocument({
  invoice,
  company,
  copyIndex = 0,
  logoSrc = null,
  wordmarkSrc = null,
  signatureSrc = null,
  businessType = "general",
}: {
  invoice: Invoice;
  company: CompanySettings;
  copyIndex?: 0 | 1 | 2;
  /** Prefer data URLs so PDF generation does not depend on network fetch. */
  logoSrc?: string | null;
  wordmarkSrc?: string | null;
  signatureSrc?: string | null;
  businessType?: BusinessType;
}) {
  const customer = invoice.customer;
  if (!customer) {
    throw new Error("Invoice customer is required for PDF");
  }
  const items = invoice.items ?? [];
  const styles = createStyles(invoicePdfFontFamily());
  const country = getCountryConfig(company.country);
  const currency = invoice.currency || company.currency || country.currency;
  const inr = (n: number) => pdfMoney(n, currency);
  const breakdown = buildVatBreakdown(
    items.map((it) => ({
      taxableValue: Number(it.taxable_value),
      vatRate: Number(it.vat_rate),
      vatAmount: Number(it.vat_amount),
      vatCategory: normalizeVatCategory(it.vat_category, Number(it.vat_rate)),
      lineTotal: Number(it.line_total),
    }))
  );
  const placeOfSupply = customer.state || company.state || country.name;
  const addressLine = formatCompanyAddress(company);
  const contactLine = formatCompanyContact({ ...company, taxIdLabel: country.taxIdLabel });
  const bankLine = formatCompanyBankLine(company);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerTop}>
          <View style={styles.brandRow}>
            {wordmarkSrc ? (
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image src={wordmarkSrc} style={styles.logoWordmark} />
            ) : logoSrc ? (
              <>
                {/* eslint-disable-next-line jsx-a11y/alt-text */}
                <Image src={logoSrc} style={styles.logoIcon} />
                <Text style={styles.brandFallback}>{APP_NAME}</Text>
              </>
            ) : (
              <Text style={styles.brandFallback}>{APP_NAME}</Text>
            )}
          </View>
          <View style={styles.copyPill}>
            <Text style={styles.copyPillText}>{COPY_LABELS[copyIndex]}</Text>
          </View>
        </View>

        <BrandGradientBar barStyle="gradientBar" styles={styles} />

        <View style={styles.businessBlock}>
          <Text style={styles.businessName}>
            {company.brand_name || company.company_name}
          </Text>
          <Text style={styles.taxInvoiceLabel}>{country.invoiceTitle}</Text>
          {company.brand_name && company.brand_name !== company.company_name ? (
            <Text style={styles.companyLine}>{company.company_name}</Text>
          ) : null}
          {addressLine ? <Text style={styles.muted}>{addressLine}</Text> : null}
          {contactLine ? <Text style={styles.muted}>{contactLine}</Text> : null}
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaBlock}>
            <Text style={styles.sectionLabel}>Bill To</Text>
            <Text style={styles.bold}>{customer.name}</Text>
            {customer.billing_address ? (
              <Text style={styles.bodyText}>{customer.billing_address}</Text>
            ) : null}
            <Text style={styles.bodyText}>
              {customer.state}
              {customer.state ? " · " : ""}
              {customer.tax_id
                ? `${country.taxIdLabel}: ${customer.tax_id}`
                : "Not VAT registered"}
            </Text>
            {customer.phone ? (
              <Text style={styles.bodyText}>Ph: {customer.phone}</Text>
            ) : null}
          </View>
          <View style={styles.metaBlockRight}>
            <View style={styles.metaLine}>
              <Text style={styles.metaKey}>Invoice No</Text>
              <Text style={styles.metaVal}>{invoice.invoice_number}</Text>
            </View>
            <View style={styles.metaLine}>
              <Text style={styles.metaKey}>Date</Text>
              <Text style={styles.metaVal}>
                {new Date(invoice.invoice_date).toLocaleDateString("en-GB")}
              </Text>
            </View>
            <View style={styles.metaLine}>
              <Text style={styles.metaKey}>Place of Supply</Text>
              <Text style={styles.metaVal}>{placeOfSupply}</Text>
            </View>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.th}>
            <Text style={[styles.cell, styles.thText, { width: "4%" }]}>#</Text>
            <Text style={[styles.cell, styles.thText, { width: "27%" }]}>
              Description
            </Text>
            <Text style={[styles.cellRight, styles.thText, { width: "10%" }]}>
              {getBusinessTypeConfig(businessType).invoiceLineFields.jewelleryPricing
                ? "Pcs"
                : "Qty"}
            </Text>
            <Text style={[styles.cellRight, styles.thText, { width: "14%" }]}>
              {getBusinessTypeConfig(businessType).invoiceLineFields.jewelleryPricing
                ? "Rate/g"
                : "Rate"}
            </Text>
            <Text style={[styles.cellRight, styles.thText, { width: "12%" }]}>
              Taxable
            </Text>
            <Text style={[styles.cellRight, styles.thText, { width: "8%" }]}>
              VAT %
            </Text>
            <Text style={[styles.cellRight, styles.thText, { width: "11%" }]}>
              VAT
            </Text>
            <Text style={[styles.cellRight, styles.thText, { width: "14%" }]}>
              Amount
            </Text>
          </View>
          {items.map((item, i) => {
            const line = lineParticulars(item, businessType, inr);
            const rowStyle =
              i % 2 === 1 ? [styles.tr, styles.trAlt] : [styles.tr];
            return (
              <View key={item.id} style={rowStyle}>
                <Text style={[styles.cell, { width: "4%" }]}>{i + 1}</Text>
                <View style={[styles.cell, { width: "27%" }]}>
                  <Text>{line.title}</Text>
                  {line.meta.map((m) => (
                    <Text key={m} style={styles.lineMeta}>
                      {m}
                    </Text>
                  ))}
                </View>
                <Text style={[styles.cellRight, { width: "10%" }]}>
                  {formatQty(item.quantity, item.unit ?? item.product?.unit ?? (item.room_booking_id ? "night" : null))}
                </Text>
                <Text style={[styles.cellRight, { width: "14%" }]}>
                  {getBusinessTypeConfig(businessType).invoiceLineFields.jewelleryPricing &&
                  item.metal_rate_used != null
                    ? inr(item.metal_rate_used)
                    : inr(item.unit_price)}
                </Text>
                <Text style={[styles.cellRight, { width: "12%" }]}>
                  {inr(item.taxable_value)}
                </Text>
                <Text style={[styles.cellRight, { width: "8%" }]}>{vatLabel(item)}</Text>
                <Text style={[styles.cellRight, { width: "11%" }]}>
                  {inr(item.vat_amount)}
                </Text>
                <Text style={[styles.cellRight, { width: "14%" }]}>
                  {inr(Number(item.taxable_value) + Number(item.vat_amount))}
                </Text>
              </View>
            );
          })}
        </View>

        <View style={styles.totalsWrap}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total excl. VAT</Text>
            <Text style={styles.totalValue}>{inr(invoice.subtotal)}</Text>
          </View>
          {breakdown.map((b) => (
            <View key={`${b.vatCategory}-${b.vatRate}`} style={styles.totalRow}>
              <Text style={styles.totalLabel}>
                {b.vatCategory === "standard"
                  ? `VAT @ ${b.vatRate}% on ${inr(b.taxableValue)}`
                  : `${b.vatCategory === "zero" ? "Zero-rated" : "Exempt"} supplies ${inr(b.taxableValue)}`}
              </Text>
              <Text style={styles.totalValue}>{inr(b.vatAmount)}</Text>
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total VAT</Text>
            <Text style={styles.totalValue}>{inr(invoice.total_vat)}</Text>
          </View>
          {Number(invoice.round_off) !== 0 ? (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Round Off</Text>
              <Text style={styles.totalValue}>{inr(invoice.round_off)}</Text>
            </View>
          ) : null}
          <View style={styles.grand}>
            <Text style={styles.grandLabel}>Total incl. VAT</Text>
            <Text style={styles.grandValue}>{inr(invoice.grand_total)}</Text>
          </View>
        </View>

        <Text style={styles.words}>
          <Text style={styles.wordsLabel}>Amount in words: </Text>
          {amountInWords(invoice.grand_total, currency)}
        </Text>

        <View style={styles.signatureBlock}>
          <Text style={styles.signatureLabel}>For {company.company_name}</Text>
          {signatureSrc ? (
            // eslint-disable-next-line jsx-a11y/alt-text
            <Image src={signatureSrc} style={styles.signatureImage} />
          ) : (
            <View style={styles.signatureSpacer} />
          )}
          <View style={styles.signatureLine} />
          <Text style={styles.signatureTitle}>Authorized Signatory</Text>
        </View>

        <View style={styles.footer} fixed>
          <BrandGradientBar barStyle="footerAccent" styles={styles} />
          <View style={styles.footerRow}>
            <View style={styles.footerText}>
              {bankLine ? <Text>{bankLine}</Text> : null}
              <Text style={{ marginTop: 3 }}>
                This is a computer-generated {country.invoiceTitle} from {company.company_name}.
              </Text>
            </View>
            {logoSrc ? (
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image src={logoSrc} style={styles.footerMark} />
            ) : null}
          </View>
        </View>
      </Page>
    </Document>
  );
}
