// Service worker: network-first (so updates reach the phone), cache fallback for offline play.
// Keep CACHE in sync with G.VERSION in js/main.js.
const CACHE = 'pip-quest-v10';
const ASSETS = [
  './', './index.html', './css/style.css', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png', './vendor/three.module.min.js',
  './js/data/tiles.js', './js/data/save.js', './js/data/settings.js', './js/data/levels.js',
  './js/engine/renderer.js', './js/engine/text.js', './js/engine/input.js', './js/engine/audio.js',
  './js/engine/physics.js', './js/engine/sprites.js', './js/engine/backgrounds.js', './js/engine/render3d.js',
  './js/game/entities.js', './js/game/player.js', './js/game/enemies.js', './js/game/mount.js', './js/game/hud.js',
  './js/game/level.js', './js/game/worldmap.js', './js/main.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    // no-cache: always revalidate with the server, so GitHub Pages' 10-minute HTTP cache can't serve old files
    fetch(e.request, { cache: 'no-cache' }).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match(e.request).then((hit) => hit || caches.match('./index.html')))
  );
});
