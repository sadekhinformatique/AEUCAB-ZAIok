// SGIAU — central constants

export const APP_NAME = "SGIAU"
export const APP_FULL_NAME = "Système de Gestion Intégrée de l'Amicale Universitaire"
export const CURRENCY = "FCFA"

// ============================================================
// UNIVERSITÉ CHEIKH AHMADOU BAMBA (UCAB) — informations officielles
// Source : https://www.ucab.sn
// ============================================================

export const UCAB_FULL_NAME = "Université Cheikh Ahmadou Bamba"
export const UCAB_SHORT_NAME = "UCAB"
export const UCAB_ORG_NAME = "Amicale des Étudiants — AEUCAB-ZAI"
export const UCAB_MOTTO = "L'Excellence au service du savoir"
export const UCAB_EMAIL = "contact@ucab.sn"
export const UCAB_PHONE = "+(221) 776458011"
export const UCAB_WEBSITE = "https://www.ucab.sn"

export const UCAB_CENTRES: {
  name: string
  faculty: string
  location: string
  email: string
}[] = [
  {
    name: "Centre Cheikh Mouhamadou Mourtada Mbacké — Dakar",
    faculty: "Faculté des Sciences Islamiques et Technologies",
    location: "Dakar Mbao, face LGI Mbao",
    email: "dakarcentre@ucab.sn",
  },
  {
    name: "Centre Serigne Mame Mor Diarra Mbacké — Saint-Louis",
    faculty: "Faculté des Technologies Agro-Alimentaires, des Sciences Économiques et Sociales",
    location: "Saint-Louis",
    email: "stlouiscentre@ucab.sn",
  },
  {
    name: "Centre de Touba Darou Alim (siège)",
    faculty: "Faculté des Sciences Religieuses, des Humanités et Civilisations",
    location: "Touba Darou Alim",
    email: "toubacentre@ucab.sn",
  },
  {
    name: "Centre Serigne Saliou Mbacké — Bambey",
    faculty: "Faculté de Développement Rural",
    location: "Bambey",
    email: "bambeycentre@ucab.sn",
  },
]

// ============================================================
// STRUCTURE ACADÉMIQUE — configuration officielle de l'université
// L'Année Préparatoire (AP) est une FILIÈRE sans niveau :
// AP → L1 → L2 → L3. Aucun L4, M1, M2, Master ou Doctorat.
// ============================================================

// Filières officielles : 3 filières de Licence + l'Année Préparatoire (AP)
export const FILIERES = ["Informatique et Gestion", "Électromécanique", "Administration", "AP"] as const
export type Filiere = (typeof FILIERES)[number]

// L'Année Préparatoire n'a pas de niveau : quand elle est sélectionnée
// comme filière, le champ « Niveau » est désactivé.
export const AP_FILIERE = "AP"
export function isAP(filiere: string | null | undefined): boolean {
  return !!filiere && filiere.trim().toUpperCase() === "AP"
}

export const LEVELS = ["L1", "L2", "L3"] as const
export type Level = (typeof LEVELS)[number]

export const LICENCE_LEVELS = ["L1", "L2", "L3"] as const

export const LEVEL_LABELS: Record<string, string> = {
  AP: "Année Préparatoire",
  L1: "Licence 1",
  L2: "Licence 2",
  L3: "Licence 3",
}

// Progression officielle : AP → L1 → L2 → L3
export const LEVEL_SEQUENCE: readonly string[] = LEVELS

// Anciens niveaux retirés → niveau terminal de la Licence
// (AP n'est plus un niveau : c'est une filière sans niveau → null)
export const LEGACY_LEVELS: Record<string, string> = {
  L4: "L3",
  M1: "L3",
  M2: "L3",
  MASTER: "L3",
  DOCTORAT: "L3",
}

// Anciennes facultés / intitulés → filières officielles
export const LEGACY_FILIERES: Record<string, string> = {
  sciences: "Informatique et Gestion",
  informatique: "Informatique et Gestion",
  economie: "Informatique et Gestion",
  économie: "Informatique et Gestion",
  gestion: "Informatique et Gestion",
  ingenierie: "Électromécanique",
  ingénierie: "Électromécanique",
  electromechanique: "Électromécanique",
  électromécanique: "Électromécanique",
  droit: "Administration",
  lettres: "Administration",
  medecine: "Administration",
  médecine: "Administration",
}

// Corrige une valeur de niveau vers la structure officielle
// (AP/L1/L2/L3) ; les anciens niveaux (M1, M2, L4, Master…) deviennent L3.
export function normalizeLevel(value: string | null | undefined): string | null {
  if (!value) return null
  const v = value.trim()
  if (!v) return null
  const upper = v.toUpperCase()
  if ((LEVELS as readonly string[]).includes(upper)) return upper
  return LEGACY_LEVELS[upper] ?? null
}

// Corrige une valeur de filière vers l'une des filières officielles
// (3 filières de Licence + AP) ; les anciennes facultés sont converties.
export function normalizeFiliere(value: string | null | undefined): string | null {
  if (!value) return null
  const v = value.trim()
  if (!v) return null
  const lower = v.toLocaleLowerCase("fr")
  const canonical = (FILIERES as readonly string[]).find((f) => f.toLocaleLowerCase("fr") === lower)
  if (canonical) return canonical
  return LEGACY_FILIERES[lower] ?? null
}

