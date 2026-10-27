// Focused physics test: rest on ground, walk, run meter, jump scaling, skid, crouch.
const G = require('./_env.js').load();

const flat = [];
for (let r = 0; r < 14; r++) flat[r] = ' '.repeat(200);
flat[11] = '..S' + ' '.repeat(197);
flat[12] = '#'.repeat(200);
flat[13] = 'd'.repeat(200);
const fakeGame = { form: 'small', checkpoints: {}, levelIndex: 0, addScore() {}, addCoin() {}, onLevelCleared() {}, onLevelFailed() {}, animFrame: 0 };
G.game = fakeGame;
const level = new G.Level({ name: 'TEST', theme: 'overworld', groundRow: 12, map: flat }, fakeGame);
const p = level.player;
const In = G.Input;
const step = (n) => { for (let i = 0; i < n; i++) { In.snapshot(); p.update(level); } };
const groundTop = 12 * 16;
const assert = (c, m) => { if (!c) throw new Error(m); };

step(120);
assert(Math.abs(p.y + p.h - groundTop) < 0.5 && p.grounded, 'player should rest on the ground, feet=' + (p.y + p.h));
console.log('rest ok');

// walk: capped at walking speed
In.keyDown('right'); step(25);
assert(p.vx > 1.3 && p.vx <= 1.55, 'walk speed ~1.5, got ' + p.vx);
console.log('walk speed', p.vx.toFixed(2));

// auto-run: keep holding the direction (no B) and the hero speeds up to a run
step(70);
assert(p.vx > 2.3, 'holding a direction should auto-run, got ' + p.vx);
console.log('auto-run speed', p.vx.toFixed(2));

// run: faster, and the run meter fills for a sprint
In.keyDown('run'); step(150);
assert(p.pMeter >= 70, 'run meter should be full, got ' + p.pMeter);
assert(p.vx > 3.0, 'sprint speed ~3.2, got ' + p.vx);
console.log('sprint speed', p.vx.toFixed(2), 'pMeter', p.pMeter);

// jump height scales with speed
function jumpHeight() {
  const startY = p.y;
  In.keyDown('jump'); step(1);
  let top = p.y;
  for (let i = 0; i < 60; i++) { In.snapshot(); p.update(level); top = Math.min(top, p.y); if (i > 4 && p.grounded) break; }
  In.keyUp('jump'); step(40);
  return startY - top;
}
const fast = jumpHeight();
In.keyUp('right'); In.keyUp('run'); step(60);
const still = jumpHeight();
console.log('jump height sprinting', fast.toFixed(1), 'standing', still.toFixed(1));
assert(fast > still + 8, 'sprint jump should be higher than a standing jump');

// variable jump: tap is lower than hold
In.keyDown('jump'); step(1); In.keyUp('jump');
let tapTop = p.y; for (let i = 0; i < 50; i++) { step(1); tapTop = Math.min(tapTop, p.y); }
step(40);
const tapH = groundTop - p.h - tapTop;
console.log('tap jump height', tapH.toFixed(1));
assert(tapH < still - 6, 'tapping jump should be a short hop');

// skid: sprint right then press left
In.keyDown('right'); In.keyDown('run'); step(150);
In.keyUp('right'); In.keyDown('left'); step(3);
assert(p.skidding, 'reversing at speed should skid');
console.log('skid ok');
In.keyUp('left'); In.keyUp('run'); step(120);

// crouch (big only) and stand back up
p.powerUp('berry'); step(5);
assert(p.h === 26, 'big hero is 26 tall');
In.keyDown('down'); step(3);
assert(p.crouching && p.h === 16, 'big hero crouches to 16');
In.keyUp('down'); step(3);
assert(!p.crouching && p.h === 26, 'stands up again with headroom');
console.log('crouch ok');
console.log('\nPHYSICS TESTS PASSED');
