import { db } from "@/lib/db";
import { requireUser, ApiError } from "@/lib/auth";
import { logActivity, nextSequenceId, notify } from "@/lib/activity";
import {
  getSettings,
  handleRouteError,
  ok,
  readJson,
  str,
  num,
  bool,
  validateDataUrlImage,
} from "@/lib/route-helpers";

type PlayerInput = {
  realName?: string;
  ign?: string;
  uid?: string;
  phone?: string;
  role?: string;
  photoUrl?: string;
  isSubstitute?: boolean;
};

type RegistrationBody = {
  tournamentId?: string;
  team?: { name?: string; logoUrl?: string; contactNumber?: string; email?: string };
  players?: PlayerInput[];
  payment?: {
    method?: string;
    transactionId?: string;
    senderNumber?: string;
    screenshotUrl?: string;
  };
  agreementAccepted?: boolean;
};

// POST /api/registrations — submit tournament registration (PRD section 8)
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await readJson<RegistrationBody>(req);

    const tournament = await db.tournament.findUnique({
      where: { id: str(body.tournamentId) },
    });
    if (!tournament) throw new ApiError("Tournament not found.", 404);
    if (tournament.status !== "REGISTRATION_OPEN")
      throw new ApiError("Registration is not open for this tournament.", 409);
    if (tournament.registrationEnd && new Date(tournament.registrationEnd) < new Date())
      throw new ApiError("The registration deadline has passed.", 409);

    if (!bool(body.agreementAccepted))
      throw new ApiError("You must accept the Tournament Rules and Regulations.", 400);

    // ---- Team resolution: existing team or create new ----
    let team = await db.team.findUnique({ where: { captainId: user.id }, include: { players: true } });

    if (team) {
      const existingReg = await db.registration.findUnique({
        where: { tournamentId_teamId: { tournamentId: tournament.id, teamId: team.id } },
      });
      if (existingReg)
        throw new ApiError(
          `Your team is already registered (ID ${existingReg.regId}). Check the Team Dashboard for status.`,
          409
        );
      if (team.status === "BANNED")
        throw new ApiError("This team is banned from tournaments.", 403);
    } else {
      const teamName = str(body.team?.name);
      if (teamName.length < 3) throw new ApiError("Team name must be at least 3 characters.", 400);
      const nameClash = await db.team.findUnique({ where: { name: teamName } });
      if (nameClash) throw new ApiError("This team name is already taken.", 409);

      team = await db.team.create({
        data: {
          name: teamName,
          logoUrl: validateDataUrlImage(body.team?.logoUrl),
          captainId: user.id,
          contactNumber: str(body.team?.contactNumber) || user.phone,
          email: str(body.team?.email) || user.email,
          status: "PENDING",
        },
        include: { players: true },
      });
      // Captain role upgrade
      await db.user.update({ where: { id: user.id }, data: { role: "CAPTAIN" } });
    }

    // ---- Capacity ----
    const approvedCount = await db.registration.count({
      where: { tournamentId: tournament.id, status: "APPROVED" },
    });
    if (approvedCount >= tournament.teamLimit)
      throw new ApiError("This tournament is full.", 409);

    // ---- Players ----
    const playersInput = (body.players ?? []).filter((p) => str(p.ign));
    const mainPlayers = playersInput.filter((p) => !bool(p.isSubstitute));
    const substitutes = playersInput.filter((p) => bool(p.isSubstitute));

    if (mainPlayers.length < tournament.playersPerTeam)
      throw new ApiError(
        `This tournament requires ${tournament.playersPerTeam} main players (you provided ${mainPlayers.length}).`,
        400
      );
    if (substitutes.length > 1)
      throw new ApiError("Only one substitute player is allowed.", 400);
    if (!tournament.substituteAllowed && substitutes.length > 0)
      throw new ApiError("Substitutes are not allowed in this tournament.", 400);

    for (const p of mainPlayers.concat(substitutes)) {
      const uid = str(p.uid);
      if (!uid || !/^\d{6,12}$/.test(uid))
        throw new ApiError(`Invalid Free Fire UID for ${str(p.ign) || "player"} (6–12 digits).`, 400);
      const uidClash = await db.player.findUnique({ where: { uid } });
      if (uidClash)
        throw new ApiError(`UID ${uid} is already registered to another player.`, 409);
    }

    // Clear previous players if this is a brand-new registration for existing team with no players
    if (team.players.length === 0) {
      await db.player.createMany({
        data: [
          ...mainPlayers.map((p) => ({
            teamId: team!.id,
            realName: str(p.realName) || str(p.ign),
            ign: str(p.ign),
            uid: str(p.uid),
            phone: str(p.phone) || null,
            role: str(p.role) || "PLAYER",
            photoUrl: validateDataUrlImage(p.photoUrl),
            isSubstitute: false,
          })),
          ...substitutes.map((p) => ({
            teamId: team!.id,
            realName: str(p.realName) || str(p.ign),
            ign: str(p.ign),
            uid: str(p.uid),
            phone: str(p.phone) || null,
            role: "SUBSTITUTE",
            photoUrl: validateDataUrlImage(p.photoUrl),
            isSubstitute: true,
          })),
        ],
      });
    }

    // ---- Payment ----
    let paymentData: {
      method: string;
      transactionId: string;
      senderNumber: string;
      screenshotUrl: string | null;
      amount: number;
    } | null = null;

    if (tournament.entryFee > 0) {
      const method = str(body.payment?.method);
      const transactionId = str(body.payment?.transactionId);
      const senderNumber = str(body.payment?.senderNumber);
      if (!method) throw new ApiError("Payment method is required.", 400);
      if (transactionId.length < 4)
        throw new ApiError("A valid Transaction ID is required.", 400);
      if (!senderNumber) throw new ApiError("Sender number is required.", 400);
      const screenshot = validateDataUrlImage(body.payment?.screenshotUrl);
      if (!screenshot)
        throw new ApiError("A payment screenshot is required for verification.", 400);
      paymentData = {
        method,
        transactionId,
        senderNumber,
        screenshotUrl: screenshot,
        amount: tournament.entryFee,
      };
    }

    // ---- Create registration ----
    const regId = await nextSequenceId("REG");
    const status = paymentData ? "PAYMENT_PENDING" : "UNDER_REVIEW";

    const registration = await db.registration.create({
      data: {
        regId,
        tournamentId: tournament.id,
        teamId: team.id,
        status,
        agreementAccepted: true,
        payment: paymentData
          ? {
              create: {
                method: paymentData.method,
                transactionId: paymentData.transactionId,
                senderNumber: paymentData.senderNumber,
                screenshotUrl: paymentData.screenshotUrl,
                amount: paymentData.amount,
                status: "PENDING",
              },
            }
          : undefined,
      },
      include: { payment: true, tournament: { select: { name: true } }, team: true },
    });

    await logActivity({
      user,
      action: "Submitted registration",
      entity: "Registration",
      entityId: registration.id,
      newValue: { regId, team: team.name, tournament: tournament.name, status },
    });

    await notify({
      userId: user.id,
      title: "Registration submitted",
      message: `${team.name} registered for ${tournament.name}. Registration ID: ${regId}. ${
        paymentData ? "Your payment is being verified." : "Your registration is under review."
      }`,
      type: "REGISTRATION",
      link: "#/dashboard/payment",
    });

    return ok(
      {
        registration: {
          id: registration.id,
          regId: registration.regId,
          status: registration.status,
          team: team.name,
          tournament: tournament.name,
        },
      },
      201
    );
  } catch (e) {
    return handleRouteError(e);
  }
}

// GET /api/registrations — admin list with filters
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const status = url.searchParams.get("status") ?? "ALL";
    const tournamentId = url.searchParams.get("tournamentId");
    const q = url.searchParams.get("q")?.trim();

    const where: Record<string, unknown> = {};
    if (status !== "ALL") where.status = status;
    if (tournamentId) where.tournamentId = tournamentId;
    if (q) {
      where.OR = [
        { regId: { contains: q } },
        { team: { name: { contains: q } } },
        { payment: { transactionId: { contains: q } } },
      ];
    }

    const registrations = await db.registration.findMany({
      where,
      include: {
        team: { include: { players: true, captain: { select: { name: true, email: true, phone: true } } } },
        tournament: { select: { id: true, name: true, status: true, entryFee: true } },
        payment: true,
      },
      orderBy: { submittedAt: "desc" },
      take: 200,
    });

    return ok({ registrations });
  } catch (e) {
    return handleRouteError(e);
  }
}
