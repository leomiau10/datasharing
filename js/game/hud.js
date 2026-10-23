// In-level HUD: lives, coins, score, time, run meter, power-up state.
(function (G) {
  'use strict';

  function pad(n, len) {
    n = String(Math.max(0, Math.floor(n)));
    while (n.length < len) n = '0' + n;
    return n;
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
    if (form !== 'small') T.drawShadow(form === 'fire' ? 'FIRE' : 'BIG', 166, y, form === 'fire' ? '#ff9a3a' : '#7ae0d4', 1, '#000');

    T.drawShadow('TIME ' + pad(level.time, 3), R.BASE_W - 84, y, level.time <= 60 ? '#ff7a6a' : '#fff', 1, '#000');
    if (level.age < 3 && !level.cleared) T.drawCenterShadow(level.def.name || '', 30, '#fff', 1, '#000');
  }

  G.HUD = { render: render };
})(window.GAME = window.GAME || {});
