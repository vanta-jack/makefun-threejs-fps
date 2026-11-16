// Hitscan guns, grenades, smoke, and flashes. Damage prefers the head.

import { bodyBlocked, clearLine, rayBlocks } from './map.js';
import { SPEC, currentSpread, eyeHeight, startReload } from './arsenal.js';
import { noise, pushFeed } from './world.js';

const dir = { x: 1, y: 0, z: 0 };

function aimDirection(actor, out) {
  const pitch = actor.pitch + actor.recoilP;
  const yaw = actor.yaw + actor.recoilY;
  const cp = Math.cos(pitch);
  out.x = cp * Math.cos(yaw);
  out.y = Math.sin(pitch);
  out.z = cp * Math.sin(yaw);
}

function spreadDirection(world, actor, out) {
  aimDirection(actor, out);
  const spread = currentSpread(actor);
  actor.spread = spread;
  if (spread <= 0) return;
  const ux = -out.z;
  const uz = out.x;
  const ul = Math.hypot(ux, uz) || 1;
  const px = ux / ul;
  const pz = uz / ul;
  const vx = out.y * pz;
  const vy = out.z * px - out.x * pz;
  const vz = -out.y * px;
  const rx = (Math.random() * 2 - 1) * spread;
  const ry = (Math.random() * 2 - 1) * spread;
  out.x += px * rx + vx * ry;
  out.y += vy * ry;
  out.z += pz * rx + vz * ry;
  const len = Math.hypot(out.x, out.y, out.z) || 1;
  out.x /= len;
  out.y /= len;
  out.z /= len;
}

function take(pool) {
  for (let i = 0; i < pool.length; i++) {
    if (!pool[i].alive) return pool[i];
  }
  return pool[0];
}

function addTracer(world, x, y, z, x2, y2, z2, team) {
  const t = take(world.tracers);
  t.alive = true;
  t.life = 0.08;
  t.x = x;
  t.y = y;
  t.z = z;
  t.x2 = x2;
  t.y2 = y2;
  t.z2 = z2;
  t.team = team;
}

function addSpark(world, x, y, z) {
  const s = take(world.sparks);
  s.alive = true;
  s.life = 0.12;
  s.x = x;
  s.y = y;
  s.z = z;
}

export function dropBomb(world, actor) {
  const bomb = world.bomb;
  if (bomb.state === 'held' && bomb.holder === actor.id) {
    bomb.state = 'dropped';
    bomb.holder = -1;
    bomb.x = actor.x;
    bomb.z = actor.z;
  }
}

export function kill(world, victim, attacker, weaponName) {
  if (!victim.alive) return;
  victim.alive = false;
  victim.health = 0;
  victim.fire = false;
  dropBomb(world, victim);
  const killer = attacker && attacker !== victim ? attacker.name : 'The wharf';
  pushFeed(world, `${killer}   ${weaponName}   ${victim.name}`);
  if (attacker && attacker !== victim && attacker.team !== victim.team) attacker.money += 300;
}

export function hurt(world, victim, amount, part, attacker, weaponName) {
  if (!victim.alive || world.phase !== 'live') return;
  if (attacker && attacker.team === victim.team && attacker !== victim) return;
  let damage = amount;
  if (victim.armor > 0 && part !== 'leg') {
    const blocked = part === 'head' ? (victim.helmet ? 0.28 : 0) : 0.34;
    victim.armor = Math.max(0, victim.armor - damage * 0.55);
    damage *= 1 - blocked;
  }
  victim.health -= damage;
  victim.hitFlash = 0.16;
  if (attacker && attacker.id === 0) {
    world.hitMarker = 0.12;
    world.hitHead = part === 'head';
  }
  if (victim.health <= 0) kill(world, victim, attacker, weaponName);
}

function smokeBlocks(world, x0, y0, z0, x1, y1, z1) {
  const smokes = world.smokes;
  for (let i = 0; i < smokes.length; i++) {
    const s = smokes[i];
    if (!s.alive) continue;
    const dx = x1 - x0;
    const dy = y1 - y0;
    const dz = z1 - z0;
    const len2 = dx * dx + dy * dy + dz * dz || 1;
    let t = ((s.x - x0) * dx + (s.y - y0) * dy + (s.z - z0) * dz) / len2;
    if (t < 0) t = 0;
    else if (t > 1) t = 1;
    const px = x0 + dx * t - s.x;
    const py = y0 + dy * t - s.y;
    const pz = z0 + dz * t - s.z;
    if (px * px + py * py + pz * pz < s.r * s.r) return true;
  }
  return false;
}

function actorHit(actor, ox, oy, oz, dx, dy, dz) {
  if (!actor.alive) return null;
  const feet = actor.y;
  const crouch = actor.crouch;
  const headY = feet + (crouch > 0.5 ? 1.05 : 1.52);
  const head = raySphere(ox, oy, oz, dx, dy, dz, actor.x, headY, actor.z, 0.16);
  if (head !== null) return { t: head, part: 'head' };
  const torso = rayCylinder(ox, oy, oz, dx, dy, dz, actor.x, actor.z, 0.28, feet + 0.72, feet + 1.38);
  if (torso !== null) return { t: torso, part: 'body' };
  const legs = rayCylinder(ox, oy, oz, dx, dy, dz, actor.x, actor.z, 0.2, feet, feet + 0.72);
  if (legs !== null) return { t: legs, part: 'leg' };
  return null;
}

