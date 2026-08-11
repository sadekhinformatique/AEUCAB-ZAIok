import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, err, serialize } from "@/lib/sgiau/api"
import { hashPassword } from "@/lib/sgiau/auth"
import { passwordError } from "@/lib/sgiau/password-policy"
import { normalizeFiliere, normalizeLevel } from "@/lib/sgiau/constants"

export const dynamic = "force-dynamic"

/**
 * Auto-inscription depuis l'application mobile.
 * Les mêmes champs que l'ajout d'un membre dans le back-office sont demandés,
 * SAUF le statut : le système crée le membre en PENDING, un dossier d'adhésion
 * en attente de validation, puis le compte (rôle MEMBER) lié au dossier.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const {
    firstName, lastName, sex, birthDate, phone, email, address,
    faculty, department, level, academicYear, username, password,
  } = body

  if (!firstName || !lastName) return err("Le nom et le prénom sont requis", 422)
  if (!username || !password) return err("Identifiant et mot de passe requis", 422)

  const uname = String(username).trim()
  if (uname.length < 3) return err("L'identifiant doit contenir au moins 3 caractères", 422)
  const pwError = passwordError(String(password))
  if (pwError) return err(pwError, 422)

  const memberEmail = email ? String(email).trim() : null

  const userExists = await db.user.findUnique({ where: { username: uname } }).catch(() => null)
  if (userExists) return err("Cet identifiant est déjà utilisé", 409)
  if (memberEmail) {
    const emailExists = await db.user.findUnique({ where: { email: memberEmail } }).catch(() => null)
    if (emailExists) return err("Cet email est déjà utilisé", 409)
  }

  const year = academicYear || new Date().getFullYear().toString()
  const count = await db.member.count()
  const seq = count + 1
  const matricule = `${year}-${String(seq).padStart(4, "0")}`

  const member = await db.member.create({
    data: {
      matricule,
      firstName: String(firstName),
      lastName: String(lastName),
      sex: sex === "F" ? "F" : "M",
      birthDate: birthDate ? new Date(String(birthDate)) : null,
      phone: phone ? String(phone) : null,
      email: memberEmail,
      address: address ? String(address) : null,
      faculty: normalizeFiliere(faculty),
      department: department ? String(department) : null,
      level: normalizeLevel(level),
      academicYear: year,
      status: "PENDING",
      qrCode: `SGIAU-${matricule}`,
    },
  })

  // Dossier d'adhésion en attente de validation (secrétaire → président)
  await db.adhesion.create({
    data: {
      memberId: member.id,
      form: JSON.stringify({ submittedAt: new Date().toISOString() }),
      status: "PENDING",
    },
  })

  // Compte de connexion lié au dossier
  const user = await db.user.create({
    data: {
      username: uname,
      email: memberEmail ?? `${uname}@membre.sgiau.local`,
      passwordHash: await hashPassword(String(password)),
      fullName: `${firstName} ${lastName}`,
      role: "MEMBER",
      isActive: true,
      memberId: member.id,
      mustChangePassword: false,
    },
  })

  await db.auditLog.create({
    data: {
      userId: user.id,
      action: "CREATE",
      entity: "Member",
      entityId: member.id,
      afterData: JSON.stringify(serialize({ matricule, username: uname, status: "PENDING" })),
      description: `Auto-inscription membre ${matricule} (${uname})`,
    },
  })

  return ok(serialize({ member: { id: member.id, matricule }, user: { id: user.id, username: user.username } }), 201)
}
