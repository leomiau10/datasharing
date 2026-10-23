// Overworld map: animated sea, island, hero walks along the path between level nodes.
(function (G) {
  'use strict';

  const DESIGN_W = 384; // node coordinates are authored for this width; the map is centered on wider screens

  class WorldMap {
    constructor(game) {
      this.game = game;
      this.data = G.WorldMapData;
      this.nodes = this.data.nodes;
      this.current = Math.min(G.Save.get().mapNode || 0, this.nodes.length - 1);
      this.neighbors = this.buildNeighbors();
      this.bob = 0;
      this.move = null; // { from, to, t }
      this.island = this.buildIsland();
      G.Audio.startMusic('map');
    }

    buildNeighbors() {
      const n = this.nodes.map(() => []);
      for (const e of this.data.edges) { n[e[0]].push(e[1]); n[e[1]].push(e[0]); }
      return n;
    }

    // Island silhouette baked once: sand ring + grass interior following the node path.
    buildIsland() {
      const R = G.R;
      const c = G.Gfx.mk(DESIGN_W, R.BASE_H), x = c.getContext('2d');
      const pts = this.nodes;
      const blobs = [];
      for (let i = 0; i < pts.length; i++) {
        blobs.push([pts[i].x, pts[i].y, 34]);
        if (i > 0) blobs.push([(pts[i].x + pts[i - 1].x) / 2, (pts[i].y + pts[i - 1].y) / 2, 28]);
      }
      blobs.forEach(function (b) { G.Gfx.disc(x, Math.round(b[0]), Math.round(b[1]), b[2] + 4, '#e8d69a'); });
      blobs.forEach(function (b) { G.Gfx.disc(x, Math.round(b[0]), Math.round(b[1]), b[2], '#58c840'); });
      blobs.forEach(function (b) { G.Gfx.disc(x, Math.round(b[0]), Math.round(b[1]) - 2, b[2] - 6, '#6ad850'); });
      return c;
    }

    isUnlocked(i) {
      const lvl = this.nodes[i].level;
      return lvl === 0 || G.Save.isCleared(lvl - 1);
    }

    tryMove(dx, dy) {
      if (this.move) return;
      let best = -1, bestScore = -Infinity;
      const cur = this.nodes[this.current];
      for (const j of this.neighbors[this.current]) {
        if (!this.isUnlocked(j)) continue;
        const ndx = this.nodes[j].x - cur.x, ndy = this.nodes[j].y - cur.y;
        const len = Math.hypot(ndx, ndy) || 1;
        const score = (ndx / len) * dx + (ndy / len) * dy;
        if (score > 0.3 && score > bestScore) { bestScore = score; best = j; }
      }
      if (best >= 0) {
        this.move = { from: this.current, to: best, t: 0 };
        G.Audio.sfx.select();
      }
    }

    update(dt) {
      const In = G.Input;
      this.bob += dt;
      if (this.move) {
        const a = this.nodes[this.move.from], b = this.nodes[this.move.to];
        this.move.t += 1.6 / Math.max(20, Math.hypot(b.x - a.x, b.y - a.y)) * 1.2;
        if (this.move.t >= 1) {
          this.current = this.move.to;
          G.Save.setNode(this.current);
          this.move = null;
        }
        return;
      }
      if (In.down('left')) this.tryMove(-1, 0);
      else if (In.down('right')) this.tryMove(1, 0);
      else if (In.down('up')) this.tryMove(0, -1);
      else if (In.down('down')) this.tryMove(0, 1);

      if (In.justPressed('jump') || In.justPressed('start')) {
        if (this.isUnlocked(this.current)) {
          G.Audio.sfx.start();
          const nd = this.nodes[this.current];
          const ox = (G.R.BASE_W - DESIGN_W) / 2;
          this.game.go(() => this.game.startLevel(nd.level), nd.x + ox, nd.y);
        } else {
          G.Audio.sfx.bump();
        }
      }
    }

    heroPos() {
      if (!this.move) { const n = this.nodes[this.current]; return { x: n.x, y: n.y, walking: false }; }
      const a = this.nodes[this.move.from], b = this.nodes[this.move.to], t = this.move.t;
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, walking: true, dir: b.x >= a.x ? 1 : -1 };
    }

    render() {
      const R = G.R, T = G.Text, S = G.Sprites;
      const ox = Math.round((R.BASE_W - DESIGN_W) / 2);
      R.setCamera(0, 0);
      const ctx = R.getCtx();

      // sea with animated wave lines
      R.clear('#2a78d8');
      const tt = this.game.animFrame;
      ctx.fillStyle = '#4a98f0';
      for (let j = 0; j < 14; j++) {
        for (let i = 0; i < R.BASE_W / 24 + 2; i++) {
          const wx = ((i * 24 + j * 13 + Math.floor(tt / 12) * (j % 2 ? 1 : -1)) % (R.BASE_W + 24) + R.BASE_W + 24) % (R.BASE_W + 24);
          ctx.fillRect(wx, 18 + j * 15, 8, 1);
        }
      }

      R.spriteS(this.island, ox, 0);
      R.spriteS(S.cloud, ((tt / 6) % (R.BASE_W + 80)) - 40, 150);

      ctx.save();
      ctx.translate(ox, 0);

      // path (dotted)
      ctx.fillStyle = '#f4e6b0';
      for (const e of this.data.edges) {
        const a = this.nodes[e[0]], b = this.nodes[e[1]];
        const n = Math.floor(Math.hypot(b.x - a.x, b.y - a.y) / 5);
        for (let k = 1; k < n; k++) ctx.fillRect(Math.round(a.x + (b.x - a.x) * (k / n)) - 1, Math.round(a.y + (b.y - a.y) * (k / n)) - 1, 3, 3);
      }

      // nodes
      for (let i = 0; i < this.nodes.length; i++) {
        const nd = this.nodes[i];
        let img;
        if (nd.castle) img = S.mapCastle;
        else if (G.Save.isCleared(nd.level)) img = S.mapNodeDone;
        else if (this.isUnlocked(i)) img = S.mapNode;
        else img = S.mapNodeLock;
        R.spriteS(img, nd.x - img.width / 2, nd.y - img.height / 2 - (nd.castle ? 4 : 0));
        // medals collected in this level
        const m = G.Save.medals(nd.level);
        for (let k = 0; k < 3; k++) {
          ctx.fillStyle = '#000';
          ctx.fillRect(nd.x - 7 + k * 5, nd.y + 7, 4, 4);
          ctx.fillStyle = (m & (1 << k)) ? '#ffd84a' : '#4a5a4a';
          ctx.fillRect(nd.x - 6 + k * 5, nd.y + 8, 2, 2);
        }
      }

      // hero
      const hp = this.heroPos();
      const idle = S.heroSets.small.idle, walk = S.heroSets.small.walk;
      const bobY = hp.walking ? (Math.floor(tt / 6) % 2) : Math.round(Math.sin(this.bob * 6) * 1.5);
      const img = hp.walking && (Math.floor(tt / 8) % 2) ? walk : idle;
      R.spriteS(img, hp.x - img.width / 2, hp.y - img.height + 4 + bobY, hp.walking && hp.dir < 0);
      ctx.restore();

      // title + info
      T.drawCenterShadow('SELECT A LEVEL', 6, '#fff', 2, '#000');
      const name = G.Levels[this.nodes[this.current].level].name;
      const by = R.BASE_H - 44;
      R.rectS(0, by - 6, R.BASE_W, 36, 'rgba(0,0,0,0.35)');
      T.drawCenterShadow(name, by, '#ffe', 1, '#000');
      if (this.isUnlocked(this.current)) T.drawCenterShadow('PRESS A OR TAP A TO PLAY', by + 14, '#fff', 1, '#000');
      else T.drawCenterShadow('LOCKED - CLEAR PREVIOUS LEVEL', by + 14, '#f88', 1, '#000');

      R.spriteS(S.lifeIcon, 4, 22);
      T.drawShadow('x' + this.game.lives, 20, 25, '#fff', 1, '#000');
      R.spriteS(S.coin[0], 44, 22);
      T.drawShadow('x' + this.game.coins, 56, 25, '#ffe060', 1, '#000');
    }
  }

  G.WorldMap = WorldMap;
})(window.GAME = window.GAME || {});
