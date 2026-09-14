/**
 * BATTLEORA SEED — rich demo dataset
 * Run: bun prisma/seed.ts   (bun auto-loads .env)
 */
import { PrismaClient } from "@prisma/client";
import { scryptSync, randomBytes } from "crypto";
import sharp from "sharp";

const db = new PrismaClient();

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

// ---------- deterministic RNG ----------
let seedState = 42;
function rnd(): number {
  seedState = (seedState * 1664525 + 1013904223) % 4294967296;
  return seedState / 4294967296;
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(rnd() * arr.length)];
}
function uid(): string {
  return String(100_000_000 + Math.floor(rnd() * 899_999_999));
}

// ---------- image generation ----------
async function pngDataUrl(svg: string): Promise<string> {
  const buf = await sharp(Buffer.from(svg)).png().toBuffer();
  return `data:image/png;base64,${buf.toString("base64")}`;
}

async function bannerImage(title: string, subtitle: string, c1: string, c2: string): Promise<string> {
  return pngDataUrl(`<svg width="1200" height="500" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/>
      </linearGradient>
    </defs>
    <rect width="1200" height="500" fill="#0a0e16"/>
    <rect width="1200" height="500" fill="url(#g)" opacity="0.55"/>
    ${Array.from({ length: 14 }, (_, i) => `<circle cx="${60 + i * 90}" cy="${rnd() * 500}" r="${1.5 + rnd() * 2.5}" fill="#ffffff" opacity="0.25"/>`).join("")}
    <text x="60" y="235" font-family="Arial Black, Arial" font-size="64" font-weight="900" fill="#ffffff">${title}</text>
    <text x="60" y="305" font-family="Arial" font-size="30" fill="#ffffff" opacity="0.85">${subtitle}</text>
    <rect x="60" y="345" width="120" height="8" fill="#ffffff" opacity="0.9"/>
  </svg>`);
}

async function logoImage(initials: string, color: string): Promise<string> {
  return pngDataUrl(`<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
    <rect width="200" height="200" rx="28" fill="#141b2c"/>
    <rect x="10" y="10" width="180" height="180" rx="22" fill="${color}" opacity="0.22"/>
    <text x="100" y="128" font-family="Arial Black, Arial" font-size="64" font-weight="900" fill="${color}" text-anchor="middle">${initials}</text>
    <circle cx="100" cy="100" r="86" fill="none" stroke="${color}" stroke-width="4" opacity="0.6"/>
  </svg>`);
}

async function receiptImage(team: string, method: string, txn: string, amount: number): Promise<string> {
  return pngDataUrl(`<svg width="700" height="420" xmlns="http://www.w3.org/2000/svg">
    <rect width="700" height="420" fill="#f4f6f8"/>
    <rect x="30" y="30" width="640" height="360" rx="14" fill="#ffffff" stroke="#d8dde5"/>
    <text x="60" y="90" font-family="Arial" font-size="26" font-weight="bold" fill="#1a2233">${method} — Send Money</text>
    <line x1="60" y1="115" x2="640" y2="115" stroke="#e5e9f0" stroke-width="2"/>
    <text x="60" y="160" font-family="Arial" font-size="20" fill="#5a6577">To: Battlora Esports</text>
    <text x="60" y="200" font-family="Arial" font-size="20" fill="#5a6577">From: ${team} (Captain)</text>
    <text x="60" y="240" font-family="Arial" font-size="20" fill="#5a6577">Amount: ৳${amount.toLocaleString()}</text>
    <text x="60" y="280" font-family="monospace" font-size="20" fill="#1a2233">TrxID: ${txn}</text>
    <text x="60" y="330" font-family="Arial" font-size="16" fill="#9aa3b2">${new Date().toLocaleString()}</text>
    <text x="60" y="365" font-family="Arial" font-size="14" fill="#c33">This is a simulated receipt for the Battlora demo.</text>
  </svg>`);
}

async function evidenceImage(label: string): Promise<string> {
  return pngDataUrl(`<svg width="640" height="360" xmlns="http://www.w3.org/2000/svg">
    <rect width="640" height="360" fill="#11151f"/>
    <rect x="14" y="14" width="612" height="332" rx="10" fill="none" stroke="#ff7a1c" stroke-width="2" opacity="0.7"/>
    <text x="40" y="60" font-family="Arial Black, Arial" font-size="24" font-weight="bold" fill="#ffffff">FREE FIRE — MATCH RECORDING</text>
    <text x="40" y="105" font-family="Arial" font-size="17" fill="#8a94a8">${label}</text>
    <rect x="40" y="130" width="560" height="180" rx="8" fill="#1a2233"/>
    <text x="60" y="175" font-family="monospace" font-size="15" fill="#c3cbdc">TIMESTAMP 18:42:07</text>
    <text x="60" y="205" font-family="monospace" font-size="15" fill="#c3cbdc">SUSPECT: suspicious aim-lock detected</text>
    <text x="60" y="235" font-family="monospace" font-size="15" fill="#c3cbdc">CLIP: final zone 1v2 situation</text>
    <text x="60" y="290" font-family="Arial" font-size="14" fill="#8a94a8">Evidence attached to Battlora complaint</text>
  </svg>`);
}

