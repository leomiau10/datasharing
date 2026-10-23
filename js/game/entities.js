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


  // Walking item base: emerges from a block, then walks and bounces off walls.
  function walkItem(it, level) {
    if (it.emerge > 0) { it.emerge--; it.y -= 1; return false; }
    it.vx = it.dir * it.speed;
    const col = G.Physics.moveAndCollide(it, level, true);
    if (col.left) it.dir = 1;
    if (col.right) it.dir = -1;
    if (it.y > level.pixelH + 40) it.remove = true;
    return col;
  }

  class Heart {
    constructor(x, y) { this.w = 14; this.h = 12; this.x = x + 1; this.y = y + 4; this.vx = 0; this.vy = 0; this.dir = 1; this.speed = 1.1; this.remove = false; this.emerge = 12; }
    update(level) {
      walkItem(this, level);
      if (this.emerge <= 0 && G.Physics.aabb(level.player, this)) {
        this.remove = true;
        level.game.lives++;
        level.particles.push(new G.FloatText(this.x, this.y, '1UP'));
        G.Audio.sfx.oneup();
      }
    }
    render() { G.R.sprite(G.Sprites.heart, this.x - 1, this.y - 1); }
  }

  // Cloud cap: drifts down in a wave; grants the gliding "wind" form.
  class CloudItem {
    constructor(x, y) { this.w = 16; this.h = 12; this.x = x; this.y = y + 4; this.baseX = x; this.t = 0; this.remove = false; this.emerge = 12; }
    update(level) {
      if (this.emerge > 0) { this.emerge--; this.y -= 1.4; return; }
      this.t++;
      this.y += 0.35;
      this.x = this.baseX + Math.sin(this.t * 0.05) * 20;
      if (G.Physics.aabb(level.player, this)) {
        this.remove = true;
        level.player.powerUp('cloud');
        level.game.addScore(1000);
        level.addScore(this.x, this.y, 1000);
        G.Audio.sfx.powerup();
      }
      if (this.y > level.pixelH) this.remove = true;
    }
    render() { G.R.sprite(G.Sprites.cloudItem, this.x - 1, this.y - 1); }
  }

  // Rainbow gem: bounces around; grants temporary invincibility.
  class Gem {
    constructor(x, y) { this.w = 12; this.h = 14; this.x = x + 2; this.y = y + 2; this.vx = 0; this.vy = 0; this.dir = 1; this.speed = 1.3; this.remove = false; this.emerge = 14; this.t = 0; }
    update(level) {
      this.t++;
      const col = walkItem(this, level);
      if (col && col.down) this.vy = -5;
      if (this.emerge <= 0 && G.Physics.aabb(level.player, this)) {
        this.remove = true;
        level.startStar();
        level.game.addScore(1000);
        level.addScore(this.x, this.y, 1000);
      }
    }
    render() { const g = G.Sprites.gem; G.R.sprite(g[(this.t >> 2) % g.length], this.x - 1, this.y - 1); }
  }

  // Hidden medal: 3 per level, remembered across plays.
  class Medal {
    constructor(x, y, idx, had) { this.w = 12; this.h = 16; this.x = x + 2; this.y = y; this.idx = idx; this.had = had; this.t = Math.random() * 6; this.remove = false; }
    update(level) {
      this.t += 0.08;
      if (G.Physics.aabb(level.player, this)) {
        this.remove = true;
        level.medalsGot |= (1 << this.idx);
        level.game.addScore(1000);
        level.addScore(this.x, this.y, 1000);
        for (let i = 0; i < 4; i++) level.particles.push(new G.Sparkle(this.x + 6 + (i - 1.5) * 6, this.y + 8 + (i % 2 ? 4 : -4)));
        G.Audio.sfx.medal();
      }
    }
    render() {
      const S = G.Sprites;
      G.R.sprite(this.had ? S.medalFaded : S.medal, this.x - 1, this.y - 1 + Math.round(Math.sin(this.t) * 2));
    }
  }

  // Lift that eases back and forth horizontally ('h') or vertically ('v').
  class MovingPlatform {
    constructor(x, y, axis) {
      this.x = x; this.y = y; this.ox = x; this.oy = y;
      this.w = 48; this.h = 8;
      this.axis = axis;
      this.range = axis === 'h' ? 96 : 80;
      this.t = 0; this.dx = 0; this.dy = 0;
    }
    update() {
      this.t++;
      const k = (1 - Math.cos(this.t * Math.PI * 2 / 300)) / 2;
      const nx = this.axis === 'h' ? this.ox + k * this.range : this.ox;
      const ny = this.axis === 'v' ? this.oy - k * this.range : this.oy;
      this.dx = nx - this.x; this.dy = ny - this.y;
      this.x = nx; this.y = ny;
    }
    render() { G.R.sprite(G.Sprites.lift, this.x - 1, this.y - 1); }
  }

  G.Heart = Heart;
  G.CloudItem = CloudItem;
  G.Gem = Gem;
  G.Medal = Medal;
  G.MovingPlatform = MovingPlatform;

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
