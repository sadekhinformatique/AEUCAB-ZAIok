---
name: billing
description: Utiliser cette skill pour : Intégrer la facturation récurrente (Stripe Billing ou équivalent) avec gestion des échecs de paiement. S'applique aux projets web/mobile (catégorie « SaaS » du pack Web Master AI, stack type Next.js, React Native, Supabase, Django, Electron). Déclencher dès qu'une tâche touche à « billing ».
---

# Billing

**Catégorie :** 13. SaaS — Pack *Web Master AI*

## Objectif
Intégrer la facturation récurrente (stripe billing ou équivalent) avec gestion des échecs de paiement.

## Quand déclencher cette skill
- L'utilisateur demande explicitement de travailler sur « billing »
- La tâche en cours implique intégrer la facturation récurrente (stripe billing ou équivalent) avec gestion des échecs de paiement
- Un fichier, un module ou une fonctionnalité du projet touche directement ce sujet
- Une revue de code, un audit ou une nouvelle fonctionnalité en dépend

## Checklist / bonnes pratiques
- Clarifier le modèle de tarification avant de coder la billing
- Séparer strictement les données entre organisations/clients
- Gérer proprement les changements de plan (upgrade/downgrade/annulation)
- Prévoir des quotas vérifiés côté serveur, pas seulement affichés côté client
- Soigner l'onboarding : premier succès rapide pour le nouvel utilisateur
- Prévoir des métriques dès le début (activation, rétention, usage)

## Démarche recommandée
1. Clarifier le besoin exact et le contexte du projet (stack, contraintes, existant)
2. Identifier les options possibles et choisir la plus adaptée au contexte (pas la plus complexe)
3. Mettre en œuvre par petites étapes vérifiables
4. Vérifier le résultat par rapport à la checklist ci-dessus
5. Signaler explicitement les limites, risques ou points restant à valider

## Livrables attendus
- Une solution concrète et fonctionnelle pour « billing », adaptée au projet en cours
- Une explication claire des choix effectués et de leurs compromis
- La liste des points de vigilance ou suites possibles, le cas échéant
