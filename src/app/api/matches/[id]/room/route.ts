import { db } from "@/lib/db";
import { requirePermission, ApiError } from "@/lib/auth";
import { logActivity, notifyTournamentTeams } from "@/lib/activity";
import { handleRouteError, ok, readJson, str } from "@/lib/route-helpers";
import { formatTime } from "@/lib/format";

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/matches/[id]/room — publish room credentials (PRD 15)
export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const user = await requirePermission("matches.manage");
    const body = await readJson<{ roomReleaseAt?: string; releaseNow?: boolean }>(req);

    const match = await db.match.findUnique({
      where: { id },
      include: { tournament: { select: { id: true, name: true, resultsLocked: true } } },
    });
    if (!match) throw new ApiError("Match not found.", 404);
    if (match.tournament.resultsLocked)
      throw new ApiError("Final results are locked.", 403);

    let releaseAt: Date | null = match.roomReleaseAt;
    if (body.releaseNow) {
      releaseAt = new Date();
    } else if (body.roomReleaseAt !== undefined) {
      releaseAt = body.roomReleaseAt ? new Date(str(body.roomReleaseAt)) : null;
    }

    const updated = await db.match.update({
      where: { id },
      data: {
        roomPublished: true,
        roomReleaseAt: releaseAt,
        status: match.status === "SCHEDULED" ? "ROOM_OPEN" : match.status,
      },
    });

    await logActivity({
      user,
      action: "Published room credentials",
      entity: "Match",
      entityId: id,
      previousValue: { roomPublished: match.roomPublished },
      newValue: { roomPublished: true, roomReleaseAt: releaseAt },
    });

    await notifyTournamentTeams(
      match.tournamentId,
      `Room details — Match #${String(match.matchNumber).padStart(2, "0")}`,
      `Room credentials for Match #${String(match.matchNumber).padStart(2, "0")} (${match.map}) are now available${
        releaseAt ? ` from ${formatTime(releaseAt)}` : ""
      }. Open Room Details in your dashboard.`,
      "ROOM"
    );

    return ok({ match: updated });
  } catch (e) {
    return handleRouteError(e);
  }
}
