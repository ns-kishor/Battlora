import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { handleRouteError, ok } from "@/lib/route-helpers";
import { formatMoney } from "@/lib/format";

// GET /api/admin/withdrawals — all prize withdrawal requests with full submitted
// details, timeline, filter metadata and stats (admin-only; sensitive payment
// information is exposed exclusively to authorized staff).
export async function GET() {
  try {
    await requirePermission("payments.view");

    const withdrawals = await db.prizeWithdrawal.findMany({
      include: {
        tournament: { select: { id: true, name: true } },
        team: { select: { id: true, name: true, logoUrl: true } },
        prize: { select: { id: true, name: true, amount: true, status: true } },
        submittedBy: { select: { id: true, name: true } },
        events: { orderBy: { createdAt: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    });

    const tournaments = await db.tournament.findMany({
      where: { withdrawals: { some: {} } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });

    const rows = withdrawals.map((w) => ({
      id: w.id,
      requestNo: w.requestNo,
      position: w.position,
      prizeName: w.prize.name,
      amount: w.prize.amount,
      contactPhone: w.contactPhone,
      method: w.method,
      accountNumber: w.accountNumber,
      status: w.status,
      adminNote: w.adminNote,
      createdAt: w.createdAt,
      updatedAt: w.updatedAt,
      paidAt: w.paidAt,
      reviewedAt: w.reviewedAt,
      tournament: w.tournament,
      team: w.team,
      submittedBy: w.submittedBy,
      events: w.events.map((e) => ({
        id: e.id,
        action: e.action,
        status: e.status,
        note: e.note,
        internal: e.internal,
        actorName: e.actorName,
        createdAt: e.createdAt,
      })),
    }));

    const stats = {
      total: rows.length,
      underReview: rows.filter((r) => r.status === "UNDER_REVIEW").length,
      approved: rows.filter((r) => r.status === "APPROVED").length,
      processing: rows.filter((r) => r.status === "PAYMENT_PROCESSING").length,
      paid: rows.filter((r) => r.status === "PAID").length,
      rejected: rows.filter((r) => r.status === "REJECTED").length,
      correction: rows.filter((r) => r.status === "REQUIRES_CORRECTION").length,
      totalPaidAmount: formatMoney(
        rows.filter((r) => r.status === "PAID").reduce((s, r) => s + r.amount, 0)
      ),
    };

    return ok({ withdrawals: rows, tournaments, stats });
  } catch (e) {
    return handleRouteError(e);
  }
}
