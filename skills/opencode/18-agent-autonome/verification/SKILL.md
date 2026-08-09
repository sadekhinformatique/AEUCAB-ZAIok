---
name: verification
description: Utiliser cette skill pour : Vérifier systématiquement le résultat de chaque étape par rapport au critère de succès attendu. S'applique aux projets web/mobile (catégorie « Agent autonome » du pack Web Master AI, stack type Next.js, React Native, Supabase, Django, Electron). Déclencher dès qu'une tâche touche à « vérification ».
---

# Vérification

**Catégorie :** 18. Agent autonome — Pack *Web Master AI*

## Objectif
Vérifier systématiquement le résultat de chaque étape par rapport au critère de succès attendu.

## Quand déclencher cette skill
- L'utilisateur demande explicitement de travailler sur « vérification »
- La tâche en cours implique vérifier systématiquement le résultat de chaque étape par rapport au critère de succès attendu
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

**Vérification par critère explicite plutôt qu'impression générale :**
```markdown
Étape: "Endpoint POST /auth/login créé"
Critère de succès:
- [ ] Retourne 200 + token pour des identifiants valides
- [ ] Retourne 401 pour un mot de passe incorrect
- [ ] Retourne 400 si email manquant
Test réel effectué: curl -X POST .../auth/login -d '{"email":"x","password":"y"}'
Résultat obtenu: ...
```

## Livrables attendus
- Une solution concrète et fonctionnelle pour « vérification », adaptée au projet en cours
- Une explication claire des choix effectués et de leurs compromis
- La liste des points de vigilance ou suites possibles, le cas échéant
