import { isDemoMode } from "@/lib/demo/mode";
import { clientIp, memoryLimit } from "@/lib/security/rate-limit";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function hasSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(
    url &&
      key &&
      !url.includes("YOUR_PROJECT") &&
      key !== "your-anon-key" &&
      url.startsWith("http")
  );
}

/** Pages only an organization admin may open (data is also protected by RLS). */
const ADMIN_PATHS = ["/settings", "/users", "/warehouses"];

/** Server-to-server callers that legitimately post from another origin. */
const CROSS_ORIGIN_POST_ALLOWED = ["/api/billing/webhook"];

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function isAdminPath(path: string) {
  return ADMIN_PATHS.some((p) => path === p || path.startsWith(`${p}/`));
}

/**
 * Cross-site request forgery guard: a browser always sends Origin (or at least
 * Sec-Fetch-Site) on a cross-site POST. Reject any state-changing API call
 * that did not come from a page on this site.
 */
function isCrossSiteWrite(request: NextRequest, path: string) {
  if (!MUTATING.has(request.method) || !path.startsWith("/api/")) return false;
  if (CROSS_ORIGIN_POST_ALLOWED.some((p) => path.startsWith(p))) return false;

  const origin = request.headers.get("origin");
  if (origin) {
    try {
      const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
      return new URL(origin).host !== host;
    } catch {
      return true;
    }
  }
  const site = request.headers.get("sec-fetch-site");
  return site === "cross-site";
}

/** Coarse per-IP flood protection. Sensitive routes add shared limits on top. */
function floodLimited(request: NextRequest, path: string) {
  const ip = clientIp(request);
  if (path.startsWith("/api/")) {
    return memoryLimit(`mw:api:${ip}`, 180, 60_000);
  }
  if (path.startsWith("/i/")) {
    return memoryLimit(`mw:i:${ip}`, 40, 60_000);
  }
  return null;
}

export async function updateSession(request: NextRequest) {
  const path = request.nextUrl.pathname;

  if (isCrossSiteWrite(request, path)) {
    return NextResponse.json({ error: "Cross-site request blocked" }, { status: 403 });
  }

  const limited = floodLimited(request, path);
  if (limited && !limited.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } }
    );
  }

  const isAuthPage = path.startsWith("/login") || path.startsWith("/signup");
  const isAuthCallback = path.startsWith("/auth/callback");
  const isCompleteSetup = path.startsWith("/complete-setup");
  const isMarketingPage =
    path === "/" ||
    path.startsWith("/pricing") ||
    path.startsWith("/how-it-works") ||
    path.startsWith("/contact");
  const isLegalPage =
    path.startsWith("/privacy") ||
    path.startsWith("/privacy-policy") ||
    path.startsWith("/terms") ||
    path.startsWith("/refunds") ||
    path.startsWith("/refund-policy");
  const isSetupPage = path.startsWith("/setup");
  const isShortLink = path.startsWith("/i/");
  const isPublicAsset =
    path.startsWith("/_next") ||
    path.startsWith("/marketing") ||
    path === "/favicon.ico" ||
    path === "/robots.txt" ||
    path === "/sitemap.xml" ||
    path === "/manifest.json" ||
    /\.(json|webmanifest|txt|xml|ico|mp4|webm|woff2?|ttf|pdf)$/i.test(path) ||
    path.startsWith("/api");

  // Demo mode: skip Supabase entirely, allow the app through
  if (isDemoMode()) {
    if (isSetupPage) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
    if (isAuthPage) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
    return NextResponse.next({ request: { headers: request.headers } });
  }

  if (!hasSupabaseEnv()) {
    if (
      isSetupPage ||
      isPublicAsset ||
      isShortLink ||
      isLegalPage ||
      isMarketingPage ||
      isAuthCallback
    ) {
      return NextResponse.next({ request: { headers: request.headers } });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/setup";
    return NextResponse.redirect(url);
  }

  // Configured deployments never show the setup instructions page
  if (isSetupPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  let user: Awaited<ReturnType<typeof supabase.auth.getUser>>["data"]["user"] = null;
  try {
    const result = await Promise.race([
      supabase.auth.getUser(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Middleware auth timed out")), 8000)
      ),
    ]);
    user = result.data.user;
  } catch {
    // Fail closed: anything that is not public goes to the login page
    if (
      !isAuthPage &&
      !isCompleteSetup &&
      !isPublicAsset &&
      !isShortLink &&
      !isLegalPage &&
      !isMarketingPage &&
      !isAuthCallback
    ) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    return response;
  }

  const isPublic =
    isAuthPage ||
    isCompleteSetup ||
    isPublicAsset ||
    isShortLink ||
    isLegalPage ||
    isMarketingPage ||
    isAuthCallback;

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (!user && isCompleteSetup) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Admin-only pages: check the role on the server, not just in the browser
  if (user && isAdminPath(path)) {
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (profile?.role !== "admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      url.search = "";
      const redirect = NextResponse.redirect(url);
      response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
      return redirect;
    }
  }

  return response;
}
