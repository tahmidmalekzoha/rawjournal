import Link from "next/link";
import { GlobeNav } from "@/components/globe-nav";
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-black">
      {/* Volumetric godray lighting - layered below interactive content */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        {/* Outer soft glow - wide ambient spill */}
        <div 
          className="absolute -top-[5%] -left-[5%] h-[200%] w-[200%]"
          style={{
            background: 'conic-gradient(from 90deg at 0% 0%, transparent 0deg, rgba(255,255,255,0.015) 8deg, rgba(255,255,255,0.05) 20deg, rgba(255,255,255,0.09) 32deg, rgba(255,255,255,0.11) 40deg, rgba(255,255,255,0.09) 48deg, rgba(255,255,255,0.05) 60deg, rgba(255,255,255,0.015) 74deg, transparent 85deg)',
            filter: 'blur(30px)',
          }}
        />
        
        {/* Main beam body */}
        <div 
          className="absolute -top-[5%] -left-[5%] h-[200%] w-[200%]"
          style={{
            background: 'conic-gradient(from 90deg at 0% 0%, transparent 0deg, rgba(255,255,255,0.03) 15deg, rgba(255,255,255,0.12) 28deg, rgba(255,255,255,0.2) 36deg, rgba(255,255,255,0.24) 41deg, rgba(255,255,255,0.2) 46deg, rgba(255,255,255,0.12) 54deg, rgba(255,255,255,0.03) 66deg, transparent 78deg)',
            filter: 'blur(8px)',
          }}
        />
        
        {/* Sharp bright core */}
        <div 
          className="absolute -top-[5%] -left-[5%] h-[200%] w-[200%]"
          style={{
            background: 'conic-gradient(from 90deg at 0% 0%, transparent 0deg, rgba(255,255,255,0.06) 24deg, rgba(255,255,255,0.2) 33deg, rgba(255,255,255,0.35) 39deg, rgba(255,255,255,0.4) 41deg, rgba(255,255,255,0.35) 43deg, rgba(255,255,255,0.2) 49deg, rgba(255,255,255,0.06) 58deg, transparent 68deg)',
            filter: 'blur(2px)',
          }}
        />
        
        {/* Crisp edge highlight */}
        <div 
          className="absolute -top-[5%] -left-[5%] h-[200%] w-[200%]"
          style={{
            background: 'conic-gradient(from 90deg at 0% 0%, transparent 0deg, transparent 33deg, rgba(255,255,255,0.1) 37deg, rgba(255,255,255,0.18) 40.5deg, rgba(255,255,255,0.1) 44deg, transparent 48deg, transparent 360deg)',
          }}
        />
        
        {/* Near-source brightness boost (linear, not radial) */}
        <div 
          className="absolute -top-[10%] -left-[10%] h-[70%] w-[70%]"
          style={{
            background: 'conic-gradient(from 90deg at 0% 0%, transparent 0deg, rgba(255,255,255,0.15) 25deg, rgba(255,255,255,0.45) 35deg, rgba(255,255,255,0.55) 41deg, rgba(255,255,255,0.45) 47deg, rgba(255,255,255,0.15) 58deg, transparent 70deg)',
            filter: 'blur(20px)',
            maskImage: 'linear-gradient(135deg, white 0%, transparent 70%)',
            WebkitMaskImage: 'linear-gradient(135deg, white 0%, transparent 70%)',
          }}
        />
      </div>

      {/* Dark vignette - deepens shadows away from light source */}
      <div 
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{
          background: 'radial-gradient(ellipse 60% 50% at 0% 0%, transparent 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.7) 100%)',
        }}
      />
      {/* Bottom-right shadow push */}
      <div 
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{
          background: 'linear-gradient(135deg, transparent 20%, rgba(0,0,0,0.4) 60%, rgba(0,0,0,0.65) 100%)',
        }}
      />

      {/* Background particles */}
      <div className="pointer-events-none absolute inset-0 z-[2]">
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
        <div className="particle particle-17" />
        <div className="particle particle-18" />
        <div className="particle particle-19" />
        <div className="particle particle-20" />
        <div className="particle particle-21" />
        <div className="particle particle-22" />
        <div className="particle particle-23" />
        <div className="particle particle-24" />
        <div className="particle particle-25" />
        <div className="particle particle-26" />
      </div>

      {/* Ambient glow behind globe */}
      <div className="pointer-events-none absolute left-1/2 top-[60%] z-[2] h-[600px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.02)_0%,transparent_55%)] blur-[60px]" />

      {/* Tubelight Navbar */}
      <GlobeNav />

      {/* Navbar — logo + auth */}
      <nav className="relative z-30 flex items-center justify-between px-6 py-5 sm:px-12">
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
      <section className="pointer-events-auto relative z-20 flex flex-col items-center pt-16 text-center sm:pt-20">
        <h1 className="max-w-2xl text-5xl font-bold leading-[1.1] tracking-tight text-white sm:text-6xl lg:text-7xl">
          Elevate Your Trading Journey
        </h1>
        <p className="mt-5 max-w-md text-base text-white/50 sm:text-lg">
          Track, analyze, and master every trade with intelligent auto-sync and deep analytics.
        </p>
        <Link href="/login" className="relative z-30 mt-8">
          <InteractiveHoverButton
            text="Get Started"
            className="w-auto border-white/30 bg-white/90 px-8 py-3.5 text-sm text-black shadow-[0_0_30px_rgba(255,255,255,0.15)] backdrop-blur-md [&_div:last-child]:bg-white"
          />
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
          <div className="absolute left-[-12%] top-[30%] z-30 rounded-2xl border border-white/[0.08] bg-black/60 p-4 shadow-[0_8px_40px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-2xl sm:left-[-16%] sm:p-5">
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
          <div className="absolute right-[-10%] top-[55%] z-30 rounded-2xl border border-white/[0.08] bg-black/60 p-4 shadow-[0_8px_40px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-2xl sm:right-[-14%] sm:p-5">
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
