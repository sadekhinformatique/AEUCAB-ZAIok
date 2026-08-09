import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, err, audit, serialize, getCurrentUserId } from "@/lib/sgiau/api"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const simulateConflict = body?.simulate === true
  const userId = await getCurrentUserId()

  if (simulateConflict) {
    // Pick a random member with a syncMeta and mark it as CONFLICT
    const meta = await db.syncMeta.findFirst({ where: { syncStatus: "SYNCED" }, include: { member: true } })
    if (!meta) return err("Aucune entrée SyncMeta disponible", 404)

    const updated = await db.syncMeta.update({
      where: { id: meta.id },
      data: { syncStatus: "CONFLICT", revision: { increment: 1 } },
    })

    const log = await db.syncLog.create({
      data: {
        userId,
        direction: "PUSH",
        entity: "Member",
        entityId: meta.memberId,
        status: "CONFLICT",
        message: `Conflit détecté sur ${meta.member.matricule} — version locale différente du serveur`,
      },
    })

    await audit({ userId, action: "VALIDATE", entity: "SyncMeta", entityId: meta.id, after: serialize(updated), description: "Conflit de synchronisation simulé" })
    return ok({ meta: serialize(updated), log: serialize(log) })
  }

  // Default: run sync — mark all PENDING as SYNCED and create syncLogs
  const pending = await db.syncMeta.findMany({ where: { syncStatus: "PENDING" }, include: { member: true } })
  if (pending.length === 0) {
    return ok({ synced: 0, logs: [], message: "Aucune entrée en attente de synchronisation" })
  }

  const now = new Date()
  const updatedIds: string[] = []
  for (const m of pending) {
    await db.syncMeta.update({ where: { id: m.id }, data: { syncStatus: "SYNCED", lastSyncAt: now } })
    updatedIds.push(m.id)
  }

  const logs = await Promise.all(pending.map((m) =>
    db.syncLog.create({
      data: {
        userId,
        direction: "PUSH",
        entity: "Member",
        entityId: m.memberId,
        status: "SUCCESS",
        message: `Synchronisation réussie — ${m.member.matricule}`,
      },
    })
  ))

  await audit({ userId, action: "VALIDATE", entity: "Sync", description: `Synchronisation de ${pending.length} entrée(s)` })

  return ok({ synced: pending.length, logs: serialize(logs) })
}
