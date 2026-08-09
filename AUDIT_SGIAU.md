# Audit SGIAU — Rapport de révision

Projet : **AEUCAB-ZAI** — Application Next.js 16 + Prisma 6 + PostgreSQL (Neon), dashboard SGIAU pour amicales universitaires.
Périmètre de l'audit : dépendances, code mort, configuration, schéma Prisma/BDD, performance, endpoints statistics/dashboard. Aucune modification de fichier effectuée (lecture seule).

Légende : **[ÉLEVÉE]** / **[MOYENNE]** / **[BASSE]** — « bug avéré » = comportement incorrect observable, « amélioration » = axe d'optimisation.

---

## 1. Dépendances

### 1.1 Paquets déclarés mais jamais importés — [MOYENNE]
Vérification par grep sur `src/`, `scripts/`, `mini-services/`, `.zscripts/`, `tests/` (aucune occurrence) :

| Paquet | Ligne `package.json` |
|---|---|
| `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` | 18-20 |
| `@hookform/resolvers` | 21 |
| `@mdxeditor/editor` | 22 |
| `@reactuses/core` | 51 |
| `@tanstack/react-query`, `@tanstack/react-table` | 52-53 |
| `next-auth` | 64 — l'authentification est faite maison (HMAC + bcrypt) |
| `next-intl` | 65 |
| `react-markdown`, `react-syntax-highlighter` | 73, 75 |
| `uuid` | 81 |
| `z-ai-web-dev-sdk` | 83 |
| `zod` | 84 — aucune importation trouvée |
| `sharp` | 77 — aucune importation trouvée |
| `date-fns` | 58 — aucune importation trouvée |

Correctif : supprimer ou réintroduire réellement ces paquets. Aucun risque fonctionnel, mais ils alourdissent l'installation et le lockfile et faussent la lecture du projet.

### 1.2 Couche de composants sans usage — [MOYENNE]
`react-hook-form` (l.72) n'est importé que par `src/components/ui/form.tsx:14` ; le composant `Form` n'est importé nulle part. Même schéma pour : `input-otp` (l.61 → `ui/input-otp.tsx`), `cmdk` (l.57 → `ui/command.tsx`), `react-day-picker` (l.70 → `ui/calendar.tsx`), `embla-carousel-react` (l.59 → `ui/carousel.tsx`), `vaul` (l.82 → `ui/drawer.tsx`), `react-resizable-panels` (l.74 → `ui/resizable.tsx`). Ces dépendances ne servent qu'à compiler des composants UI eux-mêmes inutilisés (voir §2.1).

### 1.3 Dépendance manquante : `socket.io` — [MOYENNE]
`examples/websocket/server.ts:1` importe `socket.io` et `examples/websocket/frontend.tsx:1` importe `socket.io-client`, mais ni l'un ni l'autre n'est dans `package.json` (vérifié lignes 17-99). Le build ne passe que grâce à `typescript.ignoreBuildErrors: true` (`next.config.ts:10`).

### 1.4 `@radix-ui/*` — [BASSE / MOYENNE]
Une quinzaine de packages Radix (`react-accordion`, `react-alert-dialog`, `react-aspect-ratio`, `react-collapsible`, `react-context-menu`, `react-hover-card`, `react-menubar`, `react-navigation-menu`, `react-popover`, `react-radio-group`, `react-separator`, `react-slider`, `react-toggle`, `react-toggle-group`, `react-tooltip`) ne sont utilisés que par des composants UI orphelins. Sévérité liée à la résolution de §2.1.

---

## 2. Code mort

### 2.1 Composants UI orphelins — [MOYENNE]
Sur les 48 fichiers de `src/components/ui/`, aucun import n'existe pour : `accordion`, `alert`, `aspect-ratio`, `breadcrumb`, `calendar`, `carousel`, `chart`, `collapsible`, `command`, `context-menu`, `drawer`, `form`, `hover-card`, `input-otp`, `menubar`, `navigation-menu`, `pagination`, `popover`, `radio-group`, `resizable`, `separator`, `sidebar`, `slider`, `toggle`, `toggle-group`, `tooltip` (grep sur `src/`). Preuves de chaîne morte : `toggle-group.tsx:8` n'importe que `toggle` ; `sidebar.tsx:12,26` n'importe que `separator` et `tooltip` — et `ui/sidebar.tsx` lui-même est inutilisé (le shell utilise `src/components/sgiau/shell/sidebar.tsx`).

