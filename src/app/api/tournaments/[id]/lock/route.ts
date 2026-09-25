import { db } from "@/lib/db";
import { requirePermission, ApiError } from "@/lib/auth";
import { logActivity, notify } from "@/lib/activity";
import { getTournamentLeaderboard } from "@/lib/scoring";
import { handleRouteError, ok } from "@/lib/route-helpers";
import { positionFromPrizeName } from "@/lib/withdrawals";
import { formatMoney } from "@/lib/format";
import { POSITION_LABELS } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

// POST /api/tournaments/[id]/lock — lock final results (PRD 54)
// This is the step that officially "publishes the final results":
// it finalizes the leaderboard, assigns prize winners from the standings,
// notifies the podium teams that they can withdraw their prize money and
// marks the tournament as COMPLETED.
export async function POST(_req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const user = await requirePermission("tournaments.manage");

    const tournament = await db.tournament.findFirst({
      where: { OR: [{ id }, { slug: id }] },
    });
    if (!tournament) throw new ApiError("Tournament not found.", 404);
    if (tournament.resultsLocked)
      throw new ApiError("Final results are already locked.", 409);

    const leaderboard = await getTournamentLeaderboard(tournament.id);
    const champion = leaderboard.find((r) => r.rank === 1);
    const runnerUp = leaderboard.find((r) => r.rank === 2);
    const third = leaderboard.find((r) => r.rank === 3);
    const topKiller = [...leaderboard].sort((a, b) => b.kills - a.kills)[0];

    // Tournaments created from the admin form keep prizes only in
    // prizeConfig JSON — materialize real Prize rows so winners can be
    // assigned and withdrawals can reference them.
    let prizes = await db.prize.findMany({ where: { tournamentId: tournament.id } });
    if (prizes.length === 0) {
      let config: { name?: string; amount?: number; description?: string }[] = [];
      try {
        config = JSON.parse(tournament.prizeConfig || "[]");
      } catch {
        config = [];
      }
      if (Array.isArray(config) && config.length > 0) {
        for (const c of config) {
          if (!c || typeof c.name !== "string" || !c.name.trim()) continue;
          await db.prize.create({
            data: {
              tournamentId: tournament.id,
              name: c.name.trim(),
              amount: Math.max(0, Number(c.amount) || 0),
              description: c.description ?? null,
            },
          });
        }
        prizes = await db.prize.findMany({ where: { tournamentId: tournament.id } });
      }
    }

    // Assign prize winners from final standings
    for (const prize of prizes) {
      let winnerTeamId: string | null = null;
      const name = prize.name.toLowerCase();
      if (name.includes("1st") || name.includes("champion")) winnerTeamId = champion?.teamId ?? null;
      else if (name.includes("2nd") || name.includes("runner")) winnerTeamId = runnerUp?.teamId ?? null;
      else if (name.includes("3rd")) winnerTeamId = third?.teamId ?? null;
      else if (name.includes("kill")) winnerTeamId = topKiller?.teamId ?? null;
      else if (name.includes("mvp")) winnerTeamId = champion?.teamId ?? null;
      if (winnerTeamId && prize.winnerTeamId !== winnerTeamId) {
        await db.prize.update({
          where: { id: prize.id },
          data: { winnerTeamId },
        });
      }
    }

    const updated = await db.tournament.update({
      where: { id: tournament.id },
      data: { resultsLocked: true, lockedAt: new Date(), status: "COMPLETED" },
    });

    // Re-read prizes — the assignment loop above only updated the database,
    // so the in-memory list still carries the pre-assignment winner values.
    const assignedPrizes = await db.prize.findMany({ where: { tournamentId: tournament.id } });

    // Prize money per podium team (1st/2nd/3rd prizes only — MVP/kill
    // prizes are handled by staff outside the self-service withdrawal flow)
    const podiumPrizeByTeam = new Map<string, { position: 1 | 2 | 3; amount: number }>();
    for (const prize of assignedPrizes) {
      const position = positionFromPrizeName(prize.name);
      if (!position || !prize.winnerTeamId) continue;
      const existing = podiumPrizeByTeam.get(prize.winnerTeamId);
      podiumPrizeByTeam.set(prize.winnerTeamId, {
        position,
        amount: (existing?.position === position ? existing.amount : 0) + prize.amount,
      });
    }

    // Notifications: every registered captain is informed; podium captains
    // additionally receive a dedicated "you can now withdraw" notice that
    // links straight to the withdrawal form on their dashboard.
    const regs = await db.registration.findMany({
      where: { tournamentId: tournament.id },
      include: { team: { select: { id: true, name: true, captainId: true } } },
    });

    await Promise.all(
      regs.map((r) => {
        const podium = podiumPrizeByTeam.get(r.team.id);
        if (podium && podium.amount > 0) {
          return notify({
            userId: r.team.captainId,
            title: `You finished ${POSITION_LABELS[podium.position]} — prize money available`,
            message: `Congratulations! ${r.team.name} secured ${POSITION_LABELS[podium.position]} place in ${tournament.name} with a prize of ${formatMoney(podium.amount)}. Submit your withdrawal request from the "Withdraw Prize Money" section of your dashboard.`,
            type: "PAYMENT",
            link: "/dashboard/withdraw",
          });
        }
        return notify({
          userId: r.team.captainId,
          title: "Final results locked",
          message: `Final standings for ${tournament.name} are now official. Champion: ${champion?.teamName ?? "—"}. Thank you for competing!`,
          type: "RESULT",
        });
      })
    );

    await logActivity({
      user,
      action: "Locked final results",
      entity: "Tournament",
      entityId: tournament.id,
      previousValue: { resultsLocked: false },
      newValue: {
        resultsLocked: true,
        podium: {
          1: champion?.teamName ?? "—",
          2: runnerUp?.teamName ?? "—",
          3: third?.teamName ?? "—",
        },
        withdrawalOpenForPodium: true,
      },
    });

    return ok({ tournament: updated, champion: champion ?? null });
  } catch (e) {
    return handleRouteError(e);
  }
}
