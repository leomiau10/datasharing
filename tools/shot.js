// Capture real screenshots of the game using Playwright (Chromium).
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 800, height: 450 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));

  await page.goto('http://localhost:8099/index.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'tools/shot-title.png' });

  // Start -> map
  await page.keyboard.press('Enter');
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'tools/shot-map.png' });

  // Enter level
  await page.keyboard.press('Enter');
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'tools/shot-level0.png' });

  // Move right and jump a bit, capture mid-level
  await page.keyboard.down('ArrowRight');
  for (let i = 0; i < 6; i++) { await page.keyboard.press('Space'); await page.waitForTimeout(250); }
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'tools/shot-level0-run.png' });
  await page.keyboard.up('ArrowRight');

  // Force "big" hero + some score/coins to verify big sprite + HUD.
  await page.evaluate(() => {
    const g = window.GAME.game;
    g.score = 12345; g.coins = 17; g.lives = 4;
    g.level.player.grow();
    g.level.player.x = window.GAME.R.cam.x + 120;
  });
  await page.waitForTimeout(200);
  await page.screenshot({ path: 'tools/shot-big.png' });

  // Force level-clear banner.
  await page.evaluate(() => { window.GAME.game.level.cleared = true; window.GAME.game.level.player.startWin(); });
  await page.waitForTimeout(200);
  await page.screenshot({ path: 'tools/shot-clear.png' });

  // Victory screen.
  await page.evaluate(() => { window.GAME.game.scene = 'victory'; });
  await page.waitForTimeout(150);
  await page.screenshot({ path: 'tools/shot-victory.png' });

  // Game over screen.
  await page.evaluate(() => { window.GAME.game.scene = 'gameover'; });
  await page.waitForTimeout(150);
  await page.screenshot({ path: 'tools/shot-gameover.png' });

  console.log(errors.length ? errors.join('\n') : 'NO CONSOLE/PAGE ERRORS');
  await browser.close();
})().catch((e) => { console.error('SHOT FAILED:', e.message); process.exit(1); });
