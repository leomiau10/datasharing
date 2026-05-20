// Level: parses a tilemap, owns entities, runs update/render, handles win/lose.
(function (G) {
  'use strict';

  const TILE = 16;

  class Level {
    constructor(def, game) {
      this.def = def;
      this.game = game;
      this.bg = def.bg || '#5c94fc';
      this.theme = def.theme || 'overworld';
      this.rows = def.map.slice();
      this.h = this.rows.length;
      this.w = 0;
      for (const r of this.rows) this.w = Math.max(this.w, r.length);
      this.pixelW = this.w * TILE;
      this.pixelH = this.h * TILE;

      this.grid = [];          // tile ids [row][col]
      this.questionState = {}; // "c,r" -> 'used'
      this.enemies = [];
      this.items = [];         // coins, mushrooms (collectible/moving)
      this.particles = [];
      this.flagX = null;
      this.playerStart = { x: TILE * 2, y: TILE * 2 };

      this.parse();

      this.player = new G.Player(this.playerStart.x, this.playerStart.y, game.bigState);
      this.cleared = false;
      this.failed = false;
      this.outTimer = 0;
      this.time = 300;
      this.timeAcc = 0;
      this.age = 0;
      this.decorations = this.buildDecor();
    }

    parse() {
      const Tiles = G.Tiles;
      for (let r = 0; r < this.h; r++) {
        const row = this.rows[r];
        this.grid[r] = [];
        for (let c = 0; c < this.w; c++) {
          const ch = row[c] || ' ';
          if (Tiles.CHAR[ch] != null) {
            this.grid[r][c] = Tiles.CHAR[ch];
          } else {
            this.grid[r][c] = Tiles.T.EMPTY;
          }
          // Spawns
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
        case 'goomba': this.enemies.push(new G.Goomba(x, y, this)); break;
        case 'koopa': this.enemies.push(new G.Koopa(x, y, this)); break;
        case 'coin': this.items.push(new G.Coin(x, y)); break;
        case 'flag': this.flagX = x; break;
        case 'mushroom_block':
          // a ? block that yields a mushroom instead of a coin
          this.grid[r][c] = G.Tiles.T.QUESTION;
          this.questionState[c + ',' + r] = 'mushroom';
          break;
      }
    }

    buildDecor() {
      // Deterministic background props based on level width.
      const d = [];
      const S = G.Sprites;
      const seed = this.w * 13 + 7;
      function rnd(i) { const x = Math.sin(seed + i * 97.13) * 10000; return x - Math.floor(x); }
      const groundY = this.pixelH;
      for (let i = 0; i < Math.floor(this.w / 8); i++) {
        const x = Math.floor(rnd(i) * this.pixelW);
        const which = rnd(i + 50);
        if (which < 0.4) d.push({ img: S.cloud, x: x, y: 20 + rnd(i + 1) * 40 });
        else if (which < 0.7) d.push({ img: S.hill, x: x, y: groundY - 24 - 16 });
        else d.push({ img: S.bush, x: x, y: groundY - 16 - 4 });
      }
      return d;
    }

    tileAt(c, r) {
      if (c < 0 || c >= this.w || r < 0) return G.Tiles.T.BLOCK; // walls on sides/top
      if (r >= this.h) return G.Tiles.T.EMPTY; // open below (fall to death)
      const id = this.grid[r][c];
      return id == null ? G.Tiles.T.EMPTY : id;
    }

    setTile(c, r, id) {
      if (r >= 0 && r < this.h && c >= 0 && c < this.w) this.grid[r][c] = id;
    }

    // Player hit a block from below.
    bumpBlock(c, r) {
      const Tiles = G.Tiles;
      const id = this.tileAt(c, r);
      if (id === Tiles.T.QUESTION) {
        const key = c + ',' + r;
        if (this.questionState[key] === 'used') { G.Audio.sfx.bump(); return; }
        const kind = this.questionState[key];
        this.setTile(c, r, Tiles.T.USED);
        this.questionState[key] = 'used';
        if (kind === 'mushroom') {
          this.items.push(new G.Mushroom(c * TILE, r * TILE - TILE, this));
          G.Audio.sfx.powerup();
        } else {
          this.spawnCoinPop(c * TILE, r * TILE - TILE);
          this.game.addCoin();
          G.Audio.sfx.coin();
        }
        this.particles.push(new G.BumpAnim(c * TILE, r * TILE));
      } else if (id === Tiles.T.BRICK) {
        if (this.player.big) {
          this.setTile(c, r, Tiles.T.EMPTY);
          this.spawnDebris(c * TILE, r * TILE);
          G.Audio.sfx.bump();
        } else {
          G.Audio.sfx.bump();
          this.particles.push(new G.BumpAnim(c * TILE, r * TILE));
        }
      } else {
        G.Audio.sfx.bump();
      }
    }

    spawnCoinPop(x, y) {
      this.particles.push(new G.CoinPop(x + 3, y));
    }
    spawnDebris(x, y) {
      for (let i = 0; i < 4; i++) {
        this.particles.push(new G.Debris(x + 8, y + 8, (i % 2 ? 1 : -1) * (1 + Math.random()), -2 - Math.random() * 2));
      }
    }

    addScore(x, y, val) {
      this.particles.push(new G.FloatText(x, y, '+' + val));
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
        if (this.outTimer > 2.4) this.game.onLevelFailed();
        return;
      }

      this.age += dt;
      // timer
      this.timeAcc += dt;
      if (this.timeAcc >= 1) { this.timeAcc -= 1; this.time--; if (this.time <= 0) this.killPlayer(); }

      player.update(this);

      // reached flag?
      if (this.flagX != null && player.x + player.w >= this.flagX && !this.cleared) {
        this.clearLevel();
      }

      // fell off the bottom
      if (player.y > this.pixelH + 40) this.killPlayer();

      for (const e of this.enemies) e.update(this);
      // enemy <-> player
      for (const e of this.enemies) {
        if (!e.alive || e.dying) continue;
        if (G.Physics.aabb(player, e)) e.onPlayer(player, this);
      }
      this.enemies = this.enemies.filter((e) => !e.remove);

      for (const it of this.items) it.update(this);
      this.items = this.items.filter((it) => !it.remove);

      this.updateParticles();
      this.updateCamera();
    }

    updateParticles() {
      for (const p of this.particles) p.update();
      this.particles = this.particles.filter((p) => !p.remove);
    }

    clearLevel() {
      this.cleared = true;
      this.outTimer = 0;
      this.player.startWin();
      G.Audio.stopMusic();
      G.Audio.sfx.flag();
    }

    killPlayer() {
      if (this.player.big || this.player.invuln > 0) return; // handled by takeDamage
      this.failed = true;
      this.outTimer = 0;
      this.player.startDeath();
      G.Audio.stopMusic();
      G.Audio.sfx.die();
    }

    // Called by enemies when they damage the player by contact.
    hurtPlayer() {
      const p = this.player;
      if (p.invuln > 0 || this.cleared || this.failed) return;
      if (p.big) {
        p.shrink();
        G.Audio.sfx.hurt();
      } else {
        this.failed = true;
        this.outTimer = 0;
        p.startDeath();
        G.Audio.stopMusic();
        G.Audio.sfx.die();
      }
    }

    updateCamera() {
      const p = this.player;
      let cx = (p.x + p.w / 2) - G.R.BASE_W / 2;
      let cy = (p.y + p.h / 2) - G.R.BASE_H / 2;
      cx = Math.max(0, Math.min(cx, Math.max(0, this.pixelW - G.R.BASE_W)));
      if (this.pixelH <= G.R.BASE_H) cy = this.pixelH - G.R.BASE_H;
      else cy = Math.max(0, Math.min(cy, this.pixelH - G.R.BASE_H));
      G.R.setCamera(cx, cy);
    }

    render() {
      const R = G.R;
      R.clear(this.bg);

      // decorations (parallax-ish: drawn in world space)
      for (const d of this.decorations) R.sprite(d.img, d.x, d.y);

      // visible tile range
      const cam = R.cam;
      const c0 = Math.max(0, Math.floor(cam.x / TILE));
      const c1 = Math.min(this.w - 1, Math.floor((cam.x + R.BASE_W) / TILE));
      const r0 = Math.max(0, Math.floor(cam.y / TILE));
      const r1 = Math.min(this.h - 1, Math.floor((cam.y + R.BASE_H) / TILE));
      for (let r = r0; r <= r1; r++) {
        for (let c = c0; c <= c1; c++) {
          this.drawTile(c, r);
        }
      }

      // flag pole + castle
      if (this.flagX != null) this.drawFlag();

      for (const it of this.items) it.render();
      for (const e of this.enemies) e.render();
      this.player.render();
      for (const p of this.particles) p.render();
    }

    drawTile(c, r) {
      const Tiles = G.Tiles, S = G.Sprites, T = Tiles.T;
      const id = this.grid[r][c];
      if (!id) return;
      const x = c * TILE, y = r * TILE;
      let img = null;
      switch (id) {
        case T.GROUND: img = S.tGround; break;
        case T.DIRT: img = S.tDirt; break;
        case T.BRICK: img = S.tBrick; break;
        case T.QUESTION: img = S.tQuestion[(this.game.animFrame >> 3) % S.tQuestion.length]; break;
        case T.USED: img = S.tUsed; break;
        case T.BLOCK: img = S.tBlock; break;
        case T.SPIKE: img = S.tSpike; break;
        case T.PLATFORM: img = S.tPlatform; break;
        case T.PIPE_TL: img = S.tPipeTL; break;
        case T.PIPE_TR: img = S.tPipeTR; break;
        case T.PIPE_L: img = S.tPipeL; break;
        case T.PIPE_R: img = S.tPipeR; break;
        case T.FLAG_POLE: img = S.tFlagPole; break;
        case T.FLAG_TOP: img = S.tFlagTop; break;
      }
      if (img) G.R.sprite(img, x, y);
    }

    drawFlag() {
      const S = G.Sprites;
      const R = G.R;
      const baseY = this.pixelH - TILE;
      // pole
      const px = this.flagX;
      for (let y = baseY; y > baseY - TILE * 9; y -= TILE) {
        R.sprite(S.tFlagPole, px, y);
      }
      R.sprite(S.tFlagTop, px, baseY - TILE * 9);
      // flag banner moves down as player wins
      const fy = this.player.flagSlide != null
        ? baseY - TILE * 8 + this.player.flagSlide
        : baseY - TILE * 8;
      R.sprite(S.tFlagTop, px - TILE, Math.min(baseY - TILE, fy));
      // castle to the right
      R.sprite(S.castle, px + TILE * 2, this.pixelH - 48);
    }
  }

  G.Level = Level;
})(window.GAME = window.GAME || {});
