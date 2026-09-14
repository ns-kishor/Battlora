import { db } from "@/lib/db";
import { requireUser, ApiError } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { handleRouteError, ok, readJson, str, validateDataUrlImage } from "@/lib/route-helpers";
import { PLAYER_ROLES } from "@/lib/types";

// POST /api/me/players — add a player to my team (PRD 13)
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const team = await db.team.findUnique({
      where: { captainId: user.id },
      include: { registrations: { include: { tournament: { select: { name: true, registrationEnd: true } } } } },
    });
    if (!team) throw new ApiError("Create your team first.", 404);
    if (team.status === "BANNED") throw new ApiError("This team is banned.", 403);

    const body = await readJson<{
      realName?: string;
      ign?: string;
      uid?: string;
      phone?: string;
      role?: string;
      photoUrl?: string;
      isSubstitute?: boolean;
    }>(req);

    const ign = str(body.ign);
    const uid = str(body.uid);
    if (ign.length < 2) throw new ApiError("IGN is required.", 400);
    if (!/^\d{6,12}$/.test(uid)) throw new ApiError("Free Fire UID must be 6–12 digits.", 400);

    const uidClash = await db.player.findUnique({ where: { uid } });
    if (uidClash) throw new ApiError("This UID is already registered.", 409);

    // Roster changes after approval require admin approval (PRD 12)
    const approvedReg = team.registrations.find((r) => r.status === "APPROVED");
    if (approvedReg) {
      const stillOpen = approvedReg.tournament.registrationEnd
        ? new Date(approvedReg.tournament.registrationEnd) > new Date()
        : false;
      if (!stillOpen) {
        throw new ApiError(
          `Registration for ${approvedReg.tournament.name} has closed — roster changes now require admin approval. Please contact the tournament admins.`,
          403
        );
      }
    }

    const playerCount = await db.player.count({ where: { teamId: team.id, isSubstitute: false } });
    const isSubstitute = body.isSubstitute === true;
    if (!isSubstitute && playerCount >= 6)
      throw new ApiError("Maximum 6 main players allowed.", 400);

    const player = await db.player.create({
      data: {
        teamId: team.id,
        realName: str(body.realName) || ign,
        ign,
        uid,
        phone: str(body.phone) || null,
        role: isSubstitute
          ? "SUBSTITUTE"
          : PLAYER_ROLES.includes(str(body.role) as never)
            ? str(body.role)
            : "PLAYER",
        photoUrl: validateDataUrlImage(body.photoUrl),
        isSubstitute,
        status: "PENDING",
      },
    });

    await logActivity({
      user,
      action: "Added player",
      entity: "Player",
      entityId: player.id,
      newValue: { ign, uid, team: team.name },
    });

    return ok({ player }, 201);
  } catch (e) {
    return handleRouteError(e);
  }
}

// DELETE /api/me/players?id=... — remove player from my team
export async function DELETE(req: Request) {
  try {
    const user = await requireUser();
    const url = new URL(req.url);
    const id = url.searchParams.get("id") ?? "";
    const team = await db.team.findUnique({
      where: { captainId: user.id },
      include: { registrations: { include: { tournament: { select: { name: true, registrationEnd: true } } } } },
    });
    if (!team) throw new ApiError("You do not have a team.", 404);

    const player = await db.player.findUnique({ where: { id } });
    if (!player || player.teamId !== team.id)
      throw new ApiError("Player not found in your team.", 404);

    const approvedReg = team.registrations.find((r) => r.status === "APPROVED");
    if (approvedReg) {
      const stillOpen = approvedReg.tournament.registrationEnd
        ? new Date(approvedReg.tournament.registrationEnd) > new Date()
        : false;
      if (!stillOpen) {
        throw new ApiError(
          `Registration for ${approvedReg.tournament.name} has closed — roster changes now require admin approval. Please contact the tournament admins.`,
          403
        );
      }
    }

    await db.player.delete({ where: { id } });
    await logActivity({
      user,
      action: "Removed player",
      entity: "Player",
      entityId: id,
      previousValue: { ign: player.ign, uid: player.uid },
    });
    return ok({ success: true });
  } catch (e) {
    return handleRouteError(e);
  }
}
