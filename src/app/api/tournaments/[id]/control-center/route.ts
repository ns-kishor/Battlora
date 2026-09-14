import { db } from "@/lib/db";
import { requirePermission, ApiError } from "@/lib/auth";
import { getTournamentLeaderboard } from "@/lib/scoring";
import { handleRouteError, ok } from "@/lib/route-helpers";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/tournaments/[id]/control-center — Tournament Control Center (PRD 36)
export async function GET(_req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    await requirePermission("tournaments.view");

    const tournament = await db.tournament.findFirst({
      where: { OR: [{ id }, { slug: id }] },
    });
    if (!tournament) throw new ApiError("Tournament not found.", 404);

    const [registrations, matches, complaints, announcements, penalties, prizes, leaderboard] =
      await Promise.all([
        db.registration.findMany({
          where: { tournamentId: tournament.id },
          include: {
            team: { include: { captain: { select: { name: true, email: true } }, players: true } },
            payment: true,
          },
          orderBy: { submittedAt: "asc" },
        }),
        db.match.findMany({
          where: { tournamentId: tournament.id },
          include: {
            results: { include: { team: { select: { id: true, name: true } } } },
          },
          orderBy: { matchNumber: "asc" },
        }),
        db.complaint.findMany({
          where: { tournamentId: tournament.id },
          include: { team: { select: { name: true } }, evidence: true },
          orderBy: { createdAt: "desc" },
        }),
        db.announcement.findMany({
          where: { tournamentId: tournament.id },
          orderBy: { publishAt: "desc" },
        }),
        db.penalty.findMany({
          where: { tournamentId: tournament.id },
          include: { team: { select: { name: true } }, issuer: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
        }),
        db.prize.findMany({ where: { tournamentId: tournament.id } }),
        getTournamentLeaderboard(tournament.id),
      ]);

    const approvedTeams = registrations
      .filter((r) => r.status === "APPROVED")
      .map((r) => ({
        id: r.team.id,
        name: r.team.name,
        logoUrl: r.team.logoUrl,
        captainName: r.team.captain.name,
        players: r.team.players.map((p) => ({
          id: p.id,
          ign: p.ign,
          uid: p.uid,
          role: p.role,
          status: p.status,
          isSubstitute: p.isSubstitute,
        })),
      }));

    const currentMatch =
      matches.find((m) => m.status === "LIVE") ??
      matches.find((m) => m.status === "ROOM_OPEN") ??
      matches.find((m) => !m.resultPublished && m.status !== "CANCELLED") ??
      null;

    return ok({
      tournament: {
        ...tournament,
        rules: JSON.parse(tournament.rulesJson || "[]"),
        prizeConfig: JSON.parse(tournament.prizeConfig || "[]"),
        scoringConfig: JSON.parse(tournament.scoringConfig),
        tieBreakConfig: JSON.parse(tournament.tieBreakConfig),
      },
      stats: {
        teams: registrations.length,
        verified: registrations.filter((r) => r.status === "APPROVED").length,
        pending: registrations.filter((r) => r.status !== "APPROVED" && !["REJECTED", "CANCELLED", "BANNED"].includes(r.status)).length,
        matches: matches.length,
        completed: matches.filter((m) => m.resultPublished).length,
        currentMatchNumber: currentMatch?.matchNumber ?? null,
        complaints: complaints.length,
        pendingComplaints: complaints.filter((c) => ["PENDING", "UNDER_REVIEW"].includes(c.status)).length,
        pendingPayments: registrations.filter((r) => r.payment?.status === "PENDING").length,
        announcements: announcements.length,
      },
      registrations: registrations.map((r) => ({
        id: r.id,
        regId: r.regId,
        status: r.status,
        submittedAt: r.submittedAt,
        reviewNote: r.reviewNote,
        team: {
          id: r.team.id,
          name: r.team.name,
          logoUrl: r.team.logoUrl,
          status: r.team.status,
          captainName: r.team.captain.name,
          captainEmail: r.team.captain.email,
          playerCount: r.team.players.filter((p) => !p.isSubstitute).length,
          players: r.team.players.map((p) => ({ ign: p.ign, uid: p.uid, role: p.role, status: p.status, isSubstitute: p.isSubstitute })),
        },
        payment: r.payment
          ? {
              id: r.payment.id,
              method: r.payment.method,
              transactionId: r.payment.transactionId,
              senderNumber: r.payment.senderNumber,
              screenshotUrl: r.payment.screenshotUrl,
              status: r.payment.status,
              amount: r.payment.amount,
              rejectionReason: r.payment.rejectionReason,
            }
          : null,
      })),
      matches: matches.map((m) => ({
        id: m.id,
        matchNumber: m.matchNumber,
        date: m.date,
        map: m.map,
        mode: m.mode,
        status: m.status,
        roomId: m.roomId,
        roomPassword: m.roomPassword,
        roomReleaseAt: m.roomReleaseAt,
        roomPublished: m.roomPublished,
        resultPublished: m.resultPublished,
        resultsCount: m.results.length,
      })),
      approvedTeams,
      complaints,
      announcements,
      penalties,
      prizes,
      leaderboard,
    });
  } catch (e) {
    return handleRouteError(e);
  }
}
