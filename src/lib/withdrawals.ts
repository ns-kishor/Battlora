import { db } from "@/lib/db";
import { ApiError } from "@/lib/auth";
import { notify } from "@/lib/activity";
import { getTournamentLeaderboard } from "@/lib/scoring";
import { WITHDRAWAL_METHODS, POSITION_LABELS } from "@/lib/types";

// ============================================================
// Prize withdrawal domain logic (spec: Prize Withdrawal System)
// Eligibility comes ONLY from finalized results stored in the DB
// (tournament.resultsLocked + prize.winnerTeamId). Positions are
// derived server-side — never trusted from the client.
// ============================================================

/** Maps a prize name to a podium position (1st/2nd/3rd only). Mirrors lock-route naming. */
export function positionFromPrizeName(name: string): 1 | 2 | 3 | null {
  const n = name.toLowerCase();
  if (n.includes("1st") || n.includes("champion")) return 1;
  if (n.includes("2nd") || n.includes("runner")) return 2;
  if (n.includes("3rd")) return 3;
  return null;
}

/** Cleans and validates a BD-style contact phone number. */
export function validatePhone(input: unknown): string {
  const s = typeof input === "string" ? input.replace(/[\s-]/g, "").trim() : "";
  if (!s) throw new ApiError("Contact phone number is required.", 400);
  if (!/^(\+?880|0)?1\d{9}$/.test(s))
    throw new ApiError("Enter a valid mobile number (e.g. 01712345678).", 400);
  return s;
}

/** Cleans and validates a mobile-wallet account number. */
export function validateAccountNumber(input: unknown): string {
  const s = typeof input === "string" ? input.replace(/[\s-]/g, "").trim() : "";
  if (!s) throw new ApiError("Account number is required.", 400);
  if (!/^\d{8,15}$/.test(s))
    throw new ApiError("Account number must be 8–15 digits (your wallet number).", 400);
  return s;
}

export function validateMethod(input: unknown): string {
  const s = typeof input === "string" ? input.trim() : "";
  if (!(WITHDRAWAL_METHODS as readonly string[]).includes(s))
    throw new ApiError("Payment method must be bKash, Nagad, Upay or Rocket.", 400);
  return s;
}

/**
 * Authoritative eligibility check for a prize + team. Throws ApiError when the
 * team is not the officially recorded winner of a locked tournament podium prize.
 */
export async function assertWithdrawalEligibility(prizeId: string, teamId: string) {
  const prize = await db.prize.findUnique({
    where: { id: prizeId },
    include: { tournament: { select: { id: true, name: true, resultsLocked: true } }, withdrawal: true },
  });
  if (!prize) throw new ApiError("Prize not found.", 404);
  if (!prize.tournament.resultsLocked)
    throw new ApiError(
      "Prize withdrawal opens only after the administrator publishes the final results for this tournament.",
      403
    );
  const position = positionFromPrizeName(prize.name);
  if (!position)
    throw new ApiError("This prize is not part of the podium withdrawal workflow.", 403);
  if (prize.winnerTeamId !== teamId)
    throw new ApiError("Your team is not the officially recorded winner of this prize.", 403);
  return { prize, position };
}

/**
 * Eligible podium prizes for a captain's team: locked tournaments where the
 * team holds an official 1st/2nd/3rd-place prize. Non-winners get [].
 */
export async function getEligiblePrizes(userId: string) {
  const team = await db.team.findUnique({
    where: { captainId: userId },
    select: { id: true, name: true, logoUrl: true, contactNumber: true },
  });
  if (!team) return { team: null, eligible: [] as EligiblePrizeRow[] };

  const prizes = await db.prize.findMany({
    where: { winnerTeamId: team.id },
    include: {
      tournament: { select: { id: true, name: true, slug: true, resultsLocked: true } },
      withdrawal: { include: { events: { orderBy: { createdAt: "asc" } } } },
    },
    orderBy: { amount: "desc" },
  });

  const eligible: EligiblePrizeRow[] = prizes
    .filter((p) => p.tournament.resultsLocked && positionFromPrizeName(p.name))
    .map((p) => {
      const position = positionFromPrizeName(p.name)!;
      const w = p.withdrawal;
      return {
        prizeId: p.id,
        position,
        positionLabel: POSITION_LABELS[position],
        prizeName: p.name,
        amount: p.amount,
        tournament: { id: p.tournament.id, name: p.tournament.name },
        status: w ? w.status : "NOT_SUBMITTED",
        withdrawal: w
          ? {
              id: w.id,
              requestNo: w.requestNo,
              contactPhone: w.contactPhone,
              method: w.method,
              accountNumber: w.accountNumber,
              status: w.status,
              adminNote: w.adminNote,
              submittedAt: w.createdAt,
              paidAt: w.paidAt,
              events: w.events
                .filter((e) => !e.internal)
                .map((e) => ({
                  action: e.action,
                  status: e.status,
                  note: e.note,
                  actorName: e.actorName,
                  createdAt: e.createdAt,
                })),
            }
          : null,
      };
    });

  return { team, eligible };
}

/**
 * Provisional podium for a captain's team: tournaments that are NOT yet
 * locked (final results not officially published) where the team currently
 * stands in the top 3. Purely informational — based on the same public
 * standings the leaderboards page shows. The withdrawal form itself opens
 * only after the administrator locks the final results.
 */
