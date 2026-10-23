// In-level HUD: lives, coins, score, time, run meter, power-up state.
(function (G) {
  'use strict';

  function pad(n, len) {
    n = String(Math.max(0, Math.floor(n)));
    while (n.length < len) n = '0' + n;
    return n;
  }

  // Word-wrapped message box (signs).
  function drawTip(text) {
    const T = G.Text, R = G.R;
    const maxChars = Math.floor((R.BASE_W - 48) / 6);
    const lines = [];
    let line = '';
    for (const w of text.split(' ')) {
      if ((line + ' ' + w).trim().length > maxChars) { lines.push(line.trim()); line = w; }
      else line += ' ' + w;
    }
    if (line.trim()) lines.push(line.trim());
    const bh = lines.length * 10 + 12, by = 26, bx = 16, bw = R.BASE_W - 32;
    R.rectS(bx - 2, by - 2, bw + 4, bh + 4, '#1c1024');
    R.rectS(bx, by, bw, bh, '#2a3a8a');
    R.rectS(bx, by, bw, 2, '#5a7ad8');
    lines.forEach((l, i) => T.drawCenterShadow(l, by + 7 + i * 10, '#fff', 1, '#000'));
  }

  function render(game, level) {
    const T = G.Text, R = G.R, S = G.Sprites;
    const y = 5;
    R.rectS(0, 0, R.BASE_W, 17, 'rgba(0,0,0,0.28)');
    R.spriteS(S.lifeIcon, 4, 2);
    T.drawShadow('x' + pad(game.lives, 1), 20, y, '#fff', 1, '#000');
    R.spriteS(S.coin[0], 44, 2);
    T.drawShadow('x' + pad(game.coins, 2), 56, y, '#ffe060', 1, '#000');
    T.drawShadow(pad(game.score, 6), 86, y, '#fff', 1, '#000');

    // run meter: 6 pips fill as the sprint charges
    const pm = level.player.pMeter, pips = Math.floor((pm / 70) * 6);
    for (let i = 0; i < 6; i++) R.rectS(132 + i * 5, y + 1, 4, 5, i < pips ? (pips >= 6 ? '#ffd84a' : '#ff7a3a') : 'rgba(255,255,255,0.25)');

    // power-up badge
    const form = level.player.form;
    const badge = { big: ['BIG', '#7ae0d4'], fire: ['FIRE', '#ff9a3a'], cloud: ['CLOUD', '#a8d8ff'] }[form];
    if (badge) T.drawShadow(badge[0], 166, y, badge[1], 1, '#000');

    // medals: 3 slots (solid = got now or before)
    const ctx = R.getCtx();
    for (let i = 0; i < 3; i++) {
      const got = (level.medalsGot | level.medalsHad) & (1 << i);
      ctx.drawImage(got ? S.medal : S.medalFaded, 200 + i * 10, 3, 8, 11);
    }
    if (level.player.star > 0) T.drawShadow('STAR', 234, y, ['#ff4a6a', '#ffd84a', '#4ae08a', '#4ab0ff'][(game.animFrame >> 2) & 3], 1, '#000');

    T.drawShadow('TIME ' + pad(level.time, 3), R.BASE_W - 84, y, level.time <= 60 ? '#ff7a6a' : '#fff', 1, '#000');
    if (level.tip) drawTip(level.tip);
    if (level.age < 3 && !level.cleared && !level.tip) T.drawCenterShadow(level.def.name || '', 30, '#fff', 1, '#000');
  }

  G.HUD = { render: render };
})(window.GAME = window.GAME || {});
