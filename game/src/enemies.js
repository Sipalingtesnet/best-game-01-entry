// The enemies of the ember realm: chasers, shooters, splitters, tanks)Skip and the Ember Lord
// boss. Each has its own AI, colour and behaviour. Enemies are pooled; the world activates and
// deactivates them. The boss is a special enemy with radial bursts and a summon.

import { ENEMY, FIELD } from './config.js';

export const KIND_CHASER = 'chaser';
export const KIND_SHOOTER = 'shooter';
export const KIND_SPLITTER = 'splitter';
export const KIND_TANK = 'tank';
export const KIND_BOSS = 'boss';

export const MAX_ENEMIES = 120;

export function createEnemies() {
  const list = [];
  for (let i = 0; i < MAX_ENEMIES; i += 1) {
    list.push({
      active: false,
      kind: KIND_CHASER,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      radius: 10,
      hp: 1,
      maxHp: 1,
      speed: 100,
      color: '#fff',
      fireTimer: 0,
      spawnIn: 0,
      angle: 0,
      boss: false,
    });
  }
  return list;
}

function freeEnemy(list) {
  for (let i = 0; i < list.length; i += 1) if (!list[i].active) return list[i];
  return null;
}

/** Spawn an enemy of a kind at a random arena edge, with a spawn-in delay. */
export function spawnEnemy(list, random, kind, wave) {
  const e = freeEnemy(list);
  if (e === null) return null;
  const spec = ENEMY[kind];
  const edge = Math.floor(random() * 4);
  const margin = 40;
  if (edge === 0) {
    e.x = random() * FIELD.width;
    e.y = -margin;
  } else if (edge === 1) {
    e.x = FIELD.width + margin;
    e.y = random() * FIELD.height;
  } else if (edge === 2) {
    e.x = random() * FIELD.width;
    e.y = FIELD.height + margin;
  } else {
    e.x = -margin;
    e.y = random() * FIELD.height;
  }
  e.active = true;
  e.kind = kind;
  e.radius = spec.radius;
  e.hp = spec.hp;
  e.maxHp = spec.hp;
  e.speed = spec.speed * (1 + (wave - 1) * 0.04);
  e.color = spec.color;
  e.fireTimer = spec.fireInterval ? spec.fireInterval * (0.6 + random() * 0.8) : 0;
  e.spawnIn = 0.6 + random() * 0.5;
  e.angle = Math.random() * Math.PI * 2;
  e.boss = kind === KIND_BOSS;
  return e;
}

/** Spawn the Ember Lord boss at the top of the arena. */
export function spawnBoss(list, wave) {
  const e = freeEnemy(list);
  if (e === null) return null;
  const spec = ENEMY.boss;
  e.active = true;
  e.kind = KIND_BOSS;
  e.x = FIELD.width / 2;
  e.y = 90;
  e.radius = spec.radius;
  e.hp = spec.hp + (wave - 1) * 30;
  e.maxHp = e.hp;
  e.speed = spec.speed;
  e.color = spec.color;
  e.fireTimer = 2;
  e.spawnIn = 1.2;
  e.angle = 0;
  e.boss = true;
  return e;
}

/** Advance one enemy one fixed step toward the player. Returns events as flags. */
export function stepEnemy(e, dt, player, bullets, orbs, random, onSplit) {
  if (!e.active) return 0;
  if (e.spawnIn > 0) {
    e.spawnIn -= dt;
    return 0;
  }
  const dx = player.x - e.x;
  const dy = player.y - e.y;
  const dist = Math.hypot(dx, dy) || 1;
  const nx = dx / dist;
  const ny = dy / dist;

  if (e.kind === KIND_CHASER) {
    e.x += nx * e.speed * dt;
    e.y += ny * e.speed * dt;
  } else if (e.kind === KIND_SHOOTER) {
    // Keep distance: drift away when close, toward when far.
    const desired = 260;
    const dir = dist < desired ? -1 : 1;
    e.x += nx * dir * e.speed * dt;
    e.y += ny * dir * e.speed * dt;
    e.fireTimer -= dt;
    if (e.fireTimer <= 0) {
      e.fireTimer = ENEMY.shooter.fireInterval;
      orbs.push({
        x: e.x,
        y: e.y,
        vx: nx * ENEMY.shooter.orbSpeed,
        vy: ny * ENEMY.shooter.orbSpeed,
        radius: ENEMY.shooter.orbRadius,
        life: 6,
      });
    }
  } else if (e.kind === KIND_SPLITTER) {
    e.x += nx * e.speed * dt;
    e.y += ny * e.speed * dt;
  } else if (e.kind === KIND_TANK) {
    e.x += nx * e.speed * dt;
    e.y += ny * e.speed * dt;
  } else if (e.kind === KIND_BOSS) {
    // The boss drifts side to side and slowly toward the player.
    e.angle += dt * 0.9;
    e.x += Math.cos(e.angle) * e.speed * 1.6 * dt;
    e.y += Math.sin(e.angle) * e.speed * 0.6 * dt;
    e.x = Math.max(e.radius, Math.min(FIELD.width - e.radius, e.x));
    e.y = Math.max(e.radius, Math.min(FIELD.height * 0.6, e.y));
    e.fireTimer -= dt;
    if (e.fireTimer <= 0) {
      e.fireTimer = 2.4;
      // Radial burst of orbs.
      const count = 12;
      for (let i = 0; i < count; i += 1) {
        const a = (i / count) * Math.PI * 2 + random() * 0.3;
        orbs.push({
          x: e.x,
          y: e.y,
          vx: Math.cos(a) * 170,
          vy: Math.sin(a) * 170,
          radius: 8,
          life: 6,
        });
      }
      // Summon a couple of chasers.
      onSplit(e.x, e.y);
    }
  }

  // Keep enemies inside the arena (with a little bleed so they can enter).
  e.x = Math.max(-60, Math.min(FIELD.width + 60, e.x));
  e.y = Math.max(-60, Math.min(FIELD.height + 60, e.y));
  return 0;
}