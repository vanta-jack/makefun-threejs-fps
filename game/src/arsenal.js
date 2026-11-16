// Weapon, gear, and grenade definitions, plus buying and reload timing.

export const SPEC = {
  spit: {
    name: 'Spit', kind: 'gun', auto: false, rpm: 420, damage: 27, head: 3.6,
    mag: 12, reserve: 48, reload: 1.45, spread: 0.0075, move: 0.0048, air: 0.055,
    recoil: 0.02, price: 200, falloff: 16,
  },
  lath: {
    name: 'Lath', kind: 'gun', auto: true, rpm: 580, damage: 34, head: 3.95,
    mag: 25, reserve: 75, reload: 2.15, spread: 0.0026, move: 0.0072, air: 0.05,
    recoil: 0.0135, price: 2700, falloff: 22,
  },
  chatter: {
    name: 'Chatter', kind: 'gun', auto: true, rpm: 880, damage: 19, head: 2.05,
    mag: 30, reserve: 90, reload: 1.65, spread: 0.013, move: 0.0028, air: 0.042,
    recoil: 0.0065, price: 1500, falloff: 12,
  },
  frag: { name: 'Cinder pot', kind: 'grenade', price: 300, fuse: 1.55 },
  smoke: { name: 'Soot can', kind: 'grenade', price: 300, fuse: 1.05 },
  flash: { name: 'Flare', kind: 'grenade', price: 200, fuse: 1.15 },
};

export const GEAR = { armor: 650, helm: 1000, kit: 400 };

export function priceOf(id) {
  if (GEAR[id]) return GEAR[id];
  return SPEC[id] ? SPEC[id].price : 0;
}

export function freshGuns(actor) {
  actor.primary = '';
  actor.equipped = 'spit';
  actor.mag.spit = SPEC.spit.mag;
  actor.mag.lath = 0;
  actor.mag.chatter = 0;
  actor.reserve.spit = SPEC.spit.reserve;
  actor.reserve.lath = 0;
  actor.reserve.chatter = 0;
  actor.nades.frag = 0;
  actor.nades.smoke = 0;
  actor.nades.flash = 0;
  actor.armor = 0;
  actor.helmet = false;
  actor.kit = false;
  actor.reload = 0;
  actor.fireCd = 0;
  actor.shots = 0;
  actor.recoilP = 0;
  actor.recoilY = 0;
}

export function refillGuns(actor) {
  for (const id of ['spit', 'lath', 'chatter']) {
    if (id !== 'spit' && actor.primary !== id) continue;
    actor.mag[id] = SPEC[id].mag;
    actor.reserve[id] = SPEC[id].reserve;
  }
  actor.reload = 0;
  actor.fireCd = 0;
}

export function buy(actor, id) {
  if (id === 'armor' || id === 'helm' || id === 'kit') {
    const price = GEAR[id];
    if (actor.money < price) return false;
    if (id === 'kit') {
      if (actor.team !== 'brine' || actor.kit) return false;
      actor.kit = true;
    } else if (actor.armor >= 100 && (id === 'armor' || actor.helmet)) {
      return false;
    } else {
      actor.armor = 100;
      if (id === 'helm') actor.helmet = true;
    }
    actor.money -= price;
    return true;
  }
  const spec = SPEC[id];
  if (!spec || actor.money < spec.price) return false;
  if (spec.kind === 'gun') {
    if (actor.primary === id) return false;
    actor.primary = id;
    actor.mag[id] = spec.mag;
    actor.reserve[id] = spec.reserve;
    actor.equipped = id;
    actor.reload = 0;
    actor.money -= spec.price;
    return true;
  }
  if (spec.kind === 'grenade') {
    if (actor.nades[id] >= 1) return false;
    actor.nades[id] = 1;
    actor.money -= spec.price;
    return true;
  }
  return false;
}

export function autobuy(actor) {
  if (!actor.primary && actor.money >= SPEC.lath.price) buy(actor, 'lath');
  else if (!actor.primary && actor.money >= SPEC.chatter.price) buy(actor, 'chatter');
  if (actor.armor < 50 && actor.money >= GEAR.helm) buy(actor, 'helm');
  else if (actor.armor < 50 && actor.money >= GEAR.armor) buy(actor, 'armor');
  if (actor.nades.frag < 1 && actor.money >= SPEC.frag.price) buy(actor, 'frag');
  if (actor.team === 'brine' && !actor.kit && actor.money >= GEAR.kit) buy(actor, 'kit');
  if (actor.nades.smoke < 1 && actor.money >= SPEC.smoke.price) buy(actor, 'smoke');
}

export function equip(actor, slot) {
  actor.reload = 0;
  if (slot === 'primary') {
    if (actor.primary) actor.equipped = actor.primary;
    return;
  }
  if (slot === 'side') {
    actor.equipped = 'spit';
    return;
  }
  const order = ['frag', 'smoke', 'flash'];
  let start = order.indexOf(actor.equipped);
  for (let k = 1; k <= 3; k++) {
    const id = order[(start + k) % 3];
    if (actor.nades[id] > 0) {
      actor.equipped = id;
      return;
    }
  }
}

export function tickGun(actor, dt) {
  if (actor.fireCd > 0) actor.fireCd -= dt;
  if (actor.reload > 0) {
    actor.reload -= dt;
    if (actor.reload <= 0) finishReload(actor);
  }
  const decay = Math.exp(-8 * dt);
  actor.recoilP *= decay;
  actor.recoilY *= decay;
  if (actor.blind > 0) actor.blind -= dt;
  if (actor.hitFlash > 0) actor.hitFlash -= dt;
}

function finishReload(actor) {
  const id = actor.equipped;
  const spec = SPEC[id];
  if (!spec || spec.kind !== 'gun') return;
  const need = spec.mag - actor.mag[id];
  const take = Math.max(0, Math.min(need, actor.reserve[id]));
  actor.mag[id] += take;
  actor.reserve[id] -= take;
}

export function startReload(actor) {
  const spec = SPEC[actor.equipped];
  if (!spec || spec.kind !== 'gun' || actor.reload > 0) return;
  if (actor.mag[actor.equipped] >= spec.mag) return;
  if (actor.reserve[actor.equipped] <= 0) return;
  actor.reload = spec.reload;
}

export function currentSpread(actor) {
  const spec = SPEC[actor.equipped];
  if (!spec || spec.kind !== 'gun') return 0.01;
  const speed = Math.hypot(actor.vx, actor.vz);
  let spread = spec.spread;
  if (!actor.onGround) spread = spec.air;
  else if (actor.crouch > 0.55 && speed < 0.45) spread *= 0.58;
  else if (actor.wantWalk && speed < 3.2) spread *= 0.82;
  else spread += speed * spec.move;
  spread += actor.recoilP * 0.45;
  return spread;
}

export function eyeHeight(actor) {
  return actor.y + 1.62 + (1.02 - 1.62) * actor.crouch;
}
