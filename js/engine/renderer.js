// Canvas renderer with integer scaling and a simple camera.
(function (G) {
  'use strict';

  // Base internal resolution (world pixels visible). 16:9-ish, good for phone landscape.
  const BASE_W = 384;
  const BASE_H = 216;

  let canvas, ctx;
  let scale = 1;
  const cam = { x: 0, y: 0 };

  function init(canvasEl) {
    canvas = canvasEl;
    ctx = canvas.getContext('2d');
    canvas.width = BASE_W;
    canvas.height = BASE_H;
    ctx.imageSmoothingEnabled = false;
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', () => setTimeout(resize, 200));
  }

  function resize() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    // Fit while preserving aspect ratio; allow fractional CSS scale (pixelated keeps it crisp).
    scale = Math.min(vw / BASE_W, vh / BASE_H);
    const cssW = Math.round(BASE_W * scale);
    const cssH = Math.round(BASE_H * scale);
    canvas.style.width = cssW + 'px';
    canvas.style.height = cssH + 'px';
  }

  function setCamera(x, y) {
    cam.x = Math.round(x);
    cam.y = Math.round(y);
  }

  function clear(color) {
    ctx.fillStyle = color || '#5c94fc';
    ctx.fillRect(0, 0, BASE_W, BASE_H);
  }

  // World-space rectangle.
  function rect(x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x - cam.x), Math.round(y - cam.y), w, h);
  }

  // Screen-space rectangle (UI).
  function rectS(x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  }

  // Draw a baked sprite canvas at world coords, optional horizontal flip.
  function sprite(img, x, y, flip) {
    const sx = Math.round(x - cam.x);
    const sy = Math.round(y - cam.y);
    if (flip) {
      ctx.save();
      ctx.translate(sx + img.width, sy);
      ctx.scale(-1, 1);
      ctx.drawImage(img, 0, 0);
      ctx.restore();
    } else {
      ctx.drawImage(img, sx, sy);
    }
  }

  // Screen-space sprite (UI/HUD).
  function spriteS(img, x, y, flip) {
    if (flip) {
      ctx.save();
      ctx.translate(x + img.width, y);
      ctx.scale(-1, 1);
      ctx.drawImage(img, 0, 0);
      ctx.restore();
    } else {
      ctx.drawImage(img, x, y);
    }
  }

  function getCtx() { return ctx; }

  G.R = {
    BASE_W, BASE_H, init, resize, setCamera, clear,
    rect, rectS, sprite, spriteS, getCtx, cam
  };
})(window.GAME = window.GAME || {});
