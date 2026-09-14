import { db } from "@/lib/db";
import { requireUser, ApiError } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import {
  handleRouteError,
  ok,
  readJson,
  str,
  validateDataUrlImage,
} from "@/lib/route-helpers";

// GET /api/me/team — captain's team + players + registrations
export async function GET() {
  try {
    const user = await requireUser();
    const team = await db.team.findUnique({
      where: { captainId: user.id },
      include: {
        players: { orderBy: [{ isSubstitute: "asc" }, { createdAt: "asc" }] },
        registrations: {
          include: {
            tournament: true,
            payment: true,
          },
          orderBy: { submittedAt: "desc" },
        },
      },
    });
    if (!team) return ok({ team: null });
    return ok({ team });
  } catch (e) {
    return handleRouteError(e);
  }
}

// PATCH /api/me/team — update team info (PRD 12)
export async function PATCH(req: Request) {
  try {
    const user = await requireUser();
    const team = await db.team.findUnique({ where: { captainId: user.id } });
    if (!team) throw new ApiError("You do not have a team yet.", 404);
    if (team.status === "BANNED") throw new ApiError("This team is banned.", 403);

    const body = await readJson<{
      name?: string;
      logoUrl?: string;
      contactNumber?: string;
      email?: string;
    }>(req);

    const data: Record<string, unknown> = {};
    if (body.name !== undefined) {
      const name = str(body.name);
      if (name.length < 3) throw new ApiError("Team name must be at least 3 characters.", 400);
      if (name !== team.name) {
        const clash = await db.team.findUnique({ where: { name } });
        if (clash) throw new ApiError("Team name already taken.", 409);
        data.name = name;
      }
    }
    if (body.logoUrl !== undefined) data.logoUrl = validateDataUrlImage(body.logoUrl);
    if (body.contactNumber !== undefined) data.contactNumber = str(body.contactNumber) || null;
    if (body.email !== undefined) data.email = str(body.email) || null;

    const updated = await db.team.update({ where: { id: team.id }, data });
    await logActivity({
      user,
      action: "Updated team information",
      entity: "Team",
      entityId: team.id,
      previousValue: { name: team.name },
      newValue: { name: updated.name },
    });
    return ok({ team: updated });
  } catch (e) {
    return handleRouteError(e);
  }
}
