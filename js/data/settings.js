// Player settings (difficulty, graphics quality, volumes), persisted in localStorage.
(function (G) {
  'use strict';

  const KEY = 'pip-settings-v1';
  const defaults = { difficulty: 'normal', graphics: '3d-high', music: 7, sfx: 8 };

  let state = Object.assign({}, defaults);
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = Object.assign({}, defaults, JSON.parse(raw));
  } catch (e) { /* storage unavailable: keep defaults */ }

  // Menu rows: value lists for choices, [min, max] for sliders.
  const ITEMS = [
    { key: 'difficulty', label: 'DIFICULTAD', values: ['normal', 'easy'],
      names: { normal: 'NORMAL', easy: 'FACIL - SIN PERDER VIDAS' } },
    { key: 'graphics', label: 'GRAFICOS', values: ['3d-high', '3d-low', '2d'],
      names: { '3d-high': '3D ALTA', '3d-low': '3D BAJA - MAS FLUIDO', '2d': '2D CLASICO' } },
    { key: 'music', label: 'MUSICA', range: [0, 10] },
    { key: 'sfx', label: 'EFECTOS', range: [0, 10] },
    { key: 'back', label: 'VOLVER' }
  ];

  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ } }

  // Push the current values into the audio mixer and the 3D renderer.
  function apply() {
    if (G.Audio && G.Audio.setVolumes) G.Audio.setVolumes(state.music, state.sfx);
    if (G.R3 && G.R3.setQuality) G.R3.setQuality(state.graphics);
  }

  function get() { return state; }
  function set(k, v) { state[k] = v; save(); apply(); }

  // Step a row left (-1) or right (+1).
  function step(item, dir) {
    if (item.values) {
      const i = item.values.indexOf(state[item.key]);
      set(item.key, item.values[(i + dir + item.values.length) % item.values.length]);
    } else if (item.range) {
      set(item.key, Math.max(item.range[0], Math.min(item.range[1], state[item.key] + dir)));
    }
  }

  function easy() { return state.difficulty === 'easy'; }
  function use3D() { return state.graphics !== '2d'; }

  G.Settings = { ITEMS: ITEMS, get: get, set: set, step: step, apply: apply, easy: easy, use3D: use3D };
})(window.GAME = window.GAME || {});
