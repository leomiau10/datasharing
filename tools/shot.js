// Real-browser screenshots at iPhone landscape size (844x390) for every theme and scene.
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

  const themes = ['overworld', 'cave', 'sky', 'dusk', 'cave', 'castle'];
  for (let i = 0; i < 6; i++) {
    await page.evaluate((i) => {
      const g = window.GAME.game;
      g.trans = null; g.checkpoints = {};
      g.startLevel(i);
      const p = g.level.player;
      p.x += 150; // stand a bit into the level so enemies/blocks show
      g.level.updateCamera(true);
      if (i === 0) { p.powerUp('flower'); p.invuln = 0; }
    }, i);
    await page.waitForTimeout(700);
    await page.screenshot({ path: out + '/shot-level' + i + '.png' });
  }
  console.log(errors.length ? errors.join('\n') : 'NO CONSOLE/PAGE ERRORS');
  await browser.close();
})().catch((e) => { console.error('SHOT FAILED:', e.message); process.exit(1); });
