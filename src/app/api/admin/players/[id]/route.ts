import { db } from "@/lib/db";
import { requirePermission, ApiError } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { handleRouteError, ok, readJson, str } from "@/lib/route-helpers";

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/admin/players/[id] — verify / suspend / ban player (PRD 13)
export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const user = await requirePermission("players.manage");
    const body = await readJson<{ status?: string }>(req);

    const player = await db.player.findUnique({
      where: { id },
      include: { team: true },
    });
    if (!player) throw new ApiError("Player not found.", 404);

    const status = str(body.status);
    if (!["PENDING", "VERIFIED", "SUSPENDED", "BANNED"].includes(status))
      throw new ApiError("Invalid player status.", 400);

    const updated = await db.player.update({ where: { id }, data: { status } });

    await logActivity({
      user,
      action: `Player ${status.toLowerCase()}`,
      entity: "Player",
      entityId: id,
      previousValue: { status: player.status },
      newValue: { status, ign: player.ign, uid: player.uid, team: player.team.name },
    });

    return ok({ player: updated });
  } catch (e) {
    return handleRouteError(e);
  }
}
