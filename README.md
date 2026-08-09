# AEUCAB-ZAI — SGIAU

**Système de Gestion Intégrée de l'Amicale Universitaire (SGIAU)**

Application complète de gestion d'une amicale universitaire : membres, cotisations, comptabilité, activités, élections, documents, archives et toutes les opérations administratives.

## 🎯 Modules (28)

### Pilotage
- **Tableau de bord** — vue d'ensemble en temps réel (stats, graphiques, alertes)
- **Statistiques** — analyses croisées (membres, finances, activités)
- **Recherche globale** — multicritère sur toutes les entités

### Membres
- **Membres** — annuaire, fiches, statuts, QR codes, import/export
- **Adhésions** — workflow de validation (secrétaire → président)
- **Cartes membres** — génération, impression, QR code de vérification
- **Espace membre** — application mobile web (annonces, cotisations, reçus, demandes)

### Finances
- **Cotisations** — types, paiements, suivi
- **Reçus** — génération PDF, impression, QR de vérification, annulation
- **Comptabilité** — journal, plan comptable, balance, exercices, clôture
- **Caisse** — multi-comptes, transferts, mouvements
- **Dépenses** — création, validation, écritures comptables

### Vie associative
- **Activités** — événements, budget, participants, présences
- **Réunions** — ordre du jour, PV, décisions, présences
- **Présences** — manuel et QR code, statistiques
- **Élections** — candidats, vote électronique, résultats
- **Votes internes** — anonymes, QR code, un vote par membre

### Ressources
- **Documents** — classement, signature électronique, visibilité
- **Inventaire** — biens, état, localisation, maintenance
- **Formations** — formateur, participants, attestations, QR présence
- **Bibliothèque** — ressources, emprunts, retours
- **Partenaires** — contacts, contrats, contributions
- **Archives** — historique, classement annuel, protection

### Système
- **Notifications** — internes et membres (APP, WhatsApp, Email)
- **Import / Export** — CSV (membres, paiements, dépenses) + JSON complet
- **Utilisateurs & sécurité** — rôles, permissions, verrouillage, sessions
- **Journal d'audit** — before/after JSON, filtres, pagination
- **Synchronisation** — mode hors-ligne, sync log, gestion conflits

## 🛠 Stack technique

| Couche | Technologie |
|--------|-------------|
| Framework | Next.js 16 (App Router) |
| Langage | TypeScript 5 |
| UI | Tailwind CSS 4 + shadcn/ui + Lucide icons |
| Charts | Recharts |
| ORM | Prisma 6 |
| Base de données | **Neon PostgreSQL** |
| State | Zustand + TanStack Query |

## 🚀 Démarrage

```bash
# 1. Installer les dépendances
bun install

# 2. Configurer la base de données
cp .env.example .env
#   → éditer .env avec votre DATABASE_URL Neon PostgreSQL
#   → générer puis renseigner AUTH_SECRET (openssl rand -hex 32)

# 3. Créer le schéma
bun run db:push

# 4. Initialiser les comptes (mots de passe aléatoires, affichés une seule fois)
bun run auth:init

# 5. Lancer le serveur dev
bun run dev
```

L'application est disponible sur `http://localhost:3000` — connectez-vous avec un compte créé par `auth:init` (ex. `admin`).

### Mode production (auto-hébergement)

```bash
bun run build     # build standalone
bun run start     # serveur de production (port 3000, PORT configurable)
```

### Déploiement sur Vercel

Le fichier [`vercel.json`](./vercel.json) fige la configuration du build :

- **`installCommand`** : `bun install` (versions identiques au `bun.lock` local — pas de dérive de version)
- **`buildCommand`** : `bun run build` (le mode `standalone` est automatiquement désactivé sur Vercel via `VERCEL=1`)
- **`regions`** : `iad1` (Washington D.C. — la plus proche de la base Neon `us-east-2`)
- En-têtes de sécurité : `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`

#### Procédure complète

**1. Prérequis**

- Le code est poussé sur GitHub : `https://github.com/sadekhinformatique/AEUCAB-ZAI` (branche `main`)
- Un compte Vercel connecté à GitHub

**2. Importer le projet**

Vercel → **Add New → Project** → importer le dépôt `AEUCAB-ZAI`. Le framework
(Next.js) est détecté automatiquement et le `vercel.json` fige le reste — rien à
modifier dans les réglages de build.

**3. Définir les variables d'environnement** (Projet → Settings → Environment Variables → Add)

| Variable | Valeur |
|----------|--------|
| `DATABASE_URL` | votre URL Neon **pooled** (`...-pooler.REGION.aws.neon.tech/DB?sslmode=require`) — console Neon → *Connect* → pooled connection string |
| `AUTH_SECRET` | même valeur que le `.env` local, générée par `openssl rand -hex 32` |

