import { db } from "@/lib/db";
import { requirePermission, ApiError } from "@/lib/auth";
import { logActivity, notifyTournamentTeams } from "@/lib/activity";
import { handleRouteError, ok, readJson, str } from "@/lib/route-helpers";

// GET /api/announcements — public list
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const tournamentId = url.searchParams.get("tournamentId");
    const where: Record<string, unknown> = {
      publishAt: { lte: new Date() },
      OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
    };
    if (tournamentId) where.tournamentId = tournamentId;

    const announcements = await db.announcement.findMany({
      where,
      include: { tournament: { select: { id: true, name: true, slug: true } } },
      orderBy: [{ priority: "desc" }, { publishAt: "desc" }],
      take: 100,
    });
    return ok({ announcements });
  } catch (e) {
    return handleRouteError(e);
  }
}

// POST /api/announcements — create (admin, PRD 27)
export async function POST(req: Request) {
  try {
    const user = await requirePermission("announcements.manage");
    const body = await readJson<{
      title?: string;
      description?: string;
      tournamentId?: string;
      priority?: string;
      publishAt?: string;
      expiresAt?: string;
    }>(req);

    const title = str(body.title);
    const description = str(body.description);
    if (title.length < 3) throw new ApiError("Title is required.", 400);
    if (description.length < 10) throw new ApiError("Description is required.", 400);

    const priority = ["NORMAL", "IMPORTANT", "URGENT"].includes(str(body.priority))
      ? str(body.priority)
      : "NORMAL";

    let tournamentId: string | null = null;
    let tournamentName = "All tournaments";
    if (str(body.tournamentId)) {
      const t = await db.tournament.findUnique({ where: { id: str(body.tournamentId) } });
      if (!t) throw new ApiError("Tournament not found.", 404);
      tournamentId = t.id;
      tournamentName = t.name;
    }

    const announcement = await db.announcement.create({
      data: {
        title,
        description,
        tournamentId,
        priority,
        publishAt: body.publishAt ? new Date(str(body.publishAt)) : new Date(),
        expiresAt: body.expiresAt ? new Date(str(body.expiresAt)) : null,
        createdById: user.id,
      },
    });

    await logActivity({
      user,
      action: "Published announcement",
      entity: "Announcement",
      entityId: announcement.id,
      newValue: { title, priority, tournament: tournamentName },
    });

    if (tournamentId) {
      await notifyTournamentTeams(
        tournamentId,
        `📢 ${title}`,
        description.slice(0, 160),
        "ANNOUNCEMENT"
      );
    }

    return ok({ announcement }, 201);
  } catch (e) {
    return handleRouteError(e);
  }
}
