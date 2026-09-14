import { db } from "@/lib/db";
import {
  DEFAULT_SCORING,
  type ScoringConfig,
  type TieBreakKey,
} from "@/lib/types";

// ============================================================
// BATTLEORA SCORING ENGINE (PRD sections 17–21)
// Placement Points + Kill Points = Total Match Points
// Automatic leaderboard, tie-breaks, penalties
// ============================================================

export function parseScoringConfig(json: string): ScoringConfig {
  try {
    const parsed = JSON.parse(json) as ScoringConfig;
    if (parsed && typeof parsed === "object" && parsed.placementPoints) {
      return { ...DEFAULT_SCORING, ...parsed };
    }
  } catch {
    /* fall through to default */
  }
  return DEFAULT_SCORING;
}

export function parseTieBreaks(json: string): TieBreakKey[] {
  try {
    const parsed = JSON.parse(json);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed as TieBreakKey[];
  } catch {
    /* ignore */
  }
  return ["TOTAL_POINTS", "FIRST_PLACES", "TOTAL_KILLS", "BEST_PLACEMENT", "LATEST_MATCH"];
}

export function placementPointsFor(config: ScoringConfig, placement: number): number {
  if (placement <= 0) return 0;
  const direct = config.placementPoints[String(placement)];
  if (typeof direct === "number") return direct;
  return config.placementPoints["default"] ?? 0;
}

export function computeMatchPoints(
  config: ScoringConfig,
  placement: number,
  kills: number
): { placementPoints: number; killPoints: number; totalPoints: number } {
  const placementPoints = placementPointsFor(config, placement);
  const killPoints = Math.max(0, kills) * config.killPoint;
  return {
    placementPoints,
    killPoints,
    totalPoints: placementPoints + killPoints,
  };
}

export type LeaderboardRow = {
  rank: number;
  teamId: string;
  teamName: string;
  teamLogo: string | null;
  matchesPlayed: number;
  booyah: number;
  kills: number;
  totalPoints: number;
  pointDeduction: number;
  killDeduction: number;
  bestPlacement: number | null;
  avgPlacement: number | null;
  disqualified: boolean;
  banned: boolean;
  placementBreakdown: number[]; // placements by match number order
  matchPoints: number[]; // points by match number order
};

type LeaderboardInput = {
  teams: { id: string; name: string; logoUrl: string | null; status: string }[];
  results: {
    teamId: string;
    placement: number;
    kills: number;
    totalPoints: number;
    matchNumber: number;
  }[];
  penalties: {
    teamId: string | null;
    type: string;
    value: number;
    active: boolean;
  }[];
  tieBreaks: TieBreakKey[];
};

/**
 * Computes the official leaderboard standings from published match results.
 * Only published results are counted (PRD 52). Active penalties apply
 * point/kill deductions and disqualifications (PRD 25).
 */
