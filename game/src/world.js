import { FIELD, LIVES, COMBO, WAVE, PICKUP, PLAYER, ENEMY, BOMB } from './config.js';
import { createPlayer, stepPlayer, tryDash } from './player.js';
import { createEnemies, spawnEnemy, spawnBoss, stepEnemy } from './enemies.js';
import { createParticles } from './particles.js';
import { sfx, stopMusic } from './audio.js';
import { pick } from './random.js';

export const ACTION_BOMB = 32;

export function createWorld(random) {
  const state = {
    random,
    time: 0,
    phase: 'title',
    player: createPlayer(),
    enemies: createEnemies(),
    bullets: [],
    orbs: [],
    pickups: [],
    particles: createParticles(),
    score: 0,
    best: 0,
    combo: 0,
    comboTimer: 0,
    lives: LIVES,
    wave: 0,
    waveState: 'idle',
    waveTimer: WAVE.firstDelay,
    spawnTimer: 0,
    toSpawn: [],
    bossActive: false,
    bombs: 1,
    waveBanner: '',
    waveBannerTimer: 0,
    gameOver: false
  };
  return state;
}

function killEnemy(state, e) {
  e.active = false;
  state.particles.burst(e.x, e.y, e.color, 16, 180, 5, 0.4);
  const baseScore = ENEMY[e.kind].score;
  const mult = 1 + state.combo;
  const earned = Math.round(baseScore * mult);
  state.score += earned;
  state.combo = Math.min(state.combo + 1, COMBO.max);
  state.comboTimer = COMBO.decayTime;
  state.particles.text(e.x, e.y - 15, `+${earned}`, e.color, 18);
  sfx.explosion();

  if (state.random() < PICKUP.dropChance) {
    const pType = pick(state.random, ['health', 'shield', 'rapid', 'bomb']);
    const pCfg = PICKUP[pType];
    state.pickups.push({
      x: e.x,
      y: e.y,
      vx: (state.random() - 0.5) * 40,
      vy: (state.random() - 0.5) * 40,
      kind: pType,
      radius: pCfg.radius,
      color: pCfg.color,
      life: pCfg.life
    });
  }

  if (e.kind === 'splitter') {
    const childCfg = ENEMY.splitter;
    for (let i = 0; i < childCfg.childCount; i++) {
      const angle = state.random() * Math.PI * 2;
      const child = spawnEnemy(state.enemies, state.random, 'chaser', state.wave);
      if (child) {
        child.x = e.x;
        child.y = e.y;
        child.radius = childCfg.childRadius;
        child.speed = childCfg.childSpeed;
        child.color = childCfg.color;
        child.hp = 1;
        child.vx = Math.cos(angle) * child.speed;
        child.vy = Math.sin(angle) * child.speed;
      }
    }
  }

  if (e.kind === 'boss') {
    state.bossActive = false;
  }
}

export function useBomb(state) {
  if (state.bombs <= 0 || state.phase !== 'play') return false;
  state.bombs -= 1;
  sfx.bomb();
  state.particles.addShake(0.6);
  state.particles.burst(state.player.x, state.player.y, '#f2c94c', 40, 320, 8, 0.7);

  for (let i = 0; i < state.enemies.length; i++) {
    const e = state.enemies[i];
    if (!e.active) continue;
    const dx = e.x - state.player.x;
    const dy = e.y - state.player.y;
    const distSq = dx * dx + dy * dy;
    if (distSq <= BOMB.radius * BOMB.radius) {
      e.hp -= BOMB.damage;
      e.flash = 0.15;
      if (e.hp <= 0) {
        killEnemy(state, e);
      }
    }
  }
  return true;
}

