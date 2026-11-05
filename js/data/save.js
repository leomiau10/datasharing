// Persistent progress in localStorage.
(function (G) {
  'use strict';

  const KEY = 'pixel-platformer-save-v1';

  const defaults = {
    cleared: {},   // { levelIndex: true }
    medals: {},    // { levelIndex: bitmask of the 3 medals }
    secrets: {},   // { levelIndex: true } once its secret exit was taken
    coins: 0,
    lives: 5,
    mapNode: 0,    // current node on the world map
    mapWorld: 0    // which world map the hero is on
  };

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return Object.assign({}, defaults);
      const data = JSON.parse(raw);
      return Object.assign({}, defaults, data, { cleared: data.cleared || {}, medals: data.medals || {}, secrets: data.secrets || {} });
    } catch (e) {
      return Object.assign({}, defaults);
    }
  }

  let state = load();

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }

  function get() { return state; }

  function markCleared(index) {
    state.cleared[index] = true;
    save();
  }

  function isCleared(index) { return !!state.cleared[index]; }

  function medals(index) { return state.medals[index] || 0; }
  function addMedals(index, mask) { state.medals[index] = (state.medals[index] || 0) | mask; save(); }

  function markSecret(index) { state.secrets[index] = true; save(); }
  function isSecret(index) { return !!state.secrets[index]; }

  // A level is open once its rule is met: a secret exit, a specific level, or (default) the previous level.
  function isOpen(index) {
    const def = G.Levels && G.Levels[index];
    if (index === 0) return true;
    if (def && def.unlock) {
      if (def.unlock.secret != null) return isSecret(def.unlock.secret);
      if (def.unlock.level != null) return isCleared(def.unlock.level);
    }
    return isCleared(index - 1);
  }

  function setNode(n) { state.mapNode = n; save(); }
  function setWorld(w, n) { state.mapWorld = w; state.mapNode = n; save(); }

  function addCoins(n) { state.coins += n; save(); }

  function reset() {
    state = Object.assign({}, defaults, { cleared: {}, medals: {}, secrets: {} });
    save();
  }

  G.Save = { get, save, markCleared, isCleared, medals, addMedals, markSecret, isSecret, isOpen, setNode, setWorld, addCoins, reset };
})(window.GAME = window.GAME || {});
