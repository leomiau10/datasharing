// Persistent progress in localStorage.
(function (G) {
  'use strict';

  const KEY = 'pixel-platformer-save-v1';

  const defaults = {
    cleared: {},   // { levelIndex: true }
    medals: {},    // { levelIndex: bitmask of the 3 medals }
    coins: 0,
    lives: 3,
    mapNode: 0     // current node on the world map
  };

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return Object.assign({}, defaults);
      const data = JSON.parse(raw);
      return Object.assign({}, defaults, data, { cleared: data.cleared || {}, medals: data.medals || {} });
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

  function setNode(n) { state.mapNode = n; save(); }

  function addCoins(n) { state.coins += n; save(); }

  function reset() {
    state = Object.assign({}, defaults, { cleared: {}, medals: {} });
    save();
  }

  G.Save = { get, save, markCleared, isCleared, medals, addMedals, setNode, addCoins, reset };
})(window.GAME = window.GAME || {});
