// Enemies: Blob (stomp it) and Snail (stomp -> kickable shell). Stomp chains award bigger scores.
(function (G) {
  'use strict';

  const TILE = 16;

  function isStomp(player, e) {
    return player.vy > 0 && (player.y + player.h) <= e.y + e.h * 0.6 + 4;
  }

  // Knock an enemy off screen (fireball / sliding shell / bumped block).
  function launch(e) {
    e.dying = true;
    e.fly = true;
    e.vy = -3.5;
    e.vx = (Math.random() < 0.5 ? -1 : 1) * 0.8;
  }

  function flyUpdate(e, level) {
    e.x += e.vx; e.y += e.vy; e.vy += 0.4;
    if (e.y > level.pixelH + 60) e.remove = true;
  }

  function patrol(e, level) {
    e.vx = e.dir * e.speed;
    const col = G.Physics.moveAndCollide(e, level, true);
    if (col.left) e.dir = 1;
    if (col.right) e.dir = -1;
    if (col.down && e.edgeTurn) {
      const aheadX = e.dir > 0 ? e.x + e.w + 1 : e.x - 1;
      const c = Math.floor(aheadX / TILE);
      const r = Math.floor((e.y + e.h + 1) / TILE);
      const id = level.tileAt(c, r);
      if (!G.Tiles.isSolid(id) && !G.Tiles.isOneWay(id)) e.dir = -e.dir;
    }
  }

  class Blob {
    constructor(x, y) {
      this.w = 16; this.h = 16;
      this.x = x; this.y = y;
      this.vx = 0; this.vy = 0;
      this.dir = -1; this.speed = 0.5;
      this.alive = true; this.dying = false; this.remove = false; this.fly = false;
      this.edgeTurn = false;
      this.squish = 0;
      this.animTimer = 0;
    }
    update(level) {
      if (this.fly) { flyUpdate(this, level); return; }
      if (this.dying) { this.squish++; if (this.squish > 24) this.remove = true; return; }
      patrol(this, level);
      this.animTimer++;
      if (this.y > level.pixelH + 40) this.remove = true;
    }
    onPlayer(player, level) {
      if (this.dying) return;
      if (isStomp(player, this)) {
        this.dying = true; this.squish = 0; this.vx = 0;
        player.bounce();
        level.stompScore(this, player);
        G.Audio.sfx.stomp();
      } else {
        level.hurtPlayer();
      }
    }
    hitByFire(level) {
      launch(this);
      level.game.addScore(100);
      level.addScore(this.x, this.y, 100);
      G.Audio.sfx.stomp();
    }
    render() {
      const S = G.Sprites;
      if (this.fly) { G.R.sprite(S.blob[0], this.x - 1, this.y - 1, false, true); return; }
      if (this.dying) { G.R.spriteScaled(S.blob[0], this.x - 1, this.y + this.h - 6, 18, 7); return; }
      G.R.sprite(S.blob[Math.floor(this.animTimer / 10) % 2], this.x - 1, this.y - 1);
    }
  }

  class Snail {
    constructor(x, y) {
      this.walkW = 16; this.walkH = 14;
      this.shellW = 16; this.shellH = 10;
      this.w = this.walkW; this.h = this.walkH;
      this.x = x; this.y = y + (16 - this.h);
      this.vx = 0; this.vy = 0;
      this.dir = -1; this.speed = 0.4;
      this.alive = true; this.dying = false; this.remove = false; this.fly = false;
      this.edgeTurn = true;
      this.mode = 'walk'; // 'walk' | 'shell' | 'slide'
      this.shellTimer = 0;
      this.grace = 0;
      this.animTimer = 0;
    }
    resize(w, h) { const bottom = this.y + this.h; this.w = w; this.h = h; this.y = bottom - h; }
    setShell() { this.mode = 'shell'; this.resize(this.shellW, this.shellH); this.vx = 0; this.shellTimer = 0; }
    update(level) {
      if (this.fly) { flyUpdate(this, level); return; }
      if (this.grace > 0) this.grace--;
      if (this.mode === 'walk') {
        patrol(this, level);
        this.animTimer++;
      } else if (this.mode === 'shell') {
        this.vx = 0;
        G.Physics.moveAndCollide(this, level, true);
        if (++this.shellTimer > 420) { this.mode = 'walk'; this.resize(this.walkW, this.walkH); }
      } else {
        this.vx = this.dir * 3.2;
        const col = G.Physics.moveAndCollide(this, level, true);
        if (col.left) this.dir = 1;
        if (col.right) this.dir = -1;
        for (const other of level.enemies) {
          if (other === this || other.dying) continue;
          if (G.Physics.aabb(this, other)) {
            launch(other);
            level.game.addScore(200);
            level.addScore(other.x, other.y, 200);
            G.Audio.sfx.stomp();
          }
        }
      }
      if (this.y > level.pixelH + 40) this.remove = true;
    }
    onPlayer(player, level) {
      if (this.grace > 0) return;
      if (this.mode === 'walk') {
        if (isStomp(player, this)) {
          this.setShell();
          player.bounce();
          level.stompScore(this, player);
          G.Audio.sfx.stomp();
        } else level.hurtPlayer();
      } else if (this.mode === 'shell') {
        if (isStomp(player, this)) { player.bounce(); G.Audio.sfx.stomp(); }
        this.kick(player);
      } else if (isStomp(player, this)) {
        this.mode = 'shell'; this.vx = 0; this.shellTimer = 0; this.grace = 10;
        player.bounce();
        G.Audio.sfx.stomp();
      } else {
        level.hurtPlayer();
      }
    }
    kick(player) {
      this.mode = 'slide';
      this.dir = (player.cx < this.x + this.w / 2) ? 1 : -1;
      this.grace = 20; // don't hurt the kicker while still overlapping
      G.Audio.sfx.bump();
    }
    hitByFire(level) {
      launch(this);
      level.game.addScore(200);
      level.addScore(this.x, this.y, 200);
      G.Audio.sfx.stomp();
    }
    render() {
      const S = G.Sprites;
      if (this.fly) { G.R.sprite(S.shell, this.x - 1, this.y - 1, false, true); return; }
      if (this.mode === 'walk') {
        const bob = (Math.floor(this.animTimer / 12) % 2);
        G.R.sprite(S.snail, this.x - 1, this.y - 1 + bob, this.dir > 0);
      } else {
        G.R.sprite(S.shell, this.x - 1, this.y - 1);
      }
    }
  }

  G.Blob = Blob;
  G.Snail = Snail;
  G.launchEnemy = launch;
})(window.GAME = window.GAME || {});
