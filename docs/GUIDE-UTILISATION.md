# SGIAU — Présentation du système & guide d'utilisation

**SGIAU** = **S**ystème de **G**estion **I**ntégrée de l'**A**micale **U**niversitaire (AEUCAB-ZAI).

Application web complète de gestion d'une amicale d'étudiants : membres, adhésions,
cotisations, comptabilité, caisse, dépenses, activités, réunions, élections, documents,
inventaire, formations, bibliothèque, partenaires, archives, notifications et sécurité.

---

## 1. Présentation du système

### 1.1 Ce que fait SGIAU

SGIAU centralise **toute la vie administrative et associative** de l'amicale dans une
seule application :

- **Gestion des membres** : annuaire, fiches, statuts (actif / suspendu / archivé / en attente),
  matricules, QR codes, import/export CSV.
- **Adhésions** : workflow de validation en plusieurs étapes (secrétaire → président).
- **Finances** : cotisations (annuelle, mensuelle, don…), paiements (espèces, mobile money,
  banque), reçus PDF avec QR code, comptabilité en partie double (journal, plan comptable,
  balance, exercices), caisse multi-comptes, dépenses avec validation.
- **Vie associative** : activités, réunions (ODJ, PV), présences (manuel + QR code),
  élections, votes internes (anonymes, un vote par membre).
- **Ressources** : documents, inventaire, formations, bibliothèque, partenaires, archives.
- **Système** : notifications, import/export, utilisateurs & rôles, journal d'audit,
  synchronisation hors-ligne.

### 1.2 Architecture technique

| Couche | Technologie |
|---|---|
| Framework | Next.js 16 (App Router) |
| Langage | TypeScript 5 |
| Interface | Tailwind CSS 4 + shadcn/ui + Lucide icons |
| Graphiques | Recharts |
| ORM | Prisma 6 |
| Base de données | **Neon PostgreSQL** (cloud) |
| État | Zustand + TanStack Query |

### 1.3 Accès

| Accès | Adresse |
|---|---|
| **Application web (production)** | https://aeucab-zai.vercel.app |
| Développement local | http://localhost:3000 |
| **Espace membre** (application mobile web) | https://aeucab-zai.vercel.app/member-space |
| Vérification d'état (santé) | `/api/health` (répond `{"status":"healthy",...}`) |

---

## 2. Les modules (28, répartis en 6 familles)

| Famille | Modules |
|---|---|
| **Pilotage** | Tableau de bord, Statistiques, Recherche globale |
| **Membres** | Membres, Adhésions, Cartes membres, Espace membre |
| **Finances** | Cotisations, Reçus, Comptabilité, Caisse, Dépenses |
| **Vie associative** | Activités, Réunions, Présences, Élections, Votes internes |
| **Ressources** | Documents, Inventaire, Formations, Bibliothèque, Partenaires, Archives |
| **Système** | Notifications, Import/Export, Utilisateurs & sécurité, Journal d'audit, Synchronisation |

---

## 3. Guide d'utilisation

### 3.1 Connexion

1. Ouvrez **https://aeucab-zai.vercel.app** → vous êtes redirigé vers `/login`.
2. Saisissez votre **identifiant** (ex. `president`) et votre **mot de passe**.
3. Au **premier login avec un mot de passe temporaire**, l'application vous force à
   définir un mot de passe personnel (page `/change-password`), conforme à la politique :
   **8 caractères minimum, une majuscule, une minuscule, un chiffre et un caractère spécial**.

> ⚠️ **Sécurité** : après **5 tentatives échouées**, le compte est **verrouillé 15 minutes**.
> Les mots de passe ne sont jamais stockés en clair (hachés bcrypt).

### 3.2 Navigation

- **Menu latéral** : les modules sont groupés en 6 familles (cf. §2). La navigation
  clavier fonctionne (↑/↓, Entrée).
- **Tableau de bord** : vue d'ensemble (membres, finances, alertes, graphiques).
- **Recherche globale** : recherche multicritère sur toutes les entités.
- Le rôle de votre compte détermine les modules et actions accessibles (voir §4).

### 3.3 Parcours type

**1. Un nouveau membre adhère**
`Adhésions` → la demande apparaît **En attente** → le **secrétaire** la valide
(`SG_APPROVED`) → le **président** l'approuve (`PRESIDENT_APPROVED`) → le membre devient
**Actif**, une **carte membre** avec QR code est générée.

**2. Le membre paie sa cotisation**
`Cotisations` → choisir le type (annuelle…) → encaisser le paiement (espèces, mobile money,
banque) → un **reçu PDF avec QR code** est généré automatiquement → la **comptabilité**
et la **caisse** sont mises à jour.

**3. Une dépense est engagée**
`Dépenses` → création par le responsable → **validation** (trésorier/président) →
écritures comptables automatiques et mouvement de caisse.

**4. Une élection / un vote**
`Élections` → candidats par poste → vote électronique (un vote par membre, QR code) →
résultats. `Votes internes` : votes anonymes avec options.

---

## 4. Les rôles et leur travail dans le système

### 4.1 Matrice des permissions

| Rôle | Consulter | Ajouter | Modifier | Supprimer | Valider | Exporter | Imprimer |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **ADMIN_IT** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **PRESIDENT** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **SECRETAIRE** | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ |
| **TRESORIER** | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ |
| **CAISSIER** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **COMMISSAIRE** | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **MEMBER** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **CUSTOM** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

