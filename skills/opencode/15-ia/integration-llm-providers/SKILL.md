---
name: integration-llm-providers
description: Utiliser cette skill pour : Intégrer un ou plusieurs providers de LLM dans une application, avec gestion des clés, erreurs et coûts. S'applique aux projets web/mobile (catégorie « IA » du pack Web Master AI, stack type Next.js, React Native, Supabase, Django, Electron). Déclencher dès qu'une tâche touche à « intégration llm (openai, gemini, claude, mistral) ».
---

# Intégration LLM (OpenAI, Gemini, Claude, Mistral)

**Catégorie :** 15. IA — Pack *Web Master AI*

## Objectif
Intégrer un ou plusieurs providers de llm dans une application, avec gestion des clés, erreurs et coûts.

## Quand déclencher cette skill
- L'utilisateur demande explicitement de travailler sur « intégration llm (openai, gemini, claude, mistral) »
- La tâche en cours implique intégrer un ou plusieurs providers de llm dans une application, avec gestion des clés, erreurs et coûts
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

**Appel API Anthropic (Node) :**
```js
const res = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'x-api-key': process.env.ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01',
    'content-type': 'application/json',
  },
  body: JSON.stringify({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  }),
});
const data = await res.json();
```

**Abstraction multi-provider (interface commune) :**
```ts
interface LLMProvider {
  complete(prompt: string): Promise<string>;
}
class AnthropicProvider implements LLMProvider { /* ... */ }
class OpenAIProvider implements LLMProvider { /* ... */ }
// -> permet de changer de provider sans toucher au reste du code
```

## Livrables attendus
- Une solution concrète et fonctionnelle pour « intégration llm (openai, gemini, claude, mistral) », adaptée au projet en cours
- Une explication claire des choix effectués et de leurs compromis
- La liste des points de vigilance ou suites possibles, le cas échéant
