/* The generated app's service worker (the platform's) — Web Push: it receives the notification and opens/focuses the app on a click.
   Mínimo de propósito (sem cache/offline) — o objetivo é só o push. Escopo raiz (/) por ficar em /sw.js. */
self.addEventListener("push", (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch (_e) { d = { body: event.data && event.data.text() }; }
  const title = d.title || "Notificação";
  const options = {
    body: d.body || "",
    data: { link: d.link || "/" },
    tag: d.tag,                       // it collapses notifications on the same topic
    icon: d.icon || "/icon.svg",
    badge: d.badge || "/icon.svg",
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = (event.notification.data && event.notification.data.link) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if ("focus" in w) { try { w.navigate(link); } catch (_e) { /* cross-origin */ } return w.focus(); }
      }
      if (self.clients.openWindow) return self.clients.openWindow(link);
    })
  );
});
