// Player "Pip": run meter, skid, speed-scaled variable jump, spin jump, ground pound,
// wall slide/jump, crouch, carrying shells, power-ups (berry, fire flower, cloud glide), invincibility.
(function (G) {
  'use strict';

  const SMALL_H = 16, BIG_H = 26, MOUNT_H = 28, W = 12;
  const WALK = 1.5, RUN = 2.5, SPRINT = 3.2, PFULL = 70;
  const STAR_COLORS = ['#ff4a6a', '#ffd84a', '#4ae08a', '#4ab0ff'];

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
      this.spinning = false;
      this.pound = null;       // { phase: 'hold'|'drop', t }
      this.wallDir = 0;
      this.wallTimer = 0;
      this.lastWall = 0;
      this.ctrlLock = 0;
      this.holdTime = 0;
      this.lastDir = 0;
      this.gliding = false;
      this.carry = null;
      this.ride = null;
      this.star = 0;
      this.chain = 0;
      this.invuln = 0;
      this.animTimer = 0;
      this.state = 'play'; // 'play' | 'win' | 'death'
      this.flagSlide = null;
      this.winPhase = null;
      this.deathTimer = 0;
      this.sx = 1; this.sy = 1; // squash & stretch
      this.mount = null;        // Rolo the beetle while riding
      this.ramT = 0;
      this.usedDouble = false;
      this.flapT = 0;
    }

    // ---- riding Rolo
    mountOn(m) {
      this.mount = m;
      m.state = 'ridden';
      if (this.crouching) this.setCrouch(false);
      this.y -= MOUNT_H - this.h;
      this.h = MOUNT_H;
      this.usedDouble = false;
      this.ramT = 0;
      this.placeMount();
    }

    // Get off: by choice (Rolo waits) or after a hit (Rolo runs away and can be caught).
    leaveMount(runaway) {
      const m = this.mount;
      if (!m) return null;
      this.mount = null;
      const nh = this.big ? BIG_H : SMALL_H;
      this.y += this.h - nh;
      this.h = nh;
      this.ramT = 0;
      m.x = this.x + this.w / 2 - m.w / 2;
      m.y = this.y + this.h - m.h;
      m.dir = runaway ? -this.facing : this.facing;
      m.state = runaway ? 'runaway' : 'idle';
      m.runT = runaway ? 240 : 0;
      m.grace = runaway ? 50 : 40;
      m.vx = 0;
      m.vy = runaway ? -3 : 0;
      return m;
    }

    placeMount() {
      const m = this.mount;
      if (!m) return;
      m.x = this.x + this.w / 2 - m.w / 2;
      m.y = this.y + this.h - m.h;
      m.dir = this.facing;
    }

    squash(sx, sy) { this.sx = sx; this.sy = sy; }

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

    doJump(v, spin, level) {
      this.vy = -v;
      this.squash(0.78, 1.25);
      if (level) level.particles.push(new G.Puff(this.x + this.w / 2, this.y + this.h - 2));
      this.jumpBuffer = 0;
      this.coyote = 0;
      this.grounded = false;
      this.jumpHeld = true;
      this.ride = null;
      this.spinning = !!spin;
      if (spin) G.Audio.sfx.spin(); else G.Audio.sfx.jump();
    }

    update(level) {
      const In = G.Input;

      // ride a moving platform: inherit its motion
      if (this.ride) { this.x += this.ride.dx; this.y += this.ride.dy; }
      this.sx += (1 - this.sx) * 0.22;
      this.sy += (1 - this.sy) * 0.22;
      const prevBottom = this.y + this.h;

      if (this.flapT > 0) this.flapT--;
      // Y while riding: hop off Rolo
      let dismounted = false;
      if (this.mount && G.Input.justPressed('spin') && !this.pound) {
        this.leaveMount(false);
        this.vy = -7.2;
        this.grounded = false;
        this.coyote = 0;
        this.squash(0.8, 1.25);
        G.Audio.sfx.jump();
        dismounted = true;
      }

      if (this.star > 0) {
        this.star--;
        if ((this.star & 3) === 0) level.particles.push(new G.Sparkle(this.x + Math.random() * this.w, this.y + Math.random() * this.h));
        if (this.star === 0) level.onStarEnd();
      }

      if (level.water) { this.updateSwim(level, prevBottom); return; }

      // ---- ground pound: brief hang, then a fast plunge
      if (this.pound) {
        this.vx = 0;
        if (this.pound.phase === 'hold') {
          if (++this.pound.t >= 9) { this.pound.phase = 'drop'; this.vy = 7.5; }
          else this.vy = 0;
          G.Physics.moveAndCollide(this, level, false);
        } else {
          this.vy = 7.5;
          const col = G.Physics.moveAndCollide(this, level, false);
          const plat = this.landOnPlatforms(level, prevBottom);
          if (col.down || plat) {
            G.Audio.sfx.pound();
            const keepGoing = !plat && level.poundImpact(this);
            if (!keepGoing) { this.pound = null; this.grounded = true; this.coyote = 9; this.chain = 0; this.vy = 0; this.squash(1.45, 0.62); }
          }
        }
        this.checkHazards(level);
        if (this.invuln > 0) this.invuln--;
        return;
      }

      let dir = (In.down('right') ? 1 : 0) - (In.down('left') ? 1 : 0);
      if (this.ctrlLock > 0) { this.ctrlLock--; dir = 0; }
      // auto-run: holding one direction for half a second switches to running
      if (dir !== 0 && dir === this.lastDir) this.holdTime++; else this.holdTime = 0;
      this.lastDir = dir;
      const run = In.down('run') || (In.settings.autoRun && this.holdTime > 30 && !this.carry);

      // crouch (big forms only)
      const wantCrouch = this.big && !this.mount && In.down('down') && this.grounded && !this.carry;
      if (wantCrouch) this.setCrouch(true);
      else if (this.crouching && this.canStand(level)) this.setCrouch(false);

      const maxSpeed = run ? (this.pMeter >= PFULL ? SPRINT : RUN) : WALK;
      const moving = dir !== 0 && !(this.crouching && this.grounded);

      if (moving) {
        if (this.grounded && this.vx * dir < -0.8) {
          this.vx += dir * 0.35;
          this.skidding = true;
          if ((G.game.animFrame & 3) === 0) level.particles.push(new G.Puff(this.x + this.w / 2, this.y + this.h - 2));
        } else {
          this.skidding = false;
          let a = this.grounded ? (run ? 0.1 : 0.14) : 0.09;
          if (this.grounded && level.slippery) a *= 0.55;
          if (Math.abs(this.vx) < maxSpeed || this.vx * dir < 0) this.vx += dir * a;
          else if (this.grounded) this.vx -= Math.sign(this.vx) * 0.08;
        }
        this.facing = this.skidding ? Math.sign(this.vx) || dir : dir;
      } else {
        this.skidding = false;
        let f = this.grounded ? (this.crouching ? 0.2 : 0.12) : 0.02;
        if (this.grounded && level.slippery) f *= 0.25;
        if (this.vx > 0) this.vx = Math.max(0, this.vx - f);
        else if (this.vx < 0) this.vx = Math.min(0, this.vx + f);
      }
      this.vx = Math.max(-SPRINT, Math.min(SPRINT, this.vx));

      // B while riding: Rolo charges forward, horn first
      if (this.mount && In.justPressed('run') && this.ramT === 0) { this.ramT = 26; this.squash(1.2, 0.85); G.Audio.sfx.bump(); }
      if (this.ramT > 0) {
        this.ramT--;
        this.vx = this.facing * 3.8;
        if ((G.game.animFrame & 1) === 0) level.particles.push(new G.Puff(this.x + (this.facing > 0 ? 0 : this.w), this.y + this.h - 2));
      }

      if (this.grounded && run && Math.abs(this.vx) >= RUN - 0.15) this.pMeter = Math.min(PFULL, this.pMeter + 2);
      else if (this.grounded) this.pMeter = Math.max(0, this.pMeter - 1);

      // ---- jumps: buffered + coyote; spin jump on Y; wall jump off a wall slide
      if ((In.justPressed('jump') || In.justPressed('spin')) && !dismounted) {
        this.jumpBuffer = 12;
        this.bufferSpin = In.justPressed('spin');
      } else if (this.jumpBuffer > 0) this.jumpBuffer--;
      if (this.coyote > 0) this.coyote--;
      if (this.jumpBuffer > 0) {
        if (this.coyote > 0) {
          if (this.bufferSpin) this.doJump(5.4 + Math.abs(this.vx) * 0.4, true, level);
          else this.doJump(6.0 + Math.abs(this.vx) * 0.45, false, level);
        } else if (this.wallTimer > 0) {
          this.doJump(6.6, this.bufferSpin, level);
          this.vx = -this.lastWall * 2.4;
          this.facing = -this.lastWall;
          this.ctrlLock = 10;
          this.wallTimer = 0;
          level.particles.push(new G.Puff(this.lastWall > 0 ? this.x + this.w : this.x, this.y + this.h / 2));
        } else if (this.mount && !this.usedDouble && In.justPressed('jump')) {
          // Rolo's wing beat: one extra jump in mid-air
          this.doJump(5.6, false, level);
          this.usedDouble = true;
          this.flapT = 24;
          level.particles.push(new G.Puff(this.x - 2, this.y + this.h - 6));
          level.particles.push(new G.Puff(this.x + this.w + 2, this.y + this.h - 6));
        }
      }
      if (this.mount) this.spinning = false;
      const holding = In.down('jump') || In.down('spin');
      if (!holding) this.jumpHeld = false;
      this.grav = this.vy < 0 ? (this.jumpHeld ? 0.32 : 0.75) : 0.5;

      // cloud form: hold jump while falling to glide
      this.gliding = this.form === 'cloud' && !this.mount && this.vy > 0 && holding && !this.grounded;
      if (this.gliding) { this.grav = 0.06; this.vy = Math.min(this.vy, 0.9); }

      // ground pound: press down in mid-air (not diagonally, to avoid accidental pounds)
      if (!this.mount && !this.grounded && In.justPressed('down') && !In.down('left') && !In.down('right') && this.coyote === 0) {
        this.pound = { phase: 'hold', t: 0 };
        this.spinning = false;
        this.wallTimer = 0;
        if (this.carry) { this.carry.drop(); this.carry = null; }
        G.Audio.sfx.spin();
        return;
      }

      // fireball
      if (this.form === 'fire' && !this.mount && In.justPressed('run') && !this.carry && level.shots.length < 2) {
        level.shots.push(new G.Fireball(this.cx + this.facing * 6, this.y + (this.crouching ? 6 : 8), this.facing));
        G.Audio.sfx.fire();
      }

      const fallSpeed = this.vy;
      const col = G.Physics.moveAndCollide(this, level, true);
      const wasGrounded = this.grounded;
      const plat = this.landOnPlatforms(level, prevBottom);
      this.grounded = col.down || plat;
      if (col.down && !plat) this.lastSafe = { x: this.x, y: this.y };
      if (this.grounded) {
        this.coyote = 9;
        this.chain = 0;
        this.spinning = false;
        this.usedDouble = false;
        if (!wasGrounded && this.vy === 0) {
          level.particles.push(new G.Puff(this.x + this.w / 2, this.y + this.h - 2));
          const k = Math.min(1, Math.max(0, fallSpeed) / 7);
          this.squash(1 + 0.35 * k, 1 - 0.3 * k);
        }
        // dust trail at full sprint
        if (this.pMeter >= PFULL && Math.abs(this.vx) > 2.6 && (G.game.animFrame & 3) === 0) {
          level.particles.push(new G.Puff(this.x + (this.vx > 0 ? 0 : this.w), this.y + this.h - 2));
        }
      }
      if (col.up) {
        for (const h of col.hit) if (h.side === 'up') level.bumpBlock(h.col, h.row);
      }

      // wall slide: pressing into a wall while falling
      this.wallDir = 0;
      if (!this.grounded && this.vy > 0 && !this.carry && !this.mount) {
        if (col.right && dir > 0) this.wallDir = 1;
        else if (col.left && dir < 0) this.wallDir = -1;
      }
      if (this.wallDir) {
        this.vy = Math.min(this.vy, 1.3);
        this.wallTimer = 7;
        this.lastWall = this.wallDir;
        this.spinning = false;
        if ((G.game.animFrame & 7) === 0) level.particles.push(new G.Puff(this.wallDir > 0 ? this.x + this.w : this.x, this.y + this.h - 4));
      } else if (this.wallTimer > 0) this.wallTimer--;

      this.placeMount();
      this.checkHazards(level);
      if (this.invuln > 0) this.invuln--;
      this.animTimer += Math.abs(this.vx);
    }

    // ---- swimming: A strokes upward, up/down steer, slow sink, currents push sideways
    updateSwim(level, prevBottom) {
      const In = G.Input;
      const dir = (In.down('right') ? 1 : 0) - (In.down('left') ? 1 : 0);
      if (dir) { this.vx += dir * 0.08; this.facing = dir; }
      else this.vx *= 0.95;
      const cur = level.currentAt(this.cx, this.y + this.h / 2);
      const maxX = cur ? 2.6 : 1.5;
      if (cur) this.vx += cur * 0.13;
      this.vx = Math.max(-maxX, Math.min(maxX, this.vx));
      if (In.justPressed('jump') || In.justPressed('spin')) {
        this.vy = -2.7;
        this.swimT = 16;
        this.squash(0.85, 1.15);
        level.particles.push(new G.Bubble(this.cx + this.facing * 4, this.y + 2));
        G.Audio.sfx.swim();
      }
      if (this.swimT > 0) this.swimT--;
      if (In.down('up')) this.vy -= 0.07;
      const down = In.down('down');
      this.grav = down ? 0.16 : 0.07;
      this.spinning = false;
      this.wallDir = 0;
      if (this.form === 'fire' && In.justPressed('run') && level.shots.length < 2) {
        level.shots.push(new G.Fireball(this.cx + this.facing * 6, this.y + 8, this.facing));
        G.Audio.sfx.fire();
      }
      const col = G.Physics.moveAndCollide(this, level, true);
      this.vy = Math.max(-3, Math.min(this.vy, down ? 2.2 : 1.2));
      this.grounded = col.down || this.landOnPlatforms(level, prevBottom);
      if (col.down) this.lastSafe = { x: this.x, y: this.y };
      if (col.up) for (const h of col.hit) if (h.side === 'up') level.bumpBlock(h.col, h.row);
      if ((G.game.animFrame % 50) === 0) level.particles.push(new G.Bubble(this.cx + this.facing * 4, this.y + 3));
      this.checkHazards(level);
      if (this.invuln > 0) this.invuln--;
      this.animTimer += Math.abs(this.vx) + 0.4;
    }

    // Land on moving lifts (one-way from above).
    landOnPlatforms(level, prevBottom) {
      this.ride = null;
      if (this.vy < 0) return false;
      for (const pl of level.platforms) {
        if (this.x + this.w <= pl.x + 1 || this.x >= pl.x + pl.w - 1) continue;
        const bottom = this.y + this.h;
        if (prevBottom <= pl.y + 4 + Math.abs(pl.dy) && bottom >= pl.y) {
          this.y = pl.y - this.h;
          this.vy = 0;
          this.ride = pl;
          return true;
        }
      }
      return false;
    }

    // Stomp bounce used by enemies.
    bounce() {
      this.squash(0.82, 1.22);
      const held = G.Input.down('jump') || G.Input.down('spin');
      this.vy = held ? -6.8 : -4.2;
      this.jumpHeld = held;
    }

    checkHazards(level) {
      if (this.star > 0) return;
      const c0 = Math.floor(this.x / 16), c1 = Math.floor((this.x + this.w - 1) / 16);
      const r = Math.floor((this.y + this.h - 1) / 16);
      for (let c = c0; c <= c1; c++) if (G.Tiles.isHazard(level.tileAt(c, r))) { level.killPlayer('hazard'); return; }
    }

    grow() {
      if (this.form !== 'small') return;
      if (this.mount) { this.form = 'big'; this.invuln = 20; return; } // rider height is fixed on Rolo
      this.form = 'big';
      this.y -= BIG_H - this.h;
      this.h = BIG_H;
      this.invuln = 20;
    }

    powerUp(kind) {
      this.grow();
      if (kind === 'flower') this.form = 'fire';
      if (kind === 'cloud') this.form = 'cloud';
    }

    shrink() {
      if (!this.crouching) this.y += this.h - SMALL_H;
      this.h = SMALL_H;
      this.crouching = false;
      this.form = 'small';
      this.invuln = 120;
    }

    startWin(noFlag) {
      this.state = 'win';
      this.vx = 0; this.vy = 0;
      this.pound = null;
      this.spinning = false;
      this.flagSlide = noFlag ? null : 0;
      this.winPhase = noFlag ? 'walk' : 'slide';
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
        this.facing = 1;
        G.Physics.moveAndCollide(this, level, true);
        this.grounded = true;
        this.animTimer += 2;
      }
    }

    startDeath() {
      this.state = 'death';
      this.deathTimer = 0;
      this.vy = -6;
      this.vx = 0;
      this.pound = null;
      if (this.carry) { this.carry.drop(); this.carry = null; }
      if (this.mount) this.leaveMount(true);
    }

    updateDeath() {
      this.deathTimer++;
      if (this.deathTimer > 18) this.vy += 0.5;
      this.y += this.vy;
    }

    render() {
      const S = G.Sprites, R = G.R;
      if (this.invuln > 0 && this.state === 'play' && (G.game.animFrame & 2)) return;
      const set = S.heroSets[this.form] || S.heroSets.big;
      let img, flip = this.facing < 0, flipY = false;
      const walkFrame = (Math.floor(this.animTimer / 7) % 2) === 0;
      const moving = Math.abs(this.vx) > 0.2;
      if (this.state === 'death') {
        img = S.heroSets.small.jump;
      } else if (this.pound) {
        img = this.big ? S.heroCrouch[this.form] : set.idle;
        if (this.pound.phase === 'hold') flip = (this.pound.t >> 1) & 1;
      } else if (this.spinning) {
        img = set.idle;
        flip = (G.game.animFrame >> 2) & 1;
      } else if (this.crouching) {
        img = S.heroCrouch[this.form];
      } else if (this.wallDir) {
        img = set.jump;
        flip = this.wallDir > 0;
      } else if (G.game.level && G.game.level.water && !this.grounded && this.state === 'play') {
        img = this.swimT > 8 || ((this.animTimer >> 4) & 1) ? set.jump : set.walk;
      } else if (!this.grounded && this.state === 'play') {
        img = set.jump;
      } else if (this.skidding) {
        img = set.idle;
      } else if (this.state === 'win') {
        img = (G.game.animFrame >> 3) & 1 ? set.jump : set.walk; // cheering with arms up
      } else if (moving) {
        img = walkFrame ? set.walk : set.idle;
      } else {
        img = set.idle;
      }
      // blink every few seconds
      const blinking = (G.game.animFrame % 170) < 7;
      if (blinking && img === set.idle && set.blink) img = set.blink;
      if (this.star > 0) img = G.Gfx.tint(img, STAR_COLORS[(G.game.animFrame >> 2) % STAR_COLORS.length]);
      if (this.mount && this.state !== 'death') {
        // Rolo underneath, rider sitting in the saddle
        this.placeMount();
        let b;
        if (this.ramT > 0) b = S.beetleRam;
        else if (this.flapT > 0 && ((G.game.animFrame >> 1) & 1)) b = S.beetleWings;
        else b = S.beetle[moving && this.grounded ? Math.floor(this.animTimer / 6) % 2 : 0];
        if (this.star > 0) b = G.Gfx.tint(b, STAR_COLORS[(G.game.animFrame >> 2) % STAR_COLORS.length]);
        const bottom = this.y + this.h + 1;
        const bw = b.width * this.sx, bh = b.height * this.sy;
        R.spriteXf(b, this.x + this.w / 2 - bw / 2, bottom - bh, bw, bh, this.facing < 0);
        const rider = !this.grounded ? set.jump : ((G.game.animFrame % 170) < 7 && set.blink ? set.blink : set.idle);
        const rimg = this.star > 0 ? G.Gfx.tint(rider, STAR_COLORS[(G.game.animFrame >> 2) % STAR_COLORS.length]) : rider;
        const seat = bottom - bh + 5;
        R.spriteXf(rimg, this.x + this.w / 2 - rimg.width / 2 - this.facing * 2, seat - rimg.height * this.sy, rimg.width, rimg.height * this.sy, this.facing < 0);
        return;
      }
      // squash & stretch around the feet; gentle breathing while standing still
      let sx = this.sx, sy = this.sy;
      if (this.grounded && !moving && this.state === 'play' && !this.crouching) sy *= 1 + Math.sin(G.game.animFrame * 0.08) * 0.03;
      const w2 = img.width * sx, h2 = img.height * sy;
      R.spriteXf(img, this.x + this.w / 2 - w2 / 2, this.y + this.h + 1 - h2, w2, h2, flip, flipY);
      if (this.gliding) {
        // cloud puff under the feet while gliding
        R.sprite(S.cloudItem, this.x + this.w / 2 - 9, this.y + this.h - 4);
      }
    }
  }

  G.Player = Player;
})(window.GAME = window.GAME || {});
