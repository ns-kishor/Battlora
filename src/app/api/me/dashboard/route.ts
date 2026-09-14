import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getTournamentLeaderboard } from "@/lib/scoring";
import { handleRouteError, ok } from "@/lib/route-helpers";

// GET /api/me/dashboard — captain dashboard aggregate (PRD 11)
export async function GET() {
  try {
    const user = await requireUser();

    const team = await db.team.findUnique({
      where: { captainId: user.id },
      include: {
        players: { orderBy: [{ isSubstitute: "asc" }, { createdAt: "asc" }] },
      },
    });
    if (!team) return ok({ team: null, registrations: [], notifications: [] });

    const registrations = await db.registration.findMany({
      where: { teamId: team.id },
      include: {
        tournament: true,
        payment: true,
      },
      orderBy: { submittedAt: "desc" },
    });

    // Active tournament context (first approved, else first non-rejected)
    const activeReg =
      registrations.find((r) => r.status === "APPROVED" && r.tournament.status === "ONGOING") ??
      registrations.find((r) => r.status === "APPROVED") ??
      registrations.find((r) => r.status !== "REJECTED" && r.status !== "CANCELLED" && r.status !== "BANNED") ??
      null;

    let standings: {
      tournament: { id: string; name: string; status: string; resultsLocked: boolean };
      myRow: {
        rank: number;
        totalPoints: number;
        kills: number;
        booyah: number;
        matchesPlayed: number;
        bestPlacement: number | null;
        pointDeduction: number;
      } | null;
      totalTeams: number;
    } | null = null;

    let matches: {
      id: string;
      matchNumber: number;
      date: string;
      map: string;
      status: string;
      resultPublished: boolean;
      roomPublished: boolean;
      roomId: string | null;
      roomPassword: string | null;
      roomAvailableAt: string | null;
      myPlacement: number | null;
      myKills: number | null;
      myPoints: number | null;
    }[] = [];

    if (activeReg) {
      const tournament = activeReg.tournament;
      const [leaderboard, matchRows, myResults] = await Promise.all([
        getTournamentLeaderboard(tournament.id),
        db.match.findMany({
          where: { tournamentId: tournament.id },
          orderBy: { matchNumber: "asc" },
        }),
        db.matchResult.findMany({
          where: { teamId: team.id, match: { tournamentId: tournament.id } },
          include: { match: { select: { matchNumber: true } } },
        }),
      ]);

      const myRow = leaderboard.find((r) => r.teamId === team.id) ?? null;
      standings = {
        tournament: {
          id: tournament.id,
          name: tournament.name,
          status: tournament.status,
          resultsLocked: tournament.resultsLocked,
        },
        myRow: myRow
          ? {
              rank: myRow.rank,
              totalPoints: myRow.totalPoints,
              kills: myRow.kills,
              booyah: myRow.booyah,
              matchesPlayed: myRow.matchesPlayed,
              bestPlacement: myRow.bestPlacement,
              pointDeduction: myRow.pointDeduction,
            }
          : null,
        totalTeams: leaderboard.length,
      };

      const resultsByMatch = new Map(myResults.map((r) => [r.matchId, r]));
      const now = new Date();
      matches = matchRows.map((m) => {
        const released = m.roomReleaseAt ? new Date(m.roomReleaseAt) <= now : true;
        const result = resultsByMatch.get(m.id);
        return {
          id: m.id,
          matchNumber: m.matchNumber,
          date: m.date.toISOString(),
          map: m.map,
          status: m.status,
          resultPublished: m.resultPublished,
          roomPublished: m.roomPublished,
          roomId: m.roomPublished && released ? m.roomId : null,
          roomPassword: m.roomPublished && released ? m.roomPassword : null,
          roomAvailableAt: m.roomPublished && m.roomReleaseAt && !released ? m.roomReleaseAt.toISOString() : null,
          myPlacement: result?.placement ?? null,
          myKills: result?.kills ?? null,
          myPoints: result?.totalPoints ?? null,
        };
      });
    }

    const notifications = await db.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 12,
    });

    return ok({
      team,
      registrations: registrations.map((r) => ({
        id: r.id,
        regId: r.regId,
        status: r.status,
        reviewNote: r.reviewNote,
        submittedAt: r.submittedAt,
        tournament: {
          id: r.tournament.id,
          name: r.tournament.name,
          status: r.tournament.status,
          entryFee: r.tournament.entryFee,
          prizePool: r.tournament.prizePool,
          mode: r.tournament.mode,
          game: r.tournament.game,
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
      activeTournamentId: activeReg?.tournament.id ?? null,
      standings,
      matches,
      notifications,
      unreadNotifications: notifications.filter((n) => !n.read).length,
    });
  } catch (e) {
    return handleRouteError(e);
  }
}
