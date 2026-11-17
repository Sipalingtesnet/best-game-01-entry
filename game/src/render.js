// Drawing only: the world's state and the current screen in, pixels out. The 1280x720 playfield
// is scaled to fit the window and centred, the margin filled with the backdrop colour. Neon
// glows, drifting embers, the HUD and the panels are all drawn here. Text that holds a number is
// rebuilt only when the number changes, so a frame allocates nothing.
import { COMBO, ENEMY, FIELD, FONT, LIVES, PALETTE, PLAYER } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const PANEL = { width: 620, top: 130, line: 34, bottom: 70 };
const LIFE_SIZE = 20;
const LIFE_GAP = 8;

function cachedLabel(prefix) {
  let value = -1;
  let text = '';
  return function label(next) {
    if (next !== value) {
      value = next;
      text = prefix + next;
    }
    return text;
  };
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const scoreLabel = cachedLabel('Score ');
  const bestLabel = cachedLabel('Best ');
  const waveLabel = cachedLabel('Wave ');
  const comboLabel = cachedLabel('x');
  const finalLabel = cachedLabel('Score ');function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  const fonts = new Map();
  function text(value, x, y, size, color, align, baseline) {
    if (!fonts.has(size)) fonts.set(size, `${size}px ${FONT}`);
    context.font = fonts.get(size);
    context.fillStyle = color;
    context.textAlign = align || 'left';
    context.textBaseline = baseline || 'alphabetic';
    context.fillText(value, x, y);
  }

  function drawBackground(state) {
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.strokeStyle = PALETTE.grid;
    context.lineWidth = 1;
    const step = 64;
    context.beginPath();
    for (let x = step; x < FIELD.width; x += step) {
      context.moveTo(x, 0);
      context.lineTo(x, FIELD.height);
    }
    for (let y = step; y < FIELD.height; y += step) {
      context.moveTo(0, y);
      context.lineTo(FIELD.width, y);
    }
    context.stroke();
    const embers = state.particles.particles;
    for (let i = 0; i < embers.length; i += 1) {
      const p = embers[i];
      if (!p.active || p.color !== '#3a4a6e') continue;
      const alpha = Math.max(0, p.life / p.maxLife);
      context.fillStyle = 'rgba(58,74,110,' + alpha * 0.6 + ')';
      context.beginPath();
      context.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      context.fill();
    }
  }function drawPickups(state) {
    for (let i = 0; i < state.pickups.length; i += 1) {
      const p = state.pickups[i];
      context.fillStyle = p.color;
      context.beginPath();
      context.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = '#ffffff';
      context.lineWidth = 2;
      context.stroke();
      context.fillStyle = '#0b0714';
      context.font = 'bold 10px ' + FONT;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      let label = 'H';
      if (p.kind === 'shield') label = 'S';
      if (p.kind === 'rapid') label = 'R';
      if (p.kind === 'bomb') label = 'B';
      context.fillText(label, p.x, p.y);
    }
  }

  function drawOrbs(state) {
    for (let i = 0; i < state.orbs.length; i += 1) {
      const o = state.orbs[i];
      context.fillStyle = '#ff7a3c';
      context.beginPath();
      context.arc(o.x, o.y, o.radius, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = 'rgba(255,122,60,0.3)';
      context.beginPath();
      context.arc(o.x, o.y, o.radius + 4, 0, Math.PI * 2);
      context.fill();
    }
  }

  function drawBullets(state) {
    for (let i = 0; i < state.bullets.length; i += 1) {
      const b = state.bullets[i];
      context.fillStyle = PALETTE.bullet;
      context.beginPath();
      context.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = 'rgba(125,249,255,0.3)';
      context.beginPath();
      context.arc(b.x, b.y, b.radius + 3, 0, Math.PI * 2);
      context.fill();
    }
  }