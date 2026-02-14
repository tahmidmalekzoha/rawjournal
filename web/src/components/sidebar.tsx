"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import {
  LayoutDashboard,
  ArrowLeftRight,
  BookOpen,
  BarChart3,
  TrendingUp,
  Settings,
  HelpCircle,
  LogOut,
  Wrench,
  Menu,
  X,
} from "lucide-react";

const menuItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/trades", label: "Trades", icon: ArrowLeftRight },
  { href: "/dashboard/journal", label: "Journal", icon: BookOpen },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/charts/EURUSD", label: "Market", icon: TrendingUp },
];

const bottomItems = [
  { href: "/dashboard/settings/accounts", label: "MT5 Accounts", icon: Settings },
  { href: "/dashboard/settings/tags", label: "Tags & Tools", icon: Wrench },
];

export default function Sidebar({ user }: { user: User }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    if (href.startsWith("/dashboard/charts/")) return pathname.startsWith("/dashboard/charts/");
    return pathname.startsWith(href);
  }

  const displayName = user.user_metadata?.full_name || user.email?.split("@")[0] || "User";
  const initials = displayName.charAt(0).toUpperCase();

  const navContent = (
    <>
      {/* Logo */}
      <div className="flex items-center justify-between px-4 pt-5 pb-6">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-black text-xs font-black">
            RJ
          </div>
          <span className="text-base font-bold tracking-tight text-text-primary">
            RawJournal
          </span>
        </Link>
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden rounded-lg p-1.5 text-text-secondary hover:bg-surface-hover"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 space-y-1 px-3">
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-text-secondary">
          Menu
        </p>
        {menuItems.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all ${
                active
                  ? "bg-white/[0.06] text-text-primary font-medium"
                  : "text-text-secondary hover:bg-white/[0.03] hover:text-text-primary"
              }`}
            >
              <Icon
                className={`h-[18px] w-[18px] shrink-0 transition-colors ${
                  active ? "text-accent" : ""
                }`}
                strokeWidth={1.8}
              />
              <span>{item.label}</span>
              {active && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-border px-3 pt-3 pb-2">
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-text-secondary">
          Settings
        </p>
        {bottomItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-white/[0.03] hover:text-text-primary"
            >
              <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.8} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* User card */}
      <div className="border-t border-border p-3">
        <div className="flex items-center gap-3 rounded-lg p-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-medium text-text-primary">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium text-text-primary">{displayName}</p>
            <p className="truncate text-[11px] text-text-secondary">{user.email}</p>
          </div>
          <button
            onClick={handleSignOut}
            title="Sign Out"
            className="shrink-0 rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-loss/10 hover:text-loss"
          >
            <LogOut className="h-4 w-4" strokeWidth={1.8} />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-40 flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-surface lg:hidden"
      >
        <Menu className="h-5 w-5 text-text-primary" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile drawer */}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-surface border-r border-border transition-transform duration-200 lg:hidden ${
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      }`}>
        {navContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-60 flex-col bg-surface border-r border-border">
        {navContent}
      </aside>
    </>
  );
}