function raySphere(ox, oy, oz, dx, dy, dz, cx, cy, cz, radius) {
  const lx = cx - ox;
  const ly = cy - oy;
  const lz = cz - oz;
  const tca = lx * dx + ly * dy + lz * dz;
  if (tca < 0) return null;
  const d2 = lx * lx + ly * ly + lz * lz - tca * tca;
  const r2 = radius * radius;
  if (d2 > r2) return null;
  const t = tca - Math.sqrt(r2 - d2);
  return t > 0.12 ? t : null;
}

function rayCylinder(ox, oy, oz, dx, dy, dz, cx, cz, radius, y0, y1) {
  const lx = cx - ox;
  const lz = cz - oz;
  const a = dx * dx + dz * dz;
  if (a < 1e-6) return null;
  const b = -2 * (lx * dx + lz * dz);
  const c = lx * lx + lz * lz - radius * radius;
  const disc = b * b - 4 * a * c;
  if (disc < 0) return null;
  const t = (-b - Math.sqrt(disc)) / (2 * a);
  if (t < 0.12) return null;
  const y = oy + dy * t;
  if (y < y0 || y > y1) return null;
  return t;
}

export function pullTrigger(world, actor) {
  const spec = SPEC[actor.equipped];
  if (!spec || spec.kind !== 'gun') return false;
  if (actor.reload > 0 || actor.fireCd > 0 || !actor.alive) return false;
  const mag = actor.mag[actor.equipped];
  if (mag <= 0) {
    actor.fireCd = 0.18;
    startReload(actor);
    return false;
  }
  actor.mag[actor.equipped] = mag - 1;
  actor.fireCd = 60 / spec.rpm;
  actor.shots += 1;
  const side = actor.shots % 2 === 0 ? 1 : -1.35;
  actor.recoilP += spec.recoil * (actor.crouch > 0.5 ? 0.72 : 1);
  actor.recoilY += spec.recoil * 0.42 * side;
  spreadDirection(world, actor, dir);
  const ox = actor.x;
  const oy = eyeHeight(actor);
  const oz = actor.z;
  const wallT = rayBlocks(ox, oy, oz, dir.x, dir.y, dir.z, 80);
  let bestT = wallT;
  let best = null;
  let part = '';
  for (let i = 0; i < world.actors.length; i++) {
    const other = world.actors[i];
    if (other === actor) continue;
    const hit = actorHit(other, ox, oy, oz, dir.x, dir.y, dir.z);
    if (!hit || hit.t >= bestT) continue;
    const hx = ox + dir.x * hit.t;
    const hy = oy + dir.y * hit.t;
    const hz = oz + dir.z * hit.t;
    if (smokeBlocks(world, ox, oy, oz, hx, hy, hz)) continue;
    bestT = hit.t;
    best = other;
    part = hit.part;
  }
  const endX = ox + dir.x * bestT;
  const endY = oy + dir.y * bestT;
  const endZ = oz + dir.z * bestT;
  const startT = Math.max(0.9, bestT - 2.8);
  addTracer(world, ox + dir.x * startT, oy + dir.y * startT, oz + dir.z * startT, endX, endY, endZ, actor.team);
  addSpark(world, endX, endY, endZ);
  noise(world, ox, oz, 24, actor.team);
  if (best) {
    let damage = spec.damage;
    const dist = bestT;
    if (dist > spec.falloff) damage *= Math.max(0.42, 1 - (dist - spec.falloff) / 36);
    if (part === 'head') damage *= spec.head;
    else if (part === 'leg') damage *= 0.74;
    hurt(world, best, damage, part, actor, spec.name);
  }
  return true;
}

export function triggerHeld(world, actor) {
  if (world.phase !== 'live' || !actor.alive) return;
  const spec = SPEC[actor.equipped];
  if (!spec) return;
  if (spec.kind === 'grenade') {
    if (actor.fire && !actor.wasFire) throwGrenade(world, actor);
    return;
  }
  const pulled = spec.auto ? actor.fire : actor.fire && !actor.wasFire;
  if (pulled) pullTrigger(world, actor);
  else if (actor.wantReload) startReload(actor);
}

export function throwGrenade(world, actor) {
  const id = actor.equipped;
  const spec = SPEC[id];
  if (!spec || spec.kind !== 'grenade' || actor.nades[id] <= 0) return;
  actor.nades[id] -= 1;
  const grenade = take(world.nades);
  aimDirection(actor, dir);
  grenade.alive = true;
  grenade.kind = id;
  grenade.team = actor.team;
  grenade.owner = actor.id;
  grenade.fuse = spec.fuse;
  grenade.x = actor.x + dir.x * 0.5;
  grenade.y = eyeHeight(actor) - 0.1;
  grenade.z = actor.z + dir.z * 0.5;
  grenade.vx = dir.x * 11.5 + actor.vx;
  grenade.vy = dir.y * 11.5 + 1.4;
  grenade.vz = dir.z * 11.5 + actor.vz;
  if (actor.primary) actor.equipped = actor.primary;
  else actor.equipped = 'spit';
}

