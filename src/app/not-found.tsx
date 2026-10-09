import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-cloud px-4">
      <div className="panel w-full max-w-md p-6 text-center">
        <p className="font-display text-5xl font-extrabold text-primary">404</p>
        <h1 className="mt-2 font-display text-xl font-bold text-ink">This page doesn&apos;t exist</h1>
        <p className="mt-2 text-sm text-slate">The link may be old or mistyped.</p>
        <div className="mt-5 flex justify-center gap-2">
          <Link href="/dashboard" className="rounded-[10px] bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
            Go to dashboard
          </Link>
          <Link href="/" className="rounded-[10px] border border-border px-4 py-2 text-sm font-medium text-ink hover:bg-surface-hover">
            Home page
          </Link>
        </div>
      </div>
    </div>
  );
}
