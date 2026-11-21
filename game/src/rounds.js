// Freeze, live clock, bomb plant and defuse, and the cash paid between rounds.

import { SPAWNS, siteOf } from './map.js';
import { autobuy, freshGuns, refillGuns } from './arsenal.js';
import { assignDuties } from './bots.js';
import { noise, pushFeed } from './world.js';

const PLANT_TIME = 3;
const DEFUSE_TIME = 5;
const KIT_TIME = 3.15;

export function prepareRound(world, resetEconomy) {
  for (let i = 0; i < world.actors.length; i++) {
    const actor = world.actors[i];
    const spawn = SPAWNS[actor.team][actor.slot];
    actor.x = spawn[0];
    actor.y = 0;
    actor.z = spawn[1];
    actor.vx = 0;
    actor.vy = 0;
    actor.vz = 0;
    actor.alive = true;
    actor.health = 100;
    actor.yaw = actor.team === 'cinder' ? 0.2 : Math.PI - 0.2;
    actor.pitch = 0;
    actor.crouch = 0;
    actor.blind = 0;
    actor.hitFlash = 0;
    actor.fire = false;
    actor.use = false;
    if (resetEconomy || actor.died) {
      if (resetEconomy) {
        actor.money = 800;
        freshGuns(actor);
      } else {
        actor.armor = 0;
        actor.helmet = false;
      }
      actor.died = false;
    }
    refillGuns(actor);
    if (actor.bot) autobuy(actor);
  }
  const player = world.actors[0];
  world.bomb.state = 'held';
  world.bomb.holder = 0;
  world.bomb.x = player.x;
  world.bomb.z = player.z;
  world.bomb.site = '';
  world.bomb.fuse = 35;
  world.bomb.plant = 0;
  world.bomb.defuse = 0;
  world.winner = '';
  world.reason = '';
  world.phase = 'freeze';
  world.phaseLeft = 8;
  world.roundLeft = 90;
  world.buyOpen = true;
  clearPool(world.nades);
  clearPool(world.smokes);
  clearPool(world.sparks);
  clearPool(world.tracers);
  assignDuties(world);
}

function clearPool(list) {
  for (let i = 0; i < list.length; i++) list[i].alive = false;
}

export function stepRound(world, dt) {
  if (world.phase === 'freeze') {
    world.phaseLeft -= dt;
    if (world.phaseLeft <= 0) {
      world.phase = 'live';
      world.buyOpen = false;
      world.roundLeft = 90;
      pushFeed(world, `Round ${world.roundIndex}`);
    }
    return;
  }
  if (world.phase === 'post') {
    world.phaseLeft -= dt;
    if (world.phaseLeft <= 0) {
      world.roundIndex += 1;
      const reset = world.matchOver;
      world.matchOver = false;
      if (reset) {
        world.score.cinder = 0;
        world.score.brine = 0;
      }
      prepareRound(world, reset);
    }
    return;
  }
  world.roundLeft -= dt;
  stepBomb(world, dt);
  if (world.winner) return;
  let cinder = 0;
  let brine = 0;
  for (let i = 0; i < world.actors.length; i++) {
    const actor = world.actors[i];
    if (!actor.alive) continue;
    if (actor.team === 'cinder') cinder += 1;
    else brine += 1;
  }
  if (brine === 0) endRound(world, 'cinder', 'Cinder cleared the wharf');
  else if (cinder === 0 && world.bomb.state !== 'planted') endRound(world, 'brine', 'Brine held the lanes');
  else if (world.roundLeft <= 0 && world.bomb.state !== 'planted') endRound(world, 'brine', 'Time called');
}

