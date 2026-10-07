import { looksLikePdf, safeRedirectPath } from "@/lib/security/request";
import { memoryLimit } from "@/lib/security/rate-limit";

/** Quick checks - run with: npx tsx src/lib/security/security.test.ts */

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

// Redirects after login stay on this site
assert(safeRedirectPath("/invoices?tab=due") === "/invoices?tab=due", "keeps local paths");
assert(safeRedirectPath(null) === "/dashboard", "default");
for (const bad of [
  "https://evil.example",
  "//evil.example",
  "/\\evil.example",
  "\\\\evil.example",
  "javascript:alert(1)",
  " //evil.example",
  "/%0d%0aSet-Cookie:x",
  "http:/evil.example",
]) {
  const out = safeRedirectPath(bad);
  assert(out.startsWith("/") && !out.startsWith("//") && !/evil/.test(new URL(out, "http://x.invalid").host), `blocked ${bad} -> ${out}`);
}

// Only real PDFs are stored
assert(looksLikePdf(new TextEncoder().encode("%PDF-1.7\n...")), "pdf accepted");
assert(!looksLikePdf(new TextEncoder().encode("<html><script>")), "html rejected");
assert(!looksLikePdf(new Uint8Array()), "empty rejected");

// Memory limiter: allows the limit, then blocks
const key = `test:${Math.random()}`;
const results = Array.from({ length: 4 }, () => memoryLimit(key, 3, 60_000).ok);
assert(results.join() === "true,true,true,false", `limiter ${results}`);

console.log("security.test.ts: all ok");
