---
name: correction
description: Utiliser cette skill pour : Corriger les écarts ou erreurs détectés de façon ciblée, sans effets de bord non maîtrisés. S'applique aux projets web/mobile (catégorie « Agent autonome » du pack Web Master AI, stack type Next.js, React Native, Supabase, Django, Electron). Déclencher dès qu'une tâche touche à « correction ».
---

# Correction

**Catégorie :** 18. Agent autonome — Pack *Web Master AI*

## Objectif
Corriger les écarts ou erreurs détectés de façon ciblée, sans effets de bord non maîtrisés.

## Quand déclencher cette skill
- L'utilisateur demande explicitement de travailler sur « correction »
- La tâche en cours implique corriger les écarts ou erreurs détectés de façon ciblée, sans effets de bord non maîtrisés
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

**Journal de correction ciblée :**
```markdown
Problème détecté: le endpoint /auth/login retourne 500 si `email` est absent
Cause: absence de validation avant l'accès à req.body.email
Correction: ajout d'une validation Zod en entrée de route (voir skill validation-serveur)
Fichier modifié: routes/auth.js (lignes 12-18)
```
Corriger uniquement ce qui est nécessaire pour résoudre le problème identifié,
sans profiter de l'occasion pour réécrire du code non lié.

## Livrables attendus
- Une solution concrète et fonctionnelle pour « correction », adaptée au projet en cours
- Une explication claire des choix effectués et de leurs compromis
- La liste des points de vigilance ou suites possibles, le cas échéant
