// Vrylive Famille: service worker mínimo.
// No guarda datos de las familias. Solo muestra un mensaje si no hay internet.
const OFFLINE = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Vrylive</title>
<style>body{font:20px/1.5 system-ui,sans-serif;background:#F1F0F7;color:#241B3F;margin:0;padding:32px 22px}h1{font-size:1.5rem}p{margin:12px 0}</style></head>
<body><h1>Vrylive Famille</h1>
<p lang="fr">Pas de connexion Internet. Vérifiez le réseau, puis rouvrez l'application.</p>
<p lang="es">Sin conexión a Internet. Revise la red y vuelva a abrir la aplicación.</p>
<p lang="en">No Internet connection. Check your network, then open the app again.</p>
<p lang="fr">En cas d'urgence, composez le 911.</p></body></html>`;
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  if (e.request.mode !== 'navigate') return;
  e.respondWith(fetch(e.request).catch(() => new Response(OFFLINE, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })));
});
