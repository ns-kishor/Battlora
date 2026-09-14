import { db } from "@/lib/db";
import { ApiError } from "@/lib/auth";
import { getTournamentLeaderboard } from "@/lib/scoring";
import { handleRouteError, ok } from "@/lib/route-helpers";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/tournaments/[id]/leaderboard — live computed standings
export async function GET(_req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const tournament = await db.tournament.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      select: { id: true, name: true, status: true, resultsLocked: true, tieBreakConfig: true },
    });
    if (!tournament) throw new ApiError("Tournament not found.", 404);

    const leaderboard = await getTournamentLeaderboard(tournament.id);
    return ok({
      leaderboard,
      tournament: {
        id: tournament.id,
        name: tournament.name,
        status: tournament.status,
        resultsLocked: tournament.resultsLocked,
      },
    });
  } catch (e) {
    return handleRouteError(e);
  }
}
