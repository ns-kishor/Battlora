// ============================================================
// E2E: Prize Withdrawal — "no withdrawal form after publishing
// final results" bug fix verification.
//
// Reproduces the reported conditions on a TEMP tournament:
//   - created via admin form (prizes only in prizeConfig JSON,
//     NO Prize rows — the latent bug)
//   - match results published, tournament NOT yet locked
// Then locks via the real API and verifies:
//   1. Prize rows materialize automatically from prizeConfig
//   2. 1st/2nd/3rd winners assigned from final standings
//   3. Podium captains get winner-specific notifications
//      linking to the withdrawal form
//   4. Winner sees the withdrawal form (eligible row)
//   5. Winner can submit the withdrawal request
//   6. pending (provisional podium) works on real Pro Series data
// Finally cleans up ALL test data.
// ============================================================
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const BASE = "http://localhost:3000";
const NAME = "QA Withdraw Flow Cup 2026";
const SLUG = "qa-withdraw-flow-cup-2026";

let pass = 0;
let fail = 0;
function check(label: string, cond: boolean, extra = "") {
  if (cond) {
    pass++;
    console.log(`  ✅ ${label}`);
  } else {
    fail++;
    console.log(`  ❌ ${label} ${extra}`);
  }
}

function jar(): { cookie: string } {
  return { cookie: "" };
}
async function login(email: string, password: string, c: { cookie: string }) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`login failed for ${email}: ${res.status}`);
  const setCookie = res.headers.get("set-cookie");
  if (!setCookie) throw new Error(`no set-cookie for ${email}`);
  c.cookie = setCookie.split(";")[0];
  return res.json();
}
async function api(
  c: { cookie: string },
  path: string,
  init: { method?: string; body?: unknown } = {}
) {
  const res = await fetch(`${BASE}${path}`, {
    method: init.method ?? "GET",
    headers: { "content-type": "application/json", cookie: c.cookie },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  let json: any = null;
  try {
    json = await res.json();
  } catch {}
  return { status: res.status, json };
}

async function main() {
  console.log("== SETUP: temp tournament in the exact bug condition ==");
  const [alpha, bravo, delta, echo] = await Promise.all(
    ["Team Alpha", "Team Bravo", "Team Delta", "Team Echo"].map((n) =>
      db.team.findUnique({ where: { name: n }, include: { captain: true } })
    )
  );
  if (!alpha || !bravo || !delta || !echo) throw new Error("seeded teams not found");

  const prizeConfig = [
    { name: "1st Prize", amount: 8000, description: "Champion" },
    { name: "2nd Prize", amount: 5000 },
    { name: "3rd Prize", amount: 2000 },
  ];
  const tournament = await db.tournament.create({
    data: {
      name: NAME,
      slug: SLUG,
      status: "ONGOING",
      matchCount: 1,
      prizePool: 15000,
      prizeConfig: JSON.stringify(prizeConfig),
      tournamentStart: new Date(),
    },
  });
  const regIds: string[] = [];
  for (const [i, team] of [alpha, bravo, delta, echo].entries()) {
    const reg = await db.registration.create({
      data: {
        regId: `REG-QA-${String(i + 1).padStart(5, "0")}`,
        tournamentId: tournament.id,
        teamId: team.id,
        status: "APPROVED",
        agreementAccepted: true,
      },
    });
    regIds.push(reg.id);
  }
  const match = await db.match.create({
    data: {
      tournamentId: tournament.id,
      matchNumber: 1,
      date: new Date(),
      status: "COMPLETED",
      resultPublished: true,
      publishedAt: new Date(),
    },
  });
  const resultData: [typeof alpha, number, number, number][] = [
    [alpha, 1, 8, 20],
    [bravo, 2, 5, 15],
    [delta, 3, 3, 11],
  ];
  for (const [team, placement, kills, points] of resultData) {
    await db.matchResult.create({
      data: {
        matchId: match.id,
        teamId: team.id,
        placement,
        kills,
        placementPoints: 12,
        killPoints: kills,
        totalPoints: points,
        published: true,
      },
    });
  }
  console.log(`  tournament ${tournament.id} (${NAME}), 4 approved teams, 1 published match, NO Prize rows`);

  const admin = jar();
  const captain = jar();
  await login("admin@battlora.gg", "Admin@123", admin);
  await login("captain@battlora.gg", "Captain@123", captain);
  console.log("  logged in admin + Team Alpha captain");

  try {
    // -------- 1. Captain view BEFORE lock: provisional podium --------
    console.log("\n== BEFORE LOCK: captain sees provisional podium, no form ==");
    let r = await api(captain, "/api/me/withdrawals");
    check("GET /api/me/withdrawals 200", r.status === 200);
    const beforePending = r.json?.pending ?? [];
    const qaPending = beforePending.find((p: any) => p.tournament?.name === NAME);
    check("provisional row for the unlocked tournament", !!qaPending);
    check("provisional position = 1st", qaPending?.position === 1, JSON.stringify(qaPending));
    check("provisional amount = 8000 (from prizeConfig)", qaPending?.provisionalAmount === 8000);
    check("no eligible form yet", (r.json?.eligible ?? []).length === 0);

    // -------- 2. Lock via the real API --------
    console.log("\n== LOCK: POST /api/tournaments/[id]/lock ==");
    r = await api(admin, `/api/tournaments/${tournament.id}/lock`, { method: "POST", body: {} });
    check("lock 200", r.status === 200, JSON.stringify(r.json).slice(0, 200));

    const tAfter = await db.tournament.findUnique({ where: { id: tournament.id } });
    check("resultsLocked = true", tAfter?.resultsLocked === true);
    check("status = COMPLETED", tAfter?.status === "COMPLETED");

    const prizes = await db.prize.findMany({ where: { tournamentId: tournament.id } });
    check("Prize rows auto-created from prizeConfig (3)", prizes.length === 3, `got ${prizes.length}`);
    const byName = (n: string) => prizes.find((p) => p.name === n);
    check("1st Prize → Team Alpha", byName("1st Prize")?.winnerTeamId === alpha.id);
    check("2nd Prize → Team Bravo", byName("2nd Prize")?.winnerTeamId === bravo.id);
    check("3rd Prize → Team Delta", byName("3rd Prize")?.winnerTeamId === delta.id);

    // -------- 3. Winner notifications --------
    console.log("\n== NOTIFICATIONS: winners actively notified ==");
    const notif = await db.notification.findMany({
      where: { message: { contains: NAME } },
      orderBy: { createdAt: "asc" },
    });
    const winnerNotifs = notif.filter((n) => n.title.startsWith("You finished"));
    check("4 notifications sent (3 winners + 1 non-winner)", notif.length === 4, `got ${notif.length}`);
    check("Alpha captain got winner notification", winnerNotifs.some((n) => n.userId === alpha.captainId && n.title.includes("1st")));
    check("Bravo captain got winner notification", winnerNotifs.some((n) => n.userId === bravo.captainId && n.title.includes("2nd")));
    check("Delta captain got winner notification", winnerNotifs.some((n) => n.userId === delta.captainId && n.title.includes("3rd")));
    check("winner notifications link to /dashboard/withdraw", winnerNotifs.every((n) => n.link === "/dashboard/withdraw"));
    check("winner notification mentions amount ৳8,000", winnerNotifs.some((n) => n.userId === alpha.captainId && n.message.includes("8,000")));
    check("Echo captain got generic (non-winner) notification", notif.some((n) => n.userId === echo.captainId && n.title === "Final results locked"));

    // -------- 4. Captain view AFTER lock: form unlocked --------
    console.log("\n== AFTER LOCK: withdrawal form unlocked for winner ==");
    r = await api(captain, "/api/me/withdrawals");
    const eligible = r.json?.eligible ?? [];
    const qaEligible = eligible.find((p: any) => p.tournament?.name === NAME);
    check("eligible row appears for 1st place", !!qaEligible);
    check("status = NOT_SUBMITTED", qaEligible?.status === "NOT_SUBMITTED");
    check("amount = 8000", qaEligible?.amount === 8000);
    check("position label = 1st Place", qaEligible?.positionLabel === "1st Place");
    check("provisional row removed after lock", !(r.json?.pending ?? []).some((p: any) => p.tournament?.name === NAME));

    // -------- 5. Submit withdrawal --------
    console.log("\n== SUBMIT: winner submits the withdrawal form ==");
    r = await api(captain, "/api/me/withdrawals", {
      method: "POST",
      body: { prizeId: qaEligible?.prizeId, contactPhone: "01712345678", method: "bKash", accountNumber: "01712345678" },
    });
    check("submit 201", r.status === 201, JSON.stringify(r.json).slice(0, 200));
    const withdrawal = await db.prizeWithdrawal.findFirst({ where: { tournamentId: tournament.id } });
    check("withdrawal created UNDER_REVIEW", withdrawal?.status === "UNDER_REVIEW");
    check("position derived server-side = 1", withdrawal?.position === 1);

    // Duplicate blocked
    r = await api(captain, "/api/me/withdrawals", {
      method: "POST",
      body: { prizeId: qaEligible?.prizeId, contactPhone: "01712345678", method: "bKash", accountNumber: "01712345678" },
    });
    check("duplicate submit blocked (409)", r.status === 409);

    // -------- 6. Admin side: list + approve + pay --------
    console.log("\n== ADMIN: sees the request and pays it ==");
    r = await api(admin, "/api/admin/withdrawals");
    const listed = (r.json?.withdrawals ?? []).find((w: any) => w.requestNo === withdrawal?.requestNo);
    check("admin list contains the request", !!listed);
    r = await api(admin, `/api/admin/withdrawals/${withdrawal?.id}`, { method: "PATCH", body: { action: "APPROVE" } });
    check("approve 200", r.status === 200);
    r = await api(admin, `/api/admin/withdrawals/${withdrawal?.id}`, { method: "PATCH", body: { action: "MARK_PAID" } });
    check("mark paid 200", r.status === 200);
    const paidPrize = await db.prize.findFirst({ where: { id: qaEligible?.prizeId } });
    check("Prize ledger synced to PAID", paidPrize?.status === "PAID");
    const paidNotif = await db.notification.findFirst({
      where: { userId: alpha.captainId, message: { contains: "has been transferred" } },
    });
    check("winner received clear paid confirmation", !!paidNotif);

    // -------- 7. Pro Series pending still intact (real data regression) --------
    console.log("\n== REGRESSION: Pro Series provisional podium still shown ==");
    r = await api(captain, "/api/me/withdrawals");
    const proPending = (r.json?.pending ?? []).find((p: any) => p.tournament?.name?.includes("Pro Series"));
    check("Alpha still sees provisional 1st for Pro Series (unlocked)", proPending?.position === 1, JSON.stringify(proPending));
    check("Pro Series provisional amount = 12000", proPending?.provisionalAmount === 12000);
  } finally {
    // -------- CLEANUP --------
    console.log("\n== CLEANUP ==");
    const withdrawal = await db.prizeWithdrawal.findFirst({ where: { tournamentId: tournament.id } });
    if (withdrawal) {
      await db.activityLog.deleteMany({ where: { entityId: withdrawal.id } });
    }
    await db.notification.deleteMany({ where: { message: { contains: NAME } } });
    await db.notification.deleteMany({
      where: { userId: alpha!.captainId, message: { contains: "has been transferred" } },
    });
    await db.activityLog.deleteMany({ where: { entityId: tournament.id } });
    await db.activityLog.deleteMany({ where: { newValue: { contains: NAME } } });
    await db.tournament.delete({ where: { id: tournament.id } }); // cascades: regs, match, results, prizes, withdrawal, events
    await db.registration.deleteMany({ where: { regId: { startsWith: "REG-QA-" } } });
    const leftoverNotif = await db.notification.count({ where: { message: { contains: NAME } } });
    const leftoverPrize = await db.prize.count({ where: { tournamentId: tournament.id } });
    check("test data fully removed", leftoverNotif === 0 && leftoverPrize === 0);
  }

  console.log(`\n== RESULT: ${pass} passed, ${fail} failed ==`);
  if (fail > 0) process.exitCode = 1;
}

main().finally(() => db.$disconnect());
