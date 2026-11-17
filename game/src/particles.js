// Particles, floating text and screen shake. The world calls these to add juice; the renderer
// draws them. Everything is pooled so a frame allocates nothing after boot.

export const MAX_PARTICLES = 400;
export const MAX_TEXTS = 40;

export function createParticles() {
  const particles = [];
  for (let i = 0; i < MAX_PARTICLES; i += 1) {
    particles.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 2, color: '#fff', drag: 0.9 });
  }
  const texts = [];
  for (let i = 0; i < MAX_TEXTS; i += 1) {
    texts.push({ active: false, x: 0, y: 0, vy: 0, life: 0, maxLife: 1, text: '', color: '#fff', size: 18 });
  }
  let shake = 0;
  let shakeX = 0;
  let shakeY = 0;

  function freeParticle() {
    for (let i = 0; i < particles.length; i += 1) if (!particles[i].active) return particles[i];
    return null;
  }

  function freeText() {
    for (let i = 0; i < texts.length; i += 1) if (!texts[i].active) return texts[i];
    return null;
  }

  return {
    /** A burst of particles at a point with a spread of directions and speeds. */
    burst(x, y, color, count, speed, size, life) {
      for (let n = 0; n < count; n += 1) {
        const p = freeParticle();
        if (p === null) return;
        const angle = Math.random() * Math.PI * 2;
        const spd = speed * (0.3 + Math.random() * 0.7);
        p.active = true;
        p.x = x;
        p.y = y;
        p.vx = Math.cos(angle) * spd;
        p.vy = Math.sin(angle) * spd;
        p.life = life * (0.5 + Math.random() * 0.5);
        p.maxLife = p.life;
        p.size = size * (0.6 + Math.random() * 0.8);
        p.color = color;
        p.drag = 0.9;
      }
    },
    /** A single drifting ember for the background ambience. */
    ember(x, y, vx, vy, size, life) {
      const p = freeParticle();
      if (p === null) return;
      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = vx;
      p.vy = vy;
      p.life = life;
      p.maxLife = life;
      p.size = size;
      p.color = '#3a4a6e';
      p.drag = 0.995;
    },
    /** Floating score text that rises and fades. */
    text(x, y, text, color, size) {
      const t = freeText();
      if (t === null) return;
      t.active = true;
      t.x = x;
      t.y = y;
      t.vy = -40;
      t.life = 0.9;
      t.maxLife = 0.9;
      t.text = text;
      t.color = color;
      t.size = size;
    },
    /** Add to the screen-shake amount; the renderer offsets the whole frame by it. */
    addShake(amount) {
      shake = Math.min(24, shake + amount);
    },
    /** Advance every particle and text one fixed step. */
    step(dt) {
      for (const p of particles) {
        if (!p.active) continue;
        p.life -= dt;
        if (p.life <= 0) {
          p.active = false;
          continue;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= p.drag;
        p.vy *= p.drag;
      }
      for (const t of texts) {
        if (!t.active) continue;
        t.life -= dt;
        if (t.life <= 0) {
          t.active = false;
          continue;
        }
        t.y += t.vy * dt;
      }
      if (shake > 0) {
        shake = Math.max(0, shake - dt * 40);
        shakeX = (Math.random() * 2 - 1) * shake;
        shakeY = (Math.random() * 2 - 1) * shake;
      } else {
        shakeX = 0;
        shakeY = 0;
      }
    },
    /** The current shake offset, for the renderer. */
    offset() {
      return { x: shakeX, y: shakeY };
    },
    particles,
    texts,
  };
}