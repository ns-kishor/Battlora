import { db } from "@/lib/db";
import { requireUser, ApiError } from "@/lib/auth";
import { logActivity, nextSequenceId } from "@/lib/activity";
import { handleRouteError, ok, readJson, str, validateDataUrlImage } from "@/lib/route-helpers";
import { COMPLAINT_TYPES } from "@/lib/types";

// POST /api/complaints — captain submits a protest (PRD 23–24)
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await readJson<{
      tournamentId?: string;
      matchId?: string;
      type?: string;
      description?: string;
      evidence?: { url?: string; name?: string; type?: string }[];
    }>(req);

    const team = await db.team.findUnique({ where: { captainId: user.id } });
    if (!team)
      throw new ApiError("Only a Team Captain can submit complaints.", 403);

    const tournamentId = str(body.tournamentId);
    const tournament = await db.tournament.findUnique({ where: { id: tournamentId } });
    if (!tournament) throw new ApiError("Tournament not found.", 404);

    const reg = await db.registration.findUnique({
      where: { tournamentId_teamId: { tournamentId, teamId: team.id } },
    });
    if (!reg)
      throw new ApiError("Your team is not registered for this tournament.", 403);

    const type = str(body.type);
    if (!COMPLAINT_TYPES.some((t) => t.value === type))
      throw new ApiError("Please select a valid complaint type.", 400);

    const description = str(body.description);
    if (description.length < 20)
      throw new ApiError("Please describe the issue in at least 20 characters.", 400);

    const evidenceInput = (body.evidence ?? []).slice(0, 4);
    const evidenceData = evidenceInput
      .map((e) => ({
        url: validateDataUrlImage(e.url),
        name: str(e.name) || "evidence.jpg",
        type: "IMAGE",
      }))
      .filter((e) => e.url);

    const ticketId = await nextSequenceId("CMP");
    const complaint = await db.complaint.create({
      data: {
        ticketId,
        tournamentId,
        matchId: str(body.matchId) || null,
        teamId: team.id,
        submittedById: user.id,
        type,
        description,
        status: "PENDING",
        evidence: {
          create: evidenceData.map((e) => ({
            url: e.url as string,
            name: e.name,
            type: e.type,
          })),
        },
      },
      include: { evidence: true },
    });

    await logActivity({
      user,
      action: "Submitted complaint",
      entity: "Complaint",
      entityId: complaint.id,
      newValue: { ticketId, type, team: team.name, tournament: tournament.name },
    });

    return ok(
      {
        complaint: {
          id: complaint.id,
          ticketId: complaint.ticketId,
          status: complaint.status,
        },
      },
      201
    );
  } catch (e) {
    return handleRouteError(e);
  }
}

// GET /api/complaints — admin: all complaints / captain: own complaints
export async function GET(req: Request) {
  try {
    const user = await requireUser();
    const url = new URL(req.url);
    const status = url.searchParams.get("status") ?? "ALL";
    const tournamentId = url.searchParams.get("tournamentId");
    const mine = url.searchParams.get("mine") === "1";

    const where: Record<string, unknown> = {};
    if (status !== "ALL") where.status = status;
    if (tournamentId) where.tournamentId = tournamentId;

    const isStaff = ["SUPER_ADMIN", "TOURNAMENT_ADMIN", "MODERATOR"].includes(user.role);
    if (mine || !isStaff) {
      const team = await db.team.findUnique({ where: { captainId: user.id } });
      where.teamId = team?.id ?? "none";
    }

    const complaints = await db.complaint.findMany({
      where,
      include: {
        team: { select: { id: true, name: true, logoUrl: true } },
        tournament: { select: { id: true, name: true } },
        submitter: { select: { name: true } },
        evidence: true,
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return ok({ complaints, isStaff });
  } catch (e) {
    return handleRouteError(e);
  }
}
