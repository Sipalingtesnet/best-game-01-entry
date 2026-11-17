// The ember spirit: movement, dash, shooting. The player is a small glowing orb the pilot
// steers around the arena. It fires embers toward the mouse, and can dash for a brief burst
// of speed and invulnerability on a cooldown.

import { FIELD, PLAYER } from './config.js';

export function createPlayer() {
  return {
    x: FIELD.width / 2,
    y: FIELD.height / 2,
    vx: 0,
    vy: 0,
    radius: PLAYER.radius,
    invulnerable: 0,
    dashTimer: 0,
    dashCooldown: 0,
    dashDirX: 0,
    dashDirY: 0,
    fireTimer: 0,
    rapidFire: 0,
    muzzleFlash: 0,
    shield: false,
  };
}

/** Advance the player one fixed step. `move` is the input vector, `aim` the mouse point. */
export function stepPlayer(player, dt, move, aim, firing, bullets, fire) {
  // Dash: a burst of speed in the current movement direction (or facing the aim if still).
  if (player.dashTimer > 0) {
    player.dashTimer -= dt;
    player.x += player.dashDirX * PLAYER.dashSpeed * dt;
    player.y += player.dashDirY * PLAYER.dashSpeed * dt;
  } else {
    const len = Math.hypot(move.x, move.y);
    if (len > 0) {
      player.vx = (move.x / len) * PLAYER.speed;
      player.vy = (move.y / len) * PLAYER.speed;
    } else {
      player.vx = 0;
      player.vy = 0;
    }
    player.x += player.vx * dt;
    player.y += player.vy * dt;
  }

  // Keep inside the arena.
  player.x = Math.max(player.radius, Math.min(FIELD.width - player.radius, player.x));
  player.y = Math.max(player.radius, Math.min(FIELD.height - player.radius, player.y));

  if (player.invulnerable > 0) player.invulnerable = Math.max(0, player.invulnerable - dt);
  if (player.dashCooldown > 0) player.dashCooldown = Math.max(0, player.dashCooldown - dt);
  if (player.rapidFire > 0) player.rapidFire = Math.max(0, player.rapidFire - dt);
  if (player.muzzleFlash > 0) player.muzzleFlash = Math.max(0, player.muzzleFlash - dt);

  // Shooting.
  if (firing) {
    player.fireTimer -= dt;
    const interval = player.rapidFire > 0 ? PLAYER.rapidFireInterval : PLAYER.fireInterval;
    if (player.fireTimer <= 0) {
      player.fireTimer = interval;
      const dx = aim.x - player.x;
      const dy = aim.y - player.y;
      const len = Math.hypot(dx, dy) || 1;
      bullets.push({
        x: player.x + (dx / len) * (player.radius + 4),
        y: player.y + (dy / len) * (player.radius + 4),
        vx: (dx / len) * PLAYER.bulletSpeed,
        vy: (dy / len) * PLAYER.bulletSpeed,
        radius: PLAYER.bulletRadius,
        damage: PLAYER.bulletDamage,
        life: 2.5,
      });
      player.muzzleFlash = PLAYER.muzzleFlash;
      fire();
    }
  } else {
    player.fireTimer = 0;
  }
}

/** Start a dash if it is off cooldown; returns true when it started. */
export function tryDash(player, move, aim) {
  if (player.dashCooldown > 0 || player.dashTimer > 0) return false;
  let dx = move.x;
  let dy = move.y;
  if (dx === 0 && dy === 0) {
    dx = aim.x - player.x;
    dy = aim.y - player.y;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;
  } else {
    const len = Math.hypot(dx, dy);
    dx /= len;
    dy /= len;
  }
  player.dashDirX = dx;
  player.dashDirY = dy;
  player.dashTimer = PLAYER.dashTime;
  player.dashCooldown = PLAYER.dashCooldown;
  player.invulnerable = Math.max(player.invulnerable, PLAYER.dashInvuln);
  return true;
}