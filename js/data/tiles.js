// Tile definitions and properties. Pure code, no external assets.
(function (G) {
  'use strict';

  // Tile size in world pixels.
  const TILE = 16;

  // Character codes used inside level strings -> tile type id.
  // Numeric ids are used by the collision grid.
  const T = {
    EMPTY: 0,
    GROUND: 1,   // solid dirt/grass top
    DIRT: 2,     // solid underground
    BRICK: 3,    // breakable brick
    QUESTION: 4, // ? block (gives item, then becomes USED)
    USED: 5,     // emptied ? block (still solid)
    PIPE_TL: 6,
    PIPE_TR: 7,
    PIPE_L: 8,
    PIPE_R: 9,
    BLOCK: 10,   // hard stone block
    SPIKE: 11,   // hazard
    PLATFORM: 12,// one-way (jump-through) platform
    FLAG_POLE: 13,
    FLAG_TOP: 14,
    CASTLE: 15
  };

  // Map level-string characters to tile ids / spawns.
  const CHAR = {
    ' ': T.EMPTY,
    '.': T.EMPTY,
    '#': T.GROUND,
    'd': T.DIRT,
    'B': T.BRICK,
    '?': T.QUESTION,
    'U': T.USED,
    '[': T.PIPE_TL,
    ']': T.PIPE_TR,
    '{': T.PIPE_L,
    '}': T.PIPE_R,
    'X': T.BLOCK,
    '^': T.SPIKE,
    '-': T.PLATFORM,
    '|': T.FLAG_POLE,
    'T': T.FLAG_TOP,
    'C': T.CASTLE
  };

  // Spawn characters (do not become tiles, they create entities).
  const SPAWN = {
    'S': 'player',
    'g': 'goomba',
    'k': 'koopa',
    'o': 'coin',
    'm': 'mushroom_block', // a ? block that yields a mushroom
    'F': 'flag',
    'K': 'checkpoint'
  };

  function isSolid(id) {
    switch (id) {
      case T.GROUND:
      case T.DIRT:
      case T.BRICK:
      case T.QUESTION:
      case T.USED:
      case T.PIPE_TL:
      case T.PIPE_TR:
      case T.PIPE_L:
      case T.PIPE_R:
      case T.BLOCK:
        return true;
      default:
        return false;
    }
  }

  function isOneWay(id) { return id === T.PLATFORM; }
  function isHazard(id) { return id === T.SPIKE; }

  G.Tiles = { TILE, T, CHAR, SPAWN, isSolid, isOneWay, isHazard };
})(window.GAME = window.GAME || {});