function stepBomb(world, dt) {
  const bomb = world.bomb;
  if (bomb.state === 'dropped') {
    for (let i = 0; i < world.actors.length; i++) {
      const actor = world.actors[i];
      if (!actor.alive || actor.team !== 'cinder') continue;
      const dx = actor.x - bomb.x;
      const dz = actor.z - bomb.z;
      if (dx * dx + dz * dz < 1.6) {
        bomb.state = 'held';
        bomb.holder = actor.id;
        pushFeed(world, `${actor.name} took the charge`);
        break;
      }
    }
  }
  let planting = null;
  let defusing = null;
  for (let i = 0; i < world.actors.length; i++) {
    const actor = world.actors[i];
    if (!actor.alive || !actor.use) continue;
    if (actor.team === 'cinder' && bomb.state === 'held' && bomb.holder === actor.id && siteOf(actor.x, actor.z)) {
      planting = actor;
    }
    if (actor.team === 'brine' && bomb.state === 'planted') {
      const dx = actor.x - bomb.x;
      const dz = actor.z - bomb.z;
      if (dx * dx + dz * dz < 2.4) defusing = actor;
    }
  }
  if (planting) {
    bomb.plant += dt;
    planting.vx = 0;
    planting.vz = 0;
    if (bomb.plant >= PLANT_TIME) plant(world, planting);
  } else if (bomb.plant > 0) bomb.plant = Math.max(0, bomb.plant - dt * 1.6);
  if (bomb.state !== 'planted') {
    bomb.defuse = 0;
    return;
  }
  if (defusing) {
    bomb.defuse += dt;
    defusing.vx = 0;
    defusing.vz = 0;
    const need = defusing.kit ? KIT_TIME : DEFUSE_TIME;
    if (bomb.defuse >= need) {
      bomb.state = 'defused';
      defusing.money += 300;
      pushFeed(world, `${defusing.name} defused at ${bomb.site}`);
      endRound(world, 'brine', 'Charge defused');
    }
  } else if (bomb.defuse > 0) bomb.defuse = Math.max(0, bomb.defuse - dt * 1.4);
  if (world.winner) return;
  bomb.fuse -= dt;
  if (bomb.fuse <= 0) {
    bomb.state = 'blown';
    noise(world, bomb.x, bomb.z, 30, 'cinder');
    for (let i = 0; i < world.actors.length; i++) {
      const actor = world.actors[i];
      if (!actor.alive) continue;
      const dx = actor.x - bomb.x;
      const dz = actor.z - bomb.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 8) actor.health = 0, actor.alive = false;
    }
    endRound(world, 'cinder', 'The kiln charge blew');
  }
}

function plant(world, actor) {
  const bomb = world.bomb;
  bomb.state = 'planted';
  bomb.holder = -1;
  bomb.site = siteOf(actor.x, actor.z) || 'A';
  bomb.x = actor.x;
  bomb.z = actor.z;
  bomb.fuse = 35;
  bomb.plant = PLANT_TIME;
  bomb.defuse = 0;
  actor.money += 300;
  noise(world, actor.x, actor.z, 16, actor.team);
  pushFeed(world, `${actor.name} planted at ${bomb.site}`);
  world.actors.forEach((other) => {
    if (other.bot && other.team === 'brine') other.goal = bomb.site === 'A' ? 7 : 15;
  });
}

export function endRound(world, team, reason) {
  if (world.winner || world.phase !== 'live') return;
  world.winner = team;
  world.reason = reason;
  world.phase = 'post';
  world.phaseLeft = 5.2;
  world.buyOpen = false;
  world.score[team] += 1;
  const loser = team === 'cinder' ? 'brine' : 'cinder';
  world.loss[loser] += 1;
  world.loss[team] = 0;
  const lossPay = [1400, 1900, 2400, 2900][Math.min(3, world.loss[loser] - 1)];
  for (let i = 0; i < world.actors.length; i++) {
    const actor = world.actors[i];
    actor.money += actor.team === team ? 3250 : lossPay;
    if (!actor.alive) actor.died = true;
    actor.fire = false;
    actor.use = false;
  }
  if (world.score[team] >= 8) {
    world.matchOver = true;
    world.reason = `${reason}. ${team === 'cinder' ? 'Cinder' : 'Brine'} takes the wharf`;
  }
  pushFeed(world, world.reason);
}

export function playerNearBomb(world) {
  const actor = world.actors[0];
  const bomb = world.bomb;
  if (bomb.state === 'held' && bomb.holder === 0) return siteOf(actor.x, actor.z);
  const dx = actor.x - bomb.x;
  const dz = actor.z - bomb.z;
  if (dx * dx + dz * dz > 2.6) return '';
  return bomb.state;
}
