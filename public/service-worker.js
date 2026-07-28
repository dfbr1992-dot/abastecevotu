self.addEventListener('push', function(event) {
  const data = event.data.json();
  console.log('Push received:', data);

  const title = data.notification.title || 'Notificação';
  const options = {
    body: data.notification.body || 'Você tem uma nova notificação.',
    icon: '/abastece.png', // Substitua pelo caminho do seu ícone
    badge: '/abastece.png', // Substitua pelo caminho do seu badge
    data: {
      url: data.data.url || '/', // URL para abrir ao clicar na notificação
      posto_id: data.data.posto_id,
      combustivel: data.data.combustivel,
      valor: data.data.valor,
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  const urlToOpen = event.notification.data.url;

  event.waitUntil(
    clients.openWindow(urlToOpen)
  );
});

self.addEventListener('install', function(event) {
  console.log('Service Worker installing.');
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  console.log('Service Worker activating.');
  event.waitUntil(clients.claim());
});
