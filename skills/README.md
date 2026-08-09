# Skills et compétences — Pack Web Master AI

Référentiel complet des skills utilisées pour la conception, le développement, la sécurité, le SEO et le déploiement de projets web/mobile. Ce dossier est une copie du pack de skills (Web Master AI) fourni par l'utilisateur.

## Sources

- `opencode/` — pack **Web Master AI** (18 catégories, 176 skills)

## Index des skills — pack Web Master AI (176)

### Architecture conception (8)

- **analyse-du-besoin** — Cadrer un projet en clarifiant objectifs, utilisateurs cibles, contraintes et critères de succès avant toute conception technique
- **architecture-api** — Concevoir une API cohérente : ressources, versioning, conventions de nommage, pagination, gestion des erreurs
- **architecture-frontend-backend** — Concevoir la séparation frontend/backend, le mode de communication (REST/GraphQL) et la répartition des responsabilités
- **architecture-saas** — Concevoir une architecture SaaS scalable : séparation des données clients, facturation, plans, isolation des environnements
- **cahier-des-charges** — Rédiger un cahier des charges structuré (contexte, fonctionnalités, contraintes techniques, livrables, planning) pour un projet web/mobile
- **gestion-roles-permissions** — Concevoir un système RBAC/ABAC : rôles, permissions granulaires, héritage, contrôle d'accès aux ressources
- **modelisation-base-de-donnees** — Construire un modèle de données (MCD/MLD) normalisé, avec relations, clés et contraintes adaptées au besoin métier
- **multi-tenant** — Mettre en place une architecture multi-tenant (schema-per-tenant, row-level ou base-per-tenant) selon le niveau d'isolation requis

### Ui ux (10)

