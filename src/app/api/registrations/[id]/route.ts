import { db } from "@/lib/db";
import { requirePermission, ApiError } from "@/lib/auth";
import { logActivity, notify } from "@/lib/activity";
import { handleRouteError, ok, readJson, str } from "@/lib/route-helpers";
import { REGISTRATION_STATUS_LABELS } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/registrations/[id] — approve / reject / review (admin)
export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const user = await requirePermission("teams.manage");
    const body = await readJson<{ status?: string; note?: string }>(req);

    const registration = await db.registration.findUnique({
      where: { id },
      include: {
        team: { include: { captain: true } },
        tournament: { select: { id: true, name: true, resultsLocked: true } },
        payment: true,
      },
    });
    if (!registration) throw new ApiError("Registration not found.", 404);

    const status = str(body.status);
    const valid = ["APPROVED", "REJECTED", "UNDER_REVIEW", "CANCELLED", "BANNED"];
    if (!valid.includes(status)) throw new ApiError("Invalid status.", 400);

    if (status === "APPROVED" && registration.payment && registration.payment.status !== "VERIFIED") {
      throw new ApiError(
        "Payment must be verified before approving this registration (or use manual override).",
        409
      );
    }

    const updated = await db.registration.update({
      where: { id },
      data: {
        status,
        reviewedAt: new Date(),
        reviewedById: user.id,
        reviewNote: str(body.note) || null,
      },
    });

    if (status === "APPROVED") {
      await db.team.update({
        where: { id: registration.teamId },
        data: { status: "VERIFIED" },
      });
      await db.player.updateMany({
        where: { teamId: registration.teamId },
        data: { status: "VERIFIED" },
      });
    }

    await logActivity({
      user,
      action: `Registration ${status.toLowerCase()}`,
      entity: "Registration",
      entityId: id,
      previousValue: { status: registration.status },
      newValue: { status, note: str(body.note) || null },
    });

    await notify({
      userId: registration.team.captainId,
      title:
        status === "APPROVED"
          ? "Registration approved 🎉"
          : `Registration ${REGISTRATION_STATUS_LABELS[status as keyof typeof REGISTRATION_STATUS_LABELS] ?? status}`,
      message: `${registration.team.name} — ${registration.tournament.name}: ${status.replace(/_/g, " ").toLowerCase()}${
        str(body.note) ? ` — ${str(body.note)}` : ""
      }`,
      type: "REGISTRATION",
      link: "#/dashboard",
    });

    return ok({ registration: updated });
  } catch (e) {
    return handleRouteError(e);
  }
}
