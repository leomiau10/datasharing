// Focused physics test: player must rest on solid ground and not sink/tunnel.
const fs = require('fs'), path = require('path'), vm = require('vm');
function noop() {}
function ctx() { return new Proxy({ measureText: () => ({ width: 10 }) }, { get: (t, p) => (p in t ? t[p] : noop), set: () => true }); }
function canvas() { return { width: 0, height: 0, style: {}, getContext: ctx, addEventListener: noop, classList: { add: noop, remove: noop }, setAttribute: noop, getAttribute: () => null, querySelectorAll: () => [] }; }
const s = {}; s.window = s; s.self = s; s.console = console; s.Math = Math; s.Date = Date; s.JSON = JSON;
s.setInterval = () => 0; s.clearInterval = noop; s.setTimeout = () => 0; s.clearTimeout = noop;
s.requestAnimationFrame = () => 0; s.innerWidth = 800; s.innerHeight = 450; s.navigator = {};
const mem = {}; s.localStorage = { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = '' + v; }, removeItem: (k) => { delete mem[k]; } };
s.addEventListener = noop; s.removeEventListener = noop; s.AudioContext = undefined;
const els = {}; s.document = { readyState: 'complete', createElement: canvas, getElementById: (id) => (els[id] || (els[id] = canvas())), addEventListener: noop, querySelectorAll: () => [] };
vm.createContext(s);
['js/data/tiles.js', 'js/data/save.js', 'js/engine/renderer.js', 'js/engine/text.js', 'js/engine/input.js', 'js/engine/audio.js', 'js/engine/physics.js', 'js/engine/sprites.js', 'js/data/levels.js', 'js/game/entities.js', 'js/game/player.js', 'js/game/enemies.js', 'js/game/hud.js', 'js/game/level.js', 'js/game/worldmap.js', 'js/main.js'].forEach((f) => vm.runInContext(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), s, { filename: f }));

const G = s.GAME;
// Build a simple flat level: 14 rows, ground at row 12/13, player start col 2.
const flat = [];
for (let r = 0; r < 14; r++) flat[r] = ' '.repeat(40);
flat[11] = '..S' + ' '.repeat(37);
flat[12] = '#'.repeat(40);
flat[13] = 'd'.repeat(40);
const fakeGame = { bigState: false, addScore: () => {}, addCoin: () => {}, onLevelCleared: () => {}, onLevelFailed: () => {}, animFrame: 0 };
const level = new G.Level({ name: 'TEST', bg: '#000', map: flat }, fakeGame);
const p = level.player;
console.log('start: y=', p.y.toFixed(1), 'h=', p.h);
for (let i = 0; i < 120; i++) level.player.update(level);
console.log('rest:  y=', p.y.toFixed(1), 'grounded=', p.grounded, 'vy=', p.vy.toFixed(2));
const groundTop = 12 * 16;
const feet = p.y + p.h;
if (Math.abs(feet - groundTop) > 0.5) throw new Error('player not resting on ground! feet=' + feet + ' expected=' + groundTop);
if (!p.grounded) throw new Error('player should be grounded');

// Walk right across flat ground for 200 frames; must stay grounded, never fall.
G.Input.state.right = true;
let minFeet = Infinity, maxFeet = -Infinity;
for (let i = 0; i < 200; i++) { G.Input.snapshot(); level.player.update(level); feetNow(); }
function feetNow() { const f = p.y + p.h; minFeet = Math.min(minFeet, f); maxFeet = Math.max(maxFeet, f); }
G.Input.state.right = false;
console.log('walk:  x=', p.x.toFixed(1), 'feet range=', minFeet.toFixed(1), '..', maxFeet.toFixed(1), 'grounded=', p.grounded);
if (maxFeet > groundTop + 1) throw new Error('player sank below ground while walking');

// Jump test: should leave ground then return.
G.Input.keyDown('jump'); G.Input.snapshot(); level.player.update(level); // press
let leftGround = false;
for (let i = 0; i < 80; i++) { if (i === 10) G.Input.keyUp('jump'); G.Input.snapshot(); level.player.update(level); if (!p.grounded) leftGround = true; }
console.log('jump:  leftGround=', leftGround, 'landed grounded=', p.grounded, 'feet=', (p.y + p.h).toFixed(1));
if (!leftGround) throw new Error('jump did not lift player');
if (!p.grounded) throw new Error('player did not land after jump');

console.log('\nPHYSICS TESTS PASSED');
