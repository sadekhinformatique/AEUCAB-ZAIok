---
name: supabase
description: Utiliser cette skill pour : Configurer un projet Supabase : base Postgres, RLS, auth, storage et fonctions edge de façon sécurisée. S'applique aux projets web/mobile (catégorie « Bases de données » du pack Web Master AI, stack type Next.js, React Native, Supabase, Django, Electron). Déclencher dès qu'une tâche touche à « supabase ».
---

# Supabase

**Catégorie :** 05. Bases de données — Pack *Web Master AI*

## Objectif
Configurer un projet supabase : base postgres, rls, auth, storage et fonctions edge de façon sécurisée.

## Quand déclencher cette skill
- L'utilisateur demande explicitement de travailler sur « supabase »
- La tâche en cours implique configurer un projet supabase
- Un fichier, un module ou une fonctionnalité du projet touche directement ce sujet
- Une revue de code, un audit ou une nouvelle fonctionnalité en dépend

## Checklist / bonnes pratiques
- Modéliser avant de coder : entités, relations, cardinalités
- Normaliser raisonnablement (éviter la sur-normalisation qui complique les requêtes)
- Ajouter des contraintes (unique, not null, foreign key) plutôt que de tout valider en code
- Prévoir des migrations réversibles et versionnées
- Indexer les colonnes utilisées dans les WHERE/JOIN fréquents
- Mesurer avant d'optimiser (EXPLAIN, temps de requête réel)
- Prévoir des sauvegardes et un plan de restauration

## Démarche recommandée
1. Clarifier le besoin exact et le contexte du projet (stack, contraintes, existant)
2. Identifier les options possibles et choisir la plus adaptée au contexte (pas la plus complexe)
3. Mettre en œuvre par petites étapes vérifiables
4. Vérifier le résultat par rapport à la checklist ci-dessus
5. Signaler explicitement les limites, risques ou points restant à valider

## Livrables attendus
- Une solution concrète et fonctionnelle pour « supabase », adaptée au projet en cours
- Une explication claire des choix effectués et de leurs compromis
- La liste des points de vigilance ou suites possibles, le cas échéant
