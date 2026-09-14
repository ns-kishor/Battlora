import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { handleRouteError, ok } from "@/lib/route-helpers";

// GET /api/admin/stats — dashboard KPIs (PRD 34)
export async function GET() {
  try {
    await requireStaff();
    const now = new Date();

    const [
      totalTournaments,
      activeTournaments,
      registeredTeams,
      totalPlayers,
      pendingPayments,
      pendingComplaints,
      liveMatches,
      paymentsAgg,
      recentActivity,
      ongoingTournamentsList,
    ] = await Promise.all([
      db.tournament.count(),
      db.tournament.count({ where: { status: { in: ["ONGOING", "UPCOMING", "REGISTRATION_OPEN"] } } }),
      db.team.count(),
      db.player.count(),
      db.payment.count({ where: { status: "PENDING" } }),
      db.complaint.count({ where: { status: { in: ["PENDING", "UNDER_REVIEW"] } } }),
      db.match.count({ where: { status: { in: ["LIVE", "ROOM_OPEN"] } } }),
      db.payment.aggregate({ where: { status: "VERIFIED" }, _sum: { amount: true } }),
      db.activityLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 12,
      }),
      db.tournament.findMany({
        where: { status: "ONGOING" },
        include: {
          _count: {
            select: {
              registrations: { where: { status: "APPROVED" } },
              matches: true,
              complaints: { where: { status: { in: ["PENDING", "UNDER_REVIEW"] } } },
            },
          },
          matches: {
            where: { status: { in: ["LIVE", "ROOM_OPEN", "SCHEDULED"] } },
            orderBy: { matchNumber: "asc" },
            take: 1,
          },
        },
      }),
    ]);

    return ok({
      kpis: {
        totalTournaments,
        activeTournaments,
        registeredTeams,
        totalPlayers,
        pendingPayments,
        pendingComplaints,
        liveMatches,
        totalRevenue: paymentsAgg._sum.amount ?? 0,
      },
      recentActivity,
      ongoing: ongoingTournamentsList.map((t) => ({
        id: t.id,
        name: t.name,
        status: t.status,
        teams: t._count.registrations,
        matches: t._count.matches,
        complaints: t._count.complaints,
        nextMatch: t.matches[0]
          ? { matchNumber: t.matches[0].matchNumber, date: t.matches[0].date, map: t.matches[0].map, status: t.matches[0].status }
          : null,
      })),
      now: now.toISOString(),
    });
  } catch (e) {
    return handleRouteError(e);
  }
}
