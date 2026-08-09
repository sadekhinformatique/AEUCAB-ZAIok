# Analyse du projet existant — AEUCAB-ZAI (SGIAU)

Date : 09/08/2026 · Périmètre : code source complet (`src/`), schéma Prisma, scripts, config, comportement runtime.

## 1. Contexte et stack

Application de gestion d'une amicale universitaire (SGIAU) : membres, cotisations, trésorerie, dépenses, activités, élections, documents, espace membre, formations, inventaire, bibliothèque, notifications.

- **Frontend** : Next.js 16 (App Router), React 19, Tailwind CSS 4, shadcn/ui, Zustand (store `useSgiau`).
- **Backend** : Routes API App Router ; session HMAC-SHA256 (cookie `sgiau_session`), bcrypt (coût 12), verrouillage de compte.
- **BDD** : PostgreSQL via **Neon** (chaîne de connexion réelle dans `.env`), Prisma 6.
- **Scripts** : `dev`, `start`, `auth:init`, `db:migrate-academic` basés sur `bun` et syntaxe POSIX.

## 2. Méthodologie

- Lecture systématique : composants (`src/components/sgiau/modules/*`), toutes les routes API (`src/app/api/**`), `prisma/schema.prisma` (747 lignes), `src/lib/sgiau/*`.
- Vérifications runtime : serveur `next dev` lancé, requêtes `curl` (auth, erreurs, rafraîchissement des dashboards après POST).
- Vérification des hypothèses de sécurité (contrôle d'accès, XSS, secrets, scripts, git).

## 3. Résumé exécutif

| ID | Gravité | Constat |
|----|---------|---------|
| F01 | Critique | Mot de passe par défaut **connu et partagé** pour tous les comptes créés (seed + adhésions) |
| F02 | Critique | **IDOR** : l'espace membre expose les données de n'importe quel membre (`memberId` non contrôlé) |
| F03 | Élevé | Dev branché sur la **BDD Neon de production** ; commande `db:reset` destructive |
| F04 | Élevé | Scripts npm **non portables** : `npm run dev`/`start` échouent sur Windows (vérifié) |
| F05 | Élevé | Dépôt git initialisé à la **racine `C:\`** → contrôle de version inutilisable |
| F06 | Élevé | Listes plafonnées à 500 enregistrements sans pagination ; cumuls sur données tronquées (cash 300) |
| F07 | Élevé | Rendu HTML brut (`dangerouslySetInnerHTML`) → risque XSS stocké |
| F08 | Élevé | Tableaux de bord jamais rafraîchis après écriture (anti-pattern PRG) |
| F09 | Moyen | Aucune protection CSRF explicite (atténuée par SameSite=Lax + JSON) |
| F10 | Moyen | Statistiques de recouvrement biaisées (total dû surévalué en paiements partiels multiples) |
| F11 | Moyen | Recherche : wildcards LIKE `%`/`_` non échappés ; route protégée mais aucune pagination |
| F12 | Moyen | Aucun test automatisé configuré ; gestion d'erreurs inégale |
| F13 | Moyen | Dépendances probablement inutilisées (`next-auth`, `next-intl`, `react-query`, `recharts`, `@mdxeditor/editor`, `z-ai-web-dev-sdk`, …) |
| F14 | Faible | Incohérences UX : libellé « Filière » dupliqué, retours/états incomplets |

## 4. Constats détaillés

### F01 — CRITIQUE : Mot de passe par défaut connu pour tous les comptes

`DEFAULT_INITIAL_PASSWORD = "Sgiau@2026!"` est une constante publique du code (`src/lib/sgiau/auth.ts:16`), utilisée :
- au seed (`src/lib/sgiau/seed.ts:40` → tous les comptes seed partagent ce mot de passe) ;
- à la **création de compte de chaque membre** lors de l'approbation d'une adhésion (`src/app/api/adhesion/[id]/route.ts:69`), avec `role: "MEMBER"` et `isActive: true`.

Aucun mécanisme de changement de mot de passe forcé à la première connexion. Tout attaquant connaissant le code peut se connecter sur **tout compte créé par seed ou adhésion** (username = matricule). Le verrouillage (5 échecs → 15 min) limite la force brute en ligne mais ne protège pas contre un mot de passe connu.

**Recommandation** : générer un mot de passe aléatoire par compte (modèle de `scripts/auth-init.ts`), imposer un changement au premier login, ou activer une invite d'email. Révoquer le mot de passe par défaut existant (lancer `bun run auth:init`).

### F02 — CRITIQUE : Espace membre — accès croisé entre membres (IDOR)

Les routes `/api/member-space`, `/api/member-space/requests` et `/api/member-space/receipts` prennent `memberId` **directement en query/body** et le passent tel quel à Prisma, sans vérifier que la session appartient à ce membre :
- `src/app/api/member-space/route.ts:9-29` → retourne paiements, reçus, demandes, documents du membre ciblé ;
- `src/app/api/member-space/requests/route.ts:9-27` → lecture **et création** de demandes au nom du membre ciblé ;
- `src/app/api/member-space/receipts/route.ts:9-16`.

Le composant `member-space.tsx` ajoute une « connexion » par simple sélection d'un membre dans une liste (`/api/members?limit=500`), sans vérification d'identité. **Tout utilisateur authentifié peut donc consulter et agir au nom de n'importe quel membre** (données personnelles, paiements, reçus, demandes).

**Recommandation** : dériver `memberId` de la session (`getSessionUser()` + `user.memberId`) et refuser toute valeur fournie par le client ; appliquer un contrôle de propriété sur chaque ressource.

### F03 — ÉLEVÉ : Développement sur la base distante + commandes destructives

- `.env` contient une chaîne de connexion **Neon réelle** (`postgresql://neondb_owner:...@ep-raspy-forest-...neon.tech/neondb`) ; le fichier est bien dans `.gitignore` (non commité), mais toutes les commandes de dev/seed frappent la base distante.
- `db:reset` = `prisma migrate reset` : exécuté en dev, il **supprime/recrée la base de production** (perte de données massive).
- `db:push` utilise `--accept-data-loss`.
- Le serveur dev tourne contre ces données réelles ; les tests `curl` effectués pendant cet audit ont atteint la base distante.

**Recommandation** : base locale dédiée au dev (Postgres/Docker ou SQLite), rôles/mots de passe séparés par environnement, retirer `db:reset` des environnements connectés à la prod.

### F04 — ÉLEVÉ : Scripts non portables (vérifié sur Windows)

`package.json` :
- `dev`: `next dev -p 3000 2>&1 | tee dev.log` → **`tee` n'existe pas sous Windows** ; `npm run dev` échoue (vérifié : « 'tee' n'est pas reconnu »).
- `start`: `NODE_ENV=production PORT=${PORT:-3000} bun .next/standalone/server.js ...` → syntaxe sh et variable `${PORT:-3000}` invalides sur Windows ; nécessite en plus `bun`.
- `auth:init`, `db:migrate-academic` : `bun scripts/...` (dépendent de bun).

