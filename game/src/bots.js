// Opponents walk the waypoint graph, hold angles, and shoot what they see or hear.

import { POINTS, hop, nearest, siteOf } from './map.js';
import { eyeHeight } from './arsenal.js';
import { sees, throwGrenade } from './combat.js';

const DUTY = { 1: 7, 2: 13, 3: 8, 4: 14, 5: 11 };

export function assignDuties(world) {
  for (let i = 0; i < world.actors.length; i++) {
    const actor = world.actors[i];
    if (!actor.bot) continue;
    actor.hold = DUTY[actor.id];
    actor.goal = actor.hold;
    actor.node = nearest(actor.x, actor.z);
    actor.to = hop(actor.node, actor.goal);
    actor.fight = -1;
    actor.burstUntil = 0;
    actor.burstCd = 0.2 + actor.id * 0.05;
  }
}

export function think(world, actor, dt) {
  actor.thinkT -= dt;
  actor.burstCd -= dt;
  actor.nadeCd -= dt;
  actor.fire = false;
  actor.use = false;
  if (actor.thinkT <= 0) {
    actor.thinkT = 0.12;
    sense(world, actor);
    chooseGoal(world, actor);
  }
  if (actor.fight >= 0) engage(world, actor);
  else steer(actor);
  useBomb(world, actor);
}

function sense(world, actor) {
  let seen = -1;
  let seenDist = 1e9;
  for (let i = 0; i < world.actors.length; i++) {
    const other = world.actors[i];
    if (other.team === actor.team) continue;
    if (!sees(world, actor, other)) continue;
    const dist = (other.x - actor.x) ** 2 + (other.z - actor.z) ** 2;
    if (dist < seenDist) {
      seenDist = dist;
      seen = other.id;
    }
  }
  actor.fight = seen;
  if (seen >= 0) {
    actor.seenX = world.actors[seen].x;
    actor.seenZ = world.actors[seen].z;
    return;
  }
  const noises = world.noises;
  for (let i = 0; i < noises.length; i++) {
    const n = noises[i];
    if (world.time - n.t > 1.4 || n.team === actor.team) continue;
    const dx = n.x - actor.x;
    const dz = n.z - actor.z;
    if (dx * dx + dz * dz > n.r * n.r) continue;
    actor.goal = nearest(n.x, n.z);
    actor.to = hop(actor.node, actor.goal);
    return;
  }
}

function chooseGoal(world, actor) {
  if (actor.fight >= 0) return;
  const bomb = world.bomb;
  if (bomb.state === 'planted' && actor.team === 'brine') {
    actor.goal = bomb.site === 'A' ? 7 : 15;
  } else if (bomb.state === 'dropped' && actor.team === 'cinder') {
    actor.goal = nearest(bomb.x, bomb.z);
  } else if (bomb.state === 'held' && bomb.holder === actor.id && actor.team === 'cinder') {
    const here = siteOf(actor.x, actor.z);
    actor.goal = here === 'B' ? 15 : 7;
  } else {
    actor.goal = actor.hold;
  }
  if (actor.to < 0) actor.to = hop(actor.node, actor.goal);
}

function engage(world, actor) {
  const target = world.actors[actor.fight];
  if (!target || !target.alive) {
    actor.fight = -1;
    return;
  }
  const aimY = target.y + (target.crouch > 0.5 ? 1.02 : 1.48);
  const dx = target.x - actor.x;
  const dy = aimY - eyeHeight(actor);
  const dz = target.z - actor.z;
  const flat = Math.hypot(dx, dz) || 0.001;
  actor.yaw = Math.atan2(dz, dx);
  actor.pitch = Math.atan2(dy, flat);
  const wobble = 0.006 + flat * 0.00035;
  actor.yaw += Math.sin(world.time * 4.5 + actor.id) * wobble;
  actor.pitch += Math.cos(world.time * 3.2 + actor.id) * wobble * 0.6;
  actor.wishF = flat > 12 ? 1 : flat < 4 ? -0.55 : 0;
  actor.wishS = Math.sin(world.time * 1.6 + actor.id * 1.7) * 0.75;
  actor.wantWalk = flat > 16;
  actor.wantCrouch = flat > 7 && flat < 18;
  if (actor.burstCd <= 0) {
    actor.burstUntil = world.time + 0.16 + (actor.id % 3) * 0.04;
    actor.burstCd = 0.32 + flat * 0.012;
  }
  actor.fire = world.time < actor.burstUntil && actor.blind <= 0 && actor.reload <= 0;
  if (actor.nadeCd <= 0 && actor.nades.frag > 0 && flat < 12 && flat > 4.5) {
    const previous = actor.equipped;
    actor.equipped = 'frag';
    throwGrenade(world, actor);
    actor.equipped = previous || 'spit';
    actor.nadeCd = 6;
  }
}

function steer(actor) {
  actor.wantCrouch = false;
  actor.wantWalk = false;
  if (actor.to < 0) {
    actor.wishF = 0;
    actor.wishS = 0;
    actor.wantCrouch = actor.team === 'brine';
    const look = POINTS[actor.goal] || POINTS[actor.hold];
    if (look) {
      const away = actor.team === 'brine' ? Math.PI : 0;
      actor.yaw += (away - actor.yaw) * 0.05;
    }
    return;
  }
  const point = POINTS[actor.to];
  const dx = point[0] - actor.x;
  const dz = point[1] - actor.z;
  if (dx * dx + dz * dz < 0.64) {
    actor.node = actor.to;
    actor.to = hop(actor.node, actor.goal);
    if (actor.to < 0) {
      actor.wishF = 0;
      actor.wishS = 0;
      return;
    }
  }
  const next = POINTS[actor.to];
  actor.yaw = Math.atan2(next[1] - actor.z, next[0] - actor.x);
  actor.pitch = 0;
  actor.wishF = 1;
  actor.wishS = 0;
}

function useBomb(world, actor) {
  const bomb = world.bomb;
  if (actor.fight >= 0) return;
  if (actor.team === 'cinder' && bomb.state === 'held' && bomb.holder === actor.id && siteOf(actor.x, actor.z)) {
    actor.use = true;
    actor.wishF = 0;
    actor.wishS = 0;
  }
  if (actor.team === 'brine' && bomb.state === 'planted') {
    const dx = bomb.x - actor.x;
    const dz = bomb.z - actor.z;
    if (dx * dx + dz * dz < 2.6) {
      actor.use = true;
      actor.wishF = 0;
      actor.wishS = 0;
    }
  }
}
