import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { isTimeZone, localDate, localDayStart } from "@/lib/attendance";
import { ATTENDANCE_BUCKET, decodePhoto, isValidPin, numberOrNull, verifyPin } from "@/lib/attendance-server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { clientIp, rateLimitAll, tooManyRequests } from "@/lib/security/rate-limit";
import { serverError } from "@/lib/security/request";

export const runtime = "nodejs";

type Body = {
  mode?: unknown;
  employee_id?: unknown;
  token?: unknown;
  pin?: unknown;
  photo?: unknown;
  timeZone?: unknown;
  latitude?: unknown;
  longitude?: unknown;
  accuracy?: unknown;
};

const WRONG_PIN = "That PIN is not right. Try again.";

/**
 * Check in or out with a PIN and a selfie.
 * - kiosk: the shop tablet, signed in as any admin or staff user
 * - phone: the employee's own phone, using their private link (no login)
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as Body | null;
    if (!body) return NextResponse.json({ error: "Bad request" }, { status: 400 });
    const mode = body.mode === "phone" ? "phone" : "kiosk";
    if (!isValidPin(body.pin)) return NextResponse.json({ error: WRONG_PIN }, { status: 400 });
    const photo = decodePhoto(body.photo);
    if (!photo) {
      return NextResponse.json({ error: "We need a clear photo to check you in. Allow the camera and try again." }, { status: 400 });
    }
    const timeZone = isTimeZone(body.timeZone) ? body.timeZone : "Asia/Dubai";

    const admin = createAdminClient();
    let employeeId: string;
    let createdBy: string | null = null;

    if (mode === "kiosk") {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return NextResponse.json({ error: "Sign in on this device to use the kiosk." }, { status: 401 });
      const { data: profile } = await supabase.from("users").select("role, organization_id").eq("id", user.id).single();
      if (!profile?.organization_id || profile.role === "accountant") {
        return NextResponse.json({ error: "This account cannot run the attendance kiosk." }, { status: 403 });
      }
      if (typeof body.employee_id !== "string") return NextResponse.json({ error: "Pick your name first." }, { status: 400 });
      const { data: emp } = await supabase
        .from("employees")
        .select("id, organization_id")
        .eq("id", body.employee_id)
        .maybeSingle();
      if (!emp || emp.organization_id !== profile.organization_id) {
        return NextResponse.json({ error: "Employee not found." }, { status: 404 });
      }
      employeeId = emp.id;
      createdBy = user.id;
    } else {
      const token = typeof body.token === "string" ? body.token : "";
      if (!/^[a-f0-9]{64}$/.test(token)) return NextResponse.json({ error: "This check-in link is not valid." }, { status: 404 });
      const { data: emp } = await admin
        .from("employees")
        .select("id, allow_phone, active")
        .eq("checkin_token", token)
        .maybeSingle();
      if (!emp || !emp.active || !emp.allow_phone) {
        return NextResponse.json({ error: "This check-in link is not active. Ask your manager for a new one." }, { status: 404 });
      }
      employeeId = emp.id;
    }

    // Slow down PIN guessing: per employee and per network
    const limited = await rateLimitAll(admin, [
      { key: `att:pin:${employeeId}`, limit: 8, windowSeconds: 900 },
      { key: `att:ip:${clientIp(request)}`, limit: 60, windowSeconds: 600 },
    ]);
    if (!limited.ok) return tooManyRequests(limited.retryAfter, "Too many tries. Wait a few minutes, or ask your manager.");

    const { data: secret } = await admin
      .from("employee_secrets")
      .select("pin_hash, organization_id")
      .eq("employee_id", employeeId)
      .maybeSingle();
    if (!secret) return NextResponse.json({ error: "No PIN is set for you yet. Ask your manager to set one." }, { status: 400 });
    if (!(await verifyPin(body.pin, secret.pin_hash))) return NextResponse.json({ error: WRONG_PIN }, { status: 400 });

    const today = localDate(new Date(), timeZone);
    const path = `${secret.organization_id}/punches/${today}/${employeeId}-${randomUUID()}.${photo.ext}`;
    const { error: upErr } = await admin.storage
      .from(ATTENDANCE_BUCKET)
      .upload(path, photo.bytes, { contentType: photo.type, upsert: false });
    if (upErr) throw upErr;

    const { data: punch, error } = await admin.rpc("attendance_punch", {
      p_employee: employeeId,
      p_source: mode,
      p_photo_path: path,
      p_day_start: localDayStart(today, timeZone).toISOString(),
      p_latitude: mode === "phone" ? numberOrNull(body.latitude, -90, 90) : null,
      p_longitude: mode === "phone" ? numberOrNull(body.longitude, -180, 180) : null,
      p_accuracy: mode === "phone" ? numberOrNull(body.accuracy, 0, 100000) : null,
      p_created_by: createdBy,
    });
    if (error) {
      await admin.storage.from(ATTENDANCE_BUCKET).remove([path]);
      throw error;
    }
    const row = (Array.isArray(punch) ? punch[0] : punch) as { kind: "in" | "out"; at: string };
    const { data: emp } = await admin.from("employees").select("full_name").eq("id", employeeId).single();

    return NextResponse.json({ kind: row.kind, at: row.at, name: emp?.full_name ?? "" });
  } catch (e) {
    return serverError("attendance-punch", e, "Could not record that. Please try again.");
  }
}
