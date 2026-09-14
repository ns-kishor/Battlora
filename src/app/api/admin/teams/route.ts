import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { handleRouteError, ok } from "@/lib/route-helpers";

// GET /api/admin/teams — all teams with search & filters
export async function GET(req: Request) {
  try {
    await requirePermission("teams.view");
    const url = new URL(req.url);
    const q = url.searchParams.get("q")?.trim();
    const status = url.searchParams.get("status") ?? "ALL";
    const tournamentId = url.searchParams.get("tournamentId");

    const where: Record<string, unknown> = {};
    if (status !== "ALL") where.status = status;
    if (q) {
      where.OR = [{ name: { contains: q } }, { players: { some: { uid: { contains: q } } } }];
    }
    if (tournamentId) {
      where.registrations = { some: { tournamentId } };
    }

    const teams = await db.team.findMany({
      where,
      include: {
        captain: { select: { name: true, email: true, phone: true } },
        players: true,
        registrations: {
          include: { tournament: { select: { id: true, name: true } } },
        },
        _count: { select: { complaints: true, penalties: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 300,
    });
    return ok({ teams });
  } catch (e) {
    return handleRouteError(e);
  }
}
