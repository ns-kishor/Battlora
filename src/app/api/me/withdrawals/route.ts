import { db } from "@/lib/db";
import { requireUser, ApiError } from "@/lib/auth";
import { logActivity, notify, nextSequenceId } from "@/lib/activity";
import {
  getEligiblePrizes,
  assertWithdrawalEligibility,
  validatePhone,
  validateMethod,
  validateAccountNumber,
  notifyWithdrawalStaff,
} from "@/lib/withdrawals";
import { POSITION_LABELS } from "@/lib/types";
import { handleRouteError, ok, readJson, str } from "@/lib/route-helpers";

// GET /api/me/withdrawals — eligible podium prizes + my withdrawal requests
export async function GET() {
  try {
    const user = await requireUser();
    const { team, eligible } = await getEligiblePrizes(user.id);
    return ok({ team, eligible, phone: user.phone ?? null });
  } catch (e) {
    return handleRouteError(e);
  }
}

// POST /api/me/withdrawals — submit a prize withdrawal request (eligible winners only)
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await readJson<Record<string, unknown>>(req);

    const prizeId = str(body.prizeId);
    if (!prizeId) throw new ApiError("Prize is required.", 400);
    const contactPhone = validatePhone(body.contactPhone);
    const method = validateMethod(body.method);
    const accountNumber = validateAccountNumber(body.accountNumber);

    const team = await db.team.findUnique({
      where: { captainId: user.id },
      select: { id: true, name: true },
    });
    if (!team)
      throw new ApiError(
        "Only captains of officially recognized winning teams can request prize withdrawals.",
        403
      );

    // Authoritative eligibility: locked results + official winner of a podium prize
    const { prize, position } = await assertWithdrawalEligibility(prizeId, team.id);

    // Duplicate prevention — one request per prize (= per tournament + position)
    if (prize.withdrawal)
      throw new ApiError(
        "A withdrawal request already exists for this tournament and position. Duplicate requests are not allowed.",
        409
      );

    const requestNo = await nextSequenceId("WDL");
    const withdrawal = await db.prizeWithdrawal.create({
      data: {
        requestNo,
        prizeId: prize.id,
        tournamentId: prize.tournament.id,
        teamId: team.id,
        position,
        contactPhone,
        method,
        accountNumber,
        status: "UNDER_REVIEW",
        submittedById: user.id,
        events: {
          create: {
            action: "SUBMITTED",
            status: "UNDER_REVIEW",
            note: `Payout requested via ${method} to ${accountNumber}`,
            actorName: user.name,
          },
        },
      },
    });

    await logActivity({
      user,
      action: "Submitted prize withdrawal",
      entity: "PrizeWithdrawal",
      entityId: withdrawal.id,
      newValue: {
        requestNo,
        tournament: prize.tournament.name,
        position: POSITION_LABELS[position],
        method,
        amount: prize.amount,
      },
    });

    await notify({
      userId: user.id,
      title: "Withdrawal request submitted",
      message: `Your ${POSITION_LABELS[position]} prize withdrawal request for ${prize.tournament.name} (${requestNo}) is now Under Review. You will be notified once it is processed.`,
      type: "PAYMENT",
      link: "/dashboard/withdraw",
    });

    await notifyWithdrawalStaff(
      "New prize withdrawal request",
      `${team.name} submitted a ${POSITION_LABELS[position]} prize withdrawal for ${prize.tournament.name} (${requestNo}) — awaiting verification.`
    );

    return ok(
      {
        withdrawal: {
          id: withdrawal.id,
          requestNo: withdrawal.requestNo,
          status: withdrawal.status,
        },
      },
      201
    );
  } catch (e) {
    return handleRouteError(e);
  }
}