> ⚠️ À noter : la matrice ci-dessus est celle du module « Utilisateurs & sécurité »
> (affichée dans l'application). Côté code, les contrôles **strictes** (`requireAdmin`)
> ne protègent actuellement que les routes `users` et `audit` ; les autres modules
> reposent sur une session valide. Une montée en rigueur RBAC est recommandée (voir
> `AUDIT_SGIAU.md`, constat S2).

### 4.2 Chaque rôle en détail

#### 🛡️ ADMIN_IT — Administrateur informatique
**Rôle technique** : maîtrise totale du système.
- Gère les **utilisateurs** (création, rôles, activation, réinitialisation des mots de
  passe), la **sécurité** (verrouillages, sessions) et le **journal d'audit**.
- Configure la **synchronisation** et l'**import/export** des données.
- Accès complet à tous les modules, y compris suppression (dernier recours).
- C'est lui qui crée les comptes du bureau exécutif et applique la politique de mot de
  passe fort. **Mot de passe `admin` : roté hors du dépôt (cf. DEPLOY.md).**

#### 👑 PRESIDENT — Président
**Rôle décisionnel** : pilote l'amicale et a le dernier mot sur les validations.
- **Valide en dernier ressort** les adhésions (après le secrétaire) — étape
  `PRESIDENT_APPROVED`.
- **Valide les dépenses** et les opérations importantes.
- Suit le **tableau de bord**, les **statistiques** et la **trésorerie** globale.
- Peut tout consulter, ajouter, modifier, supprimer, valider, exporter, imprimer.

#### 📝 SECRETAIRE — Secrétaire général
**Rôle administratif** : garant de la vie documentaire et des procédures.
- **Première validation des adhésions** (étape `SG_APPROVED`) et tenue du **registre
  des membres**.
- Rédige les **PV de réunions**, ordres du jour, décisions ; gère **documents**,
  **archives**, **annonces** et notifications aux membres.
- Organise les **présences** (manuel + QR code).
- Peut créer, modifier et valider, mais **ne supprime pas**.

#### 💰 TRESORIER — Trésorier
**Rôle financier** : responsable de la comptabilité et du suivi budgétaire.
- Gère les **cotisations** (types, montants), le **plan comptable**, la **comptabilité**
  (journal, balance, exercices, clôture) et les **dépenses** (création + validation).
- Suit les **reçus** et les **mouvements de caisse**.
- Peut créer, modifier et valider, mais **ne supprime pas** (traçabilité financière).

#### 🧾 CAISSIER — Caissier
**Rôle opérationnel** : encaisse les paiements au quotidien.
- **Encaissement des cotisations** (espèces, mobile money, banque) et émission des
  **reçus** (impression).
- Gère la **caisse** (entrées, sorties, transferts entre comptes).
- Peut consulter et ajouter, **imprimer des reçus**, mais **ne modifie pas, ne valide pas,
  ne supprime pas** : toute correction passe par le trésorier.

#### 🔎 COMMISSAIRE — Commissaire aux comptes
**Rôle de contrôle** : vérifie la régularité des opérations (contre-pouvoir).
- **Consulte** l'ensemble des données (membres, finances, caisse, dépenses, votes).
- **Exporte** et **imprime** pour produire des rapports de contrôle.
- **Ne crée, ne modifie, ne valide et ne supprime rien** : lecture seule garantie.

#### 👤 MEMBER — Membre
**Rôle adhérent** : accès limité à l'**espace membre** (application mobile web).
- Consulte les **annonces**, sa **cotisation** et ses **reçus**, et peut faire des
  **demandes**.
- Ne modifie rien dans le back-office.

#### ⚙️ CUSTOM — Rôle personnalisé
Rôle vierge (lecture seule par défaut) destiné à être paramétré selon les besoins
spécifiques de l'amicale (ex. responsable communication, responsable sport…).

### 4.3 Comptes actuellement en base (production)

| Identifiant | Rôle | Email |
|---|---|---|
| `admin` | ADMIN_IT | admin@sgiau.local |
| `president` | PRESIDENT | president@ucab.com |
| `secretaire` | SECRETAIRE | secretaire@ucab.com |
| `tresorier` | TRESORIER | tresorier@ucab.com |
| `caissier` | CAISSIER | caissier@ucab.com |
| `commissaire` | COMMISSAIRE | commissaire@ucab.com |

> Les mots de passe de ces comptes ont été **réinitialisés** (mots de passe temporaires
> affichés **une seule fois** lors de la réinitialisation, changement forcé au premier
> login). Ils ne figurent volontairement **pas** dans ce document. En cas de perte,
> un administrateur peut réinitialiser un mot de passe (module « Utilisateurs &
> sécurité » ou procédure `bun run auth:init`).

---

## 5. Sécurité

- **Authentification réelle** : mots de passe hachés **bcrypt (coût 12)**, cookies de
  session `httpOnly` / `sameSite` / `secure`, jetons **HMAC-SHA256** avec expiration.
- **Verrouillage** : 5 échecs → 15 minutes de blocage.
- **Politique de mot de passe fort** appliquée à la création et au changement.
- **Changement forcé** au premier login après un mot de passe temporaire.
- **Journal d'audit** : chaque action (création, modification, suppression, validation,
  export, impression) est tracée avec avant/après en JSON.
- **Seed désactivé en production** (HTTP 403).
- En-têtes de sécurité HTTP (nosniff, X-Frame-Options, Referrer-Policy…).

---

## 6. Développement & déploiement

- **Démarrage local** : `bun install` → `.env` (`DATABASE_URL` Neon + `AUTH_SECRET`) →
  `bun run db:push` → `bun run auth:init` → `bun run dev` (port 3000).
- **Déploiement** : poussée sur `main` → workflow GitHub Actions « Deploy to Vercel » →
  site https://aeucab-zai.vercel.app (voir `docs/DEPLOY.md` pour le déblocage des comptes).
- **Base de données** : Neon PostgreSQL, schéma géré par Prisma (`prisma/schema.prisma`).
