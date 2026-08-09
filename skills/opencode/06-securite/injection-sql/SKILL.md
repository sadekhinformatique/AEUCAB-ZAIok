---
name: injection-sql
description: Utiliser cette skill pour : Détecter et corriger les risques d'injection SQL en imposant requêtes préparées et validation stricte. S'applique aux projets web/mobile (catégorie « Sécurité » du pack Web Master AI, stack type Next.js, React Native, Supabase, Django, Electron). Déclencher dès qu'une tâche touche à « injection sql ».
---

# Injection SQL

**Catégorie :** 06. Sécurité — Pack *Web Master AI*

## Objectif
Détecter et corriger les risques d'injection sql en imposant requêtes préparées et validation stricte.

## Quand déclencher cette skill
- L'utilisateur demande explicitement de travailler sur « injection sql »
- La tâche en cours implique détecter et corriger les risques d'injection sql en imposant requêtes préparées et validation stricte
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

**Mauvais — concaténation de chaînes :**
```js
// DANGER : injection SQL possible
const query = `SELECT * FROM users WHERE email = '${email}'`;
```

**Correct — requête préparée (Node/pg) :**
```js
const { rows } = await pool.query(
  'SELECT * FROM users WHERE email = $1',
  [email]
);
```

**Correct — via ORM (Prisma) :**
```ts
const user = await prisma.user.findUnique({ where: { email } });
```

**Correct — Django ORM (paramétrage automatique) :**
```python
User.objects.filter(email=email)  # jamais de f-string dans du SQL brut
```

## Livrables attendus
- Une solution concrète et fonctionnelle pour « injection sql », adaptée au projet en cours
- Une explication claire des choix effectués et de leurs compromis
- La liste des points de vigilance ou suites possibles, le cas échéant
