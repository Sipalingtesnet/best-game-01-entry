// EMBERFALL — every tuning number and colour in one place. The arena is a fixed 1280x720
// logical area; the renderer scales it to the window, so no rule below depends on the screen.
// All colours are the neon palette of the ember realm.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const LIVES = 3;

export const PLAYER = {
  radius: 13,
  speed: 330,
  dashSpeed: 760,
  dashTime: 0.16,
  dashCooldown: 0.9,
  dashInvuln: 0.28,
  fireInterval: 0.16,
  rapidFireInterval: 0.07,
  rapidFireTime: 8,
  bulletSpeed: 620,
  bulletRadius: 5,
  bulletDamage: 1,
  muzzleFlash: 0.05,
};

export const BOMB = {
  radius: 240,
  damage: 999,
};

export const ENEMY = {
  chaser: { radius: 13, speed: 150, hp: 1, score: 10, color: '#ff5d73' },
  shooter: { radius: 15, speed: 95, hp: 2, score: 20, color: '#ffb347', fireInterval: 2.2, orbSpeed: 200, orbRadius: 7 },
  splitter: { radius: 16, speed: 120, hp: 2, score: 25, color: '#7c5cff', childCount: 2, childSpeed: 210, childRadius: 8 },
  tank: { radius: 26, speed: 42, hp: 8, score: 60, color: '#3ecf8e' },
  boss: { radius: 52, speed: 55, hp: 220, score: 500, color: '#ff3b6b' },
};

export const WAVE = {
  firstDelay: 1.2,
  betweenDelay: 2.4,
  spawnInterval: 0.9,
  spawnIntervalMin: 0.32,
  spawnIntervalScale: 0.94,
  countBase: 3,
  countPerWave: 1.4,
  bossEvery: 5,
};

export const PICKUP = {
  health: { radius: 11, color: '#ff5d73', life: 12 },
  shield: { radius: 11, color: '#4fc3f7', life: 12 },
  rapid: { radius: 11, color: '#ffb347', life: 12 },
  bomb: { radius: 11, color: '#f2c94c', life: 12 },
  dropChance: 0.16,
};

export const COMBO = {
  decayTime: 4,
  max: 9,
};

export const PALETTE = {
  backdrop: '#07080f',
  grid: '#141a2e',
  gridBright: '#1d2740',
  ember: '#2a3350',
  player: '#7df9ff',
  playerCore: '#eaffff',
  bullet: '#7df9ff',
  text: '#eef1f5',
  muted: '#8b93a3',
  panel: '#10131f',
  panelLine: '#2a3350',
  accent: '#ff3b6b',
  gold: '#f2c94c',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'emberfall.best';