- **accessibilite-wcag** — Auditer et corriger une interface pour respecter les critères WCAG (contraste, navigation clavier, ARIA, lecteurs d'écran)
- **dark-light-mode** — Implémenter un thème clair/sombre cohérent avec variables de couleur centralisées et bascule persistante
- **design-moderne** — Proposer une direction visuelle actuelle et distinctive, en évitant les gabarits génériques et le style 'template IA'
- **design-system** — Construire un design system cohérent : couleurs, typographies, espacements, composants réutilisables et règles d'usage
- **micro-interactions-animations** — Ajouter des micro-interactions et animations utiles (feedback, transitions) sans nuire à la performance
- **mobile-first** — Concevoir en priorité pour mobile puis étendre vers tablette/desktop, en optimisant les interactions tactiles
- **responsive-design** — Concevoir des interfaces qui s'adaptent proprement à toutes les tailles d'écran avec des breakpoints cohérents
- **user-flows** — Cartographier les parcours utilisateurs clés (inscription, achat, réservation
- **ux-research** — Structurer une recherche utilisateur légère (personas, interviews, besoins) pour orienter les décisions de conception
- **wireframes** — Produire des wireframes basse/moyenne fidélité pour valider la structure des écrans avant le design final

### Frontend (14)

- **charts-graphiques** — Choisir et implémenter le bon type de graphique (courbes, barres, camemberts
- **composants-reutilisables** — Concevoir des composants génériques, configurables via props, documentés et réutilisables entre écrans/projets
- **css3-avance** — Utiliser les fonctionnalités modernes de CSS3 (grid, flexbox, variables, animations) pour des interfaces robustes
- **dashboards** — Concevoir des dashboards lisibles : hiérarchie des indicateurs, filtres, mise en page adaptée aux décisions à prendre
- **formulaires** — Construire des formulaires robustes : validation, messages d'erreur clairs, gestion des états et soumission asynchrone
- **gestion-etat** — Choisir et structurer une solution de state management (local, contexte, store global) adaptée à la complexité de l'app
- **html5-semantique** — Structurer des pages en HTML5 sémantique, accessible et bien indexable par les moteurs de recherche
- **javascript-typescript** — Écrire du JS/TS moderne, typé et maintenable, avec une gestion propre des erreurs et de l'asynchrone
- **nextjs** — Structurer une application Next
- **react** — Construire des interfaces React avec hooks, composition de composants et bonnes pratiques de performance
- **shadcn-ui** — Intégrer et personnaliser des composants shadcn/ui pour accélérer le développement d'interfaces cohérentes
- **tableaux-de-donnees** — Implémenter des tableaux avec tri, filtres, pagination et sélection, performants même avec de gros volumes
- **tailwind-css** — Mettre en place et organiser Tailwind CSS (config, thème, classes utilitaires) pour un style cohérent et rapide à maintenir
- **vue** — Construire des interfaces avec Vue (composition API, réactivité, composants) pour les projets utilisant ce framework

### Backend (15)

- **authentification** — Implémenter une authentification sécurisée (inscription, connexion, réinitialisation de mot de passe, hashing)
- **django** — Structurer une application Django (apps, models, vues, serializers) en suivant les conventions du framework
- **emails-transactionnels** — Implémenter l'envoi d'emails transactionnels (confirmation, réinitialisation, notifications) de façon fiable
- **fastapi** — Construire une API FastAPI performante avec typage Pydantic, dépendances et documentation OpenAPI automatique
- **gestion-des-erreurs** — Structurer une gestion d'erreurs centralisée, avec codes cohérents et messages utiles sans fuite d'information sensible
- **gestion-fichiers** — Gérer l'upload, le stockage, la validation et la diffusion de fichiers (taille, type, sécurité) de façon sûre
- **graphql** — Concevoir un schéma GraphQL (types, queries, mutations, resolvers) adapté aux besoins du frontend
- **jwt** — Mettre en place une authentification par JWT : génération, vérification, expiration, refresh tokens
- **nodejs** — Structurer un backend Node
- **notifications** — Concevoir un système de notifications (in-app, email, push) déclenché par des événements métier
- **oauth** — Intégrer une connexion OAuth (Google, GitHub, etc
- **python-backend** — Développer un backend Python propre et structuré, avec une organisation claire des modules et de la logique métier
- **rest-api** — Concevoir et implémenter une API REST cohérente : ressources, verbes HTTP, pagination, filtrage, versioning
- **sessions** — Gérer des sessions serveur (cookies sécurisés, expiration, invalidation) selon le besoin du projet
- **validation-donnees** — Mettre en place une validation stricte des données entrantes (schémas, types, règles métier) côté serveur

### Bases de donnees (10)

- **indexation** — Choisir les bons index (simples, composites, uniques) pour accélérer les requêtes sans pénaliser les écritures
- **migrations** — Gérer des migrations de schéma sûres, versionnées et applicables sans perte de données en production
- **mysql** — Concevoir et administrer une base MySQL en tenant compte de ses spécificités (moteurs de stockage, index)
- **optimisation-requetes-sql** — Diagnostiquer et corriger les requêtes lentes (plans d'exécution, N+1, index manquants)
- **postgresql** — Concevoir et administrer une base PostgreSQL : types, contraintes, index, requêtes avancées
- **prisma** — Modéliser un schéma Prisma, générer le client et gérer les migrations de façon fiable
- **relations-bdd** — Choisir et implémenter le bon type de relation (1-1, 1-N, N-N) avec les clés étrangères et tables de jointure adaptées
- **sql-avance** — Écrire des requêtes SQL complexes (jointures, sous-requêtes, agrégations, window functions) lisibles et performantes
- **sqlite** — Utiliser SQLite efficacement pour des applications locales/embarquées (Electron, prototypage) avec ses limites en tête
- **supabase** — Configurer un projet Supabase : base Postgres, RLS, auth, storage et fonctions edge de façon sécurisée

### Securite (12)

- **audit-securite** — Réaliser un audit de sécurité structuré d'une application existante et produire un rapport priorisé
- **controle-acces** — Vérifier que chaque endpoint applique un contrôle d'accès correct selon le rôle et le propriétaire de la ressource
- **csrf** — Protéger les actions sensibles contre le CSRF (tokens, SameSite cookies, vérification d'origine)
- **gestion-secrets** — Mettre en place une gestion sûre des secrets (variables d'environnement, rotation, non-versionnement)
- **headers-securite** — Configurer les headers HTTP de sécurité (CSP, HSTS, X-Frame-Options, etc
- **idor** — Détecter et corriger les failles IDOR (accès direct à des ressources d'autrui via manipulation d'ID)
- **injection-sql** — Détecter et corriger les risques d'injection SQL en imposant requêtes préparées et validation stricte
- **owasp-top10** — Auditer une application par rapport aux risques de l'OWASP Top 10 et proposer des corrections priorisées
- **rate-limiting** — Mettre en place une limitation de débit sur les endpoints sensibles (login, API publique) pour éviter les abus
- **ssrf** — Identifier et corriger les risques de SSRF lors d'appels serveur vers des URLs fournies par l'utilisateur
- **validation-serveur** — Garantir que toute validation critique est refaite côté serveur, indépendamment du frontend
- **xss** — Identifier et corriger les failles XSS (stockées, réfléchies, DOM-based) via échappement et CSP

### Performance (8)

- **caching** — Concevoir une stratégie de cache (navigateur, CDN, serveur, base de données) adaptée au type de données
- **cdn** — Configurer un CDN pour servir assets statiques et contenu avec latence minimale
- **code-splitting-bundle** — Réduire la taille du bundle JS via code splitting, imports dynamiques et analyse du bundle
- **compression** — Activer et configurer la compression (gzip/brotli) des réponses HTTP et des assets
- **core-web-vitals** — Diagnostiquer et améliorer LCP, INP/FID et CLS d'une page web
- **lazy-loading** — Mettre en place le chargement différé des images, composants et routes non immédiatement nécessaires
- **optimisation-images** — Optimiser le poids et le format des images (compression, formats modernes, tailles responsives)
- **optimisation-sql-perf** — Réduire le temps de réponse des requêtes critiques via index, requêtes ciblées et évitement du N+1

### Seo (10)

- **canonical** — Mettre en place des balises canonical pour éviter le contenu dupliqué entre variantes de pages
- **metadata** — Définir des balises title/description pertinentes et uniques pour chaque page
- **open-graph** — Configurer les balises Open Graph/Twitter Cards pour un partage social soigné
- **robots-txt** — Configurer un robots
- **schema-org** — Ajouter des données structurées Schema
- **seo-local** — Optimiser la visibilité locale (Google Business Profile, données NAP cohérentes, contenu localisé)
- **seo-multilingue** — Mettre en place un SEO multilingue correct (hreflang, structure d'URL par langue, contenu traduit)
- **seo-technique** — Auditer et corriger les aspects techniques du SEO : rendu, vitesse, indexabilité, structure des URLs
- **sitemap** — Générer et maintenir un sitemap
- **urls-propres** — Concevoir des URLs lisibles, cohérentes et stables, sans paramètres inutiles

### Tests qa (9)

- **detection-regressions** — Mettre en place des tests de non-régression pour sécuriser les évolutions futures du projet
- **tests-accessibilite** — Vérifier la conformité accessibilité (navigation clavier, lecteurs d'écran, contrastes) via tests manuels et automatisés
- **tests-api** — Tester les endpoints d'une API (statuts, payloads, cas d'erreur, authentification)
- **tests-e2e** — Écrire des tests end-to-end couvrant les parcours utilisateurs critiques de bout en bout
- **tests-integration** — Tester l'interaction entre plusieurs modules (API + BDD, services entre eux) de façon réaliste
- **tests-performance** — Mettre en place des tests de charge/perf pour vérifier le comportement sous forte utilisation
- **tests-responsive-navigateurs-mobiles** — Vérifier le bon fonctionnement de l'application sur différentes tailles d'écran, navigateurs et appareils mobiles
- **tests-securite** — Tester les vecteurs d'attaque courants (injection, accès non autorisé) sur une application avant mise en production
- **tests-unitaires** — Écrire des tests unitaires ciblés sur la logique métier, isolés des dépendances externes

### Devops (7)

- **backups-rollback** — Définir une stratégie de sauvegarde régulière et une procédure de rollback rapide en cas d'incident
- **ci-cd** — Mettre en place un pipeline CI/CD (build, tests, déploiement automatisé) adapté au projet
- **docker-devops** — Conteneuriser une application pour un environnement de développement reproductible
- **environnements-staging-production** — Mettre en place des environnements staging et production cohérents pour valider avant mise en ligne
- **git-github** — Structurer un workflow Git propre (branches, commits, PR, revue de code) adapté à la taille de l'équipe
- **monitoring-logs** — Mettre en place une supervision applicative (alertes, dashboards) et une journalisation exploitable
- **variables-environnement** — Gérer les variables d'environnement par contexte (dev/staging/prod) de façon sécurisée

### Deploiement (10)

- **cloudflare** — Configurer Cloudflare (DNS, proxy, cache, règles de sécurité) devant une application ou un site
- **dns-ssl** — Configurer les enregistrements DNS et les certificats SSL pour un domaine en production
- **docker-deploiement** — Conteneuriser et déployer une application en production avec Docker, images optimisées et orchestration simple
- **netlify** — Déployer et configurer un site/app sur Netlify : build, redirections, fonctions serverless
- **nginx** — Configurer Nginx comme reverse proxy (routage, SSL, cache, compression) devant une application
- **postgresql-production** — Configurer, sécuriser et sauvegarder une base PostgreSQL en environnement de production
- **railway** — Déployer une application/backend/BDD sur Railway avec configuration des services et variables
- **render** — Déployer une application sur Render (web service, base de données, cron jobs) avec configuration adaptée
- **vercel** — Déployer et configurer une application (Next
- **vps** — Configurer un VPS (accès sécurisé, pare-feu, utilisateurs) pour héberger une application en production

### Ecommerce (10)

- **administration-ecommerce** — Construire un back-office e-commerce clair pour gérer produits, commandes et clients au quotidien
- **catalogue-produits** — Concevoir un catalogue produits (catégories, variantes, attributs, recherche/filtre) évolutif
- **comptes-clients** — Concevoir l'espace client (historique de commandes, adresses, préférences) de façon simple et sécurisée
- **coupons-promotions** — Implémenter un système de coupons/réductions avec règles d'usage claires et vérifiables côté serveur
- **facturation-ecommerce** — Générer des factures conformes automatiquement à partir des commandes validées
- **gestion-commandes** — Concevoir le cycle de vie d'une commande (création, statuts, historique) de façon traçable
- **gestion-stocks** — Gérer les niveaux de stock de façon cohérente, avec alertes de rupture et réservation lors de la commande
- **livraison** — Intégrer la gestion des options et frais de livraison selon zone, poids ou transporteur
- **paiement** — Intégrer un prestataire de paiement (Stripe, etc
- **panier** — Implémenter un panier persistant, cohérent entre sessions et appareils, avec recalcul serveur des prix

### Saas (10)

- **abonnement** — Concevoir le cycle de vie d'un abonnement (essai, actif, impayé, résilié) de façon robuste
- **analytics-saas** — Mettre en place le suivi des métriques clés d'un SaaS (activation, rétention, churn, usage)
- **billing** — Intégrer la facturation récurrente (Stripe Billing ou équivalent) avec gestion des échecs de paiement
- **dashboard-saas** — Concevoir le dashboard principal d'un SaaS : indicateurs clés, actions rapides, état du compte
- **equipes** — Gérer l'invitation, les rôles et la gestion des membres au sein d'une équipe/organisation
- **onboarding** — Concevoir un parcours d'onboarding qui amène rapidement l'utilisateur à sa première valeur
- **organisations** — Modéliser la notion d'organisation/compte multi-utilisateurs avec propriétaire et membres
- **permissions-saas** — Définir des permissions par rôle et par organisation, vérifiées à chaque action sensible
- **plans-tarifaires** — Structurer des plans tarifaires clairs avec fonctionnalités et limites associées à chaque niveau
- **quotas** — Implémenter des quotas d'usage vérifiés côté serveur avec messages clairs à l'approche des limites

### Applications metier (10)

- **archives-documentaires** — Concevoir un système d'archivage de documents (classement, recherche, droits d'accès, rétention)
- **crm** — Concevoir un CRM (contacts, opportunités, suivi des interactions, pipeline) adapté à l'activité du client
- **erp** — Structurer les modules d'un ERP (achats, ventes, stock, comptabilité) et leurs interactions
- **facturation-metier** — Concevoir un module de facturation adapté à un secteur d'activité (devis, factures, relances, conformité)
- **gestion-associative** — Concevoir un système de gestion pour associations (membres, cotisations, événements, communication)
- **gestion-finances** — Concevoir un module de suivi financier (dépenses, recettes, budgets, rapports) fiable et traçable
- **gestion-presence** — Concevoir un système de suivi de présence (pointage, retards, absences, rapports)
- **gestion-rh** — Concevoir un module RH (dossiers employés, congés, contrats) conforme aux besoins de l'organisation
- **gestion-scolaire** — Concevoir un système de gestion scolaire (élèves, classes, notes, présences, bulletins)
- **inventaire** — Concevoir un système de suivi d'inventaire (entrées/sorties, valorisation, alertes de stock)

### Ia (9)

- **agents-ia** — Concevoir un agent IA capable de planifier et d'exécuter des actions via des outils définis
- **assistants-ia** — Concevoir un assistant IA conversationnel avec contexte métier, ton adapté et garde-fous
- **embeddings** — Générer et utiliser des embeddings pour la recherche sémantique ou le clustering de contenu
- **function-calling** — Définir des function calls/tools fiables pour qu'un modèle IA déclenche des actions structurées
- **generation-documents-ia** — Générer des documents structurés (rapports, contrats, contenus) à l'aide de l'IA de façon fiable et vérifiable
- **integration-llm-providers** — Intégrer un ou plusieurs providers de LLM dans une application, avec gestion des clés, erreurs et coûts
- **rag** — Mettre en place un pipeline RAG : ingestion, découpage, indexation et récupération de contenu pertinent
- **streaming-ia** — Implémenter le streaming des réponses IA côté frontend/backend pour une expérience fluide
- **vector-database** — Choisir et configurer une base vectorielle adaptée au volume et au besoin de recherche sémantique

### Qualite du code (7)

- **architecture-modulaire** — Organiser un projet en modules cohérents et faiblement couplés, faciles à faire évoluer indépendamment
- **clean-code-solid-dry-kiss** — Appliquer les principes de code propre (clean code, SOLID, DRY, KISS) lors de l'écriture ou de la revue de code
- **conventions-de-code** — Définir et appliquer des conventions de nommage et de structure cohérentes sur l'ensemble du projet
- **documentation-technique** — Rédiger une documentation technique claire (README, commentaires utiles, guides d'installation)
- **formatting** — Configurer un formateur de code automatique (Prettier ou équivalent) pour un style uniforme
- **linting** — Configurer un linter adapté au langage/framework pour détecter les erreurs et incohérences automatiquement
- **refactoring** — Refactoriser du code existant en toute sécurité, par petites étapes vérifiables

### Analyse automatique (10)

- **analyse-dependances** — Auditer les dépendances du projet (versions obsolètes, vulnérabilités, packages inutiles)
- **analyse-performance-auto** — Identifier les goulets d'étranglement de performance d'une application existante
- **analyse-projet-existant** — Faire l'état des lieux complet d'un projet existant (stack, structure, dépendances, dette technique)
- **analyse-securite-auto** — Passer en revue le code pour repérer les failles de sécurité courantes de façon systématique
- **analyse-seo-auto** — Auditer un site existant sur les critères SEO techniques et de contenu
- **analyse-ux-auto** — Évaluer une interface existante par rapport aux bonnes pratiques UX et lister les frictions identifiées
- **detection-bugs** — Parcourir le code pour repérer des bugs réels (logique, edge cases, erreurs silencieuses)
- **detection-fichiers-inutiles** — Identifier les fichiers, imports et dépendances inutilisés à nettoyer en toute sécurité
- **detection-incoherences** — Repérer les incohérences (nommage, structure, comportements différents pour des cas similaires)
- **recommandations** — Synthétiser les constats d'analyse en recommandations claires, priorisées et actionnables

### Agent autonome (7)

- **correction** — Corriger les écarts ou erreurs détectés de façon ciblée, sans effets de bord non maîtrisés
- **documentation-agent** — Documenter au fil de l'eau les actions effectuées, décisions prises et raisons associées
- **execution** — Exécuter un plan étape par étape en s'arrêtant sur toute anomalie plutôt que de continuer aveuglément
- **planification** — Décomposer une tâche complexe en un plan d'étapes clair, ordonné et vérifiable avant exécution
- **rapport-final** — Produire un rapport final clair : ce qui a été fait, ce qui a été trouvé, ce qui reste à faire
- **retest** — Rejouer les vérifications après correction pour confirmer que le problème est réellement résolu
- **verification** — Vérifier systématiquement le résultat de chaque étape par rapport au critère de succès attendu

---
Généré automatiquement. Chaque dossier de skill contient son `SKILL.md` complet.
