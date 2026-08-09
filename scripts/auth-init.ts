/**
 * SGIAU — Auth bootstrap (production ready).
 *
 * Replaces legacy demo password hashes with real bcrypt hashes of strong
 * random passwords, one per account. If no user exists at all, creates the
 * first administrator. Credentials are printed ONCE to the console.
 *
 *   bun run auth:init
 */
import { randomBytes } from "node:crypto"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"

function generatePassword(): string {
  // 16 chars, unambiguous alphabet
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%"
  let out = ""
  const bytes = randomBytes(16)
  for (let i = 0; i < 16; i++) out += chars[bytes[i] % chars.length]
  return out
}

async function main() {
  const users = await db.user.findMany({ orderBy: { createdAt: "asc" } })

  if (users.length === 0) {
    const password = generatePassword()
    const hash = await bcrypt.hash(password, 12)
    const admin = await db.user.create({
      data: {
        username: "admin",
        email: "admin@sgiau.local",
        passwordHash: hash,
        fullName: "Administrateur SGIAU",
        role: "ADMIN_IT",
        isActive: true,
      },
    })
    console.log("\n┌──────────────────────────────────────────────┐")
    console.log("│  Aucun utilisateur — premier compte créé      │")
    console.log("└──────────────────────────────────────────────┘")
    console.log(`  Identifiant : ${admin.username}`)
    console.log(`  Mot de passe: ${password}`)
    console.log("  → Conservez ces identifiants, ils ne seront plus affichés.\n")
    return
  }

  const isBcrypt = (h: string) => h.startsWith("$2") && h.length >= 59 // real bcrypt hashes are 60 chars
  const toReset = users.filter((u) => !isBcrypt(u.passwordHash))

  if (toReset.length === 0) {
    console.log("Tous les mots de passe sont déjà hachés (bcrypt). Rien à faire.")
    return
  }

  console.log(`\n${toReset.length} compte(s) avec un mot de passe de démonstration — réinitialisation :\n`)
  for (const u of toReset) {
    const password = generatePassword()
    const hash = await bcrypt.hash(password, 12)
    await db.user.update({
      where: { id: u.id },
      data: { passwordHash: hash, failedAttempts: 0, lockedUntil: null },
    })
    console.log(`  ${u.username.padEnd(14)} →  ${password}`)
  }
  console.log("\n  Ces mots de passe sont affichés une seule fois.\n")

  await db.auditLog.create({
    data: {
      userId: toReset[0].id,
      action: "AUTH_INIT",
      entity: "SYSTEM",
      description: `Mots de passe réinitialisés pour ${toReset.length} comptes (fin du mode démo).`,
    },
  })
}

main()
  .catch((e) => {
    console.error("auth:init failed:", e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