export function computeLeaderboard(input: LeaderboardInput): LeaderboardRow[] {
  const byTeam = new Map<
    string,
    {
      team: { id: string; name: string; logoUrl: string | null; status: string };
      matchesPlayed: number;
      booyah: number;
      kills: number;
      totalPoints: number;
      bestPlacement: number | null;
      placementSum: number;
      placementBreakdown: number[];
      matchPoints: number[];
      pointDeduction: number;
      killDeduction: number;
      disqualified: boolean;
      banned: boolean;
    }
  >();

  for (const team of input.teams) {
    byTeam.set(team.id, {
      team,
      matchesPlayed: 0,
      booyah: 0,
      kills: 0,
      totalPoints: 0,
      bestPlacement: null,
      placementSum: 0,
      placementBreakdown: [],
      matchPoints: [],
      pointDeduction: 0,
      killDeduction: 0,
      disqualified: false,
      banned: false,
    });
  }

  for (const r of input.results) {
    const row = byTeam.get(r.teamId);
    if (!row) continue;
    row.matchesPlayed += 1;
    if (r.placement === 1) row.booyah += 1;
    row.kills += r.kills;
    row.totalPoints += r.totalPoints;
    row.placementSum += r.placement;
    if (row.bestPlacement === null || r.placement < row.bestPlacement) {
      row.bestPlacement = r.placement;
    }
    row.placementBreakdown.push(r.placement);
    row.matchPoints.push(r.totalPoints);
  }

  for (const p of input.penalties) {
    if (!p.active || !p.teamId) continue;
    const row = byTeam.get(p.teamId);
    if (!row) continue;
    if (p.type === "POINT_DEDUCTION") {
      row.pointDeduction += p.value;
    } else if (p.type === "KILL_DEDUCTION") {
      row.killDeduction += p.value;
    } else if (p.type === "DISQUALIFICATION") {
      row.disqualified = true;
    } else if (p.type === "TOURNAMENT_BAN") {
      row.banned = true;
    }
  }

  const rows: LeaderboardRow[] = [];
  for (const row of byTeam.values()) {
    const finalPoints = row.totalPoints - row.pointDeduction;
    const finalKills = row.kills - row.killDeduction;
    rows.push({
      rank: 0,
      teamId: row.team.id,
      teamName: row.team.name,
      teamLogo: row.team.logoUrl,
      matchesPlayed: row.matchesPlayed,
      booyah: row.booyah,
      kills: Math.max(0, finalKills),
      totalPoints: finalPoints,
      pointDeduction: row.pointDeduction,
      killDeduction: row.killDeduction,
      bestPlacement: row.bestPlacement,
      avgPlacement:
        row.matchesPlayed > 0
          ? Math.round((row.placementSum / row.matchesPlayed) * 10) / 10
          : null,
      disqualified: row.disqualified || row.banned || row.team.status === "BANNED",
      banned: row.banned,
      placementBreakdown: row.placementBreakdown,
      matchPoints: row.matchPoints,
    });
  }

  // Apply tie-break chain (PRD section 20)
  const comparators: Record<TieBreakKey, (a: LeaderboardRow, b: LeaderboardRow) => number> = {
    TOTAL_POINTS: (a, b) => b.totalPoints - a.totalPoints,
    FIRST_PLACES: (a, b) => b.booyah - a.booyah,
    TOTAL_KILLS: (a, b) => b.kills - a.kills,
    BEST_PLACEMENT: (a, b) => {
      const av = a.bestPlacement ?? 999;
      const bv = b.bestPlacement ?? 999;
      return av - bv;
    },
    LATEST_MATCH: (a, b) => {
      const av = a.matchPoints.length ? a.matchPoints[a.matchPoints.length - 1] : -1;
      const bv = b.matchPoints.length ? b.matchPoints[b.matchPoints.length - 1] : -1;
      return bv - av;
    },
  };

  rows.sort((a, b) => {
    // Non-disqualified teams always rank above disqualified ones
    if (a.disqualified !== b.disqualified) return a.disqualified ? 1 : -1;
    for (const key of input.tieBreaks) {
      const cmp = comparators[key]?.(a, b);
      if (cmp) return cmp;
    }
    return a.teamName.localeCompare(b.teamName);
  });

  rows.forEach((row, i) => (row.rank = i + 1));
  return rows;
}

/** Loads and computes the leaderboard for a tournament from the database. */
export async function getTournamentLeaderboard(tournamentId: string) {
  const tournament = await db.tournament.findUnique({
    where: { id: tournamentId },
  });
  if (!tournament) throw new Error("Tournament not found");

  const [registrations, resultsRaw, penalties] = await Promise.all([
    db.registration.findMany({
      where: { tournamentId, status: "APPROVED" },
      include: { team: true },
    }),
    db.matchResult.findMany({
      where: { matchId: { not: undefined }, published: true, match: { tournamentId } },
      include: { match: { select: { matchNumber: true } } },
    }),
    db.penalty.findMany({
      where: { tournamentId, active: true },
    }),
  ]);

  const teams = registrations.map((r) => ({
    id: r.team.id,
    name: r.team.name,
    logoUrl: r.team.logoUrl,
    status: r.team.status,
  }));

  const results = resultsRaw.map((r) => ({
    teamId: r.teamId,
    placement: r.placement,
    kills: r.kills,
    totalPoints: r.totalPoints,
    matchNumber: r.match.matchNumber,
  }));

  return computeLeaderboard({
    teams,
    results,
    penalties: penalties.map((p) => ({
      teamId: p.teamId,
      type: p.type,
      value: p.value,
      active: p.active,
    })),
    tieBreaks: parseTieBreaks(tournament.tieBreakConfig),
  });
}