// ---------- domain helpers ----------
const SCORING = {
  placementPoints: { "1": 12, "2": 9, "3": 8, "4": 7, "5": 6, "6": 5, "7": 4, "8": 3, "9": 2, "10": 1, default: 0 },
  killPoint: 1,
};
function ppFor(placement: number): number {
  const v = (SCORING.placementPoints as Record<string, number>)[String(placement)];
  return typeof v === "number" ? v : SCORING.placementPoints.default;
}

function defaultRules(): string {
  return JSON.stringify([
    {
      category: "General Rules",
      items: [
        { type: "paragraph", text: "Welcome to the Battlora competitive series. These rules govern every match of this tournament. By registering, every player agrees to compete with fair play and respect toward opponents and staff." },
        { type: "bullets", text: "The Tournament Admin's decision is final in all disputed situations.\nTeams must be ready in the room 10 minutes before the start time.\nRoom credentials must never be shared outside your team.\nEmulators, PC and third-party controllers are strictly prohibited." },
      ],
    },
    {
      category: "Registration",
      items: [
        { type: "bullets", text: "Every player must register with their real Free Fire UID — smurf or borrowed accounts are banned.\nA player may only compete for one team per tournament.\nTeams must field the required number of main players at check-in." },
        { type: "notice", text: "Registration is only complete after payment verification. Unverified teams do not receive room credentials." },
      ],
    },
    {
      category: "Player & Device Rules",
      items: [
        { type: "bullets", text: "Minimum account level 40 for ranked tournaments.\nDevice switching mid-match is not allowed without admin approval.\nBoth gun skins and panic gloves are permitted unless stated otherwise in the announcement." },
      ],
    },
    {
      category: "Gameplay & Teaming",
      items: [
        { type: "paragraph", text: "Teaming with other squads — coordinated rotations, shared loot or intentional non-engagement — is treated as match manipulation and is punished with immediate disqualification." },
      ],
    },
    {
      category: "Match & Scoring Rules",
      items: [
        { type: "paragraph", text: "Points are awarded automatically: Placement Points + 1 point per kill. The official leaderboard updates the moment results are published and only published results count." },
        { type: "bullets", text: "1st place: 12 pts · 2nd: 9 · 3rd: 8 · 4th: 7 · 5th: 6 · 6th: 5 · 7th: 4 · 8th: 3 · 9th: 2 · 10th: 1\n11th place and below receive placement points of 0.\nTie-break order: total points → booyahs → kills → best placement." },
      ],
    },
    {
      category: "Protest & Penalties",
      items: [
        { type: "paragraph", text: "Complaints must be submitted through the official protest form within 30 minutes of the match ending, with video or screenshot evidence attached." },
        { type: "warning", text: "Zero-tolerance violations — hacking, cheating, match fixing, teaming, account sharing, identity fraud, fake evidence, ghosting, stream sniping, serious bug exploitation and score manipulation — lead to immediate disqualification and a possible permanent tournament ban." },
      ],
    },
    {
      category: "Prize Distribution",
      items: [
        { type: "paragraph", text: "Prizes are distributed within 72 hours after the final results are locked and marked official. Winners must provide valid payment details to the finance team." },
      ],
    },
  ]);
}

const TEAM_NAMES = [
  "Team Alpha", "Team Bravo", "Team Charlie", "Team Delta", "Team Echo",
  "Team Foxtrot", "Team Ghost", "Team Hotel", "Team India", "Team Jaguar",
  "Team Kilo", "Team Lima",
];
const COLORS = ["#FF7A1C", "#F43F5E", "#22C55E", "#A855F7", "#EAB308", "#06B6D4", "#FF8A5C", "#9B6DFF", "#2BD576", "#FF4D5E", "#67E8F9", "#FBBF24"];
const FIRST = ["Rahim", "Karim", "Sabbir", "Tanvir", "Mehedi", "Arif", "Nayeem", "Shakib", "Rifat", "Imran", "Sajid", "Fahim"];
const LAST = ["Ahmed", "Hossain", "Islam", "Rahman", "Chowdhury", "Khan", "Mia", "Sarker", "Uddin", "Ali"];
const IGNS = ["PhantomX", "ToxicRay", "ShadowOP", "SniperKing", "BooyahBoy", "GhostRider", "FrostyAim", "RageNova", "VenomZ", "ThunderBd", "SilentKill", "HeadshotPro", "AceHunter", "DarkLegend", "FireStorm", "IceBlade", "NightWolf", "TurboSmg", "ClutchGod", "ZeroFear", "CobraStrike", "IronFist", "SkyDiver", "LoneSurvivor"];
const ROLES = ["IGL", "RUSHER", "SNIPER", "SUPPORT", "SCOUT"];
const MAPS = ["Bermuda", "Purgatory", "Kalahari", "Alpine", "Nexterra"];

function daysFromNow(d: number, h = 20, m = 0): Date {
  const date = new Date();
  date.setDate(date.getDate() + d);
  date.setHours(h, m, 0, 0);
  return date;
}

