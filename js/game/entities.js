// Collectibles (coin, berry, flower), fireball and visual particles.
(function (G) {
  'use strict';

  class Coin {
    constructor(x, y) {
      this.x = x + 3; this.y = y + 1;
      this.w = 10; this.h = 14;
      this.remove = false;
      this.t = Math.floor(Math.random() * 32);
    }
    update(level) {
      this.t++;
      if (G.Physics.aabb(level.player, this)) {
        this.remove = true;
        level.game.addCoin();
        level.game.addScore(50);
        G.Audio.sfx.coin();
        level.particles.push(new G.Sparkle(this.x + 5, this.y + 7));
      }
    }
    render() {
      const S = G.Sprites;
      G.R.sprite(S.coin[Math.floor(this.t / 8) % S.coin.length], this.x, this.y);
    }
  }

  // Power-up that walks (berry). Grows a small hero.
  class Berry {
    constructor(x, y) {
      this.w = 14; this.h = 14;
      this.x = x + 1; this.y = y;
      this.vx = 0; this.vy = 0;
      this.dir = 1; this.speed = 0.9;
      this.remove = false;
      this.emerge = 16;
    }
    update(level) {
      if (this.emerge > 0) { this.emerge--; this.y -= 1; return; }
      this.vx = this.dir * this.speed;
      const col = G.Physics.moveAndCollide(this, level, true);
      if (col.left) this.dir = 1;
      if (col.right) this.dir = -1;
      if (G.Physics.aabb(level.player, this)) {
        this.remove = true;
        level.player.powerUp('berry');
        level.game.addScore(1000);
        level.addScore(this.x, this.y, 1000);
        G.Audio.sfx.powerup();
      }
      if (this.y > level.pixelH + 40) this.remove = true;
    }
    render() { G.R.sprite(G.Sprites.berry, this.x - 1, this.y - 1); }
  }

  // Fire flower: stays in place, gives the fireball power.
  class Flower {
    constructor(x, y) {
      this.w = 14; this.h = 14;
      this.x = x + 1; this.y = y;
      this.remove = false;
      this.emerge = 16;
    }
    update(level) {
      if (this.emerge > 0) { this.emerge--; this.y -= 1; return; }
      if (G.Physics.aabb(level.player, this)) {
        this.remove = true;
        level.player.powerUp('flower');
        level.game.addScore(1000);
        level.addScore(this.x, this.y, 1000);
        G.Audio.sfx.powerup();
      }
    }
    render() { G.R.sprite(G.Sprites.flower, this.x - 1, this.y - 1); }
  }

  class Fireball {
    constructor(x, y, dir) {
      this.x = x - 4; this.y = y - 4;
      this.w = 8; this.h = 8;
      this.vx = dir * 3.6; this.vy = 0;
      this.grav = 0.4;
      this.remove = false;
      this.t = 0;
    }
    update(level) {
      this.t++;
      const col = G.Physics.moveAndCollide(this, level, true);
      if (col.down) this.vy = -3.2;
      if (col.left || col.right || col.up) { this.pop(level); return; }
      for (const e of level.enemies) {
        if (e.dying || !e.alive) continue;
        if (G.Physics.aabb(this, e)) { e.hitByFire(level); this.pop(level); return; }
      }
      const cam = G.R.cam;
      if (this.x < cam.x - 40 || this.x > cam.x + G.R.BASE_W + 40 || this.y > level.pixelH + 20) this.remove = true;
    }
    pop(level) {
      this.remove = true;
      level.particles.push(new G.Sparkle(this.x + 4, this.y + 4));
    }
    render() { G.R.sprite(G.Sprites.fireball, this.x, this.y, false, (this.t >> 2) & 1); }
  }

  class CoinPop {
    constructor(x, y) { this.x = x; this.y = y; this.vy = -3.2; this.life = 24; this.remove = false; }
    update() { this.y += this.vy; this.vy += 0.25; if (--this.life <= 0) this.remove = true; }
    render() {
      const S = G.Sprites;
      G.R.sprite(S.coin[Math.floor(this.life / 4) % S.coin.length], this.x, this.y);
    }
  }

  class Debris {
    constructor(x, y, vx, vy) { this.x = x; this.y = y; this.vx = vx; this.vy = vy; this.life = 40; this.remove = false; }
    update() { this.x += this.vx; this.y += this.vy; this.vy += 0.35; if (--this.life <= 0) this.remove = true; }
    render() { G.R.rect(this.x, this.y, 4, 4, '#8a4a18'); G.R.rect(this.x, this.y, 4, 1, '#f8c868'); }
  }

  // Dust puff (landing / skid).
  class Puff {
    constructor(x, y) { this.x = x; this.y = y; this.life = 14; this.remove = false; }
    update() { this.y -= 0.15; if (--this.life <= 0) this.remove = true; }
    render() {
      const r = 1 + Math.floor((14 - this.life) / 5);
      G.R.rect(this.x - r, this.y - r, r * 2, r * 2, this.life > 6 ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.4)');
    }
  }

  class Sparkle {
    constructor(x, y) { this.x = x; this.y = y; this.life = 12; this.remove = false; }
    update() { if (--this.life <= 0) this.remove = true; }
    render() {
      const r = 2 + (12 - this.life) / 3;
      const c = '#fff6a0';
      G.R.rect(this.x - r, this.y, r * 2, 1, c);
      G.R.rect(this.x, this.y - r, 1, r * 2, c);
    }
  }

  class FloatText {
    constructor(x, y, text) { this.x = x; this.y = y; this.text = text; this.life = 40; this.remove = false; }
    update() { this.y -= 0.6; if (--this.life <= 0) this.remove = true; }
    render() { G.Text.drawShadow(this.text, this.x - G.R.cam.x, this.y - G.R.cam.y, '#ffffff', 1, '#000'); }
  }

  G.Coin = Coin;
  G.Berry = Berry;
  G.Flower = Flower;
  G.Fireball = Fireball;
  G.CoinPop = CoinPop;
  G.Debris = Debris;
  G.Puff = Puff;
  G.Sparkle = Sparkle;
  G.FloatText = FloatText;
})(window.GAME = window.GAME || {});
