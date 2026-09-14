import { db } from "@/lib/db";
import { requirePermission, ApiError } from "@/lib/auth";
import { logActivity, notifyTournamentTeams } from "@/lib/activity";
import { computeMatchPoints, parseScoringConfig } from "@/lib/scoring";
import {
  handleRouteError,
  ok,
  readJson,
  num,
  str,
} from "@/lib/route-helpers";

type Ctx = { params: Promise<{ id: string }> };

type ResultInput = { teamId?: string; placement?: number; kills?: number };

// POST /api/matches/[id]/results — enter / save / publish results (PRD 17, 53)
export async function POST(req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const user = await requirePermission("results.manage");
    const body = await readJson<{
      action?: "save" | "publish";
      results?: ResultInput[];
    }>(req);

    const match = await db.match.findUnique({
      where: { id },
      include: { tournament: true },
    });
    if (!match) throw new ApiError("Match not found.", 404);

    if (match.tournament.resultsLocked && user.role !== "SUPER_ADMIN")
      throw new ApiError(
        "Final results are locked. Only a Super Admin can modify results now.",
        403
      );

    const action = body.action === "publish" ? "publish" : "save";
    const resultsInput = body.results ?? [];

    const config = parseScoringConfig(match.tournament.scoringConfig);

    // Only approved teams may receive results (PRD 52)
    const approvedTeams = await db.registration.findMany({
      where: { tournamentId: match.tournamentId, status: "APPROVED" },
      include: { team: true },
    });
    const approvedTeamIds = new Set(approvedTeams.map((r) => r.teamId));
    const teamNames = new Map(approvedTeams.map((r) => [r.teamId, r.team.name]));

    // Validate input
    const placements: number[] = [];
    for (const r of resultsInput) {
      const teamId = str(r.teamId);
      if (!approvedTeamIds.has(teamId))
        throw new ApiError(`Team is not approved for this tournament.`, 400);
      const placement = Math.round(num(r.placement, 0));
      const kills = Math.round(num(r.kills, 0));
      if (placement < 1 || placement > 100)
        throw new ApiError(`Invalid placement for ${teamNames.get(teamId) ?? "team"}.`, 400);
      if (kills < 0 || kills > 100)
        throw new ApiError(`Invalid kill count for ${teamNames.get(teamId) ?? "team"}.`, 400);
      placements.push(placement);
    }
    // Placement uniqueness (1st place exactly once etc.) — required for publish
    if (action === "publish") {
      const sorted = [...placements].sort((a, b) => a - b);
      for (let i = 0; i < sorted.length; i++) {
        if (i > 0 && sorted[i] === sorted[i - 1])
          throw new ApiError(`Duplicate placement detected: #${sorted[i]}. Each team needs a unique placement.`, 400);
      }
      if (resultsInput.length !== approvedTeamIds.size && approvedTeamIds.size > 0) {
        throw new ApiError(
          `Results must be entered for all ${approvedTeamIds.size} approved teams (${resultsInput.length} provided).`,
          400
        );
      }
    }

    const existing = await db.matchResult.findMany({ where: { matchId: id } });
    const existingByTeam = new Map(existing.map((r) => [r.teamId, r]));

    const savedRows: {
      teamId: string;
      placement: number;
      kills: number;
      placementPoints: number;
      killPoints: number;
      totalPoints: number;
    }[] = [];

    for (const r of resultsInput) {
      const teamId = str(r.teamId);
      const placement = Math.round(num(r.placement, 0));
      const kills = Math.round(num(r.kills, 0));
      const points = computeMatchPoints(config, placement, kills);

      const prev = existingByTeam.get(teamId);
      const isCorrection = !!prev?.published;

      const data = {
        placement,
        kills,
        placementPoints: points.placementPoints,
        killPoints: points.killPoints,
        totalPoints: points.totalPoints,
        published: action === "publish" ? true : prev?.published ?? false,
        enteredById: user.id,
        // Correction audit trail — snapshot previous values (PRD 53)
        previousValue:
          isCorrection && action === "publish"
            ? JSON.stringify({
                placement: prev.placement,
                kills: prev.kills,
                totalPoints: prev.totalPoints,
              })
            : prev?.previousValue ?? null,
        correctedAt: isCorrection && action === "publish" ? new Date() : prev?.correctedAt ?? null,
      };

      await db.matchResult.upsert({
        where: { matchId_teamId: { matchId: id, teamId } },
        create: { matchId: id, teamId, ...data },
        update: data,
      });

      savedRows.push({ teamId, placement, kills, ...points });
    }

    if (action === "publish") {
      // Remove stale rows not present in input (e.g., after corrections)
      const inputIds = new Set(resultsInput.map((r) => str(r.teamId)));
      const stale = existing.filter((r) => !inputIds.has(r.teamId));
      for (const s of stale) {
        await db.matchResult.delete({ where: { id: s.id } });
      }

      await db.match.update({
        where: { id },
        data: {
          resultPublished: true,
          publishedAt: new Date(),
          status: "COMPLETED",
        },
      });

      await logActivity({
        user,
        action: match.resultPublished ? "Corrected & republished match result" : "Published match result",
        entity: "Match",
        entityId: id,
        previousValue: match.resultPublished
          ? { results: existing.map((r) => ({ team: r.teamId, placement: r.placement, kills: r.kills, totalPoints: r.totalPoints })) }
          : undefined,
        newValue: {
          matchNumber: match.matchNumber,
          tournament: match.tournament.name,
          results: savedRows.map((r) => ({
            team: teamNames.get(r.teamId) ?? r.teamId,
            placement: r.placement,
            kills: r.kills,
            totalPoints: r.totalPoints,
          })),
        },
      });

      await notifyTournamentTeams(
        match.tournamentId,
        `Results published — Match #${String(match.matchNumber).padStart(2, "0")}`,
        `Results for Match #${String(match.matchNumber).padStart(2, "0")} (${match.map}) have been published. The leaderboard has been updated.`,
        "RESULT"
      );
    } else {
      await logActivity({
        user,
        action: "Saved result draft",
        entity: "Match",
        entityId: id,
        newValue: { matchNumber: match.matchNumber, teams: savedRows.length },
      });
    }

    const results = await db.matchResult.findMany({
      where: { matchId: id },
      include: { team: { select: { id: true, name: true, logoUrl: true } } },
    });

    return ok({ results, published: action === "publish", matchId: id });
  } catch (e) {
    return handleRouteError(e);
  }
}

// GET /api/matches/[id]/results — results view
export async function GET(_req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const results = await db.matchResult.findMany({
      where: { matchId: id },
      include: { team: { select: { id: true, name: true, logoUrl: true } } },
      orderBy: { totalPoints: "desc" },
    });
    const match = await db.match.findUnique({
      where: { id },
      include: { tournament: { select: { scoringConfig: true } } },
    });
    return ok({
      results,
      match: match
        ? {
            id: match.id,
            matchNumber: match.matchNumber,
            resultPublished: match.resultPublished,
            scoringConfig: JSON.parse(match.tournament.scoringConfig),
          }
        : null,
    });
  } catch (e) {
    return handleRouteError(e);
  }
}
