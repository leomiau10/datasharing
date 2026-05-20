// Game controller: scene state machine + fixed-timestep loop.
(function (G) {
  'use strict';

  const STEP = 1 / 60;

  class Game {
    constructor() {
      this.scene = 'title';
      this.score = 0;
      const s = G.Save.get();
      this.coins = s.coins || 0;
      this.lives = s.lives || 3;
      this.bigState = false;
      this.level = null;
      this.levelIndex = 0;
      this.worldMap = null;
      this.animFrame = 0;
      this.paused = false;
      this.acc = 0;
      this.last = 0;
      this.flash = 0; // transition flash timer
    }

    addCoin() {
      this.coins++;
      this.addScore(50);
      if (this.coins >= 100) { this.coins -= 100; this.lives++; G.Audio.sfx.powerup(); }
      const st = G.Save.get(); st.coins = this.coins; st.lives = this.lives; G.Save.save();
    }
    addScore(n) { this.score += n; }

    goMap() {
      this.scene = 'map';
      this.worldMap = new G.WorldMap(this);
      G.Audio.stopMusic();
    }

    startLevel(index) {
      this.levelIndex = index;
      this.level = new G.Level(G.Levels[index], this);
      this.scene = 'level';
      this.paused = false;
      this.flash = 0.3;
      if (!G.Audio.isMuted()) G.Audio.startMusic();
    }

    onLevelCleared() {
      G.Save.markCleared(this.levelIndex);
      this.bigState = this.level.player.big;
      const allDone = G.Levels.every((_, i) => G.Save.isCleared(i));
      if (allDone) { this.scene = 'victory'; }
      else this.goMap();
    }

    onLevelFailed() {
      this.lives--;
      this.bigState = false;
      const st = G.Save.get(); st.lives = this.lives; G.Save.save();
      if (this.lives <= 0) {
        this.scene = 'gameover';
      } else {
        this.startLevel(this.levelIndex);
      }
    }

    update() {
      this.animFrame++;
      const In = G.Input;
      In.snapshot();

      switch (this.scene) {
        case 'title':
          if (In.justPressed('jump') || In.justPressed('start')) {
            G.Audio.resume(); G.Audio.sfx.select();
            this.goMap();
          }
          break;
        case 'map':
          this.worldMap.update(STEP);
          break;
        case 'level':
          if (In.justPressed('start')) { this.paused = !this.paused; G.Audio.sfx.select(); }
          if (!this.paused) this.level.update(STEP);
          break;
        case 'gameover':
          if (In.justPressed('jump') || In.justPressed('start')) {
            this.lives = 3; this.coins = 0; this.score = 0;
            const st = G.Save.get(); st.lives = 3; st.coins = 0; G.Save.save();
            this.goMap();
          }
          break;
        case 'victory':
          if (In.justPressed('jump') || In.justPressed('start')) { this.goMap(); }
          break;
      }
      if (this.flash > 0) this.flash -= STEP;
    }

    render() {
      const R = G.R, T = G.Text;
      switch (this.scene) {
        case 'title': this.renderTitle(); break;
        case 'map': this.worldMap.render(); break;
        case 'level':
          this.level.render();
          G.HUD.render(this, this.level);
          if (this.level.cleared) T.drawCenterShadow('LEVEL CLEAR!', 90, '#ffe000', 2, '#000');
          if (this.paused) {
            R.rectS(0, 0, R.BASE_W, R.BASE_H, 'rgba(0,0,0,0.55)');
            T.drawCenterShadow('PAUSED', 90, '#fff', 3, '#000');
            T.drawCenterShadow('PRESS START TO RESUME', 130, '#fff', 1, '#000');
          }
          break;
        case 'gameover': this.renderGameOver(); break;
        case 'victory': this.renderVictory(); break;
      }
      if (this.flash > 0) {
        const a = Math.min(1, this.flash / 0.3);
        R.rectS(0, 0, R.BASE_W, R.BASE_H, 'rgba(0,0,0,' + a + ')');
      }
    }

    renderTitle() {
      const R = G.R, T = G.Text, S = G.Sprites;
      R.clear('#5c94fc');
      // ground strip
      for (let c = 0; c <= R.BASE_W / 16; c++) {
        R.spriteS(S.tGround, c * 16, R.BASE_H - 16);
        R.spriteS(S.tDirt, c * 16, R.BASE_H);
      }
      R.spriteS(S.hill, 40, R.BASE_H - 16 - 24);
      R.spriteS(S.cloud, 70, 40);
      R.spriteS(S.cloud, 280, 30);
      R.spriteS(S.bush, 250, R.BASE_H - 16 - 4);
      // hero standing
      R.spriteS(S.heroBigIdle, 60, R.BASE_H - 16 - 28);
      R.spriteS(S.goomba[(this.animFrame >> 4) & 1], 300, R.BASE_H - 16 - 16);

      T.drawCenterShadow('PIXEL', 40, '#ffffff', 4, '#a01510');
      T.drawCenterShadow('PLATFORMER', 78, '#ffe000', 4, '#a05a00');
      T.drawCenterShadow('A SUPER MARIO STYLE ADVENTURE', 118, '#fff', 1, '#000');
      if ((this.animFrame >> 5) & 1) {
        T.drawCenterShadow('PRESS A  /  TAP TO START', 150, '#fff', 1, '#000');
      }
      T.drawCenterShadow('ARROWS MOVE   Z JUMP   X RUN', R.BASE_H - 10, '#dde', 1, '#000');
    }

    renderGameOver() {
      const R = G.R, T = G.Text;
      R.clear('#000');
      T.drawCenterShadow('GAME OVER', 80, '#e52521', 4, '#400');
      T.drawCenterShadow('PRESS A TO TRY AGAIN', 130, '#fff', 1, '#000');
    }

    renderVictory() {
      const R = G.R, T = G.Text, S = G.Sprites;
      R.clear('#1a1a3a');
      T.drawCenterShadow('YOU WIN!', 50, '#ffe000', 4, '#a05a00');
      T.drawCenterShadow('ALL LEVELS CLEARED', 95, '#fff', 2, '#000');
      T.drawCenterShadow('SCORE ' + this.score, 125, '#fff', 1, '#000');
      R.spriteS(S.heroBigIdle, R.BASE_W / 2 - 6, 140);
      T.drawCenterShadow('PRESS A TO RETURN TO MAP', R.BASE_H - 14, '#fff', 1, '#000');
    }
  }

  function loop(ts) {
    const g = G.game;
    if (!g.last) g.last = ts;
    let dt = (ts - g.last) / 1000;
    g.last = ts;
    if (dt > 0.25) dt = 0.25; // avoid spiral after tab switch
    g.acc += dt;
    let steps = 0;
    while (g.acc >= STEP && steps < 5) { g.update(); g.acc -= STEP; steps++; }
    g.render();
    requestAnimationFrame(loop);
  }

  function init() {
    const canvas = document.getElementById('game');
    G.R.init(canvas);
    G.Input.bindTouch(document);
    G.game = new Game();

    // Mute button
    const muteBtn = document.getElementById('mute');
    if (muteBtn) {
      muteBtn.addEventListener('click', () => {
        const m = G.Audio.toggleMute();
        muteBtn.textContent = m ? '\u{1F507}' : '\u{1F50A}';
        if (!m && G.game.scene === 'level') G.Audio.startMusic();
      });
    }

    // First gesture resumes audio (iOS requirement)
    const kick = () => { G.Audio.resume(); window.removeEventListener('pointerdown', kick); window.removeEventListener('keydown', kick); };
    window.addEventListener('pointerdown', kick);
    window.addEventListener('keydown', kick);

    // Register service worker for offline / PWA
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }

    requestAnimationFrame(loop);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window.GAME = window.GAME || {});
