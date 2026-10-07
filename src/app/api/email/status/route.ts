import { isDemoMode } from "@/lib/demo/mode";
import { getEmailStatus } from "@/lib/email/send";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Whether invoice emails go out directly (Resend) or fall back to the user's mail app. */
export async function GET() {
  if (isDemoMode()) {
    return NextResponse.json({ configured: true, provider: "demo", fromAddress: "demo@novaflow.local" });
  }
  const status = getEmailStatus();
  return NextResponse.json(status, { headers: { "Cache-Control": "no-store" } });
}
