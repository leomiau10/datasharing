// Hand-designed levels built from reusable chunks (original layouts).
//
// Each chunk is { floor, art }: `floor` sets the width; '#' ground, '.' pit, '^' pit with spikes,
// '=' wooden bridge at ground level over a pit.
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
    // ---- extra chunks for the later worlds
    bridge_long: { floor: '##==============##', art: [
      '      oooo        ',
      '                  ',
      '      g    p      '] },
    lifts_double: { floor: '##..............##', art: [
      '       M          ',
      '                  ',
      '  M               ',
      '                  '] },
    step_blocks: { floor: '################', art: [
      '           oo   ',
      '           BB   ',
      '       oo       ',
      '       BB       ',
      '   oo           ',
      '   BB           ',
      '                '] },
    spike_run: { floor: '##################', art: [
      '    ?   ?   ?     ',
      '                  ',
      '                  ',
      '  ^^^  ^^^  ^^^   '] },
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
      rows[GROUND_R] += ch.floor.replace(/[.^]/g, ' ').replace(/=/g, '-');
      rows[GROUND_R + 1] += ch.floor.replace(/[.=]/g, ' ');
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
        'bonus_gem', 'spikes', 'medal_wall', 'lift_v', 'hoppers', 'medal_pit', 'pit_small', 'tip', 'boss_arena'] },

    // ---- Maple Woods
    { name: 'WORLD 3-1  MAPLE WOODS', theme: 'forest',
      chunks: ['start_plain', 'flat_coins', 'hills', 'bees', 'medal_blocks', 'pit_small', 'crowd', 'step_blocks',
        'checkpoint', 'hoppers', 'medal_high', 'bridge_long', 'thorns', 'medal_pit', 'end'] },
    { name: 'WORLD 3-2  TREETOP TRAIL', theme: 'forest',
      chunks: ['start_plain', 'sky_ledges', 'step_blocks', 'bees', 'medal_wall', 'lift_h', 'checkpoint',
        'bridge_long', 'bonus_1up', 'sky_ledges', 'medal_pit', 'hills', 'medal_blocks', 'end'] },
    { name: 'WORLD 3-3  HAUNTED GROVE', theme: 'night',
      chunks: ['start_plain', 'tunnel', 'hoppers', 'spikes', 'medal_tunnel', 'thorns', 'checkpoint', 'bonus_gem',
        'crowd', 'pit_big', 'medal_wall', 'step_blocks', 'medal_high', 'end'] },
    { name: 'WORLD 3-4  MOSSY DEPTHS', theme: 'cave',
      chunks: ['start_plain', 'tunnel', 'crowd', 'spike_run', 'medal_blocks', 'pipes', 'lift_v', 'checkpoint',
        'thorns', 'lifts_double', 'medal_tunnel', 'hoppers', 'medal_pit', 'end'] },
    { name: 'WORLD 3-5  TIMBER FORT', theme: 'castle', bossHp: 4,
      tips: ['EL REY GLOOP HA VUELTO MAS FUERTE: 4 GOLPES'],
      chunks: ['start_plain', 'spike_run', 'thorns', 'pit_big', 'medal_high', 'lifts_double', 'checkpoint',
        'bonus_gem', 'crowd', 'medal_wall', 'spikes', 'medal_pit', 'tip', 'boss_arena'] },

    // ---- Sunbaked Sands
    { name: 'WORLD 4-1  DUNE DASH', theme: 'desert',
      chunks: ['start_plain', 'flat_coins', 'pyramid', 'crowd', 'medal_blocks', 'pit_big', 'hills', 'checkpoint',
        'thorns', 'spike_run', 'medal_pit', 'bonus_1up', 'hoppers', 'medal_high', 'end'] },
    { name: 'WORLD 4-2  OASIS BRIDGES', theme: 'desert',
      chunks: ['start_plain', 'bridge_long', 'pipes', 'lift_h', 'medal_pit', 'bridge_long', 'checkpoint', 'bees',
        'lifts_double', 'medal_blocks', 'step_blocks', 'bridge_long', 'medal_high', 'end'] },
    { name: 'WORLD 4-3  SANDSTONE CAVES', theme: 'cave',
      chunks: ['start_plain', 'tunnel', 'thorns', 'medal_tunnel', 'pit_small', 'crowd', 'checkpoint', 'spike_run',
        'lift_v', 'medal_wall', 'hoppers', 'tunnel', 'medal_pit', 'end'] },
    { name: 'WORLD 4-4  MIRAGE SKIES', theme: 'sky',
      chunks: ['start_plain', 'bonus_cloud', 'sky_ledges', 'lifts_double', 'bees', 'medal_pit', 'checkpoint',
        'sky_ledges', 'lift_v', 'medal_high', 'bridge_long', 'bees', 'medal_blocks', 'end'] },
    { name: 'WORLD 4-5  PYRAMID KEEP', theme: 'castle', bossHp: 4,
      tips: ['LA GUARIDA DEL DESIERTO. EL REY GLOOP AGUANTA 4 GOLPES'],
      chunks: ['start_plain', 'spike_run', 'thorns', 'lifts_double', 'medal_high', 'crowd', 'checkpoint',
        'bonus_gem', 'spikes', 'pit_big', 'medal_wall', 'hoppers', 'medal_pit', 'tip', 'boss_arena'] },

    // ---- Frostfire Peaks
    { name: 'WORLD 5-1  FROZEN SLOPES', theme: 'snow',
      tips: ['EL HIELO RESBALA: SUELTA LA DIRECCION ANTES PARA FRENAR'],
      chunks: ['start', 'flat_coins', 'hills', 'crowd', 'medal_blocks', 'pit_small', 'step_blocks', 'checkpoint',
        'thorns', 'pit_big', 'medal_high', 'bonus_1up', 'bees', 'medal_pit', 'end'] },
    { name: 'WORLD 5-2  ICICLE HOLLOW', theme: 'snow',
      chunks: ['start_plain', 'tunnel', 'spike_run', 'medal_tunnel', 'crowd', 'lift_h', 'checkpoint', 'thorns',
        'lifts_double', 'medal_wall', 'hoppers', 'pit_big', 'medal_pit', 'end'] },
    { name: 'WORLD 5-3  EMBER FIELDS', theme: 'volcano',
      chunks: ['start_plain', 'spike_run', 'thorns', 'pit_big', 'medal_blocks', 'hoppers', 'checkpoint',
        'lifts_double', 'crowd', 'medal_high', 'bridge_long', 'spike_run', 'medal_pit', 'end'] },
    { name: 'WORLD 5-4  STARLIGHT SKY', theme: 'night',
      chunks: ['start_plain', 'sky_ledges', 'lifts_double', 'bees', 'medal_pit', 'bonus_cloud', 'checkpoint',
        'sky_ledges', 'lift_v', 'medal_high', 'bridge_long', 'bees', 'medal_wall', 'end'] },
    { name: 'WORLD 5-5  LAVA CITADEL', theme: 'volcano', bossHp: 5,
      tips: ['ULTIMA BATALLA: EL REY GLOOP EN SU CIUDADELA. 5 GOLPES'],
      chunks: ['start_plain', 'spike_run', 'thorns', 'lifts_double', 'medal_high', 'crowd', 'spike_run',
        'checkpoint', 'bonus_gem', 'pit_big', 'medal_wall', 'hoppers', 'lift_h', 'medal_pit', 'tip', 'boss_arena'] }
  ];

  const levels = defs.map((d) => ({
    name: d.name,
    theme: d.theme,
    bossHp: d.bossHp,
    tips: d.tips || [],
    groundRow: GROUND_R,
    map: assemble(d.chunks)
  }));

  // World maps (original layouts). Each map is a 48x22-cell canvas (384x176 px).
  // islands/plateau are superellipse blobs in cells: [cx, cy, rx, ry]. Node/edge coordinates are pixels;
  // edges carry waypoints so trails bend. Nodes are levels or warps (+1 next map, -1 previous map).
  const worlds = [
    { name: 'PIP ISLAND', palette: 'green',
      islands: [[14.5, 8.5, 12.8, 8], [38.5, 9.5, 7.8, 7.5]],
      plateau: { blob: [9.5, 4, 6, 3.2], pond: [8, 3.5, 2.6, 1.4], falls: [7, 8], pool: [8, 10, 2.2, 1.2] },
      bridgeRows: [12, 13],
      nodes: [
        { x: 56, y: 104, level: 0 },
        { x: 128, y: 116, level: 1 },
        { x: 96, y: 28, level: 2 },
        { x: 184, y: 64, level: 3 },
        { x: 288, y: 104, level: 4 },
        { x: 320, y: 44, level: 5, castle: true },
        { x: 344, y: 128, warp: 1 }
      ],
      edges: [
        { a: 0, b: 1, pts: [[56, 104], [56, 116], [128, 116]] },
        { a: 1, b: 2, pts: [[128, 116], [128, 88], [108, 88], [108, 28], [96, 28]] },
        { a: 1, b: 3, pts: [[128, 116], [184, 116], [184, 64]] },
        { a: 3, b: 4, pts: [[184, 64], [204, 64], [204, 104], [288, 104]] },
        { a: 4, b: 5, pts: [[288, 104], [288, 72], [320, 72], [320, 44]] },
        { a: 4, b: 6, pts: [[288, 104], [344, 104], [344, 128]] }
      ],
      decor: [
        { k: 'hut', x: 20, y: 84 },
        { k: 'sign', x: 138, y: 96 },
        { k: 'fortress', x: 309, y: 17 },
        { k: 'spire', x: 262, y: 52 },
        { k: 'spire', x: 344, y: 72 }
      ] },
    { name: 'MAPLE WOODS', palette: 'forest',
      islands: [[24, 10.5, 21, 9]],
      plateau: { blob: [34, 5, 8, 3.2] },
      bridgeRows: [],
      nodes: [
        { x: 40, y: 88, warp: -1 },
        { x: 88, y: 120, level: 6 },
        { x: 152, y: 72, level: 7 },
        { x: 208, y: 128, level: 8 },
        { x: 264, y: 104, level: 9 },
        { x: 304, y: 40, level: 10, castle: true },
        { x: 344, y: 88, warp: 1 }
      ],
      edges: [
        { a: 0, b: 1, pts: [[40, 88], [40, 120], [88, 120]] },
        { a: 1, b: 2, pts: [[88, 120], [120, 120], [120, 72], [152, 72]] },
        { a: 2, b: 3, pts: [[152, 72], [184, 72], [184, 128], [208, 128]] },
        { a: 3, b: 4, pts: [[208, 128], [240, 128], [240, 104], [264, 104]] },
        { a: 4, b: 5, pts: [[264, 104], [296, 104], [296, 40], [304, 40]] },
        { a: 5, b: 6, pts: [[304, 40], [320, 40], [320, 88], [344, 88]] }
      ],
      decor: [
        { k: 'fortress', x: 293, y: 12 },
        { k: 'sign', x: 56, y: 70 }
      ] },
    { name: 'SUNBAKED SANDS', palette: 'sand',
      islands: [[12, 9, 10.5, 8], [35, 10, 11, 8]],
      plateau: { blob: [10, 4.5, 6, 3], pond: [9, 4, 2.5, 1.3], falls: [8, 9], pool: [9, 10.5, 2.2, 1.1] },
      bridgeRows: [12, 13],
      nodes: [
        { x: 32, y: 104, warp: -1 },
        { x: 72, y: 120, level: 11 },
        { x: 120, y: 32, level: 12 },
        { x: 168, y: 72, level: 13 },
        { x: 232, y: 104, level: 14 },
        { x: 296, y: 48, level: 15, castle: true },
        { x: 352, y: 120, warp: 1 }
      ],
      edges: [
        { a: 0, b: 1, pts: [[32, 104], [32, 120], [72, 120]] },
        { a: 1, b: 2, pts: [[72, 120], [120, 120], [120, 32]] },
        { a: 2, b: 3, pts: [[120, 32], [152, 32], [152, 72], [168, 72]] },
        { a: 3, b: 4, pts: [[168, 72], [168, 104], [232, 104]] },
        { a: 4, b: 5, pts: [[232, 104], [296, 104], [296, 48]] },
        { a: 5, b: 6, pts: [[296, 48], [344, 48], [344, 120], [352, 120]] }
      ],
      decor: [
        { k: 'fortress', x: 285, y: 20 },
        { k: 'spire', x: 250, y: 40 }
      ] },
    { name: 'FROSTFIRE PEAKS', palette: 'snow',
      islands: [[14, 10, 12.5, 8.5], [37, 9.5, 9.5, 8]],
      plateau: { blob: [38, 5, 6, 3] },
      bridgeRows: [12, 13],
      nodes: [
        { x: 40, y: 112, warp: -1 },
        { x: 88, y: 128, level: 16 },
        { x: 136, y: 64, level: 17 },
        { x: 200, y: 104, level: 18 },
        { x: 256, y: 104, level: 19 },
        { x: 320, y: 40, level: 20, castle: true }
      ],
      edges: [
        { a: 0, b: 1, pts: [[40, 112], [40, 128], [88, 128]] },
        { a: 1, b: 2, pts: [[88, 128], [136, 128], [136, 64]] },
        { a: 2, b: 3, pts: [[136, 64], [200, 64], [200, 104]] },
        { a: 3, b: 4, pts: [[200, 104], [256, 104]] },
        { a: 4, b: 5, pts: [[256, 104], [288, 104], [288, 40], [320, 40]] }
      ],
      decor: [
        { k: 'fortress', x: 309, y: 12 },
        { k: 'hut', x: 60, y: 92 }
      ] }
  ];

  G.Levels = levels;
  G.Worlds = worlds;
  G.LevelChunks = CHUNKS;
})(window.GAME = window.GAME || {});
