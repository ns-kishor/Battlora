import { db } from "@/lib/db";
import { requirePermission, ApiError } from "@/lib/auth";
import { logActivity, notify } from "@/lib/activity";
import {
  WITHDRAWAL_ACTION_RULES,
  positionFromPrizeName,
  type WithdrawalAction,
} from "@/lib/withdrawals";
import { POSITION_LABELS } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { handleRouteError, ok, readJson, str } from "@/lib/route-helpers";

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/admin/withdrawals/[id] — verify and advance a withdrawal request.
// Actions: APPROVE | REJECT | REQUEST_CORRECTION | MARK_PROCESSING | MARK_PAID |
// REOPEN | NOTE. Every action is audit-logged; status changes notify the winner.
export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const user = await requirePermission("payments.manage");
    const { id } = await ctx.params;
    const body = await readJson<Record<string, unknown>>(req);

    const action = str(body.action).toUpperCase() as WithdrawalAction;
    const rule = WITHDRAWAL_ACTION_RULES[action];
    if (!rule) throw new ApiError("Unknown withdrawal action.", 400);

    const note = str(body.note);
    if (rule.requiresNote && !note)
      throw new ApiError(
        `A note or reason is required for this action (${action.replace(/_/g, " ").toLowerCase()}).`,
        400
      );
    if (note.length > 1000) throw new ApiError("Note is too long (max 1000 characters).", 400);

    const w = await db.prizeWithdrawal.findUnique({
      where: { id },
      include: {
        team: { select: { id: true, name: true, captainId: true } },
        tournament: { select: { id: true, name: true, resultsLocked: true } },
        prize: { select: { id: true, name: true, amount: true, winnerTeamId: true } },
      },
    });
    if (!w) throw new ApiError("Withdrawal request not found.", 404);

    if (!rule.from.includes(w.status))
      throw new ApiError(
        `Cannot ${action.replace(/_/g, " ").toLowerCase()} a request with status "${w.status.replace(/_/g, " ").toLowerCase()}".`,
        409
      );

    // Winner eligibility re-verification against the finalized result before any
    // payout-progressing action (spec §6: eligibility must come from the DB).
    if (["APPROVE", "MARK_PROCESSING", "MARK_PAID"].includes(action)) {
      const eligibilityOk =
        w.tournament.resultsLocked &&
        w.prize.winnerTeamId === w.team.id &&
        positionFromPrizeName(w.prize.name) === w.position;
      if (!eligibilityOk)
        throw new ApiError(
          "Eligibility verification failed: the finalized tournament result no longer recognizes this team as the official winner of this position.",
          409
        );
    }

    const updated = await db.prizeWithdrawal.update({
      where: { id },
      data: {
        ...(rule.to ? { status: rule.to } : {}),
        ...(rule.clearsAdminNote ? { adminNote: null } : {}),
        ...(note && action !== "NOTE" ? { adminNote: note } : {}),
        ...(action === "APPROVE" ? { reviewedById: user.id, reviewedAt: new Date() } : {}),
        ...(action === "MARK_PAID" ? { paidAt: new Date(), reviewedById: user.id } : {}),
        events: {
          create: {
            action: rule.eventAction,
            status: rule.to ?? w.status,
            note: note || null,
            internal: action === "NOTE",
            actorName: user.name,
          },
        },
      },
    });

    // Keep the prize ledger in sync once the payout completes
    if (action === "MARK_PAID") {
      await db.prize.update({
        where: { id: w.prize.id },
        data: { status: "PAID", paidAt: new Date() },
      });
    }

    await logActivity({
      user,
      action: `Withdrawal ${rule.eventAction.toLowerCase().replace(/_/g, " ")}`,
      entity: "PrizeWithdrawal",
      entityId: id,
      previousValue: { status: w.status, adminNote: w.adminNote ?? null },
      newValue: {
        requestNo: w.requestNo,
        team: w.team.name,
        tournament: w.tournament.name,
        status: rule.to ?? w.status,
        note: note || undefined,
      },
    });

    if (rule.notifiesWinner) {
      const context =
        action === "MARK_PAID"
          ? `Your ${POSITION_LABELS[w.position] ?? `${w.position}`} prize of ${formatMoney(w.prize.amount)} for ${w.tournament.name} has been transferred via ${w.method}. Request ${w.requestNo}.`
          : `${rule.notifiesWinner} (${w.requestNo} — ${w.tournament.name})${note && action !== "MARK_PAID" ? ` Reason: ${note}` : ""}`;
      await notify({
        userId: w.team.captainId,
        title: `Prize withdrawal ${updated.status.replace(/_/g, " ").toLowerCase()}`,
        message: context,
        type: "PAYMENT",
        link: "/dashboard/withdraw",
      });
    }

    return ok({ withdrawal: { id: updated.id, status: updated.status } });
  } catch (e) {
    return handleRouteError(e);
  }
}
