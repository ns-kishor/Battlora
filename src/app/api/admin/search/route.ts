import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { handleRouteError, ok } from "@/lib/route-helpers";

// GET /api/admin/search — global search (PRD 42)
export async function GET(req: Request) {
  try {
    await requireStaff();
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") ?? "").trim();
    if (q.length < 2) return ok({ results: { teams: [], players: [], tournaments: [], registrations: [], payments: [], matches: [] } });

    const [teams, players, tournaments, registrations, payments, matches] =
      await Promise.all([
        db.team.findMany({
          where: { name: { contains: q } },
          include: { captain: { select: { name: true } }, _count: { select: { players: true } } },
          take: 5,
        }),
        db.player.findMany({
          where: { OR: [{ ign: { contains: q } }, { uid: { contains: q } }] },
          include: { team: { select: { name: true } } },
          take: 5,
        }),
        db.tournament.findMany({
          where: { OR: [{ name: { contains: q } }, { slug: { contains: q } }] },
          take: 5,
        }),
        db.registration.findMany({
          where: { OR: [{ regId: { contains: q } }, { team: { name: { contains: q } } }] },
          include: { team: { select: { name: true } }, tournament: { select: { name: true } } },
          take: 5,
        }),
        db.payment.findMany({
          where: { transactionId: { contains: q } },
          include: {
            registration: { include: { team: { select: { name: true } } } },
          },
          take: 5,
        }),
        db.match.findMany({
          where: { tournament: { name: { contains: q } } },
          include: { tournament: { select: { name: true } } },
          orderBy: { matchNumber: "asc" },
          take: 5,
        }),
      ]);

    return ok({
      results: {
        teams,
        players,
        tournaments,
        registrations,
        payments,
        matches: matches.map((m) => ({ ...m, label: `Match #${m.matchNumber} — ${m.tournament.name}` })),
      },
    });
  } catch (e) {
    return handleRouteError(e);
  }
}
