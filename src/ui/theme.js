// theme.js — colours, fonts and text sizes copied from the Figma "Low-fi screens" page.
// Every scene draws with these tokens so the whole game keeps the Figma look.
import { state } from '../state.js';

export const W = 1280;
export const H = 720;

export const C = {
  space: 0x0b0f26,        // page background (deep navy)
  navy: 0x141a3a,         // pixel button / panel fill
  navy2: 0x10173a,        // dark card fill
  ink: 0x1a1f3a,          // borders on light surfaces
  white: 0xffffff,
  gold: 0xe69f00,         // primary button, highlights, title
  goldDark: 0x7a5200,
  blueCard: 0x1d3a6e,     // context cards
  blueBorder: 0x5aa0e6,
  cyan: 0x56c8e8,         // "NEXT UP", links, subtitles
  bubble: 0xe8eef2,       // mentor speech bubble
  portrait: 0xbfd6e6,     // mentor portrait background
  green: 0x2fbf71,        // done / OK / MATCH
  red: 0xd55e00,          // errors, MISSED, hull hit (colour-blind safe vermillion)
  yellow: 0xf0e442,       // selection border
  grey: 0x5d6680,
  dim: 0x000000,
  hangar: 0x3b4659
};

// same colours as CSS strings (for Phaser text)
export const S = {
  white: '#ffffff', gold: '#e69f00', cyan: '#56c8e8', ink: '#1a1f3a', mentor: '#a63711',
  text: '#f4f1e6', muted: '#a9b3cf', green: '#2fbf71', red: '#ff7a45', yellow: '#f0e442', blue: '#5aa0e6', navy: '#141a3a'
};

export const TITLE_FONT = '"Press Start 2P", monospace';
export const BODY_FONT = '"VT323", monospace';

// Typography tokens. Every text in the game goes through fs(), so readability is fixed HERE, once:
//   • body  (VT323): the pixel body font reads small, so sizes are boosted and never go below 22 px.
//   • title (Press Start 2P): labels and headings never go below 11 px.
// Then Text size S / M / L from Settings scales everything; FLOOR keeps even S comfortably readable.
export const TYPE = {
  body: { boost: 1.12, min: 22, floor: 20 },
  title: { boost: 1.08, min: 11, floor: 10 }
};
const SCALE = { S: 0.9, M: 1, L: 1.15 };
export function fs(px, font = 'body') {
  const t = TYPE[font] || TYPE.body;
  const base = Math.max(t.min, px * t.boost);
  return Math.max(t.floor, Math.round(base * (SCALE[state.settings.textSize] || 1)));
}
// smallest size fit() may shrink a text to (so shrinking never makes text unreadable)
export function minSize(font = 'body') { return (TYPE[font] || TYPE.body).floor; }
export function textScale() { return SCALE[state.settings.textSize] || 1; }

export function hex(n) { return '#' + n.toString(16).padStart(6, '0'); }
