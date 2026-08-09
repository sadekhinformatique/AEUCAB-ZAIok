---
name: agents-ia
description: Utiliser cette skill pour : Concevoir un agent IA capable de planifier et d'exécuter des actions via des outils définis. S'applique aux projets web/mobile (catégorie « IA » du pack Web Master AI, stack type Next.js, React Native, Supabase, Django, Electron). Déclencher dès qu'une tâche touche à « agents ia ».
---

# Agents IA

**Catégorie :** 15. IA — Pack *Web Master AI*

## Objectif
Concevoir un agent ia capable de planifier et d'exécuter des actions via des outils définis.

## Quand déclencher cette skill
- L'utilisateur demande explicitement de travailler sur « agents ia »
- La tâche en cours implique concevoir un agent ia capable de planifier et d'exécuter des actions via des outils définis
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

**Boucle d'agent simple (plan -> action -> observation) :**
```python
def run_agent(task, tools, llm, max_steps=6):
    history = [f"Tâche: {task}"]
    for step in range(max_steps):
        decision = llm.complete(build_prompt(history, tools))
        if decision.type == "final_answer":
            return decision.content
        result = tools[decision.tool_name](**decision.tool_args)
        history.append(f"Action: {decision.tool_name}({decision.tool_args}) -> {result}")
    return "Nombre max d'étapes atteint sans réponse finale."
```
Toujours plafonner le nombre d'étapes et journaliser chaque action/tool
appelé pour pouvoir déboguer et éviter les boucles infinies.

## Livrables attendus
- Une solution concrète et fonctionnelle pour « agents ia », adaptée au projet en cours
- Une explication claire des choix effectués et de leurs compromis
- La liste des points de vigilance ou suites possibles, le cas échéant
