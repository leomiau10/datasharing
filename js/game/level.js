// Level: parses a tilemap, owns entities, runs update/render, handles win/lose.
(function (G) {
  'use strict';

  const TILE = 16;
  const STOMP_POINTS = [100, 200, 400, 800, 1000, 2000, 4000, 8000];

  class Level {
    constructor(def, game, startX) {
      this.def = def;
      this.game = game;
      this.theme = def.theme || 'overworld';
      this.rows = def.map.slice();
      this.h = this.rows.length;
      this.w = 0;
      for (const r of this.rows) this.w = Math.max(this.w, r.length);
      this.pixelW = this.w * TILE;
      this.pixelH = this.h * TILE;
      this.groundY = (def.groundRow || 12) * TILE;

      this.grid = [];
      this.questionState = {};
      this.bumps = {};
      this.enemies = [];
      this.items = [];
      this.shots = [];
      this.particles = [];
      this.flagX = null;
      this.checkpoint = null;
      this.playerStart = { x: TILE * 2, y: TILE * 2 };

      this.parse();
      if (startX != null) this.playerStart.x = startX;

      this.player = new G.Player(this.playerStart.x, this.playerStart.y, game.form);
      this.cleared = false;
      this.failed = false;
      this.outTimer = 0;
      this.time = 300;
      this.timeAcc = 0;
      this.age = 0;
      this.bg = new G.Background(this.theme);
      this.decor = this.buildDecor();
      this.camX = null;
      this.camY = 0;
      this.updateCamera(true);
    }

    parse() {
      const Tiles = G.Tiles;
      for (let r = 0; r < this.h; r++) {
        const row = this.rows[r];
        this.grid[r] = [];
        for (let c = 0; c < this.w; c++) {
          const ch = row[c] || ' ';
          this.grid[r][c] = Tiles.CHAR[ch] != null ? Tiles.CHAR[ch] : Tiles.T.EMPTY;
          const sp = Tiles.SPAWN[ch];
          if (sp) {
            this.grid[r][c] = Tiles.T.EMPTY;
            this.spawn(sp, c, r);
          }
        }
      }
      if (this.flagX == null) this.flagX = this.pixelW - TILE * 3;
    }

    spawn(type, c, r) {
      const x = c * TILE, y = r * TILE;
      switch (type) {
        case 'player': this.playerStart = { x: x, y: y }; break;
        case 'goomba': this.enemies.push(new G.Blob(x, y)); break;
        case 'koopa': this.enemies.push(new G.Snail(x, y)); break;
        case 'coin': this.items.push(new G.Coin(x, y)); break;
        case 'flag': this.flagX = x; break;
        case 'checkpoint': this.checkpoint = { x: x, y: y + TILE, reached: false }; break;
        case 'mushroom_block':
          this.grid[r][c] = G.Tiles.T.QUESTION;
          this.questionState[c + ',' + r] = 'power';
          break;
      }
    }

    // Foreground bushes standing on the ground (overworld-like themes only).
    buildDecor() {
      const d = [];
      if (this.theme !== 'overworld' && this.theme !== 'dusk') return d;
      const rnd = G.Gfx.rng(this.w * 13 + 7);
      for (let i = 0; i < Math.floor(this.w / 9); i++) {
        const c = 4 + Math.floor(rnd() * (this.w - 8));
        if (this.tileAt(c, 12) === G.Tiles.T.GROUND && this.tileAt(c, 11) === G.Tiles.T.EMPTY) {
          d.push({ img: G.Sprites.bush, x: c * TILE - 8, y: this.groundY - G.Sprites.bush.height + 1 });
        }
      }
      return d;
    }

    tileAt(c, r) {
      if (c < 0 || c >= this.w || r < 0) return G.Tiles.T.BLOCK;
      if (r >= this.h) return G.Tiles.T.EMPTY;
      const id = this.grid[r][c];
      return id == null ? G.Tiles.T.EMPTY : id;
    }

    setTile(c, r, id) {
      if (r >= 0 && r < this.h && c >= 0 && c < this.w) this.grid[r][c] = id;
    }

    // Knock enemies standing on a bumped block.
    bumpEnemiesAbove(c, r) {
      for (const e of this.enemies) {
        if (e.dying) continue;
        if (e.x + e.w > c * TILE && e.x < c * TILE + TILE && Math.abs((e.y + e.h) - r * TILE) < 4) {
          G.launchEnemy(e);
          this.game.addScore(100);
          this.addScore(e.x, e.y, 100);
        }
      }
    }

    bumpBlock(c, r) {
      const T = G.Tiles.T;
      const id = this.tileAt(c, r);
      if (id === T.QUESTION) {
        const key = c + ',' + r;
        if (this.questionState[key] === 'used') { G.Audio.sfx.bump(); return; }
        const kind = this.questionState[key];
        this.setTile(c, r, T.USED);
        this.questionState[key] = 'used';
        if (kind === 'power') {
          const small = this.player.form === 'small';
          this.items.push(small ? new G.Berry(c * TILE, r * TILE - TILE) : new G.Flower(c * TILE, r * TILE - TILE));
          G.Audio.sfx.powerup();
        } else {
          this.particles.push(new G.CoinPop(c * TILE + 3, r * TILE - TILE));
          this.game.addCoin();
          G.Audio.sfx.coin();
        }
        this.bumps[key] = 8;
        this.bumpEnemiesAbove(c, r);
      } else if (id === T.BRICK) {
        if (this.player.big) {
          this.setTile(c, r, T.EMPTY);
          for (let i = 0; i < 4; i++) {
            this.particles.push(new G.Debris(c * TILE + 8, r * TILE + 8, (i % 2 ? 1 : -1) * (1 + Math.random()), -2 - Math.random() * 2));
          }
          this.bumpEnemiesAbove(c, r);
          G.Audio.sfx.bump();
        } else {
          this.bumps[c + ',' + r] = 8;
          this.bumpEnemiesAbove(c, r);
          G.Audio.sfx.bump();
        }
      } else {
        G.Audio.sfx.bump();
      }
    }

    addScore(x, y, val) { this.particles.push(new G.FloatText(x, y, '+' + val)); }

    // Consecutive stomps without touching the ground give bigger rewards (1UP at the end).
    stompScore(e, player) {
      const i = player.chain;
      player.chain++;
      if (i >= STOMP_POINTS.length) {
        this.game.lives++;
        this.particles.push(new G.FloatText(e.x, e.y, '1UP'));
        G.Audio.sfx.powerup();
        return;
      }
      this.game.addScore(STOMP_POINTS[i]);
      this.addScore(e.x, e.y, STOMP_POINTS[i]);
    }

    update(dt) {
      const player = this.player;

      if (this.cleared) {
        this.outTimer += dt;
        player.updateWin(this);
        this.updateParticles();
        this.updateCamera();
        if (this.outTimer > 2.2) this.game.onLevelCleared();
        return;
      }
      if (this.failed) {
        this.outTimer += dt;
        player.updateDeath();
        this.updateCamera();
        if (this.outTimer > 2.0) this.game.onLevelFailed();
        return;
      }

      this.age += dt;
      this.timeAcc += dt;
      if (this.timeAcc >= 1) { this.timeAcc -= 1; this.time--; if (this.time <= 0) this.killPlayer(); }

      player.update(this);
      this.updateCheckpoint();

      if (this.flagX != null && player.x + player.w >= this.flagX && !this.cleared) this.clearLevel();
      if (player.y > this.pixelH + 40) this.killPlayer();

      for (const e of this.enemies) e.update(this);
      for (const e of this.enemies) {
        if (e.dying || !e.alive) continue;
        if (G.Physics.aabb(player, e)) e.onPlayer(player, this);
      }
      this.enemies = this.enemies.filter((e) => !e.remove);

      for (const it of this.items) it.update(this);
      this.items = this.items.filter((it) => !it.remove);
      for (const s of this.shots) s.update(this);
      this.shots = this.shots.filter((s) => !s.remove);

      for (const k in this.bumps) { if (--this.bumps[k] <= 0) delete this.bumps[k]; }

      this.updateParticles();
      this.updateCamera();
    }

    updateCheckpoint() {
      const cp = this.checkpoint;
      if (!cp || cp.reached) return;
      if (G.Physics.aabb(this.player, { x: cp.x, y: cp.y - 32, w: 12, h: 32 })) {
        cp.reached = true;
        this.game.checkpoints[this.game.levelIndex] = cp.x;
        this.particles.push(new G.Sparkle(cp.x + 6, cp.y - 28));
        G.Audio.sfx.powerup();
      }
    }

    updateParticles() {
      for (const p of this.particles) p.update();
      this.particles = this.particles.filter((p) => !p.remove);
    }

    clearLevel() {
      this.cleared = true;
      this.outTimer = 0;
      this.player.startWin();
      this.game.addScore(Math.max(0, this.time) * 10);
      G.Audio.stopMusic();
      G.Audio.sfx.flag();
    }

    // Pits, spikes and timeout kill regardless of power-up.
    killPlayer() {
      if (this.failed || this.cleared) return;
      this.failed = true;
      this.outTimer = 0;
      this.player.startDeath();
      G.Audio.stopMusic();
      G.Audio.sfx.die();
    }

    // Contact damage: power-ups are lost first, then a life.
    hurtPlayer() {
      const p = this.player;
      if (p.invuln > 0 || this.cleared || this.failed) return;
      if (p.big) {
        p.shrink();
        G.Audio.sfx.hurt();
      } else {
        this.killPlayer();
      }
    }

    updateCamera(snap) {
      const p = this.player;
      const W = G.R.BASE_W, H = G.R.BASE_H;
      let tx = p.cx - W / 2 + p.facing * 24;
      tx = Math.max(0, Math.min(tx, Math.max(0, this.pixelW - W)));
      if (this.camX == null || snap) this.camX = tx;
      else this.camX += (tx - this.camX) * 0.12;
      let ty = (p.y + p.h / 2) - H / 2;
      ty = this.pixelH <= H ? this.pixelH - H : Math.max(0, Math.min(ty, this.pixelH - H));
      this.camY += (ty - this.camY) * 0.2;
      G.R.setCamera(this.camX, this.camY);
    }

    render() {
      const R = G.R;
      this.bg.draw(R.cam.x);

      for (const d of this.decor) R.sprite(d.img, d.x, d.y);

      const cam = R.cam;
      const c0 = Math.max(0, Math.floor(cam.x / TILE));
      const c1 = Math.min(this.w - 1, Math.floor((cam.x + R.BASE_W) / TILE));
      const r0 = Math.max(0, Math.floor(cam.y / TILE));
      const r1 = Math.min(this.h - 1, Math.floor((cam.y + R.BASE_H) / TILE));
      for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) this.drawTile(c, r);

      if (this.checkpoint) this.drawCheckpoint();
      this.drawFlag();

      for (const it of this.items) it.render();
      for (const e of this.enemies) e.render();
      for (const s of this.shots) s.render();
      this.player.render();
      for (const p of this.particles) p.render();
    }

    drawTile(c, r) {
      const S = G.Sprites, T = G.Tiles.T;
      const id = this.grid[r][c];
      if (!id) return;
      const ts = S.tilesets[this.theme] || S.tilesets.overworld;
      const solid = (cc, rr) => G.Tiles.isSolid(this.tileAt(cc, rr));
      const edge = !solid(c - 1, r) ? 0 : (!solid(c + 1, r) ? 2 : 1);
      const left = !solid(c - 1, r), right = !solid(c + 1, r);
      let img = null;
      switch (id) {
        case T.GROUND: img = left ? ts.groundL : (right ? ts.groundR : ts.groundM); break;
        case T.DIRT: img = left ? ts.dirtL : (right ? ts.dirtR : ts.dirtM); break;
        case T.BRICK: img = ts.brick; break;
        case T.QUESTION: img = S.tQuestion[(this.game.animFrame >> 3) % S.tQuestion.length]; break;
        case T.USED: img = S.tUsed; break;
        case T.BLOCK: img = S.tBlock; break;
        case T.SPIKE: img = S.tSpike; break;
        case T.PLATFORM: img = S.tPlatform; break;
        case T.PIPE_TL: img = S.tPipeTL; break;
        case T.PIPE_TR: img = S.tPipeTR; break;
        case T.PIPE_L: img = S.tPipeL; break;
        case T.PIPE_R: img = S.tPipeR; break;
      }
      if (!img) return;
      const b = this.bumps[c + ',' + r];
      const off = b ? -Math.round(Math.sin((b / 8) * Math.PI) * 5) : 0;
      G.R.sprite(img, c * TILE, r * TILE + off);
      void edge;
    }

    drawCheckpoint() {
      const R = G.R, cp = this.checkpoint;
      R.rect(cp.x + 5, cp.y - 32, 2, 32, '#d8dce8');
      R.rect(cp.x + 6, cp.y - 32, 1, 32, '#7a8098');
      R.rect(cp.x + 4, cp.y - 34, 4, 3, '#ffd84a');
      const col = cp.reached ? '#25b5a4' : '#a0a4b8';
      const wave = cp.reached ? (this.game.animFrame >> 3) & 1 : 0;
      R.rect(cp.x + 7, cp.y - 31, 9, 6 + wave, col);
      R.rect(cp.x + 7, cp.y - 31, 9, 1, cp.reached ? '#7ae0d4' : '#c8ccdc');
    }

    drawFlag() {
      const S = G.Sprites, R = G.R;
      const px = this.flagX;
      const top = this.groundY - TILE * 10;
      for (let i = 1; i <= 9; i++) R.sprite(S.tFlagPole, px, this.groundY - TILE * i);
      R.sprite(S.tFlagTop, px, top);
      const slide = this.player.flagSlide != null ? this.player.flagSlide : 0;
      const by = Math.min(this.groundY - TILE - 6, top + 12 + slide);
      R.sprite(S.banner, px - 15, by);
      R.sprite(S.castle, px + TILE * 3, this.groundY - S.castle.height + 1);
    }
  }

  G.Level = Level;
})(window.GAME = window.GAME || {});
