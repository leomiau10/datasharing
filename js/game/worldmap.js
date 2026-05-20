// Overworld map: move between level nodes, enter unlocked levels.
(function (G) {
  'use strict';

  class WorldMap {
    constructor(game) {
      this.game = game;
      this.data = G.WorldMapData;
      this.nodes = this.data.nodes;
      this.current = Math.min(G.Save.get().mapNode || 0, this.nodes.length - 1);
      this.neighbors = this.buildNeighbors();
      this.bob = 0;
    }

    buildNeighbors() {
      const n = this.nodes.map(() => []);
      for (const [a, b] of this.data.edges) { n[a].push(b); n[b].push(a); }
      return n;
    }

    isUnlocked(i) {
      const lvl = this.nodes[i].level;
      return lvl === 0 || G.Save.isCleared(lvl - 1);
    }

    tryMove(dx, dy) {
      let best = -1, bestScore = -Infinity;
      const cur = this.nodes[this.current];
      for (const j of this.neighbors[this.current]) {
        if (!this.isUnlocked(j)) continue;
        const ndx = this.nodes[j].x - cur.x;
        const ndy = this.nodes[j].y - cur.y;
        const len = Math.hypot(ndx, ndy) || 1;
        const score = (ndx / len) * dx + (ndy / len) * dy;
        if (score > 0.3 && score > bestScore) { bestScore = score; best = j; }
      }
      if (best >= 0) {
        this.current = best;
        G.Save.setNode(best);
        G.Audio.sfx.select();
      }
    }

    update(dt) {
      const In = G.Input;
      this.bob += dt;
      if (In.justPressed('left')) this.tryMove(-1, 0);
      else if (In.justPressed('right')) this.tryMove(1, 0);
      else if (In.justPressed('up')) this.tryMove(0, -1);
      else if (In.justPressed('down')) this.tryMove(0, 1);

      if (In.justPressed('jump') || In.justPressed('start')) {
        if (this.isUnlocked(this.current)) {
          G.Audio.sfx.start();
          this.game.startLevel(this.nodes[this.current].level);
        } else {
          G.Audio.sfx.bump();
        }
      }
    }

    render() {
      const R = G.R, T = G.Text, S = G.Sprites;
      R.setCamera(0, 0);
      R.clear(this.data.bg);

      // decorative hills/clouds
      R.spriteS(S.hill, 20, R.BASE_H - 24 - 40);
      R.spriteS(S.hill, 200, R.BASE_H - 24 - 30);
      R.spriteS(S.cloud, 60, 30);
      R.spriteS(S.cloud, 250, 24);
      R.spriteS(S.cloud, 160, 50);

      // paths
      const ctx = R.getCtx();
      ctx.strokeStyle = '#caa15a';
      ctx.lineWidth = 3;
      ctx.setLineDash([4, 3]);
      for (const [a, b] of this.data.edges) {
        ctx.beginPath();
        ctx.moveTo(this.nodes[a].x, this.nodes[a].y);
        ctx.lineTo(this.nodes[b].x, this.nodes[b].y);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // nodes
      for (let i = 0; i < this.nodes.length; i++) {
        const nd = this.nodes[i];
        let img;
        if (G.Save.isCleared(nd.level)) img = S.mapNodeDone;
        else if (this.isUnlocked(i)) img = S.mapNode;
        else img = S.mapNodeLock;
        R.spriteS(img, nd.x - img.width / 2, nd.y - img.height / 2);
      }

      // hero icon on current node
      const cur = this.nodes[this.current];
      const bobY = Math.round(Math.sin(this.bob * 6) * 2);
      R.spriteS(S.mapHero, cur.x - S.mapHero.width / 2, cur.y - 18 + bobY);

      // title + info
      T.drawCenterShadow('SELECT A LEVEL', 8, '#fff', 2, '#000');
      const lvl = this.nodes[this.current].level;
      const name = G.Levels[lvl].name;
      T.drawCenterShadow(name, 158, '#ffe', 1, '#000');
      if (this.isUnlocked(this.current)) {
        T.drawCenterShadow('PRESS A OR TAP A TO PLAY', 172, '#fff', 1, '#000');
      } else {
        T.drawCenterShadow('LOCKED - CLEAR PREVIOUS LEVEL', 172, '#f88', 1, '#000');
      }

      // coins + lives (top-left, clear of the top-right mute button)
      R.spriteS(S.mapHero, 6, 4);
      T.drawShadow('x' + this.game.lives, 16, 7, '#fff', 1, '#000');
      R.spriteS(S.coin[0], 44, 5);
      T.drawShadow('x' + this.game.coins, 54, 7, '#f7d51d', 1, '#000');
    }
  }

  G.WorldMap = WorldMap;
})(window.GAME = window.GAME || {});
