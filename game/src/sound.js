// Short synthesized gunshots and blasts. No decoded files, no network.

let ctx = null;
let noiseBuffer = null;

function context() {
  if (ctx) return ctx;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  ctx = new AudioCtx();
  const length = ctx.sampleRate * 0.4;
  noiseBuffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  return ctx;
}

export function unlock() {
  const audio = context();
  if (audio && audio.state === 'suspended') audio.resume();
}

function burst(freq, duration, gainValue, type) {
  const audio = context();
  if (!audio) return;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, audio.currentTime);
  osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq * 0.4), audio.currentTime + duration);
  gain.gain.setValueAtTime(gainValue, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
  osc.connect(gain);
  gain.connect(audio.destination);
  osc.start();
  osc.stop(audio.currentTime + duration + 0.02);
}

function hiss(duration, gainValue) {
  const audio = context();
  if (!audio || !noiseBuffer) return;
  const source = audio.createBufferSource();
  source.buffer = noiseBuffer;
  const filter = audio.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 900;
  const gain = audio.createGain();
  gain.gain.setValueAtTime(gainValue, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(audio.destination);
  source.start();
  source.stop(audio.currentTime + duration);
}

export function gun(id) {
  if (id === 'lath') {
    burst(180, 0.09, 0.18, 'square');
    hiss(0.07, 0.12);
  } else if (id === 'chatter') {
    burst(240, 0.05, 0.1, 'square');
    hiss(0.04, 0.08);
  } else if (id === 'spit') {
    burst(320, 0.06, 0.12, 'triangle');
    hiss(0.05, 0.07);
  }
}

export function boom() {
  burst(90, 0.28, 0.22, 'sawtooth');
  hiss(0.25, 0.16);
}

let lastShots = 0;
let lastFeeds = 0;

export function follow(world) {
  const player = world.actors[0];
  if (player.shots !== lastShots) {
    if (player.shots > lastShots) gun(player.equipped);
    lastShots = player.shots;
  }
  if (world.feedI !== lastFeeds) {
    const row = world.feed[(world.feedI - 1 + world.feed.length) % world.feed.length];
    if (row.text.includes('blew') || row.text.includes('Cinder pot')) boom();
    lastFeeds = world.feedI;
  }
}
