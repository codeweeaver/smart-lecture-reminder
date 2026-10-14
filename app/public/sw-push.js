self.addEventListener('push', (event) => {
  if (!event.data) return
  const data = event.data.json()
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      data: { lectureId: data.lectureId, meetingWebUrl: data.meetingWebUrl },
      actions: data.meetingWebUrl
        ? [{ action: 'join', title: 'Join Zoom' }]
        : [],
      requireInteraction: false,
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  if (event.action === 'join' && event.notification.data?.meetingWebUrl) {
    event.waitUntil(clients.openWindow(event.notification.data.meetingWebUrl))
  } else {
    const url = event.notification.data?.lectureId
      ? '/calendar?lectureId=' + event.notification.data.lectureId
      : '/'
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
        for (const client of clientList) {
          if ('navigate' in client) return client.navigate(url).then(c => c && c.focus())
        }
        return clients.openWindow(url)
      })
    )
  }
})
