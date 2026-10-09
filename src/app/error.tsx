"use client";

import { reportError } from "@/lib/error-report";
import { useEffect } from "react";

/** Shown when a page crashes. The error is logged so it can be fixed. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportError(error, "error-boundary");
  }, [error]);

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="panel w-full max-w-md p-6 text-center">
        <p className="text-3xl" aria-hidden>
          ⚠️
        </p>
        <h1 className="mt-3 font-display text-xl font-bold text-ink">Something went wrong on this page</h1>
        <p className="mt-2 text-sm text-slate">
          Your data is safe. Try again, and if it keeps happening, send us the code below so we can fix it.
        </p>
        {error.digest && <p className="mt-3 font-mono text-xs text-slate-dim">Code: {error.digest}</p>}
        <div className="mt-5 flex justify-center gap-2">
          <button
            type="button"
            onClick={reset}
            className="rounded-[10px] bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Try again
          </button>
          <a href="/dashboard" className="rounded-[10px] border border-border px-4 py-2 text-sm font-medium text-ink hover:bg-surface-hover">
            Go to dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
