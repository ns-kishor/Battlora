"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarDays, Coins, ExternalLink, Swords, Trophy } from "lucide-react";
import { useRouter } from "../router";
import { useApiData } from "../data-hooks";
import { useAuth } from "../auth-context";
import { LeaderboardTable, type LeaderboardRowData } from "../shared/leaderboard";
import { EmptyState, LoadingRows, SectionHeader, TournamentStatusBadge } from "../shared/kit";
import { formatDate, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

// Tournaments that can have published standings (matches played / finished)
const STANDINGS_STATUSES = ["ONGOING", "COMPLETED"];

type StandingsTournament = {
  id: string;
  slug: string;
  name: string;
  status: string;
  game: string;
  mode: string;
  format?: string | null;
  prizePool: number;
  matchCount?: number;
  tournamentStart?: string | null;
  tournamentEnd?: string | null;
};

type LeaderboardResponse = {
  tournament: { id: string; name: string; status: string; resultsLocked: boolean };
  leaderboard: LeaderboardRowData[];
};

export function Leaderboards() {
  const { route, navigate } = useRouter();
  const { team } = useAuth();

  const { data, loading } = useApiData<{ tournaments: StandingsTournament[] }>("/api/tournaments");

  // Only tournaments that are actually being played / finished have standings
  const standingsTournaments = useMemo(() => {
    const list = (data?.tournaments ?? []).filter((t) => STANDINGS_STATUSES.includes(t.status));
    return [...list].sort((a, b) => {
      // Live tournaments first, then most recently finished
      if (a.status !== b.status) return a.status === "ONGOING" ? -1 : 1;
      const aEnd = a.tournamentEnd ? Date.parse(a.tournamentEnd) : 0;
      const bEnd = b.tournamentEnd ? Date.parse(b.tournamentEnd) : 0;
      return bEnd - aEnd;
    });
  }, [data]);

  // Deep link support: #/leaderboards?t=<slug|id>
  const requested = route.query?.get("t");
  const selected =
    standingsTournaments.find((t) => t.slug === requested || t.id === requested) ??
    standingsTournaments[0] ??
    null;

  const isLive = selected?.status === "ONGOING";
  const { data: board, loading: boardLoading } = useApiData<LeaderboardResponse>(
    selected ? `/api/tournaments/${selected.id}/leaderboard` : null,
    { refreshMs: isLive ? 20_000 : undefined }
  );

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10 sm:py-14">
        <SectionHeader title="Leaderboards" subtitle="Live and final standings across every Battlora tournament." />
        <div className="mt-8">
          <LoadingRows count={5} />
        </div>
      </div>
    );
  }

  if (standingsTournaments.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10 sm:py-14">
        <SectionHeader title="Leaderboards" subtitle="Live and final standings across every Battlora tournament." />
        <div className="mt-8">
          <EmptyState
            icon={<Trophy className="h-10 w-10" />}
            title="No standings yet"
            description="Leaderboards go live once a tournament starts and the first match results are published. Check back soon."
            action={
              <Button variant="outline" onClick={() => navigate("/tournaments")}>
                <Swords className="h-4 w-4" /> Browse Tournaments
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10 sm:py-14">
      <SectionHeader
        title="Leaderboards"
        subtitle="Live and final standings across every Battlora tournament."
      />

      {/* Tournament selector */}
      <div
        className="mt-6 flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-4 px-4 sm:mx-0 sm:px-0"
        role="tablist"
        aria-label="Tournament leaderboards"
      >
        {standingsTournaments.map((t) => {
          const active = selected?.id === t.id;
          return (
            <Button
              key={t.id}
              variant={active ? "default" : "outline"}
              size="sm"
              className={cn(
                "rounded-full whitespace-nowrap shrink-0 gap-2",
                active && "btn-primary-glow"
              )}
              onClick={() => navigate(`/leaderboards?t=${t.slug ?? t.id}`)}
              role="tab"
              aria-selected={active}
            >
              {t.status === "ONGOING" && (
                <span className="live-dot inline-block h-1.5 w-1.5 rounded-full bg-rose-400" />
              )}
              {t.name}
            </Button>
          );
        })}
      </div>

      {/* Selected tournament meta */}
      {selected && (
        <Card className="mt-6 overflow-hidden">
          <CardContent className="p-4 sm:p-5 flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0 space-y-2">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="font-display font-bold text-lg truncate">{selected.name}</h3>
                <TournamentStatusBadge status={selected.status} />
                {board?.tournament.resultsLocked && (
                  <span className="rounded-full border border-border bg-secondary px-2.5 py-0.5 text-xs text-muted-foreground">
                    Final results locked
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs sm:text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Coins className="h-3.5 w-3.5 text-primary" />
                  Prize pool {formatMoney(selected.prizePool)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Trophy className="h-3.5 w-3.5 text-primary" />
                  {selected.game} · {selected.mode}
                </span>
                {selected.matchCount ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Swords className="h-3.5 w-3.5 text-primary" />
                    {selected.matchCount} matches
                  </span>
                ) : null}
                {selected.tournamentStart && (
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5 text-primary" />
                    {formatDate(selected.tournamentStart)}
                  </span>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={() => navigate(`/tournaments/${selected.slug ?? selected.id}`)}
            >
              <ExternalLink className="h-4 w-4" /> View Tournament
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Standings */}
      <div className="mt-6">
        {boardLoading && !board ? (
          <LoadingRows count={6} />
        ) : (
          <LeaderboardTable
            rows={board?.leaderboard ?? []}
            highlightTeamId={team?.id ?? null}
            live={isLive}
          />
        )}
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        {isLive
          ? "Standings update automatically every 20 seconds as match results are published."
          : "Final official standings — results are locked and prizes have been assigned."}
        {team && " Your team is highlighted."}
      </p>
    </div>
  );
}
