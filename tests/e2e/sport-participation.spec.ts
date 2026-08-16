import { test, expect, type APIRequestContext } from "@playwright/test"
import bcrypt from "bcryptjs"
import { db } from "../../src/lib/db"

/**
 * Test anti-régression du flux de participation sportive :
 * étudiant → demande (poste obligatoire) → responsable de classe → acceptation/refus.
 *
 * Couvre le bug corrigé : `SportParticipationRequest.delegateId` référençait
 * l'id du record SportDelegate au lieu de l'id du MEMBRE délégué → toute
 * création de demande plantait en 500 (violation de clé étrangère).
 *
 * Les données de test sont créées et supprimées par le test lui-même
 * (tag unique par exécution) — la base de dev reste propre.
 */

// Tag unique par processus/exécution (les 2 projets Playwright tournent en
// parallèle dans des workers séparés → zéro collision entre eux).
const TAG = `E2E-${process.pid}-${Date.now()}`
const PREFIX = `[${TAG}]`
const PASSWORD = "SgiauTest@2026!"

let seeded: {
  studentUserId: string
  studentMemberId: string
  delegateUserId: string
  delegateMemberId: string
  competitionId: string
  disciplineId: string
} | null = null

/** Le pooler Supabase est intermittent (init impossible, resets) — on relance. */
async function withRetry<T>(label: string, fn: () => Promise<T>, attempts = 4): Promise<T> {
  let lastErr: unknown
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn()
    } catch (e) {
      lastErr = e
      const msg = e instanceof Error ? e.message : String(e)
      console.error(`[${label}] tentative ${i}/${attempts} — ${msg.slice(0, 120)}`)
      await new Promise((r) => setTimeout(r, 4000 * i))
    }
  }
  throw lastErr
}

test.beforeAll(async () => {
  await withRetry("seed", async () => {
    const pwHash = await bcrypt.hash(PASSWORD, 12)

    const discipline = await db.sportDiscipline.create({
      data: { name: `Disc ${TAG}`, teamSize: 5 },
    })
    const competition = await db.sportCompetition.create({
      data: { name: `Comp ${TAG}`, status: "OPEN" },
    })
    await db.sportCompetitionDiscipline.create({
      data: { competitionId: competition.id, disciplineId: discipline.id },
    })

    // Étudiant demandeur (classe Administration L3)
    const studentMember = await db.member.create({
      data: {
        matricule: `${TAG}-S`,
        firstName: "Test",
        lastName: "Etudiant",
        faculty: "Administration",
        level: "L3",
        status: "ACTIVE",
      },
    })
    const studentUser = await db.user.create({
      data: {
        username: `${TAG}-student`,
        email: `${TAG}-student@sgiau.local`,
        fullName: "Test Etudiant",
        passwordHash: pwHash,
        role: "MEMBER",
        memberId: studentMember.id,
        mustChangePassword: false,
      },
    })

    // Responsable sportif de classe (délégué, membre distinct)
    const delegateMember = await db.member.create({
      data: {
        matricule: `${TAG}-D`,
        firstName: "Test",
        lastName: "Delegue",
        faculty: "Informatique et Gestion",
        level: "L3",
        status: "ACTIVE",
      },
    })
    const delegateUser = await db.user.create({
      data: {
        username: `${TAG}-delegate`,
        email: `${TAG}-delegate@sgiau.local`,
        fullName: "Test Delegue",
        passwordHash: pwHash,
        role: "MEMBER",
        memberId: delegateMember.id,
        mustChangePassword: false,
      },
    })

    // Délégation de classe Administration L3 (le bug corrigé passait delegate.id ici)
    await db.sportDelegate.create({
      data: {
        competitionId: competition.id,
        className: "Administration",
        level: "L3",
        memberId: delegateMember.id,
        status: "ACTIVE",
      },
    })

    seeded = {
      studentUserId: studentUser.id,
      studentMemberId: studentMember.id,
      delegateUserId: delegateUser.id,
      delegateMemberId: delegateMember.id,
      competitionId: competition.id,
      disciplineId: discipline.id,
    }
  })
})

test.afterAll(async () => {
  if (!seeded) return
  const { competitionId, disciplineId, studentMemberId, delegateMemberId, studentUserId, delegateUserId } = seeded
  await withRetry("cleanup", async () => {
    await db.sportParticipationRequest.deleteMany({ where: { competitionId } })
    await db.sportTeam.deleteMany({ where: { competitionId } })
    await db.sportDelegate.deleteMany({ where: { competitionId } })
    await db.sportCompetitionDiscipline.deleteMany({ where: { competitionId } })
    await db.sportCompetition.deleteMany({ where: { id: competitionId } })
    await db.sportDiscipline.deleteMany({ where: { id: disciplineId } })
    await db.user.deleteMany({ where: { id: { in: [studentUserId, delegateUserId] } } })
    await db.member.deleteMany({ where: { id: { in: [studentMemberId, delegateMemberId] } } })
  }).catch((e) => console.error("sport-participation cleanup failed", e))
})

