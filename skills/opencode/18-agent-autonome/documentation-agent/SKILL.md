---
name: documentation-agent
description: Utiliser cette skill pour : Documenter au fil de l'eau les actions effectuées, décisions prises et raisons associées. S'applique aux projets web/mobile (catégorie « Agent autonome » du pack Web Master AI, stack type Next.js, React Native, Supabase, Django, Electron). Déclencher dès qu'une tâche touche à « documentation en cours de mission ».
---

# Documentation en cours de mission

**Catégorie :** 18. Agent autonome — Pack *Web Master AI*

## Objectif
Documenter au fil de l'eau les actions effectuées, décisions prises et raisons associées.

## Quand déclencher cette skill
- L'utilisateur demande explicitement de travailler sur « documentation en cours de mission »
- La tâche en cours implique documenter au fil de l'eau les actions effectuées, décisions prises et raisons associées
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

**Journal d'exécution tenu au fil de l'eau :**
```markdown
[14:02] Analyse du besoin: auth email/mdp classique, pas d'OAuth demandé
[14:05] Choix: bcrypt pour le hash (standard, bien supporté)
[14:20] Modèle User + migration créés
[14:35] Endpoint /auth/register créé, validation Zod ajoutée
[14:50] Bug trouvé: mot de passe non re-vérifié à la confirmation -> corrigé
```

## Livrables attendus
- Une solution concrète et fonctionnelle pour « documentation en cours de mission », adaptée au projet en cours
- Une explication claire des choix effectués et de leurs compromis
- La liste des points de vigilance ou suites possibles, le cas échéant
