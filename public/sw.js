/* SGIAU — Service worker de l'application mobile des membres (PWA)
 * Stratégies :
 *  - pages / coquille : cache d'abord, revalidation en arrière-plan (stale-while-revalidate)
 *  - API GET : réseau d'abord, repli cache (données fraîches en ligne, lecture hors-ligne)
 *  - navigation hors-ligne : repli sur /espace-membre
 */
const CACHE = "sgiau-member-v1"
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

self.addEventListener("fetch", (event) => {
  const { request } = event
  if (request.method !== "GET") return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // API GET : réseau d'abord, cache en secours (hors-ligne)
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const clone = res.clone()
          caches.open(CACHE).then((cache) => cache.put(request, clone))
          return res
        })
        .catch(() => caches.match(request))
    )
    return
  }

  // Pages et fichiers statiques : cache d'abord + revalidation en arrière-plan
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((res) => {
          if (res && res.ok) {
            const clone = res.clone()
            caches.open(CACHE).then((cache) => cache.put(request, clone))
          }
          return res
        })
        .catch(() => cached)

      if (cached) {
        network // revalidation silencieuse
        return cached
      }
      if (request.mode === "navigate") {
        // Hors-ligne : rediriger vers l'application membre en cache
        return network.catch(() => caches.match("/espace-membre"))
      }
      return network
    })
  )
})
