// Ashline bootstrap: sample input, step the world at 60 Hz, then draw.

import { pose } from './capture.js';
import { createHud, wireBuy } from './hud.js';
import { bindInput } from './input.js';
import { prepareRound } from './rounds.js';
import { simulate } from './sim.js';
import { follow, unlock } from './sound.js';
import { createView } from './view.js';
import { createWorld } from './world.js';

const params = new URLSearchParams(location.search);
const shot = params.get('shot');
const world = createWorld();
prepareRound(world, true);

const view = createView(document.getElementById('view'));
const hud = createHud();
const input = bindInput(view.dom, world);
wireBuy(world);

document.getElementById('deploy').addEventListener('click', () => {
  view.dom.requestPointerLock();
  unlock();
});

if (shot) {
  document.body.classList.add('shot');
  pose(world, shot);
  hud.paint(world);
  let painted = 0;
  const pump = () => {
    view.render(world, 1);
    painted += 1;
    if (painted >= 2) {
      window.__shotReady = true;
      return;
    }
    requestAnimationFrame(pump);
  };
  requestAnimationFrame(pump);
  window.addEventListener('error', (event) => {
    const node = document.getElementById('objective');
    if (node) node.textContent = event.message;
  });
} else {
  const step = 1 / 60;
  let last = performance.now();
  let acc = 0;
  const frame = (now) => {
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.1) dt = 0.1;
    acc += dt;
    let steps = 0;
    while (acc >= step && steps < 4) {
      input.sample();
      simulate(world, step);
      acc -= step;
      steps += 1;
    }
    view.render(world, step === 0 ? 1 : acc / step);
    hud.paint(world);
    follow(world);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
