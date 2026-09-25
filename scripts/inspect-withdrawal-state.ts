// Inspect tournament / prize / withdrawal state to diagnose the missing withdrawal form
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const tournaments = await db.tournament.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true, name: true, status: true, resultsLocked: true, lockedAt: true,
      prizePool: true, prizeConfig: true, matchCount: true,
    },
  });

  console.log("=== TOURNAMENTS ===");
  for (const t of tournaments) {
    const matches = await db.match.count({ where: { tournamentId: t.id } });
    const published = await db.match.count({ where: { tournamentId: t.id, resultPublished: true } });
    const prizes = await db.prize.findMany({ where: { tournamentId: t.id } });
    console.log(`\n- ${t.name} [${t.status}] locked=${t.resultsLocked} lockedAt=${t.lockedAt?.toISOString() ?? "—"}`);
    console.log(`  matches: ${matches} (published results: ${published}/${t.matchCount} planned)`);
    console.log(`  prizePool=${t.prizePool} prizeConfig=${t.prizeConfig}`);
    if (prizes.length === 0) console.log("  prizes: NONE in Prize table");
    for (const p of prizes) {
      const w = await db.prizeWithdrawal.findUnique({ where: { prizeId: p.id } });
      const team = p.winnerTeamId ? await db.team.findUnique({ where: { id: p.winnerTeamId }, select: { name: true } }) : null;
      console.log(`  prize "${p.name}" ৳${p.amount} status=${p.status} winner=${team?.name ?? "—unassigned—"} withdrawal=${w ? w.requestNo + "/" + w.status : "none"}`);
    }
  }

  console.log("\n=== WITHDRAWALS ===");
  const wds = await db.prizeWithdrawal.findMany();
  if (wds.length === 0) console.log("(none)");
  for (const w of wds) {
    console.log(`- ${w.requestNo} pos=${w.position} status=${w.status} createdAt=${w.createdAt.toISOString()}`);
  }

  console.log("\n=== RECENT ACTIVITY (last 15) ===");
  const acts = await db.activityLog.findMany({ orderBy: { createdAt: "desc" }, take: 15 });
  for (const a of acts) {
    console.log(`- ${a.createdAt.toISOString()} ${a.userName}: ${a.action} (${a.entity}) ${a.newValue ? JSON.stringify(a.newValue).slice(0, 120) : ""}`);
  }
}

main().finally(() => db.$disconnect());
