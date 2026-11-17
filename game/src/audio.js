// WebAudio-synthesised sound: no audio files, everything is generated. A small helper builds
// one-shot blips and whooshes; a quiet pulsing bass loop runs while playing. M toggles mute.

let context = null;
let master = null;
let muted = false;
let musicTimer = null;
let musicGain = null;

function ensureContext() {
  if (context === null) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    context = new AC();
    master = context.createGain();
    master.gain.value = muted ? 0 : 0.5;
    master.connect(context.destination);
  }
  if (context.state === 'suspended') context.resume();
  return context;
}

/** A short envelope: attack then exponential decay to silence. */
function blip(freq, duration, type, volume, slideTo) {
  const ctx = ensureContext();
  if (!ctx || muted) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + duration);
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(master);
  osc.start();
  osc.stop(ctx.currentTime + duration + 0.02);
}

/** A burst of filtered noise, for explosions and whooshes. */
function noise(duration, volume, filterFreq) {
  const ctx = ensureContext();
  if (!ctx || muted) return;
  const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = filterFreq;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(master);
  src.start();
  src.stop(ctx.currentTime + duration + 0.02);
}

export const sfx = {
  shoot() {
    blip(880, 0.08, 'square', 0.12, 440);
  },
  explosion() {
    noise(0.3, 0.5, 900);
    blip(120, 0.25, 'sawtooth', 0.2, 40);
  },
  pickup() {
    blip(660, 0.1, 'sine', 0.25, 990);
    blip(990, 0.12, 'sine', 0.2, 1320);
  },
  wave() {
    blip(220, 0.5, 'sawtooth', 0.3, 440);
    blip(440, 0.5, 'sawtooth', 0.2, 660);
  },
  gameover() {
    blip(440, 0.4, 'sawtooth', 0.3, 110);
    blip(220, 0.6, 'sawtooth', 0.25, 55);
  },
  dash() {
    noise(0.18, 0.35, 2400);
  },
  hit() {
    blip(200, 0.15, 'square', 0.25, 90);
  },
  bomb() {
    noise(0.5, 0.6, 500);
    blip(80, 0.5, 'sawtooth', 0.3, 30);
  },
};

/** Start the quiet pulsing bass loop; it runs until stopMusic is called. */
export function startMusic() {
  const ctx = ensureContext();
  if (!ctx || musicTimer !== null) return;
  musicGain = ctx.createGain();
  musicGain.gain.value = muted ? 0 : 0.12;
  musicGain.connect(master);
  let step = 0;
  const schedule = () => {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    // A slow two-note pulse, low and warm.
    const freq = step % 2 === 0 ? 55 : 82.5;
    osc.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.5, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);
    osc.connect(gain);
    gain.connect(musicGain);
    osc.start(now);
    osc.stop(now + 1);
    step += 1;
    musicTimer = window.setTimeout(schedule, 900);
  };
  schedule();
}

export function stopMusic() {
  if (musicTimer !== null) {
    window.clearTimeout(musicTimer);
    musicTimer = null;
  }
  if (musicGain !== null) {
    musicGain.disconnect();
    musicGain = null;
  }
}

export function setMuted(value) {
  muted = value;
  if (master) master.gain.value = muted ? 0 : 0.5;
  if (musicGain) musicGain.gain.value = muted ? 0 : 0.12;
}

export function isMuted() {
  return muted;
}