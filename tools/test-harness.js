// Headless smoke test: stubs DOM/canvas, loads all modules, drives the game
// through every scene and many ticks to catch runtime errors.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function makeCtx() {
  const noop = () => {};
  return {
    fillStyle: '#000', strokeStyle: '#000', lineWidth: 1, imageSmoothingEnabled: false,
    fillRect: noop, strokeRect: noop, clearRect: noop, drawImage: noop,
    save: noop, restore: noop, translate: noop, scale: noop, rotate: noop,
    beginPath: noop, moveTo: noop, lineTo: noop, closePath: noop, stroke: noop,
    fill: noop, arc: noop, setLineDash: noop, fillText: noop, measureText: () => ({ width: 10 })
  };
}
function makeCanvas() {
  return {
    width: 0, height: 0, style: {},
    getContext: () => makeCtx(),
    addEventListener: () => {},
    classList: { add() {}, remove() {} },
    setAttribute() {}, getAttribute() { return null; },
    querySelectorAll: () => []
  };
}

const elById = {};
function fakeEl() {
  return {
    style: {}, textContent: '',
    addEventListener() {}, setAttribute() {}, getAttribute() { return null; },
    classList: { add() {}, remove() {} }, querySelectorAll: () => []
  };
}

const sandbox = {};
sandbox.window = sandbox;
sandbox.self = sandbox;
sandbox.console = console;
sandbox.Math = Math;
sandbox.Date = Date;
sandbox.JSON = JSON;
sandbox.setInterval = () => 0;
sandbox.clearInterval = () => {};
sandbox.setTimeout = () => 0;
sandbox.clearTimeout = () => {};
sandbox.requestAnimationFrame = () => 0; // do not auto-loop
sandbox.innerWidth = 800;
sandbox.innerHeight = 450;
sandbox.navigator = {};
sandbox.localStorage = (() => {
  const m = {};
  return { getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: (k) => { delete m[k]; } };
})();
sandbox.addEventListener = () => {};
sandbox.removeEventListener = () => {};
sandbox.AudioContext = undefined; // keeps audio a no-op
sandbox.document = {
  readyState: 'complete',
  createElement: (t) => makeCanvas(),
  getElementById: (id) => (elById[id] || (elById[id] = (id === 'game' ? makeCanvas() : fakeEl()))),
  addEventListener: () => {},
  querySelectorAll: () => []
};

vm.createContext(sandbox);

const files = [
  'js/data/tiles.js', 'js/data/save.js',
  'js/engine/renderer.js', 'js/engine/text.js', 'js/engine/input.js',
  'js/engine/audio.js', 'js/engine/physics.js', 'js/engine/sprites.js',
  'js/data/levels.js',
  'js/game/entities.js', 'js/game/player.js', 'js/game/enemies.js',
  'js/game/hud.js', 'js/game/level.js', 'js/game/worldmap.js', 'js/main.js'
];

for (const f of files) {
  const code = fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
  vm.runInContext(code, sandbox, { filename: f });
}

const G = sandbox.GAME;
const game = G.game;
if (!game) throw new Error('game did not initialize');

const In = G.Input.state;
const tap = (k) => { G.Input.keyDown(k); G.Input.keyUp(k); };
function tick(n, setup) {
  for (let i = 0; i < n; i++) {
    if (setup) setup(i);
    game.update();
    game.render();
  }
}

// ---- TITLE -> MAP ----
game.render();
console.log('scene:', game.scene);
tap('jump');
tick(2);
console.log('after start, scene:', game.scene);
if (game.scene !== 'map') throw new Error('expected map scene');

// ---- MAP: enter level 0 ----
tap('jump');
tick(2);
console.log('after enter, scene:', game.scene, 'level:', game.levelIndex);
if (game.scene !== 'level') throw new Error('expected level scene');

const lvl = game.level;
console.log('level size tiles:', lvl.w, 'x', lvl.h, 'enemies:', lvl.enemies.length, 'items:', lvl.items.length);

// ---- Clean win flow: reach the flag, expect transition to map + unlock ----
game.level.player.x = game.level.flagX + 1;
tick(200);
console.log('after flag, scene:', game.scene, 'cleared0:', G.Save.isCleared(0));
if (game.scene !== 'map') throw new Error('expected map after clearing level 0');
if (!G.Save.isCleared(0)) throw new Error('level 0 should be marked cleared');

// ---- Re-enter and run/jump for a while (exercise physics + enemies) ----
tap('jump'); tick(2); // enter level again (now level 1's node? current still 0 unless moved)
In.right = true; In.run = true;
tick(300, (i) => { if (i % 40 === 0) G.Input.keyDown('jump'); if (i % 40 === 6) G.Input.keyUp('jump'); });
In.right = false; In.run = false; G.Input.keyUp('jump');
console.log('scene after bot run:', game.scene);

// ---- Test death path on a fresh level ----
game.startLevel(0);
game.render();
game.level.player.big = false;
game.level.hurtPlayer();
tick(200);
console.log('after death, scene:', game.scene, 'lives:', game.lives);

// ---- Test grow then enemy stomp mechanics ----
game.startLevel(1);
const l2 = game.level;
l2.player.grow();
if (l2.enemies.length) {
  const e = l2.enemies[0];
  // place player above enemy, falling
  l2.player.x = e.x; l2.player.y = e.y - l2.player.h; l2.player.vy = 4;
  l2.update(1 / 60);
}
tick(100, (i) => { In.right = true; });
In.right = false;
console.log('level2 ok, enemies left:', game.level.enemies.length);

// ---- Verify all level maps build and are rectangular-ish ----
G.Levels.forEach((L, i) => {
  if (!L.map || !L.map.length) throw new Error('level ' + i + ' empty');
  const widths = new Set(L.map.map((r) => r.length));
  console.log('level', i, 'rows', L.map.length, 'widthSet', [...widths].join(','));
});

console.log('\nALL SMOKE TESTS PASSED');
