import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, err, audit, serialize, getCurrentUserId } from "@/lib/sgiau/api"

export const dynamic = "force-dynamic"

// POST — create transfer + 2 cash movements (OUT from, IN to) + adjust balances
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { fromAccountId, toAccountId, amount, note, date } = body
  if (!fromAccountId || !toAccountId) return err("Les comptes source et destination sont requis", 422)
  if (fromAccountId === toAccountId) return err("Les comptes source et destination doivent être différents", 422)
  if (!amount || Number(amount) <= 0) return err("Le montant est invalide", 422)

  const userId = await getCurrentUserId()
  const amt = Number(amount)
  const trDate = date ? new Date(date) : new Date()

  const [from, to] = await Promise.all([
    db.cashAccount.findUnique({ where: { id: fromAccountId } }),
    db.cashAccount.findUnique({ where: { id: toAccountId } }),
  ])
  if (!from || !to) return err("Compte introuvable", 404)

  // Create transfer
  const transfer = await db.cashTransfer.create({
    data: {
      fromAccountId,
      toAccountId,
      amount: amt,
      date: trDate,
      note: note || null,
    },
  })

  // OUT movement
  const mvOut = await db.cashMovement.create({
    data: {
      cashAccountId: fromAccountId,
      type: "OUT",
      amount: amt,
      label: `Transfert vers ${to.name}${note ? ` — ${note}` : ""}`,
      date: trDate,
      refType: "TRANSFER",
      refId: transfer.id,
      validated: true,
    },
  })
  // IN movement
  const mvIn = await db.cashMovement.create({
    data: {
      cashAccountId: toAccountId,
      type: "IN",
      amount: amt,
      label: `Transfert depuis ${from.name}${note ? ` — ${note}` : ""}`,
      date: trDate,
      refType: "TRANSFER",
      refId: transfer.id,
      validated: true,
    },
  })

  // Adjust balances
  await db.cashAccount.update({ where: { id: fromAccountId }, data: { balance: { increment: -amt } } })
  await db.cashAccount.update({ where: { id: toAccountId }, data: { balance: { increment: amt } } })

  await audit({ userId, action: "CREATE", entity: "CashTransfer", entityId: transfer.id, after: serialize(transfer), description: `Transfert ${amt} FCFA de ${from.name} vers ${to.name}` })

  return ok(serialize({ transfer, mvOut, mvIn }), 201)
}
