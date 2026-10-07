import { createClient } from "@/lib/supabase/server";
import { safeRedirectPath } from "@/lib/security/request";
import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

const OTP_TYPES: EmailOtpType[] = ["signup", "invite", "magiclink", "recovery", "email_change", "email"];

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const rawType = searchParams.get("type") as EmailOtpType | null;
  const type: EmailOtpType = rawType && OTP_TYPES.includes(rawType) ? rawType : "email";
  // Only ever send people to a page on this site (no open redirect)
  const next = safeRedirectPath(searchParams.get("next"));

  const supabase = createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, origin));
    }
  }

  if (tokenHash) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      return NextResponse.redirect(new URL(next, origin));
    }
  }

  return NextResponse.redirect(new URL("/login?error=otp", origin));
}
