import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, tooManyRequests } from "@/lib/security/rate-limit";
import { serverError } from "@/lib/security/request";

/**
 * An admin turns off two-step verification for someone in their business who
 * lost their phone. They can sign in with their password and set it up again.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Reading through the admin's own session also proves they passed their own 2FA (migration 044)
    const { data: me } = await supabase.from("users").select("role, organization_id").eq("id", user.id).single();
    if (me?.role !== "admin" || !me.organization_id) {
      return NextResponse.json({ error: "Only admins can do this." }, { status: 403 });
    }
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
      return NextResponse.json({ error: "Enter your own two-step code first." }, { status: 403 });
    }

    const body = (await request.json().catch(() => null)) as { user_id?: unknown } | null;
    const targetId = typeof body?.user_id === "string" ? body.user_id : "";
    if (!targetId) return NextResponse.json({ error: "Pick a user." }, { status: 400 });

    const admin = createAdminClient();
    const limited = await rateLimit(admin, `reset2fa:org:${me.organization_id}`, 10, 3600);
    if (!limited.ok) return tooManyRequests(limited.retryAfter);

    const { data: target } = await admin.from("users").select("organization_id").eq("id", targetId).maybeSingle();
    if (!target || target.organization_id !== me.organization_id) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const { data: factors, error: listErr } = await admin.auth.admin.mfa.listFactors({ userId: targetId });
    if (listErr) throw listErr;
    for (const f of factors?.factors ?? []) {
      const { error } = await admin.auth.admin.mfa.deleteFactor({ id: f.id, userId: targetId });
      if (error) throw error;
    }
    return NextResponse.json({ ok: true, removed: factors?.factors?.length ?? 0 });
  } catch (e) {
    return serverError("users/reset-2fa", e, "Could not reset two-step verification. Please try again.");
  }
}
