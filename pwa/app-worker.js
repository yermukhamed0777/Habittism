importScripts('./reminder-worker.js')

const cachePrefix = `habittism-shell:${self.registration.scope}:`
const cacheName = cachePrefix + shellVersion
const shellUrl = self.registration.scope
const shellPaths = new Set(shellAssets.map((path) => new URL(path, shellUrl).href))

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(cacheName).then((cache) => cache.addAll([...shellPaths])))
})

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const previous = await caches.keys()
    await Promise.all(previous.filter((name) => name.startsWith(cachePrefix) && name !== cacheName)
      .map((name) => caches.delete(name)))
    await self.clients.claim()
  })())
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  const isShell = request.mode === 'navigate' &&
    (url.origin + url.pathname === shellUrl || url.origin + url.pathname === `${shellUrl}index.html`)

  if (isShell) {
    event.respondWith(fetch(request).catch(() => caches.match(shellUrl, { cacheName })))
  } else if (shellPaths.has(url.href)) {
    event.respondWith(caches.match(url.href, { cacheName, ignoreVary: true }).then((cached) => cached ?? fetch(request)))
  }
})
