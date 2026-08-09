import { db } from "@/lib/db"
import { ok, serialize } from "@/lib/sgiau/api"

export const dynamic = "force-dynamic"

export async function GET() {
  const [syncMetas, recentLogs, synced, pending, conflicts] = await Promise.all([
    db.syncMeta.findMany({
      orderBy: { updatedAt: "desc" },
      take: 100,
      include: { member: { select: { id: true, matricule: true, firstName: true, lastName: true, status: true } } },
    }),
    db.syncLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    db.syncMeta.count({ where: { syncStatus: "SYNCED" } }),
    db.syncMeta.count({ where: { syncStatus: "PENDING" } }),
    db.syncMeta.count({ where: { syncStatus: "CONFLICT" } }),
  ])

  const lastSyncMeta = await db.syncMeta.findFirst({ orderBy: { lastSyncAt: "desc" }, select: { lastSyncAt: true } })

  return ok({
    syncMetas: serialize(syncMetas),
    recentLogs: serialize(recentLogs),
    stats: { synced, pending, conflicts, lastSyncAt: lastSyncMeta?.lastSyncAt ?? null },
  })
}
