// Player: run, variable jump, grow/shrink, win/death animations.
(function (G) {
  'use strict';

  const SMALL_H = 16, BIG_H = 26, W = 12;

  class Player {
    constructor(x, y, big) {
      this.x = x;
      this.big = !!big;
      this.w = W;
      this.h = this.big ? BIG_H : SMALL_H;
      this.y = y - this.h + 16; // align feet roughly to spawn tile
      this.vx = 0;
      this.vy = 0;
      this.facing = 1;
      this.grounded = false;
      this.coyote = 0;
      this.jumpBuffer = 0;
      this.jumpHeld = false;
      this.invuln = 0;
      this.animTimer = 0;
      this.state = 'play'; // 'play' | 'win' | 'death'
      this.flagSlide = null;
      this.deathTimer = 0;
    }

    get cx() { return this.x + this.w / 2; }

    update(level) {
      const In = G.Input;
      const P = G.Physics;

      const run = In.down('run');
      const maxSpeed = run ? 2.8 : 1.7;
      const accel = run ? 0.45 : 0.32;
      const friction = 0.4;

      if (In.down('left')) { this.vx -= accel; this.facing = -1; }
      else if (In.down('right')) { this.vx += accel; this.facing = 1; }
      else {
        if (this.vx > 0) this.vx = Math.max(0, this.vx - friction);
        else if (this.vx < 0) this.vx = Math.min(0, this.vx + friction);
      }
      this.vx = Math.max(-maxSpeed, Math.min(maxSpeed, this.vx));

      // jump buffering + coyote time
      if (In.justPressed('jump')) this.jumpBuffer = 8;
      else if (this.jumpBuffer > 0) this.jumpBuffer--;
      if (this.coyote > 0) this.coyote--;

      if (this.jumpBuffer > 0 && this.coyote > 0) {
        this.vy = -7.4;
        this.jumpBuffer = 0;
        this.coyote = 0;
        this.grounded = false;
        this.jumpHeld = true;
        G.Audio.sfx.jump();
      }
      // variable jump height: release cuts upward velocity
      if (!In.down('jump') && this.vy < 0 && this.jumpHeld) {
        this.vy *= 0.45;
        this.jumpHeld = false;
      }
      if (!In.down('jump')) this.jumpHeld = false;

      const col = P.moveAndCollide(this, level, true);
      this.grounded = col.down;
      if (col.down) this.coyote = 6;
      if (col.up) {
        // bump blocks overhead
        for (const h of col.hit) {
          if (h.side === 'up') level.bumpBlock(h.col, h.row);
        }
      }

      // hazards (spikes)
      this.checkHazards(level);

      if (this.invuln > 0) this.invuln--;
      this.animTimer += Math.abs(this.vx);
    }

    checkHazards(level) {
      const Tiles = G.Tiles;
      const TILE = 16;
      const c0 = Math.floor(this.x / TILE);
      const c1 = Math.floor((this.x + this.w - 1) / TILE);
      const r = Math.floor((this.y + this.h - 1) / TILE);
      for (let c = c0; c <= c1; c++) {
        if (Tiles.isHazard(level.tileAt(c, r))) { level.killPlayer(); return; }
      }
    }

    grow() {
      if (this.big) return;
      this.big = true;
      const old = this.h;
      this.h = BIG_H;
      this.y -= (this.h - old);
      this.invuln = 20;
    }

    shrink() {
      this.big = false;
      const old = this.h;
      this.h = SMALL_H;
      this.y += (old - this.h);
      this.invuln = 90;
    }

    startWin() {
      this.state = 'win';
      this.vx = 0; this.vy = 0;
      this.flagSlide = 0;
      this.winPhase = 'slide';
    }

    updateWin(level) {
      if (this.winPhase === 'slide') {
        this.flagSlide += 2;
        this.y += 1.5;
        const groundY = level.pixelH - 16 - this.h;
        if (this.y >= groundY || this.flagSlide >= 16 * 7) {
          this.y = Math.min(this.y, groundY);
          this.winPhase = 'walk';
          this.facing = 1;
        }
      } else {
        // walk toward castle
        this.vx = 1.2;
        G.Physics.moveAndCollide(this, level, true);
        this.animTimer += 2;
      }
    }

    startDeath() {
      this.state = 'death';
      this.deathTimer = 0;
      this.vy = -6;
      this.vx = 0;
    }

    updateDeath() {
      this.deathTimer++;
      if (this.deathTimer > 18) this.vy += 0.5;
      this.y += this.vy;
    }

    render() {
      const S = G.Sprites;
      const R = G.R;
      if (this.invuln > 0 && this.state === 'play' && (G.game.animFrame & 2)) {
        // blink while invulnerable
        return;
      }
      let img;
      const moving = Math.abs(this.vx) > 0.2;
      const walkFrame = (Math.floor(this.animTimer / 6) % 2) === 0;
      if (this.big) {
        if (this.state === 'death') img = S.heroSmallJump;
        else if (!this.grounded && this.state === 'play') img = S.heroBigJump;
        else if (moving || this.state === 'win') img = walkFrame ? S.heroBigWalk : S.heroBigIdle;
        else img = S.heroBigIdle;
      } else {
        if (this.state === 'death') img = S.heroSmallJump;
        else if (!this.grounded && this.state === 'play') img = S.heroSmallJump;
        else if (moving || this.state === 'win') img = walkFrame ? S.heroSmallWalk : S.heroSmallIdle;
        else img = S.heroSmallIdle;
      }
      // align sprite bottom with hitbox bottom
      const drawY = this.y + this.h - img.height;
      R.sprite(img, this.x + (this.w - img.width) / 2, drawY, this.facing < 0);
    }
  }

  G.Player = Player;
})(window.GAME = window.GAME || {});
