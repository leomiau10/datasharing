// Enemies: Goomba (stomp to defeat) and Koopa (stomp -> kickable shell).
(function (G) {
  'use strict';

  const TILE = 16;

  function isStomp(player, e) {
    return player.vy > 0 && (player.y + player.h) <= e.y + e.h * 0.6 + 4;
  }

  function patrol(e, level) {
    const P = G.Physics;
    e.vx = e.dir * e.speed;
    const col = P.moveAndCollide(e, level, true);
    if (col.left) { e.dir = 1; }
    if (col.right) { e.dir = -1; }
    // avoid walking off ledges when grounded
    if (col.down && e.edgeTurn) {
      const aheadX = e.dir > 0 ? e.x + e.w + 1 : e.x - 1;
      const c = Math.floor(aheadX / TILE);
      const r = Math.floor((e.y + e.h + 1) / TILE);
      if (!G.Tiles.isSolid(level.tileAt(c, r)) && !G.Tiles.isOneWay(level.tileAt(c, r))) {
        e.dir = -e.dir;
      }
    }
  }

  class Goomba {
    constructor(x, y, level) {
      this.w = 16; this.h = 16;
      this.x = x; this.y = y + (16 - this.h);
      this.vx = 0; this.vy = 0;
      this.dir = -1; this.speed = 0.5;
      this.alive = true; this.dying = false; this.remove = false;
      this.edgeTurn = false;
      this.squish = 0;
      this.animTimer = 0;
    }
    update(level) {
      if (this.dying) {
        this.squish++;
        if (this.squish > 24) this.remove = true;
        return;
      }
      patrol(this, level);
      this.animTimer++;
      if (this.y > level.pixelH + 40) this.remove = true;
    }
    onPlayer(player, level) {
      if (this.dying) return;
      if (isStomp(player, this)) {
        this.dying = true; this.squish = 0; this.vx = 0;
        player.vy = G.Input.down('jump') ? -6.5 : -4.5;
        level.game.addScore(100);
        level.addScore(this.x, this.y, 100);
        G.Audio.sfx.stomp();
      } else {
        level.hurtPlayer();
      }
    }
    render() {
      const S = G.Sprites;
      if (this.dying) {
        // squished
        G.R.sprite(S.goomba[0], this.x, this.y + this.h - 6);
        return;
      }
      const f = (Math.floor(this.animTimer / 10) % 2);
      G.R.sprite(S.goomba[f], this.x, this.y);
    }
  }

  class Koopa {
    constructor(x, y, level) {
      this.walkW = 14; this.walkH = 22;
      this.shellW = 16; this.shellH = 14;
      this.w = this.walkW; this.h = this.walkH;
      this.x = x; this.y = y + (16 - this.h);
      this.vx = 0; this.vy = 0;
      this.dir = -1; this.speed = 0.45;
      this.alive = true; this.dying = false; this.remove = false;
      this.edgeTurn = true;
      this.mode = 'walk'; // 'walk' | 'shell' | 'slide'
      this.shellTimer = 0;
      this.animTimer = 0;
    }
    setShell() {
      this.mode = 'shell';
      const cy = this.y + this.h;
      this.w = this.shellW; this.h = this.shellH;
      this.y = cy - this.h;
      this.vx = 0;
      this.shellTimer = 0;
    }
    update(level) {
      if (this.mode === 'walk') {
        this.speed = 0.45;
        patrol(this, level);
        this.animTimer++;
      } else if (this.mode === 'shell') {
        this.vx = 0;
        G.Physics.moveAndCollide(this, level, true);
        this.shellTimer++;
        if (this.shellTimer > 360) { this.mode = 'walk'; const cy = this.y + this.h; this.w = this.walkW; this.h = this.walkH; this.y = cy - this.h; }
      } else { // slide
        this.vx = this.dir * 3.2;
        const col = G.Physics.moveAndCollide(this, level, true);
        if (col.left) this.dir = 1;
        if (col.right) this.dir = -1;
        // smash other enemies
        for (const other of level.enemies) {
          if (other === this || !other.alive || other.dying) continue;
          if (G.Physics.aabb(this, other)) {
            other.dying = true; other.squish = 0; other.remove = true;
            level.game.addScore(100);
            G.Audio.sfx.stomp();
          }
        }
      }
      if (this.y > level.pixelH + 40) this.remove = true;
    }
    onPlayer(player, level) {
      if (this.mode === 'walk') {
        if (isStomp(player, this)) {
          this.setShell();
          player.vy = -5;
          level.game.addScore(100);
          G.Audio.sfx.stomp();
        } else level.hurtPlayer();
      } else if (this.mode === 'shell') {
        if (isStomp(player, this)) {
          player.vy = -5;
          this.kick(player);
          G.Audio.sfx.stomp();
        } else {
          this.kick(player);
        }
      } else { // slide
        if (isStomp(player, this)) {
          this.mode = 'shell'; this.vx = 0; this.shellTimer = 0;
          player.vy = -5;
          G.Audio.sfx.stomp();
        } else {
          level.hurtPlayer();
        }
      }
    }
    kick(player) {
      this.mode = 'slide';
      this.dir = (player.cx < this.x + this.w / 2) ? 1 : -1;
      this.shellTimer = 0;
      G.Audio.sfx.bump();
    }
    render() {
      const S = G.Sprites;
      if (this.mode === 'walk') {
        G.R.sprite(S.koopa, this.x, this.y, this.dir > 0);
      } else {
        G.R.sprite(S.shell, this.x, this.y, this.dir > 0);
      }
    }
  }

  G.Goomba = Goomba;
  G.Koopa = Koopa;
})(window.GAME = window.GAME || {});
