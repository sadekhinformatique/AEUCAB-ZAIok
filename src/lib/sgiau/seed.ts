import { db } from "@/lib/db"
import { hashPassword } from "@/lib/sgiau/auth"
import { FILIERES, LEVELS } from "@/lib/sgiau/constants"

// Demo-only shared password. Used ONLY by the seed script for the board demo
// accounts — every seeded account is flagged mustChangePassword so the first
// real login forces a personal password. Production flows never use it.
const DEMO_INITIAL_PASSWORD = "Sgiau@2026!"

const FIRST_NAMES_M = ["Amadou", "Ibrahim", "Moussa", "Ousmane", "Souleymane", "Mahamadou", "Boubacar", "Sékou", "Cheikh", "Mamadou"]
const FIRST_NAMES_F = ["Aïssatou", "Fatoumata", "Mariam", "Aminata", "Kadiatou", "Hawa", "Bintou", "Rokia", "Salimata", "Oumou"]
const LAST_NAMES = ["Diallo", "Touré", "Camara", "Cissé", "Keïta", "Diakité", "Traoré", "Konaté", "Sangaré", "Coulibaly", "Barry", "Sidibé", "Bah", "Doumbia", "Sylla"]

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}
function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export async function seedDatabase(force = false) {
  const existingMembers = await db.member.count()
  if (existingMembers > 0 && !force) {
    return { skipped: true, message: "Database already seeded" }
  }

  if (force) {
    // Wipe in dependency order
    const tables = [
      "auditLog", "sessionLog", "syncLog", "syncMeta", "notification", "memberRequest",
      "announcement", "archive", "partner", "libraryBorrow", "libraryResource",
      "formationParticipant", "formation", "inventoryItem", "document",
      "presence", "memberCard", "voteBallot", "voteOption", "vote", "electionCandidate",
      "election", "meetingParticipant", "meeting", "activityParticipant", "activity",
      "expense", "expenseCategory", "cashMovement", "cashTransfer", "cashAccount",
      "ledgerEntry", "fiscalYear", "account", "receipt", "payment", "cotisationType",
      "adhesion", "member", "user",
    ]
    for (const t of tables) {
      await db[t].deleteMany({})
    }
  }

  // --- Users ---
  const seededPwHash = await hashPassword(DEMO_INITIAL_PASSWORD)
  const users = await Promise.all(
    [
      { username: "president", email: "president@sgiau.local", fullName: "Amadou Diallo", role: "PRESIDENT" },
      { username: "secretaire", email: "secretaire@sgiau.local", fullName: "Fatoumata Touré", role: "SECRETAIRE" },
      { username: "tresorier", email: "tresorier@sgiau.local", fullName: "Moussa Camara", role: "TRESORIER" },
      { username: "caissier", email: "caissier@sgiau.local", fullName: "Aminata Cissé", role: "CAISSIER" },
      { username: "commissaire", email: "commissaire@sgiau.local", fullName: "Ousmane Keïta", role: "COMMISSAIRE" },
      { username: "admin", email: "admin@sgiau.local", fullName: "Administrateur SGIAU", role: "ADMIN_IT" },
    ].map((u) =>
      db.user.create({
        data: {
          ...u,
          passwordHash: seededPwHash,
          isActive: true,
          failedAttempts: 0,
          mustChangePassword: true,
        },
      })
    )
  )
  const adminUser = users.find((u) => u.username === "admin")!

  // --- Fiscal year ---
  const fy = await db.fiscalYear.create({
    data: {
      name: "2024-2025",
      startDate: new Date("2024-10-01"),
      endDate: new Date("2025-09-30"),
      closed: false,
    },
  })

  // --- Chart of accounts ---
  const accountDefs = [
    { code: "1", name: "Classe 1 — Capitaux", type: "EQUITY" },
    { code: "11", name: "Report à nouveau", type: "EQUITY", parent: "1" },
    { code: "12", name: "Résultat de l'exercice", type: "EQUITY", parent: "1" },
    { code: "4", name: "Classe 4 — Tiers", type: "ASSET" },
    { code: "40", name: "Membres — cotisations à recevoir", type: "ASSET", parent: "4" },
    { code: "5", name: "Classe 5 — Trésorerie", type: "ASSET" },
    { code: "51", name: "Caisse principale", type: "ASSET", parent: "5" },
    { code: "52", name: "Banque", type: "ASSET", parent: "5" },
    { code: "53", name: "Mobile money", type: "ASSET", parent: "5" },
    { code: "6", name: "Classe 6 — Charges", type: "EXPENSE" },
    { code: "60", name: "Achats", type: "EXPENSE", parent: "6" },
    { code: "61", name: "Services extérieurs", type: "EXPENSE", parent: "6" },
    { code: "62", name: "Autres charges", type: "EXPENSE", parent: "6" },
    { code: "7", name: "Classe 7 — Produits", type: "REVENUE" },
    { code: "70", name: "Cotisations", type: "REVENUE", parent: "7" },
    { code: "71", name: "Dons et contributions", type: "REVENUE", parent: "7" },
    { code: "72", name: "Participations activités", type: "REVENUE", parent: "7" },
  ]
  const codeToAccount: Record<string, { id: string }> = {}
  for (const a of accountDefs) {
    const created = await db.account.create({
      data: {
        code: a.code,
        name: a.name,
        type: a.type,
        parentId: a.parent ? codeToAccount[a.parent].id : null,
      },
    })
    codeToAccount[a.code] = { id: created.id }
  }

  // --- Cash accounts ---
  const cashMain = await db.cashAccount.create({
    data: { name: "Caisse principale", accountId: codeToAccount["51"].id, balance: 0, currency: "FCFA" },
  })
  const cashBank = await db.cashAccount.create({
    data: { name: "Compte bancaire", accountId: codeToAccount["52"].id, balance: 0, currency: "FCFA" },
  })
  const cashMobile = await db.cashAccount.create({
    data: { name: "Mobile money", accountId: codeToAccount["53"].id, balance: 0, currency: "FCFA" },
  })

  // --- Cotisation types ---
  const cotAnnual = await db.cotisationType.create({
    data: { name: "Cotisation annuelle 2024-2025", kind: "ANNUAL", defaultAmount: 5000, academicYear: "2024-2025", isActive: true },
  })
  const cotMonthly = await db.cotisationType.create({
    data: { name: "Cotisation mensuelle", kind: "MONTHLY", defaultAmount: 500, isActive: true },
  })
  const cotDon = await db.cotisationType.create({
    data: { name: "Don / Soutien", kind: "DONATION", defaultAmount: 0, isActive: true },
  })

  // --- Expense categories ---
  const catDefs = ["Fournitures", "Logistique", "Communication", "Restauration", "Transport", "Honoraires", "Location"]
  const cats: Record<string, string> = {}
  for (const c of catDefs) {
    const cat = await db.expenseCategory.create({ data: { name: c } })
    cats[c] = cat.id
  }

  // --- Members ---
  const TOTAL_MEMBERS = 64
  const academicYear = "2024-2025"
  const members: Awaited<ReturnType<typeof db.member.create>>[] = []
  for (let i = 1; i <= TOTAL_MEMBERS; i++) {
    const sex = Math.random() > 0.5 ? "M" : "F"
    const firstName = sex === "M" ? pick(FIRST_NAMES_M) : pick(FIRST_NAMES_F)
    const lastName = pick(LAST_NAMES)
    const filiere = pick(FILIERES)
    const level = pick(LEVELS)
    const status = Math.random() > 0.12 ? "ACTIVE" : Math.random() > 0.5 ? "PENDING" : "SUSPENDED"
    const matricule = `${academicYear}-${String(i).padStart(4, "0")}`
    const m = await db.member.create({
      data: {
        matricule,
        firstName,
        lastName,
        sex,
        birthDate: new Date(randInt(1995, 2005), randInt(0, 11), randInt(1, 28)),
        phone: `+223 6${randInt(10, 99)} ${randInt(10, 99)} ${randInt(10, 99)} ${randInt(10, 99)}`,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@etu.local`,
        address: "Bamako, Mali",
        faculty: filiere,
        department: null,
        level,
        academicYear,
        status,
        qrCode: `SGIAU-${matricule}`,
      },
    })
    members.push(m)

    // Adhesion workflow for pending
    if (m.status === "PENDING") {
      await db.adhesion.create({
        data: {
          memberId: m.id,
          form: JSON.stringify({ submittedAt: new Date().toISOString() }),
          status: "PENDING",
        },
      })
    } else if (m.status === "ACTIVE") {
      await db.adhesion.create({
        data: {
          memberId: m.id,
          form: JSON.stringify({ submittedAt: new Date().toISOString() }),
          status: "PRESIDENT_APPROVED",
          sgValidatedById: users[1].id,
          sgValidatedAt: new Date(Date.now() - 86400000 * 7),
          presidentValidatedById: users[0].id,
          presidentValidatedAt: new Date(Date.now() - 86400000 * 6),
        },
      })
      // Member card
      await db.memberCard.create({
        data: {
          cardNumber: `C${academicYear.replace("-", "")}${String(i).padStart(4, "0")}`,
          memberId: m.id,
          issueDate: new Date(Date.now() - 86400000 * 5),
          expiryDate: new Date("2025-09-30"),
          qrCode: m.qrCode,
          status: "ACTIVE",
        },
      })
    }
  }

  // --- Payments + receipts for active members ---
  let receiptSeq = 1
  const cashier = users[3]
  let totalRevenue = 0
  for (const m of members.filter((x) => x.status === "ACTIVE")) {
    // Annual cotisation
    const paidAnnual = Math.random() > 0.2
    const amount = cotAnnual.defaultAmount
    const mode = pick(["CASH", "MOBILE", "BANK"])
    const payDate = new Date(Date.now() - randInt(1, 120) * 86400000)
    if (paidAnnual) {
      const ref = `PAY-${Date.now().toString(36).toUpperCase().slice(-6)}-${receiptSeq}`
      const payment = await db.payment.create({
        data: {
          reference: ref,
          memberId: m.id,
          cotisationTypeId: cotAnnual.id,
          amount,
          amountPaid: amount,
          paymentDate: payDate,
          paymentMode: mode,
          cashierId: cashier.id,
          status: "PAID",
        },
      })
      const cashAcc = mode === "CASH" ? cashMain : mode === "BANK" ? cashBank : cashMobile
      await db.cashMovement.create({
        data: {
          cashAccountId: cashAcc.id,
          type: "IN",
          amount,
          label: `Cotisation annuelle — ${m.firstName} ${m.lastName}`,
          date: payDate,
          refType: "PAYMENT",
          refId: payment.id,
          validated: true,
        },
      })
      await db.cashAccount.update({ where: { id: cashAcc.id }, data: { balance: { increment: amount } } })
      await db.ledgerEntry.create({
        data: {
          fiscalYearId: fy.id,
          accountId: codeToAccount["51"].id,
          date: payDate,
          debit: amount,
          credit: 0,
          label: `Cotisation ${m.matricule}`,
          refType: "PAYMENT",
          refId: payment.id,
        },
      })
      await db.ledgerEntry.create({
        data: {
          fiscalYearId: fy.id,
          accountId: codeToAccount["70"].id,
          date: payDate,
          debit: 0,
          credit: amount,
          label: `Cotisation ${m.matricule}`,
          refType: "PAYMENT",
          refId: payment.id,
        },
      })
      const receipt = await db.receipt.create({
        data: {
          number: `REC-${academicYear.replace("-", "")}-${String(receiptSeq).padStart(5, "0")}`,
          paymentId: payment.id,
          memberId: m.id,
          amount,
          cashierId: cashier.id,
          qrCode: payment.reference,
          createdAt: payDate,
        },
      })
      receiptSeq++
      totalRevenue += amount
    } else {
      // partial
      const partial = Math.round(amount * 0.5)
      const ref = `PAY-${Date.now().toString(36).toUpperCase().slice(-6)}-${receiptSeq}`
      await db.payment.create({
        data: {
          reference: ref,
          memberId: m.id,
          cotisationTypeId: cotAnnual.id,
          amount,
          amountPaid: partial,
          paymentDate: payDate,
          paymentMode: "CASH",
          cashierId: cashier.id,
          status: "PARTIAL",
        },
      })
    }

    // Random donation
    if (Math.random() > 0.7) {
      const don = randInt(1000, 10000)
      const donDate = new Date(Date.now() - randInt(1, 60) * 86400000)
      const ref = `PAY-${Date.now().toString(36).toUpperCase().slice(-5)}-D${receiptSeq}`
      const payment = await db.payment.create({
        data: {
          reference: ref,
          memberId: m.id,
          cotisationTypeId: cotDon.id,
          amount: don,
          amountPaid: don,
          paymentDate: donDate,
          paymentMode: "CASH",
          cashierId: cashier.id,
          status: "PAID",
        },
      })
      await db.cashMovement.create({
        data: {
          cashAccountId: cashMain.id,
          type: "IN",
          amount: don,
          label: `Don — ${m.firstName} ${m.lastName}`,
          date: donDate,
          refType: "PAYMENT",
          refId: payment.id,
          validated: true,
        },
      })
      await db.cashAccount.update({ where: { id: cashMain.id }, data: { balance: { increment: don } } })
      await db.ledgerEntry.create({
        data: { fiscalYearId: fy.id, accountId: codeToAccount["51"].id, date: donDate, debit: don, credit: 0, label: `Don ${m.matricule}`, refType: "PAYMENT", refId: payment.id },
      })
      await db.ledgerEntry.create({
        data: { fiscalYearId: fy.id, accountId: codeToAccount["71"].id, date: donDate, debit: 0, credit: don, label: `Don ${m.matricule}`, refType: "PAYMENT", refId: payment.id },
      })
      await db.receipt.create({
        data: {
          number: `REC-${academicYear.replace("-", "")}-${String(receiptSeq).padStart(5, "0")}`,
          paymentId: payment.id,
          memberId: m.id,
          amount: don,
          cashierId: cashier.id,
          qrCode: payment.reference,
          createdAt: donDate,
        },
      })
      receiptSeq++
      totalRevenue += don
    }
  }

  // --- Expenses ---
  const expenseLabels = [
    ["Achat fournitures bureau", "Fournitures"],
    ["Location salle de réunion", "Location"],
    ["Snack réunion mensuelle", "Restauration"],
    ["Communication & affiches", "Communication"],
    ["Transport members comité", "Transport"],
    ["Honoraires comptable", "Honoraires"],
    ["Logistique journée portes ouvertes", "Logistique"],
    ["Impression reçus & cartes", "Fournitures"],
  ]
  for (let i = 0; i < 18; i++) {
    const [label, catName] = pick(expenseLabels)
    const amount = randInt(2500, 75000)
    const date = new Date(Date.now() - randInt(1, 150) * 86400000)
    const validated = Math.random() > 0.3
    const exp = await db.expense.create({
      data: {
        reference: `EXP-${String(i + 1).padStart(4, "0")}`,
        label,
        categoryId: cats[catName],
        amount,
        date,
        responsibleId: users[2].id,
        validatorId: validated ? users[2].id : null,
        status: validated ? "VALIDATED" : "PENDING",
        fiscalYearId: fy.id,
        note: "Dépense de fonctionnement",
      },
    })
    if (validated) {
      await db.cashMovement.create({
        data: {
          cashAccountId: cashMain.id,
          type: "OUT",
          amount,
          label: `Dépense — ${label}`,
          date,
          refType: "EXPENSE",
          refId: exp.id,
          validated: true,
        },
      })
      await db.cashAccount.update({ where: { id: cashMain.id }, data: { balance: { increment: -amount } } })
      await db.ledgerEntry.create({
        data: { fiscalYearId: fy.id, accountId: codeToAccount["60"].id, date, debit: amount, credit: 0, label, refType: "EXPENSE", refId: exp.id },
      })
      await db.ledgerEntry.create({
        data: { fiscalYearId: fy.id, accountId: codeToAccount["51"].id, date, debit: 0, credit: amount, label, refType: "EXPENSE", refId: exp.id },
      })
    }
  }

  // --- Activities ---
  const activityDefs = [
    { name: "Journée portes ouvertes", type: "EVENT", budget: 250000, days: 1 },
    { name: "Sortie pédagogique à Ségou", type: "OUTING", budget: 400000, days: 2 },
    { name: "Conférence — entrepreneuriat", type: "CONFERENCE", budget: 80000, days: 1 },
    { name: "Tournoi de football inter-facultés", type: "EVENT", budget: 150000, days: 1 },
  ]
  for (let i = 0; i < activityDefs.length; i++) {
    const a = activityDefs[i]
    const start = new Date(Date.now() - randInt(5, 60) * 86400000)
    const status = start < new Date() ? "DONE" : "PLANNED"
    const act = await db.activity.create({
      data: {
        name: a.name,
        description: `${a.name} organisée par l'amicale.`,
        type: a.type,
        startDate: start,
        endDate: new Date(start.getTime() + a.days * 86400000),
        location: pick(["Campus principal", "Amphi A", "Salle des conférences", "Stade universitaire"]),
        budget: a.budget,
        status,
        fiscalYearId: fy.id,
      },
    })
    // participants
    const sample = members.filter((m) => m.status === "ACTIVE").sort(() => Math.random() - 0.5).slice(0, randInt(8, 20))
    for (const m of sample) {
      await db.activityParticipant.create({ data: { activityId: act.id, memberId: m.id } })
    }
    // one linked expense
    const amount = randInt(20000, 120000)
    const exp = await db.expense.create({
      data: {
        reference: `EXP-A${i + 1}`,
        label: `Dépense — ${a.name}`,
        categoryId: cats["Logistique"],
        amount,
        date: start,
        responsibleId: users[2].id,
        validatorId: users[2].id,
        status: "VALIDATED",
        fiscalYearId: fy.id,
        activityId: act.id,
      },
    })
    await db.cashMovement.create({
      data: { cashAccountId: cashMain.id, type: "OUT", amount, label: `Dépense activité — ${a.name}`, date: start, refType: "EXPENSE", refId: exp.id, validated: true },
    })
    await db.cashAccount.update({ where: { id: cashMain.id }, data: { balance: { increment: -amount } } })
  }

  // --- Meetings ---
  for (let i = 0; i < 5; i++) {
    const start = new Date(Date.now() - i * 14 * 86400000)
    const meeting = await db.meeting.create({
      data: {
        title: `Réunion mensuelle #${5 - i}`,
        agenda: "1. Rapport moral\n2. Rapport financier\n3. Activités\n4. Divers",
        decisions: "Validation du budget activités ; Approbation du PV précédent.",
        startDate: start,
        endDate: new Date(start.getTime() + 7200000),
        location: "Salle de réunion — Bâtiment A",
        status: "DONE",
      },
    })
    const sample = members.filter((m) => m.status === "ACTIVE").sort(() => Math.random() - 0.5).slice(0, randInt(10, 25))
    for (const m of sample) {
      await db.meetingParticipant.create({ data: { meetingId: meeting.id, memberId: m.id, attended: Math.random() > 0.2 } })
    }
  }

  // --- Election ---
  const election = await db.election.create({
    data: {
      name: "Élections Bureau Exécutif 2024-2025",
      description: "Élection du président, du secrétaire général et du trésorier.",
      startDate: new Date(Date.now() - 10 * 86400000),
      endDate: new Date(Date.now() + 4 * 86400000),
      status: "OPEN",
    },
  })
  const candidatesPool = members.filter((m) => m.status === "ACTIVE").slice(0, 6)
  const positions = ["Président", "Secrétaire général", "Trésorier"]
  for (let p = 0; p < positions.length; p++) {
    for (let c = 0; c < 2; c++) {
      const m = candidatesPool[p * 2 + c]
      if (!m) continue
      await db.electionCandidate.create({
        data: { electionId: election.id, memberId: m.id, position: positions[p], program: `Programme pour le poste de ${positions[p]}.` },
      })
    }
  }
  // some ballots
  const cands = await db.electionCandidate.findMany()
  for (let i = 0; i < 30; i++) {
    const c = pick(cands)
    const m = pick(members)
    await db.voteBallot.create({
      data: { electionId: election.id, candidateId: c.id, memberId: m.id, votedAt: new Date(Date.now() - randInt(1, 9) * 86400000) },
    })
  }

  // --- Internal vote ---
  const vote = await db.vote.create({
    data: {
      title: "Approbation du règlement intérieur",
      question: "Approuvez-vous le nouveau règlement intérieur de l'amicale ?",
      anonymous: true,
      startDate: new Date(Date.now() - 5 * 86400000),
      endDate: new Date(Date.now() + 2 * 86400000),
      status: "OPEN",
      qrCode: "VOTE-RI-2024",
    },
  })
  const opts = ["Pour", "Contre", "Abstention"]
  const optIds: string[] = []
  for (const o of opts) {
    const opt = await db.voteOption.create({ data: { voteId: vote.id, label: o } })
    optIds.push(opt.id)
  }
  for (let i = 0; i < 40; i++) {
    const m = pick(members)
    await db.voteBallot.create({
      data: { voteId: vote.id, optionId: pick(optIds), memberId: m.id, votedAt: new Date(Date.now() - randInt(1, 4) * 86400000) },
    })
  }

  // --- Documents ---
  const docDefs = [
    { title: "Statuts de l'amicale", category: "LEGAL", visibility: "PUBLIC" },
    { title: "Règlement intérieur", category: "LEGAL", visibility: "MEMBERS" },
    { title: "Rapport moral 2023-2024", category: "REPORT", visibility: "MEMBERS" },
    { title: "Rapport financier 2023-2024", category: "FINANCE", visibility: "STAFF" },
    { title: "PV réunion de rentrée", category: "GENERAL", visibility: "MEMBERS" },
  ]
  for (const d of docDefs) {
    await db.document.create({ data: { title: d.title, category: d.category, visibility: d.visibility, fileType: "PDF", tags: JSON.stringify([d.category]) } })
  }

  // --- Inventory ---
  const invDefs = [
    { name: "Ordinateur portable", category: "Informatique", price: 450000, cond: "GOOD", loc: "Bureau exécutif" },
    { name: "Projecteur", category: "Audiovisuel", price: 180000, cond: "GOOD", loc: "Salle de réunion" },
    { name: "Tableau blanc", category: "Mobilier", price: 35000, cond: "GOOD", loc: "Salle de réunion" },
    { name: "Chaises pliantes (x20)", category: "Mobilier", price: 120000, cond: "GOOD", loc: "Stock" },
    { name: "Sonorisation", category: "Audiovisuel", price: 250000, cond: "DAMAGED", loc: "Stock" },
    { name: "Tente pliante", category: "Logistique", price: 90000, cond: "GOOD", loc: "Stock" },
  ]
  for (let i = 0; i < invDefs.length; i++) {
    const it = invDefs[i]
    await db.inventoryItem.create({
      data: {
        inventoryNo: `INV-${String(i + 1).padStart(4, "0")}`,
        name: it.name,
        category: it.category,
        purchasePrice: it.price,
        currentValue: Math.round(it.price * 0.8),
        condition: it.cond,
        location: it.loc,
        purchaseDate: new Date(Date.now() - randInt(60, 400) * 86400000),
      },
    })
  }

  // --- Formations ---
  for (let i = 0; i < 3; i++) {
    const start = new Date(Date.now() + i * 21 * 86400000)
    const f = await db.formation.create({
      data: {
        title: pick(["Initiation au design graphique", "Gestion de projet", "Bureautique avancée"]),
        description: "Formation gratuite pour les membres.",
        trainer: pick(["M. Konaté", "Mme Sidibé", "Dr. Bah"]),
        startDate: start,
        endDate: new Date(start.getTime() + 2 * 86400000),
        location: "Salle informatique",
        budget: randInt(30000, 90000),
      },
    })
    const sample = members.filter((m) => m.status === "ACTIVE").sort(() => Math.random() - 0.5).slice(0, randInt(6, 15))
    for (const m of sample) {
      await db.formationParticipant.create({ data: { formationId: f.id, memberId: m.id } })
    }
  }

  // --- Library ---
  const libDefs = [
    { title: "Algorithmique en pratique", author: "T. Cormen", category: "Informatique", copies: 3 },
    { title: "Droit civil — Les obligations", author: "F. Terré", category: "Droit", copies: 2 },
    { title: "Économie monétaire", author: "M. Friedman", category: "Économie", copies: 2 },
    { title: "Histoire du Mali", author: "A. Bathily", category: "Histoire", copies: 4 },
  ]
  for (const l of libDefs) {
    await db.libraryResource.create({ data: { title: l.title, author: l.author, category: l.category, totalCopies: l.copies, available: l.copies } })
  }

  // --- Partners ---
  await db.partner.create({ data: { name: "Banque Nationale de Développement", type: "SPONSOR", contactName: "M. Coulibaly", contactPhone: "+223 70 00 00 00", contribution: 300000, startDate: new Date("2024-10-01") } })
  await db.partner.create({ data: { name: "ONG Éducation Pour Tous", type: "PARTNER", contactName: "Mme Diarra", contactEmail: "contact@ept.org", contribution: 150000 } })
  await db.partner.create({ data: { name: "Faculté des Sciences", type: "INSTITUTION", contactName: "Doyen", contribution: 0 } })

  // --- Archives ---
  for (let y = 2020; y <= 2023; y++) {
    await db.archive.create({ data: { title: `Rapport d'activités ${y}-${y + 1}`, year: String(y), category: "DOCUMENT", description: `Archives de l'exercice ${y}.` } })
    await db.archive.create({ data: { title: `Galerie photos ${y}`, year: String(y), category: "PHOTO" } })
  }

  // --- Announcements ---
  await db.announcement.create({ data: { title: "Bienvenue à l'amicale 2024-2025", body: "Chers membres, bienvenue dans cette nouvelle année universitaire !", audience: "ALL", pinned: true, publishedAt: new Date() } })
  await db.announcement.create({ data: { title: "Rappel cotisation annuelle", body: "La cotisation annuelle de 5000 FCFA est due avant le 30 novembre.", audience: "MEMBERS", publishedAt: new Date(Date.now() - 86400000) } })

  // --- Notifications ---
  for (const u of users) {
    await db.notification.create({ data: { userId: u.id, title: "Bienvenue sur SGIAU", message: "Votre compte a été configuré avec succès.", channel: "APP", type: "INFO" } })
  }

  await db.auditLog.create({
    data: { userId: adminUser.id, action: "SEED", entity: "SYSTEM", description: "Base de données initialisée avec données de démonstration." },
  })

  return { skipped: false, message: "Seed complete", counts: { members: TOTAL_MEMBERS, users: users.length } }
}