async function main() {
  console.log("🌱 Seeding Battlora…");

  // ---------- wipe ----------
  await db.session.deleteMany();
  await db.activityLog.deleteMany();
  await db.notification.deleteMany();
  await db.evidence.deleteMany();
  await db.complaint.deleteMany();
  await db.penalty.deleteMany();
  await db.prize.deleteMany();
  await db.announcement.deleteMany();
  await db.matchResult.deleteMany();
  await db.match.deleteMany();
  await db.payment.deleteMany();
  await db.registration.deleteMany();
  await db.player.deleteMany();
  await db.team.deleteMany();
  await db.tournament.deleteMany();
  await db.platformSettings.deleteMany();

  // ---------- platform settings ----------
  await db.platformSettings.create({
    data: {
      id: "main",
      platformName: "Battlora",
      accentColor: "#FF7A1C",
      contactEmail: "support@battlora.gg",
      contactPhone: "+880 1700-000000",
      paymentMethodsJson: JSON.stringify([
        { name: "bKash", number: "01712-345678", type: "Mobile Wallet" },
        { name: "Nagad", number: "01812-345678", type: "Mobile Wallet" },
        { name: "Rocket", number: "01912-3456789", type: "Mobile Wallet" },
        { name: "Bank Transfer", number: "Battlora Esports · City Bank 1502 0449 8871", type: "Bank" },
      ]),
      paymentInstructions: "Send the exact entry fee to any official wallet above, then submit your Transaction ID and a payment screenshot in the registration form. Verification usually completes within 24 hours. Never send money to personal accounts.",
      faqJson: JSON.stringify([
        { q: "How do I join a tournament?", a: "Create an account, pick a tournament with open registration, complete the 7-step registration wizard with your team, players and payment." },
        { q: "When do I get room ID and password?", a: "Room credentials appear in your Team Dashboard → Room Details at the official release time set by the admins — usually 15 minutes before the match." },
        { q: "How is the leaderboard calculated?", a: "Placement Points + 1 point per kill. The leaderboard updates automatically the moment match results are published." },
        { q: "What if I suspect an opponent is cheating?", a: "Submit a complaint from your dashboard within 30 minutes of the match with screenshot or video evidence. Moderators review every case." },
        { q: "How are prizes paid?", a: "Prizes are distributed within 72 hours after the final results are locked, via the same mobile wallet you paid with." },
      ]),
    },
  });

  // ---------- staff users ----------
  const kishor = await db.user.create({ data: { email: "admin@battlora.gg", name: "Kishor Ahmed", passwordHash: hashPassword("Admin@123"), role: "SUPER_ADMIN", phone: "+880 1711-111111" } });
  const rahim = await db.user.create({ data: { email: "tadmin@battlora.gg", name: "Rahim Uddin", passwordHash: hashPassword("Admin@123"), role: "TOURNAMENT_ADMIN", phone: "+880 1722-222222" } });
  const finance = await db.user.create({ data: { email: "finance@battlora.gg", name: "Nusrat Jahan", passwordHash: hashPassword("Admin@123"), role: "FINANCE" } });
  const mod = await db.user.create({ data: { email: "moderator@battlora.gg", name: "Sabbir Rahman", passwordHash: hashPassword("Admin@123"), role: "MODERATOR" } });
  const resultMgr = await db.user.create({ data: { email: "results@battlora.gg", name: "Tanvir Islam", passwordHash: hashPassword("Admin@123"), role: "RESULT_MANAGER" } });

  // ---------- tournaments ----------
  const banners = await Promise.all([
    bannerImage("PRO SERIES", "Season 1 — Championship", "#FF7A1C", "#8B3A00"),
    bannerImage("WEEKEND CLASH", "Saturday Night Battle", "#A855F7", "#4C1D95"),
    bannerImage("COMMUNITY CUP", "Free Entry — Open to All", "#22C55E", "#14532D"),
    bannerImage("CHAMPIONS LEAGUE", "2025 Grand Final — Archive", "#EAB308", "#713F12"),
  ]);

  const proSeries = await db.tournament.create({
    data: {
      slug: "battlora-pro-series-s1",
      name: "Battlora Pro Series S1",
      description: "The flagship championship of the Battlora season. 48 squads enter — only one lifts the trophy. Six matches across Bermuda, Purgatory and Kalahari decide the champion, with a ৳25,000 prize pool and full broadcast-grade production: automated scoring, live leaderboard and instant room delivery.",
      bannerUrl: banners[0],
      status: "ONGOING",
      featured: true,
      entryFee: 150,
      teamLimit: 48,
      playersPerTeam: 4,
      registrationStart: daysFromNow(-14, 10),
      registrationEnd: daysFromNow(-2, 23),
      tournamentStart: daysFromNow(-1, 19),
      tournamentEnd: daysFromNow(2, 23),
      matchCount: 6,
      scoringConfig: JSON.stringify(SCORING),
      rulesJson: defaultRules(),
      prizePool: 25000,
      prizeConfig: JSON.stringify([
        { name: "1st Prize", amount: 12000, description: "Champion squad" },
        { name: "2nd Prize", amount: 7000, description: "Runner-up" },
        { name: "3rd Prize", amount: 4000, description: "Third place" },
        { name: "MVP Prize", amount: 1000, description: "Most valuable player" },
        { name: "Highest Kill Prize", amount: 1000, description: "Most total kills" },
      ]),
    },
  });

  const weekendClash = await db.tournament.create({
    data: {
      slug: "battlora-weekend-clash",
      name: "Battlora Weekend Clash",
      description: "Fast-paced Saturday night battles. Four matches, ৳8,000 prize pool and a low entry fee — the perfect arena for up-and-coming squads to prove themselves before stepping into the Pro Series.",
      bannerUrl: banners[1],
      status: "REGISTRATION_OPEN",
      featured: false,
      entryFee: 100,
      teamLimit: 24,
      playersPerTeam: 4,
      registrationStart: daysFromNow(-5, 10),
      registrationEnd: daysFromNow(3, 23),
      tournamentStart: daysFromNow(4, 20),
      tournamentEnd: daysFromNow(4, 23),
      matchCount: 4,
      scoringConfig: JSON.stringify(SCORING),
      rulesJson: defaultRules(),
      prizePool: 8000,
      prizeConfig: JSON.stringify([
        { name: "1st Prize", amount: 4500 },
        { name: "2nd Prize", amount: 2500 },
        { name: "3rd Prize", amount: 1000 },
      ]),
    },
  });

  const communityCup = await db.tournament.create({
    data: {
      slug: "battlora-community-cup",
      name: "Battlora Community Cup",
      description: "A completely free-to-enter tournament for the growing Battlora community. No entry fee — just pure competition and a shot at the leaderboard history books.",
      bannerUrl: banners[2],
      status: "REGISTRATION_CLOSED",
      featured: false,
      entryFee: 0,
      teamLimit: 32,
      playersPerTeam: 4,
      registrationStart: daysFromNow(-10, 10),
      registrationEnd: daysFromNow(-1, 23),
      tournamentStart: daysFromNow(3, 19),
      tournamentEnd: daysFromNow(3, 23),
      matchCount: 3,
      scoringConfig: JSON.stringify(SCORING),
      rulesJson: defaultRules(),
      prizePool: 3000,
      prizeConfig: JSON.stringify([{ name: "1st Prize", amount: 3000 }]),
    },
  });

  const championsLeague = await db.tournament.create({
    data: {
      slug: "battlora-champions-league-2025",
      name: "Battlora Champions League 2025",
      description: "The completed 2025 Champions League. Team VenomZone dominated the season with 2 booyahs across four matches and claimed the ৳20,000 grand prize. Full archive: final standings, match results and prize records.",
      bannerUrl: banners[3],
      status: "COMPLETED",
      featured: false,
      entryFee: 200,
      teamLimit: 24,
      playersPerTeam: 4,
      registrationStart: daysFromNow(-45, 10),
      registrationEnd: daysFromNow(-30, 23),
      tournamentStart: daysFromNow(-28, 19),
      tournamentEnd: daysFromNow(-27, 23),
      matchCount: 4,
      scoringConfig: JSON.stringify(SCORING),
      rulesJson: defaultRules(),
      prizePool: 20000,
      prizeConfig: JSON.stringify([
        { name: "1st Prize", amount: 10000 },
        { name: "2nd Prize", amount: 6000 },
        { name: "3rd Prize", amount: 4000 },
      ]),
      resultsLocked: true,
      lockedAt: daysFromNow(-27, 23, 30),
    },
  });

  // ---------- teams & players ----------
  const captainDemo = await db.user.create({
    data: { email: "captain@battlora.gg", name: "Mehedi Hasan", passwordHash: hashPassword("Captain@123"), role: "CAPTAIN", phone: "+880 1811-111111" },
  });
  const captain2 = await db.user.create({
    data: { email: "captain2@battlora.gg", name: "Arif Hossain", passwordHash: hashPassword("Captain@123"), role: "CAPTAIN", phone: "+880 1822-222222" },
  });

  const teams: { id: string; name: string; captainId: string; logoUrl: string }[] = [];
  for (let i = 0; i < TEAM_NAMES.length; i++) {
    const name = TEAM_NAMES[i];
    let captain = i === 0 ? captainDemo : i === 1 ? captain2 : null;
    if (!captain) {
      captain = await db.user.create({
        data: {
          email: `captain${i + 1}@battlora.gg`,
          name: `${pick(FIRST)} ${pick(LAST)}`,
          passwordHash: hashPassword("Captain@123"),
          role: "CAPTAIN",
        },
      });
    }
    const logo = await logoImage(name.replace("Team ", "").slice(0, 2).toUpperCase(), COLORS[i]);
    const team = await db.team.create({
      data: {
        name,
        logoUrl: logo,
        captainId: captain.id,
        contactNumber: `+880 17${String(10_000_000 + Math.floor(rnd() * 89_999_999)).slice(0, 8)}`,
        email: `captain${i + 1}@battlora.gg`,
        status: "VERIFIED",
      },
    });
    teams.push({ id: team.id, name, captainId: captain.id, logoUrl: logo });

    const usedIgn = new Set<string>();
    const usedUid = new Set<string>();
    for (let p = 0; p < 4; p++) {
      let ign = pick(IGNS);
      while (usedIgn.has(ign)) ign = pick(IGNS) + String(Math.floor(rnd() * 90) + 10);
      usedIgn.add(ign);
      let u = uid();
      while (usedUid.has(u)) u = uid();
      usedUid.add(u);
      await db.player.create({
        data: {
          teamId: team.id,
          realName: `${pick(FIRST)} ${pick(LAST)}`,
          ign: i === 0 ? ["PhantomX", "ToxicRay", "ShadowOP", "SniperKing"][p] : ign,
          uid: u,
          phone: "+880 18XX-XXXXXX",
          role: p === 0 ? "IGL" : pick(ROLES),
          status: "VERIFIED",
        },
      });
    }
    if (i < 4) {
      let u = uid();
      while (usedUid.has(u)) u = uid();
      await db.player.create({
        data: {
          teamId: team.id,
          realName: `${pick(FIRST)} ${pick(LAST)}`,
          ign: `${pick(IGNS)}7`,
          uid: u,
          role: "SUBSTITUTE",
          isSubstitute: true,
          status: "VERIFIED",
        },
      });
    }
  }

  // ---------- PRO SERIES: registrations + payments ----------
  let regCounter = 120;
  async function registerTeam(tournamentId: string, teamIdx: number, status: "APPROVED" | "PAYMENT_PENDING" | "UNDER_REVIEW" | "REJECTED", paymentStatus: "PENDING" | "VERIFIED" | "REJECTED" | null, entryFee: number, screenshot: string | null) {
    const team = teams[teamIdx];
    regCounter++;
    const regId = `REG-2026-${String(regCounter).padStart(5, "0")}`;
    const txn = `8N7D${String(Math.floor(rnd() * 90000) + 10000)}`;
    return db.registration.create({
      data: {
        regId,
        tournamentId,
        teamId: team.id,
        status,
        agreementAccepted: true,
        submittedAt: daysFromNow(-12 + Math.floor(rnd() * 8), 14),
        reviewedAt: status === "APPROVED" ? daysFromNow(-10, 16) : null,
        reviewedById: status === "APPROVED" ? rahim.id : null,
        payment: paymentStatus
          ? {
              create: {
                method: pick(["bKash", "Nagad", "Rocket"]),
                transactionId: txn,
                senderNumber: `017${String(Math.floor(rnd() * 90000000) + 10000000)}`,
                screenshotUrl: screenshot,
                amount: entryFee,
                status: paymentStatus,
                verifiedAt: paymentStatus === "VERIFIED" ? daysFromNow(-10, 15) : null,
                verifiedById: paymentStatus === "VERIFIED" ? finance.id : null,
                rejectionReason: paymentStatus === "REJECTED" ? "Transaction ID not found in wallet statement — please verify and resubmit." : null,
              },
            }
          : undefined,
      },
    });
  }

  // 10 teams approved in Pro Series (all with verified payments)
  const proApproved: string[] = [];
  for (let i = 0; i < 10; i++) {
    const receipt = await receiptImage(TEAM_NAMES[i], pick(["bKash", "Nagad", "Rocket"]), `8N7D${String(Math.floor(rnd() * 90000) + 10000)}`, 150);
    const reg = await registerTeam(proSeries.id, i, "APPROVED", "VERIFIED", 150, receipt);
    proApproved.push(reg.teamId);
  }

  // Community Cup registrations (free — auto under review → approved)
  for (let i = 2; i < 8; i++) {
    await db.registration.create({
      data: {
        regId: `REG-2026-${String(200 + i).padStart(5, "0")}`,
        tournamentId: communityCup.id,
        teamId: teams[i].id,
        status: "APPROVED",
        agreementAccepted: true,
        submittedAt: daysFromNow(-8, 12),
        reviewedAt: daysFromNow(-7, 10),
        reviewedById: rahim.id,
      },
    });
  }

  // Weekend Clash: 1 approved, 1 pending payment, 1 rejected payment
  const wcReceiptOk = await receiptImage("Team Kilo", "bKash", "5K9D22341", 100);
  const wcReceiptPending = await receiptImage("Team Lima", "Nagad", "7P2M88154", 100);
  const wcReceiptRejected = await receiptImage("Team Kilo", "bKash", "3X1A00092", 100);
  const wcApproved = await registerTeam(weekendClash.id, 10, "APPROVED", "VERIFIED", 100, wcReceiptOk);
  await registerTeam(weekendClash.id, 11, "PAYMENT_PENDING", "PENDING", 100, wcReceiptPending);
  // Team Kilo also tried joining with a rejected payment on a duplicate-ish team (Team Jaguar idx 7):
  const jaguarReg = await db.registration.create({
    data: {
      regId: "REG-2026-00231",
      tournamentId: weekendClash.id,
      teamId: teams[7].id,
      status: "PAYMENT_PENDING",
      agreementAccepted: true,
      submittedAt: daysFromNow(-1, 18),
      payment: {
        create: {
          method: "bKash",
          transactionId: "3X1A00092",
          senderNumber: "01755-992211",
          screenshotUrl: wcReceiptRejected,
          amount: 100,
          status: "REJECTED",
          rejectionReason: "Transaction ID not found in wallet statement — please verify and resubmit.",
        },
      },
    },
  });
  void jaguarReg;
  void wcApproved;

  // ---------- PRO SERIES matches + results ----------
  const matchPlans = [
    { n: 1, day: -1, h: 19, map: "Bermuda", status: "COMPLETED", published: true },
    { n: 2, day: -1, h: 20, map: "Purgatory", status: "COMPLETED", published: true },
    { n: 3, day: 0, h: 18, map: "Kalahari", status: "COMPLETED", published: true },
    { n: 4, day: 0, h: 20, map: "Bermuda", status: "ROOM_OPEN", published: false, room: true },
    { n: 5, day: 1, h: 19, map: "Alpine", status: "SCHEDULED", published: false },
    { n: 6, day: 1, h: 20, map: "Nexterra", status: "SCHEDULED", published: false },
  ];

  // team strength (alpha 0-2 strong, others mid) to produce a believable leaderboard
  const strength = [1.4, 1.15, 0.95, 1.1, 0.8, 0.75, 0.7, 0.65, 0.55, 0.5];
  const totals: Record<string, { pts: number; kills: number; booyah: number; matches: number; best: number }> = {};
  proApproved.forEach((tid) => (totals[tid] = { pts: 0, kills: 0, booyah: 0, matches: 0, best: 99 }));

  for (const plan of matchPlans) {
    const date = daysFromNow(plan.day, plan.h);
    const releaseAt = plan.room ? new Date(Date.now() + 2 * 60 * 60 * 1000) : new Date(date.getTime() - 15 * 60 * 1000);
    const match = await db.match.create({
      data: {
        tournamentId: proSeries.id,
        matchNumber: plan.n,
        date,
        map: plan.map,
        mode: "Squad",
        roomId: String(48_000_00 + Math.floor(rnd() * 9000) * 10 + plan.n),
        roomPassword: `btl${String(plan.n).padStart(2, "0")}x${Math.floor(rnd() * 90 + 10)}`,
        roomReleaseAt: releaseAt,
        roomPublished: plan.room || plan.published,
        status: plan.status,
        resultPublished: plan.published,
        publishedAt: plan.published ? new Date(date.getTime() + 40 * 60 * 1000) : null,
      },
    });

    if (plan.published) {
      // weighted shuffle by strength
      const order = proApproved
        .map((tid, i) => ({ tid, w: rnd() * strength[i] }))
        .sort((a, b) => b.w - a.w);
      for (let place = 1; place <= order.length; place++) {
        const tid = order[place - 1].tid;
        const kills = Math.max(0, Math.round(14 - place * (0.8 + rnd() * 0.9) + rnd() * 4));
        const placementPoints = ppFor(place);
        const killPoints = kills * SCORING.killPoint;
        const total = placementPoints + killPoints;
        await db.matchResult.create({
          data: {
            matchId: match.id,
            teamId: tid,
            placement: place,
            kills,
            placementPoints,
            killPoints,
            totalPoints: total,
            published: true,
            enteredById: resultMgr.id,
          },
        });
        totals[tid].pts += total;
        totals[tid].kills += kills;
        totals[tid].matches += 1;
        totals[tid].best = Math.min(totals[tid].best, place);
        if (place === 1) totals[tid].booyah += 1;
      }
    }
  }

  // ---------- CHAMPIONS LEAGUE (completed archive) ----------
  const clTeams = [teams[2], teams[4], teams[6], teams[8], teams[9], teams[5], teams[3], teams[7]];
  for (let i = 0; i < clTeams.length; i++) {
    await db.registration.create({
      data: {
        regId: `REG-2025-${String(80 + i).padStart(5, "0")}`,
        tournamentId: championsLeague.id,
        teamId: clTeams[i].id,
        status: "APPROVED",
        agreementAccepted: true,
        submittedAt: daysFromNow(-40, 12),
        reviewedAt: daysFromNow(-38, 12),
        reviewedById: rahim.id,
        payment: {
          create: {
            method: "bKash",
            transactionId: `CL2025${String(4000 + i)}`,
            senderNumber: `017${String(Math.floor(rnd() * 90000000) + 10000000)}`,
            screenshotUrl: null,
            amount: 200,
            status: "VERIFIED",
            verifiedAt: daysFromNow(-38, 13),
            verifiedById: finance.id,
          },
        },
      },
    });
  }
  // 4 completed matches for CL
  const clStrength = [1.5, 1.0, 1.2, 0.7, 0.9, 0.6, 0.5, 0.45];
  const clTotals: Record<string, number> = {};
  clTeams.forEach((t) => (clTotals[t.id] = 0));
  for (let m = 1; m <= 4; m++) {
    const date = daysFromNow(-28 + Math.floor((m - 1) / 2), 19 + ((m - 1) % 2));
    const match = await db.match.create({
      data: {
        tournamentId: championsLeague.id,
        matchNumber: m,
        date,
        map: MAPS[(m - 1) % MAPS.length],
        mode: "Squad",
        roomId: String(30_000_00 + m * 137),
        roomPassword: `cl2025f${m}`,
        roomReleaseAt: new Date(date.getTime() - 15 * 60 * 1000),
        roomPublished: true,
        status: "COMPLETED",
        resultPublished: true,
        publishedAt: new Date(date.getTime() + 45 * 60 * 1000),
      },
    });
    const order = clTeams.map((t, i) => ({ t, w: rnd() * clStrength[i] })).sort((a, b) => b.w - a.w);
    for (let place = 1; place <= order.length; place++) {
      const kills = Math.max(0, Math.round(13 - place * (0.8 + rnd()) + rnd() * 3));
      const total = ppFor(place) + kills;
      await db.matchResult.create({
        data: {
          matchId: match.id,
          teamId: order[place - 1].t.id,
          placement: place,
          kills,
          placementPoints: ppFor(place),
          killPoints: kills,
          totalPoints: total,
          published: true,
          enteredById: resultMgr.id,
        },
      });
      clTotals[order[place - 1].t.id] += total;
    }
  }
  const clRanking = Object.entries(clTotals).sort((a, b) => b[1] - a[1]);
  await db.prize.createMany({
    data: [
      { tournamentId: championsLeague.id, name: "1st Prize", amount: 10000, winnerTeamId: clRanking[0][0], status: "PAID", paidAt: daysFromNow(-26, 12) },
      { tournamentId: championsLeague.id, name: "2nd Prize", amount: 6000, winnerTeamId: clRanking[1][0], status: "PAID", paidAt: daysFromNow(-26, 12) },
      { tournamentId: championsLeague.id, name: "3rd Prize", amount: 4000, winnerTeamId: clRanking[2][0], status: "PAID", paidAt: daysFromNow(-26, 12) },
    ],
  });

  // ---------- PRO SERIES prizes ----------
  await db.prize.createMany({
    data: [
      { tournamentId: proSeries.id, name: "1st Prize", amount: 12000, description: "Champion squad" },
      { tournamentId: proSeries.id, name: "2nd Prize", amount: 7000, description: "Runner-up" },
      { tournamentId: proSeries.id, name: "3rd Prize", amount: 4000, description: "Third place" },
      { tournamentId: proSeries.id, name: "MVP Prize", amount: 1000, description: "Most valuable player" },
      { tournamentId: proSeries.id, name: "Highest Kill Prize", amount: 1000, description: "Most total kills" },
    ],
  });

  // ---------- penalty: point deduction for Team India (idx 8) ----------
  await db.penalty.create({
    data: {
      tournamentId: proSeries.id,
      matchId: null,
      teamId: teams[8].id,
      type: "POINT_DEDUCTION",
      value: 5,
      reason: "Teaming confirmed with Team Lima in Match #02 — video evidence CMP-2026-00086. 5 points deducted.",
      active: true,
      issuedById: kishor.id,
    },
  });

  // ---------- complaints ----------
  const evidence1 = await evidenceImage("Match #02 — final zone aim-lock clip (Team India player)");
  const evidence2 = await evidenceImage("Match #03 — suspected ghosting by opposing squad");
  const complaint1 = await db.complaint.create({
    data: {
      ticketId: "CMP-2026-00086",
      tournamentId: proSeries.id,
      matchId: null,
      teamId: teams[0].id,
      submittedById: captainDemo.id,
      type: "TEAMING",
      description: "In Match #02 (Purgatory), Team India and Team Lima clearly rotated together, shared loot at Factory and never engaged each other until the final zone. We have the full clip from the last circle — please review and take action.",
      status: "CONFIRMED",
      internalNotes: "Reviewed by moderator + super admin. Confirmed teaming. 5 point penalty applied to Team India; warning issued to Team Lima.",
      resolvedAt: daysFromNow(0, 12),
      createdAt: daysFromNow(0, 10),
      evidence: { create: { url: evidence1, name: "final-zone-teamming.png", type: "IMAGE" } },
    },
  });
  await db.complaint.create({
    data: {
      ticketId: "CMP-2026-00091",
      tournamentId: proSeries.id,
      matchId: null,
      teamId: teams[1].id,
      submittedById: captain2.id,
      type: "HACK_CHEAT",
      description: "Player 'FrostyAim' from Team Echo is snapping onto heads through smoke in Match #03 at 18:42. Impossible reactions multiple times — requesting an official review with our attached clip.",
      status: "UNDER_REVIEW",
      createdAt: daysFromNow(0, 9),
      evidence: { create: { url: evidence2, name: "aimlock-through-smoke.png", type: "IMAGE" } },
    },
  });
  void complaint1;

  // ---------- announcements ----------
  await db.announcement.createMany({
    data: [
      {
        title: "Pro Series Match #04 moved to 8:00 PM",
        description: "Due to a platform-side room allocation delay, Match #04 now starts at 8:00 PM (Bermuda). Room credentials unlock at 7:45 PM sharp in your dashboard.",
        tournamentId: proSeries.id,
        priority: "IMPORTANT",
        publishAt: daysFromNow(0, 9),
        createdById: rahim.id,
      },
      {
        title: "Weekend Clash registration closes Friday",
        description: "Only a few slots remain for Saturday's Weekend Clash with an ৳8,000 prize pool. Entry fee ৳100 — payment must be verified before the deadline.",
        tournamentId: weekendClash.id,
        priority: "NORMAL",
        publishAt: daysFromNow(-1, 15),
        createdById: rahim.id,
      },
      {
        title: "Zero-tolerance policy reminder",
        description: "Hacking, teaming, account sharing and stream sniping lead to immediate disqualification and a tournament ban. Evidence windows close 30 minutes after each match.",
        tournamentId: null,
        priority: "URGENT",
        publishAt: daysFromNow(-2, 11),
        createdById: kishor.id,
      },
    ],
  });

  // ---------- notifications for captain demo ----------
  await db.notification.createMany({
    data: [
      { userId: captainDemo.id, title: "Payment verified", message: "Your payment of ৳150 for Battlora Pro Series S1 has been verified. Your registration is now under review.", type: "PAYMENT", read: true, createdAt: daysFromNow(-10, 15) },
      { userId: captainDemo.id, title: "Registration approved 🎉", message: "Team Alpha — Battlora Pro Series S1: approved. You are eligible for matches!", type: "REGISTRATION", read: true, createdAt: daysFromNow(-10, 16) },
      { userId: captainDemo.id, title: "Results published — Match #01", message: "Results for Match #01 (Bermuda) have been published. The leaderboard has been updated.", type: "RESULT", read: true, createdAt: daysFromNow(-1, 20) },
      { userId: captainDemo.id, title: "Results published — Match #02", message: "Results for Match #02 (Purgatory) have been published. The leaderboard has been updated.", type: "RESULT", read: true, createdAt: daysFromNow(-1, 21) },
      { userId: captainDemo.id, title: "Results published — Match #03", message: "Results for Match #03 (Kalahari) have been published. The leaderboard has been updated.", type: "RESULT", read: true, createdAt: daysFromNow(0, 19) },
      { userId: captainDemo.id, title: "Room details — Match #04", message: "Room credentials for Match #04 (Bermuda) are now available. Open Room Details in your dashboard.", type: "ROOM", read: false, createdAt: daysFromNow(0, 14) },
      { userId: captainDemo.id, title: "Complaint Confirmed", message: "Your complaint CMP-2026-00086 (Battlora Pro Series S1) has been updated to: confirmed.", type: "COMPLAINT", read: false, createdAt: daysFromNow(0, 12) },
      { userId: captainDemo.id, title: "📢 Pro Series Match #04 moved to 8:00 PM", message: "Due to a platform-side room allocation delay, Match #04 now starts at 8:00 PM (Bermuda). Room credentials unlock at 7:45 PM sharp in your dashboard.", type: "ANNOUNCEMENT", read: false, createdAt: daysFromNow(0, 9) },
    ],
  });
  // notifications for other captains (room published)
  for (const team of teams.slice(1, 10)) {
    await db.notification.createMany({
      data: [
        { userId: team.captainId, title: "Results published — Match #03", message: "Results for Match #03 (Kalahari) have been published. The leaderboard has been updated.", type: "RESULT", read: rnd() > 0.5, createdAt: daysFromNow(0, 19) },
        { userId: team.captainId, title: "Room details — Match #04", message: "Room credentials for Match #04 (Bermuda) will unlock at the official release time. Open Room Details in your dashboard.", type: "ROOM", read: false, createdAt: daysFromNow(0, 14) },
      ],
    });
  }

  // ---------- activity logs ----------
  await db.activityLog.createMany({
    data: [
      { userId: rahim.id, userName: "Rahim Uddin", action: "Created tournament", entity: "Tournament", newValue: JSON.stringify({ name: "Battlora Pro Series S1", status: "REGISTRATION_OPEN" }), createdAt: daysFromNow(-14, 11) },
      { userId: finance.id, userName: "Nusrat Jahan", action: "Payment verified", entity: "Payment", newValue: JSON.stringify({ team: "Team Alpha", transactionId: "8N7D48211" }), createdAt: daysFromNow(-10, 15) },
      { userId: rahim.id, userName: "Rahim Uddin", action: "Registration approved", entity: "Registration", previousValue: JSON.stringify({ status: "UNDER_REVIEW" }), newValue: JSON.stringify({ status: "APPROVED", team: "Team Alpha" }), createdAt: daysFromNow(-10, 16) },
      { userId: rahim.id, userName: "Rahim Uddin", action: "Created match", entity: "Match", newValue: JSON.stringify({ matchNumber: 1, map: "Bermuda" }), createdAt: daysFromNow(-2, 12) },
      { userId: rahim.id, userName: "Rahim Uddin", action: "Published room credentials", entity: "Match", newValue: JSON.stringify({ roomPublished: true }), createdAt: daysFromNow(-1, 18) },
      { userId: resultMgr.id, userName: "Tanvir Islam", action: "Published match result", entity: "Match", newValue: JSON.stringify({ matchNumber: 1, tournament: "Battlora Pro Series S1" }), createdAt: daysFromNow(-1, 20) },
      { userId: resultMgr.id, userName: "Tanvir Islam", action: "Published match result", entity: "Match", newValue: JSON.stringify({ matchNumber: 2, tournament: "Battlora Pro Series S1" }), createdAt: daysFromNow(-1, 21) },
      { userId: mod.id, userName: "Sabbir Rahman", action: "Complaint reviewed — UNDER_REVIEW", entity: "Complaint", newValue: JSON.stringify({ ticketId: "CMP-2026-00091" }), createdAt: daysFromNow(0, 10) },
      { userId: kishor.id, userName: "Kishor Ahmed", action: "Issued Point Deduction penalty", entity: "Penalty", newValue: JSON.stringify({ team: "Team India", value: 5, reason: "Teaming confirmed (CMP-2026-00086)" }), createdAt: daysFromNow(0, 12) },
      { userId: kishor.id, userName: "Kishor Ahmed", action: "Locked final results", entity: "Tournament", newValue: JSON.stringify({ tournament: "Battlora Champions League 2025", champion: "Team Charlie" }), createdAt: daysFromNow(-27, 23) },
    ],
  });

  console.log("✅ Seed complete:");
  console.log("   Super Admin:   admin@battlora.gg / Admin@123");
  console.log("   Captain demo:  captain@battlora.gg / Captain@123 (Team Alpha — Pro Series)");
  console.log("   4 tournaments, 12 teams, matches, results, complaints, penalties, prizes");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
