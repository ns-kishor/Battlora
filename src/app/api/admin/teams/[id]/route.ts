import { db } from "@/lib/db";
import { requirePermission, ApiError } from "@/lib/auth";
import { logActivity, notify } from "@/lib/activity";
import { handleRouteError, ok, readJson, str } from "@/lib/route-helpers";
import { TEAM_STATUS_LABELS } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/admin/teams/[id] — verify / suspend / ban team
export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const user = await requirePermission("teams.manage");
    const body = await readJson<{ status?: string; note?: string }>(req);

    const team = await db.team.findUnique({
      where: { id },
      include: { captain: true },
    });
    if (!team) throw new ApiError("Team not found.", 404);

    const status = str(body.status);
    if (!["PENDING", "VERIFIED", "SUSPENDED", "BANNED"].includes(status))
      throw new ApiError("Invalid team status.", 400);

    const updated = await db.team.update({ where: { id }, data: { status } });

    if (status === "BANNED") {
      await db.registration.updateMany({
        where: { teamId: id },
        data: { status: "BANNED" },
      });
    }

    await logActivity({
      user,
      action: `Team ${TEAM_STATUS_LABELS[status as keyof typeof TEAM_STATUS_LABELS]?.toLowerCase() ?? status}`,
      entity: "Team",
      entityId: id,
      previousValue: { status: team.status },
      newValue: { status, team: team.name, note: str(body.note) || null },
    });

    if (status !== team.status) {
      await notify({
        userId: team.captainId,
        title: `Team ${status.toLowerCase()}`,
        message: `${team.name} has been marked as ${status.toLowerCase()}${
          str(body.note) ? ` — ${str(body.note)}` : ""
        }.`,
        type: "GENERAL",
        link: "#/dashboard",
      });
    }

    return ok({ team: updated });
  } catch (e) {
    return handleRouteError(e);
  }
}
