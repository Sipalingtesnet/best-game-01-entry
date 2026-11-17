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
  }function drawEnemies(state) {
    for (let i = 0; i < state.enemies.length; i += 1) {
      const e = state.enemies[i];
      if (!e.active) continue;
      if (e.spawnIn > 0) {
        const t = 1 - e.spawnIn / 1.0;
        context.globalAlpha = Math.max(0.1, t);
        context.fillStyle = e.color;
        context.beginPath();
        context.arc(e.x, e.y, e.radius * t, 0, Math.PI * 2);
        context.fill();
        context.globalAlpha = 1;
        continue;
      }
      // Neon glow.
      context.fillStyle = e.color;
      context.globalAlpha = 0.25;
      context.beginPath();
      context.arc(e.x, e.y, e.radius + 8, 0, Math.PI * 2);
      context.fill();
      context.globalAlpha = 1;
      // Body.
      context.fillStyle = e.color;
      context.beginPath();
      context.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
      context.fill();
      // Flash when hit.
      if (e.flash > 0) {
        context.fillStyle = 'rgba(255,255,255,' + e.flash * 4 + ')';
        context.beginPath();
        context.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
        context.fill();
      }
      // Boss ring.
      if (e.boss) {
        context.strokeStyle = e.color;
        context.lineWidth = 3;
        context.beginPath();
        context.arc(e.x, e.y, e.radius + 10, 0, Math.PI * 2);
        context.stroke();
      }
    }
  }

  function drawPlayer(state) {
    const p = state.player;
    if (p.invulnerable > 0 && Math.floor(p.invulnerable * 10) % 2 === 1) return;
    // Dash trail.
    if (p.dashTimer > 0) {
      context.fillStyle = 'rgba(125,249,255,0.3)';
      context.beginPath();
      context.arc(p.x, p.y, p.radius + 6, 0, Math.PI * 2);
      context.fill();
    }
    // Shield bubble.
    if (p.shield) {
      context.strokeStyle = '#4fc3f7';
      context.lineWidth = 2;
      context.beginPath();
      context.arc(p.x, p.y, p.radius + 8, 0, Math.PI * 2);
      context.stroke();
    }
    context.fillStyle = PALETTE.player;
    context.beginPath();
    context.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.playerCore;
    context.beginPath();
    context.arc(p.x, p.y, p.radius * 0.5, 0, Math.PI * 2);
    context.fill();
    // Muzzle flash.
    if (p.muzzleFlash > 0) {
      context.fillStyle = 'rgba(255,220,120,' + p.muzzleFlash * 8 + ')';
      context.beginPath();
      context.arc(p.x, p.y, p.radius + 10, 0, Math.PI * 2);
      context.fill();
    }
  }function drawParticles(state) {
    const particles = state.particles.particles;
    for (let i = 0; i < particles.length; i += 1) {
      const p = particles[i];
      if (!p.active || p.color === '#3a4a6e') continue;
      const alpha = Math.max(0, p.life / p.maxLife);
      context.globalAlpha = alpha;
      context.fillStyle = p.color;
      context.beginPath();
      context.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
  }

  function drawTexts(state) {
    const texts = state.particles.texts;
    for (let i = 0; i < texts.length; i += 1) {
      const t = texts[i];
      if (!t.active) continue;
      const alpha = Math.max(0, t.life / t.maxLife);
      context.globalAlpha = alpha;
      context.font = 'bold ' + t.size + 'px ' + FONT;
      context.fillStyle = t.color;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(t.text, t.x, t.y);
    }
    context.globalAlpha = 1;
  }

  function drawHud(state) {
    context.textBaseline = 'top';
    text(scoreLabel(state.score), 20, 16, 26, PALETTE.text, 'left');
    text(waveLabel(state.wave), FIELD.width / 2, 16, 26, PALETTE.text, 'center');
    // Combo.
    if (state.combo > 1) {
      const comboPct = Math.max(0, state.comboTimer / COMBO.decayTime);
      text(comboLabel(state.combo), 20, 46, 20, PALETTE.gold, 'left');
      context.fillStyle = PALETTE.gold;
      context.fillRect(20, 70, 80 * comboPct, 4);
    }
    // Hearts.
    const firstLife = FIELD.width - 24 - LIVES * (LIFE_SIZE + LIFE_GAP) + LIFE_GAP;
    text('Lives', firstLife - 12, 16, 26, PALETTE.muted, 'right');
    for (let life = 0; life < LIVES; life += 1) {
      context.fillStyle = life < state.lives ? '#ff5d73' : PALETTE.grid;
      context.beginPath();
      context.arc(firstLife + life * (LIFE_SIZE + LIFE_GAP) + LIFE_SIZE / 2, 16 + LIFE_SIZE / 2, LIFE_SIZE / 2, 0, Math.PI * 2);
      context.fill();
    }
    // Dash cooldown.
    const p = state.player;
    const cdPct = 1 - Math.max(0, p.dashCooldown) / PLAYER.dashCooldown;
    context.fillStyle = PALETTE.grid;
    context.fillRect(20, FIELD.height - 24, 120, 8);
    context.fillStyle = cdPct >= 1 ? PALETTE.player : PALETTE.muted;
    context.fillRect(20, FIELD.height - 24, 120 * cdPct, 8);
    text('DASH', 148, FIELD.height - 30, 14, cdPct >= 1 ? PALETTE.player : PALETTE.muted, 'left');
    // Bombs.
    text('BOMB x' + state.bombs, 20, FIELD.height - 52, 16, PALETTE.gold, 'left');
    // Boss health bar.
    if (state.bossActive) {
      const bw = 400;
      const bx = (FIELD.width - bw) / 2;
      const by = 44;
      context.fillStyle = PALETTE.grid;
      context.fillRect(bx, by, bw, 12);
      const pct = Math.max(0, state.bossHp / state.bossMaxHp);
      context.fillStyle = '#ff3b6b';
      context.fillRect(bx, by, bw * pct, 12);
      text('EMBER LORD', FIELD.width / 2, by - 16, 16, '#ff3b6b', 'center');
    }
  }function drawPanel(title, lines, prompt) {
    const height = PANEL.top + lines.length * PANEL.line + PANEL.bottom;
    const x = (FIELD.width - PANEL.width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = PALETTE.panel;
    context.fillRect(x, y, PANEL.width, height);
    context.strokeStyle = PALETTE.panelLine;
    context.lineWidth = 2;
    context.strokeRect(x, y, PANEL.width, height);
    context.textBaseline = 'alphabetic';
    text(title, FIELD.width / 2, y + 78, 48, PALETTE.text, 'center');
    for (let index = 0; index < lines.length; index += 1) {
      text(lines[index], FIELD.width / 2, y + PANEL.top + index * PANEL.line, 22, PALETTE.muted, 'center');
    }
    text(prompt, FIELD.width / 2, y + height - 40, 24, PALETTE.gold, 'center');
  }

  function drawWaveBanner(state) {
    if (state.waveBannerTimer <= 0) return;
    const alpha = Math.min(1, state.waveBannerTimer);
    context.globalAlpha = alpha;
    context.font = 'bold 44px ' + FONT;
    context.fillStyle = PALETTE.gold;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(state.waveBanner, FIELD.width / 2, FIELD.height / 2 - 60);
    context.globalAlpha = 1;
  }

  const TITLE_LINES = [
    'Survive the ember horde. Chain kills for combo.',
    'WASD / Arrows to move. Mouse to aim.',
    'Hold click or Space to shoot. Shift / right-click to dash.',
    'Boss every 5 waves. Pickups drop from kills.',
    '',
  ];
  const PAUSED_LINES = ['The embers wait for you.'];
  const OVER_LINES = ['', ''];

  function draw(state, screen, best) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    const offset = state.particles.offset();
    context.save();
    context.translate(offset.x, offset.y);
    drawBackground(state);
    drawPickups(state);
    drawOrbs(state);
    drawBullets(state);
    drawEnemies(state);
    drawPlayer(state);
    drawParticles(state);
    drawTexts(state);
    context.restore();
    if (screen === SCREEN_TITLE) {
      TITLE_LINES[4] = bestLabel(best);
      drawPanel('EMBERFALL', TITLE_LINES, 'CLICK TO START');
      return;
    }
    drawHud(state);
    drawWaveBanner(state);
    if (screen === SCREEN_PAUSED) drawPanel('Paused', PAUSED_LINES, 'Press P to resume');
    else if (screen === SCREEN_OVER) {
      OVER_LINES[0] = finalLabel(state.score);
      OVER_LINES[1] = bestLabel(best);
      drawPanel('Game Over', OVER_LINES, 'Press R or click to play again');
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw, resize };
}