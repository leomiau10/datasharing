// Shared headless loader: stubs DOM/canvas and loads all game scripts into a vm sandbox.
const fs = require('fs'), path = require('path'), vm = require('vm');
function noop() {}
function ctx() {
  const base = { measureText: () => ({ width: 10 }), createLinearGradient: () => ({ addColorStop: noop }) };
  return new Proxy(base, { get: (t, p) => (p in t ? t[p] : noop), set: () => true });
}
function canvas() {
  return { width: 0, height: 0, style: {}, getContext: ctx, addEventListener: noop, classList: { add: noop, remove: noop, toggle: noop },
    setAttribute: noop, getAttribute: () => null, querySelectorAll: () => [], querySelector: () => null };
}
function load() {
  const s = {}; s.window = s; s.self = s; s.console = console; s.Math = Math; s.Date = Date; s.JSON = JSON;
  s.setInterval = () => 0; s.clearInterval = noop; s.setTimeout = () => 0; s.clearTimeout = noop;
  s.requestAnimationFrame = () => 0; s.innerWidth = 844; s.innerHeight = 390; s.devicePixelRatio = 3; s.navigator = {};
  const mem = {};
  s.localStorage = { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = '' + v; }, removeItem: (k) => { delete mem[k]; } };
  s.addEventListener = noop; s.removeEventListener = noop; s.AudioContext = undefined;
  const els = {};
  s.document = { readyState: 'complete', createElement: canvas, getElementById: (id) => (els[id] || (els[id] = canvas())), addEventListener: noop, querySelectorAll: () => [] };
  vm.createContext(s);
  ['js/data/tiles.js', 'js/data/save.js', 'js/engine/renderer.js', 'js/engine/text.js', 'js/engine/input.js', 'js/engine/audio.js',
    'js/engine/physics.js', 'js/engine/sprites.js', 'js/engine/backgrounds.js', 'js/data/levels.js', 'js/game/entities.js',
    'js/game/player.js', 'js/game/enemies.js', 'js/game/hud.js', 'js/game/level.js', 'js/game/worldmap.js', 'js/main.js']
    .forEach((f) => vm.runInContext(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), s, { filename: f }));
  return s.GAME;
}
module.exports = { load };
