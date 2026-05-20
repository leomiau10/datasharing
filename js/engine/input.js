// Unified input: keyboard + on-screen touch controls.
(function (G) {
  'use strict';

  const state = {
    left: false, right: false, up: false, down: false,
    jump: false, run: false, start: false
  };
  // Event-level latch: set when a key/button transitions to down. This survives
  // until the next snapshot consumes it, so sub-frame taps are never missed and
  // keyboard auto-repeat does not re-trigger justPressed.
  const latch = {};
  const pressed = {};

  function setDown(k) {
    if (!state[k]) latch[k] = true; // only on transition
    state[k] = true;
  }
  function setUp(k) { state[k] = false; }

  function snapshot() {
    for (const k in state) {
      pressed[k] = !!latch[k];
      latch[k] = false;
    }
  }

  function down(k) { return !!state[k]; }
  function justPressed(k) { return !!pressed[k]; }

  // ----- Keyboard -----
  const keyMap = {
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right',
    ArrowUp: 'up', KeyW: 'up',
    ArrowDown: 'down', KeyS: 'down',
    Space: 'jump', KeyJ: 'jump', KeyZ: 'jump',
    ShiftLeft: 'run', ShiftRight: 'run', KeyK: 'run', KeyX: 'run',
    Enter: 'start'
  };

  window.addEventListener('keydown', (e) => {
    const m = keyMap[e.code];
    if (m) { setDown(m); e.preventDefault(); }
  });
  window.addEventListener('keyup', (e) => {
    const m = keyMap[e.code];
    if (m) { setUp(m); e.preventDefault(); }
  });

  // ----- Touch controls (pointer events on DOM buttons) -----
  // Each control button has data-btn matching a state key.
  // Multiple simultaneous touches supported by tracking pointer ids.
  const activePointers = {}; // pointerId -> btn key

  function bindTouch(root) {
    const buttons = root.querySelectorAll('[data-btn]');
    buttons.forEach((el) => {
      const key = el.getAttribute('data-btn');

      const press = (e) => {
        if (e.pointerId != null) activePointers[e.pointerId] = key;
        setDown(key);
        el.classList.add('held');
        if (e.cancelable) e.preventDefault();
        G.Audio && G.Audio.resume();
      };
      const release = (e) => {
        if (e.pointerId != null) delete activePointers[e.pointerId];
        setUp(key);
        el.classList.remove('held');
        if (e.cancelable) e.preventDefault();
      };

      el.addEventListener('pointerdown', press);
      el.addEventListener('pointerup', release);
      el.addEventListener('pointercancel', release);
      el.addEventListener('pointerleave', (e) => {
        // If a finger slides off the button, release it.
        if (activePointers[e.pointerId] === key) release(e);
      });
      // Prevent context menu / text selection on long press.
      el.addEventListener('contextmenu', (e) => e.preventDefault());
    });
  }

  G.Input = { state, down, justPressed, snapshot, bindTouch, keyDown: setDown, keyUp: setUp };
})(window.GAME = window.GAME || {});
