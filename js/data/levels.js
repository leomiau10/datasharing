// Hand-designed levels built from reusable chunks (original layouts).
//
// Each chunk is { floor, art }: `floor` sets the width; '#' ground, '.' pit, '^' pit with spikes.
// `art` rows are bottom-aligned so the last row is the row the hero stands in (row 11).
// Art chars: see js/data/tiles.js (# ground, B brick, ? coin block, m power block, u 1UP block,
// c cloud block, r gem block, X hard block, - one-way ledge, [ ] { } pipe, ^ spikes,
// g Blob, k Snail, p Thornback, b Bee, h Hopper, Z boss, o coin, * medal, ! sign, K checkpoint,
// M/V moving lift, S start, F goal).
(function (G) {
  'use strict';

  const H = 14;
  const GROUND_R = 12;

  const CHUNKS = {
    start: { floor: '##############', art: [
      '      m       ',
      '              ',
      '              ',
      '  S  !        '] },
    start_plain: { floor: '##############', art: [
      '      m       ',
      '              ',
      '              ',
      '  S           '] },
    tip: { floor: '########', art: ['   !    '] },
    flat_coins: { floor: '############', art: [
      '   oooo     ',
      '            ',
      '            ',
      '            ',
      '      g     '] },
    blocks_row: { floor: '################', art: [
      '     o o o      ',
      '                ',
      '                ',
      '                ',
      '   B?BmB        ',
      '                ',
      '                ',
      '           g    '] },
    pit_small: { floor: '####...####', art: [
      '    ooo    ',
      '   o   o   ',
      '           ',
      '           '] },
    pit_big: { floor: '###......###', art: [
      '    oooo    ',
      '   o    o   ',
      '            ',
      '            '] },
    pipes: { floor: '################', art: [
      '         []     ',
      '   []    {}     ',
      '   {} g  {}     '] },
    pyramid: { floor: '##############', art: [
      '      oo      ',
      '      XX      ',
      '     XXXX     ',
      '    XXXXXX    ',
      '   XXXXXXXX   '] },
    hills: { floor: '##################', art: [
      '         ooo      ',
      '          g       ',
      '        #####     ',
      '   ###########    ',
      '   ###########  k '] },
    sky_ledges: { floor: '###............###', art: [
      '        oooo      ',
      '        ----      ',
      '                  ',
      '    ---     ---   ',
      '                  '] },
    lift_h: { floor: '##..........####', art: [
      '      o o o     ',
      '   M            ',
      '                '] },
    lift_v: { floor: '############', art: [
      '         oo ',
      '            ',
      '        ####',
      '        ####',
      '        ####',
      '        ####',
      '        ####',
      '   V    ####'] },
    tunnel: { floor: '################', art: [
      '  BBBB?BBBBB    ',
      '                ',
      '   o o o g o    '] },
    spikes: { floor: '##############', art: [
      '       ?      ',
      '              ',
      '              ',
      '     ^^^      '] },
    crowd: { floor: '################', art: [
      '     B??B       ',
      '                ',
      '                ',
      '   g    g  k    '] },
    thorns: { floor: '################', art: [
      '     BB?BB      ',
      '                ',
      '                ',
      '   p      p     '] },
    bees: { floor: '##################', art: [
      '          b       ',
      '                  ',
      '    b             ',
      '                  ',
      '                  ',
      '        g         '] },
    hoppers: { floor: '##############', art: [
      '        ooo   ',
      '              ',
      '              ',
      '   h      h   '] },
    checkpoint: { floor: '##########', art: ['    K     '] },
    bonus_1up: { floor: '############', art: [
      '     u      ',
      '            ',
      '            ',
      '            '] },
    bonus_cloud: { floor: '############', art: [
      '    BcB     ',
      '            ',
      '            ',
      '            '] },
    bonus_gem: { floor: '##############', art: [
      '      r       ',
      '              ',
      '              ',
      '     g  g  g  '] },
    // ---- medal chunks (each level uses exactly three)
    medal_blocks: { floor: '############', art: [
      '     *      ',
      '            ',
      '            ',
      '            ',
      '   BBBBB    ',
      '            ',
      '            ',
      '            '] },
    medal_pit: { floor: '####......####', art: [
      '      *       ',
      '              ',
      '              '] },
    medal_high: { floor: '############', art: [
      '       *    ',
      '       XX   ',
      '       XX   ',
      '       XX   ',
      '    XX XX   ',
      '    XX XX   ',
      '    XX XX   '] },
    medal_wall: { floor: '###########', art: [
      '     *     ',
      '   X   X   ',
      '   X   X   ',
      '   X   X   ',
      '   X   X   ',
      '   X   X   ',
      '   X   X   ',
      '   X   X   ',
      '   X   X   ',
      '           ',
      '           '] },
    medal_tunnel: { floor: '##############', art: [
      '   BBBBBBBB   ',
      '   B  *   B   ',
      '   B      B   ',
      '   BBBBBBBB   ',
      '              ',
      '              ',
      '              '] },
    // ---- endings
    end: { floor: '####################', art: [
      '     X              ',
      '    XX              ',
      '   XXX              ',
      '  XXXX    F         '] },
    boss_arena: { floor: '##########################', art: [
      '                        XX',
      '                        XX',
      '     ---        ---     XX',
      '                        XX',
      '                        XX',
      '                 Z      XX'] }
  };

  // Concatenate chunks into a 14-row map; ground under ground becomes dirt.
  function assemble(names) {
    const rows = [];
    for (let r = 0; r < H; r++) rows.push('');
    for (const name of names) {
      const ch = CHUNKS[name];
      if (!ch) throw new Error('unknown chunk ' + name);
      const W = ch.floor.length;
      const off = GROUND_R - ch.art.length;
      for (let r = 0; r < GROUND_R; r++) {
        let line = r >= off ? ch.art[r - off] : '';
        if (line.length > W) console.warn('chunk', name, 'row too wide');
        rows[r] += (line + ' '.repeat(W)).slice(0, W);
      }
      rows[GROUND_R] += ch.floor.replace(/[.^]/g, ' ');
      rows[GROUND_R + 1] += ch.floor.replace(/\./g, ' ');
    }
    const g = rows.map((r) => r.split(''));
    for (let r = 1; r < H; r++) {
      for (let c = 0; c < g[r].length; c++) {
        if (g[r][c] === '#' && (g[r - 1][c] === '#' || g[r - 1][c] === 'd')) g[r][c] = 'd';
      }
    }
    return g.map((r) => r.join(''));
  }

  const defs = [
    { name: 'WORLD 1-1  GREEN HILLS', theme: 'overworld',
      tips: [
        'A: SALTAR   B: CORRER   MANTEN A PARA SALTAR MAS ALTO',
        'CORRE CON B Y LLENA EL MEDIDOR: SALTARAS MUCHO MAS LEJOS',
        'Y: SALTO GIRATORIO. ELIMINA ENEMIGOS DE UN GOLPE',
        'EN EL AIRE PULSA ABAJO PARA UN GOLPE AL SUELO. ROMPE LADRILLOS'
      ],
      chunks: ['start', 'flat_coins', 'blocks_row', 'tip', 'pit_small', 'pipes', 'medal_blocks', 'crowd',
        'tip', 'hills', 'checkpoint', 'tip', 'tunnel', 'pyramid', 'medal_high', 'pit_small', 'bonus_1up',
        'flat_coins', 'medal_pit', 'end'] },
    { name: 'WORLD 1-2  CRYSTAL CAVERN', theme: 'cave',
      tips: ['MANTEN B SOBRE UN CAPARAZON PARA AGARRARLO. SUELTA B PARA LANZARLO'],
      chunks: ['start', 'tunnel', 'pit_small', 'crowd', 'medal_tunnel', 'thorns', 'pipes', 'bonus_cloud',
        'checkpoint', 'hoppers', 'medal_blocks', 'pit_big', 'tunnel', 'crowd', 'medal_high', 'end'] },
    { name: 'WORLD 1-3  CLOUD TOPS', theme: 'sky',
      tips: ['CON LA NUBE: MANTEN A EN EL AIRE PARA PLANEAR'],
      chunks: ['start', 'bonus_cloud', 'sky_ledges', 'lift_h', 'bees', 'medal_pit', 'checkpoint',
        'sky_ledges', 'lift_v', 'medal_high', 'lift_h', 'bees', 'medal_blocks', 'pit_big', 'end'] },
    { name: 'WORLD 2-1  SUNSET FIELDS', theme: 'dusk',
      tips: ['SALTA CONTRA UNA PARED Y PULSA A PARA REBOTAR HACIA ARRIBA'],
      chunks: ['start', 'hills', 'crowd', 'spikes', 'medal_wall', 'thorns', 'bonus_gem', 'checkpoint',
        'hoppers', 'pit_big', 'pipes', 'medal_blocks', 'hills', 'bees', 'medal_pit', 'end'] },
    { name: 'WORLD 2-2  DEEP CAVES', theme: 'cave',
      chunks: ['start_plain', 'thorns', 'tunnel', 'pit_big', 'medal_tunnel', 'hoppers', 'crowd', 'lift_h',
        'checkpoint', 'thorns', 'bonus_1up', 'medal_wall', 'pipes', 'spikes', 'crowd', 'medal_pit', 'end'] },
    { name: 'WORLD 2-3  FORTRESS', theme: 'castle',
      tips: ['EL REY GLOOP TE ESPERA. SALTALE ENCIMA 3 VECES'],
      chunks: ['start_plain', 'spikes', 'thorns', 'pit_big', 'medal_high', 'lift_h', 'crowd', 'checkpoint',
        'bonus_gem', 'spikes', 'medal_wall', 'lift_v', 'hoppers', 'medal_pit', 'pit_small', 'tip', 'boss_arena'] }
  ];

  const levels = defs.map((d) => ({
    name: d.name,
    theme: d.theme,
    tips: d.tips || [],
    groundRow: GROUND_R,
    map: assemble(d.chunks)
  }));

  // World map (original layout): two islands joined by a bridge. Coordinates are pixels on the
  // 384x176 map canvas. Edges carry waypoints so paths bend like an overworld trail.
  const worldMap = {
    nodes: [
      { x: 56, y: 104, level: 0 },
      { x: 128, y: 116, level: 1 },
      { x: 96, y: 28, level: 2 },
      { x: 184, y: 64, level: 3 },
      { x: 288, y: 104, level: 4 },
      { x: 320, y: 44, level: 5, castle: true }
    ],
    edges: [
      { a: 0, b: 1, pts: [[56, 104], [56, 116], [128, 116]] },
      { a: 1, b: 2, pts: [[128, 116], [128, 88], [108, 88], [108, 28], [96, 28]] },
      { a: 1, b: 3, pts: [[128, 116], [184, 116], [184, 64]] },
      { a: 3, b: 4, pts: [[184, 64], [204, 64], [204, 104], [288, 104]] },
      { a: 4, b: 5, pts: [[288, 104], [288, 72], [320, 72], [320, 44]] }
    ],
    decor: [
      { k: 'hut', x: 20, y: 84 },
      { k: 'sign', x: 138, y: 96 },
      { k: 'fortress', x: 309, y: 17 },
      { k: 'spire', x: 262, y: 52 },
      { k: 'spire', x: 344, y: 72 },
      { k: 'spire', x: 306, y: 108 }
    ]
  };

  G.Levels = levels;
  G.WorldMapData = worldMap;
  G.LevelChunks = CHUNKS;
})(window.GAME = window.GAME || {});