> ⚠️ Sans `AUTH_SECRET`, l'application refuse **toutes** les requêtes (sécurité
> fail-closed) : les pages redirigent vers `/login` et les API répondent 500.
>
> Les secrets ne sont jamais commités dans `vercel.json` — uniquement dans le dashboard Vercel.

**4. Premier déploiement**

Vercel → **Deploy**. Le log doit montrer `bun install` puis `bun run build` et se
terminer par un déploiement *Ready*.

**5. Créer les comptes de connexion** (`auth:init`)

L'application n'a **aucun utilisateur par défaut**. Depuis la machine locale (qui
partage la même base Neon) :

```bash
bun run auth:init   # crée/hache les comptes et affiche les mots de passe (une seule fois)
```

Puis connectez-vous sur `https://<projet>.vercel.app` avec ces identifiants.

**6. Redéploiement**

- **Automatique** : chaque `git push` sur `main` déclenche un nouveau build (le dépôt
  est configuré avec un hook `post-commit` qui pousse automatiquement).
- **Manuel** : Vercel → **Deployments → ⋯ → Redeploy** (relance le dernier commit,
  utile après un échec de build).

#### Dépannage

| Symptôme | Cause / correctif |
|----------|-------------------|
| Erreur `ENOENT .next/next-server.js.nft.json` | Ancien build avec `output: standalone` — redéployez avec le dernier commit (standalone désactivé sur Vercel) |
| 500 sur toutes les routes après le deploy | `AUTH_SECRET` ou `DATABASE_URL` non définis dans les variables d'environnement |
| 401 sur les API / redirection vers `/login` | Pas de session — normal, connectez-vous |
| Compte verrouillé | 5 échecs de connexion → déverrouillage par un admin (module Utilisateurs) ou `bun run auth:init` |
| Version Next différente du local | Le `bun.lock` garantit des versions identiques (bun install) — ne pas utiliser npm pour le build Vercel |

### Données de démonstration (développement uniquement)

En développement uniquement, un seed peuplé la base (64 membres, cotisations, reçus…) :
```bash
curl -X POST http://localhost:3000/api/seed -H "Content-Type: application/json" -d '{"force":true}'
```
Le seed est **désactivé en production** (HTTP 403).

## 📊 Rôles & permissions

| Rôle | Permissions typiques |
|------|---------------------|
| Président | Tout : consulter, ajouter, modifier, supprimer, valider, exporter, imprimer |
| Secrétaire général | Membres, adhésions, réunions, documents |
| Trésorier | Finances, caisse, dépenses, reçus |
| Caissier | Cotisations, paiements, reçus |
| Commissaire aux comptes | Consultation, audit, rapports |
| Administrateur informatique | Utilisateurs, sécurité, système |
| Membre simple | Espace membre (consultation) |
| Rôle personnalisé | Configurable |

## 🔒 Sécurité

- Authentification réelle : mots de passe **bcrypt**, sessions signées HMAC (cookie `httpOnly`, `SameSite=Lax`)
- Page de connexion `/login`, middleware protégeant toutes les routes (401 API / redirection pages)
- Verrouillage du compte après 5 échecs (15 min), déverrouillage par un administrateur
- RBAC : gestion des utilisateurs et journal d'audit réservés au rôle `ADMIN_IT`
- `.env` gitigné (jamais committé) ; `AUTH_SECRET` obligatoire en production
- Journal d'audit complet (before/after JSON sur chaque mutation), historique des sessions
- Endpoints REST avec vérifications ; seed désactivé en production

## 📁 Structure

```
src/
├── app/
│   ├── api/           # 26+ routes REST (CRUD + audit + auth)
│   ├── login/page.tsx # page de connexion
│   ├── page.tsx       # App shell
│   └── layout.tsx
├── middleware.ts      # protection des routes (sessions)
├── components/
├── components/
│   ├── sgiau/
│   │   ├── modules/   # 28 modules fonctionnels
│   │   ├── shell/     # sidebar, topbar, app-shell
│   │   ├── ui.tsx     # composants partagés
│   │   └── qr-block.tsx
│   └── ui/            # shadcn/ui
└── lib/
    ├── sgiau/         # constants, format, api helpers, seed, store
    └── db.ts          # client Prisma + health check
prisma/
└── schema.prisma      # 30+ modèles, audit log, sync log
```

## 📝 Licence

Projet interne — Amicale Universitaire.

---

**SGIAU v1.0** — conçu pour les amicales universitaires.
