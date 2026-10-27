// Overworld map (original layout): framed window, two islands with cliffs, a high plateau with
// a pond and waterfall, carved stairs, a bridge, winding trails, scenery, drifting clouds.
// The hero walks along the trail waypoints between level dots.
(function (G) {
  'use strict';

  const TS = 8, COLS = 48, ROWS = 22;
  const MW = COLS * TS, MH = ROWS * TS; // 384 x 176
  const HEADER = 20;

  // ---------------------------------------------------------------- terrain grid
  // '~' sea, 'g' plateau grass, 'c' plateau cliff, 'G' high grass, 'C' high cliff,
  // 'w' pond/stream, 'f' waterfall, 'S' stairs, 'b' bridge
  function buildGrid(data) {
    const g = [];
    for (let r = 0; r < ROWS; r++) g.push(new Array(COLS).fill('~'));
    const rnd = G.Gfx.rng(77);
    const noise = [];
    for (let r = 0; r < ROWS; r++) { noise.push([]); for (let c = 0; c < COLS; c++) noise[r].push(rnd() - 0.5); }

    function blob(cx, cy, rx, ry, ch, only, rough) {
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const dx = Math.abs((c + 0.5 - cx) / rx), dy = Math.abs((r + 0.5 - cy) / ry);
          if (Math.pow(dx, 4) + Math.pow(dy, 4) <= 1 + (rough || 0) * noise[r][c] && (!only || only.indexOf(g[r][c]) >= 0)) g[r][c] = ch;
        }
      }
    }
    // Cells below a south-facing edge become a two-cell cliff face.
    function cliffs(top, face, over) {
      const snap = g.map((row) => row.slice());
      for (let r = 0; r < ROWS - 1; r++) {
        for (let c = 0; c < COLS; c++) {
          if (snap[r][c] !== top || snap[r + 1][c] === top) continue;
          for (let k = 1; k <= 2 && r + k < ROWS; k++) if (over.indexOf(g[r + k][c]) >= 0) g[r + k][c] = face;
        }
      }
    }

    for (const isl of data.islands) blob(isl[0], isl[1], isl[2], isl[3], 'g', null, 0.25);
    cliffs('g', 'c', ['~']);
    const pl = data.plateau;
    if (pl) {
      blob(pl.blob[0], pl.blob[1], pl.blob[2], pl.blob[3], 'G', ['g']);   // high plateau
      cliffs('G', 'C', ['g']);
      if (pl.pond) {
        blob(pl.pond[0], pl.pond[1], pl.pond[2], pl.pond[3], 'w', ['G']);
        for (let r = 0; r < ROWS; r++) {
          for (const c of pl.falls) {
            if (g[r][c] === 'G' && r > pl.pond[1]) g[r][c] = 'w';  // stream to the edge
            if (g[r][c] === 'C') g[r][c] = 'f';                     // waterfall
          }
        }
        blob(pl.pool[0], pl.pool[1], pl.pool[2], pl.pool[3], 'w', ['g']); // pool at the foot of the falls
      }
    }

    // bridge: sea cells between the islands on the trail rows
    for (const r of data.bridgeRows) {
      let c = 20;
      while (c < COLS && g[r][c] !== '~') c++;
      while (c < COLS && g[r][c] === '~') { g[r][c] = 'b'; c++; }
    }

    // trails crossing a cliff carve stairs
    for (const e of data.edges) {
      walk(e.pts, function (x, y) {
        const c = Math.floor(x / TS), r = Math.floor(y / TS);
        if (g[r] && (g[r][c] === 'C' || g[r][c] === 'c')) g[r][c] = 'S';
      });
    }
    return g;
  }

  // Step 1px along a polyline.
  function walk(pts, fn) {
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]));
      for (let k = 0; k <= n; k++) fn(Math.round(a[0] + (b[0] - a[0]) * k / n), Math.round(a[1] + (b[1] - a[1]) * k / n));
    }
  }

  // ---------------------------------------------------------------- scenery sprites
  function makePine() {
    const c = G.Gfx.mk(10, 14), x = c.getContext('2d');
    const hw = [1, 1, 2, 2, 3, 2, 3, 4, 3, 4, 5];
    for (let j = 0; j < hw.length; j++) {
      x.fillStyle = '#2e8a3a'; x.fillRect(5 - hw[j], j, hw[j] * 2, 1);
      x.fillStyle = '#5ac85a'; x.fillRect(5 - hw[j], j, 1, 1);
    }
    x.fillStyle = '#7a4a20'; x.fillRect(4, 11, 2, 3);
    return G.Gfx.outline(c, '#123a1a');
  }
  function makeRoundTree() {
    const c = G.Gfx.mk(12, 14), x = c.getContext('2d');
    x.fillStyle = '#7a4a20'; x.fillRect(5, 9, 2, 5);
    G.Gfx.disc(x, 6, 5, 5, '#2e9a3a');
    G.Gfx.disc(x, 5, 4, 4, '#4cc24a');
    G.Gfx.disc(x, 4, 3, 1, '#9ae890');
    return G.Gfx.outline(c, '#123a1a');
  }
  function makeBush() {
    const c = G.Gfx.mk(10, 6), x = c.getContext('2d');
    G.Gfx.disc(x, 3, 3, 2, '#2e9a3a'); G.Gfx.disc(x, 6, 2, 2, '#3cb34a');
    x.fillStyle = '#2e9a3a'; x.fillRect(1, 3, 8, 3);
    x.fillStyle = '#7ee07a'; x.fillRect(5, 1, 1, 1);
    return G.Gfx.outline(c, '#123a1a');
  }
  function makeHut() {
    const c = G.Gfx.mk(18, 16), x = c.getContext('2d');
    x.fillStyle = '#8a5a3a'; x.fillRect(13, 0, 2, 4);
    x.fillStyle = '#f0e0c0'; x.fillRect(2, 7, 14, 9);
    x.fillStyle = '#c8b090'; x.fillRect(13, 7, 3, 9);
    for (let j = 0; j < 7; j++) {
      const w = Math.min(18, 4 + j * 2);
      x.fillStyle = j === 0 ? '#ff7a6a' : '#d84a3a';
      x.fillRect(9 - w / 2, 1 + j, w, 1);
    }
    x.fillStyle = '#a02828'; x.fillRect(0, 7, 18, 1);
    x.fillStyle = '#6a3a18'; x.fillRect(7, 10, 4, 6);
    x.fillStyle = '#5ab0ff'; x.fillRect(3, 9, 3, 3);
    return G.Gfx.outline(c, '#1c1024');
  }
  function makeSignpost() {
    const c = G.Gfx.mk(10, 10), x = c.getContext('2d');
    x.fillStyle = '#7a4a20'; x.fillRect(4, 5, 2, 5);
    x.fillStyle = '#d89a50'; x.fillRect(0, 0, 10, 6);
    x.fillStyle = '#ffffff'; x.fillRect(2, 2, 5, 2); x.fillRect(6, 1, 1, 4); x.fillRect(7, 2, 1, 2);
    return G.Gfx.outline(c, '#1c1024');
  }
  function makeFortress() {
    const c = G.Gfx.mk(22, 28), x = c.getContext('2d');
    x.fillStyle = '#ffd84a'; x.fillRect(10, 0, 1, 6);
    x.fillStyle = '#25b5a4'; x.fillRect(11, 0, 5, 3);
    x.fillStyle = '#8c8ca4';
    x.fillRect(3, 8, 16, 20);
    [3, 9, 15].forEach(function (px) { x.fillRect(px, 5, 4, 3); });
    x.fillStyle = '#6a6a84';
    for (let j = 12; j < 28; j += 5) x.fillRect(3, j, 16, 1);
    x.fillStyle = '#b4b4cc'; x.fillRect(3, 8, 2, 20);
    x.fillStyle = '#5a5a74'; x.fillRect(17, 8, 2, 20);
    x.fillStyle = '#1a1030'; x.fillRect(8, 20, 6, 8); x.fillRect(9, 19, 4, 1);
    x.fillStyle = '#ffd84a'; x.fillRect(10, 11, 2, 4);
    return G.Gfx.outline(c, '#1c1024');
  }
  function makeMapCactus() {
    const c = G.Gfx.mk(8, 12), x = c.getContext('2d');
    x.fillStyle = '#3a9a4a'; x.fillRect(3, 0, 3, 12); x.fillRect(0, 4, 2, 4); x.fillRect(0, 7, 3, 2); x.fillRect(7, 2, 1, 4); x.fillRect(6, 5, 2, 2);
    x.fillStyle = '#7ad87a'; x.fillRect(4, 1, 1, 10);
    return G.Gfx.outline(c, '#123a1a');
  }
  function makeRock() {
    const c = G.Gfx.mk(10, 7), x = c.getContext('2d');
    G.Gfx.disc(x, 5, 4, 3, '#9a8a7a'); x.fillStyle = '#9a8a7a'; x.fillRect(1, 4, 8, 3);
    x.fillStyle = '#c8b8a8'; x.fillRect(3, 2, 3, 1);
    return G.Gfx.outline(c, '#3a2a1a');
  }
  function makePalm() {
    const c = G.Gfx.mk(14, 16), x = c.getContext('2d');
    x.fillStyle = '#8a5a2a'; for (let j = 5; j < 16; j++) x.fillRect(6 + (j > 10 ? 1 : 0), j, 2, 1);
    x.fillStyle = '#3aaa4a';
    x.fillRect(1, 3, 6, 2); x.fillRect(7, 3, 6, 2); x.fillRect(0, 5, 2, 2); x.fillRect(12, 5, 2, 2); x.fillRect(5, 1, 4, 2);
    x.fillStyle = '#8a5a2a'; x.fillRect(6, 4, 2, 2);
    return G.Gfx.outline(c, '#123a1a');
  }
  function makeSnowyPine() {
    const c = G.Gfx.mk(10, 14), x = c.getContext('2d');
    const hw = [1, 1, 2, 2, 3, 2, 3, 4, 3, 4, 5];
    for (let j = 0; j < hw.length; j++) {
      x.fillStyle = (j % 4 === 0) ? '#ffffff' : '#2a6a4a';
      x.fillRect(5 - hw[j], j, hw[j] * 2, 1);
    }
    x.fillStyle = '#6a4a2a'; x.fillRect(4, 11, 2, 3);
    return G.Gfx.outline(c, '#0e2a24');
  }
  function makeWarp() {
    const c = G.Gfx.mk(14, 12), x = c.getContext('2d');
    x.fillStyle = '#2aa88c'; x.fillRect(2, 4, 10, 8);
    x.fillStyle = '#3cc8a4'; x.fillRect(0, 0, 14, 5);
    x.fillStyle = '#b8f0e0'; x.fillRect(2, 1, 2, 3); x.fillRect(4, 5, 2, 6);
    x.fillStyle = '#0e2a28'; x.fillRect(2, 1, 10, 2);
    return G.Gfx.outline(c, '#0e2a28');
  }

  function makeSpire() {
    const c = G.Gfx.mk(12, 26), x = c.getContext('2d');
    x.fillStyle = '#a89070'; x.fillRect(1, 5, 10, 21);
    G.Gfx.disc(x, 6, 5, 5, '#a89070');
    G.Gfx.disc(x, 5, 4, 3, '#c8b090');
    x.fillStyle = '#d0b890'; x.fillRect(2, 5, 2, 20);
    x.fillStyle = '#7a6040'; x.fillRect(9, 6, 2, 20);
    for (let j = 10; j < 26; j += 6) { x.fillStyle = '#8a7050'; x.fillRect(4, j, 5, 1); }
    return G.Gfx.outline(c, '#3a2a1a');
  }

  // ---------------------------------------------------------------- baked layers
  function waterFrame(shift) {
    const c = G.Gfx.mk(MW, MH), x = c.getContext('2d');
    x.fillStyle = PAL.sea; x.fillRect(0, 0, MW, MH);
    x.fillStyle = PAL.wave;
    for (let j = 0; j < MH; j += 8) {
      const off = ((j / 8) % 2) * 6 + shift;
      for (let i = -12; i < MW + 12; i += 12) {
        const px = i + off;
        x.fillRect(px, j + 3, 1, 1); x.fillRect(px + 1, j + 2, 2, 1); x.fillRect(px + 3, j + 3, 1, 1);
      }
    }
    return c;
  }

  const PALETTES = {
    green: { sea: '#2f74d8', wave: '#5c9cf0', scatter: ['pine', 'round', 'bush', 'pine'],
      g: ['#4cc23c', '#7ae060', '#34a030', '#1a4a1a'], G: ['#74d858', '#a8f080', '#52b844', '#1a4a1a'],
      c: ['#c8843e', '#e8a860', '#9a5a28', '#4a2810'], C: ['#dc9c54', '#f4c078', '#b0703a', '#4a2810'] },
    forest: { sea: '#2a68c0', wave: '#5090e0', scatter: ['pine', 'pine', 'round', 'pine', 'bush'],
      g: ['#3a9a3a', '#5ac050', '#2a7a2a', '#123a12'], G: ['#4cb048', '#78d068', '#3a903a', '#123a12'],
      c: ['#9a6a3a', '#c08a50', '#6a4422', '#3a2008'], C: ['#b07a44', '#d09a60', '#80542a', '#3a2008'] },
    sand: { sea: '#2a90d8', wave: '#6ac0f8', scatter: ['cactus', 'rock', 'cactus', 'palm'],
      g: ['#f0c860', '#fff0a0', '#d8a848', '#7a5020'], G: ['#f8d880', '#fff4c0', '#e0b860', '#7a5020'],
      c: ['#d08850', '#f0a868', '#a86030', '#5a3010'], C: ['#e09a5a', '#f8b878', '#b87038', '#5a3010'] },
    snow: { sea: '#2a5ab0', wave: '#5a8ad8', scatter: ['snowpine', 'snowpine', 'rock'],
      g: ['#eef4ff', '#ffffff', '#c8dcf0', '#4a6a90'], G: ['#ffffff', '#ffffff', '#d8e8f8', '#4a6a90'],
      c: ['#8ab0d8', '#b8d8f8', '#5a80b0', '#203a60'], C: ['#9ac0e4', '#c8e4ff', '#6a90c0', '#203a60'] }
  };
  let PAL = PALETTES.green;

  function cellColors(t) {
    const k = PAL[t];
    if (k) return { base: k[0], hi: k[1], lo: k[2], edge: k[3] };
    switch (t) {
      case 'g': return { base: '#4cc23c', hi: '#7ae060', lo: '#34a030', edge: '#1a4a1a' };
      case 'G': return { base: '#74d858', hi: '#a8f080', lo: '#52b844', edge: '#1a4a1a' };
      case 'c': return { base: '#c8843e', hi: '#e8a860', lo: '#9a5a28', edge: '#4a2810' };
      case 'C': return { base: '#dc9c54', hi: '#f4c078', lo: '#b0703a', edge: '#4a2810' };
      default: return null;
    }
  }

  function buildLand(grid, data) {
    const c = G.Gfx.mk(MW, MH), x = c.getContext('2d');
    const rnd = G.Gfx.rng(99);
    const at = (r, cc) => (r < 0 || r >= ROWS || cc < 0 || cc >= COLS) ? '~' : grid[r][cc];
    const isLand = (t) => t !== '~' && t !== 'b';
    const isGrass = (t) => t === 'g' || t === 'G';
    const isWater = (t) => t === 'w' || t === 'f';

    for (let r = 0; r < ROWS; r++) {
      for (let cc = 0; cc < COLS; cc++) {
        const t = grid[r][cc], px = cc * TS, py = r * TS;
        const up = at(r - 1, cc), dn = at(r + 1, cc), lf = at(r, cc - 1), rt = at(r, cc + 1);
        if (t === '~') {
          // shoreline foam
          x.fillStyle = '#d8f0ff';
          if (isLand(up)) for (let i = 0; i < 8; i += 2) x.fillRect(px + i + (r & 1), py, 1, 1);
          if (isLand(lf)) for (let i = 0; i < 8; i += 2) x.fillRect(px, py + i, 1, 1);
          if (isLand(rt)) for (let i = 0; i < 8; i += 2) x.fillRect(px + 7, py + i + 1, 1, 1);
          continue;
        }
        if (isGrass(t)) {
          const k = cellColors(t);
          x.fillStyle = k.base; x.fillRect(px, py, TS, TS);
          for (let n = 0; n < 3; n++) {
            x.fillStyle = n === 2 ? k.lo : k.hi;
            x.fillRect(px + Math.floor(rnd() * 8), py + Math.floor(rnd() * 8), 1, 1);
          }
          if (rnd() < 0.08) { x.fillStyle = ['#ff8ab0', '#ffffff', '#ffe060'][Math.floor(rnd() * 3)]; x.fillRect(px + 3, py + 3, 1, 1); }
          x.fillStyle = k.edge;
          if (!isGrass(up) && !isWater(up) && up !== 'S') x.fillRect(px, py, TS, 1);
          if (!isGrass(lf) && !isWater(lf) && lf !== 'S') x.fillRect(px, py, 1, TS);
          if (!isGrass(rt) && !isWater(rt) && rt !== 'S') x.fillRect(px + 7, py, 1, TS);
          if (dn === 'c' || dn === 'C' || dn === 'f' || dn === 'S') { x.fillStyle = k.lo; x.fillRect(px, py + 6, TS, 1); x.fillStyle = k.edge; x.fillRect(px, py + 7, TS, 1); }
          else if (dn === '~') { x.fillStyle = k.edge; x.fillRect(px, py + 7, TS, 1); }
        } else if (t === 'c' || t === 'C' || t === 'S') {
          const k = cellColors(t === 'S' ? (r < 10 ? 'C' : 'c') : t);
          x.fillStyle = k.base; x.fillRect(px, py, TS, TS);
          if (t === 'S') {
            for (let j = 0; j < 8; j += 3) { x.fillStyle = k.hi; x.fillRect(px + 1, py + j, 6, 1); x.fillStyle = k.lo; x.fillRect(px + 1, py + j + 2, 6, 1); }
            x.fillStyle = k.edge; x.fillRect(px, py, 1, TS); x.fillRect(px + 7, py, 1, TS);
          } else {
            x.fillStyle = k.lo;
            for (let i = 0; i < 8; i++) if ((px + i) % 4 === 0) x.fillRect(px + i, py + 1, 1, 7);
            x.fillStyle = k.hi;
            for (let i = 0; i < 8; i++) if ((px + i) % 4 === 1) x.fillRect(px + i, py + 2 + ((px + i) % 3), 1, 2);
            if (up !== t) { x.fillStyle = k.lo; x.fillRect(px, py, TS, 1); }
            x.fillStyle = k.edge;
            if (dn === '~' || dn === 'g' || dn === 'w') x.fillRect(px, py + 7, TS, 1);
            if (!isLand(lf) || isGrass(lf)) x.fillRect(px, py, 1, TS);
            if (!isLand(rt) || isGrass(rt)) x.fillRect(px + 7, py, 1, TS);
          }
        } else if (t === 'w') {
          x.fillStyle = '#3a8ae8'; x.fillRect(px, py, TS, TS);
          x.fillStyle = '#9ad0ff'; x.fillRect(px + 2, py + 2, 2, 1); x.fillRect(px + 5, py + 5, 2, 1);
          x.fillStyle = '#1a4a8a';
          if (!isWater(up)) x.fillRect(px, py, TS, 1);
          if (!isWater(dn)) x.fillRect(px, py + 7, TS, 1);
          if (!isWater(lf)) x.fillRect(px, py, 1, TS);
          if (!isWater(rt)) x.fillRect(px + 7, py, 1, TS);
        } else if (t === 'b') {
          x.fillStyle = '#c88a48'; x.fillRect(px, py, TS, TS);
          x.fillStyle = '#7a4a20';
          for (let i = 0; i < 8; i += 3) x.fillRect(px + i, py, 1, TS);
          if (up !== 'b') { x.fillStyle = '#5a3010'; x.fillRect(px, py, TS, 2); }
          if (dn !== 'b') { x.fillStyle = '#5a3010'; x.fillRect(px, py + 6, TS, 2); }
        }
      }
    }

    // trails: dark rim then light dirt, skipping stairs and the bridge
    const onTrail = [];
    const cellAt = (px, py) => at(Math.floor(py / TS), Math.floor(px / TS));
    for (const pass of [0, 1]) {
      for (const e of data.edges) {
        walk(e.pts, function (px, py) {
          const t = cellAt(px, py);
          if (t === 'S' || t === 'b') return;
          if (pass === 0) { x.fillStyle = '#9a7040'; x.fillRect(px - 3, py - 3, 7, 7); onTrail.push([px, py]); }
          else { x.fillStyle = '#f0d8a0'; x.fillRect(px - 2, py - 2, 5, 5); }
        });
      }
    }

    // scenery: fixed landmarks + scattered trees/bushes on open grass
    const pieces = [];
    const fixed = { hut: makeHut(), sign: makeSignpost(), fortress: makeFortress(), spire: makeSpire() };
    const boxes = [];
    for (const d of data.decor) {
      const img = fixed[d.k];
      pieces.push({ img: img, x: d.x, y: d.y });
      boxes.push([d.x - 2, d.y - 2, img.width + 4, img.height + 4]);
    }
    const makers = { pine: makePine, round: makeRoundTree, bush: makeBush, cactus: makeMapCactus, rock: makeRock, palm: makePalm, snowpine: makeSnowyPine };
    const kinds = PAL.scatter.map((k) => makers[k]());
    const clear = (px, py, w, h) => {
      for (const b of boxes) if (px < b[0] + b[2] && px + w > b[0] && py < b[1] + b[3] && py + h > b[1]) return false;
      for (const p of onTrail) if (p[0] > px - 6 && p[0] < px + w + 6 && p[1] > py - 4 && p[1] < py + h + 6) return false;
      for (const n of data.nodes) if (Math.abs(n.x - (px + w / 2)) < 14 && Math.abs(n.y - (py + h)) < 14) return false;
      for (let yy = py + h - 4; yy <= py + h + 2; yy += 3) {
        for (let xx = px - 2; xx <= px + w + 2; xx += 4) if (!isGrass(cellAt(xx, yy))) return false;
      }
      return isGrass(cellAt(px + w / 2, py + 2));
    };
    let placed = 0;
    for (let tries = 0; tries < 900 && placed < 46; tries++) {
      const img = kinds[Math.floor(rnd() * kinds.length)];
      const px = Math.floor(rnd() * (MW - img.width)), py = Math.floor(rnd() * (MH - img.height));
      if (!clear(px, py, img.width, img.height)) continue;
      pieces.push({ img: img, x: px, y: py });
      boxes.push([px, py, img.width, img.height]);
      placed++;
    }
    pieces.sort((a, b) => (a.y + a.img.height) - (b.y + b.img.height));
    for (const p of pieces) x.drawImage(p.img, p.x, p.y);
    return c;
  }

  // Cream frame background with a small repeating motif.
  function makePattern() {
    const c = G.Gfx.mk(32, 32), x = c.getContext('2d');
    x.fillStyle = '#e6d6ae'; x.fillRect(0, 0, 32, 32);
    x.fillStyle = '#fbf3df';
    x.fillRect(7, 5, 1, 5); x.fillRect(5, 7, 5, 1);
    x.fillRect(22, 20, 3, 1); x.fillRect(21, 21, 1, 1); x.fillRect(25, 21, 1, 1); x.fillRect(22, 22, 3, 1);
    x.fillStyle = '#d4c094'; x.fillRect(26, 6, 1, 1); x.fillRect(12, 26, 1, 1);
    return c;
  }

  const cache = {};
  let warpIcon = null;
  function art(wi) {
    if (cache[wi]) return cache[wi];
    const data = G.Worlds[wi];
    PAL = PALETTES[data.palette] || PALETTES.green;
    const grid = buildGrid(data);
    const falls = [];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (grid[r][c] === 'f') falls.push([c * TS, r * TS]);
    const cloud = G.Sprites.cloud;
    const shadow = G.Gfx.mk(cloud.width, cloud.height), sx = shadow.getContext('2d');
    sx.drawImage(cloud, 0, 0);
    sx.globalCompositeOperation = 'source-in';
    sx.fillStyle = '#000'; sx.fillRect(0, 0, cloud.width, cloud.height);
    if (!warpIcon) warpIcon = makeWarp();
    cache[wi] = { grid: grid, water: [waterFrame(0), waterFrame(3)], land: buildLand(grid, data), falls: falls, pattern: makePattern(), cloudShadow: shadow };
    return cache[wi];
  }

  // Exposed for tests: the terrain grid of a world map.
  function gridOf(wi) { return art(wi).grid; }

  // ---------------------------------------------------------------- scene
  class WorldMap {
    constructor(game) {
      this.game = game;
      const st = G.Save.get();
      this.world = Math.min(st.mapWorld || 0, G.Worlds.length - 1);
      this.data = G.Worlds[this.world];
      this.nodes = this.data.nodes;
      this.current = Math.min(st.mapNode || 0, this.nodes.length - 1);
      this.bob = 0;
      this.move = null; // { pts, len, d, to }
      this.art = art(this.world);
      G.Audio.startMusic('map');
    }

    // Waypoints from node a to node b (reversed when walking an edge backwards).
    edgePts(a, b) {
      for (const e of this.data.edges) {
        if (e.a === a && e.b === b) return e.pts;
        if (e.a === b && e.b === a) return e.pts.slice().reverse();
      }
      return null;
    }

    neighbors(i) {
      const n = [];
      for (const e of this.data.edges) { if (e.a === i) n.push(e.b); if (e.b === i) n.push(e.a); }
      return n;
    }

    // Last level of this world (its fortress) — clearing it opens the warp to the next world.
    lastLevel() {
      let m = 0;
      for (const n of this.nodes) if (n.level != null) m = Math.max(m, n.level);
      return m;
    }

    isUnlocked(i) {
      const n = this.nodes[i];
      if (n.warp === -1) return true;
      if (n.warp === 1) return G.Save.isCleared(this.lastLevel());
      return n.level === 0 || G.Save.isCleared(n.level - 1);
    }

    // Travel to the neighbouring world map, arriving on its matching warp.
    warpTo(dir) {
      const target = this.world + dir;
      const arrive = G.Worlds[target].nodes.findIndex((n) => n.warp === -dir);
      G.Save.setWorld(target, Math.max(0, arrive));
      this.game.go(() => this.game.goMap());
    }

    tryMove(dx, dy) {
      if (this.move) return;
      let best = -1, bestScore = 0.5;
      for (const j of this.neighbors(this.current)) {
        if (!this.isUnlocked(j)) continue;
        const pts = this.edgePts(this.current, j);
        const ndx = pts[1][0] - pts[0][0], ndy = pts[1][1] - pts[0][1];
        const len = Math.hypot(ndx, ndy) || 1;
        const score = (ndx / len) * dx + (ndy / len) * dy;
        if (score > bestScore) { bestScore = score; best = j; }
      }
      if (best < 0) return;
      const pts = this.edgePts(this.current, best);
      let len = 0;
      for (let i = 0; i < pts.length - 1; i++) len += Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
      this.move = { pts: pts, len: len, d: 0, to: best };
      G.Audio.sfx.select();
    }

    update(dt) {
      const In = G.Input;
      this.bob += dt;
      if (this.move) {
        this.move.d += 1.3;
        if (this.move.d >= this.move.len) {
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
          const nd = this.nodes[this.current], o = this.origin();
          if (nd.warp) this.warpTo(nd.warp);
          else this.game.go(() => this.game.startLevel(nd.level), nd.x + o.x, nd.y + o.y);
        } else {
          G.Audio.sfx.bump();
        }
      }
    }

    origin() { return { x: Math.round((G.R.BASE_W - MW) / 2), y: HEADER + 2 }; }

    heroPos() {
      if (!this.move) { const n = this.nodes[this.current]; return { x: n.x, y: n.y, walking: false, dir: 1 }; }
      const pts = this.move.pts;
      let d = this.move.d;
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1];
        const seg = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (d <= seg || i === pts.length - 2) {
          const t = seg ? Math.min(1, d / seg) : 1;
          return { x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t, walking: true, dir: b[0] > a[0] ? 1 : (b[0] < a[0] ? -1 : 0) };
        }
        d -= seg;
      }
      const last = pts[pts.length - 1];
      return { x: last[0], y: last[1], walking: true, dir: 1 };
    }

    render() {
      const R = G.R, T = G.Text, S = G.Sprites, ctx = R.getCtx();
      const A = this.art, tt = this.game.animFrame;
      const o = this.origin();
      R.setCamera(0, 0);

      // frame background
      for (let y = 0; y < R.BASE_H; y += 32) for (let x = 0; x < R.BASE_W; x += 32) ctx.drawImage(A.pattern, x, y);

      // header: lives + level name
      const nd = this.nodes[this.current];
      R.spriteS(S.lifeIcon, o.x, 3);
      T.drawShadow('x' + this.game.lives, o.x + 16, 6, '#fff', 1, '#3a2a1a');
      let name;
      if (nd.warp === 1) name = 'IR A ' + G.Worlds[this.world + 1].name;
      else if (nd.warp === -1) name = 'VOLVER A ' + G.Worlds[this.world - 1].name;
      else name = G.Levels[nd.level].name;
      const scale = T.width(name, 2) <= MW - 48 ? 2 : 1;
      T.drawShadow(name, o.x + 44, scale === 2 ? 3 : 6, '#ffffff', scale, '#3a2a1a');

      // window: shadow, border, then the map clipped inside
      R.rectS(o.x + 4, o.y + 4, MW, MH, 'rgba(60,40,20,0.35)');
      R.rectS(o.x - 2, o.y - 2, MW + 4, MH + 4, '#1c1024');
      ctx.save();
      ctx.beginPath(); ctx.rect(o.x, o.y, MW, MH); ctx.clip();
      ctx.translate(o.x, o.y);

      ctx.drawImage(A.water[(tt >> 5) & 1], 0, 0);
      ctx.drawImage(A.land, 0, 0);
      // waterfall streaks
      for (const f of A.falls) {
        ctx.fillStyle = '#6ab4f8'; ctx.fillRect(f[0], f[1], TS, TS);
        ctx.fillStyle = '#ffffff';
        for (let i = 0; i < TS; i += 3) ctx.fillRect(f[0] + i, f[1] + ((tt >> 1) + i * 3) % TS, 1, 3);
      }

      // level dots
      for (let i = 0; i < this.nodes.length; i++) {
        const n = this.nodes[i];
        if (n.warp) {
          ctx.globalAlpha = this.isUnlocked(i) ? 1 : 0.45;
          ctx.drawImage(warpIcon, n.x - 8, n.y - 9);
          ctx.globalAlpha = 1;
          continue;
        }
        let fill;
        if (G.Save.isCleared(n.level)) fill = '#4ac0f0';
        else if (this.isUnlocked(i)) fill = ((tt >> 4) & 1) ? '#fff08a' : '#f8d038';
        else fill = '#8a8a8a';
        ctx.fillStyle = '#1c1024'; ctx.fillRect(n.x - 6, n.y - 3, 12, 7); ctx.fillRect(n.x - 5, n.y - 4, 10, 9);
        ctx.fillStyle = fill; ctx.fillRect(n.x - 5, n.y - 2, 10, 5); ctx.fillRect(n.x - 4, n.y - 3, 8, 7);
        ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(n.x - 3, n.y - 2, 3, 1);
      }

      // hero
      const hp = this.heroPos();
      const idle = S.heroSets.small.idle, walk = S.heroSets.small.walk;
      const img = hp.walking && ((tt >> 3) & 1) ? walk : idle;
      const bobY = hp.walking ? 0 : Math.round(Math.sin(this.bob * 5));
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(Math.round(hp.x) - 5, Math.round(hp.y) + 1, 10, 3);
      R.spriteS(img, Math.round(hp.x - img.width / 2), Math.round(hp.y - img.height + 2 + bobY), hp.dir < 0);

      // drifting clouds with shadows
      for (let k = 0; k < 2; k++) {
        const cx = ((tt * (0.12 + k * 0.05) + k * 210) % (MW + 80)) - 50;
        const cy = 24 + k * 70;
        ctx.globalAlpha = 0.16; ctx.drawImage(A.cloudShadow, Math.round(cx) + 8, cy + 26);
        ctx.globalAlpha = 0.9; ctx.drawImage(S.cloud, Math.round(cx), cy); ctx.globalAlpha = 1;
      }

      // world name tag (bottom-left of the window)
      R.rectS(2, MH - 15, T.width(this.data.name, 1) + 8, 13, 'rgba(20,10,30,0.55)');
      T.drawShadow(this.data.name, 6, MH - 12, '#fff6c0', 1, '#000');

      // info panel: coins + medals of the selected level
      R.rectS(MW - 76, 2, 74, 13, 'rgba(20,10,30,0.55)');
      ctx.drawImage(S.coin[0], MW - 72, 3, 7, 10);
      T.drawShadow('x' + this.game.coins, MW - 63, 5, '#ffe060', 1, '#000');
      const m = nd.level != null ? G.Save.medals(nd.level) : 0;
      for (let k = 0; k < 3; k++) ctx.drawImage((m & (1 << k)) ? S.medal : S.medalFaded, MW - 34 + k * 10, 3, 8, 11);

      // prompt over the southern sea
      if (!this.move && ((tt >> 5) & 1)) {
        const msg = !this.isUnlocked(this.current) ? 'BLOQUEADO' : (nd.warp ? 'PULSA A PARA VIAJAR' : 'PULSA A PARA JUGAR');
        T.drawShadow(msg, Math.round((MW - T.width(msg, 1)) / 2), MH - 22, '#fff', 1, '#1c1024');
      }
      ctx.restore();
    }
  }

  G.WorldMap = WorldMap;
  G.WorldMapGrid = gridOf;
})(window.GAME = window.GAME || {});
