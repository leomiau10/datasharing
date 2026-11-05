// Game controller: scene state machine, iris transitions, fixed-timestep loop.
(function (G) {
  'use strict';

  const STEP = 1 / 60;
  const IRIS_FRAMES = 28;
  const FINAL_LEVEL = 20;
  G.VERSION = '11'; // shown on the title screen; matches the service worker cache name

  class Game {
    constructor() {
      this.scene = 'title';
      this.score = 0;
      const s = G.Save.get();
      this.coins = s.coins || 0;
      this.lives = s.lives || 5;
      this.form = 'small';
      this.hasMount = false;
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
      this.settingsRow = 0;
      this.settingsReturn = 'title';
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
        if (this.level.secretExit) G.Save.markSecret(this.levelIndex);
        G.Save.addMedals(this.levelIndex, this.level.medalsGot);
        delete this.checkpoints[this.levelIndex];
        this.form = this.level.player.form;
        if (!this.level.water) this.hasMount = !!this.level.player.mount;
        // the Lava Citadel (final fortress) ends the story; secret levels are optional extras
        if (this.levelIndex === FINAL_LEVEL) { this.scene = 'victory'; G.Audio.stopMusic(); }
        else this.goMap();
      }, f[0], f[1]);
    }

    onLevelFailed() {
      const f = this.focusPoint();
      this.go(() => {
        this.lives--;
        this.form = 'small';
        this.hasMount = false;
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
          if (this.titleLevel) {
            // attract mode: enemies and coins keep moving behind the logo
            for (const e of this.titleLevel.enemies) e.update(this.titleLevel);
            this.titleLevel.enemies = this.titleLevel.enemies.filter((e) => !e.remove);
          }
          if (In.justPressed('spin')) { this.openSettings(); break; }
          if (In.justPressed('jump') || In.justPressed('start')) {
            G.Audio.resume(); G.Audio.sfx.start();
            this.go(() => this.goMap());
          }
          break;
        case 'map':
          if (In.justPressed('spin') && !this.worldMap.move) { this.openSettings(); break; }
          this.worldMap.update(STEP);
          break;
        case 'level':
          if (In.justPressed('start')) { this.paused = !this.paused; G.Audio.sfx.select(); }
          if (this.paused && In.justPressed('spin')) { this.openSettings(); break; }
          if (!this.paused) this.level.update(STEP);
          break;
        case 'settings':
          this.updateSettings();
          break;
        case 'gameover':
          if (In.justPressed('jump') || In.justPressed('start')) {
            this.go(() => {
              this.lives = 5; this.coins = 0; this.score = 0; this.form = 'small'; this.checkpoints = {}; this.hasMount = false;
              const st = G.Save.get(); st.lives = 5; st.coins = 0; G.Save.save();
              this.goMap();
            });
          }
          break;
        case 'victory':
          if (In.justPressed('jump') || In.justPressed('start')) this.go(() => this.goMap());
          break;
      }
    }

    // Settings screen: returns to the scene it was opened from (a level stays paused).
    openSettings() {
      if (this.scene === 'settings' || this.trans) return;
      if (this.scene === 'level') this.paused = true;
      this.settingsReturn = this.scene;
      this.scene = 'settings';
      this.settingsRow = 0;
      G.Audio.sfx.select();
    }

    updateSettings() {
      const In = G.Input, items = G.Settings.ITEMS;
      const item = items[this.settingsRow];
      if (In.justPressed('up')) { this.settingsRow = (this.settingsRow + items.length - 1) % items.length; G.Audio.sfx.select(); }
      else if (In.justPressed('down')) { this.settingsRow = (this.settingsRow + 1) % items.length; G.Audio.sfx.select(); }
      else if (In.justPressed('left') && item.key !== 'back') { G.Settings.step(item, -1); G.Audio.sfx.coin(); }
      else if (In.justPressed('right') && item.key !== 'back') { G.Settings.step(item, 1); G.Audio.sfx.coin(); }
      else if (In.justPressed('jump')) {
        if (item.key === 'back') this.closeSettings();
        else { G.Settings.step(item, 1); G.Audio.sfx.coin(); }
      } else if (In.justPressed('start') || In.justPressed('run') || In.justPressed('spin')) this.closeSettings();
    }

    closeSettings() {
      this.scene = this.settingsReturn;
      G.Audio.sfx.select();
      if (this.scene === 'level' && !G.Audio.isMuted()) G.Audio.startMusic(G.Levels[this.levelIndex].theme);
    }

    renderSettings() {
      const R = G.R, T = G.Text, S = G.Settings;
      R.clear('#141a3a');
      for (let y = 0; y < R.BASE_H; y += 6) R.rectS(0, y, R.BASE_W, 1, 'rgba(255,255,255,0.03)');
      T.drawCenterShadow('AJUSTES', 14, '#ffe060', 3, '#000');
      const st = S.get(), x0 = Math.max(16, Math.round(R.BASE_W / 2 - 170));
      S.ITEMS.forEach((it, i) => {
        const y = 52 + i * 26, sel = i === this.settingsRow;
        R.rectS(x0, y - 6, R.BASE_W - x0 * 2, 20, sel ? 'rgba(90,120,255,0.45)' : 'rgba(255,255,255,0.06)');
        if (sel) T.drawShadow('>', x0 + 4, y, '#ffe060', 1, '#000');
        T.drawShadow(it.label, x0 + 14, y, sel ? '#ffffff' : '#c8ccee', 1, '#000');
        if (it.values) {
          T.drawShadow('< ' + it.names[st[it.key]] + ' >', x0 + 92, y, '#ffe060', 1, '#000');
        } else if (it.range) {
          for (let k = 0; k < it.range[1]; k++) R.rectS(x0 + 92 + k * 9, y, 7, 7, k < st[it.key] ? '#5ad08a' : 'rgba(255,255,255,0.18)');
          T.drawShadow(String(st[it.key]), x0 + 92 + it.range[1] * 9 + 6, y, '#fff', 1, '#000');
        }
      });
      T.drawCenterShadow('ARRIBA/ABAJO ELEGIR   IZQ/DER CAMBIAR   B VOLVER', 38, '#aab', 1, '#000');
    }

    render() {
      const R = G.R, T = G.Text;
      const use3D = !!(G.R3 && G.R3.ok());
      if (use3D && this.scene === 'title' && !this.titleLevel) {
        this.titleLevel = new G.Level(G.Levels[0], this);
        this.titleLevel.player.grounded = true;
      }
      if (G.R3) G.R3.setActive(use3D && (this.scene === 'level' || this.scene === 'title'));
      switch (this.scene) {
        case 'title': this.renderTitle(); break;
        case 'map': this.worldMap.render(); break;
        case 'level':
          if (G.R3 && G.R3.ok()) { R.clearTransparent(); G.R3.render(this.level); }
          else this.level.render();
          if (this.level.water) this.renderWaterTint();
          G.HUD.render(this, this.level);
          if (this.level.cleared) {
            if (this.level.secretExit) T.drawCenterShadow('SALIDA SECRETA!', 80, '#d8a8ff', 2, '#000');
            else T.drawCenterShadow('LEVEL CLEAR!', 80, '#ffe000', 2, '#000');
          }
          if (this.paused) {
            R.rectS(0, 0, R.BASE_W, R.BASE_H, 'rgba(0,0,0,0.55)');
            T.drawCenterShadow('PAUSA', 86, '#fff', 3, '#000');
            T.drawCenterShadow('START: CONTINUAR    Y: AJUSTES', 126, '#fff', 1, '#000');
          }
          break;
        case 'gameover': this.renderGameOver(); break;
        case 'victory': this.renderVictory(); break;
        case 'settings': this.renderSettings(); break;
      }
      if (this.trans) this.renderIris();
    }

    // Underwater look over either renderer: blue tint plus a rippling surface line.
    renderWaterTint() {
      const R = G.R, ctx = R.getCtx();
      R.rectS(0, 0, R.BASE_W, R.BASE_H, 'rgba(30,110,220,0.14)');
      const sy = -R.cam.y + 6;
      if (sy > -8) {
        ctx.fillStyle = 'rgba(200,240,255,0.55)';
        for (let x = 0; x < R.BASE_W; x += 2) ctx.fillRect(x, Math.round(sy + Math.sin((x + this.animFrame * 1.5) * 0.06) * 2), 2, 1);
      }
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
      if (this.titleLevel) {
        // 3D: slowly pan across World 1-1 behind the logo
        const L = this.titleLevel;
        const span = Math.max(0, L.pixelW - R.BASE_W);
        const k = 0.5 - 0.5 * Math.cos(this.titleScroll * 0.004);
        R.setCamera(k * Math.min(span, 1400), L.pixelH - R.BASE_H);
        R.clearTransparent();
        G.R3.render(L);
        this.renderTitleText();
        return;
      }
      this.bg.draw(this.titleScroll);
      const gy = R.BASE_H - 32;
      for (let c = 0; c <= R.BASE_W / 16 + 1; c++) {
        R.spriteS(S.tilesets.overworld.groundM, c * 16, gy);
        R.spriteS(S.tilesets.overworld.dirtM, c * 16, gy + 16);
      }
      R.spriteS(S.bush, 250, gy - S.bush.height + 1);
      R.spriteS(S.heroSets.big.idle, 56, gy - S.heroSets.big.idle.height + 1);
      R.spriteS(S.blob[(this.animFrame >> 4) & 1], R.BASE_W - 150, gy - 17);
      R.spriteS(S.tQuestion[(this.animFrame >> 3) & 3], R.BASE_W - 110, gy - 36);

      this.renderTitleText();
    }

    renderTitleText() {
      const R = G.R, T = G.Text;
      T.drawCenterShadow('PIP QUEST', 26, '#ffffff', 5, '#177a74');
      T.drawCenterShadow('UNA AVENTURA EN 3D', 70, '#fff6c0', 1, '#000');
      if ((this.animFrame >> 5) & 1) T.drawCenterShadow('PULSA A PARA EMPEZAR    Y: AJUSTES', 88, '#fff', 1, '#000');
      const help = [
        'A SALTAR    B CORRER / FUEGO / AGARRAR    Y GIRO',
        'ABAJO EN EL AIRE: GOLPE AL SUELO',
        'CONTRA LA PARED + A: SALTO DE PARED'
      ];
      R.rectS(20, 104, R.BASE_W - 40, 40, 'rgba(0,0,0,0.35)');
      help.forEach((l, i) => T.drawCenterShadow(l, 109 + i * 11, '#dde', 1, '#000'));
      T.drawShadow('VERSION ' + G.VERSION, 6, 6, '#fff', 1, '#000');
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
    if (G.R3) G.R3.init();
    G.Input.bindTouch(document);
    const lzone = document.getElementById('lzone');
    if (lzone) G.Input.bindStick(lzone, document.getElementById('stick'), document.getElementById('knob'));
    const rzone = document.getElementById('rzone');
    if (rzone) G.Input.bindActions(rzone);

    // iOS Safari ignores user-scalable=no: block double-tap zoom, pinch and page scrolling.
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (e) => {
      const now = Date.now();
      if (now - lastTouchEnd < 400 && e.cancelable) e.preventDefault();
      lastTouchEnd = now;
    }, { passive: false });
    document.addEventListener('touchmove', (e) => { if (e.cancelable) e.preventDefault(); }, { passive: false });
    ['gesturestart', 'gesturechange', 'gestureend', 'dblclick'].forEach((t) => document.addEventListener(t, (e) => e.preventDefault(), { passive: false }));
    G.game = new Game();
    G.Settings.apply();

    const gear = document.getElementById('gear');
    if (gear) gear.addEventListener('click', () => { G.Audio.resume(); G.game.openSettings(); });

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

    if ('serviceWorker' in navigator) {
      // Check for a new version on every launch; when it takes over, reload once to show it.
      navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' })
        .then((reg) => reg.update())
        .catch(() => {});
      const hadController = !!navigator.serviceWorker.controller;
      let reloaded = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!hadController || reloaded) return;
        reloaded = true;
        window.location.reload();
      });
    }
    requestAnimationFrame(loop);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window.GAME = window.GAME || {});
