# Audit de sécurité — SGIAU

**Date :** 9 août 2026
**Outil :** revue de code statique manuelle (lecture seule, aucun fichier modifié)

---

## Périmètre

Application SGIAU — gestion associative (adhésions, membres, cartes, cotisations, finances, scrutins, formations, bibliothèque, espace membre). Stack : **Next.js 16 (App Router)**, **Prisma + PostgreSQL** (provider réel `postgresql`, le commentaire d'en-tête du schéma dit « SQLite » de façon obsolète), **bcryptjs** (12 rounds), session par cookie signé HMAC-SHA256 (`sgiau_session`, TTL 12 h), `AUTH_SECRET` ≥ 32 caractères.

Fichiers examinés :
- `src/lib/sgiau/auth.ts`, `token.ts`, `api.ts`, `constants.ts`, `format.ts` ; `src/lib/db.ts`
- `src/middleware.ts`, `next.config.ts`
- `prisma/schema.prisma` (intégral)
- Tous les `src/app/api/**/route.ts` (auth, users, audit, adhesion, members, cards, cotisations, receipts, expenses, cash, finance, votes, elections, documents, inventory, library, formations, partners, archives, activities, meetings, presences, member-space, notifications, sync, seed, import-export, search, statistics, dashboard, health)

---

## Méthodologie

1. Cartographie de l'authentification (middleware, cookies, token) et des helpers (`getCurrentUserId`, `requireAdmin`, `audit`, `serialize`).
2. Lecture ligne à ligne de chaque route API : contrôle d'accès, validation, transactions, gestion d'erreur, fuite de données.
3. Vérification croisée des invariants métier (paiement → reçu → caisse → écritures ; vote unique par membre ; anonymat des scrutins ; génération de références).
4. Analyse du modèle Prisma : contraintes uniques, relations, index (pour détecter les doublons non protégés côté base).
5. Chaque constat est qualifié « **bug avéré** » (défaut exploitable ou comportement incorrect démontré dans le code) ou « **amélioration** » (durcissement recommandé), avec `fichier:ligne`, une citation courte et un correctif proposé.

---

## Constats par sévérité

### CRITIQUE

#### C1 — Mot de passe initial codé en dur et partagé
`src/lib/sgiau/auth.ts:16` et `src/app/api/adhesion/[id]/route.ts:69`
> `DEFAULT_INITIAL_PASSWORD = "Sgiau@2026!"` … `passwordHash: await bcrypt.hash(DEFAULT_INITIAL_PASSWORD, 12)`

**Bug avéré.** Le compte créé lors de l'approbation présidentielle d'une adhésion est ouvert avec un mot de passe public connu. Aucune obligation de changement, aucun flag « premier login ».

**Correctif :** générer un mot de passe aléatoire par compte (ou lien d'activation à usage unique), forcer le changement à la première connexion, et interdire/expulser le secret par défaut.

#### C2 — Double vote possible (course TOCTOU, aucune contrainte DB)
`prisma/schema.prisma:478-479` et `src/app/api/votes/[id]/ballots/route.ts:20-23`
> `@@index([voteId, memberId])` … `findFirst({ where: { voteId, memberId } })` puis `create`

**Bug avéré.** `VoteBallot` n'a qu'un **index** (pas de `@@unique`) ; l'anti-doublon est applicatif (`findFirst` puis `create`), donc deux requêtes concurrentes passent les deux contrôles et créent deux bulletins pour le même membre. À l'inverse, `ActivityParticipant`, `MeetingParticipant`, `FormationParticipant` et `ElectionCandidate` ont bien `@@unique`.

**Correctif :** ajouter `@@unique([voteId, memberId])` (et `@@unique([electionId, memberId])`), et transformer le P2002 en 409.

#### C3 — Aucun contrôle de rôle sur les finances et les scrutins
`src/app/api/expenses/[id]/route.ts:47-56`, `src/app/api/finance/fiscal-years/[id]/route.ts`, `src/app/api/cash/movements/route.ts`, `src/app/api/votes/[id]/route.ts`
> `const userId = await getCurrentUserId()` … aucune vérification de rôle sur les routes de validation

**Bug avéré.** Seuls `users/*` et `audit/*` sont gardés par `requireAdmin("ADMIN_IT")` (`src/lib/sgiau/api.ts:21-26`). Tout utilisateur authentifié peut : valider une dépense (`expenses/[id]` → mouvement de caisse OUT + écritures comptables), clôturer un exercice, écrire des mouvements/transferts de caisse, manipuler les scrutins.

**Correctif :** helper `requireRole("TRESORIER"|"PRESIDENT")` appliqué à toutes les routes d'écriture/validation financières et électorales.

#### C4 — IDOR sur l'espace membre
`src/app/api/member-space/receipts/route.ts:9-10`, `src/app/api/member-space/route.ts`, `src/app/api/member-space/requests/route.ts:9-10`
> `const { memberId } = await req.json()` / `req.nextUrl.searchParams.get("memberId")`

**Bug avéré.** Le `memberId` provient de la requête de l'appelant, sans rattachement à la session. N'importe quel utilisateur peut lire les reçus, statistiques de cotisation et demandes de n'importe quel membre en changeant l'ID.

**Correctif :** dériver `memberId` de `getSessionUser().memberId` (lien session↔membre) et ne l'accepter en paramètre que pour un rôle admin.

#### C5 — Vote de substitution : `memberId` fourni par l'appelant
`src/app/api/votes/[id]/ballots/route.ts:10-12`
> `const { memberId, optionId } = await req.json()` … aucune vérification que l'appelant est ce membre

**Bug avéré.** Un utilisateur peut voter au nom de n'importe quel `memberId` (et, combiné à C1, créer des comptes en masse). Même faiblesse pour les présences (`presences/route.ts:31`), inscriptions activités/réunions, emprunts (`library/[id]/borrows/route.ts:24`) et demandes de l'espace membre.

**Correctif :** lier le vote (et les inscriptions) à `getSessionUser().memberId` et vérifier la correspondance côté serveur.

---

### ÉLEVÉE

#### E1 — Notifications : aucun cloisonnement, envoi ouvert
`src/app/api/notifications/route.ts:10-27` et `src/app/api/notifications/send/route.ts:7-25`
> `findMany({ where: { unread } })` … POST sans `requireAdmin` vers n'importe quel `userId`/`memberId`

**Bug avéré.** Lecture de toutes les notifications sans filtre utilisateur ; marquage « lu » de bulletins appartenant à autrui (`PATCH {id}`) ou de tous (`PATCH {all:true}`) ; envoi de notifications à qui on veut.

**Correctif :** filtrer par session, vérifier la propriété avant `update`, garder l'envoi par un rôle.

#### E2 — Anonymat du vote et décompte avant clôture exposés
`src/app/api/elections/[id]/route.ts:16-21` et `src/app/api/votes/[id]/route.ts:16-19`
> `include: { candidate: { include: { member } }, member }` … compteurs exposés pendant le scrutin

**Bug avéré.** Les bulletins d'élection sont retournés avec `member` **et** `candidateId` : on voit qui a voté pour qui. Les compteurs par option/candidat sont visibles tant que le scrutin est ouvert. Si `anonymous` est modifié après coup (`votes/[id]` PUT), les `memberId` déjà stockés ne sont plus masqués.

**Correctif :** ne jamais sérialiser les bulletins (agrégats uniquement), figer `anonymous` à la création, masquer les décomptes tant que `OPEN`.

#### E3 — Manipulation du statut des scrutins
`src/app/api/votes/[id]/route.ts:41,49` et `src/app/api/elections/[id]/route.ts:43,53`
> `allowed` inclut `status` … `data: { status }`

**Bug avéré.** Tout utilisateur peut ouvrir/clôturer un vote ou une élection, réouvrir un scrutin, changer le QR. Le dépôt de bulletin (`ballots/route.ts:17`) n'interdit pas le vote après clôture de façon fiable.

**Correctif :** transitions de statut en actions dédiées réservées à un rôle ; vérifier `status === "OPEN"` au dépôt.

#### E4 — Intégrité financière non transactionnelle
`src/app/api/cotisations/payments/route.ts:80-137`, `src/app/api/expenses/[id]/route.ts:61-95`, `src/app/api/receipts/route.ts:48-64`
> écritures successives paiement → reçu → mouvement caisse → écritures comptables, sans `$transaction`

**Bug avéré.** Une erreur à mi-parcours laisse un paiement `PAID` sans reçu ni écritures. `receipts` crée en plus un paiement inline forcé `PAID` sans mouvement de caisse ni écritures, incohérent avec le chemin « cotisation ». Bon contre-exemple : `library/[id]/borrows/route.ts:34` (`$transaction`).

**Correctif :** englober toute la chaîne dans `db.$transaction` ; retirer la création de paiement inline de `receipts`.

#### E5 — Fuite des erreurs Prisma et 500 génériques
`src/app/api/adhesion/route.ts:61`, `src/app/api/cards/[id]/route.ts:32`, `src/app/api/receipts/route.ts:74`, `src/app/api/import-export/import/route.ts:47,73,96`
> `(e as Error).message` exposé ; P2002/P2025 non gérés sur la plupart des routes

**Bug avéré.** Les erreurs Prisma brutes (identifiants internes, contraintes, requêtes) remontent dans la réponse HTTP. Bon contre-exemple : `users/[id]/route.ts:44-48` (P2002 → 409) et `members/[id]/route.ts:85-89`.

**Correctif :** gestionnaire d'erreur centralisé qui mappe les codes Prisma en réponses neutres, logs côté serveur uniquement.

#### E6 — Génération de références non atomique (course)
`src/app/api/adhesion/route.ts:57-59`, `src/app/api/cards/route.ts:43`, `src/app/api/cotisations/payments/route.ts:99-100`, `src/app/api/receipts/route.ts:71-72`, `src/app/api/expenses/route.ts:56`
> `String(count + 1).padStart(4, "0")` fondé sur `count()` + 1

**Bug avéré.** Deux requêtes concurrentes produisent la même référence → collision sur index unique → P2002 (500) ou numéros doublés.

**Correctif :** séquences dédiées en base, ou référence basée sur le temps avec `retry` (principe de `genReference`).

#### E7 — Remplacement de carte inapplicable (contrainte unique)
`prisma/schema.prisma:489` (`MemberCard.memberId @unique`) et `src/app/api/cards/[id]/route.ts:25-42`
> création d'une **nouvelle** carte avec le même `memberId` lors du remplacement

**Bug avéré.** La nouvelle carte viole `@unique([memberId])` → P2002 → 500 systématique ; le remplacement de carte ne fonctionne jamais.

**Correctif :** dans une transaction, marquer l'ancienne `REPLACED` et libérer le `memberId` avant la création de la nouvelle.

#### E8 — Import de masse sans garde ni workflow
`src/app/api/import-export/import/route.ts:50-98`
> `type=payments` / `type=expenses` crée des paiements `PAID` et dépenses arbitraires

**Bug avéré.** Un utilisateur ordinaire peut « encaisser » des montants arbitraires (paiements forcés `PAID`) et créer des dépenses de n'importe quel statut, sans validation ni écritures associées.

**Correctif :** garde de rôle, import au statut `PENDING` (validation requise), interdiction d'importer `PAID` sans justificatif.

#### E9 — Exposition de données financières et personnelles
`src/app/api/dashboard/route.ts:40-47,74-84`, `src/app/api/statistics/route.ts:42-53`, `src/app/api/search/route.ts:40`
> revenus, dépenses, solde caisse, `recentPayments` (montants + noms + matricules), `recentMembers` (email, téléphone), « top cotisants »

**Bug avéré.** Toute la donnée financière et personnelle est servie à n'importe quel utilisateur authentifié, sans filtre de rôle.

**Correctif :** routes de pilotage réservées aux rôles de direction ; projection stricte des champs.

#### E10 — Pas de rate-limiting sur le login + énumération de comptes
`src/app/api/auth/login/route.ts:21-63`
> verrouillage par compte (5 essais/15 min) uniquement ; réponses 401/403/423 distinctes

**Bug avéré.** Sans limitation par IP, la force brute se répartit sur plusieurs comptes. Les codes/réponses distincts permettent d'énumérer les comptes existants.

**Correctif :** rate-limiting par IP/UA (ex. `@upstash/ratelimit`), réponse d'échec générique, journalisation du verrouillage.

---

### MOYENNE

#### M1 — Mass-assignment sur les utilisateurs
`src/app/api/users/[id]/route.ts:30-39` et `src/app/api/users/route.ts:61`
> PUT/POST acceptent `role`, `isActive`, `password`, `username`, `email`

**Bug avéré.** Bien que gated `ADMIN_IT`, tout admin peut créer un autre `ADMIN_IT`, ou modifier son propre rôle/mot de passe ; aucune protection « dernier admin ».

**Correctif :** séparer profil (nom, email) et sécurité (rôle, actif, déverrouillage) ; interdire de se dégrader ou d'éditer le dernier `ADMIN_IT`.

#### M2 — Changement de statut membre par n'importe qui
`src/app/api/members/[id]/route.ts:31`
> `allowed` inclut `"status"` ; l'audit de la route est écrit sans `userId` (ligne 42)

**Bug avéré.** Un membre ordinaire peut passer n'importe quel membre (ou lui-même) en `ACTIVE`/`SUSPENDED`, et la trace d'audit ne permet pas d'identifier l'auteur.

**Correctif :** retirer `status` de `allowed` (action dédiée gardée par rôle) et renseigner `userId` dans l'audit.

#### M3 — Signature électronique non cryptographique
`src/app/api/documents/[id]/route.ts:26,64-71`
> `simpleHash` FNV-1a (8 caractères hexadécimaux), déterministe et forgeable

**Amélioration.** Le hash n'apporte ni preuve d'identité ni preuve d'intégrité exploitable.

**Correctif :** HMAC-SHA256 avec clé serveur + horodatage, ou intégration d'un service de signature conforme.

#### M4 — Intégrité caisse et stock manipulable
`src/app/api/cash/movements/route.ts` et `src/app/api/library/[id]/route.ts:20-27`
> `type`/`validated` libres ; `available`/`totalCopies` écrits directement par le client

**Amélioration.** Les valeurs dérivées (solde, disponibilité) peuvent devenir incohérentes (stock négatif, disponible > total).

**Correctif :** invariants recalculés côté serveur, validation stricte des champs d'état.

#### M5 — `sync/run` modifie les données sans rôle
`src/app/api/sync/run/route.ts:7-65`
> POST ouvert : marque des entrées `CONFLICT` (`simulate=true`) et écrit des `SyncLog`

**Amélioration.** Une opération de synchronisation qui altère la production ne devrait pas être accessible à tout utilisateur.

**Correctif :** garde `ADMIN_IT`.

#### M6 — Notifications sans canal réel + audience libre
`src/app/api/notifications/send/route.ts:17-18`
> `channel` (WHATSAPP/EMAIL) et `type` libres, aucune logique d'envoi

**Amélioration.** Les canaux déclarés ne correspondent à aucun mécanisme d'envoi ; l'audience est totalement libre.

**Correctif :** liste blanche des canaux effectifs et contrôle de l'audience.

---

### BASSE

#### B1 — Cookies et sessions
`src/lib/sgiau/auth.ts:45-52` — httpOnly, `sameSite=lax`, `secure` en prod (corrects). Pas de préfixe `__Host-`, pas de rotation du secret, pas d'invalidation serveur des sessions (logout = simple fermeture de `SessionLog`).
→ *Amélioration.*

#### B2 — Headers de sécurité / CSP absents
`next.config.ts` (aucune entrée `headers()`) et `src/middleware.ts` — aucune CSP, HSTS, `X-Frame-Options`, `Referrer-Policy`.
→ *Amélioration.*

#### B3 — Build affaibli
`next.config.ts:9-12` — `typescript.ignoreBuildErrors: true`, `reactStrictMode: false` : les erreurs de typage passent en production.
→ *Amélioration.*

#### B4 — IP client trustée
`src/app/api/auth/login/route.ts:30` — `x-forwarded-for` pris tel quel (spoofable).
→ *Amélioration.*

#### B5 — Requête non bornée
`src/app/api/library/borrows/route.ts:24-31` — GET filtré sans `take` (les autres listes sont bornées à 500).
→ *Amélioration.*

#### B6 — Anonymat partiel au moment de l'audit
`src/app/api/votes/[id]/ballots/route.ts:46` — l'objet sérialisé peut désanonymiser le bulletin si une valeur `memberId` est présente.
→ *Amélioration.*

#### B7 — Bonne pratique isolée
`src/app/api/seed/route.ts` — le seed est correctement bloqué en production.
→ *Amélioration (à généraliser).*

---

## Points positifs

- **Token robuste** : HMAC-SHA256, `exp` vérifié, comparaison en temps constant (`token.ts`).
- **Verrouillage de compte** : seuil d'essais, fenêtre 15 min ; compte désactivé/verrouillé perd immédiatement sa session (`auth.ts:36-43`).
- **Contrôles d'accès stricts bien définis** : `requireAdmin("ADMIN_IT")` centralisé dans `api.ts:21-26` — facile à étendre.
- **`members/[id]` DELETE** liste les bloqueurs relationnels au lieu d'un 500 Prisma (`members/[id]/route.ts:68-89`) — bon modèle.
- **Transactions** : emprunt/retour bibliothèque en `$transaction` (`library/[id]/borrows/route.ts:34`).
- **`/health`** public minimal, sans volume de données.
- **Anti-doublons DB** présents sur participants (activités, réunions, formations) et candidats — à étendre au vote.
- **`passwordHash` masqué** dans les réponses utilisateurs (`users/route.ts`).

---

## Top 10 des correctifs (par ordre d'impact)

1. **Supprimer `DEFAULT_INITIAL_PASSWORD`** : mot de passe aléatoire + changement forcé à la première connexion (**C1**).
2. **Contraintes `@@unique` sur `VoteBallot`** + rattacher le `memberId` du vote à la session (**C2, C5**).
3. **Helper `requireRole(...)`** sur finances, scrutins, adhésions, sync, send, import (**C3, E8, M5**).
4. **Cloisonner les notifications** par propriétaire de session et garder l'envoi (**E1**).
5. **Ne plus sérialiser les bulletins** ; transitions de statut de scrutin en actions dédiées (**E2, E3**).
6. **`$transaction`** sur paiement→reçu→caisse→écritures et validation de dépense (**E4**).
7. **Gestionnaire d'erreur Prisma centralisé** (masquer les détails internes) (**E5**).
8. **Sécuriser l'espace membre** via `session.memberId` ; retirer `status` du PUT membre (**C4, M2**).
9. **Remplacement de carte transactionnel** et références numérotées atomiques (**E7, E6**).
10. **Rate-limiting IP du login** + réponse uniforme, puis headers CSP/HSTS (**E10, B2**).
