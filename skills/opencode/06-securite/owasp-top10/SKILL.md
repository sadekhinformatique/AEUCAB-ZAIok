---
name: owasp-top10
description: Utiliser cette skill pour : Auditer une application par rapport aux risques de l'OWASP Top 10 et proposer des corrections priorisées. S'applique aux projets web/mobile (catégorie « Sécurité » du pack Web Master AI, stack type Next.js, React Native, Supabase, Django, Electron). Déclencher dès qu'une tâche touche à « owasp top 10 ».
---

# OWASP Top 10

**Catégorie :** 06. Sécurité — Pack *Web Master AI*

## Objectif
Auditer une application par rapport aux risques de l'owasp top 10 et proposer des corrections priorisées.

## Quand déclencher cette skill
- L'utilisateur demande explicitement de travailler sur « owasp top 10 »
- La tâche en cours implique auditer une application par rapport aux risques de l'owasp top 10 et proposer des corrections priorisées
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

**Grille de passage rapide OWASP Top 10 (2021) à utiliser en audit :**
```markdown
A01 Broken Access Control      -> voir skills idor / controle-acces
A02 Cryptographic Failures     -> secrets en clair ? HTTPS partout ?
A03 Injection                  -> voir skill injection-sql / xss
A04 Insecure Design            -> revue de l'architecture / cahier des charges
A05 Security Misconfiguration  -> headers, CORS, mode debug en prod ?
A06 Vulnerable Components      -> npm audit / pip-audit
A07 Auth Failures              -> voir skill authentification / jwt
A08 Data Integrity Failures    -> validation, signatures, webhooks
A09 Logging & Monitoring       -> voir skill monitoring-logs
A10 SSRF                       -> voir skill ssrf
```

## Livrables attendus
- Une solution concrète et fonctionnelle pour « owasp top 10 », adaptée au projet en cours
- Une explication claire des choix effectués et de leurs compromis
- La liste des points de vigilance ou suites possibles, le cas échéant
