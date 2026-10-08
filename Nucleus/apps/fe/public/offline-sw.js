/*
 * Biltim 5S service worker: lets the audit form open with no connection.
 *
 * Why (7 Oct mail): on an iPad without network Safari answered "iPad'iniz
 * internete bağlı olmadığı için sayfa açılamıyor". The form already queues a
 * submission offline (IndexedDB) and sends it when the connection returns —
 * but the page itself could not be loaded, so none of that was reachable.
 *
 *   pages        network first; the last good copy when offline
 *   /_next/static  cache first — file names carry a content hash
 *   everything else (API, reports, files, server actions): not touched
 *
 * Browsers run service workers only in a secure context: HTTPS, or localhost.
 * Served over plain http://<ip>:3000 this file is never installed — the
 * offline page needs the site on HTTPS.
 */

const VERSION = 'biltim-5s-v1'
const PAGES = `${VERSION}-pages`
const ASSETS = `${VERSION}-assets`

// The screens an auditor needs in the field.
const OFFLINE_PAGES = ['/denetim', '/']

const STATIC_ASSET = /^\/_next\/static\/|\.(?:woff2?|png|jpe?g|svg|ico|webp)$/
const NEVER = /^\/(?:reports|cdn|files|biltim|api|auth)\b/

async function cachePage(cache, path) {
  try {
    const res = await fetch(path, { credentials: 'same-origin' })
    // Not signed in: the answer is the login page under another URL. Keep nothing.
    if (!res.ok || res.redirected) return
    await cache.put(path, res.clone())
    // The page is useless offline without its scripts and styles.
    const html = await res.text()
    const assets = [...new Set(html.match(/\/_next\/static\/[^"'\s)\\]+/g) ?? [])]
    const assetCache = await caches.open(ASSETS)
    await Promise.all(
      assets.map((url) =>
        assetCache.match(url).then((hit) => hit ?? assetCache.add(url).catch(() => undefined))
      )
    )
  } catch {
    // Offline at install time; the pages are cached as they are visited.
  }
}

self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(caches.open(PAGES).then((cache) => Promise.all(OFFLINE_PAGES.map((p) => cachePage(cache, p)))))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return
  if (NEVER.test(url.pathname)) return

  if (STATIC_ASSET.test(url.pathname)) {
    event.respondWith(
      caches.open(ASSETS).then(async (cache) => {
        const hit = await cache.match(req)
        if (hit) return hit
        const res = await fetch(req)
        if (res.ok) cache.put(req, res.clone())
        return res
      })
    )
    return
  }

  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(PAGES)
        try {
          const res = await fetch(req)
          if (res.ok && !res.redirected) {
            cache.put(url.pathname, res.clone())
            // Its scripts too, so this page opens offline next time.
            res
              .clone()
              .text()
              .then((html) => {
                const assets = [...new Set(html.match(/\/_next\/static\/[^"'\s)\\]+/g) ?? [])]
                return caches
                  .open(ASSETS)
                  .then((ac) =>
                    Promise.all(
                      assets.map((a) => ac.match(a).then((hit) => hit ?? ac.add(a).catch(() => undefined)))
                    )
                  )
              })
              .catch(() => undefined)
          }
          return res
        } catch {
          const copy = (await cache.match(url.pathname)) ?? (await cache.match('/denetim'))
          if (copy) return copy
          return new Response(
            '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
              '<title>Biltim 5S</title><body style="font-family:system-ui;padding:24px">' +
              '<h1 style="font-size:18px">İnternet bağlantısı yok</h1>' +
              '<p>Bu sayfa daha önce bu cihazda açılmadığı için çevrimdışı gösterilemiyor. ' +
              'Denetim formunu internet varken bir kez açın; sonrasında bağlantı olmadan da açılır.</p></body>',
            { status: 503, headers: { 'content-type': 'text/html; charset=utf-8' } }
          )
        }
      })()
    )
  }
})
