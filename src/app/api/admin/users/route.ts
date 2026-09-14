import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { handleRouteError, ok } from "@/lib/route-helpers";
import { ROLES } from "@/lib/types";

// GET /api/admin/users — user list with search
export async function GET(req: Request) {
  try {
    await requirePermission("users.view");
    const url = new URL(req.url);
    const q = url.searchParams.get("q")?.trim();
    const role = url.searchParams.get("role") ?? "ALL";

    const where: Record<string, unknown> = {};
    if (role !== "ALL" && ROLES.includes(role as never)) where.role = role;
    if (q) {
      where.OR = [
        { name: { contains: q } },
        { email: { contains: q } },
        { phone: { contains: q } },
      ];
    }

    const users = await db.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
        teamCaptained: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 300,
    });
    return ok({ users });
  } catch (e) {
    return handleRouteError(e);
  }
}
