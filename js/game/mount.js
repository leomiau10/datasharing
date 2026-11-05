// Rolo, an armored rhino beetle the hero can ride (original design).
// Idle: waits (bobbing) to be touched. Ridden: positioned by the player. Runaway: after the rider
// takes a hit it scurries off for a while and can be caught again.
(function (G) {
  'use strict';

  class Mount {
    constructor(x, y) {
      this.w = 20; this.h = 14;
      this.x = x - 2; this.y = y + 2;
      this.vx = 0; this.vy = 0;
      this.state = 'idle'; // 'idle' | 'ridden' | 'runaway'
      this.dir = 1;
      this.t = 0;
      this.grace = 0;
      this.runT = 0;
      this.grounded = false;
      this.remove = false;
    }

    update(level) {
      this.t++;
      if (this.grace > 0) this.grace--;
      if (this.state === 'ridden') return;
      if (this.state === 'runaway') {
        this.vx = this.dir * 1.7;
        if (--this.runT <= 0) { this.state = 'idle'; this.vx = 0; }
      } else {
        this.vx = 0;
      }
      const col = G.Physics.moveAndCollide(this, level, true);
      if (col.left) this.dir = 1;
      if (col.right) this.dir = -1;
      this.grounded = col.down;
      if (this.state === 'runaway' && this.grounded && this.t % 45 === 0) this.vy = -4.5;
      if (this.y > level.pixelH + 40) { this.remove = true; return; }
      const p = level.player;
      if (!p.mount && this.grace === 0 && p.state === 'play' && !level.water && G.Physics.aabb(p, this)) level.mountUp(this);
    }

    render() {
      const S = G.Sprites;
      const img = this.state === 'runaway' ? S.beetle[(this.t >> 3) & 1] : S.beetle[0];
      const bob = this.state === 'idle' ? Math.round(Math.sin(this.t * 0.1)) : 0;
      G.R.sprite(img, this.x + this.w / 2 - img.width / 2, this.y + this.h - img.height + 1 + bob, this.dir < 0);
    }
  }

  G.Mount = Mount;
})(window.GAME = window.GAME || {});
