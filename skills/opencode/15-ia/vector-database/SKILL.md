---
name: vector-database
description: Utiliser cette skill pour : Choisir et configurer une base vectorielle adaptée au volume et au besoin de recherche sémantique. S'applique aux projets web/mobile (catégorie « IA » du pack Web Master AI, stack type Next.js, React Native, Supabase, Django, Electron). Déclencher dès qu'une tâche touche à « vector database ».
---

# Vector database

**Catégorie :** 15. IA — Pack *Web Master AI*

## Objectif
Choisir et configurer une base vectorielle adaptée au volume et au besoin de recherche sémantique.

## Quand déclencher cette skill
- L'utilisateur demande explicitement de travailler sur « vector database »
- La tâche en cours implique choisir et configurer une base vectorielle adaptée au volume et au besoin de recherche sémantique
- Un fichier, un module ou une fonctionnalité du projet touche directement ce sujet
- Une revue de code, un audit ou une nouvelle fonctionnalité en dépend

## Checklist / bonnes pratiques
- Définir précisément la tâche avant de choisir un modèle/provider
- Ne jamais envoyer de données sensibles sans validation explicite du besoin
- Streamer les réponses longues pour une meilleure expérience utilisateur
- Prévoir les cas d'échec (timeout, réponse vide, contenu inattendu)
- Structurer les sorties (JSON) quand elles doivent être exploitées par du code
- Contrôler les coûts (taille de contexte, nombre d'appels, cache des réponses)

## Démarche recommandée
1. Clarifier le besoin exact et le contexte du projet (stack, contraintes, existant)
2. Identifier les options possibles et choisir la plus adaptée au contexte (pas la plus complexe)
3. Mettre en œuvre par petites étapes vérifiables
4. Vérifier le résultat par rapport à la checklist ci-dessus
5. Signaler explicitement les limites, risques ou points restant à valider

## Exemples concrets

**Extension `pgvector` sur Supabase/PostgreSQL :**
```sql
create extension if not exists vector;

create table documents (
  id bigserial primary key,
  content text,
  embedding vector(1536)
);

-- Recherche des documents les plus proches
select content, 1 - (embedding <=> $1) as similarity
from documents
order by embedding <=> $1
limit 5;
```
`pgvector` convient bien quand la base relationnelle existe déjà (évite
d'ajouter une infra dédiée pour un volume modéré).

## Livrables attendus
- Une solution concrète et fonctionnelle pour « vector database », adaptée au projet en cours
- Une explication claire des choix effectués et de leurs compromis
- La liste des points de vigilance ou suites possibles, le cas échéant
