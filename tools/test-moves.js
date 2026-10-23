// Tests for the advanced moves and mechanics: spin jump, ground pound, wall jump, shell carry,
// moving lifts, medals, invincibility, Thornback, boss fight and level reachability basics.
const G = require('./_env.js').load();
const assert = (c, m) => { if (!c) throw new Error(m); };
const In = G.Input;

const fakeGame = { form: 'small', lives: 3, score: 0, checkpoints: {}, levelIndex: 0, animFrame: 0,
  addScore(n) { this.score += n; }, addCoin() {}, onLevelCleared() { this.cleared = true; }, onLevelFailed() {} };
G.game = fakeGame;

// Build a test level: flat floor, with optional art rows (bottom-aligned to row 11).
function makeLevel(art, width) {
  const W = width || 60;
  const rows = [];
  for (let r = 0; r < 14; r++) rows[r] = ' '.repeat(W);
  const put = (r, s) => { rows[r] = (s + ' '.repeat(W)).slice(0, W); };
  const off = 12 - art.length;
  art.forEach((s, i) => put(off + i, s));
  rows[12] = '#'.repeat(W);
  rows[13] = 'd'.repeat(W);
  return new G.Level({ name: 'T', theme: 'overworld', groundRow: 12, map: rows }, fakeGame);
}
function run(level, n, each) {
  for (let i = 0; i < n; i++) { if (each) each(i); fakeGame.animFrame++; In.snapshot(); level.update(1 / 60); }
}
function releaseAll() { ['left', 'right', 'up', 'down', 'jump', 'run', 'spin', 'start'].forEach((k) => In.keyUp(k)); }

