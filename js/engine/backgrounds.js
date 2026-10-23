// Parallax backgrounds per theme: sky gradient + scrolling silhouette layers, all baked from code.
(function (G) {
  'use strict';

  const PERIOD = 512;   // layers tile horizontally with this period
  const SKY_H = 216;

  function gradient(stops) {
    const c = G.Gfx.mk(1, SKY_H), x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 0, SKY_H);
    stops.forEach(function (s, i) { g.addColorStop(i / (stops.length - 1), s); });
    x.fillStyle = g;
    x.fillRect(0, 0, 1, SKY_H);
    return c;
  }

  // Rolling hills: sum of sines with integer cycles so the strip tiles seamlessly.
  function hills(h, base, amp, cyc, base1, hi, seed) {
    const c = G.Gfx.mk(PERIOD, h), x = c.getContext('2d');
    const rnd = G.Gfx.rng(seed);
    const ph = [rnd() * 6.28, rnd() * 6.28, rnd() * 6.28];
    for (let i = 0; i < PERIOD; i++) {
      const t = (i / PERIOD) * Math.PI * 2;
      const y = Math.round(base - amp * (0.55 * Math.sin(t * cyc[0] + ph[0]) + 0.3 * Math.sin(t * cyc[1] + ph[1]) + 0.15 * Math.sin(t * cyc[2] + ph[2])));
      x.fillStyle = base1; x.fillRect(i, y, 1, h - y);
      x.fillStyle = hi; x.fillRect(i, y, 1, 2);
    }
    return c;
  }

  function clouds(h, count, seed, light, shade) {
    const c = G.Gfx.mk(PERIOD, h), x = c.getContext('2d');
    const rnd = G.Gfx.rng(seed);
    for (let n = 0; n < count; n++) {
      const cx = Math.floor((n + rnd() * 0.6) * (PERIOD / count));
      const cy = 10 + Math.floor(rnd() * (h - 30));
      const s = 5 + Math.floor(rnd() * 5);
      [[0, 0, s], [s, -s / 2, s + 2], [s * 2, 0, s]].forEach(function (p) { G.Gfx.disc(x, Math.round(cx + p[0]), Math.round(cy + p[1] + 3), Math.round(p[2]), shade); });
      x.fillStyle = shade; x.fillRect(cx, cy, s * 2, 4);
      [[0, 0, s], [s, -s / 2, s + 2], [s * 2, 0, s]].forEach(function (p) { G.Gfx.disc(x, Math.round(cx + p[0]), Math.round(cy + p[1]), Math.round(p[2]), light); });
      x.fillStyle = light; x.fillRect(cx, cy - 1, s * 2, 4);
    }
    return c;
  }

  function stalactites(h, color, hi, seed, fromTop) {
    const c = G.Gfx.mk(PERIOD, h), x = c.getContext('2d');
    const rnd = G.Gfx.rng(seed);
    let i = 0;
    while (i < PERIOD) {
      const w = 10 + Math.floor(rnd() * 14);
      const len = 14 + Math.floor(rnd() * (h - 20));
      for (let k = 0; k < w && i + k < PERIOD; k++) {
        const t = 1 - Math.abs((k / (w - 1)) * 2 - 1);
        const hh = Math.round(len * t);
        x.fillStyle = color;
        if (fromTop) x.fillRect(i + k, 0, 1, hh); else x.fillRect(i + k, h - hh, 1, hh);
        x.fillStyle = hi;
        if (fromTop) x.fillRect(i + k, Math.max(0, hh - 1), 1, 1); else x.fillRect(i + k, h - hh, 1, 1);
      }
      i += w + Math.floor(rnd() * 12);
    }
    return c;
  }

  function sparkles(h, count, seed, colors) {
    const c = G.Gfx.mk(PERIOD, h), x = c.getContext('2d');
    const rnd = G.Gfx.rng(seed);
    for (let n = 0; n < count; n++) {
      x.fillStyle = colors[Math.floor(rnd() * colors.length)];
      x.fillRect(Math.floor(rnd() * PERIOD), Math.floor(rnd() * h), 1 + (rnd() < 0.25 ? 1 : 0), 1);
    }
    return c;
  }

  function pillars(h, color, hi, glow, seed) {
    const c = G.Gfx.mk(PERIOD, h), x = c.getContext('2d');
    for (let px = 8; px < PERIOD; px += 64) {
      x.fillStyle = color; x.fillRect(px, 0, 22, h);
      x.fillStyle = hi; x.fillRect(px, 0, 2, h);
      x.fillStyle = glow; x.fillRect(px + 8, h * 0.35, 6, 14); x.fillRect(px + 9, h * 0.35 - 2, 4, 2);
    }
    x.fillStyle = color; x.fillRect(0, h - 10, PERIOD, 10);
    return c;
  }

  function sun(r, color, edge) {
    const c = G.Gfx.mk(r * 2 + 2, r * 2 + 2), x = c.getContext('2d');
    G.Gfx.disc(x, r + 1, r + 1, r, edge);
    G.Gfx.disc(x, r + 1, r + 1, r - 2, color);
    return c;
  }

  function def(theme) {
    const H = SKY_H;
    switch (theme) {
      case 'cave':
        return {
          sky: gradient(['#0c0c24', '#161640', '#26265a']),
          layers: [
            { img: sparkles(H, 70, 5, ['#6a6aff', '#9a9aff', '#c8c8ff']), scroll: 0.05, y: 0 },
            { img: stalactites(90, '#1a1a46', '#3a3a86', 7, true), scroll: 0.2, y: 0 },
            { img: stalactites(70, '#20205a', '#4848a0', 9, false), scroll: 0.35, y: H - 70 },
            { img: stalactites(46, '#2a2a70', '#5a5ab8', 13, false), scroll: 0.55, y: H - 46 }
          ]
        };
      case 'sky':
        return {
          sky: gradient(['#5ab0ff', '#a8dcff', '#ffeed8']),
          layers: [
            { img: clouds(110, 5, 3, '#ffffff', '#cfe0ff'), scroll: 0.08, y: 10 },
            { img: clouds(120, 6, 8, '#ffffff', '#c0d4f8'), scroll: 0.18, y: 70 },
            { img: clouds(100, 4, 12, '#f4f8ff', '#b4c8f0'), scroll: 0.32, y: H - 100 }
          ]
        };
      case 'dusk':
        return {
          sky: gradient(['#1c1c5a', '#8a3a7a', '#f0805a', '#ffc070']),
          layers: [
            { img: sun(22, '#fff0b0', '#ffd070'), scroll: 0, y: 80, fixedX: 0.68 },
            { img: clouds(90, 4, 21, '#ffb0a0', '#c05a7a'), scroll: 0.1, y: 20 },
            { img: hills(120, 70, 36, [2, 5, 9], '#7a3a80', '#a85a9a', 31), scroll: 0.2, y: H - 120 },
            { img: hills(90, 50, 26, [3, 6, 11], '#4a2468', '#6a3a8c', 33), scroll: 0.4, y: H - 90 }
          ]
        };
      case 'castle':
        return {
          sky: gradient(['#140810', '#34121e', '#5a1e26', '#8a3020']),
          layers: [
            { img: pillars(H, '#2a1020', '#4a2438', '#ff9a30', 3), scroll: 0.15, y: 0 },
            { img: pillars(H, '#1c0a16', '#38182a', '#ffc860', 5), scroll: 0.35, y: 0 },
            { img: sparkles(H, 40, 77, ['#ff8a30', '#ffc860']), scroll: 0.6, y: 0 }
          ]
        };
      default: // overworld
        return {
          sky: gradient(['#3c9cff', '#8ccaff', '#d8f0ff']),
          layers: [
            { img: clouds(100, 4, 2, '#ffffff', '#d4e6ff'), scroll: 0.06, y: 6 },
            { img: clouds(110, 5, 4, '#ffffff', '#cfe0ff'), scroll: 0.14, y: 50 },
            { img: hills(130, 80, 40, [2, 4, 7], '#8ad8a8', '#b8f0c8', 41), scroll: 0.22, y: H - 130 },
            { img: hills(100, 60, 28, [3, 6, 10], '#4cb870', '#82e098', 43), scroll: 0.42, y: H - 100 }
          ]
        };
    }
  }

  class Background {
    constructor(theme) { this.d = def(theme); this.t = 0; }

    draw(camX) {
      const ctx = G.R.getCtx();
      const W = G.R.BASE_W, H = G.R.BASE_H;
      this.t += 0.2;
      ctx.drawImage(this.d.sky, 0, 0, 1, SKY_H, 0, 0, W, H);
      for (const L of this.d.layers) {
        const img = L.img;
        if (L.fixedX != null) { ctx.drawImage(img, Math.round(W * L.fixedX), L.y); continue; }
        const drift = (L.scroll > 0 && L.scroll < 0.2) ? this.t * 0.2 * L.scroll * 5 : 0;
        let x0 = -(((camX * L.scroll + drift) % img.width) + img.width) % img.width;
        for (let x = x0; x < W; x += img.width) ctx.drawImage(img, Math.round(x), L.y);
      }
    }
  }

  G.Background = Background;
})(window.GAME = window.GAME || {});
