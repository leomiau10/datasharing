// Unified input: keyboard + on-screen touch controls.
(function (G) {
  'use strict';

  const state = {
    left: false, right: false, up: false, down: false,
    jump: false, run: false, spin: false, start: false
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
    KeyC: 'spin', KeyL: 'spin',
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

  // ----- Sliding d-pad: one touch zone; direction follows the finger as it drags -----
  function bindDpad(zone) {
    const DEAD = 0.22;
    let activeId = null;

    function apply(e) {
      const r = zone.getBoundingClientRect();
      const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
      const ny = ((e.clientY - r.top) / r.height) * 2 - 1;
      const want = {
        left: nx < -DEAD,
        right: nx > DEAD,
        up: ny < -DEAD * 1.4,
        down: ny > DEAD * 1.4
      };
      for (const k in want) {
        if (want[k]) setDown(k); else setUp(k);
        const el = zone.querySelector('[data-dir="' + k + '"]');
        if (el) el.classList.toggle('held', want[k]);
      }
    }
    function end() {
      activeId = null;
      ['left', 'right', 'up', 'down'].forEach(function (k) {
        setUp(k);
        const el = zone.querySelector('[data-dir="' + k + '"]');
        if (el) el.classList.remove('held');
      });
    }

    zone.addEventListener('pointerdown', function (e) {
      activeId = e.pointerId;
      try { zone.setPointerCapture(e.pointerId); } catch (err) {}
      apply(e);
      G.Audio && G.Audio.resume();
      if (e.cancelable) e.preventDefault();
    });
    zone.addEventListener('pointermove', function (e) {
      if (e.pointerId === activeId) { apply(e); if (e.cancelable) e.preventDefault(); }
    });
    zone.addEventListener('pointerup', function (e) { if (e.pointerId === activeId) end(); });
    zone.addEventListener('pointercancel', function (e) { if (e.pointerId === activeId) end(); });
    zone.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  }

  G.Input = { state, down, justPressed, snapshot, bindTouch, bindDpad, keyDown: setDown, keyUp: setUp };
})(window.GAME = window.GAME || {});
