import { db } from "@/lib/db";
import { requirePermission, ApiError } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import {
  handleRouteError,
  ok,
  readJson,
  str,
} from "@/lib/route-helpers";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/matches/[id] — match detail with results
export async function GET(_req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const match = await db.match.findUnique({
      where: { id },
      include: {
        tournament: { select: { id: true, name: true, status: true, resultsLocked: true } },
        results: { include: { team: { select: { id: true, name: true, logoUrl: true } } } },
      },
    });
    if (!match) throw new ApiError("Match not found.", 404);
    return ok({ match });
  } catch (e) {
    return handleRouteError(e);
  }
}

// PATCH /api/matches/[id] — update status / schedule / room timing
export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const user = await requirePermission("matches.manage");
    const body = await readJson<Record<string, unknown>>(req);

    const match = await db.match.findUnique({
      where: { id },
      include: { tournament: { select: { name: true, resultsLocked: true } } },
    });
    if (!match) throw new ApiError("Match not found.", 404);
    if (match.tournament.resultsLocked && user.role !== "SUPER_ADMIN")
      throw new ApiError("Final results are locked.", 403);

    const data: Record<string, unknown> = {};
    const validStatuses = ["SCHEDULED", "ROOM_OPEN", "LIVE", "COMPLETED", "CANCELLED", "POSTPONED"];
    if (body.status !== undefined) {
      const status = str(body.status);
      if (!validStatuses.includes(status)) throw new ApiError("Invalid match status.", 400);
      data.status = status;
    }
    if (body.date !== undefined) data.date = new Date(str(body.date));
    if (body.map !== undefined) data.map = str(body.map);
    if (body.mode !== undefined) data.mode = str(body.mode);
    if (body.roomId !== undefined) data.roomId = str(body.roomId);
    if (body.roomPassword !== undefined) data.roomPassword = str(body.roomPassword);
    if (body.roomReleaseAt !== undefined)
      data.roomReleaseAt = body.roomReleaseAt ? new Date(str(body.roomReleaseAt)) : null;

    const previous = {
      status: match.status,
      date: match.date,
      roomReleaseAt: match.roomReleaseAt,
    };
    const updated = await db.match.update({ where: { id }, data });

    await logActivity({
      user,
      action: "Updated match",
      entity: "Match",
      entityId: id,
      previousValue: previous,
      newValue: {
        status: updated.status,
        date: updated.date,
        roomReleaseAt: updated.roomReleaseAt,
      },
    });

    return ok({ match: updated });
  } catch (e) {
    return handleRouteError(e);
  }
}

// DELETE /api/matches/[id] — cancel/delete match (destructive)
export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const user = await requirePermission("matches.manage");
    const match = await db.match.findUnique({ where: { id } });
    if (!match) throw new ApiError("Match not found.", 404);
    if (match.resultPublished)
      throw new ApiError("Published matches cannot be deleted — cancel instead.", 409);

    await db.match.delete({ where: { id } });
    await logActivity({
      user,
      action: "Deleted match",
      entity: "Match",
      entityId: id,
      previousValue: { matchNumber: match.matchNumber, tournamentId: match.tournamentId },
    });
    return ok({ success: true });
  } catch (e) {
    return handleRouteError(e);
  }
}
