---
name: csrf
description: Utiliser cette skill pour : Protéger les actions sensibles contre le CSRF (tokens, SameSite cookies, vérification d'origine). S'applique aux projets web/mobile (catégorie « Sécurité » du pack Web Master AI, stack type Next.js, React Native, Supabase, Django, Electron). Déclencher dès qu'une tâche touche à « protection csrf ».
---

# Protection CSRF

**Catégorie :** 06. Sécurité — Pack *Web Master AI*

## Objectif
Protéger les actions sensibles contre le csrf (tokens, samesite cookies, vérification d'origine).

## Quand déclencher cette skill
- L'utilisateur demande explicitement de travailler sur « protection csrf »
- La tâche en cours implique protéger les actions sensibles contre le csrf (tokens, samesite cookies, vérification d'origine)
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

**Cookie de session en SameSite strict (Express) :**
```js
app.use(session({
  secret: process.env.SESSION_SECRET,
  cookie: { httpOnly: true, secure: true, sameSite: 'strict' },
}));
```

**Vérification d'un token CSRF côté serveur (Django, activé par défaut) :**
```python
# settings.py
MIDDLEWARE = [..., 'django.middleware.csrf.CsrfViewMiddleware', ...]
```
```html
<!-- template -->
<form method="post">
  {% csrf_token %}
  ...
</form>
```

**API stateless (JWT en header) : le CSRF classique ne s'applique pas si le
token n'est PAS stocké dans un cookie envoyé automatiquement — mais vérifier
quand même l'origine des requêtes sensibles (header `Origin`/`Referer`).**

## Livrables attendus
- Une solution concrète et fonctionnelle pour « protection csrf », adaptée au projet en cours
- Une explication claire des choix effectués et de leurs compromis
- La liste des points de vigilance ou suites possibles, le cas échéant
