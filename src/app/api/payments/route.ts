import { db } from "@/lib/db";
import { requirePermission, requireUser, ApiError } from "@/lib/auth";
import { logActivity, notify } from "@/lib/activity";
import { handleRouteError, ok, readJson, str, validateDataUrlImage } from "@/lib/route-helpers";

// GET /api/payments — finance/admin payment verification queue
export async function GET(req: Request) {
  try {
    await requirePermission("payments.view");
    const url = new URL(req.url);
    const status = url.searchParams.get("status") ?? "ALL";
    const q = url.searchParams.get("q")?.trim();

    const where: Record<string, unknown> = {};
    if (status !== "ALL") where.status = status;
    if (q) {
      where.OR = [
        { transactionId: { contains: q } },
        { senderNumber: { contains: q } },
        { registration: { team: { name: { contains: q } } } },
        { registration: { regId: { contains: q } } },
      ];
    }

    const payments = await db.payment.findMany({
      where,
      include: {
        registration: {
          include: {
            team: { select: { id: true, name: true, logoUrl: true } },
            tournament: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return ok({ payments });
  } catch (e) {
    return handleRouteError(e);
  }
}

// POST /api/payments — captain re-submits payment after rejection
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await readJson<{
      registrationId?: string;
      method?: string;
      transactionId?: string;
      senderNumber?: string;
      screenshotUrl?: string;
    }>(req);

    const team = await db.team.findUnique({ where: { captainId: user.id } });
    if (!team) throw new ApiError("You do not have a team.", 404);

    const registration = await db.registration.findUnique({
      where: { id: str(body.registrationId) },
      include: { payment: true, tournament: { select: { name: true, entryFee: true } } },
    });
    if (!registration || registration.teamId !== team.id)
      throw new ApiError("Registration not found.", 404);
    if (registration.payment?.status === "VERIFIED")
      throw new ApiError("This payment is already verified.", 409);

    const method = str(body.method);
    const transactionId = str(body.transactionId);
    const senderNumber = str(body.senderNumber);
    const screenshot = validateDataUrlImage(body.screenshotUrl);

    if (!method) throw new ApiError("Payment method is required.", 400);
    if (transactionId.length < 4) throw new ApiError("A valid Transaction ID is required.", 400);
    if (!senderNumber) throw new ApiError("Sender number is required.", 400);
    if (!screenshot) throw new ApiError("A payment screenshot is required.", 400);

    const data = {
      method,
      transactionId,
      senderNumber,
      screenshotUrl: screenshot,
      amount: registration.tournament.entryFee,
      status: "PENDING",
      verifiedAt: null,
      verifiedById: null,
      rejectionReason: null,
    };

    const payment = registration.payment
      ? await db.payment.update({ where: { id: registration.payment.id }, data })
      : await db.payment.create({
          data: { registrationId: registration.id, ...data },
        });

    await db.registration.update({
      where: { id: registration.id },
      data: { status: "PAYMENT_PENDING", reviewNote: null },
    });

    await logActivity({
      user,
      action: "Resubmitted payment",
      entity: "Payment",
      entityId: payment.id,
      newValue: { transactionId, team: team.name, tournament: registration.tournament.name },
    });

    await notify({
      userId: user.id,
      title: "Payment resubmitted",
      message: `Your new payment for ${registration.tournament.name} is pending verification.`,
      type: "PAYMENT",
      link: "#/dashboard/payment",
    });

    return ok({ payment }, 201);
  } catch (e) {
    return handleRouteError(e);
  }
}
