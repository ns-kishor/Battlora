import { db } from "@/lib/db";
import { requirePermission, ApiError } from "@/lib/auth";
import { logActivity, notify } from "@/lib/activity";
import { handleRouteError, ok, readJson, str } from "@/lib/route-helpers";

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/payments/[id] — verify / reject / refund (finance)
export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const user = await requirePermission("payments.manage");
    const body = await readJson<{ status?: string; rejectionReason?: string; notes?: string }>(req);

    const payment = await db.payment.findUnique({
      where: { id },
      include: {
        registration: {
          include: {
            team: { include: { captain: true } },
            tournament: { select: { id: true, name: true } },
          },
        },
      },
    });
    if (!payment) throw new ApiError("Payment not found.", 404);

    const status = str(body.status);
    if (!["VERIFIED", "REJECTED", "REFUNDED"].includes(status))
      throw new ApiError("Invalid payment status.", 400);
    if (status === "REJECTED" && !str(body.rejectionReason))
      throw new ApiError("A rejection reason is required.", 400);

    const previous = { status: payment.status };
    const updated = await db.payment.update({
      where: { id },
      data: {
        status,
        verifiedAt: status === "VERIFIED" ? new Date() : null,
        verifiedById: user.id,
        rejectionReason: status === "REJECTED" ? str(body.rejectionReason) : null,
      },
    });

    // Registration status transitions
    if (status === "VERIFIED" && payment.registration.status === "PAYMENT_PENDING") {
      await db.registration.update({
        where: { id: payment.registrationId },
        data: { status: "UNDER_REVIEW" },
      });
    }
    if (status === "REJECTED") {
      await db.registration.update({
        where: { id: payment.registrationId },
        data: { status: "PAYMENT_PENDING", reviewNote: `Payment rejected: ${str(body.rejectionReason)}` },
      });
    }

    await logActivity({
      user,
      action: `Payment ${status.toLowerCase()}`,
      entity: "Payment",
      entityId: id,
      previousValue: previous,
      newValue: {
        status,
        team: payment.registration.team.name,
        transactionId: payment.transactionId,
        reason: str(body.rejectionReason) || null,
      },
    });

    const messages: Record<string, string> = {
      VERIFIED: `Your payment of ৳${payment.amount} for ${payment.registration.tournament.name} has been verified. Your registration is now under review.`,
      REJECTED: `Your payment for ${payment.registration.tournament.name} was rejected. Reason: ${str(body.rejectionReason)}. Please submit a new payment.`,
      REFUNDED: `Your payment of ৳${payment.amount} for ${payment.registration.tournament.name} has been refunded.`,
    };
    await notify({
      userId: payment.registration.team.captainId,
      title: `Payment ${status.toLowerCase()}`,
      message: messages[status],
      type: "PAYMENT",
      link: "#/dashboard/payment",
    });

    return ok({ payment: updated });
  } catch (e) {
    return handleRouteError(e);
  }
}