**Recommandation** : scripts sans `tee` (redirection simple), `cross-env` pour les variables d'environnement, exécution `node` (le projet est Node) ou documenter bun comme prérequis.

### F05 — ÉLEVÉ : Dépôt git initialisé à la racine `C:\`

`git rev-parse --show-toplevel` → `C:/`. `git status` depuis le projet liste l'ensemble du disque (Desktop, Downloads, Windows…), aucun historique propre au projet, risque de commiter des fichiers système, pas de branches/workflow utilisables.

**Recommandation** : `git init` dédié dans `AEUCAB-ZAI-main` (avec `.gitignore` existant), dépôt distant dédié.

### F06 — ÉLEVÉ : Pagination absente, données tronquées, cumuls faux

- La majorité des listes sont plafonnées côté serveur à `take: 500` **sans pagination** (members, expenses, receipts, documents, formations, inventory, partners, presences, library, borrows, archives — cf. `src/app/api/**/route.ts`). Au-delà de 500 enregistrements, le reste est invisible.
- Le module trésorerie charge `/api/cash?limit=300` (`cash.tsx:54`) et calcule les cumuls « Entrées/Sorties » sur ces seuls 300 mouvements → **totaux tronqués**.
- Recherche limitée à 5 résultats par entité, sans pagination.
- `statistics/route.ts` balaye toute la table à chaque appel (chargement complet en mémoire) — se dégrade avec le volume.

**Recommandation** : pagination serveur (cursor/offset) sur toutes les listes, calcul des cumuls côté serveur sur l'intégralité des données, agrégations SQL plutôt que chargement complet.

### F07 — ÉLEVÉ : Rendu HTML brut (risque XSS stocké)

Plusieurs composants injectent du contenu arbitraire via `dangerouslySetInnerHTML` : descriptions de documents, contenu de l'espace membre, vues de contacts. En l'absence d'échappement/sanitisation des contenus saisis par les utilisateurs, un contenu malveillant (script, `<iframe>`, faux lien) serait exécuté dans le navigateur de tout admin consultant le document/le profil.

**Recommandation** : supprimer `dangerouslySetInnerHTML`, ou assainir avec `dompurify` avant rendu ; ne jamais rendre de HTML issu de saisie libre sans sanitisation.

### F08 — ÉLEVÉ : Tableaux de bord jamais actualisés après écriture (anti-pattern PRG)

Le dashboard (`api/dashboard`) et les statistiques ne sont chargés qu'au montage. Aucun POST des autres modules ne déclenche `router.refresh()` ni rechargement : après un enregistrement (paiement, dépense), les chiffres restent figés jusqu'au rechargement manuel de la page (vérifié par requêtes `curl`). Risque de décisions basées sur des données périmées.

**Recommandation** : après mutation → revalidation (Next `router.refresh()` / `revalidatePath`) ou refetch du dashboard.

### F09 — MOYEN : Absence de protection CSRF explicite

Les routes qui changent l'état acceptent les POST sans jeton CSRF. Atténué par `SameSite=Lax` (cookie session) et le `Content-Type: application/json` requis, mais la protection repose sur le navigateur, pas sur l'application.

