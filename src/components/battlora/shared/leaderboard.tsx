"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Crown, Skull, Trophy, Ban } from "lucide-react";
import { RankBadge, TeamLogo, EmptyState } from "./kit";
import { cn } from "@/lib/utils";

export type LeaderboardRowData = {
  rank: number;
  teamId: string;
  teamName: string;
  teamLogo: string | null;
  matchesPlayed: number;
  booyah: number;
  kills: number;
  totalPoints: number;
  bestPlacement: number | null;
  disqualified: boolean;
  pointDeduction: number;
};

type ViewMode = "overall" | "kills" | "booyah";

function sortRows(rows: LeaderboardRowData[], mode: ViewMode): LeaderboardRowData[] {
  const copy = [...rows];
  if (mode === "kills") copy.sort((a, b) => b.kills - a.kills || b.totalPoints - a.totalPoints);
  if (mode === "booyah") copy.sort((a, b) => b.booyah - a.booyah || b.totalPoints - a.totalPoints);
  return copy;
}

export function LeaderboardTable({
  rows,
  highlightTeamId,
  live,
  compact,
}: {
  rows: LeaderboardRowData[];
  highlightTeamId?: string | null;
  live?: boolean;
  compact?: boolean;
}) {
  const [mode, setMode] = useState<ViewMode>("overall");
  const sorted = sortRows(rows, mode);

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<Trophy className="h-10 w-10" />}
        title="Leaderboard not live yet"
        description="Standings appear here as soon as the first match results are published."
      />
    );
  }

  const modes: { value: ViewMode; label: string; icon: typeof Trophy }[] = [
    { value: "overall", label: "Overall", icon: Trophy },
    { value: "kills", label: "Kills", icon: Skull },
    { value: "booyah", label: "Booyah", icon: Crown },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          {live && (
            <span className="flex items-center gap-1.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-bold px-2.5 py-1">
              <span className="live-dot inline-block h-1.5 w-1.5 rounded-full bg-rose-500" />
              LIVE
            </span>
          )}
          <p className="text-xs text-muted-foreground">
            {mode === "overall" ? "Official standings" : mode === "kills" ? "Kill ranking" : "Booyah ranking"}
          </p>
        </div>
        <div className="flex gap-1 rounded-lg border border-border bg-card p-1">
          {modes.map((m) => (
            <Button
              key={m.value}
              size="sm"
              variant={mode === m.value ? "default" : "ghost"}
              className={cn("h-7 text-xs px-2.5", mode !== m.value && "text-muted-foreground")}
              onClick={() => setMode(m.value)}
            >
              <m.icon className="h-3 w-3" /> {m.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Desktop table (PRD 21) */}
      <Card className="hidden md:block overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-16 text-center">Rank</TableHead>
              <TableHead>Team</TableHead>
              <TableHead className="text-center">
                <span className="inline-flex items-center gap-1 justify-center">
                  <Crown className="h-3.5 w-3.5 text-amber-400" /> Booyah
                </span>
              </TableHead>
              <TableHead className="text-center">
                <span className="inline-flex items-center gap-1 justify-center">
                  <Skull className="h-3.5 w-3.5 text-rose-400" /> Kills
                </span>
              </TableHead>
              {!compact && <TableHead className="text-center">Best</TableHead>}
              <TableHead className="text-center">Matches</TableHead>
              <TableHead className="text-right">
                <span className="inline-flex items-center gap-1">
                  <Trophy className="h-3.5 w-3.5 text-primary" /> Total
                </span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((row) => {
              const highlighted = highlightTeamId === row.teamId;
              return (
                <TableRow
                  key={row.teamId}
                  className={cn(
                    highlighted && "bg-primary/10",
                    row.disqualified && "opacity-50"
                  )}
                >
                  <TableCell className="text-center">
                    <div className="flex justify-center">
                      <RankBadge rank={row.rank} />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3 min-w-0">
                      <TeamLogo name={row.teamName} logoUrl={row.teamLogo} size={32} />
                      <span className="font-medium truncate">{row.teamName}</span>
                      {row.disqualified && (
                        <span className="inline-flex items-center gap-1 text-xs text-rose-400">
                          <Ban className="h-3 w-3" /> DQ
                        </span>
                      )}
                      {row.pointDeduction > 0 && (
                        <span className="text-xs text-amber-400">
                          (−{row.pointDeduction} pts penalty)
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-display font-bold">{row.booyah}</TableCell>
                  <TableCell className="text-center font-display font-bold">{row.kills}</TableCell>
                  {!compact && (
                    <TableCell className="text-center text-muted-foreground">
                      {row.bestPlacement ? `#${row.bestPlacement}` : "—"}
                    </TableCell>
                  )}
                  <TableCell className="text-center text-muted-foreground">{row.matchesPlayed}</TableCell>
                  <TableCell className="text-right font-display text-lg font-bold text-primary">
                    {row.totalPoints}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      {/* Mobile compact cards (PRD 21) */}
      <div className="md:hidden space-y-2">
        {sorted.map((row) => {
          const highlighted = highlightTeamId === row.teamId;
          return (
            <Card key={row.teamId} className={cn(highlighted && "border-primary/40 bg-primary/5")}>
              <CardContent className="p-3 flex items-center gap-3">
                <RankBadge rank={row.rank} />
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <TeamLogo name={row.teamName} logoUrl={row.teamLogo} size={36} />
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate flex items-center gap-1.5">
                      {row.teamName}
                      {row.disqualified && <Ban className="h-3 w-3 text-rose-400" />}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {row.matchesPlayed} played
                      {row.pointDeduction > 0 && ` · −${row.pointDeduction} pts`}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-display font-bold text-primary">{row.totalPoints}</p>
                  <p className="text-xs text-muted-foreground">
                    {row.kills}k · {row.booyah}🏆
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
