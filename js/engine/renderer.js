// Canvas renderer: fixed height, width adapts to the screen aspect ratio (no black bars on phones).
(function (G) {
  'use strict';

  const BASE_H = 216;
  const MIN_W = 288;
  const MAX_W = 480;

  let canvas, ctx;
  const cam = { x: 0, y: 0 };

  const R = {
    BASE_W: 384, BASE_H: BASE_H, cam: cam,
    init: init, resize: resize, setCamera: setCamera, clear: clear, clearTransparent: clearTransparent,
    rect: rect, rectS: rectS, sprite: sprite, spriteS: spriteS, spriteScaled: spriteScaled, getCtx: getCtx
  };

  function init(canvasEl) {
    canvas = canvasEl;
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', function () { setTimeout(resize, 200); });
  }

  function resize() {
    const vw = window.innerWidth, vh = window.innerHeight;
    let w = Math.round(BASE_H * (vw / vh));
    w = Math.max(MIN_W, Math.min(MAX_W, w));
    if (w % 2) w++;
    R.BASE_W = w;
    if (canvas.width !== w || canvas.height !== BASE_H) {
      canvas.width = w;
      canvas.height = BASE_H;
      ctx.imageSmoothingEnabled = false;
    }
    const scale = Math.min(vw / w, vh / BASE_H);
    const dpr = window.devicePixelRatio || 1;
    const cssW = Math.round(w * scale * dpr) / dpr;
    const cssH = Math.round(BASE_H * scale * dpr) / dpr;
    // #screen holds the 3D canvas underneath and this 2D canvas (HUD/overlay) on top
    const screen = document.getElementById('screen');
    if (screen) { screen.style.width = cssW + 'px'; screen.style.height = cssH + 'px'; }
    canvas.style.width = cssW + 'px';
    canvas.style.height = cssH + 'px';
    if (G.R3) G.R3.resize(cssW, cssH);
  }

  function clearTransparent() { ctx.clearRect(0, 0, R.BASE_W, BASE_H); }

  function setCamera(x, y) { cam.x = Math.round(x); cam.y = Math.round(y); }

  function clear(color) {
    ctx.fillStyle = color || '#5c94fc';
    ctx.fillRect(0, 0, R.BASE_W, BASE_H);
  }

  function rect(x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x - cam.x), Math.round(y - cam.y), w, h);
  }
  function rectS(x, y, w, h, color) { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); }

  function blit(img, sx, sy, flipX, flipY) {
    if (flipX || flipY) {
      ctx.save();
      ctx.translate(sx + (flipX ? img.width : 0), sy + (flipY ? img.height : 0));
      ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);
      ctx.drawImage(img, 0, 0);
      ctx.restore();
    } else {
      ctx.drawImage(img, sx, sy);
    }
  }

  function sprite(img, x, y, flipX, flipY) { blit(img, Math.round(x - cam.x), Math.round(y - cam.y), flipX, flipY); }
  function spriteS(img, x, y, flipX, flipY) { blit(img, Math.round(x), Math.round(y), flipX, flipY); }
  function spriteScaled(img, x, y, w, h) { ctx.drawImage(img, Math.round(x - cam.x), Math.round(y - cam.y), w, h); }
  function getCtx() { return ctx; }

  G.R = R;
})(window.GAME = window.GAME || {});
