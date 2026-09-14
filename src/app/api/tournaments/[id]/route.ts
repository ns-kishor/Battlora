import { db } from "@/lib/db";
import { getSessionUser, requirePermission, ApiError } from "@/lib/auth";
import { logActivity, notify } from "@/lib/activity";
import { getTournamentLeaderboard } from "@/lib/scoring";
import {
  getSettings,
  handleRouteError,
  ok,
  readJson,
  str,
  num,
  bool,
  maskIfNotReleased,
  validateDataUrlImage,
} from "@/lib/route-helpers";
import { TOURNAMENT_STATUSES } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/tournaments/[id] — full public detail
export async function GET(req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const user = await getSessionUser();
    const isAdmin =
      !!user &&
      ["SUPER_ADMIN", "TOURNAMENT_ADMIN", "RESULT_MANAGER", "MODERATOR"].includes(user.role);

    const tournament = await db.tournament.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      include: {
        matches: { orderBy: { matchNumber: "asc" } },
        prizes: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!tournament || (tournament.status === "DRAFT" && !isAdmin))
      throw new ApiError("Tournament not found.", 404);

    const [registrations, announcements, leaderboard, settings] = await Promise.all([
      db.registration.findMany({
        where: { tournamentId: tournament.id, status: "APPROVED" },
        include: {
          team: {
            include: { players: true, captain: { select: { name: true } } },
          },
        },
        orderBy: { submittedAt: "asc" },
      }),
      db.announcement.findMany({
        where: { tournamentId: tournament.id, publishAt: { lte: new Date() } },
        orderBy: { publishAt: "desc" },
      }),
      getTournamentLeaderboard(tournament.id),
      getSettings(),
    ]);

    // Mask room credentials until release time (PRD 15)
    const matches = tournament.matches.map((m) => {
      const room = maskIfNotReleased(m.roomId, m.roomReleaseAt, isAdmin);
      const pass = maskIfNotReleased(m.roomPassword, m.roomReleaseAt, isAdmin);
      return {
        id: m.id,
        matchNumber: m.matchNumber,
        date: m.date,
        map: m.map,
        mode: m.mode,
        status: m.status,
        resultPublished: m.resultPublished,
        roomPublished: m.roomPublished,
        roomId: room.value,
        roomPassword: pass.value,
        roomHidden: room.hidden,
        roomAvailableAt: room.availableAt ?? pass.availableAt,
      };
    });

    const teams = registrations.map((r) => ({
      id: r.team.id,
      name: r.team.name,
      logoUrl: r.team.logoUrl,
      status: r.team.status,
      captainName: r.team.captain.name,
      players: r.team.players
        .filter((p) => !p.isSubstitute)
        .map((p) => ({
          ign: p.ign,
          uid: p.uid,
          role: p.role,
          status: p.status,
        })),
      substitute: r.team.players
        .filter((p) => p.isSubstitute)
        .map((p) => ({ ign: p.ign, uid: p.uid })),
    }));

    // My registration for this tournament (if captain)
    let myRegistration = null;
    if (user) {
      const team = await db.team.findUnique({ where: { captainId: user.id } });
      if (team) {
        const reg = await db.registration.findUnique({
          where: { tournamentId_teamId: { tournamentId: tournament.id, teamId: team.id } },
          include: { payment: true },
        });
        if (reg) {
          myRegistration = {
            id: reg.id,
            regId: reg.regId,
            status: reg.status,
            paymentStatus: reg.payment?.status ?? null,
            paymentMethod: reg.payment?.method ?? null,
            reviewNote: reg.reviewNote,
          };
        }
      }
    }

    return ok({
      tournament: {
        ...tournament,
        matches: undefined,
        prizes: undefined,
        rules: JSON.parse(tournament.rulesJson || "[]"),
        prizeConfig: JSON.parse(tournament.prizeConfig || "[]"),
        scoringConfig: JSON.parse(tournament.scoringConfig),
        tieBreakConfig: JSON.parse(tournament.tieBreakConfig),
        registeredTeams: teams.length,
      },
      matches,
      teams,
      leaderboard,
      announcements,
      prizes: tournament.prizes,
      myRegistration,
      paymentMethods: JSON.parse(settings.paymentMethodsJson || "[]"),
      paymentInstructions: settings.paymentInstructions,
      faq: JSON.parse(settings.faqJson || "[]"),
      isAdminView: isAdmin,
    });
  } catch (e) {
    return handleRouteError(e);
  }
}

