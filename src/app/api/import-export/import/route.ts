import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, err, audit, serialize, getCurrentUserId } from "@/lib/sgiau/api"
import { normalizeFiliere, normalizeLevel } from "@/lib/sgiau/constants"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  const url = new URL(req.url)
  const type = url.searchParams.get("type") || "members"
  const body = await req.json()
  const rows: Record<string, unknown>[] = Array.isArray(body) ? body : (body.rows ?? [])
  if (rows.length === 0) return err("Aucune ligne à importer", 422)

  const userId = await getCurrentUserId()
  let imported = 0
  const errors: string[] = []

  if (type === "members") {
    for (const row of rows) {
      try {
        const firstName = String(row.firstName || row.prenom || "").trim()
        const lastName = String(row.lastName || row.nom || "").trim()
        if (!firstName || !lastName) { errors.push(`Ligne ignorée (nom manquant)`); continue }
        const year = String(row.academicYear || row.annee || new Date().getFullYear())
        const count = await db.member.count()
        const matricule = row.matricule ? String(row.matricule) : `${year}-${String(count + 1).padStart(4, "0")}`
        const existing = await db.member.findUnique({ where: { matricule } }).catch(() => null)
        if (existing) { errors.push(`${matricule} existe déjà`); continue }
        await db.member.create({
          data: {
            matricule,
            firstName, lastName,
            sex: String(row.sex || row.sexe || "M").toUpperCase().startsWith("F") ? "F" : "M",
            phone: row.phone ? String(row.phone) : null,
            email: row.email ? String(row.email) : null,
            faculty: normalizeFiliere(row.faculty ? String(row.faculty) : null),
            department: row.department ? String(row.department) : null,
            level: normalizeLevel(row.level ? String(row.level) : null),
            academicYear: year,
            status: "ACTIVE",
            qrCode: `SGIAU-${matricule}`,
          },
        })
        imported++
      } catch (e) {
        errors.push(`Erreur: ${(e as Error).message}`)
      }
    }
  } else if (type === "payments") {
    for (const row of rows) {
      try {
        const matricule = String(row.matricule || "").trim()
        const member = matricule ? await db.member.findUnique({ where: { matricule } }) : null
        if (!member) { errors.push(`Membre ${matricule} introuvable`); continue }
        const ref = String(row.reference || `P-${Date.now()}-${imported}`)
        const amount = parseFloat(String(row.amount || row.amountPaid || 0))
        if (amount <= 0) { errors.push(`Montant invalide`); continue }
        await db.payment.create({
          data: {
            reference: ref,
            memberId: member.id,
            amount,
            amountPaid: parseFloat(String(row.amountPaid || amount)),
            paymentMode: String(row.paymentMode || row.mode || "CASH").toUpperCase(),
            status: String(row.status || "PAID").toUpperCase(),
            paymentDate: row.paymentDate ? new Date(String(row.paymentDate)) : new Date(),
            note: row.note ? String(row.note) : null,
          },
        })
        imported++
      } catch (e) {
        errors.push(`Erreur: ${(e as Error).message}`)
      }
    }
  } else if (type === "expenses") {
    for (const row of rows) {
      try {
        const label = String(row.label || row.libelle || "").trim()
        if (!label) { errors.push("Libellé manquant"); continue }
        const amount = parseFloat(String(row.amount || 0))
        if (amount <= 0) { errors.push("Montant invalide"); continue }
        const ref = String(row.reference || `E-${Date.now()}-${imported}`)
        await db.expense.create({
          data: {
            reference: ref,
            label,
            amount,
            status: String(row.status || "PENDING").toUpperCase(),
            date: row.date ? new Date(String(row.date)) : new Date(),
            note: row.note ? String(row.note) : null,
          },
        })
        imported++
      } catch (e) {
        errors.push(`Erreur: ${(e as Error).message}`)
      }
    }
  } else {
    return err(`Type d'import non supporté: ${type}`, 422)
  }

  await audit({ userId, action: "IMPORT", entity: "ImportExport", description: `Import ${type}: ${imported} enregistrement(s) importé(s), ${errors.length} erreur(s)` })

  return ok({ imported, errors: errors.slice(0, 20), type })
}
