import { db } from "@/lib/db";
import { requirePermission, ApiError } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { handleRouteError, ok } from "@/lib/route-helpers";

type Ctx = { params: Promise<{ id: string }> };

// DELETE /api/announcements/[id] — destructive, requires confirmation client-side
export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const user = await requirePermission("announcements.manage");
    const announcement = await db.announcement.findUnique({ where: { id } });
    if (!announcement) throw new ApiError("Announcement not found.", 404);

    await db.announcement.delete({ where: { id } });
    await logActivity({
      user,
      action: "Deleted announcement",
      entity: "Announcement",
      entityId: id,
      previousValue: { title: announcement.title },
    });
    return ok({ success: true });
  } catch (e) {
    return handleRouteError(e);
  }
}
