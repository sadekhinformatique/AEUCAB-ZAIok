---
name: compression
description: Utiliser cette skill pour : Activer et configurer la compression (gzip/brotli) des réponses HTTP et des assets. S'applique aux projets web/mobile (catégorie « Performance » du pack Web Master AI, stack type Next.js, React Native, Supabase, Django, Electron). Déclencher dès qu'une tâche touche à « compression ».
---

# Compression

**Catégorie :** 07. Performance — Pack *Web Master AI*

## Objectif
Activer et configurer la compression (gzip/brotli) des réponses http et des assets.

## Quand déclencher cette skill
- L'utilisateur demande explicitement de travailler sur « compression »
- La tâche en cours implique activer et configurer la compression (gzip/brotli) des réponses http et des assets
- Un fichier, un module ou une fonctionnalité du projet touche directement ce sujet
- Une revue de code, un audit ou une nouvelle fonctionnalité en dépend

## Checklist / bonnes pratiques
- Mesurer avant d'optimiser (Lighthouse, Web Vitals, profiling réel)
- Prioriser les optimisations à fort impact utilisateur (LCP, TTI)
- Différer/paresser ce qui n'est pas visible immédiatement
- Réduire la taille des payloads (images, JS, JSON) avant de complexifier
- Mettre en cache ce qui peut l'être, avec une stratégie d'invalidation claire
- Vérifier l'impact des optimisations sur mobile et connexion lente

## Démarche recommandée
1. Clarifier le besoin exact et le contexte du projet (stack, contraintes, existant)
2. Identifier les options possibles et choisir la plus adaptée au contexte (pas la plus complexe)
3. Mettre en œuvre par petites étapes vérifiables
4. Vérifier le résultat par rapport à la checklist ci-dessus
5. Signaler explicitement les limites, risques ou points restant à valider

## Livrables attendus
- Une solution concrète et fonctionnelle pour « compression », adaptée au projet en cours
- Une explication claire des choix effectués et de leurs compromis
- La liste des points de vigilance ou suites possibles, le cas échéant
