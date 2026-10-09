/**
 * Server-side error logging. Next.js calls onRequestError for every uncaught
 * error in pages, route handlers and middleware; it lands in Vercel → Logs
 * as one JSON line (filter "[server-error]").
 */
export async function register() {
  /* nothing to set up */
}

export async function onRequestError(
  error: unknown,
  request: { path: string; method: string },
  context: { routerKind: string; routePath: string; routeType: string }
) {
  const err = error as Error & { digest?: string };
  console.error(
    "[server-error]",
    JSON.stringify({
      message: String(err?.message ?? error).slice(0, 500),
      digest: err?.digest ?? null,
      method: request.method,
      path: request.path.split("?")[0]?.slice(0, 200),
      route: context.routePath,
      type: context.routeType,
      stack: String(err?.stack ?? "").slice(0, 2000),
      at: new Date().toISOString(),
    })
  );
}
