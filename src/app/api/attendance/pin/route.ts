import { NextResponse } from "next/server";
import { hashPin, isValidPin } from "@/lib/attendance-server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, tooManyRequests } from "@/lib/security/rate-limit";
import { serverError } from "@/lib/security/request";

/** Admins set or change an employee's check-in PIN. */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("users")
      .select("role, organization_id")
      .eq("id", user.id)
      .single();
    if (profile?.role !== "admin" || !profile.organization_id) {
      return NextResponse.json({ error: "Only admins can set PINs." }, { status: 403 });
    }

    const body = (await request.json().catch(() => null)) as { employee_id?: unknown; pin?: unknown } | null;
    if (typeof body?.employee_id !== "string" || !isValidPin(body.pin)) {
      return NextResponse.json({ error: "The PIN must be 4 to 6 digits." }, { status: 400 });
    }

    const admin = createAdminClient();
    const limited = await rateLimit(admin, `att:setpin:${profile.organization_id}`, 60, 3600);
    if (!limited.ok) return tooManyRequests(limited.retryAfter);

    // Reading through the user's session proves the employee is in their business
    const { data: emp } = await supabase
      .from("employees")
      .select("id, organization_id")
      .eq("id", body.employee_id)
      .maybeSingle();
    if (!emp || emp.organization_id !== profile.organization_id) {
      return NextResponse.json({ error: "Employee not found." }, { status: 404 });
    }

    const pin_hash = await hashPin(body.pin);
    const { error } = await admin
      .from("employee_secrets")
      .upsert({ employee_id: emp.id, organization_id: emp.organization_id, pin_hash, updated_at: new Date().toISOString() });
    if (error) throw error;
    const { error: flagErr } = await admin.from("employees").update({ has_pin: true }).eq("id", emp.id);
    if (flagErr) throw flagErr;

    return NextResponse.json({ ok: true });
  } catch (e) {
    return serverError("attendance-pin", e, "Could not save the PIN. Has migration 043 been run?");
  }
}
