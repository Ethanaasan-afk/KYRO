import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/demo/mode";
import {
  ensureInvoiceShortCode,
  INVOICE_PDF_BUCKET,
  invoicePdfObjectPath,
  invoicePublicDownloadUrl,
} from "@/lib/invoice-short-link";
import { invoiceShareMessage, whatsappShareUrl } from "@/lib/whatsapp";
import { NextResponse } from "next/server";
import { APP_NAME } from "@/lib/brand";
import { rateLimit, tooManyRequests } from "@/lib/security/rate-limit";
import { looksLikePdf, serverError } from "@/lib/security/request";

const MAX_PDF_BYTES = 6 * 1024 * 1024;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (isDemoMode()) {
      return NextResponse.json(
        { error: "WhatsApp PDF share needs live Supabase Storage (disable demo mode)." },
        { status: 400 }
      );
    }

    const { id: invoiceId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("users")
      .select("organization_id, role")
      .eq("id", user.id)
      .single();
    if (profile?.role === "accountant") {
      return NextResponse.json({ error: "Accountant access is view-only." }, { status: 403 });
    }

    if (!profile?.organization_id) {
      return NextResponse.json({ error: "No organization linked" }, { status: 400 });
    }

    const form = await request.formData();
    const file = form.get("pdf");
    if (!file || typeof file === "string" || typeof (file as Blob).arrayBuffer !== "function") {
      return NextResponse.json({ error: "Missing PDF file" }, { status: 400 });
    }
    const pdfBlob = file as Blob;
    if (pdfBlob.size > MAX_PDF_BYTES) {
      return NextResponse.json({ error: "The PDF is too large to share." }, { status: 413 });
    }

    const admin = createAdminClient();
    const limited = await rateLimit(admin, `share:org:${profile.organization_id}`, 240, 3600);
    if (!limited.ok) return tooManyRequests(limited.retryAfter);
    const { data: invoice, error: invErr } = await admin
      .from("invoices")
      .select(
        "id, invoice_number, grand_total, currency, status, organization_id, short_code, customer:customers(id, name, phone)"
      )
      .eq("id", invoiceId)
      .eq("organization_id", profile.organization_id)
      .single();

    if (invErr || !invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const { data: org } = await admin
      .from("organizations")
      .select("name, brand_name")
      .eq("id", profile.organization_id)
      .single();

    const customer = invoice.customer as
      | { id: string; name: string; phone: string | null }
      | { id: string; name: string; phone: string | null }[]
      | null;
    const cust = Array.isArray(customer) ? customer[0] : customer;
    const phone = cust?.phone ?? null;
    const customerName = cust?.name ?? "Customer";

    const objectPath = invoicePdfObjectPath(
      profile.organization_id,
      invoice.id,
      invoice.invoice_number
    );
    const bytes = new Uint8Array(await pdfBlob.arrayBuffer());
    if (!looksLikePdf(bytes)) {
      return NextResponse.json({ error: "The attachment is not a valid PDF." }, { status: 400 });
    }

    const { error: upErr } = await admin.storage.from(INVOICE_PDF_BUCKET).upload(objectPath, bytes, {
      contentType: "application/pdf",
      upsert: true,
    });

    if (upErr) {
      console.error("[share-whatsapp] upload", upErr);
      return NextResponse.json(
        {
          error:
            upErr.message.includes("Bucket not found") || upErr.message.includes("not found")
              ? "Storage bucket `invoice-pdfs` missing - run migration 021_invoice_pdfs_storage.sql"
              : "Could not upload the PDF. Please try again.",
        },
        { status: 500 }
      );
    }

    const shortCode = await ensureInvoiceShortCode(admin, invoice.id);
    const downloadUrl = invoicePublicDownloadUrl(shortCode, request);

    const amountDue = invoice.status === "paid" ? 0 : Number(invoice.grand_total);
    const companyName = org?.brand_name || org?.name || APP_NAME;
    const message = invoiceShareMessage({
      companyName,
      invoiceNumber: invoice.invoice_number,
      amount: amountDue,
      customerName,
      currency: invoice.currency,
      pdfUrl: downloadUrl,
    });

    const hasPhone = Boolean(phone && phone.replace(/\D/g, "").length > 0);
    const url = whatsappShareUrl(phone, message);

    return NextResponse.json({
      whatsappUrl: url,
      pdfUrl: downloadUrl,
      shortCode,
      hasPhone,
    });
  } catch (e) {
    return serverError("share-whatsapp", e, "Share failed. Please try again.");
  }
}
