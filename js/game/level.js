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
      this.slippery = this.theme === 'snow';

      this.grid = [];
      this.questionState = {};
      this.bumps = {};
      this.enemies = [];
      this.items = [];
      this.shots = [];
      this.particles = [];
      this.platforms = [];
      this.signs = [];
      this.tip = null;
      this.medalCount = 0;
      this.medalsGot = 0;
      this.medalsHad = G.Save.medals(game.levelIndex);
      this.hasBoss = false;
      this.arenaX = null;
      this.arenaLock = false;
      this.shake = 0;
      this.flagX = null;
      this.checkpoint = null;
      this.playerStart = { x: TILE * 2, y: TILE * 2 };

      this.parse();
      if (startX != null) this.playerStart.x = startX;

      this.player = new G.Player(this.playerStart.x, this.playerStart.y, game.form);
      this.cleared = false;
      this.failed = false;
      this.outTimer = 0;
      this.time = 400;
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
      if (this.flagX == null && !this.hasBoss) this.flagX = this.pixelW - TILE * 3;
    }

    spawn(type, c, r) {
      const x = c * TILE, y = r * TILE;
      switch (type) {
        case 'player': this.playerStart = { x: x, y: y }; break;
        case 'goomba': this.enemies.push(new G.Blob(x, y)); break;
        case 'koopa': this.enemies.push(new G.Snail(x, y, this)); break;
        case 'spiky': this.enemies.push(new G.Spiky(x, y)); break;
        case 'bee': this.enemies.push(new G.Bee(x, y)); break;
        case 'hopper': this.enemies.push(new G.Hopper(x, y)); break;
        case 'boss':
          this.enemies.push(new G.Boss(x, y));
          this.enemies[this.enemies.length - 1].hp = this.def.bossHp || 3;
          this.hasBoss = true;
          this.arenaX = (c - 17) * TILE;
          break;
        case 'medal': {
          const idx = this.medalCount++;
          this.items.push(new G.Medal(x, y, idx, !!(this.medalsHad & (1 << idx))));
          break;
        }
        case 'plat_h': this.platforms.push(new G.MovingPlatform(x, y, 'h')); break;
        case 'plat_v': this.platforms.push(new G.MovingPlatform(x, y, 'v')); break;
        case 'sign': this.signs.push({ x: x, y: y, text: (this.def.tips || [])[this.signs.length] || '' }); break;
        case 'oneup_block': case 'cloud_block': case 'gem_block':
          this.grid[r][c] = G.Tiles.T.QUESTION;
          this.questionState[c + ',' + r] = type.split('_')[0];
          break;
        case 'coin': this.items.push(new G.Coin(x, y)); break;
        case 'flag': this.flagX = x; break;
        case 'checkpoint': this.checkpoint = { x: x, y: y + TILE, reached: false }; break;
        case 'mushroom_block':
          this.grid[r][c] = G.Tiles.T.QUESTION;
          this.questionState[c + ',' + r] = 'power';
          break;
      }
    }

    // Themed scenery standing on exposed ground (drawn behind the tiles' foreground actors).
    buildDecor() {
      const d = [];
      const S = G.Sprites, T = G.Tiles.T;
      const rnd = G.Gfx.rng(this.w * 13 + 7);
      const green = ['overworld', 'dusk', 'forest', 'night'].indexOf(this.theme) >= 0;
      const special = { desert: S.cactus, snow: S.snowPine }[this.theme];
      if (!green && !special && this.theme !== 'cave') return d;
      for (let c = 3; c < this.w - 3; c++) {
        let r = 1;
        while (r < this.h && this.tileAt(c, r) === T.EMPTY) r++;
        if (r >= this.h || this.tileAt(c, r) !== T.GROUND || this.tileAt(c, r - 1) !== T.EMPTY) continue;
        const top = r * TILE;
        const k = rnd();
        if (green) {
          if (k < 0.05 && this.tileAt(c + 1, r) === T.GROUND) { d.push({ img: S.tree, x: c * TILE - 6, y: top - S.tree.height + 1 }); c += 3; }
          else if (k < 0.13) { d.push({ img: S.bush, x: c * TILE - 8, y: top - S.bush.height + 1 }); c += 2; }
          else if (k < 0.28) d.push({ img: S.flowerDecor[Math.floor(rnd() * 3)], x: c * TILE + 3, y: top - 9 });
        } else if (special) {
          if (k < 0.1) { d.push({ img: special, x: c * TILE - 1, y: top - special.height + 1 }); c += 2; }
          else if (k < 0.16 && this.theme === 'snow') d.push({ img: S.flowerDecor[1], x: c * TILE + 3, y: top - 9 });
        } else if (k < 0.12) {
          d.push({ img: S.crystal, x: c * TILE + 2, y: top - S.crystal.height + 1 });
          c += 1;
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
        const ix = c * TILE, iy = r * TILE - TILE;
        if (kind === 'power') {
          const small = this.player.form === 'small';
          this.items.push(small ? new G.Berry(ix, iy) : new G.Flower(ix, iy));
          G.Audio.sfx.powerup();
        } else if (kind === 'oneup') {
          this.items.push(new G.Heart(ix, iy));
          G.Audio.sfx.powerup();
        } else if (kind === 'cloud') {
          this.items.push(this.player.form === 'small' ? new G.Berry(ix, iy) : new G.CloudItem(ix, iy));
          G.Audio.sfx.powerup();
        } else if (kind === 'gem') {
          this.items.push(new G.Gem(ix, iy));
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

    // Sliding shell hits a block from the side.
    shellHitBlock(c, r) {
      const id = this.tileAt(c, r), T = G.Tiles.T;
      if (id === T.QUESTION) this.bumpBlock(c, r);
      else if (id === T.BRICK) this.breakBrick(c, r);
    }

    breakBrick(c, r) {
      this.setTile(c, r, G.Tiles.T.EMPTY);
      for (let i = 0; i < 4; i++) {
        this.particles.push(new G.Debris(c * TILE + 8, r * TILE + 8, (i % 2 ? 1 : -1) * (1 + Math.random()), -2 - Math.random() * 2));
      }
      this.game.addScore(50);
      this.bumpEnemiesAbove(c, r);
      G.Audio.sfx.bump();
    }

    // Ground pound landing: break bricks / hit blocks below, shake, knock nearby enemies.
    // Returns true if the hero broke through and should keep falling.
    poundImpact(p) {
      const T = G.Tiles.T;
      const r = Math.floor((p.y + p.h + 1) / TILE);
      const c0 = Math.floor(p.x / TILE), c1 = Math.floor((p.x + p.w - 1) / TILE);
      let broke = false;
      for (let c = c0; c <= c1; c++) {
        const id = this.tileAt(c, r);
        if (id === T.BRICK) { this.breakBrick(c, r); broke = true; }
        else if (id === T.QUESTION) this.bumpBlock(c, r);
      }
      this.shake = 8;
      this.particles.push(new G.Puff(p.x - 2, p.y + p.h - 2));
      this.particles.push(new G.Puff(p.x + p.w + 2, p.y + p.h - 2));
      for (const e of this.enemies) {
        if (e.dying || e.boss || e.carried) continue;
        const near = Math.abs((e.x + e.w / 2) - p.cx) < 48 && Math.abs((e.y + e.h) - (p.y + p.h)) < 10;
        if (near) { G.launchEnemy(e); this.game.addScore(200); this.addScore(e.x, e.y, 200); }
      }
      return broke;
    }

    // Spin jump / pound / invincibility defeat enemies outright.
    poofEnemy(e) {
      e.dying = true;
      e.remove = true;
      for (let i = 0; i < 3; i++) this.particles.push(new G.Puff(e.x + e.w / 2 + (i - 1) * 5, e.y + e.h / 2));
      this.particles.push(new G.Sparkle(e.x + e.w / 2, e.y + e.h / 2));
      this.game.addScore(200);
      this.addScore(e.x, e.y, 200);
      G.Audio.sfx.stomp();
    }

    startStar() {
      this.player.star = 600;
      G.Audio.startMusic('star');
    }
    onStarEnd() {
      if (!this.cleared && !this.failed) G.Audio.startMusic(this.arenaLock ? 'boss' : this.theme);
    }
    bossDefeated() {
      if (!this.cleared && !this.failed) this.clearLevel();
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

      for (const pl of this.platforms) pl.update();
      player.update(this);
      this.updateCheckpoint();
      this.updateArena();

      // signs: show a tip while standing near one
      this.tip = null;
      for (const sg of this.signs) if (Math.abs(player.cx - (sg.x + 8)) < 14 && Math.abs(player.y + player.h - (sg.y + 16)) < 24) this.tip = sg.text;

      if (this.flagX != null && player.x + player.w >= this.flagX && !this.cleared) this.clearLevel();
      if (player.y > this.pixelH + 40) this.killPlayer();

      for (const e of this.enemies) e.update(this);
      for (const e of this.enemies) {
        if (e.dying || !e.alive || e.carried) continue;
        // forgiving hitbox: grazing an enemy's edge doesn't count
        if (!G.Physics.aabb(player, { x: e.x + 2, y: e.y + 2, w: e.w - 4, h: e.h - 2 })) continue;
        if (player.state !== 'play') break;
        if (player.star > 0 && !e.boss) {
          G.launchEnemy(e);
          this.game.addScore(200); this.addScore(e.x, e.y, 200);
          G.Audio.sfx.stomp();
          continue;
        }
        if (!e.boss && (player.spinning || player.pound) && G.isStomp(player, e)) {
          this.poofEnemy(e);
          if (player.spinning) { player.vy = G.Input.down('spin') || G.Input.down('jump') ? -5.5 : -3.5; player.chain++; }
          continue;
        }
        if (e.boss && player.pound && G.isStomp(player, e)) { e.hit(this, player); player.pound = null; continue; }
        e.onPlayer(player, this);
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

    // Boss arena: once inside, the camera and hero are locked to it and the boss wakes up.
    updateArena() {
      if (this.arenaX == null || this.arenaLock) return;
      if (this.player.x > this.arenaX + 64) {
        this.arenaLock = true;
        G.Audio.startMusic('boss');
      }
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
      this.player.startWin(this.hasBoss);
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
      if (p.invuln > 0 || p.star > 0 || this.cleared || this.failed) return;
      if (p.carry) { p.carry.drop(); p.carry = null; }
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
      const minX = this.arenaLock ? this.arenaX : 0;
      tx = Math.max(minX, Math.min(tx, Math.max(0, this.pixelW - W)));
      if (this.camX == null || snap) this.camX = tx;
      else this.camX += (tx - this.camX) * 0.12;
      let ty = (p.y + p.h / 2) - H / 2;
      ty = this.pixelH <= H ? this.pixelH - H : Math.max(0, Math.min(ty, this.pixelH - H));
      this.camY += (ty - this.camY) * 0.2;
      let sx = 0, sy = 0;
      if (this.shake > 0) { this.shake--; sx = (Math.random() - 0.5) * this.shake; sy = (Math.random() - 0.5) * this.shake; }
      G.R.setCamera(this.camX + sx, this.camY + sy);
      // arena lock: the hero can't walk back off the left edge
      if (this.arenaLock && p.x < this.camX) { p.x = this.camX; if (p.vx < 0) p.vx = 0; }
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

      for (const sg of this.signs) R.sprite(G.Sprites.sign, sg.x - 1, sg.y - 1);
      if (this.checkpoint) this.drawCheckpoint();
      if (this.flagX != null) this.drawFlag();

      for (const pl of this.platforms) pl.render();
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
