import Link from "next/link";
import { GlobeNav } from "@/components/globe-nav";

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-black">
      {/* Smooth volumetric godray — single unified beam */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Bright source */}
        <div className="absolute -top-[8%] -left-[8%] h-[35%] w-[35%] bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.85)_0%,rgba(255,255,255,0.4)_18%,rgba(255,255,255,0.1)_40%,transparent_60%)]" />
        
        {/* Main smooth cone - outer soft edge */}
        <div 
          className="absolute top-0 left-0 h-[200%] w-[200%]"
          style={{
            background: 'conic-gradient(from 90deg at 0% 0%, transparent 0deg, rgba(255,255,255,0.03) 15deg, rgba(255,255,255,0.08) 30deg, rgba(255,255,255,0.12) 38deg, rgba(255,255,255,0.08) 46deg, rgba(255,255,255,0.03) 58deg, transparent 70deg)',
            filter: 'blur(40px)',
          }}
        />
        
        {/* Mid layer - body of the beam */}
        <div 
          className="absolute top-0 left-0 h-[200%] w-[200%]"
          style={{
            background: 'conic-gradient(from 90deg at 0% 0%, transparent 0deg, rgba(255,255,255,0.05) 20deg, rgba(255,255,255,0.15) 32deg, rgba(255,255,255,0.2) 38deg, rgba(255,255,255,0.15) 44deg, rgba(255,255,255,0.05) 52deg, transparent 65deg)',
            filter: 'blur(20px)',
          }}
        />
        
        {/* Inner bright core */}
        <div 
          className="absolute top-0 left-0 h-[200%] w-[200%]"
          style={{
            background: 'conic-gradient(from 90deg at 0% 0%, transparent 0deg, rgba(255,255,255,0.08) 25deg, rgba(255,255,255,0.22) 34deg, rgba(255,255,255,0.28) 38deg, rgba(255,255,255,0.22) 42deg, rgba(255,255,255,0.08) 48deg, transparent 60deg)',
            filter: 'blur(8px)',
          }}
        />
      </div>

      {/* Background particles */}
      <div className="pointer-events-none absolute inset-0">
        <div className="particle particle-1" />
        <div className="particle particle-2" />
        <div className="particle particle-3" />
        <div className="particle particle-4" />
        <div className="particle particle-5" />
        <div className="particle particle-6" />
        <div className="particle particle-7" />
        <div className="particle particle-8" />
        <div className="particle particle-9" />
        <div className="particle particle-10" />
        <div className="particle particle-11" />
        <div className="particle particle-12" />
        <div className="particle particle-13" />
        <div className="particle particle-14" />
        <div className="particle particle-15" />
        <div className="particle particle-16" />
      </div>

      {/* Ambient glow behind globe */}
      <div className="pointer-events-none absolute left-1/2 top-[60%] h-[600px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.03)_0%,transparent_60%)] blur-[60px]" />

      {/* Tubelight Navbar */}
      <GlobeNav />

      {/* Navbar — logo + auth */}
      <nav className="relative z-20 flex items-center justify-between px-6 py-5 sm:px-12">
        <Link href="/" className="text-xl font-bold tracking-tight text-white">
          Raw<span className="text-white/50">Journal</span>
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-medium text-white/50 transition-colors hover:text-white"
          >
            Login
          </Link>
          <Link
            href="/login"
            className="rounded-full border border-white/20 bg-white/10 px-5 py-2 text-sm font-medium text-white backdrop-blur-md transition-all hover:bg-white/20"
          >
            Sign up
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 flex flex-col items-center pt-16 text-center sm:pt-20">
        <h1 className="max-w-2xl text-5xl font-bold leading-[1.1] tracking-tight text-white sm:text-6xl lg:text-7xl">
          Elevate Your Trading Journey
        </h1>
        <p className="mt-5 max-w-md text-base text-white/50 sm:text-lg">
          Track, analyze, and master every trade with intelligent auto-sync and deep analytics.
        </p>
        <Link
          href="/login"
          className="mt-8 rounded-full border border-white/30 bg-white/90 px-8 py-3.5 text-sm font-semibold text-black shadow-[0_0_30px_rgba(255,255,255,0.15)] backdrop-blur-md transition-all hover:bg-white hover:shadow-[0_0_40px_rgba(255,255,255,0.25)]"
        >
          Get Started Free
        </Link>
      </section>

      {/* Globe area */}
      <section className="relative z-10 mt-8 flex items-center justify-center sm:mt-12">
        <div className="relative h-[420px] w-[420px] sm:h-[520px] sm:w-[520px] lg:h-[580px] lg:w-[580px]">
          {/* Wireframe globe */}
          <div className="globe-container absolute inset-0">
            <div className="globe-glow" />
            <div className="globe">
              {/* Latitude rings */}
              <div className="globe-ring globe-ring-1" />
              <div className="globe-ring globe-ring-2" />
              <div className="globe-ring globe-ring-3" />
              <div className="globe-ring globe-ring-4" />
              <div className="globe-ring globe-ring-5" />
              
              {/* Longitude meridians */}
              <div className="globe-meridian globe-meridian-1" />
              <div className="globe-meridian globe-meridian-2" />
              <div className="globe-meridian globe-meridian-3" />
              <div className="globe-meridian globe-meridian-4" />
              <div className="globe-meridian globe-meridian-5" />
              <div className="globe-meridian globe-meridian-6" />
              
              {/* Trade route arcs */}
              <div className="globe-arc globe-arc-1" />
              <div className="globe-arc globe-arc-2" />
              <div className="globe-arc globe-arc-3" />
              <div className="globe-arc globe-arc-4" />
              <div className="globe-arc globe-arc-5" />

              {/* Orbit dots attached to arcs inside globe */}
              <div className="orbit-track orbit-track-1">
                <div className="orbit-dot" />
              </div>
              <div className="orbit-track orbit-track-2">
                <div className="orbit-dot orbit-dot-alt" />
              </div>
              <div className="orbit-track orbit-track-3">
                <div className="orbit-dot" />
              </div>
              <div className="orbit-track orbit-track-4">
                <div className="orbit-dot orbit-dot-alt" />
              </div>
              <div className="orbit-track orbit-track-5">
                <div className="orbit-dot" />
              </div>
            </div>
          </div>

          {/* Floating card — left */}
          <div className="absolute left-[-12%] top-[30%] z-20 rounded-2xl border border-white/[0.12] bg-white/[0.06] p-4 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-2xl sm:left-[-16%] sm:p-5">
            <span className="text-xs text-white/40">Auto-Sync</span>
            <div className="mt-1 flex items-center gap-2">
              <svg className="h-4 w-4 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <p className="text-sm font-semibold text-white">MT5 Connected</p>
            </div>
            <p className="mt-1 text-xs text-white/30">Live trade import</p>
          </div>

          {/* Floating card — right */}
          <div className="absolute right-[-10%] top-[55%] z-20 rounded-2xl border border-white/[0.12] bg-white/[0.06] p-4 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-2xl sm:right-[-14%] sm:p-5">
            <span className="text-xs text-white/40">Win Rate</span>
            <div className="mt-1 flex items-center gap-2">
              <svg className="h-4 w-4 text-[#5a9a6e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
              <p className="text-2xl font-bold text-white">68%</p>
            </div>
            <div className="mt-2 h-1 w-24 overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-[68%] rounded-full bg-[#5a9a6e]" />
            </div>
          </div>
        </div>
      </section>

      {/* Sparkle decoration */}
      <div className="pointer-events-none absolute bottom-16 right-12 z-10 text-white/20 sm:bottom-24 sm:right-20">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0L14.59 8.41L23 11L14.59 13.59L12 22L9.41 13.59L1 11L9.41 8.41L12 0Z" />
        </svg>
      </div>

      {/* Features row */}
      <section className="relative z-10 mx-auto mt-4 grid max-w-4xl grid-cols-1 gap-5 px-6 pb-20 sm:grid-cols-3 sm:px-12">
        <Feature
          icon={
            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          }
          title="Auto-Sync"
          desc="Trades imported from MT5 every 15 seconds automatically."
        />
        <Feature
          icon={
            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
          title="Deep Analytics"
          desc="Win rate, drawdown, profit factor — all calculated in real time."
        />
        <Feature
          icon={
            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          }
          title="Trade Journal"
          desc="Tag, annotate, and screenshot every trade you make."
        />
      </section>
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5 shadow-[0_4px_24px_rgba(0,0,0,0.3)] backdrop-blur-xl transition-colors hover:border-white/15 hover:bg-white/[0.07]">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-white/5">
        {icon}
      </div>
      <h3 className="font-semibold text-white">{title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-white/40">{desc}</p>
    </div>
  );
}
