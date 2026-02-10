"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/dashboard/trades", label: "Trades", icon: "📈" },
  { href: "/dashboard/analytics", label: "Analytics", icon: "🔍" },
  { href: "/dashboard/journal", label: "Journal", icon: "📝" },
  { href: "/dashboard/accounts", label: "Accounts", icon: "🔗" },
  { href: "/dashboard/settings/tags", label: "Tags", icon: "🏷️" },
  { href: "/dashboard/settings", label: "Settings", icon: "⚙️" },
];

export default function Sidebar({ user }: { user: User }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <aside className="flex w-56 flex-col border-r border-border bg-surface">
      <div className="p-5">
        <h1 className="text-xl font-bold">
          Raw<span className="text-accent">Journal</span>
        </h1>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-accent/10 text-accent"
                  : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-4">
        <p className="truncate text-xs text-text-secondary">{user.email}</p>
        <button
          onClick={handleSignOut}
          className="mt-2 w-full rounded-lg border border-border px-3 py-1.5 text-xs text-text-secondary transition-colors hover:border-loss hover:text-loss"
        >
          Sign Out
        </button>
      </div>
    </aside>
  );
}
