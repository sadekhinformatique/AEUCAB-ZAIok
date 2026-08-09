---
name: rag
description: Utiliser cette skill pour : Mettre en place un pipeline RAG : ingestion, découpage, indexation et récupération de contenu pertinent. S'applique aux projets web/mobile (catégorie « IA » du pack Web Master AI, stack type Next.js, React Native, Supabase, Django, Electron). Déclencher dès qu'une tâche touche à « rag (retrieval augmented generation) ».
---

# RAG (retrieval augmented generation)

**Catégorie :** 15. IA — Pack *Web Master AI*

## Objectif
Mettre en place un pipeline rag : ingestion, découpage, indexation et récupération de contenu pertinent.

## Quand déclencher cette skill
- L'utilisateur demande explicitement de travailler sur « rag (retrieval augmented generation) »
- La tâche en cours implique mettre en place un pipeline rag
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

**Pipeline RAG minimal :**
```python
# 1. Découpage du contenu source
chunks = split_text(document, chunk_size=500, overlap=50)

# 2. Indexation (embeddings + stockage vectoriel)
for chunk in chunks:
    vector = embed(chunk)
    vector_db.upsert(id=chunk.id, vector=vector, metadata={"text": chunk.text})

# 3. Recherche au moment de la question
query_vector = embed(user_question)
results = vector_db.query(query_vector, top_k=5)
context = "\n".join(r.metadata["text"] for r in results)

# 4. Génération avec contexte injecté
prompt = f"Contexte:\n{context}\n\nQuestion: {user_question}"
answer = llm.complete(prompt)
```
Points de vigilance : taille des chunks, chevauchement, et toujours citer
la source utilisée pour éviter les réponses non vérifiables.

## Livrables attendus
- Une solution concrète et fonctionnelle pour « rag (retrieval augmented generation) », adaptée au projet en cours
- Une explication claire des choix effectués et de leurs compromis
- La liste des points de vigilance ou suites possibles, le cas échéant
