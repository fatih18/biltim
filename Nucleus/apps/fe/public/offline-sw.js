/*
 * Biltim 5S service worker: lets the audit form open with no connection.
 *
 * Why (7 Oct mail): on an iPad without network Safari answered "iPad'iniz
 * internete bağlı olmadığı için sayfa açılamıyor". The form already queues a
 * submission offline (IndexedDB) and sends it when the connection returns —
 * but the page itself could not be loaded, so none of that was reachable.
 *
 *   pages           network first; the last good copy when offline
 *   /_next/static   cache first — file names carry a content hash
 *   images, fonts   stale-while-revalidate — same name, content may change
 *   everything else (API, reports, files, server actions): not touched
 *
 * Browsers run service workers only in a secure context: HTTPS, or localhost.
 * Served over plain http://<ip>:3000 this file is never installed — the
 * offline page needs the site on HTTPS.
 */

const VERSION = 'biltim-5s-v1'
const PAGES = `${VERSION}-pages`
const ASSETS = `${VERSION}-assets`
const MEDIA = `${VERSION}-media`

// The screens an auditor needs in the field.
const OFFLINE_PAGES = ['/denetim', '/']

const HASHED_ASSET = /^\/_next\/static\//
const OTHER_ASSET = /\.(?:woff2?|ttf|otf|png|jpe?g|gif|svg|ico|webp|avif)$/
const NEVER = /^\/(?:reports|cdn|files|biltim|api|auth)\b/
// A /_next/static path as it appears in HTML, in the inline RSC payload
// (where quotes are escaped — hence the backslash) and in CSS url(...).
const ASSET_REF = /\/_next\/static\/[^"'\s)\\]+/g

const referencedAssets = (text) => [...new Set(text.match(ASSET_REF) ?? [])]

// A stylesheet names its fonts relative to itself: url(../media/x.woff2).
function stylesheetAssets(css, cssPath) {
  const base = new URL(cssPath, self.location.origin)
  const found = []
  for (const m of css.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)) {
    try {
      const path = new URL(m[1], base).pathname
      if (HASHED_ASSET.test(path)) found.push(path)
    } catch {
      // data: URIs and the like
    }
  }
  return found
}

/*
 * Page updates and pruning run one at a time. Two navigations close together
 * could otherwise interleave: one prune lists the cache after the other page
 * was stored but before its scripts were, and deletes them.
 */
let queue = Promise.resolve()
function serial(task) {
  const run = queue.then(task, task)
  queue = run.catch(() => undefined)
  return run
}

async function fetchAssets(urls) {
  const cache = await caches.open(ASSETS)
  await Promise.all(
    urls.map((url) => cache.match(url).then((hit) => hit ?? cache.add(url).catch(() => undefined)))
  )
}

/*
 * The asset cache only ever grew. Every deploy renames every chunk, so after a
 * few releases the iPad held each build's scripts — megabytes nothing will
 * load again, counted against Safari's storage quota, the same quota the
 * offline queue's photos need. Kept: what the cached pages reference, and what
 * the kept stylesheets reference (fonts, background images). Everything else
 * in the hashed cache goes.
 */
async function pruneAssets() {
  const pages = await caches.open(PAGES)
  const assets = await caches.open(ASSETS)
  const keep = new Set()
  for (const req of await pages.keys()) {
    const res = await pages.match(req)
    if (!res) continue
    for (const path of referencedAssets(await res.text())) keep.add(path)
  }
  for (const path of [...keep]) {
    if (!path.endsWith('.css')) continue
    const css = await assets.match(path)
    if (!css) continue
    for (const ref of stylesheetAssets(await css.text(), path)) keep.add(ref)
  }
  for (const req of await assets.keys()) {
    if (!keep.has(new URL(req.url).pathname)) await assets.delete(req)
  }
}

/** A good page response: stored, its scripts fetched, the old ones dropped. */
function storePage(path, res) {
  return serial(async () => {
    const cache = await caches.open(PAGES)
    await cache.put(path, res.clone())
    // The page is useless offline without its scripts and styles.
    await fetchAssets(referencedAssets(await res.text()))
    await pruneAssets()
  })
}

async function cachePage(path) {
  try {
    const res = await fetch(path, { credentials: 'same-origin' })
    // Not signed in: the answer is the login page under another URL. Keep nothing.
    if (!res.ok || res.redirected) return
    await storePage(path, res)
  } catch {
    // Offline at install time; the pages are cached as they are visited.
  }
}

self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(Promise.all(OFFLINE_PAGES.map((p) => cachePage(p))))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      // Also drops what an earlier worker cached without pruning.
      .then(() => serial(pruneAssets).catch(() => undefined))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return
  if (NEVER.test(url.pathname)) return

  if (HASHED_ASSET.test(url.pathname)) {
    event.respondWith(
      caches.open(ASSETS).then(async (cache) => {
        const hit = await cache.match(req)
        if (hit) return hit
        const res = await fetch(req)
        if (res.ok) event.waitUntil(cache.put(req, res.clone()).catch(() => undefined))
        return res
      })
    )
    return
  }

  /*
   * A logo or an icon keeps its name when it is replaced, so cache-first would
   * show the old one for good. The cached copy answers at once (and offline);
   * the network refreshes it for next time.
   */
  if (OTHER_ASSET.test(url.pathname)) {
    event.respondWith(
      caches.open(MEDIA).then(async (cache) => {
        const hit = await cache.match(req)
        const refresh = fetch(req)
          .then(async (res) => {
            if (res.ok) await cache.put(req, res.clone())
            return res
          })
          .catch(() => undefined)
        if (hit) {
          event.waitUntil(refresh)
          return hit
        }
        return (await refresh) ?? Response.error()
      })
    )
    return
  }

  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(req)
          if (res.ok && !res.redirected) {
            // Its scripts too, so this page opens offline next time.
            event.waitUntil(storePage(url.pathname, res.clone()).catch(() => undefined))
          }
          return res
        } catch {
          const cache = await caches.open(PAGES)
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
