// Enemies (original designs): Blob, Snail (carryable shell), Thornback (spiky), Bee (flyer),
// Hopper (jumper) and the fortress boss King Gloop. Stomp chains award bigger scores.
(function (G) {
  'use strict';

  const TILE = 16;

  function isStomp(player, e) {
    return player.vy > 0 && (player.y + player.h) <= e.y + e.h * 0.6 + 7;
  }

  // Knock an enemy off screen (fireball / shell / star / bumped block).
  function launch(e) {
    e.dying = true;
    e.fly = true;
    e.vy = -3.5;
    e.vx = (Math.random() < 0.5 ? -1 : 1) * 0.8;
    if (e.carried && e.level && e.level.player.carry === e) e.level.player.carry = null;
    e.carried = false;
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
    return col;
  }

  function fireKill(e, level, pts) {
    launch(e);
    level.game.addScore(pts);
    level.addScore(e.x, e.y, pts);
    G.Audio.sfx.stomp();
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
      if (this.dying) { if (++this.squish > 24) this.remove = true; return; }
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
      } else level.hurtPlayer();
    }
    hitByFire(level) { fireKill(this, level, 100); }
    render() {
      const S = G.Sprites;
      if (this.fly) { G.R.sprite(S.blob[0], this.x - 1, this.y - 1, false, true); return; }
      if (this.dying) { G.R.spriteScaled(S.blob[0], this.x - 1, this.y + this.h - 6, 18, 7); return; }
      G.R.sprite(S.blob[Math.floor(this.animTimer / 10) % 2], this.x - 1, this.y - 1);
    }
  }

  class Snail {
    constructor(x, y, level) {
      this.level = level;
      this.walkW = 16; this.walkH = 14;
      this.shellW = 16; this.shellH = 10;
      this.w = this.walkW; this.h = this.walkH;
      this.x = x; this.y = y + (16 - this.h);
      this.vx = 0; this.vy = 0;
      this.dir = -1; this.speed = 0.4;
      this.alive = true; this.dying = false; this.remove = false; this.fly = false;
      this.edgeTurn = true;
      this.mode = 'walk'; // 'walk' | 'shell' | 'slide' | 'carried'
      this.carried = false;
      this.shellTimer = 0;
      this.grace = 0;
      this.animTimer = 0;
    }
    resize(w, h) { const bottom = this.y + this.h; this.w = w; this.h = h; this.y = bottom - h; }
    setShell() { this.mode = 'shell'; this.resize(this.shellW, this.shellH); this.vx = 0; this.shellTimer = 0; }

    smash(level, also) {
      for (const other of level.enemies) {
        if (other === this || other.dying || other.boss) continue;
        if (G.Physics.aabb(this, other)) {
          launch(other);
          level.game.addScore(200);
          level.addScore(other.x, other.y, 200);
          G.Audio.sfx.stomp();
          if (also) { launch(this); return true; }
        }
      }
      return false;
    }

    // Held shell follows the hero; releasing B throws it.
    updateCarried(level) {
      const p = level.player;
      if (p.carry !== this) { this.carried = false; this.mode = 'shell'; return; }
      if (!G.Input.down('run') || p.state !== 'play') {
        p.carry = null;
        this.carried = false;
        this.mode = 'slide';
        this.dir = p.facing;
        this.x = p.facing > 0 ? p.x + p.w + 1 : p.x - this.w - 1;
        this.y = p.y + p.h - this.h;
        const c = Math.floor((this.x + this.w / 2) / TILE), r = Math.floor((this.y + this.h / 2) / TILE);
        if (G.Tiles.isSolid(level.tileAt(c, r))) this.x = p.x;
        this.grace = 12;
        G.Audio.sfx.bump();
        return;
      }
      this.x = p.facing > 0 ? p.x + p.w - 4 : p.x - this.w + 4;
      this.y = p.y + (p.big && !p.crouching ? 8 : 3);
      this.vx = 0; this.vy = 0;
      if (this.smash(level, true)) p.carry = null;
    }

    update(level) {
      if (this.fly) { flyUpdate(this, level); return; }
      if (this.grace > 0) this.grace--;
      if (this.mode === 'carried') { this.updateCarried(level); return; }
      if (this.mode === 'walk') {
        patrol(this, level);
        this.animTimer++;
      } else if (this.mode === 'shell') {
        this.vx = 0;
        G.Physics.moveAndCollide(this, level, true);
        if (++this.shellTimer > 420) { this.mode = 'walk'; this.resize(this.walkW, this.walkH); }
      } else {
        this.vx = this.dir * 3.4;
        const col = G.Physics.moveAndCollide(this, level, true);
        if (col.left) this.dir = 1;
        if (col.right) this.dir = -1;
        for (const h of col.hit) if (h.side === 'left' || h.side === 'right') level.shellHitBlock(h.col, h.row);
        this.smash(level, false);
      }
      if (this.y > level.pixelH + 40) this.remove = true;
    }
    onPlayer(player, level) {
      if (this.grace > 0 || this.mode === 'carried') return;
      if (this.mode === 'walk') {
        if (isStomp(player, this)) {
          this.setShell();
          player.bounce();
          level.stompScore(this, player);
          G.Audio.sfx.stomp();
        } else level.hurtPlayer();
      } else if (this.mode === 'shell') {
        if (G.Input.down('run') && !player.carry && player.state === 'play' && !player.pound) {
          this.mode = 'carried';
          this.carried = true;
          player.carry = this;
          return;
        }
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
      this.grace = 20;
      G.Audio.sfx.bump();
    }
    drop() { this.mode = 'shell'; this.carried = false; this.shellTimer = 0; this.grace = 20; }
    hitByFire(level) { fireKill(this, level, 200); }
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

  // Thornback: stomping it hurts; use a spin jump, fireball, shell or invincibility.
  class Spiky {
    constructor(x, y) {
      this.w = 16; this.h = 14;
      this.x = x; this.y = y + 2;
      this.vx = 0; this.vy = 0;
      this.dir = -1; this.speed = 0.45;
      this.alive = true; this.dying = false; this.remove = false; this.fly = false;
      this.edgeTurn = true;
      this.spiky = true;
      this.animTimer = 0;
    }
    update(level) {
      if (this.fly) { flyUpdate(this, level); return; }
      patrol(this, level);
      this.animTimer++;
      if (this.y > level.pixelH + 40) this.remove = true;
    }
    onPlayer(player, level) { level.hurtPlayer(); }
    hitByFire(level) { fireKill(this, level, 200); }
    render() {
      const S = G.Sprites;
      if (this.fly) { G.R.sprite(S.spiky[0], this.x - 1, this.y - 1, false, true); return; }
      G.R.sprite(S.spiky[Math.floor(this.animTimer / 10) % 2], this.x - 1, this.y - 1, this.dir < 0);
    }
  }

  // Bee: hovers in a wave pattern, patrolling back and forth.
  class Bee {
    constructor(x, y) {
      this.w = 14; this.h = 12;
      this.x = x; this.y = y + 2;
      this.baseX = x; this.baseY = y + 2;
      this.vx = 0; this.vy = 0;
      this.t = Math.random() * 100;
      this.alive = true; this.dying = false; this.remove = false; this.fly = false;
      this.facing = -1;
    }
    update(level) {
      if (this.fly) { flyUpdate(this, level); return; }
      this.t++;
      const nx = this.baseX + Math.sin(this.t * 0.015) * 40;
      this.facing = nx < this.x ? -1 : 1;
      this.x = nx;
      this.y = this.baseY + Math.sin(this.t * 0.09) * 6;
    }
    onPlayer(player, level) {
      if (isStomp(player, this)) {
        launch(this);
        player.bounce();
        level.stompScore(this, player);
        G.Audio.sfx.stomp();
      } else level.hurtPlayer();
    }
    hitByFire(level) { fireKill(this, level, 200); }
    render() {
      const S = G.Sprites;
      G.R.sprite(S.bee[(this.t >> 2) & 1], this.x - 1, this.y - 1, this.facing > 0, this.fly);
    }
  }

  // Hopper: crouches, then leaps toward the hero.
  class Hopper {
    constructor(x, y) {
      this.w = 14; this.h = 14;
      this.x = x + 1; this.y = y + 2;
      this.vx = 0; this.vy = 0;
      this.alive = true; this.dying = false; this.remove = false; this.fly = false;
      this.timer = 40 + Math.floor(Math.random() * 60);
      this.grounded = false;
      this.facing = -1;
      this.squish = 0;
    }
    update(level) {
      if (this.fly) { flyUpdate(this, level); return; }
      if (this.dying) { if (++this.squish > 24) this.remove = true; return; }
      const col = G.Physics.moveAndCollide(this, level, true);
      if (col.left || col.right) this.vx = -this.vx;
      this.grounded = col.down;
      if (this.grounded) {
        this.vx = 0;
        if (--this.timer <= 0) {
          const p = level.player;
          this.facing = p.cx < this.x + this.w / 2 ? -1 : 1;
          if (Math.abs(p.cx - this.x) < 220) {
            this.vy = -6.2;
            this.vx = this.facing * 1.3;
          }
          this.timer = 70 + Math.floor(Math.random() * 40);
        }
      }
      if (this.y > level.pixelH + 40) this.remove = true;
    }
    onPlayer(player, level) {
      if (this.dying) return;
      if (isStomp(player, this)) {
        this.dying = true; this.squish = 0; this.vx = 0;
        player.bounce();
        level.stompScore(this, player);
        G.Audio.sfx.stomp();
      } else level.hurtPlayer();
    }
    hitByFire(level) { fireKill(this, level, 200); }
    render() {
      const S = G.Sprites;
      if (this.dying) { G.R.spriteScaled(S.hopper[0], this.x - 1, this.y + this.h - 6, 18, 7); return; }
      G.R.sprite(S.hopper[this.grounded ? 0 : 1], this.x - 1, this.y - 1, this.facing > 0, this.fly);
    }
  }

  // King Gloop: walks and leaps at the hero, shaking the floor. Three stomps defeat him.
  class Boss {
    constructor(x, y) {
      this.boss = true;
      this.w = 30; this.h = 28;
      this.x = x - 8; this.y = y + 16 - this.h;
      this.vx = 0; this.vy = 0;
      this.hp = 3;
      this.alive = true; this.dying = false; this.remove = false; this.fly = false;
      this.invuln = 0;
      this.jumpTimer = 140;
      this.grounded = false;
      this.lands = 0;
      this.fireHits = 0;
      this.facing = -1;
      this.reported = false;
      this.active = false;
    }
    update(level) {
      if (this.fly) {
        flyUpdate(this, level);
        if (this.remove && !this.reported) { this.reported = true; level.bossDefeated(); }
        return;
      }
      if (!level.arenaLock) return; // waits until the hero enters the arena
      if (this.invuln > 0) this.invuln--;
      const p = level.player;
      this.facing = p.cx < this.x + this.w / 2 ? -1 : 1;
      const speed = 0.55 + (3 - this.hp) * 0.3;
      if (this.grounded) {
        this.vx = this.facing * speed;
        if (--this.jumpTimer <= 0) {
          this.vy = -7.5;
          this.vx = this.facing * (1.4 + (3 - this.hp) * 0.3);
          this.jumpTimer = 110 - (3 - this.hp) * 20;
        }
      }
      const wasGrounded = this.grounded;
      const col = G.Physics.moveAndCollide(this, level, true);
      this.grounded = col.down;
      if (col.left || col.right) this.vx = -this.vx;
      if (this.x < level.arenaX + 16) { this.x = level.arenaX + 16; this.vx = Math.abs(this.vx); }
      if (this.grounded && !wasGrounded) {
        level.shake = 12;
        G.Audio.sfx.pound();
        if (++this.lands % 2 === 0 && level.enemies.length < 4) {
          const m = new Blob(this.x + this.w / 2 - 8, this.y + this.h - 16);
          m.dir = this.facing;
          level.enemies.push(m);
        }
      }
    }
    hit(level, player) {
      if (this.invuln > 0) return;
      this.hp--;
      this.invuln = 70;
      G.Audio.sfx.bossHit();
      level.shake = 8;
      if (player) { player.vy = -7; player.jumpHeld = false; }
      if (this.hp <= 0) {
        launch(this);
        this.vy = -6;
        level.game.addScore(5000);
        level.addScore(this.x, this.y, 5000);
      }
    }
    onPlayer(player, level) {
      if (isStomp(player, this)) {
        if (this.invuln > 0) { player.vy = -5; return; }
        this.hit(level, player);
      } else if (this.invuln < 50) {
        level.hurtPlayer();
      }
    }
    hitByFire(level) {
      if (this.invuln > 0) return;
      if (++this.fireHits >= 5) { this.fireHits = 0; this.hit(level, null); }
      else G.Audio.sfx.bump();
    }
    render() {
      const S = G.Sprites;
      if (this.invuln > 0 && (this.invuln & 4)) return;
      const img = S.boss[this.grounded ? 0 : 1];
      G.R.sprite(img, this.x - 2, this.y + this.h - img.height + 1, this.facing > 0, this.fly);
    }
  }

  G.Blob = Blob;
  G.Snail = Snail;
  G.Spiky = Spiky;
  G.Bee = Bee;
  G.Hopper = Hopper;
  G.Boss = Boss;
  G.launchEnemy = launch;
  G.isStomp = isStomp;
})(window.GAME = window.GAME || {});
