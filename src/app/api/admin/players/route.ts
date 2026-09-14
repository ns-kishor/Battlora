import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { handleRouteError, ok } from "@/lib/route-helpers";

// GET /api/admin/players — search players by IGN / UID (PRD 13)
export async function GET(req: Request) {
  try {
    await requirePermission("players.view");
    const url = new URL(req.url);
    const q = url.searchParams.get("q")?.trim();
    const status = url.searchParams.get("status") ?? "ALL";

    const where: Record<string, unknown> = {};
    if (status !== "ALL") where.status = status;
    if (q) {
      where.OR = [
        { ign: { contains: q } },
        { uid: { contains: q } },
        { realName: { contains: q } },
      ];
    }

    const players = await db.player.findMany({
      where,
      include: {
        team: {
          include: {
            captain: { select: { name: true } },
            registrations: { include: { tournament: { select: { id: true, name: true, status: true } } } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 300,
    });
    return ok({ players });
  } catch (e) {
    return handleRouteError(e);
  }
}
