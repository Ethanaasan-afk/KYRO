import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/security/rate-limit";
import { serverError } from "@/lib/security/request";

/**
 * Public: the check-in page on an employee's own phone asks who the private
 * link belongs to. Returns only the first name and the business name.
 */
export async function GET(request: Request) {
  try {
    const token = new URL(request.url).searchParams.get("token") ?? "";
    if (!/^[a-f0-9]{64}$/.test(token)) return NextResponse.json({ error: "This check-in link is not valid." }, { status: 404 });

    const admin = createAdminClient();
    const limited = await rateLimit(admin, `att:link:${clientIp(request)}`, 60, 600);
    if (!limited.ok) return tooManyRequests(limited.retryAfter);

    const { data: emp } = await admin
      .from("employees")
      .select("full_name, allow_phone, active, has_pin, organization_id")
      .eq("checkin_token", token)
      .maybeSingle();
    if (!emp || !emp.active || !emp.allow_phone) {
      return NextResponse.json({ error: "This check-in link is not active. Ask your manager for a new one." }, { status: 404 });
    }
    const { data: org } = await admin
      .from("organizations")
      .select("name, brand_name")
      .eq("id", emp.organization_id)
      .maybeSingle();

    return NextResponse.json({
      name: emp.full_name.split(" ")[0],
      business: org?.brand_name || org?.name || "",
      hasPin: emp.has_pin,
    });
  } catch (e) {
    return serverError("attendance-link", e);
  }
}
