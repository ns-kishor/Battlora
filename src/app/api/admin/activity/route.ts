import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { handleRouteError, ok } from "@/lib/route-helpers";

// GET /api/admin/activity — audit log feed (PRD 41, 57)
export async function GET(req: Request) {
  try {
    await requirePermission("activity.view");
    const url = new URL(req.url);
    const q = url.searchParams.get("q")?.trim();
    const entity = url.searchParams.get("entity") ?? "ALL";
    const take = Math.min(200, parseInt(url.searchParams.get("take") ?? "80", 10) || 80);

    const where: Record<string, unknown> = {};
    if (entity !== "ALL") where.entity = entity;
    if (q) {
      where.OR = [
        { userName: { contains: q } },
        { action: { contains: q } },
        { entity: { contains: q } },
      ];
    }

    const logs = await db.activityLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
    });
    const total = await db.activityLog.count();
    return ok({ logs, total });
  } catch (e) {
    return handleRouteError(e);
  }
}
