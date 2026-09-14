"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Activity,
  ArrowRight,
  Coins,
  CreditCard,
  Gavel,
  Swords,
  Trophy,
  UserCog,
  Users,
  Zap,
} from "lucide-react";
import { useRouter } from "../router";
import { useApiData } from "../data-hooks";
import { LoadingGrid, LoadingRows, SectionHeader, StatCard, TournamentStatusBadge } from "../shared/kit";
import { formatMoney, timeAgo } from "@/lib/format";

type StatsData = {
  kpis: {
    totalTournaments: number;
    activeTournaments: number;
    registeredTeams: number;
    totalPlayers: number;
    pendingPayments: number;
    pendingComplaints: number;
    liveMatches: number;
    totalRevenue: number;
  };
  recentActivity: { id: string; userName: string; action: string; entity: string; createdAt: string }[];
  ongoing: {
    id: string;
    name: string;
    status: string;
    teams: number;
    matches: number;
    complaints: number;
    nextMatch: { matchNumber: number; date: string; map: string; status: string } | null;
  }[];
};

export function AdminDashboard() {
  const { navigate } = useRouter();
  const { data, loading } = useApiData<StatsData>("/api/admin/stats", { refreshMs: 30_000 });

  if (loading) {
    return (
      <div className="space-y-6">
        <LoadingGrid count={8} />
      </div>
    );
  }

  const k = data?.kpis;

  return (
    <div className="space-y-6 sm:space-y-8">
      <SectionHeader
        title="Admin Dashboard"
        subtitle="Platform overview — everything at a glance (PRD 34)"
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard label="Total Tournaments" value={k?.totalTournaments ?? 0} icon={<Trophy className="h-4 w-4" />} />
        <StatCard label="Active Tournaments" value={k?.activeTournaments ?? 0} icon={<Zap className="h-4 w-4" />} accent="success" />
        <StatCard label="Registered Teams" value={k?.registeredTeams ?? 0} icon={<Users className="h-4 w-4" />} />
        <StatCard label="Total Players" value={k?.totalPlayers ?? 0} icon={<UserCog className="h-4 w-4" />} accent="muted" />
        <StatCard
          label="Pending Payments"
          value={k?.pendingPayments ?? 0}
          icon={<CreditCard className="h-4 w-4" />}
          accent={k?.pendingPayments ? "warning" : "muted"}
          hint={k?.pendingPayments ? "Needs verification" : "All clear"}
        />
        <StatCard
          label="Pending Complaints"
          value={k?.pendingComplaints ?? 0}
          icon={<Gavel className="h-4 w-4" />}
          accent={k?.pendingComplaints ? "danger" : "muted"}
          hint={k?.pendingComplaints ? "Needs review" : "All clear"}
        />
        <StatCard label="Live Matches" value={k?.liveMatches ?? 0} icon={<Swords className="h-4 w-4" />} accent="danger" />
        <StatCard label="Total Revenue" value={formatMoney(k?.totalRevenue ?? 0)} icon={<Coins className="h-4 w-4" />} accent="success" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Ongoing tournaments */}
        <div className="space-y-4">
          <SectionHeader
            title="Ongoing Tournaments"
            action={
              <Button variant="outline" size="sm" onClick={() => navigate("/admin/tournaments")}>
                Manage All <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            }
          />
          {(data?.ongoing ?? []).length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground text-sm">
                No tournaments are currently ongoing.
              </CardContent>
            </Card>
          ) : (
            (data!.ongoing).map((t) => (
              <Card key={t.id} className="card-hover cursor-pointer" onClick={() => navigate(`/admin/tournaments/${t.id}`)}>
                <CardContent className="p-5 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-display font-bold truncate">{t.name}</h3>
                      <TournamentStatusBadge status={t.status} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t.teams} teams · {t.matches} matches · {t.complaints} open complaints
                    </p>
                    {t.nextMatch && (
                      <p className="text-xs text-primary mt-1">
                        Next: Match #{String(t.nextMatch.matchNumber).padStart(2, "0")} · {t.nextMatch.map}
                      </p>
                    )}
                  </div>
                  <Button size="sm" variant="outline" className="shrink-0" onClick={(e) => { e.stopPropagation(); navigate(`/admin/tournaments/${t.id}`); }}>
                    Control Center <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Recent activity */}
        <div className="space-y-4">
          <SectionHeader
            title="Recent Activity"
            action={
              <Button variant="outline" size="sm" onClick={() => navigate("/admin/activity")}>
                Full Log <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            }
          />
          {(data?.recentActivity ?? []).length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground text-sm">
                No admin activity recorded yet.
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="divide-y divide-border/60 max-h-96 overflow-y-auto">
                  {data!.recentActivity.map((log) => (
                    <div key={log.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-secondary border border-border">
                        <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate">
                          <strong className="text-foreground">{log.userName}</strong>{" "}
                          <span className="text-muted-foreground">{log.action.toLowerCase()}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">{log.entity}</p>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">{timeAgo(log.createdAt)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
