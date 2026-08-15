/* SGIAU — Service worker de l'application mobile des membres (PWA)
 *
 * v2 — corrige l'erreur « Application error: a client-side exception » qui
 * apparaissait après chaque redéploiement sur Vercel :
 *
 *   v1 interceptait TOUTES les requêtes same-origin — y compris /_next/static/* —
 *   avec une stratégie cache-first. Après un déploiement, le HTML en cache
 *   (ancien build) référençait d'anciens chunks supprimés du serveur → 404 →
 *   crash JS au chargement de l'application.
 *
 *   v2 :
 *   - /_next/* (assets hashed et immuables) : NON interceptés — le cache HTTP
 *     du navigateur (immutable) suffit, aucun risque de chunk périmé.
 *   - Navigation (pages HTML) : réseau d'abord, cache en secours (hors-ligne).
 *     On ne sert JAMAIS une page périmée quand on est en ligne.
 *   - API GET : réseau d'abord, repli cache (fraîches en ligne, lecture hors-ligne).
 *   - Autres fichiers statiques (logo, icônes) : réseau d'abord, repli cache.
 *
 * Le numéro de version du cache (v2) purge automatiquement l'ancien cache v1
 * empoisonné lors de l'activation.
 */
const CACHE = "sgiau-member-v2"
const SHELL = [
  "/espace-membre",
  "/login",
  "/change-password",
  "/logo-aeucab.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

// Réseau d'abord, cache en secours : sert la réponse fraîche quand on est en
// ligne (et la met en cache pour le hors-ligne suivant) ; ne sert le cache que
// si le réseau échoue. Pour une navigation sans cache, repli sur l'app membre.
async function networkFirst(request) {
  const cache = await caches.open(CACHE)
  try {
    const res = await fetch(request)
    if (res && res.ok) cache.put(request, res.clone())
    return res
  } catch {
    if (request.mode === "navigate") {
      return (await cache.match(request)) || (await caches.match("/espace-membre")) || Response.error()
    }
    return (await cache.match(request)) || Response.error()
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event
  if (request.method !== "GET") return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // Assets de build Next.js : contenu-hashed et immuables → ne jamais les
  // intercepter (voir l'en-tête du fichier pour l'explication du crash v1).
  if (url.pathname.startsWith("/_next/")) return

  event.respondWith(networkFirst(request))
})
