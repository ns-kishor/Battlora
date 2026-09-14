import { db } from "@/lib/db";
import { requirePermission, ApiError } from "@/lib/auth";
import { logActivity, notify } from "@/lib/activity";
import { handleRouteError, ok, readJson, str, num } from "@/lib/route-helpers";
import { PENALTY_TYPES, PENALTY_TYPE_LABELS } from "@/lib/types";

// GET /api/penalties — penalty list (staff)
export async function GET(req: Request) {
  try {
    await requirePermission("complaints.view");
    const url = new URL(req.url);
    const tournamentId = url.searchParams.get("tournamentId");
    const where = tournamentId ? { tournamentId } : {};
    const penalties = await db.penalty.findMany({
      where,
      include: {
        team: { select: { id: true, name: true, logoUrl: true } },
        tournament: { select: { id: true, name: true } },
        issuer: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return ok({ penalties });
  } catch (e) {
    return handleRouteError(e);
  }
}

// POST /api/penalties — apply penalty (admin, PRD 25–26)
export async function POST(req: Request) {
  try {
    const user = await requirePermission("penalties.manage");
    const body = await readJson<{
      tournamentId?: string;
      matchId?: string;
      teamId?: string;
      playerId?: string;
      type?: string;
      value?: number;
      reason?: string;
    }>(req);

    const type = str(body.type);
    if (!PENALTY_TYPES.some((t) => t.value === type))
      throw new ApiError("Invalid penalty type.", 400);

    const reason = str(body.reason);
    if (reason.length < 10)
      throw new ApiError("A clear reason (min 10 characters) is required.", 400);

    const tournament = await db.tournament.findUnique({
      where: { id: str(body.tournamentId) },
    });
    if (!tournament) throw new ApiError("Tournament not found.", 404);

    const teamId = str(body.teamId);
    const team = await db.team.findUnique({ where: { id: teamId } });
    if (!team) throw new ApiError("Team not found.", 404);

    const needsValue = type === "POINT_DEDUCTION" || type === "KILL_DEDUCTION" || type === "PRIZE_DEDUCTION";
    const value = Math.round(num(body.value, 0));
    if (needsValue && value <= 0)
      throw new ApiError(`A value greater than 0 is required for ${PENALTY_TYPE_LABELS[type as keyof typeof PENALTY_TYPE_LABELS]}.`, 400);

    const penalty = await db.penalty.create({
      data: {
        tournamentId: tournament.id,
        matchId: str(body.matchId) || null,
        teamId: team.id,
        playerId: str(body.playerId) || null,
        type,
        value,
        reason,
        issuedById: user.id,
      },
      include: {
        team: { select: { id: true, name: true } },
        tournament: { select: { id: true, name: true } },
      },
    });

    // Zero-tolerance violations: immediate DQ + optional tournament ban (PRD 26)
    if (type === "DISQUALIFICATION" || type === "TOURNAMENT_BAN") {
      await db.registration.updateMany({
        where: { tournamentId: tournament.id, teamId: team.id },
        data: { status: type === "TOURNAMENT_BAN" ? "BANNED" : "REJECTED" },
      });
    }

    await logActivity({
      user,
      action: `Issued ${PENALTY_TYPE_LABELS[type as keyof typeof PENALTY_TYPE_LABELS]} penalty`,
      entity: "Penalty",
      entityId: penalty.id,
      newValue: {
        team: team.name,
        tournament: tournament.name,
        type,
        value,
        reason,
      },
    });

    await notify({
      userId: team.captainId,
      title: `Penalty issued: ${PENALTY_TYPE_LABELS[type as keyof typeof PENALTY_TYPE_LABELS]}`,
      message: `${team.name} — ${tournament.name}: ${PENALTY_TYPE_LABELS[type as keyof typeof PENALTY_TYPE_LABELS]}${
        needsValue ? ` of ${value} ${type === "KILL_DEDUCTION" ? "kills" : "points"}` : ""
      }. Reason: ${reason}`,
      type: "PENALTY",
      link: "#/dashboard",
    });

    return ok({ penalty }, 201);
  } catch (e) {
    return handleRouteError(e);
  }
}

// PATCH /api/penalties — revoke a penalty (admin)
export async function PATCH(req: Request) {
  try {
    const user = await requirePermission("penalties.manage");
    const body = await readJson<{ id?: string; active?: boolean }>(req);
    const id = str(body.id);
    const penalty = await db.penalty.findUnique({ where: { id } });
    if (!penalty) throw new ApiError("Penalty not found.", 404);
    const updated = await db.penalty.update({
      where: { id },
      data: { active: body.active !== false },
    });
    await logActivity({
      user,
      action: updated.active ? "Re-applied penalty" : "Revoked penalty",
      entity: "Penalty",
      entityId: id,
      previousValue: { active: penalty.active },
      newValue: { active: updated.active },
    });
    return ok({ penalty: updated });
  } catch (e) {
    return handleRouteError(e);
  }
}
