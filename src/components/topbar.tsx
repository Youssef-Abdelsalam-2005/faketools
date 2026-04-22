"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Moon, Sun, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

export function TopBar({ meta }: { meta?: { left?: string; center?: string; right?: string } }) {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const navItems = [
    { href: "/projects", label: "Projects" },
    { href: "/logs", label: "Logs" },
  ];

  return (
    <header className="border-b border-[var(--border)] bg-[var(--background)]">
      <div className="flex h-14 items-center px-6">
        <Link href="/projects" className="serif text-[22px] tracking-tight">
          faketools
        </Link>
        <nav className="ml-12 flex items-center gap-8">
          {navItems.map((n) => {
            const active = pathname === n.href || pathname.startsWith(n.href + "/");
            return (
              <Link
                key={n.href}
                href={n.href}
                className={cn("meta transition-colors", active ? "text-[var(--foreground)]" : "hover:text-[var(--foreground)]")}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-4">
          <span className="meta">location: {pathname}</span>
          <button
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className="flex h-7 w-7 items-center justify-center border border-[var(--border)] hover:bg-[var(--border)]/40"
            aria-label="Toggle theme"
            suppressHydrationWarning
          >
            <span suppressHydrationWarning>
              {mounted ? (resolvedTheme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />) : <Moon className="h-3.5 w-3.5 opacity-0" />}
            </span>
          </button>
          <form action="/api/auth/logout" method="post">
            <button
              type="submit"
              className="flex h-7 w-7 items-center justify-center border border-[var(--border)] hover:bg-[var(--border)]/40"
              aria-label="Logout"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      </div>
      <div className="grid grid-cols-3 border-t border-[var(--border)] px-6 py-2">
        <div className="meta">{meta?.left ?? "current build: v0.1.0"}</div>
        <div className="meta text-center">{meta?.center ?? "signal status: nominal"}</div>
        <div className="meta text-right">{meta?.right ?? "sample rate: 24khz / 16-bit"}</div>
      </div>
    </header>
  );
}