### 2.2 Hooks orphelins — [BASSE]
`src/hooks/use-mobile.ts` n'est importé que par `ui/sidebar.tsx:8` (mort, cf. §2.1). `src/hooks/use-toast.ts` + `ui/toast.tsx` + `ui/toaster.tsx` sont branchés dans `src/app/layout.tsx:4`, mais **tous les modules utilisent `sonner`** (doublon de système de notifications).

### 2.3 Dossiers/artefacts résiduels — [BASSE]
- `mini-services/` ne contient que `.gitkeep` (dossier vide).
- `tsconfig.tsbuildinfo` traîne à la racine (artefact généré, devrait être ignoré par git) ; dossier `download/` résiduel.

---

## 3. Configuration

### 3.1 `tsconfig.json` inclut les exemples et masque les erreurs — [ÉLEVÉE]
`include` couvre `**/*.ts` et `**/*.tsx` ; `exclude` ne contient que `node_modules`. Le TypeScript compile donc `examples/websocket/*` (imports `socket.io` absents, cf. §1.3) et `tests/`. Les erreurs sont neutralisées par `next.config.ts:10` (`typescript.ignoreBuildErrors: true`). **Bug avéré** : les erreurs de typage passent inaperçues et le pipeline `npm run build` ne les verra jamais.

### 3.2 Linting quasi désactivé — [MOYENNE]
`eslint.config.mjs` désactive `@typescript-eslint/no-explicit-any`, `no-unused-vars`, `react-hooks/exhaustive-deps`, `no-console`, `no-debugger`, et ignore `examples/**` et `skills`. Le lint ne détecte ni code mort ni erreurs.

### 3.3 `reactStrictMode: false` — [BASSE]
`next.config.ts:12` : masque les effets de bord (double rendu en dev) qui aideraient à débusquer les bugs de state management (store zustand).

### 3.4 Migration de schéma à risque — [MOYENNE]
`package.json:10` : `prisma db push --accept-data-loss` est le workflow standard et **il n'existe aucun dossier `prisma/migrations/`** (seul `schema.prisma`). `db:reset` (`package.json:15`) échouera sans historique de migrations, et `db push` peut détruire des données sur un schéma existant.

### 3.5 `.env.example` minimal — [BASSE]
Seuls `DATABASE_URL` et `AUTH_SECRET` sont documentés alors que `AUTH_SECRET` est exigé ≥ 32 caractères (`src/lib/sgiau/token.ts:14-24`).

---

## 4. Prisma / Base de données

### 4.1 Commentaire obsolète — [BASSE]
`prisma/schema.prisma:2` : « Prisma schema (SQLite) » alors que le provider est `"postgresql"` (l.9). Le commentaire d'en-tête est trompeur.

### 4.2 Double vote possible (pas d'unicité) — [ÉLEVÉE]
`prisma/schema.prisma:478-479` : `@@index([voteId, memberId])` et `@@index([electionId, memberId])` sur `VoteBallot` sont des **index simples, pas `@@unique`**. Rien n'empêche au niveau base qu'un membre vote deux fois au même scrutin. **Bug avéré** si la garde applicative est contournée ou exécutée en parallèle.

### 4.3 Doublons de présence — [ÉLEVÉE]
`Presence` (`schema.prisma:502-514`) n'a **aucune contrainte unique** sur `(memberId, scope, scopeId)` ; le contrôle anti-doublon est un `findFirst` (`presences/route.ts:46-49`). Deux POST simultanés passent tous les deux la vérification → doublons. **Bug avéré** (course).

### 4.4 Index manquants pour les agrégations — [MOYENNE]
`Payment` n'a que `@@index([memberId])` et `@@index([paymentDate])` (l.173-174) ; `Expense` n'a que `@@index([date])` (l.330). Les routes statistics/dashboard filtrent par `status` (`statistics/route.ts:10-11`, `dashboard/route.ts:40-43`) : un index composite `(status, paymentDate)` / `(status, date)` manque.

### 4.5 Index secondaires — [BASSE]
`SessionLog` n'a pas d'index sur `userId`/`loginAt` (table en croissance à chaque login/échec, cf. `login/route.ts:47,69`) ; `Receipt` n'a pas d'index sur `createdAt`. Amélioration pour les requêtes de tri et d'historique.

