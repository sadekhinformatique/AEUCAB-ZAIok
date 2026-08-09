---
name: audit-securite
description: Utiliser cette skill pour : Réaliser un audit de sécurité structuré d'une application existante et produire un rapport priorisé. S'applique aux projets web/mobile (catégorie « Sécurité » du pack Web Master AI, stack type Next.js, React Native, Supabase, Django, Electron). Déclencher dès qu'une tâche touche à « audit de sécurité ».
---

# Audit de sécurité

**Catégorie :** 06. Sécurité — Pack *Web Master AI*

## Objectif
Réaliser un audit de sécurité structuré d'une application existante et produire un rapport priorisé.

## Quand déclencher cette skill
- L'utilisateur demande explicitement de travailler sur « audit de sécurité »
- La tâche en cours implique réaliser un audit de sécurité structuré d'une application existante et produire un rapport priorisé
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

**Trame de rapport d'audit à produire :**
```markdown
## Résumé exécutif
- X vulnérabilités critiques, Y moyennes, Z faibles

## Constats détaillés
### [CRITIQUE] IDOR sur /api/invoices/:id
- Preuve : requête avec un ID d'une autre organisation retourne 200
- Impact : fuite de données financières entre clients
- Correction : filtrer par owner_id/org_id (voir skill `idor`)

## Recommandations priorisées
1. ...
2. ...
```

**Outils utiles pour dégrossir automatiquement :**
```bash
npm audit --production
pip install pip-audit && pip-audit
```

## Livrables attendus
- Une solution concrète et fonctionnelle pour « audit de sécurité », adaptée au projet en cours
- Une explication claire des choix effectués et de leurs compromis
- La liste des points de vigilance ou suites possibles, le cas échéant
