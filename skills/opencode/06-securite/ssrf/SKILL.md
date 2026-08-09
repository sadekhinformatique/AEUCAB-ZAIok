---
name: ssrf
description: Utiliser cette skill pour : Identifier et corriger les risques de SSRF lors d'appels serveur vers des URLs fournies par l'utilisateur. S'applique aux projets web/mobile (catégorie « Sécurité » du pack Web Master AI, stack type Next.js, React Native, Supabase, Django, Electron). Déclencher dès qu'une tâche touche à « protection ssrf ».
---

# Protection SSRF

**Catégorie :** 06. Sécurité — Pack *Web Master AI*

## Objectif
Identifier et corriger les risques de ssrf lors d'appels serveur vers des urls fournies par l'utilisateur.

## Quand déclencher cette skill
- L'utilisateur demande explicitement de travailler sur « protection ssrf »
- La tâche en cours implique identifier et corriger les risques de ssrf lors d'appels serveur vers des urls fournies par l'utilisateur
- Un fichier, un module ou une fonctionnalité du projet touche directement ce sujet
- Une revue de code, un audit ou une nouvelle fonctionnalité en dépend

## Checklist / bonnes pratiques
- Ne jamais faire confiance aux entrées utilisateur, même 'internes'
- Appliquer le principe du moindre privilège partout (BDD, API, fichiers)
- Échapper/encoder les sorties selon leur contexte (HTML, SQL, URL)
- Utiliser des requêtes préparées / ORM plutôt que des chaînes concaténées
- Garder les secrets hors du code source (variables d'environnement, vault)
- Mettre à jour régulièrement les dépendances vulnérables
- Journaliser les événements sensibles sans stocker de données sensibles en clair

## Démarche recommandée
1. Clarifier le besoin exact et le contexte du projet (stack, contraintes, existant)
2. Identifier les options possibles et choisir la plus adaptée au contexte (pas la plus complexe)
3. Mettre en œuvre par petites étapes vérifiables
4. Vérifier le résultat par rapport à la checklist ci-dessus
5. Signaler explicitement les limites, risques ou points restant à valider

## Exemples concrets

**Mauvais — appel serveur vers une URL fournie par le client sans contrôle :**
```js
// DANGER : peut cibler des ressources internes (169.254.169.254, localhost, réseau privé)
const res = await fetch(req.body.url);
```

**Correct — liste blanche de domaines + résolution DNS vérifiée :**
```js
const ALLOWED_HOSTS = ['api.partner.com', 'cdn.partner.com'];

function isAllowed(urlStr) {
  const url = new URL(urlStr);
  if (!['http:', 'https:'].includes(url.protocol)) return false;
  if (!ALLOWED_HOSTS.includes(url.hostname)) return false;
  return true;
}

if (!isAllowed(req.body.url)) {
  return res.status(400).json({ error: 'URL non autorisée' });
}
```
Bloquer aussi les plages d'IP privées/loopback/metadata cloud (10.0.0.0/8,
127.0.0.0/8, 169.254.169.254...) si des redirections sont possibles.

## Livrables attendus
- Une solution concrète et fonctionnelle pour « protection ssrf », adaptée au projet en cours
- Une explication claire des choix effectués et de leurs compromis
- La liste des points de vigilance ou suites possibles, le cas échéant
