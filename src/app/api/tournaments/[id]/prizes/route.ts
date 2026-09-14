import { db } from "@/lib/db";
import { requirePermission, ApiError } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { handleRouteError, ok, readJson, str, num } from "@/lib/route-helpers";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/tournaments/[id]/prizes
export async function GET(_req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const tournament = await db.tournament.findFirst({ where: { OR: [{ id }, { slug: id }] } });
    if (!tournament) throw new ApiError("Tournament not found.", 404);
    const prizes = await db.prize.findMany({
      where: { tournamentId: tournament.id },
      include: { tournament: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    });
    return ok({ prizes });
  } catch (e) {
    return handleRouteError(e);
  }
}

// PUT /api/tournaments/[id]/prizes — replace prize configuration / update statuses
export async function PUT(req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const user = await requirePermission("tournaments.manage");
    const body = await readJson<{
      prizes?: { name?: string; amount?: number; description?: string; status?: string }[];
    }>(req);

    const tournament = await db.tournament.findFirst({ where: { OR: [{ id }, { slug: id }] } });
    if (!tournament) throw new ApiError("Tournament not found.", 404);
    if (tournament.resultsLocked)
      throw new ApiError("Prizes are final — results locked.", 409);

    const prizesInput = body.prizes ?? [];
    await db.prize.deleteMany({ where: { tournamentId: tournament.id } });
    for (const p of prizesInput) {
      const name = str(p.name);
      if (!name) continue;
      await db.prize.create({
        data: {
          tournamentId: tournament.id,
          name,
          amount: Math.max(0, num(p.amount)),
          description: str(p.description) || null,
          status: ["PENDING", "APPROVED", "PAID"].includes(str(p.status)) ? str(p.status) : "PENDING",
        },
      });
    }

    await logActivity({
      user,
      action: "Updated prize configuration",
      entity: "Tournament",
      entityId: tournament.id,
      newValue: { count: prizesInput.length },
    });

    const prizes = await db.prize.findMany({ where: { tournamentId: tournament.id } });
    return ok({ prizes });
  } catch (e) {
    return handleRouteError(e);
  }
}
