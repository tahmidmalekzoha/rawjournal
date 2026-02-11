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
  CreditCard,
  MessageSquare,
  ChevronRight,
  LogOut,
  Wrench,
} from "lucide-react";

const menuItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/trades", label: "Trades", icon: ArrowLeftRight },
  { href: "/dashboard/journal", label: "Journal", icon: BookOpen },
  { href: "/dashboard/analytics", label: "Analysis", icon: BarChart3 },
  { href: "/dashboard/charts", label: "Market", icon: TrendingUp },
  { href: "/dashboard/settings/tags", label: "Tools", icon: Wrench },
];

const supportItems = [
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
  { href: "#", label: "Help & Support", icon: HelpCircle },
  { href: "#", label: "Subscription", icon: CreditCard },
  { href: "#", label: "Feedback", icon: MessageSquare },
];

export default function Sidebar({ user }: { user: User }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [collapsed, setCollapsed] = useState(false);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  }

  const displayName = user.user_metadata?.full_name || user.email?.split("@")[0] || "User";

  return (
    <aside className="flex w-60 flex-col bg-surface border-r border-border">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 pt-5 pb-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-black text-xs font-black">
          RJ
        </div>
        <span className="text-base font-bold tracking-tight text-text-primary">
          RawJournal
        </span>
        <span className="ml-auto rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-text-secondary">
          BETA
        </span>
      </div>

      {/* User profile card */}
      <div className="mx-3 mb-4 rounded-lg border border-border bg-background p-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-hover text-sm font-medium text-text-primary">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-medium text-text-primary">{displayName}</p>
              <span className="shrink-0 rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-text-secondary">
                FREE
              </span>
            </div>
            <p className="truncate text-xs text-text-secondary">{user.email}</p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-text-secondary" />
        </div>
      </div>

      {/* Menu section */}
      <div className="px-5 mb-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-text-secondary">Menu</p>
      </div>
      <nav className="flex-1 space-y-0.5 px-3">
        {menuItems.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-accent/10 text-text-primary font-medium"
                  : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
              }`}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.8} />
              <span>{item.label}</span>
              {active && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Support section */}
      <div className="px-5 mb-2 mt-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-text-secondary">Support</p>
      </div>
      <div className="space-y-0.5 px-3 pb-3">
        {supportItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
            >
              <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.8} />
              <span>{item.label}</span>
            </Link>
          );
        })}
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-surface-hover hover:text-loss"
        >
          <LogOut className="h-[18px] w-[18px] shrink-0" strokeWidth={1.8} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
