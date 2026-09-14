import { db } from "@/lib/db";
import { requirePermission, ApiError } from "@/lib/auth";
import { logActivity, notify } from "@/lib/activity";
import { handleRouteError, ok, readJson, str } from "@/lib/route-helpers";
import { ROLES } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/admin/users/[id] — change role / suspend / ban (PRD 43)
export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const user = await requirePermission("users.manage");
    const body = await readJson<{ role?: string; status?: string }>(req);

    const target = await db.user.findUnique({ where: { id } });
    if (!target) throw new ApiError("User not found.", 404);
    if (target.id === user.id && (body.status === "BANNED" || body.status === "SUSPENDED"))
      throw new ApiError("You cannot suspend or ban yourself.", 400);
    if (target.role === "SUPER_ADMIN" && user.role !== "SUPER_ADMIN")
      throw new ApiError("Only a Super Admin can modify another Super Admin.", 403);

    const data: Record<string, unknown> = {};
    if (body.role !== undefined) {
      const role = str(body.role);
      if (!ROLES.includes(role as never)) throw new ApiError("Invalid role.", 400);
      data.role = role;
    }
    if (body.status !== undefined) {
      const status = str(body.status);
      if (!["ACTIVE", "SUSPENDED", "BANNED"].includes(status))
        throw new ApiError("Invalid status.", 400);
      data.status = status;
    }

    const previous = { role: target.role, status: target.status };
    const updated = await db.user.update({ where: { id }, data });

    await logActivity({
      user,
      action: body.role !== undefined ? "Changed user role" : "Changed user status",
      entity: "User",
      entityId: id,
      previousValue: previous,
      newValue: { role: updated.role, status: updated.status, userName: updated.name },
    });

    if (data.status === "SUSPENDED" || data.status === "BANNED") {
      await db.session.deleteMany({ where: { userId: id } });
      await notify({
        userId: id,
        title: `Account ${String(data.status).toLowerCase()}`,
        message: `Your account has been ${String(data.status).toLowerCase()} by an administrator.`,
        type: "GENERAL",
      });
    }

    return ok({
      user: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        role: updated.role,
        status: updated.status,
      },
    });
  } catch (e) {
    return handleRouteError(e);
  }
}
