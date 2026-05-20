// Level data + world map. Levels are built procedurally (deterministic per seed)
// so the maps are large and varied without hand-typing huge strings.
(function (G) {
  'use strict';

  const H = 14;          // rows tall
  const GROUND_R = 12;   // top ground row (row 13 is dirt)

  function rngFactory(seed) {
    let s = seed >>> 0;
    return function () {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  function buildLevel(seed, opts) {
    const W = opts.width;
    const rnd = rngFactory(seed);
    // grid of chars
    const g = [];
    for (let r = 0; r < H; r++) { g[r] = new Array(W).fill(' '); }

    function set(c, r, ch) { if (c >= 0 && c < W && r >= 0 && r < H) g[r][c] = ch; }
    function fillGround(c) { set(c, GROUND_R, '#'); set(c, GROUND_R + 1, 'd'); }

    // base ground everywhere
    for (let c = 0; c < W; c++) fillGround(c);

    // pits (skip start and finish zones)
    const pits = [];
    const numPits = opts.pits || 0;
    for (let i = 0; i < numPits; i++) {
      const pw = 2 + Math.floor(rnd() * 3);
      const pc = 10 + Math.floor(rnd() * (W - 30));
      pits.push([pc, pw]);
      for (let c = pc; c < pc + pw; c++) { set(c, GROUND_R, ' '); set(c, GROUND_R + 1, ' '); }
    }
    function overPit(c) {
      for (const [pc, pw] of pits) if (c >= pc - 1 && c <= pc + pw) return true;
      return false;
    }

    // player start
    set(2, GROUND_R - 1, 'S');

    // pipes
    const numPipes = opts.pipes || 0;
    for (let i = 0; i < numPipes; i++) {
      const c = 14 + Math.floor(rnd() * (W - 40));
      if (overPit(c) || overPit(c + 1)) continue;
      const ph = 1 + Math.floor(rnd() * 2); // height in body tiles
      const topR = GROUND_R - 1 - ph;
      set(c, topR, '[');
      set(c + 1, topR, ']');
      for (let r = topR + 1; r <= GROUND_R - 1; r++) { set(c, r, '{'); set(c + 1, r, '}'); }
    }

    // floating brick/question rows
    const numRows = opts.blockRows || 0;
    for (let i = 0; i < numRows; i++) {
      const len = 3 + Math.floor(rnd() * 4);
      const c0 = 8 + Math.floor(rnd() * (W - 24));
      const r = GROUND_R - 4 - Math.floor(rnd() * 2);
      for (let c = c0; c < c0 + len; c++) {
        if (c >= W - 8) break;
        const k = rnd();
        if (k < 0.18) set(c, r, '?');
        else if (k < 0.26) set(c, r, 'm');
        else set(c, r, 'B');
      }
    }

    // lone power-up block guaranteed early
    set(7, GROUND_R - 4, 'm');

    // one-way platforms
    const numPlat = opts.platforms || 0;
    for (let i = 0; i < numPlat; i++) {
      const len = 2 + Math.floor(rnd() * 3);
      const c0 = 12 + Math.floor(rnd() * (W - 30));
      const r = GROUND_R - 3 - Math.floor(rnd() * 3);
      for (let c = c0; c < c0 + len; c++) set(c, r, '-');
    }

    // spikes in some pits floors (only shallow decorative) - skip for safety

    // coins: arcs and lines
    const numCoinGroups = opts.coins || 0;
    for (let i = 0; i < numCoinGroups; i++) {
      const c0 = 6 + Math.floor(rnd() * (W - 16));
      const len = 3 + Math.floor(rnd() * 4);
      const r = GROUND_R - 3 - Math.floor(rnd() * 4);
      for (let j = 0; j < len; j++) {
        const c = c0 + j;
        if (c >= W - 6) break;
        if (g[r][c] === ' ') set(c, r, 'o');
      }
    }

    // enemies on ground
    const numEnemies = opts.enemies || 0;
    for (let i = 0; i < numEnemies; i++) {
      const c = 12 + Math.floor(rnd() * (W - 28));
      if (overPit(c)) continue;
      // don't place inside a pipe column
      if (g[GROUND_R - 1][c] !== ' ') continue;
      const koopa = opts.koopas && rnd() < 0.4;
      set(c, GROUND_R - 1, koopa ? 'k' : 'g');
    }

    // finish: clear last zone, ensure solid ground, place flag
    for (let c = W - 12; c < W; c++) { fillGround(c); }
    set(W - 8, GROUND_R - 1, 'F');

    // staircase before flag (classic)
    for (let s = 0; s < 4; s++) {
      for (let h = 0; h <= s; h++) {
        set(W - 18 + s, GROUND_R - 1 - h, 'X');
      }
    }

    return g.map((row) => row.join(''));
  }

  const configs = [
    { name: 'WORLD 1-1  GREEN HILLS', bg: '#5c94fc', width: 110,
      pits: 2, pipes: 2, blockRows: 2, platforms: 1, coins: 4, enemies: 4, koopas: false },
    { name: 'WORLD 1-2  COIN CAVERN', bg: '#3a3a6a', width: 120,
      pits: 3, pipes: 2, blockRows: 3, platforms: 2, coins: 6, enemies: 5, koopas: true },
    { name: 'WORLD 1-3  SKY PLATFORMS', bg: '#7fb0ff', width: 130,
      pits: 4, pipes: 1, blockRows: 2, platforms: 4, coins: 6, enemies: 6, koopas: true },
    { name: 'WORLD 2-1  KOOPA FIELDS', bg: '#5c94fc', width: 140,
      pits: 4, pipes: 3, blockRows: 3, platforms: 2, coins: 7, enemies: 8, koopas: true },
    { name: 'WORLD 2-2  PIPE MAZE', bg: '#2f7a4a', width: 150,
      pits: 5, pipes: 5, blockRows: 3, platforms: 3, coins: 7, enemies: 8, koopas: true },
    { name: 'WORLD 2-3  CASTLE RUN', bg: '#402030', width: 160,
      pits: 6, pipes: 3, blockRows: 4, platforms: 4, coins: 8, enemies: 10, koopas: true }
  ];

  const levels = configs.map((cfg, i) => ({
    name: cfg.name,
    bg: cfg.bg,
    map: buildLevel(1000 + i * 777, cfg)
  }));

  // World map: node positions on the BASE_W x BASE_H screen, linked to level index.
  const worldMap = {
    bg: '#2e7d32',
    nodes: [
      { x: 60, y: 92, level: 0 },
      { x: 120, y: 122, level: 1 },
      { x: 182, y: 92, level: 2 },
      { x: 244, y: 122, level: 3 },
      { x: 300, y: 96, level: 4 },
      { x: 350, y: 66, level: 5 }
    ],
    // edges connect node index a->b (drawn as paths)
    edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5]]
  };

  G.Levels = levels;
  G.WorldMapData = worldMap;
})(window.GAME = window.GAME || {});
