// Tests for swimming, currents, secret exits / hidden map paths, the secret world, easy mode and settings.
const G = require('./_env.js').load();
const assert = (c, m) => { if (!c) throw new Error(m); };
const In = G.Input;

const fakeGame = { form: 'small', lives: 5, score: 0, checkpoints: {}, levelIndex: 0, animFrame: 0,
  addScore(n) { this.score += n; }, addCoin() {}, onLevelCleared() { this.cleared = true; }, onLevelFailed() { this.failed = true; } };
G.game = fakeGame;

function makeLevel(art, opts) {
  const W = 60, rows = [];
  for (let r = 0; r < 14; r++) rows[r] = ' '.repeat(W);
  const off = 12 - art.length;
  art.forEach((s, i) => { rows[off + i] = (s + ' '.repeat(W)).slice(0, W); });
  rows[12] = '#'.repeat(W);
  rows[13] = 'd'.repeat(W);
  return new G.Level(Object.assign({ name: 'T', theme: 'overworld', groundRow: 12, map: rows }, opts || {}), fakeGame);
}
function run(L, n) { for (let i = 0; i < n; i++) { fakeGame.animFrame++; In.snapshot(); L.update(1 / 60); } }
function releaseAll() { ['left', 'right', 'up', 'down', 'jump', 'run', 'spin', 'start'].forEach((k) => In.keyUp(k)); }

// ---- swimming: slow sink, A strokes upward, no ground jump physics
{
  const L = makeLevel(['  S        '], { theme: 'water', water: true });
  const p = L.player;
  p.y = 100; p.vy = 0;
  run(L, 30);
  assert(p.vy > 0 && p.vy <= 1.25, 'underwater the hero sinks slowly, vy=' + p.vy);
  const y0 = p.y;
  In.keyDown('jump'); run(L, 1); In.keyUp('jump'); run(L, 10);
  assert(p.y < y0 - 8, 'tapping A swims upward');
  console.log('swim ok');
}
// ---- currents push the swimmer
{
  const L = makeLevel(['                    ', '  S  >>>>>>>>>>>>   ', '                    '], { theme: 'water', water: true });
  const p = L.player;
  p.x = 5 * 16; p.y = 10 * 16 + 2; p.vy = 0;
  let maxVx = 0;
  for (let i = 0; i < 40; i++) { p.vy = 0; p.y = 10 * 16 + 2; run(L, 1); maxVx = Math.max(maxVx, p.vx); }
  assert(maxVx > 1.6, 'a current pushes faster than swimming, vx=' + maxVx);
  console.log('current ok');
}
// ---- fish can't be stomped underwater
{
  const L = makeLevel(['  S      f   '], { theme: 'water', water: true });
  const p = L.player, f = L.enemies[0];
  p.x = f.x; p.y = f.y - p.h + 7; p.vy = 2; // overlapping the fish from above
  run(L, 2);
  assert(L.failed, 'touching a fish from above still hurts');
  console.log('fish ok');
}
// ---- secret exit flag clears the level through the hidden exit
{
  const L = makeLevel(['  S     E   ']);
  const p = L.player;
  In.keyDown('right'); run(L, 80); releaseAll();
  assert(L.cleared && L.secretExit, 'touching the purple flag takes the secret exit');
  console.log('secret flag ok');
}
// ---- real levels: the three secret exits exist and lead to the coast levels
{
  [2, 8, 13].forEach((i) => assert(G.Levels[i].map.join('').includes('E'), G.Levels[i].name + ' should hide a secret exit'));
  assert(!G.Save.isOpen(21), 'Coral Cove starts locked');
  G.Save.markSecret(2);
  assert(G.Save.isOpen(21), 'secret exit of 1-3 opens Coral Cove');
  assert(!G.Save.isOpen(24), 'secret world needs Coral Cove cleared');
  G.Save.markCleared(21);
  assert(G.Save.isOpen(24), 'clearing Coral Cove opens Starry Atoll');
  console.log('unlock rules ok');
}
// ---- the map reveals the hidden path and warps to the secret world and back
{
  G.Save.setWorld(0, 0);
  const game = new (function () {})();
  const realGame = G.game;
  G.game = Object.assign(realGame, { go(fn) { fn(); }, goMap() { this.worldMap = new G.WorldMap(this); } });
  let wm = new G.WorldMap(G.game);
  const cove = wm.nodes.findIndex((n) => n.level === 21);
  const warp = wm.nodes.findIndex((n) => n.warpTo === 4);
  assert(!wm.isHidden(cove) && !wm.isHidden(warp), 'secret node and warp are visible once revealed');
  wm.warpTo(wm.nodes[warp]);
  assert(G.Save.get().mapWorld === 4, 'warp leads to Starry Atoll');
  wm = new G.WorldMap(G.game);
  assert(wm.data.name === 'STARRY ATOLL' && wm.nodes[wm.current].warpTo === 0, 'arrive on the warp back home');
  wm.warpTo(wm.nodes[wm.current]);
  assert(G.Save.get().mapWorld === 0 && G.Save.get().mapNode === warp, 'warp back lands next to Coral Cove');
  void game;
  console.log('secret world warps ok');
}
// ---- easy mode: pits and hits never cost a life
{
  G.Settings.set('difficulty', 'easy');
  const L = makeLevel(['  S      g   ']);
  const p = L.player;
  run(L, 20);
  p.y = L.pixelH + 60;
  run(L, 2);
  assert(!L.failed && p.y < L.pixelH, 'easy mode: falling puts you back on safe ground');
  p.invuln = 0;
  L.hurtPlayer();
  assert(!L.failed && p.invuln > 0, 'easy mode: a hit on small Pip only knocks back');
  G.Settings.set('difficulty', 'normal');
  console.log('easy mode ok');
}
// ---- settings persist and clamp
{
  const music = G.Settings.ITEMS.find((i) => i.key === 'music');
  G.Settings.set('music', 10);
  G.Settings.step(music, 1);
  assert(G.Settings.get().music === 10, 'volume clamps at 10');
  const gfx = G.Settings.ITEMS.find((i) => i.key === 'graphics');
  G.Settings.step(gfx, 1);
  assert(G.Settings.get().graphics === '3d-low', 'graphics cycles to 3D low');
  G.Settings.set('graphics', '3d-high');
  console.log('settings ok');
}
releaseAll();
console.log('\nFEATURE TESTS PASSED');
