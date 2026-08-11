/**
 * SGIAU — Politique de mot de passe (partagée client/serveur).
 *
 * Module pur, sans dépendance serveur : utilisable aussi bien dans les
 * routes API (validation côté serveur) que dans les formulaires (retours
 * immédiats côté client).
 */

export const PASSWORD_POLICY = {
  minLength: 8,
  requireUpper: true,
  requireLower: true,
  requireDigit: true,
  requireSpecial: true,
} as const

/** Retourne un message d'erreur si le mot de passe ne respecte pas la politique, sinon null. */
export function passwordError(pw: string): string | null {
  if (!pw) return "Le mot de passe est requis."
  if (pw.length < PASSWORD_POLICY.minLength) {
    return `Le mot de passe doit contenir au moins ${PASSWORD_POLICY.minLength} caractères.`
  }
  if (PASSWORD_POLICY.requireUpper && !/[A-Z]/.test(pw)) {
    return "Le mot de passe doit contenir au moins une lettre majuscule."
  }
  if (PASSWORD_POLICY.requireLower && !/[a-z]/.test(pw)) {
    return "Le mot de passe doit contenir au moins une lettre minuscule."
  }
  if (PASSWORD_POLICY.requireDigit && !/[0-9]/.test(pw)) {
    return "Le mot de passe doit contenir au moins un chiffre."
  }
  if (PASSWORD_POLICY.requireSpecial && !/[^A-Za-z0-9]/.test(pw)) {
    return "Le mot de passe doit contenir au moins un caractère spécial (!@#$%…)."
  }
  return null
}

/** Résumé lisible de la politique, pour les libellés d'aide des formulaires. */
export function passwordPolicyHint(): string {
  return `Au moins ${PASSWORD_POLICY.minLength} caractères, une majuscule, une minuscule, un chiffre et un caractère spécial.`
}
