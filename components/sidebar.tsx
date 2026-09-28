"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  BookOpen,
  Bot,
  KeyRound,
  LayoutDashboard,
  MessageSquare,
  PlayCircle,
  Settings,
  FolderKanban,
  Menu,
  X,
  LogOut,
  Server,
  Brain,
  Route,
  Users,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { ADMIN_NAV, USER_NAV } from "@/lib/nav";

const ICONS = {
  "/dashboard": LayoutDashboard,
  "/dashboard/projects": FolderKanban,
  "/dashboard/agents": Bot,
  "/dashboard/playground": PlayCircle,
  "/dashboard/keys": KeyRound,
  "/dashboard/conversations": MessageSquare,
  "/dashboard/analytics": Activity,
  "/dashboard/memory": Brain,
  "/dashboard/docs": BookOpen,
  "/dashboard/admin": Users,
  "/dashboard/providers": Server,
  "/dashboard/routing": Route,
  "/dashboard/settings": Settings,
} as const;

export function Sidebar({ email, isAdmin }: { email: string; isAdmin: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const items = isAdmin ? [...USER_NAV, ...ADMIN_NAV] : [...USER_NAV];

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const content = (
    <div className="flex h-full flex-col">
      <Link href="/dashboard" className="flex items-center gap-2 px-5 py-5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold">N</span>
        <span className="font-semibold tracking-tight">Nexus Agent</span>
      </Link>
      <nav className="flex-1 space-y-1 px-3">
        {items.map((item) => {
          const active = pathname === item.href;
          const Icon = ICONS[item.href as keyof typeof ICONS] ?? LayoutDashboard;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm transition-colors duration-200",
                active ? "bg-primary/15 text-secondary" : "text-muted hover:bg-surface-2 hover:text-foreground",
              )}
            >
              <Icon size={18} aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <p className="px-5 pb-2 text-xs text-muted truncate">{email}</p>
      <button
        type="button"
        onClick={logout}
        className="mx-3 mb-4 flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-3 text-sm text-muted hover:bg-surface-2 hover:text-foreground"
      >
        <LogOut size={18} aria-hidden />
        Sign out
      </button>
    </div>
  );

  return (
    <>
      <button
        type="button"
        className="fixed left-4 top-4 z-40 flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg border border-border bg-surface lg:hidden"
        onClick={() => setOpen(true)}
        aria-label="Open navigation"
      >
        <Menu size={18} />
      </button>
      <aside className="hidden w-60 shrink-0 border-r border-border bg-sidebar lg:block">{content}</aside>
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 bg-black/60" aria-label="Close navigation" onClick={() => setOpen(false)} />
          <div className="relative h-full w-64 bg-sidebar">
            <button
              type="button"
              className="absolute right-3 top-4 flex h-11 w-11 cursor-pointer items-center justify-center"
              onClick={() => setOpen(false)}
              aria-label="Close navigation"
            >
              <X size={18} />
            </button>
            {content}
          </div>
        </div>
      ) : null}
    </>
  );
}
