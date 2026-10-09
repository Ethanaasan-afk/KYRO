import { clientIp, memoryLimit } from "@/lib/security/rate-limit";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const MAX_BYTES = 6000;

/** Receives browser errors from src/lib/error-report.ts and writes them to the server log. */
export async function POST(request: Request) {
  const limited = memoryLimit(`client-error:${clientIp(request)}`, 30, 60_000);
  if (!limited.ok) return new NextResponse(null, { status: 204 });

  const text = await request.text().catch(() => "");
  if (!text || text.length > MAX_BYTES) return new NextResponse(null, { status: 204 });

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(text) as Record<string, unknown>;
  } catch {
    return new NextResponse(null, { status: 204 });
  }
  const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : null);
  console.error(
    "[client-error]",
    JSON.stringify({
      message: str(body.message, 500),
      context: str(body.context, 60),
      path: str(body.path, 200),
      digest: str(body.digest, 80),
      stack: str(body.stack, 2000),
      userAgent: request.headers.get("user-agent")?.slice(0, 200) ?? null,
      at: new Date().toISOString(),
    })
  );
  return new NextResponse(null, { status: 204 });
}
