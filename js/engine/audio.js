// WebAudio synth: SFX + simple chiptune loop. No audio files.
(function (G) {
  'use strict';

  let ctx = null;
  let masterGain = null;
  let musicGain = null;
  let muted = false;
  let musicTimer = null;
  let musicStep = 0;

  function ensure() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.5;
    masterGain.connect(ctx.destination);
    musicGain = ctx.createGain();
    musicGain.gain.value = 0.18;
    musicGain.connect(masterGain);
  }

  function resume() {
    ensure();
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  function blip(freq, dur, type, gain, dest) {
    if (!ctx || muted) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type || 'square';
    o.frequency.value = freq;
    g.gain.value = gain == null ? 0.3 : gain;
    o.connect(g);
    g.connect(dest || masterGain);
    const t = ctx.currentTime;
    g.gain.setValueAtTime(g.gain.value, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.start(t);
    o.stop(t + dur);
  }

  function slide(f1, f2, dur, type, gain) {
    if (!ctx || muted) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type || 'square';
    const t = ctx.currentTime;
    o.frequency.setValueAtTime(f1, t);
    o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.value = gain == null ? 0.3 : gain;
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(masterGain);
    o.start(t); o.stop(t + dur);
  }

  const sfx = {
    jump() { slide(420, 760, 0.16, 'square', 0.25); },
    coin() { blip(988, 0.06, 'square', 0.25); setTimeout(() => blip(1319, 0.12, 'square', 0.25), 60); },
    stomp() { slide(300, 120, 0.12, 'square', 0.3); },
    bump() { blip(140, 0.08, 'square', 0.3); },
    powerup() {
      const notes = [392, 523, 659, 784, 1047];
      notes.forEach((f, i) => setTimeout(() => blip(f, 0.1, 'square', 0.22), i * 70));
    },
    hurt() { slide(400, 80, 0.4, 'sawtooth', 0.3); },
    die() {
      const seq = [523, 392, 330, 262];
      seq.forEach((f, i) => setTimeout(() => blip(f, 0.2, 'square', 0.3), i * 160));
    },
    flag() {
      const seq = [262, 330, 392, 523, 659, 784];
      seq.forEach((f, i) => setTimeout(() => blip(f, 0.14, 'square', 0.25), i * 110));
    },
    select() { blip(660, 0.05, 'square', 0.2); },
    start() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => blip(f, 0.12, 'square', 0.25), i * 90)); }
  };

  // A short looping bass+lead melody (original, public-domain style scale run).
  const melody = [
    523, 0, 659, 0, 784, 0, 659, 0,
    587, 0, 698, 0, 587, 0, 494, 0,
    523, 0, 659, 0, 784, 0, 1047, 0,
    988, 784, 659, 0, 523, 0, 0, 0
  ];
  const bass = [
    131, 131, 196, 196, 165, 165, 196, 196
  ];

  function startMusic() {
    if (!ctx || muted) return;
    stopMusic();
    musicStep = 0;
    musicTimer = setInterval(() => {
      const note = melody[musicStep % melody.length];
      if (note) blip(note, 0.13, 'square', 0.16);
      if (musicStep % 4 === 0) {
        const b = bass[(Math.floor(musicStep / 4)) % bass.length];
        blip(b, 0.18, 'triangle', 0.22);
      }
      musicStep++;
    }, 140);
  }

  function stopMusic() {
    if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
  }

  function toggleMute() {
    muted = !muted;
    if (muted) { stopMusic(); if (masterGain) masterGain.gain.value = 0; }
    else if (masterGain) masterGain.gain.value = 0.5;
    return muted;
  }

  function isMuted() { return muted; }

  G.Audio = { resume, sfx, startMusic, stopMusic, toggleMute, isMuted };
})(window.GAME = window.GAME || {});
