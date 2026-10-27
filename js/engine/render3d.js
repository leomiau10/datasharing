// 2.5D renderer: draws the level in real 3D with three.js while the game logic stays 2D.
//  - Tiles become instanced boxes with the pixel textures; pipes become cylinders; spikes cones.
//  - Every sprite the 2D renderer would draw is captured and shown as an extruded voxel model
//    built from the same (original) pixel art, so animations/flips keep working unchanged.
//  - The camera uses an off-axis (lens-shifted) projection: the eye sits above the action to show
//    top faces, yet the z=0 plane still maps 1:1 to the 2D screen, so the HUD overlay lines up.
// Falls back to the 2D renderer when three.js or WebGL is unavailable.
(function (G) {
  'use strict';

  const PX = 1 / 16;
  const CAM_DIST = 26;
  const CAM_LIFT = 5.5;
  const GROUND_DEPTH = 4;

  let THREE = null;
  let renderer = null, glCanvas = null, ready = false, active = false;
  let scene, camera, hemi, sun, bgCanvas, bgCtx, bgTex = null;
  let voxMat = null, built = null;
  const geoCache = new Map();
  const texCache = new Map();
  const depthOverride = new Map();
  const pools = new Map();
  const tmpM = () => new THREE.Matrix4();

  const LIGHT = {
    overworld: { sky: 0xdcefff, ground: 0x5a7a3a, hemi: 1.6, sun: 0xfff1d8, sunI: 2.6 },
    cave: { sky: 0x9a9ae8, ground: 0x282850, hemi: 1.2, sun: 0xc0c8ff, sunI: 1.7 },
    sky: { sky: 0xffffff, ground: 0xa0b4e0, hemi: 1.8, sun: 0xfff8e8, sunI: 2.4 },
    dusk: { sky: 0xffc0a0, ground: 0x4a2858, hemi: 1.4, sun: 0xffa868, sunI: 2.6 },
    castle: { sky: 0xffa880, ground: 0x301018, hemi: 1.1, sun: 0xffc890, sunI: 2.0 },
    forest: { sky: 0xd8f0d8, ground: 0x3a5a2a, hemi: 1.5, sun: 0xfff0d0, sunI: 2.3 },
    desert: { sky: 0xfff0d8, ground: 0x8a6a3a, hemi: 1.6, sun: 0xfff4d8, sunI: 2.8 },
    snow: { sky: 0xe8f4ff, ground: 0x8aa0c0, hemi: 1.8, sun: 0xf4f8ff, sunI: 2.2 },
    volcano: { sky: 0xff9a60, ground: 0x2a0a08, hemi: 1.1, sun: 0xffa060, sunI: 2.2 },
    night: { sky: 0x8a9ae0, ground: 0x1a1a3a, hemi: 1.0, sun: 0xc8d4ff, sunI: 1.5 }
  };

  // ------------------------------------------------------------------ setup
  function init() {
    THREE = window.THREE;
    glCanvas = document.getElementById('gl');
    if (!THREE || !glCanvas) return false;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: true, powerPreference: 'high-performance' });
    } catch (e) {
      return false;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(30, 16 / 9, 0.5, 400);
    hemi = new THREE.HemisphereLight(0xffffff, 0x445533, 1.5);
    scene.add(hemi);
    sun = new THREE.DirectionalLight(0xffffff, 2.4);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    const sc = sun.shadow.camera;
    sc.left = -22; sc.right = 22; sc.top = 15; sc.bottom = -15; sc.near = 1; sc.far = 80;
    sun.shadow.bias = -0.0006;
    sun.shadow.normalBias = 0.03;
    scene.add(sun);
    scene.add(sun.target);

    bgCanvas = document.createElement('canvas');
    bgCtx = bgCanvas.getContext('2d');
    voxMat = new THREE.MeshLambertMaterial({ vertexColors: true });

    const S = G.Sprites;
    depthOverride.set(S.lift, 16);
    depthOverride.set(S.castle, 22);
    depthOverride.set(S.banner, 2);
    depthOverride.set(S.tFlagPole, 3);
    depthOverride.set(S.tFlagTop, 4);
    depthOverride.set(S.sign, 3);
    depthOverride.set(S.medal, 3);
    S.coin.forEach((c) => depthOverride.set(c, 3));

    ready = true;
    G.R.resize();
    return true;
  }

  function resize(cssW, cssH) {
    if (!ready) return;
    renderer.setSize(cssW, cssH, false);
  }

  function setActive(on) {
    if (!ready || on === active) return;
    active = on;
    glCanvas.style.display = on ? 'block' : 'none';
  }

  // ------------------------------------------------------------------ helpers
  function tex(canvas, rx, ry) {
    const key = canvas;
    let byRepeat = texCache.get(key);
    if (!byRepeat) { byRepeat = {}; texCache.set(key, byRepeat); }
    const k = (rx || 1) + 'x' + (ry || 1);
    let t = byRepeat[k];
    if (!t) {
      t = new THREE.CanvasTexture(canvas);
      t.colorSpace = THREE.SRGBColorSpace;
      t.magFilter = THREE.NearestFilter;
      t.minFilter = THREE.NearestFilter;
      t.generateMipmaps = false;
      if (rx || ry) {
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.repeat.set(rx || 1, ry || 1);
      }
      byRepeat[k] = t;
    }
    return t;
  }

  function lambert(map, color) {
    return new THREE.MeshLambertMaterial(map ? { map: map } : { color: color });
  }

  // Grass seen from above: the grass color from the ground tile with lighter/darker blades.
  function topTexture(groundTile) {
    const d = groundTile.getContext('2d').getImageData(0, 0, 16, 16).data;
    const px = (x, y) => 'rgb(' + d[(y * 16 + x) * 4] + ',' + d[(y * 16 + x) * 4 + 1] + ',' + d[(y * 16 + x) * 4 + 2] + ')';
    const c = G.Gfx.mk(16, 16), x = c.getContext('2d');
    const rnd = G.Gfx.rng(5);
    x.fillStyle = px(8, 2); x.fillRect(0, 0, 16, 16);
    for (let i = 0; i < 40; i++) {
      x.fillStyle = rnd() < 0.5 ? px(8, 1) : px(8, 3);
      x.fillRect(Math.floor(rnd() * 16), Math.floor(rnd() * 16), 1, 1 + Math.floor(rnd() * 2));
    }
    return c;
  }

  // ------------------------------------------------------------------ voxel models
  function depthFor(img) {
    if (depthOverride.has(img)) return depthOverride.get(img);
    return Math.max(4, Math.min(10, Math.round(Math.min(img.width, img.height) * 0.45)));
  }

  // Extrude every opaque pixel into a cube; only faces next to empty pixels are emitted.
  function voxelGeometry(img) {
    let geo = geoCache.get(img);
    if (geo) return geo;
    const w = img.width, h = img.height;
    const data = img.getContext('2d').getImageData(0, 0, w, h).data;
    const solid = (i, j) => i >= 0 && j >= 0 && i < w && j < h && data[(j * w + i) * 4 + 3] > 128;
    const zf = depthFor(img) * PX / 2;
    const pos = [], nrm = [], col = [], idx = [];
    const c = new THREE.Color();
    function quad(v, n, r, g, b) {
      const base = pos.length / 3;
      for (let k = 0; k < 12; k += 3) { pos.push(v[k], v[k + 1], v[k + 2]); nrm.push(n[0], n[1], n[2]); col.push(r, g, b); }
      idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        if (!solid(i, j)) continue;
        const o = (j * w + i) * 4;
        c.setRGB(data[o] / 255, data[o + 1] / 255, data[o + 2] / 255, THREE.SRGBColorSpace);
        const r = c.r, g = c.g, b = c.b;
        const x0 = i * PX, x1 = (i + 1) * PX, y0 = -j * PX, y1 = -(j + 1) * PX;
        quad([x0, y1, zf, x1, y1, zf, x1, y0, zf, x0, y0, zf], [0, 0, 1], r, g, b);
        quad([x1, y1, -zf, x0, y1, -zf, x0, y0, -zf, x1, y0, -zf], [0, 0, -1], r * 0.8, g * 0.8, b * 0.8);
        const s = 0.88;
        if (!solid(i - 1, j)) quad([x0, y1, -zf, x0, y1, zf, x0, y0, zf, x0, y0, -zf], [-1, 0, 0], r * s, g * s, b * s);
        if (!solid(i + 1, j)) quad([x1, y1, zf, x1, y1, -zf, x1, y0, -zf, x1, y0, zf], [1, 0, 0], r * s, g * s, b * s);
        if (!solid(i, j - 1)) quad([x0, y0, zf, x1, y0, zf, x1, y0, -zf, x0, y0, -zf], [0, 1, 0], r, g, b);
        if (!solid(i, j + 1)) quad([x0, y1, -zf, x1, y1, -zf, x1, y1, zf, x0, y1, zf], [0, -1, 0], r * 0.75, g * 0.75, b * 0.75);
      }
    }
    geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.setIndex(pos.length / 3 > 65535 ? new THREE.Uint32BufferAttribute(idx, 1) : new THREE.Uint16BufferAttribute(idx, 1));
    geo.computeBoundingSphere();
    geoCache.set(img, geo);
    return geo;
  }

  // ------------------------------------------------------------------ per-frame object pools
  function take(key, make) {
    let p = pools.get(key);
    if (!p) { p = { list: [], used: 0 }; pools.set(key, p); }
    if (p.used >= p.list.length) { const o = make(); scene.add(o); p.list.push(o); }
    const o = p.list[p.used++];
    o.visible = true;
    return o;
  }
  function beginPools() { pools.forEach((p) => { p.used = 0; }); }
  function endPools() { pools.forEach((p) => { for (let i = p.used; i < p.list.length; i++) p.list[i].visible = false; }); }

  function makeVoxelNode(img) {
    const group = new THREE.Group();
    const mesh = new THREE.Mesh(voxelGeometry(img), voxMat);
    mesh.castShadow = true;
    mesh.position.x = -img.width * PX / 2; // pivot at the top-center so flips/rotations stay in place
    group.add(mesh);
    return group;
  }

  function parseColor(str) {
    const m = /rgba?\(([^)]+)\)/.exec(str);
    if (m) {
      const p = m[1].split(',').map(Number);
      return { color: new THREE.Color().setRGB(p[0] / 255, p[1] / 255, p[2] / 255, THREE.SRGBColorSpace), alpha: p.length > 3 ? p[3] : 1 };
    }
    return { color: new THREE.Color(str), alpha: 1 };
  }

  let unitBox = null;
  function emitRect(x, y, w, h, color, z) {
    const node = take('rect:' + color, () => {
      if (!unitBox) unitBox = new THREE.BoxGeometry(1, 1, 1);
      const pc = parseColor(color);
      const mat = new THREE.MeshLambertMaterial({ color: pc.color, transparent: pc.alpha < 1, opacity: pc.alpha });
      return new THREE.Mesh(unitBox, mat);
    });
    node.scale.set(Math.max(w, 0.5) * PX, Math.max(h, 0.5) * PX, Math.max(2, Math.min(w, h)) * PX);
    node.position.set((x + w / 2) * PX, -(y + h / 2) * PX, z);
  }

  function emitSprite(img, x, y, w, h, flipX, flipY, owner, z, level) {
    const S = G.Sprites;
    let spin = 0, lean = 0;
    const isCoin = owner && (owner instanceof G.Coin || owner instanceof G.CoinPop);
    if (isCoin && S.coin.indexOf(img) >= 0) { img = S.coin[0]; w = img.width; h = img.height; spin = 1; }
    if (img === S.castle) z = -1.6;
    const node = take(img, () => makeVoxelNode(img));
    const sx = w / img.width, sy = h / img.height;
    const f = G.game.animFrame;
    const p = level.player;
    if (owner === p && p.spinning) { flipX = false; spin = 2; }
    else if (owner === p || (owner && level.enemies.indexOf(owner) >= 0)) lean = flipX ? 0.42 : -0.42;
    node.scale.set(flipX ? -sx : sx, flipY ? -sy : sy, 1);
    node.position.set((x + w / 2) * PX, -(flipY ? y + h : y) * PX, z);
    let ry = lean;
    if (spin === 1) ry = f * 0.07 + x * 0.05;
    else if (spin === 2) ry = f * 0.55;
    else if (owner instanceof G.Medal) ry = Math.sin(f * 0.05) * 0.9;
    node.rotation.set(0, ry, 0);
  }

  // Run the existing 2D render code with G.R redirected into the 3D pools.
  function captureEntities(level) {
    const R = G.R;
    const orig = { sprite: R.sprite, rect: R.rect, spriteScaled: R.spriteScaled };
    let owner = null, z = 0;
    R.sprite = (img, x, y, fx, fy) => emitSprite(img, x, y, img.width, img.height, !!fx, !!fy, owner, z, level);
    R.spriteScaled = (img, x, y, w, h) => emitSprite(img, x, y, w, h, false, false, owner, z, level);
    R.rect = (x, y, w, h, color) => emitRect(x, y, w, h, color, z);
    try {
      z = -1.5;
      for (const d of level.decor) R.sprite(d.img, d.x, d.y);
      z = -0.7;
      for (const sg of level.signs) R.sprite(G.Sprites.sign, sg.x - 1, sg.y - 1);
      z = -0.4;
      if (level.checkpoint) level.drawCheckpoint();
      z = -0.5;
      if (level.flagX != null) level.drawFlag();
      z = 0;
      for (const pl of level.platforms) { owner = pl; pl.render(); }
      for (const it of level.items) { owner = it; it.render(); }
      for (const e of level.enemies) { owner = e; e.render(); }
      for (const s of level.shots) { owner = s; s.render(); }
      owner = level.player; level.player.render();
      for (const pt of level.particles) { owner = pt; pt.render(); }
    } finally {
      R.sprite = orig.sprite; R.rect = orig.rect; R.spriteScaled = orig.spriteScaled;
    }
  }

  // ------------------------------------------------------------------ level geometry
  function kindOf(id) {
    const T = G.Tiles.T;
    switch (id) {
      case T.GROUND: return 'ground';
      case T.DIRT: return 'dirt';
      case T.BRICK: return 'brick';
      case T.QUESTION: return 'question';
      case T.USED: return 'used';
      case T.BLOCK: return 'block';
      case T.PLATFORM: return 'platform';
      default: return null;
    }
  }

  function tileMatrix(kind, c, r, dy) {
    const m = tmpM();
    if (kind === 'platform') m.makeTranslation(c + 0.5, -r - 5 / 32 + dy, 0);
    else m.makeTranslation(c + 0.5, -(r + 0.5) + dy, 0);
    return m;
  }

  function disposeBuilt() {
    if (!built) return;
    scene.remove(built.root);
    built.root.traverse((o) => {
      if (o.isMesh) {
        if (o.geometry && o.geometry !== unitBox) o.geometry.dispose();
      }
    });
    built = null;
  }

  function buildLevel(level) {
    disposeBuilt();
    const S = G.Sprites, T = G.Tiles.T;
    const ts = S.tilesets[level.theme] || S.tilesets.overworld;
    const root = new THREE.Group();
    scene.add(root);

    const lt = LIGHT[level.theme] || LIGHT.overworld;
    hemi.color.setHex(lt.sky); hemi.groundColor.setHex(lt.ground); hemi.intensity = lt.hemi;
    sun.color.setHex(lt.sun); sun.intensity = lt.sunI;

    const top = topTexture(ts.groundM);
    const D = GROUND_DEPTH;
    const box1 = new THREE.BoxGeometry(1, 1, 1);
    const boxD = new THREE.BoxGeometry(1, 1, D);
    const qTex = S.tQuestion.map((cv) => tex(cv));
    const qMat = lambert(qTex[0]);
    const goldMat = lambert(null, 0xf8b820);
    const kinds = {
      ground: { geo: boxD, mat: [lambert(tex(ts.dirtM, D, 1)), lambert(tex(ts.dirtM, D, 1)), lambert(tex(top, 1, D)), lambert(tex(ts.dirtM)), lambert(tex(ts.groundM)), lambert(tex(ts.groundM))] },
      dirt: { geo: boxD, mat: [lambert(tex(ts.dirtM, D, 1)), lambert(tex(ts.dirtM, D, 1)), lambert(tex(ts.dirtM, 1, D)), lambert(tex(ts.dirtM)), lambert(tex(ts.dirtM)), lambert(tex(ts.dirtM))] },
      brick: { geo: box1, mat: lambert(tex(ts.brick)) },
      question: { geo: box1, mat: [qMat, qMat, goldMat, goldMat, qMat, qMat] },
      used: { geo: box1, mat: lambert(tex(S.tUsed)) },
      block: { geo: box1, mat: lambert(tex(S.tBlock)) },
      platform: { geo: new THREE.BoxGeometry(1, 5 / 16, 1.6), mat: [lambert(null, 0x8a5a28), lambert(null, 0x8a5a28), lambert(null, 0xe8a860), lambert(null, 0x6a3a18), lambert(tex(S.tPlatform)), lambert(tex(S.tPlatform))] }
    };

    // count tiles per kind (+ spare 'used' slots for ? blocks that will be hit)
    const counts = {};
    let spikes = 0, questions = 0;
    for (let r = 0; r < level.h; r++) {
      for (let c = 0; c < level.w; c++) {
        const id = level.grid[r][c];
        const k = kindOf(id);
        if (k) counts[k] = (counts[k] || 0) + 1;
        if (id === T.QUESTION) questions++;
        if (id === T.SPIKE) spikes++;
      }
    }
    counts.used = (counts.used || 0) + questions;

    const meshes = {};
    for (const k in kinds) {
      const cap = counts[k] || 0;
      if (!cap) continue;
      const im = new THREE.InstancedMesh(kinds[k].geo, kinds[k].mat, cap);
      im.count = 0;
      im.castShadow = true;
      im.receiveShadow = true;
      im.frustumCulled = false;
      root.add(im);
      meshes[k] = im;
    }

    const refs = new Map();
    function place(kind, c, r) {
      const im = meshes[kind];
      if (!im || im.count >= im.instanceMatrix.count) return false;
      const i = im.count++;
      im.setMatrixAt(i, tileMatrix(kind, c, r, 0));
      im.instanceMatrix.needsUpdate = true;
      refs.set(c + ',' + r, { kind: kind, i: i });
      return true;
    }
    for (let r = 0; r < level.h; r++) {
      for (let c = 0; c < level.w; c++) {
        const k = kindOf(level.grid[r][c]);
        if (k) place(k, c, r);
      }
    }

    // spikes: a metal plate with a row of cones
    if (spikes) {
      const coneGeo = new THREE.ConeGeometry(0.11, 0.5, 6);
      const cones = new THREE.InstancedMesh(coneGeo, lambert(null, 0xe0e6f0), spikes * 6);
      const plates = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.25, 1), lambert(null, 0x586070), spikes);
      let ci = 0, pi = 0;
      for (let r = 0; r < level.h; r++) {
        for (let c = 0; c < level.w; c++) {
          if (level.grid[r][c] !== T.SPIKE) continue;
          plates.setMatrixAt(pi++, tmpM().makeTranslation(c + 0.5, -(r + 1) + 0.125, 0));
          for (const ox of [0.2, 0.5, 0.8]) for (const oz of [-0.25, 0.25]) {
            cones.setMatrixAt(ci++, tmpM().makeTranslation(c + ox, -(r + 1) + 0.5, oz));
          }
        }
      }
      for (const im of [cones, plates]) { im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false; root.add(im); }
    }

    // pipes: rim + body cylinders spanning the two pipe columns
    const pipeMat = lambert(null, 0x2aa88c);
    const rimMat = lambert(null, 0x3cc8a4);
    const holeMat = lambert(null, 0x0e2a28);
    for (let r = 0; r < level.h; r++) {
      for (let c = 0; c < level.w; c++) {
        if (level.grid[r][c] !== T.PIPE_TL) continue;
        let rows = 0;
        while (r + 1 + rows < level.h && level.grid[r + 1 + rows][c] === T.PIPE_L) rows++;
        const cx = c + 1;
        const rim = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 1, 24), rimMat);
        rim.position.set(cx, -(r + 0.5), 0);
        const hole = new THREE.Mesh(new THREE.CircleGeometry(0.78, 24), holeMat);
        hole.rotation.x = -Math.PI / 2;
        hole.position.set(cx, -r + 0.01, 0);
        root.add(rim, hole);
        if (rows > 0) {
          const body = new THREE.Mesh(new THREE.CylinderGeometry(0.86, 0.86, rows, 24), pipeMat);
          body.position.set(cx, -(r + 1) - rows / 2, 0);
          body.castShadow = body.receiveShadow = true;
          root.add(body);
        }
        rim.castShadow = rim.receiveShadow = true;
      }
    }

    built = { level: level, root: root, meshes: meshes, refs: refs, place: place, qMat: qMat, qTex: qTex, bumped: new Set() };

    // keep the 3D tiles in sync when blocks break or turn into used blocks
    const origSet = level.setTile.bind(level);
    level.setTile = function (c, r, id) {
      origSet(c, r, id);
      if (built && built.level === level) onTileChanged(c, r, id);
    };
  }

  const ZERO = () => tmpM().makeScale(0, 0, 0);
  function onTileChanged(c, r, id) {
    const key = c + ',' + r;
    const ref = built.refs.get(key);
    if (ref) {
      const im = built.meshes[ref.kind];
      im.setMatrixAt(ref.i, ZERO());
      im.instanceMatrix.needsUpdate = true;
      built.refs.delete(key);
    }
    const k = kindOf(id);
    if (k) built.place(k, c, r);
  }

  function updateBumps(level) {
    const now = new Set(Object.keys(level.bumps));
    const all = new Set([...now, ...built.bumped]);
    all.forEach((key) => {
      const ref = built.refs.get(key);
      if (!ref) return;
      const parts = key.split(',');
      const b = level.bumps[key];
      const dy = b ? Math.sin((b / 8) * Math.PI) * 5 * PX : 0;
      const im = built.meshes[ref.kind];
      im.setMatrixAt(ref.i, tileMatrix(ref.kind, +parts[0], +parts[1], dy));
      im.instanceMatrix.needsUpdate = true;
    });
    built.bumped = now;
  }

  // ------------------------------------------------------------------ camera + frame
  function placeCamera() {
    const W = G.R.BASE_W, H = G.R.BASE_H, cam = G.R.cam;
    const cx = (cam.x + W / 2) * PX, cy = -(cam.y + H / 2) * PX;
    camera.fov = 2 * Math.atan((H * PX / 2) / CAM_DIST) * 180 / Math.PI;
    camera.aspect = W / H;
    camera.position.set(cx, cy + CAM_LIFT, CAM_DIST);
    camera.rotation.set(0, 0, 0);
    camera.updateProjectionMatrix();
    // lens shift so the z=0 plane stays centered (keeps 2D overlay aligned) while looking down
    const te = camera.projectionMatrix.elements;
    te[9] = -CAM_LIFT * te[5] / CAM_DIST;
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
    sun.target.position.set(cx, cy, 0);
    sun.position.set(cx - 5, cy + 20, 7);
  }

  function drawBackground(level) {
    const W = G.R.BASE_W, H = G.R.BASE_H;
    if (bgCanvas.width !== W || bgCanvas.height !== H || !bgTex) {
      bgCanvas.width = W; bgCanvas.height = H;
      bgCtx.imageSmoothingEnabled = false;
      if (bgTex) bgTex.dispose();
      bgTex = new THREE.CanvasTexture(bgCanvas);
      bgTex.colorSpace = THREE.SRGBColorSpace;
      bgTex.magFilter = THREE.NearestFilter;
      bgTex.minFilter = THREE.NearestFilter;
      bgTex.generateMipmaps = false;
      scene.background = bgTex;
    }
    level.bg.draw(G.R.cam.x, bgCtx);
    bgTex.needsUpdate = true;
  }

  function render(level) {
    if (!built || built.level !== level) buildLevel(level);
    placeCamera();
    drawBackground(level);
    built.qMat.map = built.qTex[(G.game.animFrame >> 3) % built.qTex.length];
    updateBumps(level);
    beginPools();
    captureEntities(level);
    endPools();
    renderer.render(scene, camera);
  }

  G.R3 = {
    init: init,
    ok: function () { return ready; },
    resize: resize,
    setActive: setActive,
    render: render
  };
})(window.GAME = window.GAME || {});
