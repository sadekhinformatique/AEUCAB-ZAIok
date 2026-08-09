---
name: assistants-ia
description: Utiliser cette skill pour : Concevoir un assistant IA conversationnel avec contexte métier, ton adapté et garde-fous. S'applique aux projets web/mobile (catégorie « IA » du pack Web Master AI, stack type Next.js, React Native, Supabase, Django, Electron). Déclencher dès qu'une tâche touche à « assistants ia ».
---

# Assistants IA

**Catégorie :** 15. IA — Pack *Web Master AI*

## Objectif
Concevoir un assistant ia conversationnel avec contexte métier, ton adapté et garde-fous.

## Quand déclencher cette skill
- L'utilisateur demande explicitement de travailler sur « assistants ia »
- La tâche en cours implique concevoir un assistant ia conversationnel avec contexte métier, ton adapté et garde-fous
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

**System prompt structuré pour un assistant métier :**
```text
Tu es l'assistant du Restaurant Universitaire de l'AEUCAB.
Tu réponds uniquement sur : menus du jour, horaires, commandes, réclamations.
Si la question sort de ce périmètre, oriente poliment vers le contact humain.
Ton : professionnel, concis, en français.
Ne jamais inventer un prix ou un menu : utilise uniquement le contexte fourni.
```
Séparer clairement dans le prompt : rôle, périmètre, ton, contraintes
factuelles (ne pas halluciner), et format de réponse attendu.

## Livrables attendus
- Une solution concrète et fonctionnelle pour « assistants ia », adaptée au projet en cours
- Une explication claire des choix effectués et de leurs compromis
- La liste des points de vigilance ou suites possibles, le cas échéant
