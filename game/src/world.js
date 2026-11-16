// One world object owns the round. Actors, the bomb, and pooled effects live here.

import { SPAWNS } from './map.js';
import { freshGuns } from './arsenal.js';

const NAMES = [
  ['cinder', false, 'Vale'],
  ['cinder', true, 'Moss'],
  ['cinder', true, 'Quill'],
  ['brine', true, 'Hake'],
  ['brine', true, 'Marrow'],
  ['brine', true, 'Silt'],
];

function makeActor(id, team, bot, name, x, z, slot) {
  return {
    id, team, bot, name, slot,
    x, y: 0, z,
    px: x, py: 0, pz: z,
    vx: 0, vy: 0, vz: 0,
    yaw: team === 'cinder' ? 0.15 : Math.PI,
    pitch: 0,
    crouch: 0,
    wantCrouch: false,
    wantWalk: false,
    wantJump: false,
    wishF: 0,
    wishS: 0,
    fire: false,
    wasFire: false,
    use: false,
    wantReload: false,
    alive: true,
    died: false,
    health: 100,
    armor: 0,
    helmet: false,
    kit: false,
    money: 800,
    primary: '',
    equipped: 'spit',
    mag: { spit: 12, lath: 0, chatter: 0 },
    reserve: { spit: 48, lath: 0, chatter: 0 },
    nades: { frag: 0, smoke: 0, flash: 0 },
    fireCd: 0,
    reload: 0,
    shots: 0,
    recoilP: 0,
    recoilY: 0,
    spread: 0.01,
    onGround: true,
    blind: 0,
    hitFlash: 0,
    goal: 0,
    node: 0,
    to: -1,
    fight: -1,
    hold: 0,
    thinkT: id * 0.03,
    burstUntil: 0,
    burstCd: 0,
    nadeCd: 0,
    step: id,
    seenX: x,
    seenZ: z,
  };
}

function pool(count, make) {
  const list = [];
  for (let i = 0; i < count; i++) list.push(make());
  return list;
}

export function createWorld() {
  const actors = NAMES.map((row, id) => {
    const slot = row[0] === 'cinder' ? id : id - 3;
    const spawn = SPAWNS[row[0]][slot];
    const actor = makeActor(id, row[0], row[1], row[2], spawn[0], spawn[1], slot);
    freshGuns(actor);
    return actor;
  });
  return {
    time: 0,
    phase: 'freeze',
    phaseLeft: 8,
    roundLeft: 90,
    roundIndex: 1,
    score: { cinder: 0, brine: 0 },
    loss: { cinder: 0, brine: 0 },
    winner: '',
    reason: '',
    matchOver: false,
    actors,
    bomb: {
      state: 'held',
      holder: 0,
      x: actors[0].x,
      z: actors[0].z,
      site: '',
      fuse: 35,
      plant: 0,
      defuse: 0,
    },
    nades: pool(8, () => ({ alive: false, kind: 'frag', x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, fuse: 0, team: '', owner: -1 })),
    smokes: pool(4, () => ({ alive: false, x: 0, y: 0, z: 0, r: 3.1, life: 0 })),
    sparks: pool(4, () => ({ alive: false, x: 0, y: 0, z: 0, life: 0 })),
    tracers: pool(6, () => ({ alive: false, x: 0, y: 0, z: 0, x2: 0, y2: 0, z2: 0, life: 0, team: '' })),
    noises: pool(12, () => ({ x: 0, z: 0, r: 0, team: '', t: -99 })),
    noiseI: 0,
    feed: [
      { t: -99, text: '' },
      { t: -99, text: '' },
      { t: -99, text: '' },
      { t: -99, text: '' },
    ],
    feedI: 0,
    buyOpen: true,
    aim: { x: 1, y: 0, z: 0 },
    perpU: { x: 0, y: 0, z: 1 },
    perpV: { x: 0, y: 1, z: 0 },
    hitMarker: 0,
    hitHead: false,
  };
}

export function pushFeed(world, text) {
  const row = world.feed[world.feedI % world.feed.length];
  row.t = world.time;
  row.text = text;
  world.feedI += 1;
}

export function noise(world, x, z, radius, team) {
  const n = world.noises[world.noiseI % world.noises.length];
  n.x = x;
  n.z = z;
  n.r = radius;
  n.team = team;
  n.t = world.time;
  world.noiseI += 1;
}
