"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Activity, Bell, Circle, LogOut, Menu, PanelLeftClose, PanelLeftOpen, Search, Server, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import { brand, navItems } from "@/lib/mock-data";
import { getDashboardSummary } from "@/services/dashboardService";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";
import { Button } from "./ui/primitives";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [userName, setUserName] = useState("Pushpendra");
  const [apiStatus, setApiStatus] = useState<"online" | "offline" | "checking">("checking");
  const [onlineAgents, setOnlineAgents] = useState<number | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const visibleNavItems = useMemo(
    () => role?.startsWith("CLIENT")
      ? navItems.filter((item) => item.href === "/client-portal" || item.href === "/reports")
      : navItems,
    [role]
  );

  useEffect(() => {
    try {
      const user = JSON.parse(window.localStorage.getItem("nscope_user") ?? "null") as { name?: string; email?: string; role?: string } | null;
      setRole(user?.role ?? null);
      setUserName(user?.name ?? user?.email ?? "Pushpendra");
    } catch {
      setRole(null);
      setUserName("Pushpendra");
    }
  }, [pathname]);

  useEffect(() => {
    setSidebarCollapsed(window.localStorage.getItem("nscope_sidebar_collapsed") === "true");
  }, []);

  function toggleSidebar() {
    setSidebarCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem("nscope_sidebar_collapsed", String(next));
      return next;
    });
  }

  useEffect(() => {
    let mounted = true;

    async function loadStatus() {
      try {
        const healthUrl = API_BASE_URL ? API_BASE_URL.replace(/\/api\/?$/, "/health") : "";
        if (healthUrl) {
          const response = await fetch(healthUrl, { cache: "no-store" });
          if (!mounted) return;
          setApiStatus(response.ok ? "online" : "offline");
        } else {
          setApiStatus("offline");
        }
      } catch {
        if (mounted) setApiStatus("offline");
      }

      try {
        const summary = await getDashboardSummary();
        if (mounted) setOnlineAgents(summary.online_devices);
      } catch {
        if (mounted) setOnlineAgents(null);
      }
    }

    loadStatus();
    const interval = window.setInterval(loadStatus, 60000);
    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, []);

  function signOut() {
    window.localStorage.removeItem("nscope_token");
    window.localStorage.removeItem("nscope_user");
    setRole(null);
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950 dark:bg-slate-950 dark:text-slate-50">
      {mobileSidebarOpen && <div className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden" onClick={() => setMobileSidebarOpen(false)} />}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 border-r bg-white transition-all duration-200 dark:border-slate-800 dark:bg-slate-950 lg:z-30",
        sidebarCollapsed ? "lg:w-16" : "lg:w-60",
        mobileSidebarOpen ? "w-72 translate-x-0" : "w-72 -translate-x-full lg:translate-x-0",
      )}>
        <div className="flex h-14 items-center border-b px-4 dark:border-slate-800">
          {!sidebarCollapsed && <Logo />}
          {sidebarCollapsed && <Logo compact />}
          <Button className="ml-auto lg:hidden" variant="ghost" size="icon" onClick={() => setMobileSidebarOpen(false)} aria-label="Close navigation">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <nav className="h-[calc(100vh-3.5rem)] overflow-y-auto px-2 py-3">
          {visibleNavItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                href={item.href}
                key={item.href}
                className={cn(
                  "mb-1 flex min-h-9 items-center gap-3 rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white",
                  sidebarCollapsed && "lg:justify-center lg:px-2",
                  active && "bg-blue-50 text-accent ring-1 ring-blue-100 dark:bg-blue-500/15 dark:text-blue-200 dark:ring-blue-500/20"
                )}
                title={sidebarCollapsed ? item.title : undefined}
                onClick={() => setMobileSidebarOpen(false)}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className={cn(sidebarCollapsed && "lg:hidden")}>{item.title}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className={cn("transition-all duration-200", sidebarCollapsed ? "lg:pl-16" : "lg:pl-60")}>
        <header className="sticky top-0 z-20 border-b bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
          <div className="flex min-h-14 items-center gap-3 px-4 md:px-5">
            <Logo compact className="lg:hidden" />
            <Button variant="outline" size="icon" className="lg:hidden" onClick={() => setMobileSidebarOpen(true)} aria-label="Open navigation">
              <Menu className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="hidden lg:inline-flex" onClick={toggleSidebar} aria-label="Collapse navigation" title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}>
              {sidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </Button>
            <label className="hidden min-w-0 flex-1 items-center gap-2 rounded-md border bg-slate-50 px-3 py-1.5 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 md:flex">
              <Search className="h-4 w-4" />
              <input className="h-7 min-w-0 flex-1 bg-transparent outline-none placeholder:text-slate-400" placeholder="Search clients, devices, tickets, assets" />
            </label>
            <nav className="flex flex-1 gap-2 overflow-x-auto lg:hidden">
              {visibleNavItems.slice(0, 7).map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="inline-flex h-9 shrink-0 items-center rounded-md border px-3 text-xs font-medium"
                >
                  {item.title}
                </Link>
              ))}
            </nav>
            <TopStatus icon={Server} label="API" value={apiStatus === "online" ? "Online" : apiStatus === "checking" ? "Checking" : "Offline"} tone={apiStatus === "online" ? "green" : apiStatus === "checking" ? "amber" : "red"} />
            <TopStatus icon={Activity} label="Agents" value={onlineAgents === null ? "-" : `${onlineAgents} online`} tone="blue" />
            <Button variant="outline" size="icon" aria-label="Notifications" title="Notifications">
              <Bell className="h-4 w-4" />
            </Button>
            <ThemeToggle />
            <div className="hidden text-right text-sm sm:block">
              <p className="font-medium">{userName}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{role ? displayRole(role) : "Not signed in"}</p>
            </div>
            <Button variant="outline" size="icon" aria-label="Sign out" title="Sign out" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>
        <main className="px-4 py-4 md:px-5">{children}</main>
        <footer className="border-t px-4 py-5 text-center text-xs text-slate-500 md:px-6">
          {brand.footer}
        </footer>
      </div>
    </div>
  );
}

function TopStatus({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone: "green" | "amber" | "red" | "blue";
}) {
  const toneClass = {
    green: "text-emerald-600 dark:text-emerald-300",
    amber: "text-amber-600 dark:text-amber-300",
    red: "text-red-600 dark:text-red-300",
    blue: "text-blue-600 dark:text-blue-300",
  }[tone];

  return (
    <div className="hidden items-center gap-2 rounded-md border bg-slate-50 px-2.5 py-1.5 text-xs dark:border-slate-800 dark:bg-slate-900 xl:flex">
      <Icon className="h-3.5 w-3.5 text-slate-500" />
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className={cn("inline-flex items-center gap-1 font-medium", toneClass)}>
        <Circle className="h-2 w-2 fill-current" />
        {value}
      </span>
    </div>
  );
}

function displayRole(role: string) {
  return role
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}
