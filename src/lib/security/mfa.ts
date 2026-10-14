import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

/**
 * For routes that act with the service role after reading the signed-in user:
 * someone with two-step verification on must have entered their code in this
 * session. Middleware checks this too; this is the backstop if it was skipped.
 */
export async function mfaRequired(supabase: SupabaseClient): Promise<NextResponse | null> {
  const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (data?.nextLevel === "aal2" && data.currentLevel !== "aal2") {
    return NextResponse.json({ error: "Enter your two-step verification code first." }, { status: 403 });
  }
  return null;
}
