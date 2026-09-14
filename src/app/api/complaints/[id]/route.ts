import { db } from "@/lib/db";
import { requirePermission, ApiError } from "@/lib/auth";
import { logActivity, notify } from "@/lib/activity";
import { handleRouteError, ok, readJson, str } from "@/lib/route-helpers";
import { COMPLAINT_STATUS_LABELS } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/complaints/[id] — review: status + internal notes (PRD 24)
export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const user = await requirePermission("complaints.manage");
    const body = await readJson<{ status?: string; internalNotes?: string }>(req);

    const complaint = await db.complaint.findUnique({
      where: { id },
      include: {
        team: { include: { captain: true } },
        tournament: { select: { name: true } },
      },
    });
    if (!complaint) throw new ApiError("Complaint not found.", 404);

    const status = str(body.status);
    const valid = ["PENDING", "UNDER_REVIEW", "CONFIRMED", "REJECTED", "RESOLVED"];
    if (status && !valid.includes(status))
      throw new ApiError("Invalid complaint status.", 400);

    const updated = await db.complaint.update({
      where: { id },
      data: {
        status: status || complaint.status,
        internalNotes: body.internalNotes !== undefined ? str(body.internalNotes) : complaint.internalNotes,
        resolvedAt: status === "RESOLVED" || status === "REJECTED" ? new Date() : null,
      },
    });

    await logActivity({
      user,
      action: `Complaint reviewed — ${status || "notes updated"}`,
      entity: "Complaint",
      entityId: id,
      previousValue: { status: complaint.status },
      newValue: {
        status: updated.status,
        ticketId: complaint.ticketId,
        team: complaint.team.name,
      },
    });

    if (status && status !== complaint.status) {
      await notify({
        userId: complaint.team.captainId,
        title: `Complaint ${COMPLAINT_STATUS_LABELS[status as keyof typeof COMPLAINT_STATUS_LABELS] ?? status}`,
        message: `Your complaint ${complaint.ticketId} (${complaint.tournament.name}) has been updated to: ${status.replace(/_/g, " ").toLowerCase()}.`,
        type: "COMPLAINT",
        link: "#/dashboard/complaints",
      });
    }

    return ok({ complaint: updated });
  } catch (e) {
    return handleRouteError(e);
  }
}
