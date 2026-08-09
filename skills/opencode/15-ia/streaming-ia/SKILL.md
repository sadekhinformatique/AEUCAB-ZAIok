---
name: streaming-ia
description: Utiliser cette skill pour : Implémenter le streaming des réponses IA côté frontend/backend pour une expérience fluide. S'applique aux projets web/mobile (catégorie « IA » du pack Web Master AI, stack type Next.js, React Native, Supabase, Django, Electron). Déclencher dès qu'une tâche touche à « streaming des réponses ia ».
---

# Streaming des réponses IA

**Catégorie :** 15. IA — Pack *Web Master AI*

## Objectif
Implémenter le streaming des réponses ia côté frontend/backend pour une expérience fluide.

## Quand déclencher cette skill
- L'utilisateur demande explicitement de travailler sur « streaming des réponses ia »
- La tâche en cours implique implémenter le streaming des réponses ia côté frontend/backend pour une expérience fluide
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

**Backend (Node, streaming SSE) :**
```js
app.post('/chat', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  const stream = await anthropic.messages.stream({ model: 'claude-sonnet-4-6', messages: [...] });
  for await (const chunk of stream) {
    res.write(`data: ${JSON.stringify(chunk)}\n\n`);
  }
  res.end();
});
```

**Frontend (React, lecture du flux) :**
```jsx
const res = await fetch('/chat', { method: 'POST', body: JSON.stringify({ prompt }) });
const reader = res.body.getReader();
const decoder = new TextDecoder();
let text = '';
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  text += decoder.decode(value);
  setMessage(text); // mise à jour progressive de l'UI
}
```

## Livrables attendus
- Une solution concrète et fonctionnelle pour « streaming des réponses ia », adaptée au projet en cours
- Une explication claire des choix effectués et de leurs compromis
- La liste des points de vigilance ou suites possibles, le cas échéant
