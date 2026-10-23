// Player "Pip": run meter, skid, speed-scaled variable jump, crouch, power-ups, fireballs.
(function (G) {
  'use strict';

  const SMALL_H = 16, BIG_H = 26, W = 12;
  const WALK = 1.5, RUN = 2.5, SPRINT = 3.2, PFULL = 70;

  class Player {
    constructor(x, y, form) {
      this.form = form || 'small';
      this.w = W;
      this.h = this.big ? BIG_H : SMALL_H;
      this.x = x;
      this.y = y - this.h + 16;
      this.vx = 0; this.vy = 0;
      this.facing = 1;
      this.grounded = false;
      this.coyote = 0;
      this.jumpBuffer = 0;
      this.jumpHeld = false;
      this.grav = 0.5;
      this.pMeter = 0;
      this.skidding = false;
      this.crouching = false;
      this.chain = 0;
      this.invuln = 0;
      this.animTimer = 0;
      this.state = 'play'; // 'play' | 'win' | 'death'
      this.flagSlide = null;
      this.winPhase = null;
      this.deathTimer = 0;
    }

    get big() { return this.form !== 'small'; }
    get cx() { return this.x + this.w / 2; }

    canStand(level) {
      const rise = BIG_H - SMALL_H;
      const c0 = Math.floor(this.x / 16), c1 = Math.floor((this.x + this.w - 1) / 16);
      const r0 = Math.floor((this.y - rise) / 16), r1 = Math.floor((this.y - 1) / 16);
      for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (G.Tiles.isSolid(level.tileAt(c, r))) return false;
      return true;
    }

    setCrouch(on) {
      if (on === this.crouching) return;
      const rise = BIG_H - SMALL_H;
      if (on) { this.h = SMALL_H; this.y += rise; }
      else { this.h = BIG_H; this.y -= rise; }
      this.crouching = on;
    }

    update(level) {
      const In = G.Input;
      const dir = (In.down('right') ? 1 : 0) - (In.down('left') ? 1 : 0);
      const run = In.down('run');

      // crouch (big forms only)
      const wantCrouch = this.big && In.down('down') && this.grounded;
      if (wantCrouch) this.setCrouch(true);
      else if (this.crouching && this.canStand(level)) this.setCrouch(false);

      const maxSpeed = run ? (this.pMeter >= PFULL ? SPRINT : RUN) : WALK;
      const moving = dir !== 0 && !(this.crouching && this.grounded);

      if (moving) {
        if (this.grounded && this.vx * dir < -0.8) {
          // skid: hard braking when reversing at speed
          this.vx += dir * 0.35;
          this.skidding = true;
          if ((G.game.animFrame & 3) === 0) level.particles.push(new G.Puff(this.x + this.w / 2, this.y + this.h - 2));
        } else {
          this.skidding = false;
          const a = this.grounded ? (run ? 0.1 : 0.14) : 0.09;
          if (Math.abs(this.vx) < maxSpeed || this.vx * dir < 0) this.vx += dir * a;
          else if (this.grounded) this.vx -= Math.sign(this.vx) * 0.08;
        }
        this.facing = this.skidding ? Math.sign(this.vx) || dir : dir;
      } else {
        this.skidding = false;
        const f = this.grounded ? (this.crouching ? 0.2 : 0.12) : 0.02;
        if (this.vx > 0) this.vx = Math.max(0, this.vx - f);
        else if (this.vx < 0) this.vx = Math.min(0, this.vx + f);
      }
      this.vx = Math.max(-SPRINT, Math.min(SPRINT, this.vx));

      // run meter: builds while sprinting on the ground, drains otherwise
      if (this.grounded && run && Math.abs(this.vx) >= RUN - 0.15) this.pMeter = Math.min(PFULL, this.pMeter + 2);
      else if (this.grounded) this.pMeter = Math.max(0, this.pMeter - 1);

      // jump (buffered + coyote); faster runs jump higher
      if (In.justPressed('jump')) this.jumpBuffer = 8;
      else if (this.jumpBuffer > 0) this.jumpBuffer--;
      if (this.coyote > 0) this.coyote--;
      if (this.jumpBuffer > 0 && this.coyote > 0) {
        this.vy = -(6.0 + Math.abs(this.vx) * 0.45);
        this.jumpBuffer = 0;
        this.coyote = 0;
        this.grounded = false;
        this.jumpHeld = true;
        G.Audio.sfx.jump();
      }
      if (!In.down('jump')) this.jumpHeld = false;
      this.grav = this.vy < 0 ? (this.jumpHeld ? 0.32 : 0.75) : 0.5;

      // fireball
      if (this.form === 'fire' && In.justPressed('run') && level.shots.length < 2) {
        level.shots.push(new G.Fireball(this.cx + this.facing * 6, this.y + (this.crouching ? 6 : 8), this.facing));
        G.Audio.sfx.fire();
      }

      const col = G.Physics.moveAndCollide(this, level, true);
      const wasGrounded = this.grounded;
      this.grounded = col.down;
      if (col.down) {
        this.coyote = 6;
        this.chain = 0;
        if (!wasGrounded && this.vy === 0) level.particles.push(new G.Puff(this.x + this.w / 2, this.y + this.h - 2));
      }
      if (col.up) {
        for (const h of col.hit) if (h.side === 'up') level.bumpBlock(h.col, h.row);
      }

      this.checkHazards(level);
      if (this.invuln > 0) this.invuln--;
      this.animTimer += Math.abs(this.vx);
    }

    // Stomp bounce used by enemies.
    bounce() {
      const held = G.Input.down('jump');
      this.vy = held ? -6.8 : -4.2;
      this.jumpHeld = held;
    }

    checkHazards(level) {
      const c0 = Math.floor(this.x / 16), c1 = Math.floor((this.x + this.w - 1) / 16);
      const r = Math.floor((this.y + this.h - 1) / 16);
      for (let c = c0; c <= c1; c++) if (G.Tiles.isHazard(level.tileAt(c, r))) { level.killPlayer(); return; }
    }

    grow() {
      if (this.form !== 'small') return;
      this.form = 'big';
      this.y -= BIG_H - this.h;
      this.h = BIG_H;
      this.invuln = 20;
    }

    powerUp(kind) {
      this.grow();
      if (kind === 'flower') this.form = 'fire';
    }

    shrink() {
      if (!this.crouching) this.y += this.h - SMALL_H;
      this.h = SMALL_H;
      this.crouching = false;
      this.form = 'small';
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
        if (this.y + this.h >= level.groundY || this.flagSlide >= 16 * 7) {
          this.y = Math.min(this.y, level.groundY - this.h);
          this.winPhase = 'walk';
          this.facing = 1;
        }
      } else {
        this.vx = 1.2;
        this.grav = 0.5;
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
      const S = G.Sprites, R = G.R;
      if (this.invuln > 0 && this.state === 'play' && (G.game.animFrame & 2)) return;
      let img;
      const walkFrame = (Math.floor(this.animTimer / 7) % 2) === 0;
      const moving = Math.abs(this.vx) > 0.2;
      if (this.state === 'death') {
        img = S.heroSets.small.jump;
      } else if (this.crouching) {
        img = S.heroCrouch[this.form];
      } else {
        const set = S.heroSets[this.form];
        if (!this.grounded && this.state === 'play') img = set.jump;
        else if (this.skidding) img = set.idle;
        else if (moving || this.state === 'win') img = walkFrame ? set.walk : set.idle;
        else img = set.idle;
      }
      const drawY = this.y + this.h - img.height + 1;
      R.sprite(img, this.x + (this.w - img.width) / 2, drawY, this.facing < 0);
    }
  }

  G.Player = Player;
})(window.GAME = window.GAME || {});