export function tickProjectiles(world, dt) {
  for (let i = 0; i < world.nades.length; i++) {
    const grenade = world.nades[i];
    if (!grenade.alive) continue;
    grenade.vy -= 15.5 * dt;
    grenade.fuse -= dt;
    stepGrenade(grenade, dt);
    if (grenade.fuse <= 0) detonate(world, grenade);
  }
  fade(world.smokes, dt);
  fade(world.sparks, dt);
  fade(world.tracers, dt);
}

function fade(list, dt) {
  for (let i = 0; i < list.length; i++) {
    if (!list[i].alive) continue;
    list[i].life -= dt;
    if (list[i].life <= 0) list[i].alive = false;
  }
}

function stepGrenade(grenade, dt) {
  grenade.x += grenade.vx * dt;
  if (bodyBlocked(grenade.x, grenade.y, grenade.z, 0.1, 0.2)) {
    grenade.x -= grenade.vx * dt;
    grenade.vx *= -0.42;
  }
  grenade.z += grenade.vz * dt;
  if (bodyBlocked(grenade.x, grenade.y, grenade.z, 0.1, 0.2)) {
    grenade.z -= grenade.vz * dt;
    grenade.vz *= -0.42;
  }
  grenade.y += grenade.vy * dt;
  if (grenade.y < 0.08) {
    grenade.y = 0.08;
    grenade.vy = Math.abs(grenade.vy) * 0.34;
    grenade.vx *= 0.72;
    grenade.vz *= 0.72;
  } else if (bodyBlocked(grenade.x, grenade.y, grenade.z, 0.1, 0.2)) {
    grenade.y -= grenade.vy * dt;
    grenade.vy *= -0.3;
  }
}

function detonate(world, grenade) {
  grenade.alive = false;
  if (grenade.kind === 'smoke') {
    const smoke = take(world.smokes);
    smoke.alive = true;
    smoke.x = grenade.x;
    smoke.y = 1.3;
    smoke.z = grenade.z;
    smoke.r = 3.15;
    smoke.life = 14;
    return;
  }
  if (grenade.kind === 'flash') {
    burstFlash(world, grenade);
    return;
  }
  addSpark(world, grenade.x, grenade.y + 0.4, grenade.z);
  noise(world, grenade.x, grenade.z, 18, grenade.team);
  const owner = world.actors[grenade.owner] || null;
  for (let i = 0; i < world.actors.length; i++) {
    const actor = world.actors[i];
    if (!actor.alive) continue;
    const dx = actor.x - grenade.x;
    const dy = eyeHeight(actor) - grenade.y;
    const dz = actor.z - grenade.z;
    const dist = Math.hypot(dx, dy, dz);
    if (dist > 6.4) continue;
    if (!clearLine(grenade.x, grenade.y, grenade.z, actor.x, eyeHeight(actor), actor.z)) continue;
    if (smokeBlocks(world, grenade.x, grenade.y, grenade.z, actor.x, eyeHeight(actor), actor.z)) continue;
    hurt(world, actor, 96 * (1 - dist / 6.4), 'body', owner, 'Cinder pot');
  }
}

function burstFlash(world, grenade) {
  addSpark(world, grenade.x, grenade.y, grenade.z);
  for (let i = 0; i < world.actors.length; i++) {
    const actor = world.actors[i];
    if (!actor.alive) continue;
    const dx = grenade.x - actor.x;
    const dy = grenade.y - eyeHeight(actor);
    const dz = grenade.z - actor.z;
    const dist = Math.hypot(dx, dy, dz);
    if (dist > 16 || dist < 0.01) continue;
    const pitch = actor.pitch;
    const cp = Math.cos(pitch);
    const lx = cp * Math.cos(actor.yaw);
    const ly = Math.sin(pitch);
    const lz = cp * Math.sin(actor.yaw);
    const dot = (dx * lx + dy * ly + dz * lz) / dist;
    if (dot < 0.25) continue;
    if (!clearLine(actor.x, eyeHeight(actor), actor.z, grenade.x, grenade.y, grenade.z)) continue;
    actor.blind = Math.max(actor.blind, 2.4 * (1 - dist / 16) * dot);
  }
}

export function sees(world, from, to) {
  if (!to.alive || from.blind > 0.2) return false;
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const dist = Math.hypot(dx, dz);
  if (dist > 34) return false;
  const yaw = Math.atan2(dz, dx);
  let diff = yaw - from.yaw;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  if (Math.abs(diff) > 0.95 && dist > 2.5) return false;
  const y0 = eyeHeight(from);
  const y1 = to.y + 1.2;
  if (smokeBlocks(world, from.x, y0, from.z, to.x, y1, to.z)) return false;
  return clearLine(from.x, y0, from.z, to.x, y1, to.z);
}
