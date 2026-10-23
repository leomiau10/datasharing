// Game controller: scene state machine, iris transitions, fixed-timestep loop.
(function (G) {
  'use strict';

  const STEP = 1 / 60;
  const IRIS_FRAMES = 28;

  class Game {
    constructor() {
      this.scene = 'title';
      this.score = 0;
      const s = G.Save.get();
      this.coins = s.coins || 0;
      this.lives = s.lives || 3;
      this.form = 'small';
      this.level = null;
      this.levelIndex = 0;
      this.worldMap = null;
      this.checkpoints = {};
      this.animFrame = 0;
      this.paused = false;
      this.acc = 0;
      this.last = 0;
      this.trans = null; // { phase: 'out'|'in', t, fn, cx, cy }
      this.titleScroll = 0;
      this.bg = new G.Background('overworld');
    }

    addCoin() {
      this.coins++;
      this.addScore(50);
      if (this.coins >= 100) { this.coins -= 100; this.lives++; G.Audio.sfx.powerup(); }
      const st = G.Save.get(); st.coins = this.coins; st.lives = this.lives; G.Save.save();
    }
    addScore(n) { this.score += n; }

    // Close the iris, run fn (scene swap), then open it again.
    go(fn, cx, cy) {
      if (this.trans) return;
      this.trans = { phase: 'out', t: 0, fn: fn, cx: cx, cy: cy };
    }

    focusPoint() {
      if (this.scene === 'level' && this.level) {
        const p = this.level.player;
        return [p.cx - G.R.cam.x, p.y + p.h / 2 - G.R.cam.y];
      }
      return [G.R.BASE_W / 2, G.R.BASE_H / 2];
    }

    goMap() {
      this.scene = 'map';
      this.worldMap = new G.WorldMap(this);
      G.Audio.stopMusic();
    }

    startLevel(index) {
      this.levelIndex = index;
      const cp = this.checkpoints[index];
      this.level = new G.Level(G.Levels[index], this, cp);
      this.scene = 'level';
      this.paused = false;
      G.Audio.startMusic(G.Levels[index].theme);
    }

    onLevelCleared() {
      const f = this.focusPoint();
      this.go(() => {
        G.Save.markCleared(this.levelIndex);
        delete this.checkpoints[this.levelIndex];
        this.form = this.level.player.form;
        const allDone = G.Levels.every((_, i) => G.Save.isCleared(i));
        if (allDone) { this.scene = 'victory'; G.Audio.stopMusic(); }
        else this.goMap();
      }, f[0], f[1]);
    }

    onLevelFailed() {
      const f = this.focusPoint();
      this.go(() => {
        this.lives--;
        this.form = 'small';
        const st = G.Save.get(); st.lives = this.lives; G.Save.save();
        if (this.lives <= 0) { this.scene = 'gameover'; G.Audio.stopMusic(); }
        else this.startLevel(this.levelIndex);
      }, f[0], Math.min(f[1], G.R.BASE_H - 20));
    }

    updateTransition() {
      const t = this.trans;
      t.t++;
      if (t.phase === 'out' && t.t >= IRIS_FRAMES) {
        t.fn();
        t.phase = 'in';
        t.t = 0;
        const f = this.focusPoint();
        t.cx = f[0]; t.cy = f[1];
      } else if (t.phase === 'in' && t.t >= IRIS_FRAMES) {
        this.trans = null;
      }
    }

    update() {
      this.animFrame++;
      const In = G.Input;
      In.snapshot();
      if (this.trans) { this.updateTransition(); return; }

      switch (this.scene) {
        case 'title':
          this.titleScroll += 0.5;
          if (In.justPressed('jump') || In.justPressed('start')) {
            G.Audio.resume(); G.Audio.sfx.start();
            this.go(() => this.goMap());
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
            this.go(() => {
              this.lives = 3; this.coins = 0; this.score = 0; this.form = 'small'; this.checkpoints = {};
              const st = G.Save.get(); st.lives = 3; st.coins = 0; G.Save.save();
              this.goMap();
            });
          }
          break;
        case 'victory':
          if (In.justPressed('jump') || In.justPressed('start')) this.go(() => this.goMap());
          break;
      }
    }

    render() {
      const R = G.R, T = G.Text;
      switch (this.scene) {
        case 'title': this.renderTitle(); break;
        case 'map': this.worldMap.render(); break;
        case 'level':
          this.level.render();
          G.HUD.render(this, this.level);
          if (this.level.cleared) T.drawCenterShadow('LEVEL CLEAR!', 80, '#ffe000', 2, '#000');
          if (this.paused) {
            R.rectS(0, 0, R.BASE_W, R.BASE_H, 'rgba(0,0,0,0.55)');
            T.drawCenterShadow('PAUSED', 90, '#fff', 3, '#000');
            T.drawCenterShadow('PRESS START TO RESUME', 130, '#fff', 1, '#000');
          }
          break;
        case 'gameover': this.renderGameOver(); break;
        case 'victory': this.renderVictory(); break;
      }
      if (this.trans) this.renderIris();
    }

    renderIris() {
      const R = G.R, ctx = R.getCtx(), t = this.trans;
      const maxR = Math.hypot(R.BASE_W, R.BASE_H);
      const k = Math.min(1, t.t / IRIS_FRAMES);
      const radius = t.phase === 'out' ? maxR * (1 - k) : maxR * k;
      const cx = t.cx != null ? t.cx : R.BASE_W / 2;
      const cy = t.cy != null ? t.cy : R.BASE_H / 2;
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.rect(0, 0, R.BASE_W, R.BASE_H);
      ctx.arc(cx, cy, Math.max(0, radius), 0, Math.PI * 2, true);
      ctx.fill('evenodd');
    }

    renderTitle() {
      const R = G.R, T = G.Text, S = G.Sprites;
      this.bg.draw(this.titleScroll);
      const gy = R.BASE_H - 32;
      for (let c = 0; c <= R.BASE_W / 16 + 1; c++) {
        R.spriteS(S.tilesets.overworld.groundM, c * 16, gy);
        R.spriteS(S.tilesets.overworld.dirtM, c * 16, gy + 16);
      }
      R.spriteS(S.bush, 250, gy - S.bush.height + 1);
      R.spriteS(S.heroSets.big.idle, 56, gy - S.heroSets.big.idle.height + 1);
      R.spriteS(S.blob[(this.animFrame >> 4) & 1], R.BASE_W - 150, gy - 17);
      R.spriteS(S.tQuestion[(this.animFrame >> 3) & 3], R.BASE_W - 110, gy - 56);

      T.drawCenterShadow('PIP QUEST', 34, '#ffffff', 5, '#177a74');
      T.drawCenterShadow('A 16-BIT ADVENTURE', 82, '#fff6c0', 1, '#000');
      if ((this.animFrame >> 5) & 1) T.drawCenterShadow('PRESS A  OR  TAP TO START', 112, '#fff', 1, '#000');
      T.drawCenterShadow('ARROWS MOVE  Z JUMP  X RUN', 128, '#dde', 1, '#000');
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
      R.spriteS(S.heroSets.big.idle, R.BASE_W / 2 - 7, 140);
      T.drawCenterShadow('PRESS A TO RETURN TO MAP', R.BASE_H - 14, '#fff', 1, '#000');
    }
  }

  function loop(ts) {
    const g = G.game;
    if (!g.last) g.last = ts;
    let dt = (ts - g.last) / 1000;
    g.last = ts;
    if (dt > 0.25) dt = 0.25;
    g.acc += dt;
    let steps = 0;
    while (g.acc >= STEP && steps < 5) { g.update(); g.acc -= STEP; steps++; }
    g.render();
    requestAnimationFrame(loop);
  }

  function init() {
    G.R.init(document.getElementById('game'));
    G.Input.bindTouch(document);
    const dpad = document.getElementById('dpad');
    if (dpad) G.Input.bindDpad(dpad);
    G.game = new Game();

    const muteBtn = document.getElementById('mute');
    if (muteBtn) {
      muteBtn.addEventListener('click', () => {
        const m = G.Audio.toggleMute();
        muteBtn.textContent = m ? '\u{1F507}' : '\u{1F50A}';
        if (!m && G.game.scene === 'level') G.Audio.startMusic(G.Levels[G.game.levelIndex].theme);
      });
    }

    const kick = () => { G.Audio.resume(); window.removeEventListener('pointerdown', kick); window.removeEventListener('keydown', kick); };
    window.addEventListener('pointerdown', kick);
    window.addEventListener('keydown', kick);

    if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
    requestAnimationFrame(loop);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window.GAME = window.GAME || {});
