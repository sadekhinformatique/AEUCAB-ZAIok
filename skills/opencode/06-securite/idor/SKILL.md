---
name: idor
description: Utiliser cette skill pour : Détecter et corriger les failles IDOR (accès direct à des ressources d'autrui via manipulation d'ID). S'applique aux projets web/mobile (catégorie « Sécurité » du pack Web Master AI, stack type Next.js, React Native, Supabase, Django, Electron). Déclencher dès qu'une tâche touche à « protection idor ».
---

# Protection IDOR

**Catégorie :** 06. Sécurité — Pack *Web Master AI*

## Objectif
Détecter et corriger les failles idor (accès direct à des ressources d'autrui via manipulation d'id).

## Quand déclencher cette skill
- L'utilisateur demande explicitement de travailler sur « protection idor »
- La tâche en cours implique détecter et corriger les failles idor (accès direct à des ressources d'autrui via manipulation d'id)
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

**Mauvais — accès direct à une ressource sans vérifier le propriétaire :**
```js
// DANGER : n'importe quel utilisateur connecté peut lire n'importe quelle facture
app.get('/invoices/:id', auth, async (req, res) => {
  const invoice = await Invoice.findById(req.params.id);
  res.json(invoice);
});
```

**Correct — vérification systématique de la propriété/du droit d'accès :**
```js
app.get('/invoices/:id', auth, async (req, res) => {
  const invoice = await Invoice.findOne({
    _id: req.params.id,
    ownerId: req.user.id, // ou org_id selon le modèle
  });
  if (!invoice) return res.status(404).json({ error: 'Not found' });
  res.json(invoice);
});
```
Règle générale : chaque requête sur une ressource par ID doit filtrer par
propriétaire/organisation, jamais uniquement par l'ID transmis.

## Livrables attendus
- Une solution concrète et fonctionnelle pour « protection idor », adaptée au projet en cours
- Une explication claire des choix effectués et de leurs compromis
- La liste des points de vigilance ou suites possibles, le cas échéant