// PATCH /api/tournaments/[id] — update tournament (admin)
export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const user = await requirePermission("tournaments.manage");
    const body = await readJson<Record<string, unknown>>(req);

    const tournament = await db.tournament.findFirst({
      where: { OR: [{ id }, { slug: id }] },
    });
    if (!tournament) throw new ApiError("Tournament not found.", 404);
    if (tournament.resultsLocked && user.role !== "SUPER_ADMIN")
      throw new ApiError("Final results are locked. Only a Super Admin can modify this tournament.", 403);

    const data: Record<string, unknown> = {};

    if (body.name !== undefined) data.name = str(body.name);
    if (body.description !== undefined) data.description = str(body.description);
    if (body.bannerUrl !== undefined) data.bannerUrl = validateDataUrlImage(body.bannerUrl);
    if (body.game !== undefined) data.game = str(body.game);
    if (body.mode !== undefined) data.mode = str(body.mode);
    if (body.format !== undefined) data.format = str(body.format);
    if (body.status !== undefined) {
      const status = str(body.status);
      if (!TOURNAMENT_STATUSES.includes(status as never))
        throw new ApiError("Invalid tournament status.", 400);
      data.status = status;
    }
    if (body.featured !== undefined) data.featured = bool(body.featured);
    if (body.entryFee !== undefined) data.entryFee = Math.max(0, num(body.entryFee));
    if (body.teamLimit !== undefined)
      data.teamLimit = Math.min(64, Math.max(2, Math.round(num(body.teamLimit))));
    if (body.playersPerTeam !== undefined)
      data.playersPerTeam = Math.min(6, Math.max(1, Math.round(num(body.playersPerTeam))));
    if (body.registrationStart !== undefined)
      data.registrationStart = body.registrationStart ? new Date(str(body.registrationStart)) : null;
    if (body.registrationEnd !== undefined)
      data.registrationEnd = body.registrationEnd ? new Date(str(body.registrationEnd)) : null;
    if (body.tournamentStart !== undefined)
      data.tournamentStart = body.tournamentStart ? new Date(str(body.tournamentStart)) : null;
    if (body.tournamentEnd !== undefined)
      data.tournamentEnd = body.tournamentEnd ? new Date(str(body.tournamentEnd)) : null;
    if (body.matchCount !== undefined) data.matchCount = Math.max(1, Math.round(num(body.matchCount)));
    if (body.substituteAllowed !== undefined) data.substituteAllowed = bool(body.substituteAllowed);
    if (body.prizePool !== undefined) data.prizePool = Math.max(0, num(body.prizePool));
    if (body.prizeConfig !== undefined) data.prizeConfig = JSON.stringify(body.prizeConfig);
    if (body.rulesJson !== undefined) data.rulesJson = typeof body.rulesJson === "string" ? body.rulesJson : JSON.stringify(body.rulesJson ?? []);
    if (body.scoringConfig !== undefined) data.scoringConfig = JSON.stringify(body.scoringConfig);
    if (body.tieBreakConfig !== undefined) data.tieBreakConfig = JSON.stringify(body.tieBreakConfig);

    const previousStatus = tournament.status;
    const updated = await db.tournament.update({
      where: { id: tournament.id },
      data,
    });

    await logActivity({
      user,
      action: "Updated tournament",
      entity: "Tournament",
      entityId: tournament.id,
      previousValue: { status: previousStatus, name: tournament.name },
      newValue: { status: updated.status, name: updated.name },
    });

    if (data.status && data.status !== previousStatus) {
      await db.notification.createMany({
        data: (
          await db.registration.findMany({
            where: { tournamentId: tournament.id },
            include: { team: { select: { captainId: true } } },
          })
        ).map((r) => ({
          userId: r.team.captainId,
          title: `Tournament update: ${tournament.name}`,
          message: `Status changed to ${String(data.status).replace(/_/g, " ").toLowerCase()}.`,
          type: "MATCH",
        })),
      });
    }

    return ok({ tournament: updated });
  } catch (e) {
    return handleRouteError(e);
  }
}

// DELETE /api/tournaments/[id] — delete (destructive, super admin only)
export async function DELETE(req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const user = await requirePermission("settings.manage"); // super-admin level gate
    const tournament = await db.tournament.findFirst({ where: { OR: [{ id }, { slug: id }] } });
    if (!tournament) throw new ApiError("Tournament not found.", 404);

    await db.tournament.delete({ where: { id: tournament.id } });
    await logActivity({
      user,
      action: "Deleted tournament",
      entity: "Tournament",
      entityId: tournament.id,
      previousValue: { name: tournament.name },
    });
    return ok({ success: true });
  } catch (e) {
    return handleRouteError(e);
  }
}
