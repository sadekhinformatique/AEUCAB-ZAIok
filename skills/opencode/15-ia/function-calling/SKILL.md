---
name: function-calling
description: Utiliser cette skill pour : Définir des function calls/tools fiables pour qu'un modèle IA déclenche des actions structurées. S'applique aux projets web/mobile (catégorie « IA » du pack Web Master AI, stack type Next.js, React Native, Supabase, Django, Electron). Déclencher dès qu'une tâche touche à « function calling ».
---

# Function calling

**Catégorie :** 15. IA — Pack *Web Master AI*

## Objectif
Définir des function calls/tools fiables pour qu'un modèle ia déclenche des actions structurées.

## Quand déclencher cette skill
- L'utilisateur demande explicitement de travailler sur « function calling »
- La tâche en cours implique définir des function calls/tools fiables pour qu'un modèle ia déclenche des actions structurées
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

**Définition d'un tool (format Anthropic) :**
```json
{
  "name": "get_weather",
  "description": "Retourne la météo actuelle pour une ville donnée",
  "input_schema": {
    "type": "object",
    "properties": { "city": { "type": "string" } },
    "required": ["city"]
  }
}
```

**Traitement de la réponse `tool_use` côté serveur :**
```js
if (response.stop_reason === 'tool_use') {
  const toolCall = response.content.find(b => b.type === 'tool_use');
  const result = await tools[toolCall.name](toolCall.input);
  // renvoyer `result` au modèle dans le tour suivant comme `tool_result`
}
```
Toujours valider les arguments reçus (`toolCall.input`) avant de les
exécuter — un modèle peut halluciner des paramètres invalides.

## Livrables attendus
- Une solution concrète et fonctionnelle pour « function calling », adaptée au projet en cours
- Une explication claire des choix effectués et de leurs compromis
- La liste des points de vigilance ou suites possibles, le cas échéant
