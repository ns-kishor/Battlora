import { db } from "@/lib/db";
import { requirePermission, ApiError } from "@/lib/auth";
import { logActivity, slugify } from "@/lib/activity";
import {
  handleRouteError,
  ok,
  readJson,
  str,
  num,
  bool,
  validateDataUrlImage,
} from "@/lib/route-helpers";
import { TOURNAMENT_STATUSES } from "@/lib/types";
import { DEFAULT_SCORING } from "@/lib/types";

// GET /api/tournaments — public list with status filter
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const status = url.searchParams.get("status") ?? "ALL";
    const where =
      status !== "ALL" && TOURNAMENT_STATUSES.includes(status as never)
        ? { status }
        : { status: { not: "DRAFT" } };

    const tournaments = await db.tournament.findMany({
      where,
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        slug: true,
        name: true,
        bannerUrl: true,
        status: true,
        game: true,
        mode: true,
        entryFee: true,
        prizePool: true,
        teamLimit: true,
        registrationStart: true,
        registrationEnd: true,
        tournamentStart: true,
        tournamentEnd: true,
        featured: true,
        createdAt: true,
        _count: {
          select: {
            registrations: { where: { status: "APPROVED" } },
            matches: true,
          },
        },
      },
    });

    return ok({
      tournaments: tournaments.map((t) => ({
        ...t,
        registeredTeams: t._count.registrations,
        matchCount: t._count.matches,
        _count: undefined,
      })),
    });
  } catch (e) {
    return handleRouteError(e);
  }
}

// POST /api/tournaments — create tournament (admin)
export async function POST(req: Request) {
  try {
    const user = await requirePermission("tournaments.manage");
    const body = await readJson<Record<string, unknown>>(req);

    const name = str(body.name);
    if (name.length < 3) throw new ApiError("Tournament name is required.", 400);

    let slug = slugify(name);
    const clash = await db.tournament.findUnique({ where: { slug } });
    if (clash) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;

    const placementPointsInput = body.placementPoints as Record<string, number> | undefined;
    const killPoint = num(body.killPoint, 1);

    const scoringConfig = JSON.stringify({
      placementPoints: placementPointsInput ?? DEFAULT_SCORING.placementPoints,
      killPoint,
    });

    const prizeConfig = Array.isArray(body.prizeConfig)
      ? body.prizeConfig
      : [
          { name: "1st Prize", amount: 0, description: "" },
          { name: "2nd Prize", amount: 0, description: "" },
          { name: "3rd Prize", amount: 0, description: "" },
        ];

    const tournament = await db.tournament.create({
      data: {
        name,
        slug,
        description: str(body.description),
        bannerUrl: validateDataUrlImage(body.bannerUrl),
        game: str(body.game) || "Free Fire",
        mode: str(body.mode) || "Squad",
        format: str(body.format) || "Battle Royale — Points System",
        status: TOURNAMENT_STATUSES.includes(str(body.status) as never)
          ? str(body.status)
          : "DRAFT",
        featured: bool(body.featured),
        entryFee: num(body.entryFee, 0),
        teamLimit: Math.min(64, Math.max(2, Math.round(num(body.teamLimit, 48)))),
        playersPerTeam: Math.min(6, Math.max(1, Math.round(num(body.playersPerTeam, 4)))),
        registrationStart: body.registrationStart ? new Date(str(body.registrationStart)) : null,
        registrationEnd: body.registrationEnd ? new Date(str(body.registrationEnd)) : null,
        tournamentStart: body.tournamentStart ? new Date(str(body.tournamentStart)) : null,
        tournamentEnd: body.tournamentEnd ? new Date(str(body.tournamentEnd)) : null,
        matchCount: Math.max(1, Math.round(num(body.matchCount, 6))),
        substituteAllowed: body.substituteAllowed === undefined ? true : bool(body.substituteAllowed),
        scoringConfig,
        rulesJson: typeof body.rulesJson === "string" ? body.rulesJson : "[]",
        prizePool: num(body.prizePool, 0),
        prizeConfig: JSON.stringify(prizeConfig),
      },
    });

    await logActivity({
      user,
      action: "Created tournament",
      entity: "Tournament",
      entityId: tournament.id,
      newValue: { name: tournament.name, status: tournament.status },
    });

    return ok({ tournament }, 201);
  } catch (e) {
    return handleRouteError(e);
  }
}
