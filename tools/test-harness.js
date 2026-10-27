// Headless smoke test: drives every scene (incl. iris transitions) and many ticks to catch runtime errors.
const G = require('./_env.js').load();
const game = G.game;
if (!game) throw new Error('game did not initialize');
const In = G.Input.state;
const tap = (k) => { G.Input.keyDown(k); G.Input.keyUp(k); };
function tick(n, setup) { for (let i = 0; i < n; i++) { if (setup) setup(i); game.update(); game.render(); } }
const settle = () => tick(90); // let an iris transition finish

console.log('R.BASE_W (844x390 screen):', G.R.BASE_W, 'x', G.R.BASE_H);
if (G.R.BASE_W < 440) throw new Error('canvas should widen to the phone aspect ratio');

game.render();
tap('jump'); tick(2); settle();
if (game.scene !== 'map') throw new Error('expected map, got ' + game.scene);
tap('jump'); tick(2); settle();
if (game.scene !== 'level') throw new Error('expected level, got ' + game.scene);
const lvl = game.level;
console.log('level 0:', lvl.w + 'x' + lvl.h, 'theme', lvl.theme, 'enemies', lvl.enemies.length, 'checkpoint', !!lvl.checkpoint);

// run + jump bot
In.right = true; In.run = true;
tick(400, (i) => { if (i % 40 === 0) G.Input.keyDown('jump'); if (i % 40 === 8) G.Input.keyUp('jump'); });
In.right = false; In.run = false; G.Input.keyUp('jump');
console.log('after bot: scene', game.scene, 'pMeter seen ok');

// fire form: shoot, crouch
game.startLevel(0);
const p = game.level.player;
p.powerUp('flower');
if (p.form !== 'fire') throw new Error('flower should give fire form');
tick(30);
tap('run'); tick(2);
console.log('fireballs after shot:', game.level.shots.length);
if (game.level.shots.length !== 1) throw new Error('fireball not spawned');
In.down = true; tick(10); In.down = false; tick(10);

// stomp chain: land on enemy
game.startLevel(1);
const l = game.level;
const e = l.enemies[0];
l.player.x = e.x; l.player.y = e.y - l.player.h; l.player.vy = 4;
const before = game.score;
l.update(1 / 60);
console.log('stomp score delta:', game.score - before, 'chain', l.player.chain);
if (game.score <= before) throw new Error('stomp should award score');

// hurt: fire -> small; then death -> checkpoint/iris/restart
game.startLevel(2);
game.level.player.powerUp('flower');
game.level.player.invuln = 0; // power-up pickup grants brief invulnerability; clear it for the test
game.level.hurtPlayer();
if (game.level.player.form !== 'small') throw new Error('hurt should drop to small');
game.level.player.invuln = 0;
game.level.hurtPlayer();
if (!game.level.failed) throw new Error('small hurt should kill');
tick(200); settle();
console.log('after death: scene', game.scene, 'lives', game.lives);

// pit death while big must still kill (no soft-lock)
game.startLevel(0);
game.level.player.powerUp('berry');
game.level.player.y = game.level.pixelH + 100;
game.level.update(1 / 60);
if (!game.level.failed) throw new Error('falling off the map must kill even when big');

// clean win flow
game.lives = 3; game.startLevel(0);
game.level.player.x = game.level.flagX + 1;
tick(260); settle();
console.log('after flag: scene', game.scene, 'cleared0', G.Save.isCleared(0));
if (game.scene !== 'map' || !G.Save.isCleared(0)) throw new Error('win flow broken');

G.Levels.forEach((L, i) => {
  const widths = new Set(L.map.map((r) => r.length));
  if (widths.size !== 1) throw new Error('level ' + i + ' ragged');
  game.startLevel(i); tick(5);
});
// warp: after clearing the fortress, the pipe on Pip Island leads to Maple Woods
G.Save.markCleared(5);
G.Save.setWorld(0, G.Worlds[0].nodes.findIndex((n) => n.warp === 1));
game.trans = null; game.goMap();
tap('jump'); tick(2); settle();
console.log('after warp: world', G.Save.get().mapWorld, 'node', G.Save.get().mapNode, 'scene', game.scene);
if (G.Save.get().mapWorld !== 1 || game.worldMap.data.name !== 'MAPLE WOODS') throw new Error('warp to world 2 failed');
console.log('ALL SMOKE TESTS PASSED');
