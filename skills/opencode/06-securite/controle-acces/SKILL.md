---
name: controle-acces
description: Utiliser cette skill pour : Vérifier que chaque endpoint applique un contrôle d'accès correct selon le rôle et le propriétaire de la ressource. S'applique aux projets web/mobile (catégorie « Sécurité » du pack Web Master AI, stack type Next.js, React Native, Supabase, Django, Electron). Déclencher dès qu'une tâche touche à « contrôle d'accès ».
---

# Contrôle d'accès

**Catégorie :** 06. Sécurité — Pack *Web Master AI*

## Objectif
Vérifier que chaque endpoint applique un contrôle d'accès correct selon le rôle et le propriétaire de la ressource.

## Quand déclencher cette skill
- L'utilisateur demande explicitement de travailler sur « contrôle d'accès »
- La tâche en cours implique vérifier que chaque endpoint applique un contrôle d'accès correct selon le rôle et le propriétaire de la ressource
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

**Middleware de contrôle d'accès par rôle (Express) :**
```js
function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Accès refusé' });
    }
    next();
  };
}

app.delete('/users/:id', auth, requireRole('admin'), deleteUser);
```

**Contrôle d'accès au niveau ligne avec Supabase RLS (SQL) :**
```sql
alter table invoices enable row level security;

create policy "Users can only see their own invoices"
on invoices for select
using (auth.uid() = owner_id);
```

## Livrables attendus
- Une solution concrète et fonctionnelle pour « contrôle d'accès », adaptée au projet en cours
- Une explication claire des choix effectués et de leurs compromis
- La liste des points de vigilance ou suites possibles, le cas échéant
