"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Activity,
  Bell,
  CreditCard,
  Gavel,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  Search,
  Settings,
  Shield,
  Swords,
  Trophy,
  UserCog,
  Users,
} from "lucide-react";
import { useRouter } from "../router";
import { useAuth } from "../auth-context";
import { BrandLogo, RoleBadge } from "../shared/kit";
import { isStaffRole } from "@/lib/types";
import { cn } from "@/lib/utils";

const ADMIN_NAV = [
  { section: "", label: "Dashboard", icon: LayoutDashboard },
  { section: "tournaments", label: "Tournaments", icon: Trophy },
  { section: "teams", label: "Teams", icon: Users },
  { section: "players", label: "Players", icon: Shield },
  { section: "payments", label: "Payments", icon: CreditCard },
  { section: "complaints", label: "Complaints", icon: Gavel },
  { section: "penalties", label: "Penalties", icon: Swords },
  { section: "announcements", label: "Announcements", icon: Megaphone },
  { section: "users", label: "Users & Roles", icon: UserCog },
  { section: "activity", label: "Activity Logs", icon: Activity },
  { section: "settings", label: "Settings", icon: Settings },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { route, navigate } = useRouter();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!user || !isStaffRole(user.role)) {
    return (
      <div className="min-h-screen grid place-items-center bg-background px-4">
        <div className="text-center space-y-4">
          <Shield className="h-10 w-10 text-muted-foreground mx-auto" />
          <h1 className="font-display text-2xl font-bold">Staff access required</h1>
          <p className="text-sm text-muted-foreground">Sign in with an admin account to continue.</p>
          <Button onClick={() => navigate("/login?next=/admin")}>Go to Login</Button>
        </div>
      </div>
    );
  }

  const active = route.segments[1] ?? "";

  const NavLink = ({ item, onNavigate }: { item: (typeof ADMIN_NAV)[number]; onNavigate?: () => void }) => {
    const isActive = active === item.section;
    return (
      <button
        onClick={() => {
          navigate(`/admin${item.section ? `/${item.section}` : ""}`);
          onNavigate?.();
        }}
        className={cn(
          "w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer border border-transparent",
          isActive
            ? "bg-primary/15 text-primary border-primary/25"
            : "text-muted-foreground hover:text-foreground hover:bg-secondary"
        )}
        aria-current={isActive ? "page" : undefined}
      >
        <item.icon className="h-4 w-4 shrink-0" />
        <span className="truncate">{item.label}</span>
      </button>
    );
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-border flex flex-col transition-transform lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
        aria-label="Admin navigation"
      >
        <div className="h-16 flex items-center px-5 border-b border-border shrink-0">
          <button onClick={() => navigate("/")} className="cursor-pointer">
            <BrandLogo size="sm" />
          </button>
        </div>

        <div className="p-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2.5 rounded-lg bg-secondary/60 border border-border p-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-primary/15 text-primary shrink-0">
              <Shield className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <div className="mt-0.5"><RoleBadge role={user.role} /></div>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {ADMIN_NAV.map((item) => (
            <NavLink key={item.section} item={item} onNavigate={() => setSidebarOpen(false)} />
          ))}
        </nav>

        <div className="p-3 border-t border-border space-y-2 shrink-0">
          <Button variant="outline" className="w-full" size="sm" onClick={() => navigate("/")}>
            <Swords className="h-4 w-4" /> Public Site
          </Button>
          <Button
            variant="ghost"
            className="w-full text-muted-foreground"
            size="sm"
            onClick={async () => {
              await logout();
              navigate("/");
            }}
          >
            <LogOut className="h-4 w-4" /> Sign Out
          </Button>
        </div>
      </aside>

      {/* Backdrop for mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main */}
      <div className="flex-1 lg:ml-64 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 glass border-b border-border h-14 flex items-center gap-3 px-4 sm:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)} aria-label="Open admin menu">
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex-1" />
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/notifications")} aria-label="Notifications">
            <Bell className="h-5 w-5" />
          </Button>
          <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
            <Shield className="h-3 w-3" /> ADMIN
          </span>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0">{children}</main>
      </div>
    </div>
  );
}
