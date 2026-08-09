---
name: coupons-promotions
description: Utiliser cette skill pour : Implémenter un système de coupons/réductions avec règles d'usage claires et vérifiables côté serveur. S'applique aux projets web/mobile (catégorie « E-commerce » du pack Web Master AI, stack type Next.js, React Native, Supabase, Django, Electron). Déclencher dès qu'une tâche touche à « coupons & promotions ».
---

# Coupons & promotions

**Catégorie :** 12. E-commerce — Pack *Web Master AI*

## Objectif
Implémenter un système de coupons/réductions avec règles d'usage claires et vérifiables côté serveur.

## Quand déclencher cette skill
- L'utilisateur demande explicitement de travailler sur « coupons & promotions »
- La tâche en cours implique implémenter un système de coupons/réductions avec règles d'usage claires et vérifiables côté serveur
- Un fichier, un module ou une fonctionnalité du projet touche directement ce sujet
- Une revue de code, un audit ou une nouvelle fonctionnalité en dépend

## Checklist / bonnes pratiques
- Sécuriser tout le tunnel d'achat, en particulier le paiement
- Ne jamais faire confiance au prix envoyé par le client : recalculer côté serveur
- Gérer les stocks de façon cohérente même en cas d'accès concurrents
- Prévoir les cas d'échec de paiement, d'annulation et de remboursement
- Garder une trace claire de chaque commande et de ses changements de statut
- Rendre le tunnel d'achat le plus court possible sans sacrifier la sécurité

## Démarche recommandée
1. Clarifier le besoin exact et le contexte du projet (stack, contraintes, existant)
2. Identifier les options possibles et choisir la plus adaptée au contexte (pas la plus complexe)
3. Mettre en œuvre par petites étapes vérifiables
4. Vérifier le résultat par rapport à la checklist ci-dessus
5. Signaler explicitement les limites, risques ou points restant à valider

## Livrables attendus
- Une solution concrète et fonctionnelle pour « coupons & promotions », adaptée au projet en cours
- Une explication claire des choix effectués et de leurs compromis
- La liste des points de vigilance ou suites possibles, le cas échéant
