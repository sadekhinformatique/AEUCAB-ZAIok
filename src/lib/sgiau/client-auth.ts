/**
 * SGIAU — aide client pour les statuts d'authentification.
 *
 * Le middleware renvoie :
 *  - 401 quand la session est absente, expirée ou invalide ;
 *  - 403 (code PASSWORD_CHANGE_REQUIRED) quand la session est en attente de
 *    changement de mot de passe (mcp) — compte avec mot de passe temporaire.
 *
 * Ces deux cas imposent une redirection immédiate de l'application.
 */

export function redirectOnAuthStatus(res: { status: number }): boolean {
  if (res.status === 401) {
    window.location.assign("/login")
    return true
  }
  if (res.status === 403) {
    window.location.assign("/change-password")
    return true
  }
  return false
}
