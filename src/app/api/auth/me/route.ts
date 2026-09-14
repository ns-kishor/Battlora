import { db } from "@/lib/db";
import { getSessionUser, publicUser } from "@/lib/auth";
import { handleRouteError, ok } from "@/lib/route-helpers";

export async function GET() {
  try {
    const user = await getSessionUser();
    let team = null;
    if (user) {
      const captained = await db.team.findUnique({
        where: { captainId: user.id },
        select: { id: true, name: true, logoUrl: true, status: true },
      });
      team = captained;
      const unread = await db.notification.count({
        where: { userId: user.id, read: false },
      });
      return ok({ user: publicUser(user), team, unreadNotifications: unread });
    }
    return ok({ user: null, team: null, unreadNotifications: 0 });
  } catch (e) {
    return handleRouteError(e);
  }
}
