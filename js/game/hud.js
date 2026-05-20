// In-level HUD: coins, score, lives, time, level name.
(function (G) {
  'use strict';

  function pad(n, len) {
    n = String(Math.max(0, Math.floor(n)));
    while (n.length < len) n = '0' + n;
    return n;
  }

  function render(game, level) {
    const T = G.Text;
    const R = G.R;
    const y = 4;
    // lives (left)
    R.spriteS(G.Sprites.mapHero, 4, y - 1);
    T.drawShadow('x' + pad(game.lives, 1), 14, y, '#fff', 1, '#000');
    // coins
    R.spriteS(G.Sprites.coin[0], 38, y - 1);
    T.drawShadow('x' + pad(game.coins, 2), 48, y, '#f7d51d', 1, '#000');
    // score
    T.drawShadow('SCORE ' + pad(game.score, 6), 86, y, '#fff', 1, '#000');
    // time (right, kept clear of the top-right mute button)
    T.drawShadow('TIME ' + pad(level.time, 3), R.BASE_W - 84, y, '#fff', 1, '#000');
    // level name banner for the first few seconds
    if (level.age < 3 && !level.cleared) {
      T.drawCenterShadow(level.def.name || '', 30, '#fff', 1, '#000');
    }
  }

  G.HUD = { render };
})(window.GAME = window.GAME || {});
