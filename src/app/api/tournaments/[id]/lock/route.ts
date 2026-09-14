import { db } from "@/lib/db";
import { requirePermission, ApiError } from "@/lib/auth";
import { logActivity, notifyTournamentTeams } from "@/lib/activity";
import { getTournamentLeaderboard } from "@/lib/scoring";
import { handleRouteError, ok } from "@/lib/route-helpers";

type Ctx = { params: Promise<{ id: string }> };

// POST /api/tournaments/[id]/lock — lock final results (PRD 54)
export async function POST(_req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const user = await requirePermission("tournaments.manage");

    const tournament = await db.tournament.findFirst({
      where: { OR: [{ id }, { slug: id }] },
    });
    if (!tournament) throw new ApiError("Tournament not found.", 404);
    if (tournament.resultsLocked)
      throw new ApiError("Final results are already locked.", 409);

    const leaderboard = await getTournamentLeaderboard(tournament.id);
    const champion = leaderboard.find((r) => r.rank === 1);
    const runnerUp = leaderboard.find((r) => r.rank === 2);
    const third = leaderboard.find((r) => r.rank === 3);
    const topKiller = [...leaderboard].sort((a, b) => b.kills - a.kills)[0];

    // Assign prize winners from final standings
    const prizes = await db.prize.findMany({ where: { tournamentId: tournament.id } });
    for (const prize of prizes) {
      let winnerTeamId: string | null = null;
      const name = prize.name.toLowerCase();
      if (name.includes("1st") || name.includes("champion")) winnerTeamId = champion?.teamId ?? null;
      else if (name.includes("2nd") || name.includes("runner")) winnerTeamId = runnerUp?.teamId ?? null;
      else if (name.includes("3rd")) winnerTeamId = third?.teamId ?? null;
      else if (name.includes("kill")) winnerTeamId = topKiller?.teamId ?? null;
      else if (name.includes("mvp")) winnerTeamId = champion?.teamId ?? null;
      if (winnerTeamId && prize.winnerTeamId !== winnerTeamId) {
        await db.prize.update({
          where: { id: prize.id },
          data: { winnerTeamId },
        });
      }
    }

    const updated = await db.tournament.update({
      where: { id: tournament.id },
      data: { resultsLocked: true, lockedAt: new Date(), status: "COMPLETED" },
    });

    await logActivity({
      user,
      action: "Locked final results",
      entity: "Tournament",
      entityId: tournament.id,
      previousValue: { resultsLocked: false },
      newValue: { resultsLocked: true, champion: champion?.teamName ?? "—" },
    });

    await notifyTournamentTeams(
      tournament.id,
      "Final results locked",
      `Final standings for ${tournament.name} are now official. Champion: ${champion?.teamName ?? "—"}. Thank you for competing!`,
      "RESULT"
    );

    return ok({ tournament: updated, champion: champion ?? null });
  } catch (e) {
    return handleRouteError(e);
  }
}
