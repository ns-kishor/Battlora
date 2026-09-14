"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Skull, Swords, Target, Trophy } from "lucide-react";
import { useApiData } from "../data-hooks";
import { EmptyState, LoadingRows, MatchStatusBadge, SectionHeader, StatCard } from "../shared/kit";
import { formatDate, ordinal } from "@/lib/format";
import { cn } from "@/lib/utils";

type DashboardData = {
  standings: {
    tournament: { name: string };
    myRow: { rank: number; totalPoints: number; kills: number; booyah: number; matchesPlayed: number; bestPlacement: number | null } | null;
  } | null;
  matches: {
    id: string;
    matchNumber: number;
    date: string;
    map: string;
    status: string;
    resultPublished: boolean;
    myPlacement: number | null;
    myKills: number | null;
    myPoints: number | null;
  }[];
};

export function MyResults() {
  const { data, loading } = useApiData<DashboardData>("/api/me/dashboard");

  if (loading) return <LoadingRows count={3} />;

  const results = (data?.matches ?? []).filter((m) => m.resultPublished && m.myPlacement !== null);
  const row = data?.standings?.myRow;

  if (results.length === 0) {
    return (
      <div className="space-y-6">
        <SectionHeader title="My Results" subtitle="Published match results for your team" />
        <EmptyState
          icon={<Swords className="h-10 w-10" />}
          title="No results yet"
          description="Match schedule has not been published yet or results are still being entered."
        />
      </div>
    );
  }

  const totalKills = results.reduce((s, m) => s + (m.myKills ?? 0), 0);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="My Results"
        subtitle={data?.standings?.tournament.name ?? "Your tournament results"}
      />

      {row && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard label="Rank" value={`#${row.rank}`} icon={<Trophy className="h-4 w-4" />} />
          <StatCard label="Total Points" value={row.totalPoints} icon={<Target className="h-4 w-4" />} accent="success" />
          <StatCard label="Total Kills" value={totalKills} icon={<Skull className="h-4 w-4" />} accent="danger" />
          <StatCard label="Booyah" value={row.booyah} icon={<Trophy className="h-4 w-4" />} accent="warning" />
        </div>
      )}

      <div className="space-y-3">
        {[...results].reverse().map((m) => (
          <Card key={m.id} className="card-hover">
            <CardContent className="p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display font-bold">
                    Match #{String(m.matchNumber).padStart(2, "0")} · {m.map}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDate(m.date)}</p>
                </div>
                <div className="flex items-center gap-5 text-center">
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground tracking-wide">Placement</p>
                    <p className={cn("font-display text-lg font-bold", m.myPlacement === 1 && "text-amber-400")}>
                      {m.myPlacement ? ordinal(m.myPlacement) : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground tracking-wide">Kills</p>
                    <p className="font-display text-lg font-bold text-rose-400">{m.myKills}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground tracking-wide">Points</p>
                    <p className="font-display text-xl font-bold text-primary">{m.myPoints}</p>
                  </div>
                  <MatchStatusBadge status={m.status} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
