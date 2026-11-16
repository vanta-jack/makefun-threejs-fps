// Keyboard, mouse look, and the buy keys. Pointer lock is requested by the deploy button.

import { buy, equip } from './arsenal.js';

export function bindInput(target, world) {
  const held = new Set();
  let mouse = false;
  let toss = false;
  const player = () => world.actors[0];

  target.addEventListener('contextmenu', (event) => event.preventDefault());
  document.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    held.add(event.code);
    const actor = player();
    if (event.code === 'KeyB' && world.phase === 'freeze') world.buyOpen = !world.buyOpen;
    if (world.phase === 'freeze' && world.buyOpen) {
      const buyKey = {
        Digit1: 'lath',
        Digit2: 'chatter',
        Digit3: 'armor',
        Digit4: 'helm',
        Digit5: 'frag',
        Digit6: 'smoke',
        Digit7: 'flash',
        Digit8: 'kit',
      }[event.code];
      if (buyKey) {
        buy(actor, buyKey);
        event.preventDefault();
        return;
      }
    }
    if (event.code === 'Digit1') equip(actor, 'primary');
    else if (event.code === 'Digit2') equip(actor, 'side');
    else if (event.code === 'Digit3') equip(actor, 'nade');
    else if (event.code === 'KeyG') {
      equip(actor, 'nade');
      toss = true;
    } else if (event.code === 'Space' && world.phase === 'live') actor.wantJump = true;
  });
  document.addEventListener('keyup', (event) => held.delete(event.code));
  document.addEventListener('mousedown', (event) => {
    if (event.button === 0) mouse = true;
  });
  document.addEventListener('mouseup', (event) => {
    if (event.button === 0) mouse = false;
  });
  document.addEventListener('mousemove', (event) => {
    if (document.pointerLockElement !== target) return;
    const actor = player();
    actor.yaw -= event.movementX * 0.00215;
    actor.pitch -= event.movementY * 0.0018;
    if (actor.pitch > 1.35) actor.pitch = 1.35;
    if (actor.pitch < -1.2) actor.pitch = -1.2;
  });

  return {
    sample() {
      const actor = player();
      const freezeBuy = world.phase === 'freeze' && world.buyOpen;
      const forward = (held.has('KeyW') ? 1 : 0) - (held.has('KeyS') ? 1 : 0);
      const strafe = (held.has('KeyD') ? 1 : 0) - (held.has('KeyA') ? 1 : 0);
      actor.wishF = freezeBuy ? 0 : forward;
      actor.wishS = freezeBuy ? 0 : strafe;
      actor.wantCrouch = held.has('ControlLeft') || held.has('ControlRight');
      actor.wantWalk = held.has('ShiftLeft') || held.has('ShiftRight');
      actor.use = held.has('KeyE');
      actor.wantReload = held.has('KeyR');
      actor.fire = toss || (!freezeBuy && mouse && document.pointerLockElement === target);
      toss = false;
    },
  };
}
