// WebAudio synth: SFX + a 3-channel chiptune engine (lead / harmony / bass) with a lookahead scheduler.
// All music is generated from original chord progressions and motifs; no audio files.
(function (G) {
  'use strict';

  let ctx = null, masterGain = null, musicGain = null;
  let muted = false;
  let timer = null;
  let nextTime = 0, step = 0, song = null;

  function ensure() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    masterGain = ctx.createGain();
    masterGain.gain.value = muted ? 0 : 0.5;
    masterGain.connect(ctx.destination);
    musicGain = ctx.createGain();
    musicGain.gain.value = 0.2;
    musicGain.connect(masterGain);
  }

  function resume() {
    ensure();
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  function note(freq, dur, type, gain, when, dest, duty) {
    if (!ctx || muted) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type || 'square';
    o.frequency.value = freq;
    const t = when == null ? ctx.currentTime : when;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain == null ? 0.3 : gain, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(dest || masterGain);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  function slide(f1, f2, dur, type, gain) {
    if (!ctx || muted) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type || 'square';
    const t = ctx.currentTime;
    o.frequency.setValueAtTime(f1, t);
    o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(gain == null ? 0.3 : gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(masterGain);
    o.start(t); o.stop(t + dur + 0.02);
  }

  function later(fn, ms) { setTimeout(fn, ms); }

  const sfx = {
    jump() { slide(420, 800, 0.16, 'square', 0.22); },
    coin() { note(988, 0.07, 'square', 0.22); later(function () { note(1319, 0.16, 'square', 0.22); }, 70); },
    stomp() { slide(320, 110, 0.12, 'square', 0.28); },
    bump() { note(140, 0.09, 'square', 0.3); },
    fire() { slide(900, 300, 0.1, 'sawtooth', 0.16); },
    powerup() { [392, 523, 659, 784, 1047].forEach(function (f, i) { later(function () { note(f, 0.1, 'square', 0.2); }, i * 70); }); },
    hurt() { slide(400, 80, 0.4, 'sawtooth', 0.28); },
    die() { [523, 392, 330, 262].forEach(function (f, i) { later(function () { note(f, 0.2, 'square', 0.28); }, i * 160); }); },
    flag() { [262, 330, 392, 523, 659, 784].forEach(function (f, i) { later(function () { note(f, 0.14, 'square', 0.24); }, i * 110); }); },
    select() { note(660, 0.06, 'square', 0.18); },
    start() { [523, 659, 784, 1047].forEach(function (f, i) { later(function () { note(f, 0.12, 'square', 0.22); }, i * 90); }); }
  };

  // ---------------- music generation ----------------
  const SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function hz(midi) { return 440 * Math.pow(2, (midi - 69) / 12); }

  const MAJOR = [0, 2, 4, 5, 7, 9, 11];
  const MINOR = [0, 2, 3, 5, 7, 8, 10];

  // Per-theme: tempo (seconds per 16th), root midi, scale, chord degrees per bar, lead timbre.
  const THEMES = {
    overworld: { tempo: 0.125, root: 60, scale: MAJOR, prog: [0, 4, 5, 3], lead: 'square', seed: 3 },
    cave: { tempo: 0.15, root: 57, scale: MINOR, prog: [0, 5, 3, 4], lead: 'triangle', seed: 5 },
    sky: { tempo: 0.11, root: 64, scale: MAJOR, prog: [0, 3, 4, 0], lead: 'square', seed: 8 },
    dusk: { tempo: 0.14, root: 62, scale: MAJOR, prog: [5, 3, 0, 4], lead: 'square', seed: 12 },
    castle: { tempo: 0.13, root: 55, scale: MINOR, prog: [0, 0, 5, 4], lead: 'sawtooth', seed: 17 },
    map: { tempo: 0.16, root: 65, scale: MAJOR, prog: [0, 3, 0, 4], lead: 'triangle', seed: 21 }
  };

  function degreeNote(th, degree, octave) {
    const n = th.scale.length;
    const oct = Math.floor(degree / n);
    const idx = ((degree % n) + n) % n;
    return th.root + th.scale[idx] + (oct + (octave || 0)) * 12;
  }

  // Build a 4-bar (64 step) song: chord roots, lead melody from chord tones with stepwise motion.
  function compose(name) {
    const th = THEMES[name] || THEMES.overworld;
    const rnd = G.Gfx.rng(th.seed);
    const steps = 64;
    const lead = [], harm = [], bass = [];
    let prev = 4;
    for (let bar = 0; bar < 4; bar++) {
      const chord = th.prog[bar];
      const tones = [chord, chord + 2, chord + 4];
      for (let s = 0; s < 16; s++) {
        const i = bar * 16 + s;
        // bass: root on beats, fifth on offbeats
        if (s % 4 === 0) bass[i] = degreeNote(th, chord, -2);
        else if (s % 8 === 6) bass[i] = degreeNote(th, chord + 4, -2);
        // harmony arpeggio on 8ths
        if (s % 2 === 0) harm[i] = degreeNote(th, tones[(s / 2) % 3], 0);
        // lead rhythm: motif repeats every bar with variation
        const hit = (s % 4 === 0) || (s % 8 === 3) || (s % 8 === 6 && rnd() < 0.6) || (s % 4 === 2 && rnd() < 0.35);
        if (hit) {
          if (s % 8 === 0 || rnd() < 0.4) prev = tones[Math.floor(rnd() * 3)] + 7;
          else prev += rnd() < 0.5 ? 1 : -1;
          prev = Math.max(chord + 2, Math.min(chord + 12, prev));
          lead[i] = degreeNote(th, prev, 0);
        }
      }
    }
    return { th: th, steps: steps, lead: lead, harm: harm, bass: bass };
  }

  function scheduleStep(i, t) {
    const s = song, th = s.th, k = i % s.steps;
    if (s.lead[k]) note(hz(s.lead[k]), th.tempo * 1.7, th.lead, 0.14, t, musicGain);
    if (s.harm[k]) note(hz(s.harm[k]), th.tempo * 1.2, 'square', 0.06, t, musicGain);
    if (s.bass[k]) note(hz(s.bass[k]), th.tempo * 2.4, 'triangle', 0.24, t, musicGain);
    if (k % 4 === 0) note(60, 0.04, 'square', 0.05, t, musicGain); // soft tick for pulse
  }

  function pump() {
    if (!ctx || !song) return;
    while (nextTime < ctx.currentTime + 0.15) {
      scheduleStep(step, nextTime);
      nextTime += song.th.tempo;
      step++;
    }
  }

  function startMusic(name) {
    if (muted) return;
    ensure();
    if (!ctx) return;
    stopMusic();
    song = compose(name || 'overworld');
    step = 0;
    nextTime = ctx.currentTime + 0.1;
    timer = setInterval(pump, 40);
  }

  function stopMusic() {
    if (timer) { clearInterval(timer); timer = null; }
  }

  function toggleMute() {
    muted = !muted;
    if (muted) { stopMusic(); if (masterGain) masterGain.gain.value = 0; }
    else if (masterGain) masterGain.gain.value = 0.5;
    return muted;
  }

  G.Audio = { resume: resume, sfx: sfx, startMusic: startMusic, stopMusic: stopMusic, toggleMute: toggleMute, isMuted: function () { return muted; } };
})(window.GAME = window.GAME || {});
