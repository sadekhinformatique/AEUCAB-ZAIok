---
name: validation-serveur
description: Utiliser cette skill pour : Garantir que toute validation critique est refaite côté serveur, indépendamment du frontend. S'applique aux projets web/mobile (catégorie « Sécurité » du pack Web Master AI, stack type Next.js, React Native, Supabase, Django, Electron). Déclencher dès qu'une tâche touche à « validation serveur ».
---

# Validation serveur

**Catégorie :** 06. Sécurité — Pack *Web Master AI*

## Objectif
Garantir que toute validation critique est refaite côté serveur, indépendamment du frontend.

## Quand déclencher cette skill
- L'utilisateur demande explicitement de travailler sur « validation serveur »
- La tâche en cours implique garantir que toute validation critique est refaite côté serveur, indépendamment du frontend
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

**Validation avec Zod (Node/TypeScript) :**
```ts
import { z } from 'zod';

const createUserSchema = z.object({
  email: z.string().email(),
  age: z.number().int().min(13).max(120),
});

app.post('/users', (req, res) => {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ errors: parsed.error.flatten() });
  }
  // parsed.data est fiable, l'utiliser pour la suite
});
```

**Validation avec Pydantic (FastAPI) :**
```python
from pydantic import BaseModel, EmailStr, conint

class CreateUser(BaseModel):
    email: EmailStr
    age: conint(ge=13, le=120)

@app.post("/users")
def create_user(payload: CreateUser):
    ...
```

## Livrables attendus
- Une solution concrète et fonctionnelle pour « validation serveur », adaptée au projet en cours
- Une explication claire des choix effectués et de leurs compromis
- La liste des points de vigilance ou suites possibles, le cas échéant
