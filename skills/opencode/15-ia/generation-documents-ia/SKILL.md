---
name: generation-documents-ia
description: Utiliser cette skill pour : Générer des documents structurés (rapports, contrats, contenus) à l'aide de l'IA de façon fiable et vérifiable. S'applique aux projets web/mobile (catégorie « IA » du pack Web Master AI, stack type Next.js, React Native, Supabase, Django, Electron). Déclencher dès qu'une tâche touche à « génération de documents par ia ».
---

# Génération de documents par IA

**Catégorie :** 15. IA — Pack *Web Master AI*

## Objectif
Générer des documents structurés (rapports, contrats, contenus) à l'aide de l'ia de façon fiable et vérifiable.

## Quand déclencher cette skill
- L'utilisateur demande explicitement de travailler sur « génération de documents par ia »
- La tâche en cours implique générer des documents structurés (rapports, contrats, contenus) à l'aide de l'ia de façon fiable et vérifiable
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

**Forcer une sortie structurée (JSON) exploitable par le code :**
```python
prompt = '''Génère un contrat de prestation au format JSON strict, sans texte
autour, avec les clés: titre, parties, objet, montant, duree, clauses (liste).'''

response = llm.complete(prompt)
contract = json.loads(response)  # toujours entourer d'un try/except
```
Bonne pratique : valider le JSON reçu avec un schéma (Zod/Pydantic) avant de
l'utiliser pour générer un PDF/Word, et prévoir une relecture humaine pour
tout document ayant une valeur légale ou contractuelle.

## Livrables attendus
- Une solution concrète et fonctionnelle pour « génération de documents par ia », adaptée au projet en cours
- Une explication claire des choix effectués et de leurs compromis
- La liste des points de vigilance ou suites possibles, le cas échéant