---

## 5. Performance

### 5.1 Statistics : agrégations en JavaScript sur tables entières — [ÉLEVÉE]
`src/app/api/statistics/route.ts:10-11` charge **toutes** les `payment` PAID/PARTIAL et **toutes** les `expense` VALIDATED à chaque appel (route `force-dynamic`, aucun filtre de période) puis regroupe par mois en JS, et enchaîne deux requêtes supplémentaires `member.findMany(id in …)` (l.49) et `expenseCategory.findMany(id in …)` (l.67). Coût linéaire en volume de données. Correctif : `groupBy` SQL (`by: ['paymentDate']` sur l'année), filtrage `paymentDate >= now-12mo`, ou revalidation/cache.

### 5.2 Dashboard : totaux calculés en JS — [ÉLEVÉE]
`src/app/api/dashboard/route.ts:40-43` rapatrie **toutes** les lignes `payment`/`expense` (select réduit mais lignes complètes) pour sommer en JS. Correctif : `db.payment.aggregate({ _sum: { amountPaid }, where: { status: 'PAID' } })` et `db.expense.aggregate(...)` — une requête par total, indépendante du volume. Les comptages `Promise.all` (l.36-41) et les `recentPayments`/`recentMembers` (l.74-81) sont corrects.

### 5.3 Finance : grand livre rapatrié en mémoire — [MOYENNE]
`src/app/api/finance/route.ts:26` : `ledgerEntry.findMany` avec `take: 2000` sans `where`, puis soldes par compte calculés en JS (`balanceMap`). Correctif : `groupBy accountId` + `_sum`/`_sum credit` en SQL.

### 5.4 N+1 sur les votes — [MOYENNE]
`src/app/api/votes/route.ts:33-46` : après un `findMany` de votes, une requête `voteOption.findMany` est exécutée **par vote** (1 + N requêtes), alors que le `include` initial (`votes/route.ts:27-30`) contient déjà `options` et `_count`. Correctif : un seul `include: { options: { include: { _count: { select: { ballots: true } } } } }`.

### 5.5 Pagination incomplète — [MOYENNE]
- `members/route.ts:28` : `take` (défaut 200, max 500) **sans `offset`**, et `findMany` **sans `select`** (toutes les colonnes).
- `documents/route.ts:24` : `take: 500` sans offset ni select.
- `presences/route.ts:18-25` : `take: 500` sans offset.
- `notifications/route.ts:12` : `take: 50` sans offset.
Amélioration : pagination par curseur/offset + comptage, et `select` minimal.

### 5.6 Recherche : requêtes séquentielles — [MOYENNE]
`src/app/api/search/route.ts:24-137` : jusqu'à 6 requêtes `contains` **séquentielles** (pas de `Promise.all`) sur colonnes texte non indexées. `take: 5` limite l'impact, mais la latence cumulée est réelle. Amélioration : `Promise.all` + index trigram (pg_trgm) ou recherche dédiée.

### 5.7 Import CSV : N+1 — [MOYENNE]
`src/app/api/import-export/import/route.ts:28,54` : `member.findUnique({ where: { matricule } })` **par ligne** dans la boucle d'import, avec `.catch(() => null)` qui avale les erreurs. Amélioration : chargement par lots (`matricule in [...]`) et gestion d'erreurs explicite.

### 5.8 Latences constatées
Les ~1,4 s (`members`) et ~2,3 s (`finance`) remontées sont cohérentes avec les chargements complets décrits en §5.1-5.3.

---

## 6. Statistics / Dashboard (synthèse)

- `statistics/route.ts:10-11,49,67` : jusqu'à 5 requêtes, dont 2 sur tables entières → à remplacer par `groupBy`/`aggregate` SQL (cf. §5.1).
- `dashboard/route.ts:40-43` : 2 requêtes sur tables entières → `aggregate` (cf. §5.2).
- **Recommandation commune** : ajouter les index composites §4.4, borner les requêtes à l'exercice en cours, et exposer des agrégats SQL plutôt que des rangées.

---

## Sécurité (constats complémentaires)

### S1. Fuite de `passwordHash` — [ÉLEVÉE] (bug avéré)
`src/app/api/users/route.ts:25-32` : `db.user.findMany` **sans `select`** → la réponse `serialize(items)` (l.43) inclut `passwordHash` (hash bcrypt) pour chaque utilisateur. Le POST masque pourtant le champ (`users/route.ts:70` : `passwordHash: undefined`). Correctif : `select` explicite ou `items.map(u => ({ ...u, passwordHash: undefined }))`.

### S2. Absence de contrôle d'accès par rôle — [ÉLEVÉE]
Seules `audit/route.ts:8`, `audit/[id]/route.ts:8` et `users/route.ts:9` appellent `requireAdmin` (`api.ts:21-26`, role `ADMIN_IT`). **Toutes** les autres routes (members, finance, cash, expenses, votes, cotisations, seed…) ne reposent que sur le middleware (`src/middleware.ts:18-21`) qui vérifie une session valide, quel que soit le rôle. Un compte `MEMBER` peut lire et écrire sur l'ensemble du back-office. Amélioration : gates par rôle sur chaque route de gestion.

### S3. Endpoint seed sans garde de rôle — [MOYENNE]
`src/app/api/seed/route.ts:8-11` ne vérifie que `NODE_ENV !== "production"` ; en dev/staging, **tout utilisateur authentifié** peut déclencher `seedDatabase(true)` et réinitialiser la base. Correctif : exiger `requireAdmin`.

### S4. Points positifs
Login avec verrouillage de compte (5 essais → 15 min, `auth.ts:18-19`, `login/route.ts:24-62`), cookies `httpOnly`/`sameSite`/`secure` (`auth.ts:45-52`), token HMAC-SHA256 avec `timingSafeEqual` et expiration (`token.ts:43-48,71-93`), audit journalisé (`api.ts:36-62`), seed coupé en production.

---

## Top 12 des correctifs (par priorité)

1. **[Sécurité]** `users/route.ts:25-32` : exclure `passwordHash` de la réponse GET (bug avéré, §S1).
2. **[Sécurité]** Appliquer des gardes par rôle (`requireAdmin`/RBAC) sur toutes les routes de gestion (members, finance, cash, expenses, votes, seed…) — §S2.
3. **[Intégrité]** Ajouter `@@unique([voteId, memberId])` et `@@unique([electionId, memberId])` sur `VoteBallot` — §4.2.
4. **[Intégrité]** Contrainte unique `(memberId, scope, scopeId)` sur `Presence` + contrôle anti-doublon atomique — §4.3.
5. **[Perf]** Remplacer les chargements complets de `statistics/route.ts` et `dashboard/route.ts` par `groupBy`/`aggregate` SQL + bornes temporelles — §5.1-5.2, §6.
6. **[Build]** Réactiver `reactStrictMode`, retirer `typescript.ignoreBuildErrors`, exclure `examples/` (ou supprimer `examples/websocket` + dépendance `socket.io`), resserrer le `include` du tsconfig — §3.1, §1.3.
7. **[Perf]** Corriger le N+1 `votes/route.ts:33-46` (un seul `include` imbriqué) — §5.4.
8. **[Perf]** Pagination complète (offset + total) et `select` minimal sur members, documents, presences, notifications — §5.5.
9. **[Maintenance]** Supprimer les ~26 composants UI orphelins (§2.1) et leurs dépendances dédiées (react-hook-form, cmdk, input-otp, react-day-picker, embla-carousel-react, vaul, react-resizable-panels, radix inutilisés) — §1.2, §1.4.
10. **[Bundle]** Retirer les paquets jamais importés : `@dnd-kit/*`, `@mdxeditor/editor`, `@reactuses/core`, `@tanstack/*`, `next-auth`, `next-intl`, `react-markdown`, `react-syntax-highlighter`, `uuid`, `z-ai-web-dev-sdk`, `zod`, `sharp`, `date-fns` — §1.1.
11. **[BDD]** Créer `prisma/migrations/` (abandonner `db push --accept-data-loss`), corriger le commentaire « SQLite » (l.2), ajouter `Payment(status,paymentDate)`, `Expense(status,date)`, `SessionLog(userId)` — §4.1, §4.4, §4.5, §3.4.
12. **[Qualité]** Réactiver les règles eslint clés (`no-unused-vars`, `no-explicit-any`, `exhaustive-deps`), ne pas ignorer `src/**`, supprimer `mini-services/`, `tsconfig.tsbuildinfo`, `download/` et compléter `.gitignore`/`.env.example` — §2.3, §3.2, §3.5.

---

*Audit en lecture seule — aucune modification de code effectuée.*
