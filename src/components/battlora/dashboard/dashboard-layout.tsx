"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Bell,
  CalendarDays,
  ClipboardList,
  CreditCard,
  DoorOpen,
  Gamepad2,
  HandCoins,
  Home,
  KeyRound,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  MessageSquareWarning,
  MoreHorizontal,
  Shield,
  Trophy,
  Users,
} from "lucide-react";
import { useRouter } from "../router";
import { useAuth } from "../auth-context";
import { BrandLogo, TeamLogo } from "../shared/kit";
import { isStaffRole } from "@/lib/types";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { section: "overview", label: "Overview", icon: LayoutDashboard },
  { section: "team", label: "My Team", icon: Users },
  { section: "matches", label: "Matches", icon: CalendarDays },
  { section: "rooms", label: "Room Details", icon: DoorOpen },
  { section: "results", label: "Results", icon: ClipboardList },
  { section: "leaderboard", label: "Leaderboard", icon: Trophy },
  { section: "complaints", label: "Complaints", icon: MessageSquareWarning },
  { section: "notifications", label: "Notifications", icon: Bell },
  { section: "payment", label: "Payment", icon: CreditCard },
  { section: "withdraw", label: "Withdraw", icon: HandCoins },
  { section: "rules", label: "Rules", icon: ListChecks },
];

const MOBILE_NAV = [
  { section: "overview", label: "Home", icon: Home },
  { section: "team", label: "Team", icon: Users },
  { section: "matches", label: "Matches", icon: CalendarDays },
  { section: "rooms", label: "Rooms", icon: DoorOpen },
];

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { route, navigate } = useRouter();
  const { user, team, unreadNotifications, logout } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);
  const active = route.segments[1] ?? "overview";

  const NavLink = ({
    item,
    onNavigate,
  }: {
    item: (typeof NAV_ITEMS)[number];
    onNavigate?: () => void;
  }) => {
    const isActive = active === item.section;
    return (
      <button
        onClick={() => {
          navigate(`/dashboard/${item.section}`);
          onNavigate?.();
        }}
        className={cn(
          "w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer",
          isActive
            ? "bg-primary/15 text-primary border border-primary/25"
            : "text-muted-foreground hover:text-foreground hover:bg-secondary border border-transparent"
        )}
        aria-current={isActive ? "page" : undefined}
      >
        <item.icon className="h-4 w-4 shrink-0" />
        <span className="truncate">{item.label}</span>
        {item.section === "notifications" && unreadNotifications > 0 && (
          <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-destructive text-[10px] font-bold text-white px-1.5">
            {unreadNotifications}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-40 glass border-b border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => navigate("/")} className="cursor-pointer shrink-0" aria-label="Battlora home">
              <BrandLogo size="sm" />
            </button>
            <span className="hidden lg:block h-5 w-px bg-border" />
            <div className="hidden lg:flex items-center gap-2 min-w-0">
              {team && <TeamLogo name={team.name} logoUrl={team.logoUrl} size={26} />}
              <span className="text-sm font-medium truncate">{team?.name ?? user?.name}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={() => navigate("/dashboard/notifications")}
              aria-label={`Notifications${unreadNotifications ? ` (${unreadNotifications} unread)` : ""}`}
            >
              <Bell className="h-5 w-5" />
              {unreadNotifications > 0 && (
                <span className="absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-destructive text-[10px] font-bold text-white px-1">
                  {unreadNotifications > 9 ? "9+" : unreadNotifications}
                </span>
              )}
            </Button>
            {isStaffRole(user?.role ?? "") && (
              <Button variant="outline" size="sm" onClick={() => navigate("/admin")} className="hidden sm:inline-flex">
                <Shield className="h-4 w-4" /> Admin
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={async () => {
                await logout();
                navigate("/");
              }}
              aria-label="Sign out"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 mx-auto w-full max-w-7xl px-0 sm:px-6 lg:px-8 lg:grid lg:grid-cols-[230px_1fr] lg:gap-8">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block py-8" aria-label="Dashboard navigation">
          <nav className="sticky top-20 space-y-1">
            {NAV_ITEMS.map((item) => (
              <NavLink key={item.section} item={item} />
            ))}
            <div className="pt-3 mt-3 border-t border-border">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate("/tournaments")}
              >
                <Gamepad2 className="h-4 w-4" /> Browse Tournaments
              </Button>
            </div>
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 py-6 lg:py-8 px-4 sm:px-0 pb-24 lg:pb-8 min-w-0">{children}</main>
      </div>

      {/* Mobile bottom nav (PRD 49) */}
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 glass border-t border-border pb-[env(safe-area-inset-bottom)]"
        aria-label="Mobile navigation"
      >
        <div className="grid grid-cols-5 h-16">
          {MOBILE_NAV.map((item) => {
            const isActive = active === item.section;
            return (
              <button
                key={item.section}
                onClick={() => navigate(`/dashboard/${item.section}`)}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 text-[10px] font-medium cursor-pointer",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </button>
            );
          })}
          <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
            <SheetTrigger asChild>
              <button
                className={cn(
                  "flex flex-col items-center justify-center gap-1 text-[10px] font-medium cursor-pointer",
                  !MOBILE_NAV.some((i) => i.section === active) ? "text-primary" : "text-muted-foreground"
                )}
              >
                <MoreHorizontal className="h-5 w-5" />
                More
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="bg-card border-border rounded-t-2xl pb-[env(safe-area-inset-bottom)]">
              <SheetHeader className="pb-2">
                <SheetTitle className="text-sm text-muted-foreground">Team Dashboard</SheetTitle>
              </SheetHeader>
              <div className="grid grid-cols-2 gap-2 px-4 pb-6">
                {NAV_ITEMS.map((item) => (
                  <NavLink key={item.section} item={item} onNavigate={() => setMoreOpen(false)} />
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </div>
  );
}
