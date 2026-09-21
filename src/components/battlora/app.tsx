"use client";

import { useEffect } from "react";
import { RouterProvider, useRouter } from "./router";
import { AuthProvider, useAuth } from "./auth-context";
import { SettingsProvider } from "./settings-context";
import { BrandLogo } from "./shared/kit";
import { isStaffRole } from "@/lib/types";

// Layouts
import { PublicLayout } from "./public/public-layout";
import { DashboardLayout } from "./dashboard/dashboard-layout";
import { AdminLayout } from "./admin/admin-layout";

// Public pages
import { Home } from "./public/home";
import { TournamentList } from "./public/tournament-list";
import { TournamentDetail } from "./public/tournament-detail";
import { AuthView } from "./public/auth-view";
import { RegisterWizard } from "./public/register-wizard";

// Dashboard sections
import { DashboardOverview } from "./dashboard/overview";
import { MyTeam } from "./dashboard/my-team";
import { DashboardMatches } from "./dashboard/matches";
import { RoomDetails } from "./dashboard/room-details";
import { MyResults } from "./dashboard/results";
import { DashboardLeaderboard } from "./dashboard/leaderboard";
import { MyComplaints } from "./dashboard/complaints";
import { MyNotifications } from "./dashboard/notifications";
import { MyPayment } from "./dashboard/payment";
import { DashboardRules } from "./dashboard/rules";

// Admin sections
import { AdminDashboard } from "./admin/dashboard";
import { AdminTournaments } from "./admin/tournaments";
import { ControlCenter } from "./admin/control-center";
import { AdminTeams } from "./admin/teams";
import { AdminPlayers } from "./admin/players";
import { AdminPayments } from "./admin/payments";
import { AdminComplaints } from "./admin/complaints";
import { AdminPenalties } from "./admin/penalties";
import { AdminAnnouncements } from "./admin/announcements";
import { AdminUsers } from "./admin/users";
import { AdminActivity } from "./admin/activity";
import { AdminSettings } from "./admin/settings";
import { AdminAccount } from "./admin/account";

export function BattloraApp() {
  return (
    <RouterProvider>
      <AuthProvider>
        <SettingsProvider>
          <AppShell />
        </SettingsProvider>
      </AuthProvider>
    </RouterProvider>
  );
}

function SplashScreen() {
  return (
    <div className="min-h-screen grid place-items-center bg-background">
      <div className="flex flex-col items-center gap-4 animate-in-up">
        <BrandLogo size="lg" />
        <div className="h-1 w-40 overflow-hidden rounded-full bg-secondary">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-primary" />
        </div>
        <p className="text-xs text-muted-foreground tracking-widest uppercase">
          Loading arena…
        </p>
      </div>
    </div>
  );
}

function AppShell() {
  const { route, navigate } = useRouter();
  const { user, loading } = useAuth();

  const root = route.segments[0] ?? "";

  // Auth guards
  useEffect(() => {
    if (loading) return;
    if (root === "dashboard" && !user) navigate("/login?next=/dashboard", { replace: true });
    if (root === "admin" && (!user || !isStaffRole(user.role)))
      navigate("/login?next=/admin", { replace: true });
  }, [root, user, loading, navigate]);

  if (loading) return <SplashScreen />;

  // Focused full-screen route: tournament registration wizard
  if (root === "join") {
    return <RegisterWizard tournamentId={route.segments[1]} />;
  }

  if (root === "dashboard") {
    return (
      <DashboardLayout>
        <DashboardRouter />
      </DashboardLayout>
    );
  }

  if (root === "admin") {
    return (
      <AdminLayout>
        <AdminRouter />
      </AdminLayout>
    );
  }

  return (
    <PublicLayout>
      <PublicRouter />
    </PublicLayout>
  );
}

function PublicRouter() {
  const { route } = useRouter();
  const root = route.segments[0] ?? "";

  if (root === "tournaments") {
    const id = route.segments[1];
    if (id) return <TournamentDetail idOrSlug={id} />;
    return <TournamentList />;
  }
  if (root === "login" || root === "register") {
    return <AuthView mode={root === "login" ? "login" : "register"} />;
  }
  return <Home />;
}

function DashboardRouter() {
  const { route } = useRouter();
  const section = route.segments[1] ?? "overview";

  switch (section) {
    case "team":
      return <MyTeam />;
    case "matches":
      return <DashboardMatches />;
    case "rooms":
      return <RoomDetails />;
    case "results":
      return <MyResults />;
    case "leaderboard":
      return <DashboardLeaderboard />;
    case "complaints":
      return <MyComplaints />;
    case "notifications":
      return <MyNotifications />;
    case "payment":
      return <MyPayment />;
    case "rules":
      return <DashboardRules />;
    default:
      return <DashboardOverview />;
  }
}

function AdminRouter() {
  const { route } = useRouter();
  const section = route.segments[1] ?? "";
  const id = route.segments[2];

  switch (section) {
    case "tournaments":
      return id ? <ControlCenter idOrSlug={id} /> : <AdminTournaments />;
    case "teams":
      return <AdminTeams />;
    case "players":
      return <AdminPlayers />;
    case "payments":
      return <AdminPayments />;
    case "complaints":
      return <AdminComplaints />;
    case "penalties":
      return <AdminPenalties />;
    case "announcements":
      return <AdminAnnouncements />;
    case "users":
      return <AdminUsers />;
    case "activity":
      return <AdminActivity />;
    case "settings":
      return <AdminSettings />;
    case "account":
      return <AdminAccount />;
    default:
      return <AdminDashboard />;
  }
}
