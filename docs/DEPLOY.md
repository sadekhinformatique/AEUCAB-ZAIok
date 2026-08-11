# Déploiement automatique — Guide de déblocage

Ce guide explique comment débloquer les **deux restrictions de compte** qui empêchent le
déploiement automatique GitHub → Vercel, puis comment vérifier que tout fonctionne.

> **Contexte** : l'infrastructure de déploiement est déjà en place et prête :
> - Workflow GitHub Actions `.github/workflows/deploy.yml` (déclenché à chaque push sur `main`)
> - Secrets de dépôt : `VERCEL_TOKEN`, `DATABASE_URL`, `AUTH_SECRET`
> - Le build est auto-suffisant (variables injectées depuis les secrets GitHub, pas besoin de
>   configuration dans le dashboard Vercel)
>
> Il ne manque que le déblocage des deux comptes ci-dessous.

---

## Étape 1 — Débloquer GitHub Actions

**Diagnostic** : le workflow est valide (« active ») mais chaque run échoue en ~4 s sans jamais
démarrer de runner (`started_at: null`), même avec un simple `echo`. Aucun repo du compte n'a
jamais exécuté d'Action → Actions bloqués au niveau du compte.

### 1.1 — Vérifier l'email de connexion

👉 **https://github.com/settings/emails**

L'email utilisé pour se connecter doit être **vérifié** (pas de bandeau « Unverified »).

### 1.2 — Activer les Actions au niveau du compte (cause la plus probable)

👉 **https://github.com/settings/actions** → onglet **« General »** :

1. Section **« Actions permissions »** → cocher **« Allow all actions and reusable workflows »**
2. Cliquer **« Save »** en bas de page

### 1.3 — Confirmer au niveau du repo

👉 **https://github.com/sadekhinformatique/AEUCAB-ZAIok/settings/actions**

Même réglage « Allow all actions » (déjà correct côté API, à confirmer visuellement).

### 1.4 — Si le compte est signalé (« flagged »)

Un compte signalé limite les API, les pushes et les Actions jusqu'à vérification.

👉 **https://github.com/settings/security** → compléter la **vérification par SMS**.

Autre signe : un bandeau d'avertissement apparaît en haut de **https://github.com**.

### 1.5 — Vérifier que c'est débloqué

Depuis le repo : **Actions → « Deploy to Vercel (production) » → « Run workflow »**.

Si les runs démarrent enfin (« queued » → « in progress »), c'est bon. Le workflow ira jusqu'à
l'étape Vercel, qui échouera tant que l'étape 2 n'est pas faite — c'est **normal**.

---

## Étape 2 — Débloquer le compte Vercel

**Diagnostic** : l'API `/v2/user` renvoie `"limited": true` pour le compte **SADEKH**
(`djahfarsadekh2015@gmail.com`). Conséquences : le token ne peut ni lister les teams/projets,
ni créer un projet, ni déployer (403 en Preview **et** en Production). C'est un drapeau interne
de restriction, généralement déclenché par : **paiement en échec / solde impayé**, **email non
vérifié**, ou **contrôle de sécurité**.

### 2.1 — Se connecter et lire les notifications

👉 **https://vercel.com/login** (avec `djahfarsadekh2015@gmail.com`)

- Un **bandeau rouge** en haut du dashboard indique la raison exacte de la restriction
- Vérifier aussi la boîte mail : Vercel envoie un email « Your account has been limited »
  avec le motif

### 2.2 — Vérifier le profil et l'email

👉 **https://vercel.com/account/settings**

L'email doit être **confirmé** (bouton « Resend confirmation » si besoin), profil complet.

### 2.3 — Vérifier la facturation (cause la plus fréquente)

👉 **https://vercel.com/account/billing**

- Le compte doit être sur le plan **Hobby** (gratuit)
- S'il y a un **solde impayé** : régler ou contacter le support pour l'annuler
- Vérifier qu'aucun moyen de paiement n'est en échec

### 2.4 — Vérifier l'accès au projet

👉 **https://vercel.com/dashboard**

Le projet **`aeucab-zai`** doit être visible (le site `aeucab-zai.vercel.app` est en ligne).
S'il n'apparaît pas, il appartient peut-être à un **autre compte Vercel** (souvent lié à
l'email de l'organisation GitHub) — se connecter alors avec celui-ci.

### 2.5 — Si aucune cause n'est visible : contacter le support Vercel

👉 **https://vercel.com/help** (ou https://support.vercel.com)

Ouvrir un ticket en citant :

> « L'API `/v2/user` renvoie `"limited": true`. Toutes les opérations sont refusées
> (forbidden) : lister les teams, créer un projet, déployer en preview et en production.
> Comment lever cette restriction ? »

---

## Étape 3 — Vérification finale

Dès que les étapes 1.2 et 2.x sont faites, vérifier dans l'ordre :

1. **CLI Vercel** : `npx vercel whoami --token <VERCEL_TOKEN>`
   → doit afficher le compte au lieu de « You are not authorized »
2. **Déploiement API** : créer un déploiement sur le projet `aeucab-zai`
   → ne doit plus renvoyer 403
3. **Push** : un `git push` sur `main` déclenche le workflow qui déploie en production
   → vérifier le statut vert dans **Actions** puis le site `https://aeucab-zai.vercel.app`

### Identifiants de production (rappel)

| Compte | Rôle | Mot de passe |
|---|---|---|
| `admin` | ADMIN_IT (accès complet) | voir le dernier commit « rotation du mot de passe admin » ou demander au responsable |

Le mot de passe admin est affiché une seule fois lors de sa rotation — le conserver hors du
repo. C'est l'admin qui crée les autres utilisateurs (module « Nouvel utilisateur », qui
impose la politique de mot de passe fort).
