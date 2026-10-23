// 16-bit style pixel art generated entirely in code (original characters, no external assets).
// Sprites are authored as pixel rows + palette, then outlined; terrain is drawn procedurally.
(function (G) {
  'use strict';

  function mk(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }

  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Add a 1px dark outline around every opaque pixel (the classic 16-bit look).
  function outline(src, color) {
    const w = src.width, h = src.height;
    const sil = mk(w, h);
    const sx = sil.getContext('2d');
    sx.drawImage(src, 0, 0);
    sx.globalCompositeOperation = 'source-in';
    sx.fillStyle = color;
    sx.fillRect(0, 0, w, h);
    const out = mk(w + 2, h + 2);
    const ox = out.getContext('2d');
    [[0, 1], [2, 1], [1, 0], [1, 2]].forEach(function (d) { ox.drawImage(sil, d[0], d[1]); });
    ox.drawImage(src, 1, 1);
    return out;
  }

  // Bake pixel rows into a canvas; optional outline color.
  function bake(rows, pal, ol) {
    const h = rows.length, w = rows[0].length;
    const c = mk(w, h);
    const x = c.getContext('2d');
    for (let j = 0; j < h; j++) {
      if (rows[j].length !== w) console.warn('sprite row width mismatch at row', j, rows[j].length, 'vs', w);
      for (let i = 0; i < rows[j].length; i++) {
        const col = pal[rows[j][i]];
        if (!col) continue;
        x.fillStyle = col;
        x.fillRect(i, j, 1, 1);
      }
    }
    return ol ? outline(c, ol) : c;
  }

  // Filled pixel disc using row spans (no antialiasing).
  function disc(x, cx, cy, r, color) {
    x.fillStyle = color;
    for (let dy = -r; dy <= r; dy++) {
      const dx = Math.floor(Math.sqrt(r * r - dy * dy) + 0.5);
      x.fillRect(cx - dx, cy + dy, dx * 2 + 1, 1);
    }
  }

  const OL = '#1c1024';

  // ---------------------------------------------------------------- hero "Pip"
  const heroPalNormal = {
    t: '#25b5a4', T: '#177a74', y: '#ffd84a', Y: '#d89a1c', s: '#ffd0a4', S: '#e29a6c',
    k: '#2a1a3a', o: '#f28a2e', O: '#b8501a', b: '#6e3c1e'
  };
  const heroPalFire = {
    t: '#e8403a', T: '#a02020', y: '#ffd84a', Y: '#d89a1c', s: '#ffd0a4', S: '#e29a6c',
    k: '#2a1a3a', o: '#f6f6fa', O: '#b4b4c8', b: '#6e3c1e'
  };

  const H_IDLE = [
    '....yyyy....',
    '....yYYy....',
    '...tttttt...',
    '..tttttttt..',
    '..tttttttT..',
    '..ssssssss..',
    '.ssksssskss.',
    '.ssksssskss.',
    '.sssssssssS.',
    '..ssSSSSss..',
    '..yyyyyyyy..',
    '.ooooooooOo.',
    '.sooooooooS.',
    '..oooOOooo..',
    '..bbb..bbb..',
    '.bbbb..bbbb.'
  ];
  const H_WALK = H_IDLE.slice(0, 13).concat([
    '..ooo..ooo..',
    '.bbb....bbb.',
    'bbb......bbb'
  ]);
  const H_JUMP = H_IDLE.slice(0, 10).concat([
    's.yyyyyyyy.s',
    'soooooooooos',
    '.oooooooooo.',
    '..oooOOooo..',
    '.bbb....bbb.',
    'bbbb....bbbb'
  ]);

  // Grow a small sprite into a tall one: stretch the tunic, then add a belt and legs so it reads as a body.
  function bigOf(rows, torsoIdx, handsIdx) {
    const head = rows.slice(0, 11);
    const A = rows[torsoIdx], H = rows[handsIdx];
    const BELT = '.OOOOOOOOOO.';
    const LEG = '..ooo..ooo..';
    const feet = rows.slice(13);
    return head.concat([A, A, A, A, H, A, A, A, BELT, LEG, LEG, LEG], feet);
  }

  function buildHero(pal) {
    return {
      small: {
        idle: bake(H_IDLE, pal, OL),
        walk: bake(H_WALK, pal, OL),
        jump: bake(H_JUMP, pal, OL)
      },
      big: {
        idle: bake(bigOf(H_IDLE, 11, 12), pal, OL),
        walk: bake(bigOf(H_WALK, 11, 12), pal, OL),
        jump: bake(bigOf(H_JUMP, 12, 12), pal, OL)
      }
    };
  }
  const heroPalWind = {
    t: '#ffffff', T: '#a8c8f0', y: '#5ab0ff', Y: '#2a70c0', s: '#ffd0a4', S: '#e29a6c',
    k: '#2a1a3a', o: '#7ac8ff', O: '#2a78c8', b: '#6e3c1e'
  };
  const heroN = buildHero(heroPalNormal);
  const heroF = buildHero(heroPalFire);
  const heroW = buildHero(heroPalWind);
  const heroSets = { small: heroN.small, big: heroN.big, fire: heroF.big, cloud: heroW.big };
  const heroCrouch = { big: heroN.small.idle, fire: heroF.small.idle, cloud: heroW.small.idle };
  const lifeIcon = bake(H_IDLE.slice(0, 10), heroPalNormal, OL);

  // ---------------------------------------------------------------- enemies
  const blobPal = { p: '#8a4fd0', P: '#5e2fa0', L: '#c9a0f0', w: '#ffffff', k: '#1a1030', f: '#3a2060' };
  const BLOB_A = [
    '..p..........p..',
    '..pp........pp..',
    '..pppppppppppp..',
    '.pppppppppppppp.',
    '.pwwwwppppwwwwp.',
    '.pwkkwppppwkkwp.',
    '.ppkkppppppkkpp.',
    'pppppppppppppppp',
    'ppPPPPPPPPPPPPpp',
    'pPLLLLLLLLLLLLPp',
    'pPLLLLLLLLLLLLPp',
    'ppPLLLLLLLLLLPpp',
    '.ppPPPPPPPPPPpp.',
    '..ffff....ffff..',
    '.fffff....fffff.',
    '................'
  ];
  const BLOB_B = BLOB_A.slice(0, 13).concat([
    '...ffff..ffff...',
    '..fffff..fffff..',
    '................'
  ]);
  const blob = [bake(BLOB_A, blobPal, OL), bake(BLOB_B, blobPal, OL)];

  const snailPal = {
    s: '#7a3a10', o: '#f0a030', O: '#d07818', y: '#ffe070',
    g: '#9bd05a', G: '#6aa03a', k: '#101010'
  };
  const SHELL_ROWS = [
    '.....ssssss.....',
    '....sooooooss...',
    '...soOOOOOOoss..',
    '...soOyyyyOoss..',
    '..soOyOOOOyOos..',
    '..soOyOyyOyOos..',
    '..soOOyyyyOOos..',
    '..ssoOOOOOOoss..',
    '...ssooooooss...',
    '.....ssssss.....'
  ];
  const SNAIL_ROWS = ['................'].concat(SHELL_ROWS.slice(0, 9), [
    '.gg..sssssss....',
    'gkgggggggggggg..',
    'ggggggggggggggg.',
    '.GGGGGGGGGGGGG..',
    '..GGGGGGGGGGG...'
  ]);
  const snail = bake(SNAIL_ROWS, snailPal, OL);
  const shell = bake(SHELL_ROWS, snailPal, OL);

  // ---------------------------------------------------------------- items
  function makeBerry() {
    const c = mk(14, 14), x = c.getContext('2d');
    disc(x, 7, 8, 6, '#a01868');
    disc(x, 6, 7, 5, '#e0409a');
    disc(x, 5, 5, 2, '#ff8cc8');
    x.fillStyle = '#ffffff'; x.fillRect(4, 4, 1, 1);
    x.fillStyle = '#3aa83a'; x.fillRect(6, 0, 3, 2); x.fillRect(8, 1, 3, 1);
    x.fillStyle = '#1f7a1f'; x.fillRect(6, 2, 2, 1);
    return outline(c, OL);
  }
  function makeFlower() {
    const c = mk(14, 14), x = c.getContext('2d');
    x.fillStyle = '#3aa83a'; x.fillRect(6, 8, 2, 6); x.fillRect(3, 11, 3, 1); x.fillRect(8, 10, 3, 1);
    const petals = [[7, 2], [3, 5], [11, 5], [5, 8], [9, 8]];
    petals.forEach(function (p) { disc(x, p[0], p[1], 2, '#ff7a1a'); });
    disc(x, 7, 5, 2, '#ffd84a');
    x.fillStyle = '#fff6c0'; x.fillRect(6, 4, 1, 1);
    return outline(c, OL);
  }
  function makeFireball() {
    const c = mk(8, 8), x = c.getContext('2d');
    disc(x, 4, 4, 3, '#e8401a');
    disc(x, 4, 4, 2, '#ff9a1a');
    disc(x, 4, 4, 1, '#ffee80');
    return c;
  }
  const berry = makeBerry();
  const flower = makeFlower();
  const fireball = makeFireball();

  const itemPal = { y: '#f7d51d', Y: '#c79a10', w: '#ffffff' };
  const coinA = bake([
    '...yyyy...', '..yYYYYy..', '.yYYwwYYy.', '.yYwYYwYy.', 'yYYwYYwYYy', 'yYYwYYwYYy', 'yYYwYYwYYy',
    'yYYwYYwYYy', 'yYYwYYwYYy', '.yYwYYwYy.', '.yYYwwYYy.', '..yYYYYy..', '...yyyy...', '..........'
  ], itemPal);
  const coinB = bake([
    '....yy....', '...yYYy...', '..yYwwYy..', '..yYwwYy..', '..yYwwYy..', '..yYwwYy..', '..yYwwYy..',
    '..yYwwYy..', '..yYwwYy..', '..yYwwYy..', '..yYwwYy..', '...yYYy...', '....yy....', '..........'
  ], itemPal);
  const coinC = bake([
    '.....y....', '.....Y....', '....yYy...', '....yYy...', '....yYy...', '....yYy...', '....yYy...',
    '....yYy...', '....yYy...', '....yYy...', '....yYy...', '.....Y....', '.....y....', '..........'
  ], itemPal);

  // ---------------------------------------------------------------- tilesets
  const THEMES = {
    overworld: { grass: '#58c840', grassHi: '#a0f070', grassDk: '#2e8a2a', soil: '#b8742c', soilDk: '#8c4e1c', soilHi: '#d89848',
      outline: '#2a1808', brick: '#d89040', brickDk: '#8a4a18', brickHi: '#f8c868', seed: 11 },
    cave: { grass: '#7a7ab0', grassHi: '#aaaae0', grassDk: '#4e4e88', soil: '#4a4a78', soilDk: '#32325a', soilHi: '#64649a',
      outline: '#12122a', brick: '#6a6aa8', brickDk: '#34346a', brickHi: '#9a9ad8', seed: 23 },
    sky: { grass: '#f0f4ff', grassHi: '#ffffff', grassDk: '#b8c8f0', soil: '#d8e4ff', soilDk: '#a8bce8', soilHi: '#f4f8ff',
      outline: '#5870b0', brick: '#f0b0c8', brickDk: '#b06080', brickHi: '#ffd8e4', seed: 37 },
    dusk: { grass: '#d0a838', grassHi: '#f4d870', grassDk: '#8a6a20', soil: '#8a4a50', soilDk: '#5e2a3a', soilHi: '#b0686c',
      outline: '#2a1020', brick: '#c07060', brickDk: '#7a3040', brickHi: '#e8a090', seed: 41 },
    castle: { grass: '#8a8a98', grassHi: '#bcbcc8', grassDk: '#5a5a68', soil: '#6a6a78', soilDk: '#42424e', soilHi: '#8c8c9a',
      outline: '#14141c', brick: '#7a5a6a', brickDk: '#3a2030', brickHi: '#a88898', seed: 53 }
  };

  function buildTileset(p) {
    const rnd = rng(p.seed);

    function fillSoil(x, w, h) {
      x.fillStyle = p.soil; x.fillRect(0, 0, w, h);
      for (let j = 0; j < h; j++) {
        for (let i = 0; i < w; i++) {
          const r = rnd();
          if (r < 0.10) { x.fillStyle = p.soilDk; x.fillRect(i, j, 1, 1); }
          else if (r < 0.16) { x.fillStyle = p.soilHi; x.fillRect(i, j, 1, 1); }
        }
      }
    }

    function sideEdges(x, side, from) {
      x.fillStyle = p.outline;
      if (side < 0) x.fillRect(0, from, 1, 16 - from);
      if (side > 0) x.fillRect(15, from, 1, 16 - from);
    }

    function dirt(side) {
      const c = mk(16, 16), x = c.getContext('2d');
      fillSoil(x, 16, 16);
      sideEdges(x, side, 0);
      return c;
    }

    function ground(side) {
      const c = mk(16, 16), x = c.getContext('2d');
      fillSoil(x, 16, 16);
      x.fillStyle = p.grass; x.fillRect(0, 0, 16, 4);
      x.fillStyle = p.grassHi; x.fillRect(0, 1, 16, 1);
      x.fillStyle = p.grassDk; x.fillRect(0, 3, 16, 1);
      for (let i = 0; i < 16; i++) {
        const d = (i * 5 + 3) % 7;
        if (d < 3) { x.fillStyle = p.grass; x.fillRect(i, 4, 1, 1 + (d % 2)); }
        else if (d < 5) { x.fillStyle = p.grassDk; x.fillRect(i, 4, 1, 1); }
      }
      x.fillStyle = p.outline; x.fillRect(0, 0, 16, 1);
      sideEdges(x, side, 1);
      if (side < 0) {
        x.clearRect(0, 0, 2, 1); x.clearRect(0, 1, 1, 1);
        x.fillStyle = p.outline; x.fillRect(1, 1, 1, 1);
      }
      if (side > 0) {
        x.clearRect(14, 0, 2, 1); x.clearRect(15, 1, 1, 1);
        x.fillStyle = p.outline; x.fillRect(14, 1, 1, 1);
      }
      return c;
    }

    function brick() {
      const c = mk(16, 16), x = c.getContext('2d');
      x.fillStyle = p.brick; x.fillRect(0, 0, 16, 16);
      x.fillStyle = p.brickHi; x.fillRect(0, 0, 16, 1); x.fillRect(0, 8, 16, 1);
      x.fillStyle = p.brickDk;
      x.fillRect(0, 7, 16, 1); x.fillRect(0, 15, 16, 1);
      x.fillRect(7, 0, 1, 7); x.fillRect(3, 8, 1, 7); x.fillRect(11, 8, 1, 7);
      x.fillStyle = p.outline; x.fillRect(15, 0, 1, 16);
      return c;
    }

    return {
      groundL: ground(-1), groundM: ground(0), groundR: ground(1),
      dirtL: dirt(-1), dirtM: dirt(0), dirtR: dirt(1),
      brick: brick()
    };
  }

  const tilesets = {};
  Object.keys(THEMES).forEach(function (k) { tilesets[k] = buildTileset(THEMES[k]); });

  // ? block (4 shimmer frames)
  const QGLYPH = ['.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..'];
  function questionFrame(glow) {
    const c = mk(16, 16), x = c.getContext('2d');
    x.fillStyle = '#a04800'; x.fillRect(0, 0, 16, 16);
    x.fillStyle = '#f8b820'; x.fillRect(1, 1, 14, 14);
    x.fillStyle = '#ffe27a'; x.fillRect(1, 1, 14, 1); x.fillRect(1, 1, 1, 14);
    x.fillStyle = '#d88410'; x.fillRect(1, 14, 14, 1); x.fillRect(14, 1, 1, 14);
    x.fillStyle = '#a04800';
    [[2, 2], [13, 2], [2, 13], [13, 13]].forEach(function (p) { x.fillRect(p[0], p[1], 1, 1); });
    for (let pass = 0; pass < 2; pass++) {
      x.fillStyle = pass === 0 ? '#a04800' : glow;
      const off = pass === 0 ? 1 : 0;
      for (let j = 0; j < QGLYPH.length; j++) {
        for (let i = 0; i < 5; i++) {
          if (QGLYPH[j][i] === '#') x.fillRect(5 + i + off, 4 + j + off, 1, 1);
        }
      }
    }
    return c;
  }
  const tQuestion = ['#ffffff', '#ffeea0', '#ffd24a', '#ffeea0'].map(questionFrame);

  const tUsed = (function () {
    const c = mk(16, 16), x = c.getContext('2d');
    x.fillStyle = '#4a3020'; x.fillRect(0, 0, 16, 16);
    x.fillStyle = '#9a7a58'; x.fillRect(1, 1, 14, 14);
    x.fillStyle = '#b89a76'; x.fillRect(1, 1, 14, 1); x.fillRect(1, 1, 1, 14);
    x.fillStyle = '#7a5a3c'; x.fillRect(1, 14, 14, 1); x.fillRect(14, 1, 1, 14);
    x.fillStyle = '#4a3020';
    [[2, 2], [13, 2], [2, 13], [13, 13]].forEach(function (p) { x.fillRect(p[0], p[1], 1, 1); });
    return c;
  })();

  const tBlock = (function () {
    const c = mk(16, 16), x = c.getContext('2d');
    x.fillStyle = '#383848'; x.fillRect(0, 0, 16, 16);
    x.fillStyle = '#a8a8b8'; x.fillRect(1, 1, 14, 14);
    x.fillStyle = '#e0e0ec'; x.fillRect(1, 1, 14, 2); x.fillRect(1, 1, 2, 14);
    x.fillStyle = '#707080'; x.fillRect(1, 13, 14, 2); x.fillRect(13, 1, 2, 14);
    x.fillStyle = '#9090a0'; x.fillRect(4, 4, 8, 8);
    x.fillStyle = '#b8b8c8'; x.fillRect(4, 4, 8, 1); x.fillRect(4, 4, 1, 8);
    return c;
  })();

  const tSpike = (function () {
    const c = mk(16, 16), x = c.getContext('2d');
    x.fillStyle = '#586070'; x.fillRect(0, 12, 16, 4);
    for (let i = 0; i < 4; i++) {
      const bx = i * 4;
      x.fillStyle = '#d8e0ee'; x.fillRect(bx + 1, 6, 2, 6);
      x.fillStyle = '#ffffff'; x.fillRect(bx + 1, 3, 1, 3); x.fillRect(bx + 1, 5, 2, 1);
      x.fillStyle = '#8890a0'; x.fillRect(bx + 2, 4, 1, 8);
    }
    x.fillStyle = '#2a2e38'; x.fillRect(0, 12, 16, 1);
    return c;
  })();

  const tPlatform = (function () {
    const c = mk(16, 16), x = c.getContext('2d');
    x.fillStyle = '#3a2410'; x.fillRect(0, 0, 16, 5);
    x.fillStyle = '#b87838'; x.fillRect(0, 1, 16, 3);
    x.fillStyle = '#e8a860'; x.fillRect(0, 1, 16, 1);
    x.fillStyle = '#7a4a20'; x.fillRect(0, 3, 16, 1);
    x.fillStyle = '#3a2410'; for (let i = 3; i < 16; i += 8) x.fillRect(i, 1, 1, 3);
    return c;
  })();

  // Pipes: 32px-wide rim + body, split into two 16px tiles each.
  function pipeCols(w, rim) {
    const cols = [];
    for (let i = 0; i < w; i++) {
      let col = '#2aa88c';
      const e = rim ? 0 : 2;
      if (i === e || i === w - 1 - e) col = '#0e2a28';
      else if (i <= e + 2) col = '#16705c';
      else if (i >= w - e - 4) col = '#16705c';
      else if (i >= e + 8 && i <= e + 11) col = '#b8f0e0';
      else if (i >= e + 6 && i <= e + 7) col = '#5ad0b0';
      cols.push(col);
    }
    return cols;
  }
  function pipeTiles() {
    const rim = mk(32, 16), rx = rim.getContext('2d');
    const rc = pipeCols(32, true);
    for (let i = 0; i < 32; i++) { rx.fillStyle = rc[i]; rx.fillRect(i, 0, 1, 16); }
    rx.fillStyle = '#0e2a28'; rx.fillRect(0, 0, 32, 1); rx.fillRect(0, 15, 32, 1);
    rx.fillStyle = '#16705c'; rx.fillRect(1, 13, 30, 2);
    const body = mk(32, 16), bx = body.getContext('2d');
    const bc = pipeCols(32, false);
    for (let i = 2; i < 30; i++) { bx.fillStyle = bc[i]; bx.fillRect(i, 0, 1, 16); }
    function half(src, off) {
      const c = mk(16, 16);
      c.getContext('2d').drawImage(src, off, 0, 16, 16, 0, 0, 16, 16);
      return c;
    }
    return { TL: half(rim, 0), TR: half(rim, 16), L: half(body, 0), R: half(body, 16) };
  }
  const pipes = pipeTiles();

  // Flag pole pieces + goal banner
  const poleTile = bake([
    '.......ss.......', '.......ss.......', '.......ss.......', '.......ss.......',
    '.......ss.......', '.......ss.......', '.......ss.......', '.......ss.......',
    '.......ss.......', '.......ss.......', '.......ss.......', '.......ss.......',
    '.......ss.......', '.......ss.......', '.......ss.......', '.......ss.......'
  ], { s: '#d8dce8' });
  (function () { const x = poleTile.getContext('2d'); x.fillStyle = '#7a8098'; for (let j = 0; j < 16; j++) x.fillRect(8, j, 1, 1); })();
  const poleTop = (function () {
    const c = mk(16, 16), x = c.getContext('2d');
    disc(x, 8, 5, 4, '#ffd84a');
    disc(x, 7, 4, 2, '#fff6c0');
    x.fillStyle = '#d8dce8'; x.fillRect(7, 8, 2, 8);
    x.fillStyle = '#7a8098'; x.fillRect(8, 8, 1, 8);
    return outline(c, OL);
  })();
  const banner = bake([
    'tttttttttttt....',
    'tTttttyyttttt...',
    'tTtttyyyytttttt.',
    'tTttttyyttttttt.',
    'tTtttttttttttt..',
    'tTttttttttttt...',
    'ttttttttttt.....'
  ], { t: '#25b5a4', T: '#177a74', y: '#ffd84a' }, OL);

  // Castle (goal building)
  const castle = (function () {
    const w = 48, h = 56;
    const c = mk(w, h), x = c.getContext('2d');
    x.fillStyle = '#8c8ca4'; x.fillRect(4, 14, 40, 42);
    x.fillStyle = '#b4b4cc'; x.fillRect(4, 14, 40, 2); x.fillRect(4, 14, 2, 42);
    x.fillStyle = '#5a5a74'; x.fillRect(42, 14, 2, 42);
    for (let i = 0; i < 5; i++) { x.fillStyle = '#8c8ca4'; x.fillRect(4 + i * 9, 8, 6, 7); x.fillStyle = '#b4b4cc'; x.fillRect(4 + i * 9, 8, 6, 1); }
    x.fillStyle = '#6a6a84';
    for (let j = 20; j < 56; j += 6) { x.fillRect(4, j, 40, 1); }
    for (let j = 20, r = 0; j < 56; j += 6, r++) for (let i = (r % 2) * 5 + 8; i < 44; i += 10) x.fillRect(i, j, 1, 6);
    x.fillStyle = '#1a1030'; x.fillRect(18, 34, 12, 22);
    x.fillRect(19, 30, 10, 4); x.fillRect(21, 28, 6, 2);
    x.fillStyle = '#ffd84a'; x.fillRect(22, 4, 2, 6);
    x.fillStyle = '#25b5a4'; x.fillRect(24, 4, 8, 4);
    x.fillStyle = '#ffea80'; x.fillRect(8, 22, 4, 6); x.fillRect(36, 22, 4, 6);
    return outline(c, OL);
  })();

  // Checkpoint flag banner states are drawn in code (see level.js).

  // ---------------------------------------------------------------- map icons
  const mapPal = { k: '#1a1a1a', g: '#3aa83a', y: '#f4d020', w: '#ffffff', r: '#e84a3a' };
  const mapNode = bake([
    '..gggg..', '.gggggg.', 'gggwwggg', 'ggwwwwgg', 'ggwwwwgg', 'gggwwggg', '.gggggg.', '..gggg..'
  ], mapPal, OL);
  const mapNodeDone = bake([
    '..yyyy..', '.yyyyyy.', 'yyywwyyy', 'yywwwwky', 'ywwkwwky', 'yywkwwyy', '.yyyyyy.', '..yyyy..'
  ], mapPal, OL);
  const mapNodeLock = bake([
    '..kkkk..', '.kkkkkk.', 'kkkwwkkk', 'kkwkkwkk', 'kkwkkwkk', 'kkkwwkkk', '.kkkkkk.', '..kkkk..'
  ], mapPal, '#000000');

  // Decorations (title / map)
  const cloud = (function () {
    const c = mk(40, 20), x = c.getContext('2d');
    disc(x, 10, 12, 7, '#dce8ff'); disc(x, 20, 9, 9, '#dce8ff'); disc(x, 31, 12, 7, '#dce8ff');
    x.fillRect(10, 12, 21, 7);
    disc(x, 10, 11, 7, '#ffffff'); disc(x, 20, 8, 9, '#ffffff'); disc(x, 31, 11, 7, '#ffffff');
    x.fillStyle = '#ffffff'; x.fillRect(10, 11, 21, 6);
    return c;
  })();
  const bush = (function () {
    const c = mk(32, 14), x = c.getContext('2d');
    disc(x, 8, 9, 5, '#1f7a30'); disc(x, 16, 7, 7, '#1f7a30'); disc(x, 24, 9, 5, '#1f7a30');
    x.fillRect(8, 9, 16, 5);
    disc(x, 8, 8, 5, '#3cb34a'); disc(x, 16, 6, 7, '#3cb34a'); disc(x, 24, 8, 5, '#3cb34a');
    x.fillStyle = '#3cb34a'; x.fillRect(8, 8, 16, 5);
    disc(x, 14, 4, 2, '#7ee07a');
    return outline(c, '#124a1c');
  })();
  const hill = (function () {
    const W = 64, H = 32;
    const c = mk(W, H), x = c.getContext('2d');
    for (let i = 0; i < W; i++) {
      const t = (i - W / 2) / (W / 2);
      const hh = Math.round(H * Math.sqrt(Math.max(0, 1 - t * t)));
      x.fillStyle = '#3cb34a'; x.fillRect(i, H - hh, 1, hh);
      x.fillStyle = '#7ee07a'; x.fillRect(i, H - hh, 1, Math.min(2, hh));
    }
    return c;
  })();


  // ---------------------------------------------------------------- extra cast (all original designs)
  function ellipse(x, cx, cy, rx, ry, color) {
    x.fillStyle = color;
    for (let dy = -ry; dy <= ry; dy++) {
      const dx = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy / ry) * (dy / ry))));
      x.fillRect(cx - dx, cy + dy, dx * 2 + 1, 1);
    }
  }

  // Tinted copy (used for the invincibility flash); cached per image+color.
  const tintCache = new Map();
  let tintId = 0;
  function tint(img, color) {
    if (!img._tid) img._tid = ++tintId;
    const key = img._tid + color;
    let c = tintCache.get(key);
    if (!c) {
      c = mk(img.width, img.height);
      const x = c.getContext('2d');
      x.drawImage(img, 0, 0);
      x.globalCompositeOperation = 'source-atop';
      x.globalAlpha = 0.55;
      x.fillStyle = color;
      x.fillRect(0, 0, img.width, img.height);
      tintCache.set(key, c);
    }
    return c;
  }

  // Thornback: spiky hedgehog-like walker (can't be stomped normally)
  function makeSpiky(frame) {
    const c = mk(16, 15), x = c.getContext('2d');
    const top = [];
    for (let i = 1; i <= 14; i++) {
      const t = (i - 7.5) / 7;
      const hh = Math.round(8 * Math.sqrt(Math.max(0, 1 - t * t)));
      top[i] = 13 - hh;
      x.fillStyle = '#2fa38a'; x.fillRect(i, 13 - hh, 1, hh + 1);
      x.fillStyle = '#7ee0c8'; x.fillRect(i, 13 - hh, 1, 1);
    }
    [3, 7, 11].forEach(function (cx) {
      const base = top[cx] + 1;
      for (let k = 0; k < 5; k++) {
        const hw = Math.max(0, 2 - Math.floor(k / 2));
        x.fillStyle = k === 4 ? '#ffffff' : '#ffd84a';
        x.fillRect(cx - hw, base - k, hw * 2 + 1, 1);
      }
    });
    x.fillStyle = '#ffffff'; x.fillRect(11, 8, 2, 3);
    x.fillStyle = '#1a1030'; x.fillRect(12, 9, 1, 2);
    x.fillStyle = '#f0a070'; x.fillRect(14, 10, 2, 2);
    x.fillStyle = '#1a3a30';
    const fx = frame ? 1 : 0;
    x.fillRect(3 + fx, 13, 3, 2); x.fillRect(10 - fx, 13, 3, 2);
    return outline(c, OL);
  }

  function makeBee(frame) {
    const c = mk(16, 14), x = c.getContext('2d');
    const wy = frame ? 4 : 2;
    ellipse(x, 8, 8, 6, 5, '#ffd84a');
    // stripes clipped to the body ellipse
    x.fillStyle = '#2a1a1a';
    [5, 6, 9].forEach(function (sx) {
      const t = (sx - 8) / 6;
      const dy = Math.round(5 * Math.sqrt(Math.max(0, 1 - t * t)));
      x.fillRect(sx, 8 - dy, 1, dy * 2 + 1);
    });
    ellipse(x, 6, wy, 2, 2, '#e0f4ff'); ellipse(x, 10, wy, 2, 2, '#e0f4ff');
    x.fillStyle = '#ffffff'; x.fillRect(11, 6, 2, 2);
    x.fillStyle = '#1a1a1a'; x.fillRect(12, 7, 1, 1);
    x.fillRect(0, 8, 2, 1); x.fillRect(1, 9, 1, 1);
    return outline(c, OL);
  }

  function makeHopper(jump) {
    const c = mk(16, 16), x = c.getContext('2d');
    if (jump) {
      x.fillStyle = '#2e8a2a'; x.fillRect(3, 12, 2, 4); x.fillRect(11, 12, 2, 4);
      ellipse(x, 8, 8, 5, 5, '#5ac840');
      ellipse(x, 8, 10, 3, 2, '#c8f0a0');
    } else {
      x.fillStyle = '#2e8a2a'; x.fillRect(1, 13, 4, 3); x.fillRect(11, 13, 4, 3);
      ellipse(x, 8, 11, 6, 4, '#5ac840');
      ellipse(x, 8, 12, 4, 2, '#c8f0a0');
    }
    const ey = jump ? 3 : 6;
    G_disc(x, 5, ey, 2, '#ffffff'); G_disc(x, 11, ey, 2, '#ffffff');
    x.fillStyle = '#1a1a1a'; x.fillRect(6, ey, 1, 1); x.fillRect(12, ey, 1, 1);
    return outline(c, OL);
  }
  function G_disc(x, cx, cy, r, col) { disc(x, cx, cy, r, col); }

  // King Gloop: big crowned blob, the fortress boss
  function makeBoss(squash) {
    const c = mk(34, 32), x = c.getContext('2d');
    const ry = squash ? 9 : 11, cy = squash ? 22 : 20;
    ellipse(x, 17, cy, 15, ry, '#8a4fd0');
    ellipse(x, 17, cy + 4, 11, Math.max(3, ry - 6), '#c9a0f0');
    ellipse(x, 11, cy - 5, 2, 3, '#ffffff'); ellipse(x, 23, cy - 5, 2, 3, '#ffffff');
    x.fillStyle = '#1a1030'; x.fillRect(12, cy - 5, 2, 3); x.fillRect(22, cy - 5, 2, 3);
    x.fillRect(8, cy - 10, 5, 1); x.fillRect(12, cy - 9, 2, 1);
    x.fillRect(21, cy - 10, 5, 1); x.fillRect(20, cy - 9, 2, 1);
    x.fillStyle = '#3a1050'; x.fillRect(12, cy + 1, 11, 3);
    x.fillStyle = '#ffffff'; x.fillRect(13, cy + 1, 2, 2); x.fillRect(20, cy + 1, 2, 2);
    const ct = cy - ry - 5;
    x.fillStyle = '#ffd84a'; x.fillRect(9, ct + 4, 17, 5);
    [9, 17, 25].forEach(function (px) { for (let k = 0; k < 4; k++) x.fillRect(px - (3 - k) / 2 | 0, ct + 3 - k, 3 - k > 0 ? 3 - k : 1, 1); });
    x.fillStyle = '#fff6c0'; x.fillRect(9, ct + 4, 17, 1);
    x.fillStyle = '#e8304a'; x.fillRect(16, ct + 5, 3, 3);
    x.fillStyle = '#5e2fa0'; x.fillRect(6, 30, 7, 2); x.fillRect(21, 30, 7, 2);
    return outline(c, OL);
  }

  function makeHeart() {
    const c = mk(14, 12), x = c.getContext('2d');
    disc(x, 4, 4, 3, '#e8304a'); disc(x, 9, 4, 3, '#e8304a');
    for (let j = 0; j < 6; j++) { x.fillRect(1 + j, 5 + j, 12 - j * 2, 1); }
    x.fillStyle = '#ff9aac'; x.fillRect(3, 2, 2, 2);
    return outline(c, OL);
  }

  function makeCloudItem() {
    const c = mk(16, 12), x = c.getContext('2d');
    disc(x, 5, 7, 4, '#ffffff'); disc(x, 10, 5, 5, '#ffffff'); disc(x, 13, 8, 3, '#ffffff');
    x.fillStyle = '#ffffff'; x.fillRect(4, 8, 10, 3);
    x.fillStyle = '#cfe4ff'; x.fillRect(3, 10, 11, 1);
    x.fillStyle = '#5ab0ff'; x.fillRect(8, 3, 2, 1); x.fillRect(7, 4, 1, 1);
    return outline(c, '#3a5aa0');
  }

  function makeGem(col) {
    const c = mk(12, 14), x = c.getContext('2d');
    for (let j = 0; j < 14; j++) {
      const hw = j < 5 ? j + 1 : Math.max(0, 13 - j) * 6 / 9 | 0;
      x.fillStyle = col; x.fillRect(6 - hw, j, hw * 2, 1);
    }
    x.fillStyle = '#ffffff'; x.fillRect(4, 3, 2, 2); x.fillRect(3, 5, 1, 2);
    x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(6, 6, 4, 4);
    return outline(c, OL);
  }

  function makeMedal() {
    const c = mk(12, 16), x = c.getContext('2d');
    ellipse(x, 6, 8, 5, 7, '#f7d51d');
    ellipse(x, 6, 8, 3, 5, '#c79a10');
    ellipse(x, 6, 8, 2, 4, '#ffe866');
    x.fillStyle = '#ffffff'; x.fillRect(5, 5, 2, 6); x.fillRect(3, 7, 6, 2);
    x.fillStyle = '#fff6c0'; x.fillRect(2, 3, 1, 3);
    return outline(c, OL);
  }
  function faded(img, a) {
    const c = mk(img.width, img.height), x = c.getContext('2d');
    x.globalAlpha = a; x.drawImage(img, 0, 0);
    return c;
  }

  function makeLift() {
    const c = mk(48, 8), x = c.getContext('2d');
    x.fillStyle = '#a8a8b8'; x.fillRect(0, 0, 48, 8);
    x.fillStyle = '#e0e0ec'; x.fillRect(0, 0, 48, 2);
    x.fillStyle = '#606070'; x.fillRect(0, 6, 48, 2);
    x.fillStyle = '#383848'; [4, 20, 27, 43].forEach(function (px) { x.fillRect(px, 3, 2, 2); });
    x.fillStyle = '#ffd84a'; x.fillRect(12, 3, 4, 2); x.fillRect(32, 3, 4, 2);
    return outline(c, OL);
  }

  function makeSign() {
    const c = mk(16, 16), x = c.getContext('2d');
    x.fillStyle = '#7a4a20'; x.fillRect(7, 9, 2, 7);
    x.fillStyle = '#7a4a20'; x.fillRect(1, 1, 14, 9);
    x.fillStyle = '#d89a50'; x.fillRect(2, 2, 12, 7);
    x.fillStyle = '#f0c080'; x.fillRect(2, 2, 12, 1);
    x.fillStyle = '#ffffff'; x.fillRect(7, 3, 2, 3); x.fillRect(7, 7, 2, 1);
    return outline(c, OL);
  }

  function makeFlowerDecor(col) {
    const c = mk(9, 10), x = c.getContext('2d');
    x.fillStyle = '#2e8a2a'; x.fillRect(4, 4, 1, 6); x.fillRect(2, 7, 2, 1);
    disc(x, 4, 3, 2, col);
    x.fillStyle = '#ffe866'; x.fillRect(4, 3, 1, 1);
    return outline(c, '#1a3a1a');
  }

  function makeTree() {
    const c = mk(28, 44), x = c.getContext('2d');
    x.fillStyle = '#7a4a20'; x.fillRect(12, 26, 5, 18);
    x.fillStyle = '#a06a3a'; x.fillRect(12, 26, 2, 18);
    disc(x, 14, 15, 13, '#1f7a30');
    disc(x, 13, 13, 11, '#3cb34a');
    disc(x, 10, 9, 4, '#7ee07a');
    disc(x, 20, 18, 2, '#e8304a'); disc(x, 8, 20, 2, '#e8304a');
    return outline(c, '#124a1c');
  }

  function makeCrystal() {
    const c = mk(12, 14), x = c.getContext('2d');
    [[3, 6, 3], [7, 2, 3], [10, 7, 2]].forEach(function (p) {
      const cx = p[0], top = p[1], hw = p[2];
      for (let j = top; j < 14; j++) {
        const w = Math.min(hw, 1 + ((j - top) >> 1));
        x.fillStyle = '#5ae8ff'; x.fillRect(cx - w, j, w * 2, 1);
        x.fillStyle = '#d0faff'; x.fillRect(cx - w, j, 1, 1);
      }
    });
    return outline(c, '#12325a');
  }

  function makeMapCastle() {
    const c = mk(16, 16), x = c.getContext('2d');
    x.fillStyle = '#8c8ca4'; x.fillRect(2, 5, 12, 11);
    for (let i = 0; i < 4; i++) x.fillRect(2 + i * 4, 2, 2, 3);
    x.fillStyle = '#b4b4cc'; x.fillRect(2, 5, 12, 1);
    x.fillStyle = '#1a1030'; x.fillRect(6, 10, 4, 6);
    x.fillStyle = '#e8304a'; x.fillRect(7, 0, 4, 2); x.fillStyle = '#ffd84a'; x.fillRect(6, 0, 1, 5);
    return outline(c, OL);
  }

  const spiky = [makeSpiky(0), makeSpiky(1)];
  const bee = [makeBee(0), makeBee(1)];
  const hopper = [makeHopper(false), makeHopper(true)];
  const boss = [makeBoss(false), makeBoss(true)];
  const heart = makeHeart();
  const cloudItem = makeCloudItem();
  const gem = ['#ff4a6a', '#ffd84a', '#4ae08a', '#4ab0ff'].map(makeGem);
  const medal = makeMedal();
  const medalFaded = faded(medal, 0.35);
  const lift = makeLift();
  const sign = makeSign();
  const flowerDecor = ['#ff6a8a', '#ffffff', '#ffd84a'].map(makeFlowerDecor);
  const tree = makeTree();
  const crystal = makeCrystal();
  const mapCastle = makeMapCastle();

  const S = {
    heroSets: heroSets, heroCrouch: heroCrouch, lifeIcon: lifeIcon,
    blob: blob, snail: snail, shell: shell,
    berry: berry, flower: flower, fireball: fireball,
    coin: [coinA, coinB, coinC, coinB],
    tilesets: tilesets, tQuestion: tQuestion, tUsed: tUsed, tBlock: tBlock, tSpike: tSpike, tPlatform: tPlatform,
    tPipeTL: pipes.TL, tPipeTR: pipes.TR, tPipeL: pipes.L, tPipeR: pipes.R,
    tFlagPole: poleTile, tFlagTop: poleTop, banner: banner, castle: castle,
    mapNode: mapNode, mapNodeDone: mapNodeDone, mapNodeLock: mapNodeLock,
    cloud: cloud, bush: bush, hill: hill,
    spiky: spiky, bee: bee, hopper: hopper, boss: boss, heart: heart, cloudItem: cloudItem, gem: gem,
    medal: medal, medalFaded: medalFaded, lift: lift, sign: sign, flowerDecor: flowerDecor, tree: tree,
    crystal: crystal, mapCastle: mapCastle
  };
  // Convenience aliases for the title/map screens.
  S.tGround = tilesets.overworld.groundM;
  S.tDirt = tilesets.overworld.dirtM;

  G.Sprites = S;
  G.Gfx = { mk: mk, rng: rng, disc: disc, outline: outline, bake: bake, tint: tint };
})(window.GAME = window.GAME || {});
