// SI-assisted: generated with Claude Code (Anthropic); reviewed and edited by Team Thrusters.
// transitions.js — TransitionManager. Every scene change goes through cover() (old scene)
// and reveal() (new scene). Types:
//   'dither'   pixel/dither sweep (NEXT UP screens and between stages)
//   'iris'     circle that closes / opens (entering a mini-game)
//   'stars'    golden pixel stars burst from the centre (before the final dashboard)
//   'fade'     simple fade (also used for EVERYTHING when "Reduce motion & flashes" is on)
// The liftoff (12.5 → 13) is played by LaunchReadyScene itself and then uses 'fade'.
import { state } from './state.js';
import { W, H, C } from './ui/theme.js';

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

export function effective(type) {
  if (state.settings.reduceMotion) return 'fade';
  return type || 'fade';
}

function layer(scene) {
  const g = scene.add.graphics();
  g.setDepth(10000); g.setScrollFactor && g.setScrollFactor(0);
  return g;
}

// cover the old scene, then call done()
export function cover(scene, type, done) {
  type = effective(type);
  const dur = 380;
  if (type === 'fade' || !scene.add.graphics) {
    try { scene.cameras.main.fadeOut(260, 11, 15, 38); } catch (e) { /* ignore */ }
    scene.time.delayedCall(280, done);
    return;
  }
  const g = layer(scene);
  if (type === 'dither') {
    const cell = 40, cols = Math.ceil(W / cell), rows = Math.ceil(H / cell);
    let t = 0;
    const ev = scene.time.addEvent({ delay: dur / 16, repeat: 16, callback: () => {
      g.fillStyle(C.space, 1);
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        const b = BAYER[(y % 4) * 4 + (x % 4)];
        // sweep left → right: the threshold grows with time and with x
        if (b + (x / cols) * 6 < t * 1.4) g.fillRect(x * cell, y * cell, cell, cell);
      }
      t++;
      if (t > 16) { ev.remove(); done(); }
    } });
    return;
  }
  if (type === 'iris') {
    const max = Math.hypot(W, H) / 2 + 20;
    const o = { r: max };
    scene.tweens.add({ targets: o, r: 0, duration: 420, ease: 'Quad.easeIn',
      onUpdate: () => { g.clear(); g.lineStyle(2400, C.space, 1); g.strokeCircle(W / 2, H / 2, o.r + 1200); },
      onComplete: () => { g.clear(); g.fillStyle(C.space, 1); g.fillRect(0, 0, W, H); done(); } });
    return;
  }
  if (type === 'stars') {
    const stars = [];
    for (let i = 0; i < 90; i++) {
      const a = (i / 90) * Math.PI * 2 + (i % 7) * 0.1, sp = 0.4 + ((i * 37) % 100) / 100;
      stars.push({ a, sp, s: 6 + ((i * 13) % 4) * 4 });
    }
    const o = { k: 0 };
    scene.tweens.add({ targets: o, k: 1, duration: 900, ease: 'Cubic.easeOut',
      onUpdate: () => {
        g.clear();
        g.fillStyle(C.space, o.k * 0.85); g.fillRect(0, 0, W, H);
        for (const st of stars) {
          const d = o.k * 900 * st.sp, x = W / 2 + Math.cos(st.a) * d, y = H / 2 + Math.sin(st.a) * d, s = st.s * (0.5 + o.k * 2.5);
          g.fillStyle(st.sp > 0.9 ? 0xfff2a8 : C.gold, 1);
          g.fillRect(x - s / 2, y - s / 6, s, s / 3); g.fillRect(x - s / 6, y - s / 2, s / 3, s);   // pixel "plus" star
        }
      },
      onComplete: () => { g.clear(); g.fillStyle(C.gold, 1); g.fillRect(0, 0, W, H); done(); } });
    return;
  }
  done();
}

// uncover the new scene (called at the end of every create())
export function reveal(scene, type) {
  type = effective(type);
  try { scene.cameras.main.resetFX && scene.cameras.main.resetFX(); } catch (e) { /* ignore */ }
  if (type === 'fade' || !type) { try { scene.cameras.main.fadeIn(280, 11, 15, 38); } catch (e) { /* ignore */ } return; }
  const g = layer(scene);
  if (type === 'dither') {
    const cell = 40, cols = Math.ceil(W / cell), rows = Math.ceil(H / cell);
    let t = 16;
    const draw = () => {
      g.clear(); g.fillStyle(C.space, 1);
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        const b = BAYER[(y % 4) * 4 + (x % 4)];
        if (b + (x / cols) * 6 < t * 1.4) g.fillRect(x * cell, y * cell, cell, cell);
      }
    };
    draw();
    const ev = scene.time.addEvent({ delay: 22, repeat: 16, callback: () => { t--; draw(); if (t <= 0) { ev.remove(); g.destroy(); } } });
    return;
  }
  if (type === 'iris') {
    const max = Math.hypot(W, H) / 2 + 20;
    const o = { r: 0 };
    g.fillStyle(C.space, 1); g.fillRect(0, 0, W, H);
    scene.tweens.add({ targets: o, r: max, duration: 520, ease: 'Quad.easeOut',
      onUpdate: () => { g.clear(); g.lineStyle(2400, C.space, 1); g.strokeCircle(W / 2, H / 2, o.r + 1200); },
      onComplete: () => g.destroy() });
    return;
  }
  if (type === 'stars') {
    const o = { a: 1 };
    g.fillStyle(C.gold, 1); g.fillRect(0, 0, W, H);
    scene.tweens.add({ targets: o, a: 0, duration: 650, onUpdate: () => { g.clear(); g.fillStyle(C.gold, o.a); g.fillRect(0, 0, W, H); }, onComplete: () => g.destroy() });
    return;
  }
  g.destroy();
}
