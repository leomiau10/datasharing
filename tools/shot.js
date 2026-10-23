// Real-browser screenshots at iPhone landscape size (844x390) of the key scenes.
// Usage: node tools/shot.js <outDir>   (needs a static server on :8099)
const { chromium } = require('playwright');
const out = process.argv[2] || 'tools';
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
  await page.goto('http://localhost:8099/index.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await page.screenshot({ path: out + '/shot-title.png' });

  await page.keyboard.press('Enter');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: out + '/shot-map.png' });

  // Each scene: level index + hero x position (tiles) + optional setup.
  const scenes = [
    { name: 'tip', level: 0, tile: 5 },
    { name: 'blocks', level: 0, tile: 30 },
    { name: 'cave', level: 1, tile: 60 },
    { name: 'sky', level: 2, tile: 30 },
    { name: 'dusk', level: 3, tile: 50 },
    { name: 'boss', level: 5, tile: -12 }
  ];
  for (const sc of scenes) {
    await page.evaluate((sc) => {
      const g = window.GAME.game;
      g.trans = null; g.checkpoints = {};
      g.startLevel(sc.level);
      const L = g.level, p = L.player;
      p.x = (sc.tile < 0 ? L.w + sc.tile : sc.tile) * 16;
      p.y = 100;
      if (sc.name === 'blocks') { p.powerUp('cloud'); p.invuln = 0; }
      L.updateCamera(true);
    }, sc);
    await page.waitForTimeout(900);
    await page.screenshot({ path: out + '/shot-' + sc.name + '.png' });
  }
  console.log(errors.length ? errors.join('\n') : 'NO CONSOLE/PAGE ERRORS');
  await browser.close();
})().catch((e) => { console.error('SHOT FAILED:', e.message); process.exit(1); });
