import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { inviteUserSchema } from "@/lib/validations";
import { NextResponse } from "next/server";
import { rateLimit, tooManyRequests } from "@/lib/security/rate-limit";
import { serverError } from "@/lib/security/request";

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("users")
      .select("role, organization_id")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    if (!profile.organization_id) {
      return NextResponse.json(
        { error: "Your account has no organization. Run migrations 016–019." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const limited = await rateLimit(admin, `invite:org:${profile.organization_id}`, 20, 3600);
    if (!limited.ok) return tooManyRequests(limited.retryAfter);

    const body = await request.json().catch(() => null);
    const parsed = inviteUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const { email, password, full_name, role } = parsed.data;

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: { full_name },
    });

    if (createErr || !created.user) {
      const msg = createErr?.message ?? "";
      if (/already|registered|exists/i.test(msg)) {
        return NextResponse.json({ error: "That email already has an account." }, { status: 400 });
      }
      console.error("[invite] createUser", createErr);
      return NextResponse.json({ error: "Could not create this user. Please try again." }, { status: 400 });
    }

    const { error: profileErr } = await admin.from("users").upsert(
      {
        id: created.user.id,
        full_name,
        role,
        organization_id: profile.organization_id,
      },
      { onConflict: "id" }
    );

    if (profileErr) {
      await admin.auth.admin.deleteUser(created.user.id);
      console.error("[invite] profile", profileErr);
      return NextResponse.json({ error: "Could not create this user. Please try again." }, { status: 400 });
    }

    return NextResponse.json({ ok: true, id: created.user.id });
  } catch (e) {
    return serverError("invite", e);
  }
}
