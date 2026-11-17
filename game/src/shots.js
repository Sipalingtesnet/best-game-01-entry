import { FIELD, STEP, PLAYER, ENEMY } from './config.js';
import { spawnEnemy, spawnBoss } from './enemies.js';
import { stepWorld } from './world.js';

function autopilot(state, dt, weak) {
  const p = state.player;
  let nearest = null;
  let nd = Infinity;
  for (let i = 0; i < state.enemies.length; i++) {
    const e = state.enemies[i];
    if (!e.active) continue;
    const dx = e.x - p.x, dy = e.y - p.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < nd) { nd = d; nearest = e; }
  }
  const move = { x: 0, y: 0 };
  if (nearest) {
    const dx = p.x - nearest.x, dy = p.y - nearest.y;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    move.x = dx / d;
    move.y = dy / d;
  }
  const cx = FIELD.width / 2 - p.x;
  const cy = FIELD.height / 2 - p.y;
  const cd = Math.sqrt(cx * cx + cy * cy) || 1;
  move.x += (cx / cd) * 0.3;
  move.y += (cy / cd) * 0.3;
  const aim = nearest ? { x: nearest.x, y: nearest.y } : { x: p.x, y: p.y };
  const firing = !weak || state.random() < 0.3;
  const actions = 0;
  if (!weak && nearest && nd < 100) actions |= 4;
  const input = { move, aim, firing, actions, bomb: false };
  stepWorld(state, dt, input);
}

export function stageShot(name, state) {
  if (name === 'start') {
    state.phase = 'title';
    return;
  }
  if (name === 'play') {
    state.phase = 'play';
    state.wave = 3;
    for (let i = 0; i < 8; i++) spawnEnemy(state.enemies, state.random, 'chaser', 3);
    for (let i = 0; i < 3; i++) spawnEnemy(state.enemies, state.random, 'shooter', 3);
    for (let i = 0; i < 2; i++) spawnEnemy(state.enemies, state.random, 'splitter', 3);
    const steps = Math.floor(6 / STEP);
    for (let i = 0; i < steps; i++) autopilot(state, STEP, false);
    return;
  }
  if (name === 'boss') {
    state.phase = 'play';
    state.wave = 5;
    spawnBoss(state.enemies, 5);
    for (let i = 0; i < 4; i++) spawnEnemy(state.enemies, state.random, 'chaser', 5);
    const steps = Math.floor(4 / STEP);
    for (let i = 0; i < steps; i++) autopilot(state, STEP, false);
    return;
  }
  if (name === 'end') {
    state.phase = 'play';
    state.lives = 1;
    for (let i = 0; i < 15; i++) spawnEnemy(state.enemies, state.random, 'chaser', 1);
    for (let i = 0; i < 5; i++) spawnEnemy(state.enemies, state.random, 'shooter', 1);
    const maxSteps = Math.floor(600 / STEP);
    for (let i = 0; i < maxSteps && state.phase === 'play'; i++) {
      autopilot(state, STEP, true);
    }
    return;
  }
}