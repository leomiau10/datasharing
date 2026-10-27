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

  // ----- Floating stick: touch anywhere in the left zone; that point becomes the center -----
  function bindStick(zone, base, knob) {
    const RADIUS = 46;          // max knob travel (css px)
    const DX = 14, DY = 26;     // thresholds: horizontal is light, vertical needs a firmer push
    let id = null, ox = 0, oy = 0;
    const dirs = ['left', 'right', 'up', 'down'];

    function placeBase(x, y) {
      const r = zone.getBoundingClientRect();
      base.style.left = (x - r.left) + 'px';
      base.style.top = (y - r.top) + 'px';
    }
    function apply(x, y) {
      let dx = x - ox, dy = y - oy;
      const want = {
        left: dx < -DX,
        right: dx > DX,
        up: dy < -DY && Math.abs(dy) > Math.abs(dx) * 0.7,
        down: dy > DY && Math.abs(dy) > Math.abs(dx) * 0.7
      };
      dirs.forEach((k) => { if (want[k]) setDown(k); else setUp(k); });
      const len = Math.hypot(dx, dy);
      if (len > RADIUS) { dx = dx / len * RADIUS; dy = dy / len * RADIUS; }
      knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
    }
    function end() {
      id = null;
      dirs.forEach(setUp);
      knob.style.transform = 'translate(0px,0px)';
      base.classList.remove('active');
      base.style.left = ''; base.style.top = '';
    }
    zone.addEventListener('pointerdown', (e) => {
      if (id !== null) return;
      id = e.pointerId;
      try { zone.setPointerCapture(id); } catch (err) {}
      ox = e.clientX; oy = e.clientY;
      placeBase(ox, oy);
      base.classList.add('active');
      apply(ox, oy);
      G.Audio && G.Audio.resume();
      if (e.cancelable) e.preventDefault();
    });
    zone.addEventListener('pointermove', (e) => {
      if (e.pointerId !== id) return;
      // drag the center along if the thumb wanders far, so direction changes stay quick
      const dx = e.clientX - ox, dy = e.clientY - oy, len = Math.hypot(dx, dy);
      if (len > RADIUS * 1.6) { ox = e.clientX - dx / len * RADIUS * 1.6; oy = e.clientY - dy / len * RADIUS * 1.6; placeBase(ox, oy); }
      apply(e.clientX, e.clientY);
      if (e.cancelable) e.preventDefault();
    });
    zone.addEventListener('pointerup', (e) => { if (e.pointerId === id) end(); });
    zone.addEventListener('pointercancel', (e) => { if (e.pointerId === id) end(); });
  }

  // ----- Action zone: buttons react to where each thumb is, so you can roll between them -----
  function bindActions(zone) {
    const btns = Array.prototype.slice.call(zone.querySelectorAll('[data-act]'));
    const pointers = new Map(); // pointerId -> {x, y}
    function hitsFor(x, y) {
      const hits = [];
      let best = null, bestD = Infinity;
      for (const b of btns) {
        const r = b.getBoundingClientRect();
        const d = Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2)) / (r.width / 2);
        if (d < 1.12) hits.push(b);
        if (d < bestD) { bestD = d; best = b; }
      }
      if (!hits.length && best && bestD < 1.9) hits.push(best);
      return hits;
    }
    function refresh() {
      const on = new Set();
      pointers.forEach((p) => hitsFor(p.x, p.y).forEach((b) => on.add(b)));
      for (const b of btns) {
        const k = b.getAttribute('data-act');
        if (on.has(b)) setDown(k); else setUp(k);
        b.classList.toggle('held', on.has(b));
      }
    }
    zone.addEventListener('pointerdown', (e) => {
      try { zone.setPointerCapture(e.pointerId); } catch (err) {}
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      refresh();
      G.Audio && G.Audio.resume();
      if (e.cancelable) e.preventDefault();
    });
    zone.addEventListener('pointermove', (e) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      refresh();
      if (e.cancelable) e.preventDefault();
    });
    const up = (e) => { if (pointers.delete(e.pointerId)) refresh(); };
    zone.addEventListener('pointerup', up);
    zone.addEventListener('pointercancel', up);
  }

  // Auto-run: holding a direction for a moment switches to running without pressing B.
  const settings = { autoRun: true };

  G.Input = { state, down, justPressed, snapshot, bindTouch, bindStick, bindActions, settings, keyDown: setDown, keyUp: setUp };
})(window.GAME = window.GAME || {});
