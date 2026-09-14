import { db } from "@/lib/db";
import { requirePermission, ApiError } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { handleRouteError, ok, readJson, str, num } from "@/lib/route-helpers";
import { MAPS } from "@/lib/types";

// GET /api/matches — admin match list (filterable by tournament)
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const tournamentId = url.searchParams.get("tournamentId");
    const where = tournamentId ? { tournamentId } : {};
    const matches = await db.match.findMany({
      where,
      include: {
        tournament: { select: { id: true, name: true, slug: true, status: true } },
        results: { include: { team: { select: { id: true, name: true, logoUrl: true } } } },
      },
      orderBy: [{ tournamentId: "asc" }, { matchNumber: "asc" }],
      take: 300,
    });
    return ok({ matches });
  } catch (e) {
    return handleRouteError(e);
  }
}

// POST /api/matches — create match (admin)
export async function POST(req: Request) {
  try {
    const user = await requirePermission("matches.manage");
    const body = await readJson<Record<string, unknown>>(req);

    const tournamentId = str(body.tournamentId);
    const tournament = await db.tournament.findUnique({ where: { id: tournamentId } });
    if (!tournament) throw new ApiError("Tournament not found.", 404);
    if (tournament.resultsLocked)
      throw new ApiError("Cannot add matches — final results are locked.", 409);

    const dateStr = str(body.date);
    if (!dateStr) throw new ApiError("Match date is required.", 400);
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) throw new ApiError("Invalid match date.", 400);

    const map = str(body.map);
    const mode = str(body.mode) || tournament.mode;

    // Auto match number
    const last = await db.match.findFirst({
      where: { tournamentId },
      orderBy: { matchNumber: "desc" },
    });
    const matchNumber = Math.round(num(body.matchNumber, (last?.matchNumber ?? 0) + 1));

    const roomId = str(body.roomId);
    const roomPassword = str(body.roomPassword);
    if (!roomId) throw new ApiError("Room ID is required.", 400);
    if (!roomPassword) throw new ApiError("Room password is required.", 400);

    const roomReleaseAtStr = str(body.roomReleaseAt);
    const roomReleaseAt = roomReleaseAtStr ? new Date(roomReleaseAtStr) : null;

    const match = await db.match.create({
      data: {
        tournamentId,
        matchNumber,
        date,
        map: MAPS.includes(map as never) ? map : "Bermuda",
        mode,
        roomId,
        roomPassword,
        roomReleaseAt,
        status: "SCHEDULED",
      },
    });

    await logActivity({
      user,
      action: "Created match",
      entity: "Match",
      entityId: match.id,
      newValue: { matchNumber, tournament: tournament.name, map: match.map, date },
    });

    return ok({ match }, 201);
  } catch (e) {
    return handleRouteError(e);
  }
}
