---
name: planification
description: Utiliser cette skill pour : Décomposer une tâche complexe en un plan d'étapes clair, ordonné et vérifiable avant exécution. S'applique aux projets web/mobile (catégorie « Agent autonome » du pack Web Master AI, stack type Next.js, React Native, Supabase, Django, Electron). Déclencher dès qu'une tâche touche à « planification ».
---

# Planification

**Catégorie :** 18. Agent autonome — Pack *Web Master AI*

## Objectif
Décomposer une tâche complexe en un plan d'étapes clair, ordonné et vérifiable avant exécution.

## Quand déclencher cette skill
- L'utilisateur demande explicitement de travailler sur « planification »
- La tâche en cours implique décomposer une tâche complexe en un plan d'étapes clair, ordonné et vérifiable avant exécution
- Un fichier, un module ou une fonctionnalité du projet touche directement ce sujet
- Une revue de code, un audit ou une nouvelle fonctionnalité en dépend

## Checklist / bonnes pratiques
- Découper toute tâche complexe en étapes vérifiables avant d'agir
- Annoncer le plan avant de commencer l'exécution
- Vérifier le résultat de chaque étape avant de passer à la suivante
- Corriger immédiatement les écarts détectés plutôt que de les ignorer
- Retester ce qui a été corrigé pour confirmer la résolution
- Terminer par un rapport clair de ce qui a été fait, trouvé et reste à faire

## Démarche recommandée
1. Clarifier le besoin exact et le contexte du projet (stack, contraintes, existant)
2. Identifier les options possibles et choisir la plus adaptée au contexte (pas la plus complexe)
3. Mettre en œuvre par petites étapes vérifiables
4. Vérifier le résultat par rapport à la checklist ci-dessus
5. Signaler explicitement les limites, risques ou points restant à valider

## Exemples concrets

**Format de plan à produire avant toute exécution :**
```markdown
## Plan pour: "Ajouter l'authentification par email/mot de passe"
1. Créer le modèle User + migration (BDD)
2. Implémenter hash du mot de passe (bcrypt) à l'inscription
3. Endpoint POST /auth/register + validation serveur
4. Endpoint POST /auth/login + génération JWT
5. Middleware de vérification JWT sur les routes protégées
6. Tests: inscription, connexion, accès refusé sans token
```
Chaque étape doit être vérifiable indépendamment (on doit pouvoir dire
"fait / pas fait" sans ambiguïté).

## Livrables attendus
- Une solution concrète et fonctionnelle pour « planification », adaptée au projet en cours
- Une explication claire des choix effectués et de leurs compromis
- La liste des points de vigilance ou suites possibles, le cas échéant