**Recommandation** : jeton CSRF par session pour les mutations, ou vérification d'en-tête `Origin`.

### F10 — MOYEN : Statistiques de recouvrement biaisées

`statistics/route.ts:56-63` calcule `totalDue = Σ amount` et `totalPaid = Σ amountPaid` sur **toutes les lignes de paiement**. Avec plusieurs paiements partiels pour une même cotisation, le « total dû » est compté plusieurs fois → taux de recouvrement faussé.

**Recommandation** : sommer `amount` distinct par cotisation (règlement groupé par cotisationId).

### F11 — MOYEN : Recherche — wildcards LIKE non échappés

`/api/search` est protégé par session (401 sans cookie), paginé à 5/entité, sans erreur 500 reproduite sur la revue de code. En revanche, les termes `%` ou `_` servent de wildcards LIKE (Prisma ne les échappe pas) → résultats surprenants (« % » = tout). `tags` étant `String?`, aucun crash JSON.

**Recommandation** : échapper `%`/`_` dans la requête, paginer, limiter les entités par défaut.

### F12 — MOYEN : Aucun test, gestion d'erreurs inégale

- Pas de script `test` dans `package.json` ; aucun test unitaire/intégration/API.
- Les routes gèrent les erreurs de façon hétérogène (certaines renvoient un message français via `err()`, d'autres laissent Prisma remonter en 500 brut).

**Recommandation** : framework de test (Vitest) + tests API ; middleware/helper d'erreur centralisé (`try/catch` → réponse JSON normalisée).

### F13 — MOYEN : Dépendances probablement inutilisées

`package.json` référence `next-auth`, `next-intl`, `@tanstack/react-query`, `recharts`, `react-hook-form`, `@mdxeditor/editor`, `z-ai-web-dev-sdk`, `framer-motion`, `next-themes`, `qrcode`, `uuid`… L'application utilise en pratique Zustand, fetch, composants maison et quelques libs (date-fns, sonner, lucide, cmdk). Le bundle s'en trouve alourdi inutilement.

**Recommandation** : `depcheck`/`knip` puis suppression des dépendances non référencées.

### F14 — FAIBLE : Incohérences UX

- Libellé « Filière » dupliqué pour le champ département de l'espace membre (`member-space.tsx:574`).
- Mélanges FR/EN dans les libellés et statuts (ex. statuts anglais affichés tels quels dans la recherche, badges).
- Absence de boutons « retour », de filtres avancés, de confirmation sur certaines actions destructives.
- Aucune vérification d'accessibilité (contrastes, navigation clavier) ni mode sombre.

## 5. Points positifs

- **Auth correctement bâtie** : bcrypt coût 12, verrouillage 5 échecs/15 min, cookie `httpOnly` + `SameSite=Lax` (+ `Secure` en prod), token HMAC-SHA256 avec expiration 12 h, `AUTH_SECRET` ≥ 32 caractères requis, refus des tokens sans `exp`.
- **Journalisation** : `audit` + `sessionLog` sur connexions réussies/échouées, validations, imports.
- **Schéma complet et relationnel** : 20 modules, index sur les clés d'usage, `@@unique` sur matricule/qrCode.
- **`auth:init`** : régénère des mots de passe forts aléatoires (affichés une seule fois) — bonne pratique pour la reprise des comptes.
- **`dynamic = "force-dynamic"`** sur les routes, `catch(() => ({}))` pour parser le JSON des requêtes.
- **Codes d'erreur HTTP adaptés** (401/422/423) et messages utilisateur en français.

## 6. Recommandations priorisées

1. **Sécurité (immédiat)** : F01 révoquer le mot de passe par défaut + génération aléatoire ; F02 verrouiller `memberId` sur la session (contrôle de propriété) ; F07 supprimer/sanitiser le HTML brut ; F09 jeton CSRF.
2. **Données/ops (immédiat)** : F03 base de dev locale, retirer `db:reset` du flux dev ; F05 repo git dédié ; F04 scripts portables (sans `tee`, `cross-env`).
3. **Fiabilité (court terme)** : F06 pagination + cumuls serveur ; F08 revalidation des dashboards ; F10 correction du recouvrement.
4. **Qualité (moyen terme)** : F12 tests (au minimum API + parcours critique) ; F13 nettoyage des dépendances ; F14 corrections UX.

## 7. Annexe — fichiers inspectés (principaux)

- `src/lib/sgiau/auth.ts`, `token.ts`, `seed.ts`, `api.ts`, `store.ts`, `format.ts`, `constants.ts`, `db.ts`
- `src/app/api/auth/login|logout/route.ts`, `adhesion/[id]/route.ts`, `member-space/*`, `statistics/route.ts`, `search/route.ts`, `dashboard/route.ts`, `cash/route.ts`, et toutes les routes `api/**`
- `src/components/sgiau/modules/*` (member-space, cash, documents, contacts, dashboard, statistics, presences, cotisations, elections, import-export, …)
- `prisma/schema.prisma`, `package.json`, `.env`, `README.md`, `scripts/*`
