---
name: embeddings
description: Utiliser cette skill pour : Générer et utiliser des embeddings pour la recherche sémantique ou le clustering de contenu. S'applique aux projets web/mobile (catégorie « IA » du pack Web Master AI, stack type Next.js, React Native, Supabase, Django, Electron). Déclencher dès qu'une tâche touche à « embeddings ».
---

# Embeddings

**Catégorie :** 15. IA — Pack *Web Master AI*

## Objectif
Générer et utiliser des embeddings pour la recherche sémantique ou le clustering de contenu.

## Quand déclencher cette skill
- L'utilisateur demande explicitement de travailler sur « embeddings »
- La tâche en cours implique générer et utiliser des embeddings pour la recherche sémantique ou le clustering de contenu
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

**Génération d'embeddings (OpenAI) :**
```python
from openai import OpenAI
client = OpenAI()

response = client.embeddings.create(
    model="text-embedding-3-small",
    input="Texte à transformer en vecteur",
)
vector = response.data[0].embedding  # liste de floats
```

**Similarité cosinus pour comparer deux textes :**
```python
import numpy as np

def cosine_similarity(a, b):
    a, b = np.array(a), np.array(b)
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))
```

## Livrables attendus
- Une solution concrète et fonctionnelle pour « embeddings », adaptée au projet en cours
- Une explication claire des choix effectués et de leurs compromis
- La liste des points de vigilance ou suites possibles, le cas échéant
