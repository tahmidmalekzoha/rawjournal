import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 px-4">
      <div className="text-center">
        <h1 className="text-5xl font-bold tracking-tight">
          Raw<span className="text-accent">Journal</span>
        </h1>
        <p className="mt-3 text-lg text-text-secondary">
          Track, analyze, and master your forex trading.
        </p>
      </div>

      <div className="flex gap-4">
        <Link
          href="/login"
          className="rounded-lg bg-accent px-6 py-3 font-medium text-white transition-colors hover:bg-accent-hover"
        >
          Get Started
        </Link>
        <Link
          href="/login"
          className="rounded-lg border border-border px-6 py-3 font-medium text-text-secondary transition-colors hover:border-accent hover:text-text-primary"
        >
          Sign In
        </Link>
      </div>

      <div className="mt-12 grid max-w-3xl grid-cols-1 gap-6 sm:grid-cols-3">
        <Feature title="MT5 Auto-Sync" desc="Trades imported automatically every 15 seconds." />
        <Feature title="Deep Analytics" desc="Win rate, drawdown, profit factor — all calculated." />
        <Feature title="Trade Journal" desc="Tag, annotate, and screenshot every trade." />
      </div>
    </div>
  );
}

function Feature({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-text-secondary">{desc}</p>
    </div>
  );
}
