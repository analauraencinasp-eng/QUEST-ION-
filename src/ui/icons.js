// icons.js — small pixel icons drawn in code (water drop, gamepad, lock, camera…), used on cards.
import { C } from './theme.js';

export function pixelIcon(scene, kind, x, y, size = 64, depth = 16) {
  const g = scene.add.graphics().setDepth(depth);
  const u = size / 16;                                    // 16x16 grid
  const r = (cx, cy, w, h, col) => { g.fillStyle(col, 1); g.fillRect(x + cx * u, y + cy * u, w * u, h * u); };
  switch (kind) {
    case 'water':
      r(7, 1, 2, 2, 0x3fa9f5); r(6, 3, 4, 2, 0x3fa9f5); r(5, 5, 6, 3, 0x3fa9f5); r(5, 8, 6, 2, 0x2b7fd1); r(6, 10, 4, 1, 0x2b7fd1);
      r(6, 5, 1, 2, 0xbfe6ff); r(2, 11, 12, 3, 0xa9542b); r(3, 12, 1, 1, 0x6b2f16); r(8, 12, 1, 1, 0x6b2f16); r(11, 13, 1, 1, 0x6b2f16); break;
    case 'volcano':
      r(6, 3, 4, 2, 0xff7a45); r(5, 5, 6, 2, 0x8a4b2a); r(3, 7, 10, 4, 0x7a3f22); r(1, 11, 14, 3, 0x5e3018); r(7, 1, 2, 2, 0xffb347); break;
    case 'sun':
      r(5, 5, 6, 6, 0xffc83d); r(7, 1, 2, 3, 0xffc83d); r(7, 12, 2, 3, 0xffc83d); r(1, 7, 3, 2, 0xffc83d); r(12, 7, 3, 2, 0xffc83d); r(4, 12, 8, 2, 0x9b6a3a); break;
    case 'gamepad':
      r(2, 5, 12, 6, 0xffffff); r(3, 11, 3, 2, 0xffffff); r(10, 11, 3, 2, 0xffffff); r(4, 6, 1, 3, 0x1a1f3a); r(3, 7, 3, 1, 0x1a1f3a); r(10, 6, 1, 1, C.red); r(11, 8, 1, 1, C.green); break;
    case 'team':
      for (let i = 0; i < 4; i++) { r(1 + i * 4, 4, 2, 2, 0xffffff); r(0 + i * 4, 6, 4, 5, [0xe0662a, 0x2f6fd8, 0x3fa65a, 0x8a4fc4][i]); } break;
    case 'lock':
      r(5, 2, 6, 1, 0xd0d4dc); r(4, 3, 1, 4, 0xd0d4dc); r(11, 3, 1, 4, 0xd0d4dc); r(3, 7, 10, 7, C.gold); r(7, 9, 2, 3, 0x1a1f3a); break;
    case 'camera':
      r(3, 4, 10, 6, 0xd0d4dc); r(4, 5, 3, 3, 0x1a1f3a); r(9, 5, 3, 3, 0x1a1f3a); r(7, 10, 2, 4, 0x8a93a8); break;
    case 'rover':
      r(2, 5, 12, 4, 0xd0d4dc); r(1, 4, 14, 1, 0x2f6fd8); r(11, 1, 1, 4, 0x8a93a8); r(2, 10, 3, 3, 0x3b4659); r(7, 10, 3, 3, 0x3b4659); r(12, 10, 3, 3, 0x3b4659); break;
    case 'lens':
      r(4, 2, 7, 7, 0xd0d4dc); r(5, 3, 5, 5, 0x56c8e8); r(10, 9, 2, 2, 0x8a93a8); r(12, 11, 2, 3, 0x8a93a8); break;
    case 'grinder':
      r(4, 2, 8, 6, 0x8a93a8); r(5, 8, 6, 2, 0xd0d4dc); r(3, 10, 10, 3, 0xa9542b); r(6, 10, 4, 1, 0xffd27a); break;
    case 'spectro':
      r(3, 3, 10, 8, 0xd0d4dc); r(4, 4, 8, 5, 0x0b2a5c); r(5, 7, 1, 1, C.green); r(6, 6, 1, 2, C.green); r(7, 5, 1, 3, C.gold); r(8, 6, 1, 2, C.green); r(9, 7, 1, 1, C.green); r(6, 11, 4, 3, 0x8a93a8); break;
    case 'antenna':
      r(3, 2, 10, 2, 0xd0d4dc); r(4, 4, 8, 2, 0xd0d4dc); r(7, 6, 2, 6, 0x8a93a8); r(4, 12, 8, 2, 0x5d6680); r(12, 1, 2, 1, C.cyan); break;
    case 'twin':
      r(1, 5, 6, 4, 0xd0d4dc); r(9, 5, 6, 4, 0xd0d4dc); r(1, 10, 2, 2, 0x3b4659); r(5, 10, 2, 2, 0x3b4659); r(9, 10, 2, 2, 0x3b4659); r(13, 10, 2, 2, 0x3b4659); break;
    case 'berries':
      r(1, 10, 14, 4, 0xa9542b); for (const [a, b] of [[3, 8], [6, 9], [9, 7], [12, 9], [5, 6], [10, 11]]) r(a, b, 2, 2, 0x5d6680); break;
    case 'layers':
      r(1, 4, 14, 2, 0xd9a066); r(1, 6, 14, 2, 0xb5743d); r(1, 8, 14, 2, 0xd9a066); r(1, 10, 14, 2, 0x9b5a2a); r(1, 12, 14, 2, 0xc98a4e); break;
    case 'silica':
      r(1, 10, 14, 4, 0x8a5a3a); r(4, 8, 8, 3, 0xf4f1e6); r(6, 7, 4, 1, 0xf4f1e6); r(2, 12, 3, 1, 0x3b2a1a); break;
    case 'calendar':
      r(2, 3, 12, 11, 0xf4f1e6); r(2, 3, 12, 3, C.red); r(4, 8, 2, 2, 0x1a1f3a); r(7, 8, 2, 2, 0x1a1f3a); r(10, 8, 2, 2, 0x1a1f3a); r(4, 11, 2, 2, 0x1a1f3a); break;
    case 'planet':
      r(4, 3, 8, 10, 0xc1440e); r(3, 5, 10, 6, 0xc1440e); r(5, 5, 2, 2, 0x8e2f0a); r(9, 9, 2, 2, 0x8e2f0a); r(5, 3, 6, 1, 0xf4f1e6); break;
    case 'build':
      r(4, 2, 8, 3, 0xf4f1e6); r(3, 5, 10, 8, 0xe0662a); r(6, 7, 4, 3, 0xf4f1e6); break;
    case 'instruments':
      r(2, 3, 12, 8, 0xd0d4dc); r(3, 4, 4, 4, 0x1a1f3a); r(9, 4, 4, 4, 0x1a1f3a); r(7, 11, 2, 3, 0x8a93a8); break;
    case 'orbit':
      g.lineStyle(u, 0x56c8e8, 1); g.strokeRect(x + 2 * u, y + 4 * u, 12 * u, 8 * u); r(7, 7, 2, 2, C.gold); r(12, 3, 2, 2, C.red); break;
    case 'launch':
      r(7, 1, 2, 2, C.red); r(6, 3, 4, 8, 0xf4f1e6); r(5, 9, 1, 3, C.red); r(10, 9, 1, 3, C.red); r(7, 11, 2, 3, 0xffb347); break;
    case 'rock':
      r(3, 6, 10, 7, 0x8a5a3a); r(5, 4, 6, 2, 0x8a5a3a); r(5, 7, 2, 2, 0x5e3018); r(9, 9, 2, 2, 0x5e3018); break;
    case 'data':
      r(3, 3, 10, 3, 0xd0d4dc); r(7, 6, 2, 6, 0x8a93a8); r(5, 12, 6, 2, 0x5d6680); r(12, 1, 1, 1, C.cyan); r(13, 2, 1, 1, C.cyan); break;
    default:
      r(3, 3, 10, 10, 0x8a93a8);
  }
  return g;
}
