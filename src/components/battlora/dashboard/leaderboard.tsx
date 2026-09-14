"use client";

import { useApiData } from "../data-hooks";
import { useAuth } from "../auth-context";
import { LeaderboardTable, type LeaderboardRowData } from "../shared/leaderboard";
import { LoadingRows, SectionHeader, TournamentStatusBadge } from "../shared/kit";

type DashboardData = {
  team: { id: string } | null;
  activeTournamentId: string | null;
  standings: { tournament: { name: string; status: string; resultsLocked: boolean } } | null;
};

export function DashboardLeaderboard() {
  const { data: dash, loading: dashLoading } = useApiData<DashboardData>("/api/me/dashboard");
  const tid = dash?.activeTournamentId;

  const { data, loading } = useApiData<{
    tournament: { name: string; status: string; resultsLocked: boolean };
    leaderboard: LeaderboardRowData[];
  }>(tid ? `/api/tournaments/${tid}/leaderboard` : null, { refreshMs: 20_000 });

  if (dashLoading || loading) return <LoadingRows count={4} />;
  if (!tid || !data) {
    return (
      <div className="space-y-6">
        <SectionHeader title="Leaderboard" />
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground text-sm">
          Your leaderboard appears once your team is registered and results are published.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Leaderboard"
        subtitle={data.tournament.name}
        action={<TournamentStatusBadge status={data.tournament.status} />}
      />
      <LeaderboardTable rows={data.leaderboard} highlightTeamId={dash?.team?.id} live={data.tournament.status === "ONGOING"} />
    </div>
  );
}
