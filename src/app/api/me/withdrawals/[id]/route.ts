import { db } from "@/lib/db";
import { requireUser, ApiError } from "@/lib/auth";
import { logActivity, notify } from "@/lib/activity";
import { validatePhone, validateMethod, validateAccountNumber, notifyWithdrawalStaff } from "@/lib/withdrawals";
import { handleRouteError, ok, readJson } from "@/lib/route-helpers";

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/me/withdrawals/[id] — resubmit corrected payment details
// (only when the request is in REQUIRES_CORRECTION, i.e. admin-requested)
export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const body = await readJson<Record<string, unknown>>(req);

    const contactPhone = validatePhone(body.contactPhone);
    const method = validateMethod(body.method);
    const accountNumber = validateAccountNumber(body.accountNumber);

    const w = await db.prizeWithdrawal.findUnique({
      where: { id },
      include: {
        team: { select: { captainId: true, name: true } },
        tournament: { select: { name: true } },
      },
    });
    if (!w) throw new ApiError("Withdrawal request not found.", 404);

    // Strict ownership: a user may never manage another team's request
    if (w.team.captainId !== user.id)
      throw new ApiError("You can only manage your own team's withdrawal requests.", 403);

    if (w.status !== "REQUIRES_CORRECTION")
      throw new ApiError(
        "This request is not open for resubmission. An administrator must request corrections or explicitly reopen it first.",
        409
      );

    const updated = await db.prizeWithdrawal.update({
      where: { id },
      data: {
        contactPhone,
        method,
        accountNumber,
        status: "UNDER_REVIEW",
        adminNote: null,
        reviewedById: null,
        reviewedAt: null,
        events: {
          create: {
            action: "RESUBMITTED",
            status: "UNDER_REVIEW",
            note: `Corrected payout details: ${method} to ${accountNumber}`,
            actorName: user.name,
          },
        },
      },
    });

    await logActivity({
      user,
      action: "Resubmitted prize withdrawal",
      entity: "PrizeWithdrawal",
      entityId: id,
      previousValue: { status: w.status, method: w.method },
      newValue: { status: "UNDER_REVIEW", method },
    });

    await notify({
      userId: user.id,
      title: "Withdrawal resubmitted",
      message: `Your corrected withdrawal details for ${w.tournament.name} (${w.requestNo}) have been resubmitted and are Under Review again.`,
      type: "PAYMENT",
      link: "/dashboard/withdraw",
    });

    await notifyWithdrawalStaff(
      "Withdrawal request resubmitted",
      `${w.team.name} resubmitted corrected details for ${w.tournament.name} (${w.requestNo}) — awaiting verification.`
    );

    return ok({ withdrawal: { id: updated.id, status: updated.status } });
  } catch (e) {
    return handleRouteError(e);
  }
}
