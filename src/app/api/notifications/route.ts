import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handleRouteError, ok, readJson } from "@/lib/route-helpers";

// GET /api/notifications — my notifications
export async function GET() {
  try {
    const user = await requireUser();
    const notifications = await db.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    const unread = notifications.filter((n) => !n.read).length;
    return ok({ notifications, unread });
  } catch (e) {
    return handleRouteError(e);
  }
}

// PATCH /api/notifications — mark read (one or all)
export async function PATCH(req: Request) {
  try {
    const user = await requireUser();
    const body = await readJson<{ id?: string; all?: boolean }>(req);
    if (body.all) {
      await db.notification.updateMany({
        where: { userId: user.id, read: false },
        data: { read: true },
      });
    } else if (body.id) {
      await db.notification.updateMany({
        where: { userId: user.id, id: body.id },
        data: { read: true },
      });
    }
    return ok({ success: true });
  } catch (e) {
    return handleRouteError(e);
  }
}
