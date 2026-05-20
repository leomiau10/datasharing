// Pixel-art sprites generated entirely in code (no external image assets).
// Each sprite is a list of pixel rows; characters index into a palette.
(function (G) {
  'use strict';

  // Bake a pixel map (array of strings) into an offscreen canvas.
  function bake(rows, palette) {
    const h = rows.length;
    let w = 0;
    for (const r of rows) w = Math.max(w, r.length);
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const x = c.getContext('2d');
    for (let j = 0; j < h; j++) {
      const row = rows[j];
      for (let i = 0; i < row.length; i++) {
        const ch = row[i];
        const col = palette[ch];
        if (!col) continue; // '.' / ' ' / undefined => transparent
        x.fillStyle = col;
        x.fillRect(i, j, 1, 1);
      }
    }
    return c;
  }

  // ---- Palettes ----
  const heroPal = {
    r: '#e52521', R: '#a01510', s: '#fcb085', S: '#c8703a',
    o: '#1a4fd0', O: '#0a2f90', b: '#5a3410', k: '#1a1a1a', w: '#ffffff'
  };
  const enemyPal = {
    b: '#8a4b10', B: '#5e3208', t: '#e8b46a', k: '#1a1a1a', w: '#ffffff', r: '#c02020',
    g: '#3aa83a', G: '#1f7a1f', y: '#f4d020'
  };
  const itemPal = {
    y: '#f7d51d', Y: '#c79a10', w: '#ffffff', k: '#1a1a1a',
    r: '#e52521', R: '#a01510', s: '#fce0b0', g: '#3aa83a'
  };

  // ---- Hero (small) 12x16 ----
  const heroSmallIdle = bake([
    '....rrrr....',
    '...rrrrrrr..',
    '..bbbsssss..',
    '..bsbssssS..',
    '..bsbbsssS..',
    '..bbssssS...',
    '...ssssS....',
    '..rorrror...',
    '.rrorrrror..',
    'srroooooors.',
    'ssoooooooss.',
    '..oooooooo..',
    '..ooo..ooo..',
    '..oo....oo..',
    '.bbb....bbb.',
    '.kkk....kkk.'
  ], heroPal);

  const heroSmallWalk = bake([
    '....rrrr....',
    '...rrrrrrr..',
    '..bbbsssss..',
    '..bsbssssS..',
    '..bsbbsssS..',
    '..bbssssS...',
    '...ssssS....',
    '..rorrror...',
    '.rrorrrror..',
    'srroooooors.',
    'ssoooooooss.',
    '..oooooooo..',
    '..ooo..ooo..',
    '...oo..ooo..',
    '..bbb...bbb.',
    '.kkk......kk'
  ], heroPal);

  const heroSmallJump = bake([
    '....rrrr....',
    '...rrrrrrr..',
    '..bbbsssss..',
    '..bsbssssS..',
    '..bsbbsssS..',
    '..bbssssS...',
    's..ssssS..s.',
    'ssrorrrorss.',
    '.rroooooor..',
    '.rooooooor..',
    '..oooooooo..',
    '..oooooooo..',
    '..ooo..ooo..',
    '.bbb....bbb.',
    '.kkk....kkk.',
    '............'
  ], heroPal);

  // ---- Hero (big) 12x28 ----
  const heroBigIdle = bake([
    '....rrrr....',
    '...rrrrrrr..',
    '..bbbsssss..',
    '..bsbssssS..',
    '..bsbbsssS..',
    '..bbssssS...',
    '...ssssS....',
    '...rrrrr....',
    '..rrorror...',
    '.rrroooorr..',
    'srrooooorrs.',
    'ssrooooorss.',
    '..oooooooo..',
    '..oooooooo..',
    '..soooooos..',
    '..ssoooss...',
    '..oooooooo..',
    '..oooooooo..',
    '..oooooooo..',
    '..ooo..ooo..',
    '..ooo..ooo..',
    '..oo....oo..',
    '..oo....oo..',
    '.bbb....bbb.',
    '.bbb....bbb.',
    '.kkk....kkk.',
    '.kkk....kkk.',
    '............'
  ], heroPal);

  const heroBigWalk = bake([
    '....rrrr....',
    '...rrrrrrr..',
    '..bbbsssss..',
    '..bsbssssS..',
    '..bsbbsssS..',
    '..bbssssS...',
    '...ssssS....',
    '...rrrrr....',
    '..rrorror...',
    '.rrroooorr..',
    'srrooooorrs.',
    'ssrooooorss.',
    '..oooooooo..',
    '..oooooooo..',
    '..soooooos..',
    '..ssoooss...',
    '..oooooooo..',
    '..oooooooo..',
    '..oooooooo..',
    '..ooo..ooo..',
    '...oo..ooo..',
    '...oo...oo..',
    '..boo...ooo.',
    '.bbb....bbb.',
    '.kkb.....bb.',
    'kkk.......kk',
    '............',
    '............'
  ], heroPal);

  const heroBigJump = bake([
    '....rrrr....',
    '...rrrrrrr..',
    '..bbbsssss..',
    '..bsbssssS..',
    '..bsbbsssS..',
    '..bbssssS...',
    's..ssssS..s.',
    'ss.rrrrr.ss.',
    '.rrrorrorr..',
    '.rrooooorr..',
    '.rooooooor..',
    '..oooooooo..',
    '..oooooooo..',
    '..soooooos..',
    '..ssoooss...',
    '..oooooooo..',
    '..oooooooo..',
    '..oooooooo..',
    '..ooo..ooo..',
    '..ooo..ooo..',
    '.boo....oob.',
    'bbb......bbb',
    'kkb......bkk',
    '............',
    '............',
    '............',
    '............',
    '............'
  ], heroPal);

  // ---- Goomba 16x16 (two walk frames) ----
  const goomba1 = bake([
    '................',
    '....bbbbbbbb....',
    '..bbBBBBBBBBbb..',
    '.bBBBBBBBBBBBBb.',
    '.bBBwwBBBBwwBBb.',
    'bBBBwkwBBwkwBBBb',
    'bBBBwkwBBwkwBBBb',
    'bBBBBBBBBBBBBBBb',
    'bBBBBBBBBBBBBBBb',
    'bBBBBkkkkkkBBBBb',
    '.bBBBBBBBBBBBBb.',
    '..bbBBBBBBBBbb..',
    '...ttttttttttt..',
    '..tttt....tttt..',
    '.ttt........ttt.',
    'ttt..........ttt'
  ], enemyPal);

  const goomba2 = bake([
    '................',
    '....bbbbbbbb....',
    '..bbBBBBBBBBbb..',
    '.bBBBBBBBBBBBBb.',
    '.bBBwwBBBBwwBBb.',
    'bBBBwkwBBwkwBBBb',
    'bBBBwkwBBwkwBBBb',
    'bBBBBBBBBBBBBBBb',
    'bBBBBBBBBBBBBBBb',
    'bBBBBkkkkkkBBBBb',
    '.bBBBBBBBBBBBBb.',
    '..bbBBBBBBBBbb..',
    '..ttttttttttt...',
    '..tttt....tttt..',
    '..ttt......ttt..',
    '.ttt........ttt.'
  ], enemyPal);

  // ---- Koopa 16x24 ----
  const koopa = bake([
    '......gggg......',
    '....gggggggg....',
    '...ggwgggwggg...',
    '...ggkgggkggg...',
    '...gggggggggg...',
    '....gg gg gg....',
    '.....gggggg.....',
    '....ygyyyygy....',
    '...yGGGGGGGGy...',
    '..yGGgGGggGGGy..',
    '.yGGgggGGgggGGy.',
    '.yGgggggGgggGGy.',
    '.yGGgggGGgggGGy.',
    '.yGGGgGGggGGGGy.',
    '..yGGGGGGGGGGy..',
    '...yyGGGGGGyy...',
    '....yGGGGGGy....',
    '....gg....gg....',
    '....gg....gg....',
    '...ggg....ggg...',
    '...gg......gg...',
    '..ggg......ggg..',
    '................',
    '................'
  ], enemyPal);

  const shell = bake([
    '................',
    '.....yyyyyy.....',
    '...yyGGGGGGyy...',
    '..yGGgGGggGGGy..',
    '.yGGgggGGgggGGy.',
    '.yGgggggGgggGGy.',
    '.yGGgggGGgggGGy.',
    '.yGGGgGGggGGGGy.',
    '..yGGGGGGGGGGy..',
    '...yyGGGGGGyy...',
    '.....yyyyyy.....',
    '................'
  ], enemyPal);

  // ---- Coin 10x14 (3 spin frames) ----
  const coinA = bake([
    '...yyyy...',
    '..yYYYYy..',
    '.yYYwwYYy.',
    '.yYwYYwYy.',
    'yYYwYYwYYy',
    'yYYwYYwYYy',
    'yYYwYYwYYy',
    'yYYwYYwYYy',
    'yYYwYYwYYy',
    '.yYwYYwYy.',
    '.yYYwwYYy.',
    '..yYYYYy..',
    '...yyyy...',
    '..........'
  ], itemPal);
  const coinB = bake([
    '....yy....',
    '...yYYy...',
    '..yYwwYy..',
    '..yYwwYy..',
    '..yYwwYy..',
    '..yYwwYy..',
    '..yYwwYy..',
    '..yYwwYy..',
    '..yYwwYy..',
    '..yYwwYy..',
    '..yYwwYy..',
    '...yYYy...',
    '....yy....',
    '..........'
  ], itemPal);
  const coinC = bake([
    '.....y....',
    '.....Y....',
    '....yYy...',
    '....yYy...',
    '....yYy...',
    '....yYy...',
    '....yYy...',
    '....yYy...',
    '....yYy...',
    '....yYy...',
    '....yYy...',
    '.....Y....',
    '.....y....',
    '..........'
  ], itemPal);

  // ---- Mushroom 14x14 ----
  const mushroom = bake([
    '....rrrrrr....',
    '..rrwwrrwwrr..',
    '.rrrwwrrwwrrr.',
    '.rwwrrrrrrwwr.',
    'rrwwrrrrrrwwrr',
    'rrrrrrrrrrrrrr',
    'rrrrrrrrrrrrrr',
    '.RRsssssssRR..',
    '..ssskkssksss.',
    '..sssskkssss..',
    '..ssssssssss..',
    '..ssssssssss..',
    '...ssssssss...',
    '..............'
  ], itemPal);

  // ---- Tiles 16x16 ----
  const tilePal = {
    g: '#3aa83a', G: '#2c7d2c', d: '#9c5a28', D: '#6e3d18', k: '#000000',
    b: '#caa15a', B: '#8a6428', q: '#f4b015', Q: '#a8700a', w: '#ffffff',
    s: '#a0a0a0', S: '#606060', p: '#2fae4e', P: '#1c7a34', x: '#c0392b',
    l: '#dfe7ef', e: '#7fd0ff'
  };

  const tGround = bake([
    'gggggggggggggggg',
    'gGgGgGgGgGgGgGgG',
    'dddddddddddddddd',
    'dDddDddDdddDdddd',
    'ddddddddddddDddd',
    'dDddddDddddddddd',
    'ddddddddddDddddd',
    'dddDddddddddddDd',
    'ddddddddDddddddd',
    'dDdddddddddDdddd',
    'ddddDdddddddddDd',
    'dddddddDdddddddd',
    'dDddddddddDddddd',
    'ddddDddddddddddd',
    'dddddddddDddDddd',
    'DDDDDDDDDDDDDDDD'
  ], tilePal);

  const tDirt = bake([
    'dddddddddddddddd',
    'dDddDddDdddDdddd',
    'ddddddddddddDddd',
    'dDddddDddddddddd',
    'ddddddddddDddddd',
    'dddDddddddddddDd',
    'ddddddddDddddddd',
    'dDdddddddddDdddd',
    'ddddDdddddddddDd',
    'dddddddDdddddddd',
    'dDddddddddDddddd',
    'ddddDddddddddddd',
    'dddddddddDddDddd',
    'dDdddddDdddddddd',
    'ddddDddddddDdddd',
    'DDDDDDDDDDDDDDDD'
  ], tilePal);

  const tBrick = bake([
    'BBBBBBBBBBBBBBBB',
    'bbbbbbbBbbbbbbbb',
    'bbbbbbbBbbbbbbbb',
    'bbbbbbbBbbbbbbbb',
    'BBBBBBBBBBBBBBBB',
    'bbbBbbbbbbbBbbbb',
    'bbbBbbbbbbbBbbbb',
    'bbbBbbbbbbbBbbbb',
    'BBBBBBBBBBBBBBBB',
    'bbbbbbbBbbbbbbbb',
    'bbbbbbbBbbbbbbbb',
    'bbbbbbbBbbbbbbbb',
    'BBBBBBBBBBBBBBBB',
    'bbbBbbbbbbbBbbbb',
    'bbbBbbbbbbbBbbbb',
    'BBBBBBBBBBBBBBBB'
  ], tilePal);

  function questionFrame(m) {
    // m = mark color char ('w' bright or 'k' dark)
    return bake([
      'QQQQQQQQQQQQQQQQ',
      'QqqqqqqqqqqqqqqQ',
      'Qqqqq' + m + m + m + m + 'qqqqqQ',
      'Qqqq' + m + 'qqqq' + m + 'qqqQ',
      'Qqqq' + m + 'qqqq' + m + 'qqqQ',
      'Qqqqqqqqq' + m + 'qqqqQ',
      'Qqqqqqqq' + m + 'qqqqqQ',
      'Qqqqqqq' + m + 'qqqqqqQ',
      'Qqqqqqq' + m + 'qqqqqqQ',
      'Qqqqqqq' + m + 'qqqqqqQ',
      'QqqqqqqqqqqqqqqQ',
      'Qqqqqqq' + m + 'qqqqqqQ',
      'Qqqqqqq' + m + 'qqqqqqQ',
      'QqqqqqqqqqqqqqqQ',
      'QqqqqqqqqqqqqqqQ',
      'QQQQQQQQQQQQQQQQ'
    ], tilePal);
  }
  const tQuestion1 = questionFrame('w');
  const tQuestion2 = questionFrame('k');

  const tUsed = bake([
    'QQQQQQQQQQQQQQQQ',
    'QSSSSSSSSSSSSSSQ',
    'QSssssssssssssSQ',
    'QSssssssssssssSQ',
    'QSssssssssssssSQ',
    'QSssssssssssssSQ',
    'QSssssssssssssSQ',
    'QSssssssssssssSQ',
    'QSssssssssssssSQ',
    'QSssssssssssssSQ',
    'QSssssssssssssSQ',
    'QSssssssssssssSQ',
    'QSssssssssssssSQ',
    'QSSSSSSSSSSSSSSQ',
    'QSSSSSSSSSSSSSSQ',
    'QQQQQQQQQQQQQQQQ'
  ], tilePal);

  const tBlock = bake([
    'ssssssssssssssss',
    'swwwwwwwwwwwwwwS',
    'swSSSSSSSSSSSSwS',
    'swSssssssssssSwS',
    'swSssssssssssSwS',
    'swSssssssssssSwS',
    'swSssssssssssSwS',
    'swSssssssssssSwS',
    'swSssssssssssSwS',
    'swSssssssssssSwS',
    'swSssssssssssSwS',
    'swSssssssssssSwS',
    'swSSSSSSSSSSSSwS',
    'swwwwwwwwwwwwwwS',
    'sSSSSSSSSSSSSSSS',
    'ssssssssssssssss'
  ], tilePal);

  const tSpike = bake([
    '................',
    '................',
    '................',
    '..S....S....S...',
    '.SsS..SsS..SsS..',
    '.SsS..SsS..SsS..',
    'SsssSSsssSSsssS.',
    'SssssssssssssS..',
    'SssssssssssssssS',
    'ssssssssssssssss',
    'SSSSSSSSSSSSSSSS',
    'ssssssssssssssss',
    'sSsSsSsSsSsSsSsS',
    'ssssssssssssssss',
    'sSsSsSsSsSsSsSsS',
    'ssssssssssssssss'
  ], tilePal);

  const tPlatform = bake([
    'pppppppppppppppp',
    'PpPpPpPpPpPpPpPp',
    'PPPPPPPPPPPPPPPP',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................'
  ], tilePal);

  function pipeTile(rows) { return bake(rows, tilePal); }
  const tPipeTL = pipeTile([
    'pppppppppppppppp',
    'pPPPPPPPPPPPPPPp',
    'pPllllllllllllPp',
    'pPlPPPPPPPPPPlPp',
    'pPlPpppppppppPPp',
    'pPlPpppppppppPPp',
    'pPlPpppppppppPPp',
    'pPlPpppppppppPPp',
    'pPlPpppppppppPPp',
    'pPlPpppppppppPPp',
    'pPlPpppppppppPPp',
    'pPlPpppppppppPPp',
    'pPlPpppppppppPPp',
    'pPlPpppppppppPPp',
    'pPlPpppppppppPPp',
    'pPlPpppppppppPPp'
  ]);
  const tPipeTR = pipeTile([
    'pppppppppppppppp',
    'pPPPPPPPPPPPPPPp',
    'pPllllllllllllPp',
    'pPlPPPPPPPPPPlPp',
    'pPPpppppppppPlPp',
    'pPPpppppppppPlPp',
    'pPPpppppppppPlPp',
    'pPPpppppppppPlPp',
    'pPPpppppppppPlPp',
    'pPPpppppppppPlPp',
    'pPPpppppppppPlPp',
    'pPPpppppppppPlPp',
    'pPPpppppppppPlPp',
    'pPPpppppppppPlPp',
    'pPPpppppppppPlPp',
    'pPPpppppppppPlPp'
  ]);
  const tPipeL = pipeTile([
    '.pPlPpppppppPPp.',
    '.pPlPpppppppPPp.',
    '.pPlPpppppppPPp.',
    '.pPlPpppppppPPp.',
    '.pPlPpppppppPPp.',
    '.pPlPpppppppPPp.',
    '.pPlPpppppppPPp.',
    '.pPlPpppppppPPp.',
    '.pPlPpppppppPPp.',
    '.pPlPpppppppPPp.',
    '.pPlPpppppppPPp.',
    '.pPlPpppppppPPp.',
    '.pPlPpppppppPPp.',
    '.pPlPpppppppPPp.',
    '.pPlPpppppppPPp.',
    '.pPlPpppppppPPp.'
  ]);
  const tPipeR = pipeTile([
    '.pPPpppppppPlPp.',
    '.pPPpppppppPlPp.',
    '.pPPpppppppPlPp.',
    '.pPPpppppppPlPp.',
    '.pPPpppppppPlPp.',
    '.pPPpppppppPlPp.',
    '.pPPpppppppPlPp.',
    '.pPPpppppppPlPp.',
    '.pPPpppppppPlPp.',
    '.pPPpppppppPlPp.',
    '.pPPpppppppPlPp.',
    '.pPPpppppppPlPp.',
    '.pPPpppppppPlPp.',
    '.pPPpppppppPlPp.',
    '.pPPpppppppPlPp.',
    '.pPPpppppppPlPp.'
  ]);

  const tFlagPole = bake([
    '.......ss.......',
    '.......ss.......',
    '.......ss.......',
    '.......ss.......',
    '.......ss.......',
    '.......ss.......',
    '.......ss.......',
    '.......ss.......',
    '.......ss.......',
    '.......ss.......',
    '.......ss.......',
    '.......ss.......',
    '.......ss.......',
    '.......ss.......',
    '.......ss.......',
    '.......ss.......'
  ], tilePal);
  const tFlagTop = bake([
    '.......ss.......',
    '......Sss.......',
    '....ggggggg.....',
    '...gggggggggg...',
    '..ggggggggggg...',
    '..gggggggggg....',
    '..ggggggg.......',
    '...gg...........',
    '.......ss.......',
    '.......ss.......',
    '.......ss.......',
    '.......ss.......',
    '.......ss.......',
    '.......ss.......',
    '.......ss.......',
    '.......ss.......'
  ], tilePal);

  // Castle 64x64-ish would be big; use a 48x48 baked piece drawn at goal.
  const castle = bake((function () {
    const w = 48; const rows = [];
    const C = 'B'; // brick
    function line(s) { rows.push(s); }
    // crenellation
    line('XX..XX..XX..XX..XX..XX..XX..XX..XX..XX..XX..XX..'.replace(/X/g, 's'));
    for (let i = 0; i < 6; i++) line('s'.repeat(48));
    // gate
    for (let i = 0; i < 18; i++) {
      let r = '';
      for (let x = 0; x < 48; x++) {
        if (x >= 18 && x <= 30 && i > 2) r += 'k';
        else r += (x % 4 < 2 ? 'b' : 'B');
      }
      rows.push(r);
    }
    for (let i = 0; i < 23; i++) {
      let r = '';
      for (let x = 0; x < 48; x++) r += (x % 4 < 2 ? 'b' : 'B');
      rows.push(r);
    }
    return rows;
  })(), tilePal);

  // ---- World map icons ----
  const mapPal = {
    r: '#e52521', s: '#fcb085', k: '#1a1a1a', g: '#3aa83a', y: '#f4d020',
    w: '#ffffff', b: '#8a6428', o: '#1a4fd0'
  };
  const mapHero = bake([
    '.rrrr.',
    'rrrrrr',
    'bsssbs',
    'sssssb',
    '.ssss.',
    'rooror',
    'oooooo',
    '.oo.oo',
    '.kk.kk'
  ], mapPal);
  const mapNode = bake([
    '..gggg..',
    '.gggggg.',
    'gggwwggg',
    'ggwwwwgg',
    'ggwwwwgg',
    'gggwwggg',
    '.gggggg.',
    '..gggg..'
  ], mapPal);
  const mapNodeDone = bake([
    '..yyyy..',
    '.yyyyyy.',
    'yyywwyyy',
    'yywwwwky',
    'ywwkwwky',
    'yywkwwyy',
    '.yyyyyy.',
    '..yyyy..'
  ], mapPal);
  const mapNodeLock = bake([
    '..kkkk..',
    '.kkkkkk.',
    'kkkwwkkk',
    'kkwkkwkk',
    'kkwkkwkk',
    'kkkwwkkk',
    '.kkkkkk.',
    '..kkkk..'
  ], mapPal);

  // Cloud / bush decorations (background)
  const cloud = bake([
    '...wwww....',
    '.wwwwwwww..',
    'wwwwwwwwww.',
    'wwwwwwwwwww',
    '.wwwwwwwww.'
  ], { w: '#ffffff' });
  const bush = bake([
    '...ggg...ggg...',
    '..gggggggggggg.',
    '.ggggggggggggg.',
    'ggggggggggggggg'
  ], { g: '#2f9e44' });
  const hill = bake((function () {
    const rows = [];
    const W = 48, H = 24;
    for (let y = 0; y < H; y++) {
      let r = '';
      for (let x = 0; x < W; x++) {
        const d = Math.abs(x - W / 2);
        r += (y > H - 1 - (W / 2 - d)) ? 'g' : '.';
      }
      rows.push(r);
    }
    return rows;
  })(), { g: '#2f9e44' });

  const S = {
    heroSmallIdle, heroSmallWalk, heroSmallJump,
    heroBigIdle, heroBigWalk, heroBigJump,
    goomba: [goomba1, goomba2], koopa, shell,
    coin: [coinA, coinB, coinC, coinB], mushroom,
    tGround, tDirt, tBrick, tQuestion: [tQuestion1, tQuestion2, tQuestion1, tQuestion2],
    tUsed, tBlock, tSpike, tPlatform,
    tPipeTL, tPipeTR, tPipeL, tPipeR, tFlagPole, tFlagTop, castle,
    mapHero, mapNode, mapNodeDone, mapNodeLock, cloud, bush, hill
  };

  G.Sprites = S;
  G.bake = bake;
})(window.GAME = window.GAME || {});
