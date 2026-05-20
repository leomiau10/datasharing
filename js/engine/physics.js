// AABB tile collision and gravity helpers.
(function (G) {
  'use strict';

  const TILE = 16;
  const GRAVITY = 0.45;
  const MAX_FALL = 8;

  function aabb(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x &&
           a.y < b.y + b.h && a.y + a.h > b.y;
  }

  // Move an entity along one axis and resolve collisions against the level grid.
  // Returns collision info { left, right, up, down, hitTiles:[{col,row,id}] }.
  // `solidFn(id)` decides solidity; one-way platforms only block when moving down
  // and the entity was above them.
  function moveAndCollide(e, level, gravity) {
    const Tiles = G.Tiles;
    const result = { left: false, right: false, up: false, down: false, hit: [] };

    if (gravity !== false) {
      e.vy += GRAVITY;
      if (e.vy > MAX_FALL) e.vy = MAX_FALL;
    }

    // --- Horizontal ---
    e.x += e.vx;
    if (e.vx !== 0) {
      const dir = e.vx > 0 ? 1 : -1;
      const probeX = dir > 0 ? e.x + e.w : e.x;
      const c = Math.floor(probeX / TILE);
      const r0 = Math.floor(e.y / TILE);
      const r1 = Math.floor((e.y + e.h - 1) / TILE);
      for (let r = r0; r <= r1; r++) {
        const id = level.tileAt(c, r);
        if (Tiles.isSolid(id)) {
          if (dir > 0) { e.x = c * TILE - e.w; result.right = true; }
          else { e.x = (c + 1) * TILE; result.left = true; }
          e.vx = 0;
          result.hit.push({ col: c, row: r, id, side: dir > 0 ? 'right' : 'left' });
          break;
        }
      }
    }

    // --- Vertical ---
    const prevBottom = e.y + e.h;
    e.y += e.vy;
    if (e.vy !== 0) {
      if (e.vy > 0) {
        // moving down
        const probeY = e.y + e.h;
        const r = Math.floor(probeY / TILE);
        const c0 = Math.floor(e.x / TILE);
        const c1 = Math.floor((e.x + e.w - 1) / TILE);
        for (let c = c0; c <= c1; c++) {
          const id = level.tileAt(c, r);
          let blocks = Tiles.isSolid(id);
          if (!blocks && Tiles.isOneWay(id)) {
            // Only land if we were above the platform top last frame.
            const top = r * TILE;
            if (prevBottom <= top + 2) blocks = true;
          }
          if (blocks) {
            e.y = r * TILE - e.h;
            e.vy = 0;
            result.down = true;
            result.hit.push({ col: c, row: r, id, side: 'down' });
            break;
          }
        }
      } else {
        // moving up
        const probeY = e.y;
        const r = Math.floor(probeY / TILE);
        const c0 = Math.floor(e.x / TILE);
        const c1 = Math.floor((e.x + e.w - 1) / TILE);
        for (let c = c0; c <= c1; c++) {
          const id = level.tileAt(c, r);
          if (Tiles.isSolid(id)) {
            e.y = (r + 1) * TILE;
            e.vy = 0;
            result.up = true;
            result.hit.push({ col: c, row: r, id, side: 'up' });
            break;
          }
        }
      }
    }

    return result;
  }

  G.Physics = { aabb, moveAndCollide, GRAVITY, MAX_FALL, TILE };
})(window.GAME = window.GAME || {});