export async function getPendingPodium(teamId: string): Promise<PendingPodiumRow[]> {
  const regs = await db.registration.findMany({
    where: {
      teamId,
      status: "APPROVED",
      tournament: { resultsLocked: false, status: { in: ["ONGOING", "COMPLETED"] } },
    },
    include: {
      tournament: { select: { id: true, name: true, status: true, matchCount: true, prizeConfig: true } },
    },
  });

  const pending: PendingPodiumRow[] = [];
  for (const r of regs) {
    const t = r.tournament;
    const standings = await getTournamentLeaderboard(t.id);
    const row = standings.find((x) => x.teamId === teamId);
    if (!row || row.rank > 3 || row.disqualified || row.banned) continue;

    // Provisional prize amount for the position currently held
    const prizeRows = await db.prize.findMany({ where: { tournamentId: t.id } });
    let amount = prizeRows
      .filter((p) => positionFromPrizeName(p.name) === row.rank)
      .reduce((sum, p) => sum + p.amount, 0);
    if (amount === 0) {
      try {
        const cfg = JSON.parse(t.prizeConfig || "[]") as { name?: string; amount?: number }[];
        amount = cfg
          .filter((c) => c?.name && positionFromPrizeName(c.name) === row.rank)
          .reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
      } catch {
        amount = 0;
      }
    }

    pending.push({
      tournament: { id: t.id, name: t.name },
      position: row.rank as 1 | 2 | 3,
      positionLabel: POSITION_LABELS[row.rank] ?? `${row.rank}th Place`,
      provisionalAmount: amount,
      tournamentStatus: t.status,
      matchesPlayed: row.matchesPlayed,
      matchesPlanned: t.matchCount,
    });
  }
  return pending;
}

export type PendingPodiumRow = {
  tournament: { id: string; name: string };
  position: 1 | 2 | 3;
  positionLabel: string;
  provisionalAmount: number;
  tournamentStatus: string;
  matchesPlayed: number;
  matchesPlanned: number;
};

export type EligiblePrizeRow = {
  prizeId: string;
  position: number;
  positionLabel: string;
  prizeName: string;
  amount: number;
  tournament: { id: string; name: string };
  status: string;
  withdrawal:
    | {
        id: string;
        requestNo: string;
        contactPhone: string;
        method: string;
        accountNumber: string;
        status: string;
        adminNote: string | null;
        submittedAt: Date;
        paidAt: Date | null;
        events: {
          action: string;
          status: string;
          note: string | null;
          actorName: string;
          createdAt: Date;
        }[];
      }
    | null;
};

/** Notify staff roles that can verify payouts about a new/resubmitted request. */
export async function notifyWithdrawalStaff(title: string, message: string) {
  const staff = await db.user.findMany({
    where: { role: { in: ["SUPER_ADMIN", "TOURNAMENT_ADMIN", "FINANCE"] }, status: "ACTIVE" },
    select: { id: true },
  });
  await Promise.all(staff.map((u) => notify({ userId: u.id, title, message, type: "PAYMENT", link: "/admin/withdrawals" })));
}

// ---------- Admin action state machine (spec §3–§5) ----------

export type WithdrawalAction =
  | "APPROVE"
  | "REJECT"
  | "REQUEST_CORRECTION"
  | "MARK_PROCESSING"
  | "MARK_PAID"
  | "REOPEN"
  | "NOTE";

type ActionRule = {
  from: string[];
  to: string | null; // null = no status change (internal note)
  eventAction: string;
  requiresNote: boolean;
  clearsAdminNote: boolean;
  notifiesWinner: string | null;
};

export const WITHDRAWAL_ACTION_RULES: Record<WithdrawalAction, ActionRule> = {
  APPROVE: {
    from: ["UNDER_REVIEW"],
    to: "APPROVED",
    eventAction: "APPROVED",
    requiresNote: false,
    clearsAdminNote: true,
    notifiesWinner: "Your prize withdrawal request has been approved. Payment is being arranged.",
  },
  REJECT: {
    from: ["UNDER_REVIEW", "APPROVED", "PAYMENT_PROCESSING"],
    to: "REJECTED",
    eventAction: "REJECTED",
    requiresNote: true,
    clearsAdminNote: false,
    notifiesWinner: "Your prize withdrawal request was rejected. See the reason in your dashboard.",
  },
  REQUEST_CORRECTION: {
    from: ["UNDER_REVIEW", "APPROVED", "PAYMENT_PROCESSING"],
    to: "REQUIRES_CORRECTION",
    eventAction: "CORRECTION_REQUESTED",
    requiresNote: true,
    clearsAdminNote: false,
    notifiesWinner: "Your withdrawal request needs corrected information. Please resubmit from your dashboard.",
  },
  MARK_PROCESSING: {
    from: ["APPROVED"],
    to: "PAYMENT_PROCESSING",
    eventAction: "PAYMENT_PROCESSING",
    requiresNote: false,
    clearsAdminNote: true,
    notifiesWinner: "Your prize payment is now being processed.",
  },
  MARK_PAID: {
    from: ["APPROVED", "PAYMENT_PROCESSING"],
    to: "PAID",
    eventAction: "PAID",
    requiresNote: false,
    clearsAdminNote: false,
    notifiesWinner: "Your prize payment has been completed. Congratulations!",
  },
  REOPEN: {
    from: ["REJECTED"],
    to: "REQUIRES_CORRECTION",
    eventAction: "REOPENED",
    requiresNote: false,
    clearsAdminNote: false,
    notifiesWinner: "Your withdrawal request has been reopened — you may resubmit corrected details.",
  },
  NOTE: {
    from: ["UNDER_REVIEW", "APPROVED", "PAYMENT_PROCESSING", "PAID", "REJECTED", "REQUIRES_CORRECTION"],
    to: null,
    eventAction: "NOTE",
    requiresNote: true,
    clearsAdminNote: false,
    notifiesWinner: null,
  },
};
