// Acceleration, friction, jump, crouch, and map collision. Reads wish inputs, writes velocity.

import { bodyBlocked } from './map.js';
import { noise } from './world.js';

const RADIUS = 0.32;

function bodyHeight(actor) {
  return actor.crouch > 0.55 ? 1.12 : 1.74;
}

function shove(actor, dx, dy, dz) {
  const height = bodyHeight(actor);
  if (dx !== 0) {
    actor.x += dx;
    if (bodyBlocked(actor.x, actor.y, actor.z, RADIUS, height)) {
      actor.x -= dx;
      actor.vx = 0;
    }
  }
  if (dz !== 0) {
    actor.z += dz;
    if (bodyBlocked(actor.x, actor.y, actor.z, RADIUS, height)) {
      actor.z -= dz;
      actor.vz = 0;
    }
  }
  if (dy !== 0) {
    actor.y += dy;
    if (actor.y < 0) {
      actor.y = 0;
      actor.vy = 0;
      actor.onGround = true;
    } else if (bodyBlocked(actor.x, actor.y, actor.z, RADIUS, height)) {
      actor.y -= dy;
      actor.vy = 0;
    } else {
      actor.onGround = false;
    }
  }
}

export function integrate(world, actor, dt) {
  if (!actor.alive || world.phase !== 'live') {
    actor.vx = 0;
    actor.vz = 0;
    return;
  }
  let wishF = actor.wishF;
  let wishS = actor.wishS;
  const wishLen = Math.hypot(wishF, wishS);
  if (wishLen > 1) {
    wishF /= wishLen;
    wishS /= wishLen;
  }
  const yaw = actor.yaw;
  const fx = Math.cos(yaw);
  const fz = Math.sin(yaw);
  const rx = -Math.sin(yaw);
  const rz = Math.cos(yaw);
  const wx = fx * wishF + rx * wishS;
  const wz = fz * wishF + rz * wishS;
  const standTarget = actor.wantCrouch ? 1 : 0;
  if (standTarget < actor.crouch && bodyBlocked(actor.x, actor.y, actor.z, RADIUS, 1.74)) {
    actor.crouch += (Math.max(standTarget, 0.72) - actor.crouch) * Math.min(1, dt * 10);
  } else {
    actor.crouch += (standTarget - actor.crouch) * Math.min(1, dt * 12);
  }
  const cap = actor.crouch > 0.5 ? 2.2 : actor.wantWalk ? 2.85 : actor.equipped === 'lath' ? 5.05 : 5.4;
  const rate = actor.onGround ? 12 : 2.4;
  const blend = Math.min(1, rate * dt);
  actor.vx += (wx * cap - actor.vx) * blend;
  actor.vz += (wz * cap - actor.vz) * blend;
  if (actor.onGround && actor.wantJump) {
    actor.vy = 5.65;
    actor.onGround = false;
    actor.wantJump = false;
  }
  if (!actor.onGround) actor.vy -= 17.2 * dt;
  shove(actor, actor.vx * dt, 0, 0);
  shove(actor, 0, 0, actor.vz * dt);
  shove(actor, 0, actor.vy * dt, 0);
  if (actor.onGround && !actor.wantWalk) {
    actor.step += Math.hypot(actor.vx, actor.vz) * dt;
    if (actor.step > 2.7) {
      actor.step = 0;
      noise(world, actor.x, actor.z, 7.5, actor.team);
    }
  }
}

export function separate(world) {
  const actors = world.actors;
  for (let i = 0; i < actors.length; i++) {
    const a = actors[i];
    if (!a.alive) continue;
    for (let j = i + 1; j < actors.length; j++) {
      const b = actors[j];
      if (!b.alive) continue;
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const dist = Math.hypot(dx, dz);
      if (dist >= 0.66 || dist < 0.0001) continue;
      const push = (0.66 - dist) * 0.5;
      const nx = dx / dist;
      const nz = dz / dist;
      a.x -= nx * push;
      a.z -= nz * push;
      b.x += nx * push;
      b.z += nz * push;
    }
  }
}
