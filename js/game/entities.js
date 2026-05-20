// Collectibles (coin, mushroom) and visual particles.
(function (G) {
  'use strict';

  class Coin {
    constructor(x, y) {
      this.x = x + 3; this.y = y + 1;
      this.w = 10; this.h = 14;
      this.remove = false;
      this.t = Math.floor(Math.random() * 4);
    }
    update(level) {
      this.t++;
      if (G.Physics.aabb(level.player, this)) {
        this.remove = true;
        level.game.addCoin();
        level.game.addScore(50);
        G.Audio.sfx.coin();
      }
    }
    render() {
      const S = G.Sprites;
      const f = Math.floor(this.t / 8) % S.coin.length;
      G.R.sprite(S.coin[f], this.x, this.y);
    }
  }

  class Mushroom {
    constructor(x, y, level) {
      this.w = 14; this.h = 14;
      this.x = x + 1; this.y = y;
      this.vx = 0.9; this.vy = 0;
      this.dir = 1; this.speed = 0.9;
      this.remove = false;
      this.emerge = 16; // rises out of the block first
    }
    update(level) {
      if (this.emerge > 0) {
        this.emerge--; this.y -= 1; return;
      }
      this.vx = this.dir * this.speed;
      const col = G.Physics.moveAndCollide(this, level, true);
      if (col.left) this.dir = 1;
      if (col.right) this.dir = -1;
      if (G.Physics.aabb(level.player, this)) {
        this.remove = true;
        level.player.grow();
        level.game.addScore(1000);
        level.addScore(this.x, this.y, 1000);
        G.Audio.sfx.powerup();
      }
      if (this.y > level.pixelH + 40) this.remove = true;
    }
    render() { G.R.sprite(G.Sprites.mushroom, this.x, this.y); }
  }

  class CoinPop {
    constructor(x, y) {
      this.x = x; this.y = y; this.vy = -3.2; this.life = 24; this.remove = false;
    }
    update() {
      this.y += this.vy; this.vy += 0.25; this.life--;
      if (this.life <= 0) this.remove = true;
    }
    render() {
      const S = G.Sprites;
      const f = Math.floor(this.life / 4) % S.coin.length;
      G.R.sprite(S.coin[f], this.x, this.y);
    }
  }

  class Debris {
    constructor(x, y, vx, vy) {
      this.x = x; this.y = y; this.vx = vx; this.vy = vy; this.life = 40; this.remove = false;
    }
    update() {
      this.x += this.vx; this.y += this.vy; this.vy += 0.35; this.life--;
      if (this.life <= 0) this.remove = true;
    }
    render() { G.R.rect(this.x, this.y, 4, 4, '#8a6428'); }
  }

  class BumpAnim {
    constructor(x, y) { this.x = x; this.y = y; this.life = 6; this.remove = false; }
    update() { this.life--; if (this.life <= 0) this.remove = true; }
    render() {}
  }

  class FloatText {
    constructor(x, y, text) {
      this.x = x; this.y = y; this.text = text; this.life = 40; this.remove = false;
    }
    update() { this.y -= 0.6; this.life--; if (this.life <= 0) this.remove = true; }
    render() {
      G.Text.draw(this.text, this.x - G.R.cam.x, this.y - G.R.cam.y, '#ffffff');
    }
  }

  G.Coin = Coin;
  G.Mushroom = Mushroom;
  G.CoinPop = CoinPop;
  G.Debris = Debris;
  G.BumpAnim = BumpAnim;
  G.FloatText = FloatText;
})(window.GAME = window.GAME || {});
