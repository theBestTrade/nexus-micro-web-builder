"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Search, Wand2, Send, Settings, LogOut, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const NAV_ITEMS = [
  { href: "/dashboard",   label: "대시보드",         icon: LayoutDashboard },
  { href: "/sourcing",    label: "Target Finder",    icon: Search          },
  { href: "/studio",      label: "Adaptation Studio",icon: Wand2           },
  { href: "/publisher",   label: "Publisher Matrix", icon: Send            },
  { href: "/settings",    label: "Settings",         icon: Settings        },
] as const;

export default function Sidebar() {
  const pathname  = usePathname();
  const router    = useRouter();
  const supabase  = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-border bg-card">
      {/* 로고 */}
      <div className="flex items-center gap-2 px-5 py-5 border-b border-border">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-jade">
          <Zap className="h-5 w-5 text-surface" />
        </div>
        <span className="font-heading text-xl tracking-widest text-foreground">
          NOMAD
        </span>
      </div>

      {/* 네비게이션 */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-denim/20 text-denim font-medium"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon
                    className={cn("h-4 w-4 shrink-0", active ? "text-denim" : "")}
                  />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* 로그아웃 */}
      <div className="border-t border-border p-3">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          로그아웃
        </button>
      </div>
    </aside>
  );
}
