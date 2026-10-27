// World data checks: every level sits on exactly one map node, trails and nodes are on walkable
// terrain, warps connect neighbouring maps, and every level has a valid layout.
const G = require('./_env.js').load();
const assert = (c, m) => { if (!c) throw new Error(m); };
const TS = 8;
const walkable = new Set(['g', 'G', 'S', 'b']);

const seen = {};
G.Worlds.forEach((w, wi) => {
  const grid = G.WorldMapGrid(wi);
  const at = (x, y) => (grid[Math.floor(y / TS)] || [])[Math.floor(x / TS)];
  w.nodes.forEach((n, i) => {
    assert(walkable.has(at(n.x, n.y)), w.name + ' node ' + i + ' is not on land (' + at(n.x, n.y) + ')');
    if (n.level != null) { assert(seen[n.level] == null, 'level ' + n.level + ' on two nodes'); seen[n.level] = wi; }
    if (n.warp) {
      const t = G.Worlds[wi + n.warp];
      assert(t, w.name + ' warp ' + n.warp + ' leads nowhere');
      assert(t.nodes.some((m) => m.warp === -n.warp), t.name + ' has no matching warp back');
    }
  });
  w.edges.forEach((e, k) => {
    const pts = e.pts;
    assert(pts[0][0] === w.nodes[e.a].x && pts[0][1] === w.nodes[e.a].y, w.name + ' edge ' + k + ' does not start at its node');
    const last = pts[pts.length - 1];
    assert(last[0] === w.nodes[e.b].x && last[1] === w.nodes[e.b].y, w.name + ' edge ' + k + ' does not end at its node');
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]));
      for (let s = 0; s <= n; s++) {
        const x = Math.round(a[0] + (b[0] - a[0]) * s / n), y = Math.round(a[1] + (b[1] - a[1]) * s / n);
        assert(walkable.has(at(x, y)), w.name + ' edge ' + k + ' crosses ' + at(x, y) + ' at ' + x + ',' + y);
      }
    }
  });
  w.decor.forEach((d) => assert(walkable.has(at(d.x + 6, d.y + 16)) || at(d.x + 6, d.y + 16) === 'w', w.name + ' decor ' + d.k + ' floats over water'));
  console.log(w.name + ': ok (' + w.nodes.length + ' nodes)');
});
G.Levels.forEach((L, i) => {
  assert(seen[i] != null, 'level ' + i + ' (' + L.name + ') is not on any map');
  const flat = L.map.join('');
  assert(new Set(L.map.map((r) => r.length)).size === 1, L.name + ' rows differ in width');
  assert(flat.split('*').length - 1 === 3, L.name + ' needs 3 medals');
  assert(flat.includes('F') || flat.includes('Z'), L.name + ' needs a goal or boss');
  assert(flat.split('!').length - 1 <= L.tips.length, L.name + ' has more signs than tips');
});
console.log(G.Levels.length + ' levels on ' + G.Worlds.length + ' maps');
console.log('\nWORLD TESTS PASSED');
