import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
const prizes = await db.prize.findMany({
  include: { tournament: { select: { name: true, resultsLocked: true } } },
  orderBy: { createdAt: 'asc' },
})
const teamIds = [...new Set(prizes.map((p) => p.winnerTeamId).filter(Boolean))]
const teams = await db.team.findMany({
  where: { id: { in: teamIds } },
  include: { captain: { select: { email: true, name: true } } },
})
const teamMap = new Map(teams.map((t) => [t.id, t]))
for (const p of prizes) {
  const t = p.winnerTeamId ? teamMap.get(p.winnerTeamId) : null
  console.log(
    `${p.tournament.name} | locked=${p.tournament.resultsLocked} | ${p.name} | ৳${p.amount} | winner=${t?.name ?? '—'} | captain=${t?.captain?.email ?? '—'} | status=${p.status}`
  )
}
await db.$disconnect()