export type Role =
  | "PRESIDENT"
  | "SECRETAIRE"
  | "TRESORIER"
  | "CAISSIER"
  | "COMMISSAIRE"
  | "ADMIN_IT"
  | "MEMBER"
  | "CUSTOM"

export const ROLE_LABELS: Record<string, string> = {
  PRESIDENT: "Président",
  SECRETAIRE: "Secrétaire général",
  TRESORIER: "Trésorier",
  CAISSIER: "Caissier",
  COMMISSAIRE: "Commissaire aux comptes",
  ADMIN_IT: "Administrateur informatique",
  MEMBER: "Membre",
  CUSTOM: "Rôle personnalisé",
}

export const ROLE_COLORS: Record<string, string> = {
  PRESIDENT: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  SECRETAIRE: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  TRESORIER: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200",
  CAISSIER: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-200",
  COMMISSAIRE: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200",
  ADMIN_IT: "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200",
  MEMBER: "bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200",
  CUSTOM: "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-950 dark:text-fuchsia-200",
}

export const MEMBER_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Actif",
  SUSPENDED: "Suspendu",
  ARCHIVED: "Archivé",
  PENDING: "En attente",
}

export const MEMBER_STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  SUSPENDED: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  ARCHIVED: "bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
  PENDING: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-200",
}

export const PAYMENT_MODE_LABELS: Record<string, string> = {
  CASH: "Espèces",
  MOBILE: "Mobile money",
  BANK: "Virement bancaire",
  CARD: "Carte",
  CHEQUE: "Chèque",
}

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PAID: "Payé",
  PARTIAL: "Partiel",
  CANCELLED: "Annulé",
}

export const COTISATION_KIND_LABELS: Record<string, string> = {
  ANNUAL: "Cotisation annuelle",
  MONTHLY: "Cotisation mensuelle",
  EXCEPTIONAL: "Contribution exceptionnelle",
  EVENT: "Participation événement",
  DONATION: "Don",
}

export const ADHESION_STATUS_LABELS: Record<string, string> = {
  PENDING: "En attente",
  SG_APPROVED: "Validé par le secrétaire",
  PRESIDENT_APPROVED: "Validé par le président",
  REFUSED: "Refusé",
}

export const EXPENSE_STATUS_LABELS: Record<string, string> = {
  PENDING: "En attente",
  VALIDATED: "Validée",
  REJECTED: "Rejetée",
}

export const ACTIVITY_STATUS_LABELS: Record<string, string> = {
  PLANNED: "Planifiée",
  ONGOING: "En cours",
  DONE: "Terminée",
  CANCELLED: "Annulée",
}

export const MODULE_GROUPS: { group: string; modules: { id: string; label: string; icon: string }[] }[] = [
  {
    group: "Pilotage",
    modules: [
      { id: "dashboard", label: "Tableau de bord", icon: "LayoutDashboard" },
      { id: "statistics", label: "Statistiques", icon: "BarChart3" },
      { id: "search", label: "Recherche globale", icon: "Search" },
    ],
  },
  {
    group: "Membres",
    modules: [
      { id: "members", label: "Membres", icon: "Users" },
      { id: "adhesion", label: "Adhésions", icon: "UserPlus" },
      { id: "cards", label: "Cartes membres", icon: "CreditCard" },
    ],
  },
  {
    group: "Finances",
    modules: [
      { id: "cotisations", label: "Cotisations", icon: "Wallet" },
      { id: "receipts", label: "Reçus", icon: "ReceiptText" },
      { id: "finance", label: "Comptabilité", icon: "BookOpen" },
      { id: "cash", label: "Caisse", icon: "Landmark" },
      { id: "expenses", label: "Dépenses", icon: "TrendingDown" },
    ],
  },
  {
    group: "Vie associative",
    modules: [
      { id: "activities", label: "Activités", icon: "CalendarDays" },
      { id: "meetings", label: "Réunions", icon: "UsersRound" },
      { id: "presences", label: "Présences", icon: "ClipboardCheck" },
      { id: "elections", label: "Élections", icon: "Vote" },
      { id: "votes", label: "Votes internes", icon: "CheckSquare" },
    ],
  },
  {
    group: "Ressources",
    modules: [
      { id: "documents", label: "Documents", icon: "FolderArchive" },
      { id: "inventory", label: "Inventaire", icon: "Boxes" },
      { id: "formations", label: "Formations", icon: "GraduationCap" },
      { id: "library", label: "Bibliothèque", icon: "Library" },
      { id: "partners", label: "Partenaires", icon: "Handshake" },
      { id: "archives", label: "Archives", icon: "Archive" },
    ],
  },
  {
    group: "Système",
    modules: [
      { id: "notifications", label: "Notifications", icon: "Bell" },
      { id: "import-export", label: "Import / Export", icon: "ArrowUpDown" },
      { id: "users", label: "Utilisateurs & sécurité", icon: "ShieldCheck" },
      { id: "audit", label: "Journal d'audit", icon: "ScrollText" },
      { id: "sync", label: "Synchronisation", icon: "RefreshCw" },
    ],
  },
]

export const ALL_MODULE_IDS = MODULE_GROUPS.flatMap((g) => g.modules.map((m) => m.id))
