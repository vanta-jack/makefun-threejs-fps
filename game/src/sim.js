// Fixed-step simulation. Rendering never calls into here mid-frame.

import { tickGun } from './arsenal.js';
import { think } from './bots.js';
import { tickProjectiles, triggerHeld } from './combat.js';
import { integrate, separate } from './motor.js';
import { stepRound } from './rounds.js';

export function simulate(world, dt) {
  world.time += dt;
  const live = world.phase === 'live';
  for (let i = 0; i < world.actors.length; i++) {
    const actor = world.actors[i];
    actor.px = actor.x;
    actor.py = actor.y;
    actor.pz = actor.z;
    if (!actor.alive) continue;
    tickGun(actor, dt);
    if (!live) {
      actor.fire = false;
      actor.vx = 0;
      actor.vz = 0;
      continue;
    }
    if (actor.bot) think(world, actor, dt);
    integrate(world, actor, dt);
    triggerHeld(world, actor);
    actor.wasFire = actor.fire;
    actor.wantReload = false;
  }
  if (live) separate(world);
  tickProjectiles(world, dt);
  stepRound(world, dt);
  if (world.hitMarker > 0) world.hitMarker -= dt;
}
