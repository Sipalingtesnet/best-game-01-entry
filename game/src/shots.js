// The screenshot scenes behind ?shot=start|play|boss|end. Each one plays the real rules forward
// from a fresh world for a fixed number of steps, steered by a simple autopilot (move toward the
// centre, fire at the nearest enemy), so the frame is what a short game really looks like and the
// same seed always gives the same frame.
import { FIELD, STEP } from './config.js';
import { spawnEnemy, spawnBoss } from './enemies.js';
import { stepWorld } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

function autopilot(state, dt, weak) {
  const p = state.player;
  let nearest = null;
  let nd = Infinity;
  for (let i = 0; i < state.enemies.length; i += 1) {
    const e = state.enemies[i];
    if (!e.active) continue;
    const dx = e.x - p.x;
    const dy = e.y - p.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < nd) { nd = d; nearest = e; }
  }
  const move = { x: 0, y: 0 };
  if (nearest) {
    const dx = p.x - nearest.x;
    const dy = p.y - nearest.y;
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
}export function stageShot(name, state) {
  if (name === 'start') {
    state.phase = 'title';
    for (let i = 0; i < 60; i += 1) {
      state.particles.ember(
        Math.random() * FIELD.width,
        Math.random() * FIELD.height,
        (Math.random() - 0.5) * 20,
        -10 - Math.random() * 20,
        2 + Math.random() * 3,
        4 + Math.random() * 4
      );
    }
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'play') {
    state.phase = 'play';
    state.wave = 3;
    state.score = 340;
    state.combo = 4;
    state.comboTimer = 3;
    for (let i = 0; i < 8; i += 1) spawnEnemy(state.enemies, state.random, 'chaser', 3);
    for (let i = 0; i < 3; i += 1) spawnEnemy(state.enemies, state.random, 'shooter', 3);
    for (let i = 0; i < 2; i += 1) spawnEnemy(state.enemies, state.random, 'splitter', 3);
    const steps = Math.floor(6 / STEP);
    for (let i = 0; i < steps; i += 1) autopilot(state, STEP, false);
    return { screen: SCREEN_PLAY, best: 0 };
  }
  if (name === 'boss') {
    state.phase = 'play';
    state.wave = 5;
    state.score = 1200;
    state.combo = 6;
    state.comboTimer = 3;
    const boss = spawnBoss(state.enemies, 5);
    if (boss) {
      state.bossActive = true;
      state.bossHp = boss.hp;
      state.bossMaxHp = boss.hp;
    }
    for (let i = 0; i < 4; i += 1) spawnEnemy(state.enemies, state.random, 'chaser', 5);
    const steps = Math.floor(4 / STEP);
    for (let i = 0; i < steps; i += 1) autopilot(state, STEP, false);
    return { screen: SCREEN_PLAY, best: 0 };
  }
  if (name === 'end') {
    state.phase = 'play';
    state.lives = 1;
    state.score = 850;
    for (let i = 0; i < 15; i += 1) spawnEnemy(state.enemies, state.random, 'chaser', 1);
    for (let i = 0; i < 5; i += 1) spawnEnemy(state.enemies, state.random, 'shooter', 1);
    const maxSteps = Math.floor(600 / STEP);
    for (let i = 0; i < maxSteps && state.phase === 'play'; i += 1) {
      autopilot(state, STEP, true);
    }
    state.phase = 'over';
    state.gameOver = true;
    return { screen: SCREEN_OVER, best: 900 };
  }
  state.phase = 'title';
  return { screen: SCREEN_TITLE, best: 0 };
}