// ---- spin jump defeats a Thornback that would hurt a normal stomp
{
  const L = makeLevel(['  S     p   ']);
  const p = L.player, e = L.enemies[0];
  e.speed = 0;
  p.x = e.x; p.y = e.y - p.h - 30; p.vy = 3; p.spinning = true; p.grounded = false;
  run(L, 20);
  assert(L.enemies.indexOf(e) === -1 || e.dying, 'spin jump should defeat a Thornback');
  assert(!L.failed, 'spin bounce on Thornback must not hurt');
  console.log('spin vs thornback ok');
  releaseAll();
}
// ---- normal stomp on Thornback hurts
{
  const L = makeLevel(['  S     p   ']);
  const p = L.player, e = L.enemies[0];
  e.speed = 0;
  p.x = e.x; p.y = e.y - p.h - 2; p.vy = 3;
  run(L, 10);
  assert(L.failed, 'plain stomp on a Thornback should hurt a small hero');
  console.log('stomp on thornback hurts ok');
  releaseAll();
}
// ---- spin jump input produces a spinning jump
{
  const L = makeLevel(['  S         ']);
  run(L, 30);
  In.keyDown('spin'); run(L, 2);
  assert(L.player.spinning && L.player.vy < 0, 'Y should start a spin jump');
  In.keyUp('spin'); run(L, 60);
  assert(!L.player.spinning && L.player.grounded, 'spin ends on landing');
  console.log('spin jump input ok');
}
// ---- ground pound breaks bricks below and keeps falling through
{
  const L = makeLevel([
    '            ',
    '  S         ',
    '  BB        ',
    '            ',
    '            '
  ]);
  const p = L.player;
  run(L, 40);
  assert(p.grounded, 'hero stands on the bricks');
  const brickRow = 9;
  assert(L.tileAt(2, brickRow) === G.Tiles.T.BRICK, 'brick present');
  In.keyDown('jump'); run(L, 6); In.keyUp('jump'); run(L, 4);
  In.keyDown('down'); run(L, 2); In.keyUp('down');
  assert(p.pound, 'down in mid-air starts a ground pound');
  run(L, 60);
  assert(L.tileAt(2, brickRow) !== G.Tiles.T.BRICK || L.tileAt(3, brickRow) !== G.Tiles.T.BRICK, 'pound should break a brick');
  assert(!p.pound && p.grounded && p.y + p.h === 192, 'pound continues through bricks down to the floor');
  console.log('ground pound ok');
  releaseAll();
}
// ---- wall slide + wall jump
{
  const art = [];
  for (let i = 0; i < 9; i++) art.push('        XX  ');
  art.push('  S     XX  ');
  const L = makeLevel(art);
  const p = L.player;
  run(L, 20);
  In.keyDown('right');
  run(L, 70); // walk up to the wall
  In.keyDown('jump'); run(L, 20); In.keyUp('jump');
  let slid = false;
  for (let i = 0; i < 40 && !slid; i++) { run(L, 1); if (p.wallDir === 1) slid = true; }
  assert(p.wallDir === 1 || p.wallTimer > 0, 'pressing into a wall while falling should wall-slide');
  assert(p.vy <= 1.85, 'wall slide slows the fall, vy=' + p.vy);
  In.keyDown('jump'); run(L, 2);
  assert(p.vy < -5 && p.vx < 0, 'jumping off the wall kicks away and up');
  console.log('wall jump ok');
  releaseAll();
}
// ---- carry and throw a shell
{
  const L = makeLevel(['  S   k     ']);
  const p = L.player, s = L.enemies[0];
  s.setShell();
  run(L, 10);
  In.keyDown('run'); In.keyDown('right');
  run(L, 40);
  assert(p.carry === s && s.mode === 'carried', 'holding B on a shell picks it up');
  In.keyUp('right'); run(L, 5);
  In.keyUp('run'); run(L, 2);
  assert(!p.carry && s.mode === 'slide', 'releasing B throws the shell');
  console.log('carry/throw ok');
  releaseAll();
}
// ---- moving lift carries the hero
{
  const L = makeLevel([
    '            ',
    '            ',
    '   M        '
  ]);
  const p = L.player, pl = L.platforms[0];
  p.x = pl.x + 10; p.y = pl.y - p.h - 4; p.vy = 0;
  run(L, 5);
  assert(p.ride === pl, 'hero lands on the lift');
  const x0 = p.x;
  run(L, 100);
  assert(p.ride === pl && p.x > x0 + 20, 'hero moves along with the lift');
  console.log('moving lift ok');
}
// ---- medal pickup + invincibility
{
  const L = makeLevel(['  S *  g     ']);
  run(L, 5);
  L.startStar();
  In.keyDown('right'); run(L, 40);
  assert(L.medalsGot & 1, 'medal collected');
  run(L, 120);
  assert(!L.failed, 'invincible hero is not hurt by enemies');
  assert(L.enemies.length === 0 || L.enemies[0].dying, 'invincible hero knocks enemies away');
  console.log('medal + star ok');
  releaseAll();
}
// ---- boss fight: three stomps clear the level
{
  const L = new G.Level(G.Levels[5], Object.assign(fakeGame, { levelIndex: 5 }));
  assert(L.hasBoss && L.flagX == null, 'fortress has a boss and no flag');
  const boss = L.enemies.find((e) => e.boss);
  const p = L.player;
  p.x = L.arenaX + 100; p.y = 150;
  run(L, 5);
  assert(L.arenaLock, 'entering the arena locks it');
  for (let i = 0; i < 3; i++) {
    boss.invuln = 0;
    p.x = boss.x + 8; p.y = boss.y - p.h - 1; p.vy = 4; p.invuln = 200;
    run(L, 2);
  }
  assert(boss.hp === 0 && boss.dying, 'three stomps defeat King Gloop, hp=' + boss.hp);
  p.invuln = 999;
  run(L, 260);
  assert(fakeGame.cleared, 'defeating the boss clears the level');
  console.log('boss fight ok');
}
// ---- every level: 3 medals, a goal, rectangular map
G.Levels.forEach((def, i) => {
  const widths = new Set(def.map.map((r) => r.length));
  assert(widths.size === 1, 'level ' + i + ' rows differ in width');
  const medals = def.map.join('').split('*').length - 1;
  assert(medals === 3, 'level ' + i + ' should have 3 medals, has ' + medals);
  const goal = def.map.join('').includes('F') || def.map.join('').includes('Z');
  assert(goal, 'level ' + i + ' needs a goal or boss');
  const signs = def.map.join('').split('!').length - 1;
  assert(signs <= def.tips.length, 'level ' + i + ' has more signs than tips');
});
console.log('level data ok');
console.log('\nMOVES TESTS PASSED');
