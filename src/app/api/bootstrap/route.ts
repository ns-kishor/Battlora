import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { getSettings, handleRouteError, ok } from "@/lib/route-helpers";

// Public platform bootstrap: hero stats, settings, latest announcements
export async function GET() {
  try {
    const user = await getSessionUser();
    const [
      activeTournaments,
      registeredTeams,
      totalPlayers,
      prizeAgg,
      settings,
      announcements,
    ] = await Promise.all([
      db.tournament.count({ where: { status: { in: ["ONGOING", "UPCOMING", "REGISTRATION_OPEN"] } } }),
      db.team.count(),
      db.player.count(),
      db.tournament.aggregate({ _sum: { prizePool: true } }),
      getSettings(),
      db.announcement.findMany({
        where: { publishAt: { lte: new Date() } },
        orderBy: { publishAt: "desc" },
        take: 5,
      }),
    ]);

    return ok({
      stats: {
        activeTournaments,
        registeredTeams,
        totalPlayers,
        totalPrizePool: prizeAgg._sum.prizePool ?? 0,
      },
      settings: {
        platformName: settings.platformName,
        accentColor: settings.accentColor,
        contactEmail: settings.contactEmail,
        contactPhone: settings.contactPhone,
        paymentMethods: JSON.parse(settings.paymentMethodsJson || "[]"),
        paymentInstructions: settings.paymentInstructions,
        faq: JSON.parse(settings.faqJson || "[]"),
      },
      announcements,
      user,
    });
  } catch (e) {
    return handleRouteError(e);
  }
}
