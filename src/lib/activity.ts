import { db } from "@/lib/db";

// ============================================================
// Audit trail + notification helpers (PRD sections 27, 28, 41, 57)
// Every critical admin action must create an audit record.
// ============================================================

export async function logActivity(opts: {
  user?: { id: string; name: string } | null;
  action: string;
  entity: string;
  entityId?: string;
  previousValue?: unknown;
  newValue?: unknown;
}) {
  try {
    await db.activityLog.create({
      data: {
        userId: opts.user?.id ?? null,
        userName: opts.user?.name ?? "System",
        action: opts.action,
        entity: opts.entity,
        entityId: opts.entityId ?? null,
        previousValue:
          opts.previousValue === undefined
            ? null
            : JSON.stringify(opts.previousValue),
        newValue: opts.newValue === undefined ? null : JSON.stringify(opts.newValue),
      },
    });
  } catch (e) {
    // Never break a business flow because of audit logging failures
    console.error("[activity] failed", e);
  }
}

export async function notify(opts: {
  userId: string;
  title: string;
  message: string;
  type?: string;
  link?: string;
}) {
  try {
    await db.notification.create({
      data: {
        userId: opts.userId,
        title: opts.title,
        message: opts.message,
        type: opts.type ?? "GENERAL",
        link: opts.link ?? null,
      },
    });
  } catch (e) {
    console.error("[notify] failed", e);
  }
}

/** Notify every captain of a registered team in a tournament. */
export async function notifyTournamentTeams(
  tournamentId: string,
  title: string,
  message: string,
  type?: string
) {
  const regs = await db.registration.findMany({
    where: { tournamentId },
    include: { team: { select: { captainId: true } } },
  });
  await Promise.all(
    regs.map((r) =>
      notify({ userId: r.team.captainId, title, message, type })
    )
  );
}

/** Sequential public IDs: REG-2026-00128, CMP-2026-00042, WDL-2026-00007 */
export async function nextSequenceId(prefix: "REG" | "CMP" | "WDL"): Promise<string> {
  const year = new Date().getFullYear();
  let count = 0;
  if (prefix === "REG") {
    count = await db.registration.count();
  } else if (prefix === "CMP") {
    count = await db.complaint.count();
  } else {
    count = await db.prizeWithdrawal.count();
  }
  // +1 and retry-safe: append count until unique
  let seq = count + 1;
  for (let i = 0; i < 50; i++) {
    const candidate = `${prefix}-${year}-${String(seq).padStart(5, "0")}`;
    const exists =
      prefix === "REG"
        ? await db.registration.findUnique({ where: { regId: candidate } })
        : prefix === "CMP"
          ? await db.complaint.findUnique({ where: { ticketId: candidate } })
          : await db.prizeWithdrawal.findUnique({ where: { requestNo: candidate } });
    if (!exists) return candidate;
    seq += 1;
  }
  return `${prefix}-${year}-${Date.now()}`;
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