async function login(ctx: APIRequestContext, username: string): Promise<void> {
  const res = await ctx.post("/api/auth/login", { data: { username, password: PASSWORD } })
  expect(res.status()).toBe(200)
}

// Le pooler Supabase (transactionnel) est lent après une période d'inactivité
// (jusqu'à ~15 s par requête) — le flux complet enchaîne ~8 requêtes HTTP.
test.setTimeout(180_000)

test("flux complet : étudiant → demande → délégué → acceptation/refus", async ({ playwright, baseURL }) => {
  expect(seeded, "seed requis").toBeTruthy()
  const { competitionId, disciplineId, studentMemberId, delegateMemberId } = seeded!

  const student = await playwright.request.newContext({ baseURL })
  const delegate = await playwright.request.newContext({ baseURL })
  try {
    // ——— 1. Connexions ———
    await login(student, `${TAG}-student`)
    await login(delegate, `${TAG}-delegate`)

    // ——— 2. L'étudiant demande à participer (poste obligatoire) ———
    const part = await student.post("/api/member-space/sport/participation", {
      data: { competitionId, disciplineId, position: "Gardien", note: `${PREFIX} participation` },
    })
    expect(part.status(), "POST participation doit créer la demande (bug corrigé)").toBe(201)
    const partBody = await part.json()
    const requestId: string = partBody.id
    expect(requestId).toBeTruthy()
    expect(partBody.status).toBe("PENDING")
    expect(partBody.position).toBe("Gardien")

    // La demande est dirigée vers le délégué de la classe (member id, pas l'id SportDelegate)
    expect(partBody.delegate?.id).toBe(delegateMemberId)

    // ——— 3. La demande apparaît dans « mes demandes » ———
    const mine = await student.get("/api/member-space/sport/participation")
    expect(mine.status()).toBe(200)
    const mineBody = await mine.json()
    expect((mineBody.mine ?? []).some((r: any) => r.id === requestId)).toBe(true)

    // ——— 4. Permission : l'étudiant ne peut pas répondre à sa propre demande ———
    const selfAccept = await student.put(`/api/member-space/sport/participation/${requestId}`, {
      data: { action: "ACCEPT" },
    })
    expect(selfAccept.status(), "seul le responsable de classe répond aux demandes").toBe(403)

    // ——— 5. Le délégué accepte → l'étudiant intègre l'équipe ———
    const accept = await delegate.put(`/api/member-space/sport/participation/${requestId}`, {
      data: { action: "ACCEPT" },
    })
    expect(accept.status()).toBe(200)
    const acceptBody = await accept.json()
    expect(acceptBody.status).toBe("ACCEPTED")

    // L'étudiant est bien dans la composition de l'équipe (players JSON)
    const team = await db.sportTeam.findFirst({
      where: { competitionId, delegateId: seeded!.delegateMemberId },
    })
    expect(team, "l'équipe du délégué doit exister après acceptation").toBeTruthy()
    const players = JSON.parse(team!.players ?? "[]") as string[]
    expect(players).toContain(studentMemberId)

    // ——— 6. Une demande refusée n'intègre pas l'étudiant ———
    const part2 = await student.post("/api/member-space/sport/participation", {
      data: { competitionId, disciplineId, position: "Attaquant", note: `${PREFIX} refus` },
    })
    expect(part2.status()).toBe(201)
    const part2Body = await part2.json()

    const refuse = await delegate.put(`/api/member-space/sport/participation/${part2Body.id}`, {
      data: { action: "REFUSE", response: `${PREFIX} effectif complet` },
    })
    expect(refuse.status()).toBe(200)
    const refuseBody = await refuse.json()
    expect(refuseBody.status).toBe("REFUSED")

    const teamAfter = await db.sportTeam.findFirst({
      where: { competitionId, delegateId: seeded!.delegateMemberId },
    })
    const playersAfter = JSON.parse(teamAfter!.players ?? "[]") as string[]
    expect(playersAfter.length, "aucun joueur ajouté lors d'un refus").toBe(1)
    expect(playersAfter).toContain(studentMemberId)

    // ——— 7. Notification envoyée à l'étudiant pour la demande acceptée ———
    const notifCount = await db.notification.count({
      where: { memberId: studentMemberId },
    })
    expect(notifCount, "l'étudiant doit recevoir au moins une notification").toBeGreaterThanOrEqual(1)
  } finally {
    await student.dispose()
    await delegate.dispose()
  }
})
