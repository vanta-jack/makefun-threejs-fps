// Deterministic frames for the four screenshots. The live game never calls this.

import { eyeHeight } from './arsenal.js';
import { pullTrigger } from './combat.js';

export function pose(world, shot) {
  const player = world.actors[0];
  const moss = world.actors[1];
  const quill = world.actors[2];
  const hake = world.actors[3];
  const marrow = world.actors[4];
  const silt = world.actors[5];
  if (shot === 'buy') poseBuy(world, player, moss, quill);
  else if (shot === 'plant') posePlant(world, player, hake);
  else if (shot === 'score') poseScore(world, player, hake, marrow);
  else poseLane(world, player, moss, hake, silt);
  for (let i = 0; i < world.actors.length; i++) {
    const actor = world.actors[i];
    actor.px = actor.x;
    actor.py = actor.y;
    actor.pz = actor.z;
    actor.vx = 0;
    actor.vz = 0;
    actor.onGround = true;
  }
}

function poseBuy(world, player, moss, quill) {
  world.phase = 'freeze';
  world.phaseLeft = 6.4;
  world.buyOpen = true;
  world.roundIndex = 2;
  world.score.cinder = 1;
  world.score.brine = 0;
  world.roundLeft = 90;
  stand(player, -17.2, 0.2, 0.18, 0);
  player.money = 4050;
  stand(moss, -14.6, -1.6, 0.4, 0);
  stand(quill, -18.6, 2.2, 0.1, 0);
  moss.primary = 'chatter';
  moss.equipped = 'chatter';
  moss.mag.chatter = 30;
}

function poseLane(world, player, moss, hake, silt) {
  world.phase = 'live';
  world.buyOpen = false;
  world.roundLeft = 42;
  world.score.cinder = 3;
  world.score.brine = 2;
  world.time = 18;
  stand(player, -7.6, -10.45, 0, 0);
  arm(player, 'lath', 21, 64);
  player.health = 78;
  player.armor = 100;
  player.helmet = true;
  player.money = 900;
  stand(moss, -9.3, -12.15, 0.35, 0);
  arm(moss, 'lath', 20, 75);
  stand(hake, -4.15, -10.35, Math.PI, 0);
  arm(hake, 'lath', 16, 50);
  hake.health = 100;
  stand(silt, 6.8, -9.7, Math.PI, 0);
  arm(silt, 'chatter', 22, 60);
  aim(player, hake.x, 1.2, hake.z);
  aim(hake, player.x, 1.35, player.z);
  pullTrigger(world, player);
}

function posePlant(world, player, hake) {
  world.phase = 'live';
  world.buyOpen = false;
  world.roundLeft = 51;
  world.score.cinder = 3;
  world.score.brine = 2;
  world.time = 8.2;
  stand(player, 0.15, -9.15, 0, -0.08);
  arm(player, 'lath', 11, 50);
  player.health = 64;
  player.armor = 40;
  player.money = 1400;
  world.bomb.state = 'planted';
  world.bomb.holder = -1;
  world.bomb.site = 'A';
  world.bomb.x = 2.55;
  world.bomb.z = -11.15;
  world.bomb.fuse = 27.4;
  const smoke = world.smokes[0];
  smoke.alive = true;
  smoke.life = 10;
  smoke.r = 3.1;
  smoke.x = 5.6;
  smoke.y = 1.25;
  smoke.z = -13.4;
  stand(hake, 7.6, -9.35, Math.PI * 0.92, 0);
  arm(hake, 'lath', 9, 40);
  hake.health = 70;
  aim(player, 4.2, 1.05, -10.7);
}

function poseScore(world, player, hake, marrow) {
  world.phase = 'post';
  world.buyOpen = false;
  world.winner = 'cinder';
  world.reason = 'The kiln charge blew';
  world.score.cinder = 4;
  world.score.brine = 2;
  world.phaseLeft = 4.2;
  world.roundLeft = 0;
  world.time = 40;
  stand(player, 0.8, -7.35, 0.55, -0.12);
  arm(player, 'lath', 6, 40);
  player.health = 41;
  player.armor = 15;
  stand(hake, 3.1, -11.4, 0.4, 0);
  hake.alive = false;
  hake.health = 0;
  stand(marrow, 5.4, -12.6, 1.1, 0);
  marrow.alive = false;
  world.bomb.state = 'blown';
  world.feed[0].t = world.time;
  world.feed[0].text = 'The kiln charge blew';
  world.feedI = 1;
  aim(player, 3.4, 0.7, -11.6);
}

function stand(actor, x, z, yaw, pitch) {
  actor.x = x;
  actor.z = z;
  actor.y = 0;
  actor.yaw = yaw;
  actor.pitch = pitch;
  actor.alive = true;
  actor.crouch = 0;
  actor.recoilP = 0;
  actor.recoilY = 0;
}

function arm(actor, id, mag, reserve) {
  actor.primary = id;
  actor.equipped = id;
  actor.mag[id] = mag;
  actor.reserve[id] = reserve;
}

function aim(actor, x, y, z) {
  const dx = x - actor.x;
  const dy = y - eyeHeight(actor);
  const dz = z - actor.z;
  actor.yaw = Math.atan2(dz, dx);
  actor.pitch = Math.atan2(dy, Math.hypot(dx, dz));
  actor.recoilP = 0;
  actor.recoilY = 0;
}
