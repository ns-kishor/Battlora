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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bell, LayoutDashboard, LogOut, Menu, Shield, Swords, Trophy, User } from "lucide-react";
import { useRouter } from "../router";
import { useAuth } from "../auth-context";
import { BrandLogo } from "../shared/kit";
import { isStaffRole } from "@/lib/types";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { label: "Tournaments", path: "/tournaments", icon: Swords },
  { label: "Leaderboards", path: "/leaderboards", icon: Trophy },
];

function NavLinks({
  onNavigate,
  navigate,
  isActive,
}: {
  onNavigate?: () => void;
  navigate: (path: string) => void;
  isActive: (path: string) => boolean;
}) {
  return (
    <>
      {NAV_LINKS.map((l) => (
        <Button
          key={l.path}
          variant="ghost"
          className={cn(
            "text-muted-foreground hover:text-foreground justify-start",
            isActive(l.path) && "text-primary"
          )}
          onClick={() => {
            navigate(l.path);
            onNavigate?.();
          }}
        >
          <l.icon className="h-4 w-4" />
          {l.label}
        </Button>
      ))}
    </>
  );
}

export function PublicLayout({ children }: { children: React.ReactNode }) {
  const { navigate, route } = useRouter();
  const { user, team, unreadNotifications, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (path: string) => {
    const base = path.split("?")[0];
    return route.path === base || (base !== "/" && route.path.startsWith(base));
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-40 glass border-b border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 cursor-pointer"
            aria-label="Battlora home"
          >
            <BrandLogo />
          </button>

          <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
            <NavLinks navigate={navigate} isActive={isActive} />
          </nav>

          <div className="flex items-center gap-2">
            {user ? (
              <>
                {unreadNotifications > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative md:hidden"
                    onClick={() => navigate("/dashboard/notifications")}
                    aria-label={`Notifications (${unreadNotifications} unread)`}
                  >
                    <Bell className="h-5 w-5" />
                    <span className="absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-destructive text-[10px] font-bold text-white px-1">
                      {unreadNotifications}
                    </span>
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="flex items-center gap-2 rounded-full border border-border bg-card px-2 py-1.5 hover:border-primary/40 transition-colors cursor-pointer"
                      aria-label="Account menu"
                    >
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="bg-primary/15 text-primary text-xs font-semibold">
                          {initials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="hidden sm:block text-sm font-medium max-w-28 truncate">
                        {team?.name ?? user.name}
                      </span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 bg-popover border-border">
                    <DropdownMenuLabel className="text-xs text-muted-foreground">
                      {user.email}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate("/dashboard")}>
                      <LayoutDashboard className="h-4 w-4" /> Team Dashboard
                    </DropdownMenuItem>
                    {isStaffRole(user.role) && (
                      <DropdownMenuItem onClick={() => navigate("/admin")}>
                        <Shield className="h-4 w-4" /> Admin Panel
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => navigate("/dashboard/notifications")}>
                      <Bell className="h-4 w-4" /> Notifications
                      {unreadNotifications > 0 && (
                        <span className="ml-auto rounded-full bg-destructive/20 text-destructive text-xs px-1.5">
                          {unreadNotifications}
                        </span>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={async () => {
                        await logout();
                        navigate("/");
                      }}
                    >
                      <LogOut className="h-4 w-4" /> Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Button variant="ghost" onClick={() => navigate("/login")} className="hidden sm:inline-flex">
                  <User className="h-4 w-4" /> Sign In
                </Button>
                <Button className="btn-primary-glow" onClick={() => navigate("/register")}>
                  Join Battlora
                </Button>
              </>
            )}

            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="bg-card border-border w-72">
                <SheetHeader>
                  <SheetTitle>
                    <BrandLogo size="sm" />
                  </SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-1 px-4 pb-6">
                  <NavLinks navigate={navigate} isActive={isActive} onNavigate={() => setMobileOpen(false)} />
                  {!user && (
                    <Button
                      variant="outline"
                      className="mt-2 justify-start"
                      onClick={() => {
                        navigate("/login");
                        setMobileOpen(false);
                      }}
                    >
                      <User className="h-4 w-4" /> Sign In
                    </Button>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="mt-auto border-t border-border bg-card/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-3">
            <BrandLogo size="sm" />
            <p className="text-sm text-muted-foreground max-w-xs">
              The complete Free Fire esports tournament platform — register, compete, climb the
              leaderboard and conquer.
            </p>
          </div>
          <div>
            <h3 className="font-display font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-3">
              Compete
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <button className="hover:text-primary transition-colors cursor-pointer" onClick={() => navigate("/tournaments")}>
                  Browse Tournaments
                </button>
              </li>
              <li>
                <button className="hover:text-primary transition-colors cursor-pointer" onClick={() => navigate("/leaderboards")}>
                  Leaderboards
                </button>
              </li>
              <li>
                <button className="hover:text-primary transition-colors cursor-pointer" onClick={() => navigate("/register")}>
                  Create Account
                </button>
              </li>
              <li>
                <button className="hover:text-primary transition-colors cursor-pointer" onClick={() => navigate("/login")}>
                  Team Login
                </button>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-display font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-3">
              Platform
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Automated scoring engine</li>
              <li>Transparent leaderboards</li>
              <li>Verified payments</li>
              <li>Fair play &amp; penalties</li>
            </ul>
          </div>
          <div>
            <h3 className="font-display font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-3">
              Support
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>battleora.advance@gmail.com</li>
              <li>+880 1402585503</li>
              <li>Sat – Thu, 2pm – 12am</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-border py-4 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Battlora.
        </div>
      </footer>
    </div>
  );
}
