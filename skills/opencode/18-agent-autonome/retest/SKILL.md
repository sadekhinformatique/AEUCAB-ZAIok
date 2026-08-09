---
name: retest
description: Utiliser cette skill pour : Rejouer les vérifications après correction pour confirmer que le problème est réellement résolu. S'applique aux projets web/mobile (catégorie « Agent autonome » du pack Web Master AI, stack type Next.js, React Native, Supabase, Django, Electron). Déclencher dès qu'une tâche touche à « retest ».
---

# Retest

**Catégorie :** 18. Agent autonome — Pack *Web Master AI*

## Objectif
Rejouer les vérifications après correction pour confirmer que le problème est réellement résolu.

## Quand déclencher cette skill
- L'utilisateur demande explicitement de travailler sur « retest »
- La tâche en cours implique rejouer les vérifications après correction pour confirmer que le problème est réellement résolu
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

**Rejouer exactement le test qui avait échoué :**
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password":"secret"}'
# Attendu après correction: 400 Bad Request (email manquant)
```
Ne marquer une correction comme validée qu'après un retest réel, jamais sur
la seule base de la relecture du code corrigé.

## Livrables attendus
- Une solution concrète et fonctionnelle pour « retest », adaptée au projet en cours
- Une explication claire des choix effectués et de leurs compromis
- La liste des points de vigilance ou suites possibles, le cas échéant
