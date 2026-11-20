self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil((async () => {
    const scope = self.registration.scope
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const existing = windows.find((client) => client.url.startsWith(scope))
    if (existing) return existing.focus()
    return self.clients.openWindow(scope)
  })())
})