export function stepWorld(state, dt, input) {
  if (state.waveBannerTimer > 0) {
    state.waveBannerTimer -= dt;
  }
  if (state.comboTimer > 0) {
    state.comboTimer -= dt;
    if (state.comboTimer <= 0) {
      state.combo = 0;
    }
  }

  if (state.phase !== 'play') {
    state.particles.step(dt);
    return;
  }

  state.time += dt;

  if (input.actions & ACTION_BOMB || input.bomb) {
    useBomb(state);
  }
  if (input.actions & ACTION_DASH) {
    if (tryDash(state.player, input.move, input.aim)) {
      sfx.dash();
      state.particles.burst(state.player.x, state.player.y, '#ffd166', 10, 200, 3, 0.2);
    }
  }

  stepPlayer(state.player, dt, input.move, input.aim, input.firing, state.bullets, () => {
    sfx.shoot();
  });

  state.particles.step(dt);
  
  if (state.player.muzzleFlash > 0) {
    state.player.muzzleFlash -= dt;
  }

  for (let i = state.bullets.length - 1; i >= 0; i--) {
    const b = state.bullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    if (b.life <= 0 || b.x < 0 || b.x > FIELD.width || b.y < 0 || b.y > FIELD.height) {
      state.bullets.splice(i, 1);
      continue;
    }
    let hit = false;
    for (let j = 0; j < state.enemies.length; j++) {
      const e = state.enemies[j];
      if (!e.active) continue;
      const dx = e.x - b.x;
      const dy = e.y - b.y;
      const minDist = e.radius + b.radius;
      if (dx * dx + dy * dy <= minDist * minDist) {
        hit = true;
        e.hp -= b.damage;
        e.flash = 0.08;
        state.particles.burst(b.x, b.y, '#ff7a3c', 4, 120, 3, 0.2);
        if (e.hp <= 0) {
          killEnemy(state, e);
        }
        break;
      }
    }
    if (hit) {
      state.bullets.splice(i, 1);
    }
  }

  for (let i = 0; i < state.enemies.length; i++) {
    const e = state.enemies[i];
    if (!e.active) continue;
    stepEnemy(e, dt, state.player, state.bullets, state.orbs, state.random, (splitter) => {});
    if (e.flash > 0) e.flash -= dt;

    const dx = e.x - state.player.x;
    const dy = e.y - state.player.y;
    const minDist = e.radius + state.player.radius;
    if (dx * dx + dy * dy <= minDist * minDist) {
      if (state.player.invulnerable <= 0) {
        if (state.player.shield) {
          state.player.shield = false;
          sfx.hit();
          state.particles.addShake(0.3);
          state.particles.burst(state.player.x, state.player.y, '#4fc3f7', 15, 180, 4, 0.3);
          state.player.invulnerable = 0.8;
        } else {
          state.lives -= 1;
          state.combo = 0;
          sfx.hit();
          state.particles.addShake(0.4);
          state.particles.burst(state.player.x, state.player.y, '#ff5d73', 20, 220, 5, 0.4);
          state.player.invulnerable = 1.2;
          if (state.lives <= 0) {
            state.phase = 'over';
            state.gameOver = true;
            sfx.gameover();
            stopMusic();
          }
        }
      }
      e.hp -= 1;
      if (e.hp <= 0) {
        killEnemy(state, e);
      }
    }
  }

  for (let i = state.orbs.length - 1; i >= 0; i--) {
    const o = state.orbs[i];
    o.x += o.vx * dt;
    o.y += o.vy * dt;
    o.life -= dt;
    if (o.life <= 0 || o.x < 0 || o.x > FIELD.width || o.y < 0 || o.y > FIELD.height) {
      state.orbs.splice(i, 1);
      continue;
    }
    const dx = o.x - state.player.x;
    const dy = o.y - state.player.y;
    const minDist = o.radius + state.player.radius;
    if (dx * dx + dy * dy <= minDist * minDist) {
      state.orbs.splice(i, 1);
      if (state.player.invulnerable <= 0) {
        if (state.player.shield) {
          state.player.shield = false;
          sfx.hit();
          state.particles.addShake(0.3);
          state.particles.burst(state.player.x, state.player.y, '#4fc3f7', 15, 180, 4, 0.3);
          state.player.invulnerable = 0.8;
        } else {
          state.lives -= 1;
          state.combo = 0;
          sfx.hit();
          state.particles.addShake(0.4);
          state.particles.burst(state.player.x, state.player.y, '#ff5d73', 20, 220, 5, 0.4);
          state.player.invulnerable = 1.2;
          if (state.lives <= 0) {
            state.phase = 'over';
            state.gameOver = true;
            sfx.gameover();
            stopMusic();
          }
        }
      }
    }
  }

  for (let i = state.pickups.length - 1; i >= 0; i--) {
    const p = state.pickups[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
    if (p.life <= 0) {
      state.pickups.splice(i, 1);
      continue;
    }
    const dx = state.player.x - p.x;
    const dy = state.player.y - p.y;
    const distSq = dx * dx + dy * dy;
    const magnetDist = 140;
    if (distSq < magnetDist * magnetDist) {
      const dist = Math.sqrt(distSq) || 1;
      const pull = 300 * (1 - dist / magnetDist);
      p.vx += (dx / dist) * pull * dt;
      p.vy += (dy / dist) * pull * dt;
    }
    const collectDist = p.radius + state.player.radius;
    if (distSq <= collectDist * collectDist) {
      sfx.pickup();
      if (p.kind === 'health') {
        state.lives = Math.min(state.lives + 1, LIVES);
        state.particles.text(p.x, p.y - 10, '+1 LIFE', '#ff5d73', 16);
      } else if (p.kind === 'shield') {
        state.player.shield = true;
        state.particles.text(p.x, p.y - 10, 'SHIELD', '#4fc3f7', 16);
      } else if (p.kind === 'rapid') {
        state.player.rapidFire = PLAYER.rapidFireTime;
        state.particles.text(p.x, p.y - 10, 'RAPID FIRE', '#ffb347', 16);
      } else if (p.kind === 'bomb') {
        state.bombs += 1;
        state.particles.text(p.x, p.y - 10, '+1 BOMB', '#f2c94c', 16);
      }
      state.particles.burst(p.x, p.y, p.color, 12, 150, 4, 0.3);
      state.pickups.splice(i, 1);
    }
  }

  if (state.waveState === 'idle') {
    state.waveTimer -= dt;
    if (state.waveTimer <= 0) {
      state.wave += 1;
      state.waveState = 'spawning';
      const count = Math.round(WAVE.countBase + state.wave * WAVE.countPerWave);
      state.toSpawn = [];
      const isBossWave = state.wave % WAVE.bossEvery === 0;

      for (let i = 0; i < count; i++) {
        let kind = 'chaser';
        const roll = state.random();
        if (state.wave >= 2 && roll < 0.35) kind = 'shooter';
        if (state.wave >= 3 && roll < 0.2) kind = 'splitter';
        if (state.wave >= 4 && roll < 0.12) kind = 'tank';
        state.toSpawn.push(kind);
      }

      if (isBossWave) {
        state.toSpawn.push('boss');
        state.waveBanner = 'EMBER LORD';
        state.bossActive = true;
      } else {
        state.waveBanner = `WAVE ${state.wave}`;
      }
      state.waveBannerTimer = 2.0;
      sfx.wave();
    }
  } else if (state.waveState === 'spawning') {
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      if (state.toSpawn.length > 0) {
        const kind = state.toSpawn.shift();
        if (kind === 'boss') {
          spawnBoss(state.enemies, state.wave);
        } else {
          spawnEnemy(state.enemies, state.random, kind, state.wave);
        }
        const interval = Math.max(
          WAVE.spawnIntervalMin,
          WAVE.spawnInterval * Math.pow(WAVE.spawnIntervalScale, state.wave)
        );
        state.spawnTimer = interval;
      } else {
        state.waveState = 'fighting';
      }
    }
  } else if (state.waveState === 'fighting') {
    let activeEnemies = 0;
    for (let i = 0; i < state.enemies.length; i++) {
      if (state.enemies[i].active) activeEnemies++;
    }
    if (activeEnemies === 0 && state.orbs.length === 0) {
      state.waveState = 'clear';
      const bonus = 50 + state.wave * 10;
      state.score += bonus;
      state.particles.text(FIELD.width / 2, FIELD.height / 2 - 40, `WAVE CLEAR +${bonus}`, '#ffc46b', 22);
      state.waveTimer = WAVE.betweenDelay;
      state.waveState = 'idle';
    }
  }
}
