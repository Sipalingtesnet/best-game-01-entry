import { STEP, BEST_KEY } from './config.js';
import { createWorld, stepWorld, ACTION_BOMB } from './world.js';
import { createRenderer, SCREEN_TITLE, SCREEN_PLAY, SCREEN_PAUSED, SCREEN_OVER } from './render.js';
import { createInput, ACTION_CONFIRM, ACTION_PAUSE, ACTION_MUTE, ACTION_RESTART } from './input.js';
import { createRandom } from './random.js';
import { startMusic, stopMusic, setMuted, isMuted } from './audio.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const statusEl = document.getElementById('status');
const renderer = createRenderer(canvas);
renderer.resize();
window.addEventListener('resize', renderer.resize);

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = params.get('seed');

function makeSeed() {
  if (seedParam) return Number(seedParam) || 1;
  return Math.floor(Math.random() * 1000000) + 1;
}

function readBest() {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0;
  } catch (e) {
    return 0;
  }
}

function saveBest(v) {
  try {
    localStorage.setItem(BEST_KEY, String(v));
  } catch (e) {
    // ignore
  }
}

let state = createWorld(createRandom(makeSeed()));
state.best = readBest();
let paused = false;
let lastStatus = '';
let lastScore = -1;
let lastPhase = '';

function updateStatus() {
  const text = state.phase + ' score ' + state.score + ' lives ' + state.lives;
  if (text !== lastStatus) {
    lastStatus = text;
    statusEl.textContent = text;
  }
}
const input = createInput(canvas);
let bombQueued = false;
window.addEventListener('keydown', function (e) {
  if (e.key === 'q' || e.key === 'Q') bombQueued = true;
});

function runShot(name) {
  const scene = stageShot(name, state);
  let painted = 0;
  function paint() {
    renderer.draw(state, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) {
      requestAnimationFrame(paint);
    } else {
      window.__shotReady = true;
    }
  }
  requestAnimationFrame(paint);
  updateStatus();
}

function restart() {
  state = createWorld(createRandom(makeSeed()));
  state.best = readBest();
  paused = false;
  lastScore = -1;
  lastPhase = '';
}

function runGame() {
  let last = performance.now();
  let acc = 0;
  const MAX_FRAME = 0.25;

  function frame(now) {
    let dt = (now - last) / 1000;
    last = now;
    if (dt > MAX_FRAME) dt = MAX_FRAME;
    acc += dt;

    const actions = input.takeActions();
    if (actions & ACTION_PAUSE) {
      paused = !paused;
      if (paused) stopMusic();
      else startMusic();
    }
    if (actions & ACTION_MUTE) {
      setMuted(!isMuted());
    }
    if (actions & ACTION_RESTART) {
      restart();
      if (state.phase === 'play') startMusic();
    }
    if (actions & ACTION_CONFIRM && state.phase === 'title') {
      state.phase = 'play';
      startMusic();
    }

    while (acc >= STEP) {
      acc -= STEP;
      if (!paused && state.phase === 'play') {
        const inp = {
          move: input.move(),
          aim: input.aim(),
          firing: input.firing(),
          actions: actions,
          bomb: bombQueued
        };
        stepWorld(state, STEP, inp);
        bombQueued = false;
      }
    }

    if (state.score > state.best) {
      state.best = state.score;
      saveBest(state.best);
    }

    let screen = SCREEN_PLAY;
    if (state.phase === 'title') screen = SCREEN_TITLE;
    else if (state.phase === 'over') screen = SCREEN_OVER;
    else if (paused) screen = SCREEN_PAUSED;
    renderer.draw(state, screen, state.best);
    updateStatus();
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

window.__emberfall = { get state() { return state; } };

if (shot) {
  runShot(shot);
} else {
  runGame();
}
