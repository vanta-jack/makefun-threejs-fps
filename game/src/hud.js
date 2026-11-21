// DOM readout: health, ammo, clock, money, buy list, radar, and the round banner.

import { SPEC, buy, priceOf } from './arsenal.js';
import { sees } from './combat.js';
import { BLOCKS, SITES } from './map.js';

const BUY = [
  ['1', 'lath', 'Lath rifle'],
  ['2', 'chatter', 'Chatter'],
  ['3', 'armor', 'Vest'],
  ['4', 'helm', 'Vest + hood'],
  ['5', 'frag', 'Cinder pot'],
  ['6', 'smoke', 'Soot can'],
  ['7', 'flash', 'Flare'],
  ['8', 'kit', 'Defuse kit'],
];

export function createHud() {
  const timer = document.getElementById('timer');
  const scoreL = document.getElementById('score-l');
  const scoreR = document.getElementById('score-r');
  const money = document.getElementById('money');
  const hp = document.getElementById('hp-n');
  const armor = document.getElementById('ar-n');
  const mag = document.getElementById('mag');
  const reserve = document.getElementById('res');
  const name = document.getElementById('gname');
  const banner = document.getElementById('banner');
  const bannerTitle = document.getElementById('banner-title');
  const bannerCopy = document.getElementById('banner-copy');
  const objective = document.getElementById('objective');
  const bombbar = document.getElementById('bombbar');
  const cross = document.getElementById('cross');
  const marker = document.getElementById('marker');
  const hurt = document.getElementById('hurt');
  const flash = document.getElementById('flash');
  const feedRows = [...document.querySelectorAll('#feed p')];
  const buyRows = [...document.querySelectorAll('#buy button')];
  const radar = document.getElementById('radar');
  const pen = radar.getContext('2d');

  return {
    paint(world) {
      const player = world.actors[0];
      const clock = world.phase === 'freeze' ? world.phaseLeft : world.phase === 'live' ? world.roundLeft : world.phaseLeft;
      timer.textContent = world.phase === 'freeze' ? `BUY ${format(clock)}` : world.phase === 'post' ? 'END' : format(Math.max(0, clock));
      scoreL.textContent = String(world.score.cinder);
      scoreR.textContent = String(world.score.brine);
      money.textContent = `$${player.money}`;
      hp.textContent = String(Math.max(0, Math.ceil(player.health)));
      armor.textContent = player.armor > 0 ? `VEST ${Math.ceil(player.armor)}` : 'NO VEST';
      const spec = SPEC[player.equipped];
      if (spec && spec.kind === 'gun') {
        mag.textContent = String(player.mag[player.equipped]);
        reserve.textContent = `/ ${player.reserve[player.equipped]}`;
        name.textContent = player.reload > 0 ? 'RELOAD' : spec.name;
      } else if (spec) {
        mag.textContent = String(player.nades[player.equipped] || 0);
        reserve.textContent = '';
        name.textContent = spec.name;
      }
      document.body.classList.toggle('buying', world.phase === 'freeze' && world.buyOpen);
      document.body.classList.toggle('posted', world.phase === 'post');
      document.body.classList.toggle('locked', Boolean(document.pointerLockElement));
      bannerTitle.textContent = world.winner === 'cinder' ? 'CINDER TAKES THE ROUND' : world.winner === 'brine' ? 'BRINE HOLDS' : '';
      bannerCopy.textContent = world.reason;
      objective.textContent = objectiveLine(world, player);
      const planted = world.bomb.state === 'planted';
      bombbar.hidden = !planted && world.bomb.plant <= 0 && world.bomb.defuse <= 0;
      if (planted) bombbar.textContent = `CHARGE ${format(world.bomb.fuse)}`;
      else if (world.bomb.plant > 0) bombbar.textContent = `PLANTING ${Math.ceil((3 - world.bomb.plant) * 10) / 10}`;
      else if (world.bomb.defuse > 0) bombbar.textContent = 'DEFUSING';
      cross.style.setProperty('--gap', `${4 + player.spread * 260}px`);
      marker.classList.toggle('on', world.hitMarker > 0);
      marker.classList.toggle('head', world.hitHead);
      hurt.style.opacity = String(player.alive ? Math.max(0, (42 - player.health) / 70) : 0.55);
      flash.style.opacity = String(Math.min(0.92, player.blind / 2));
      for (let i = 0; i < feedRows.length; i++) {
        const slot = world.feed[(world.feedI - 1 - i + world.feed.length * 4) % world.feed.length];
        const age = world.time - slot.t;
        feedRows[i].textContent = age < 5 ? slot.text : '';
      }
      for (let i = 0; i < buyRows.length; i++) {
        const id = BUY[i][1];
        const price = priceOf(id);
        const affordable = player.money >= price && (id !== 'kit' || player.team === 'brine');
        buyRows[i].disabled = !affordable;
        buyRows[i].classList.toggle('owned', owned(player, id));
      }
      drawRadar(pen, world, player);
    },
  };
}

export function wireBuy(world) {
  const buttons = document.querySelectorAll('#buy button');
  for (let i = 0; i < buttons.length; i++) {
    buttons[i].addEventListener('click', () => {
      if (world.phase !== 'freeze') return;
      buy(world.actors[0], buttons[i].dataset.id);
    });
  }
}

function owned(actor, id) {
  if (id === 'lath' || id === 'chatter') return actor.primary === id;
  if (id === 'armor') return actor.armor >= 100;
  if (id === 'helm') return actor.helmet;
  if (id === 'kit') return actor.kit;
  if (actor.nades[id]) return true;
  return false;
}

function objectiveLine(world, player) {
  const bomb = world.bomb;
  if (world.phase === 'freeze') return 'Buy, then the lanes open';
  if (world.phase === 'post') return world.reason;
  if (bomb.state === 'planted') return bomb.site === 'A' ? 'Charge on the Kiln' : 'Charge on the Dock';
  if (bomb.state === 'held' && bomb.holder === player.id) return 'Carry the charge to Kiln or Dock, hold E';
  if (bomb.state === 'dropped') return 'Charge on the ground';
  return player.team === 'cinder' ? 'Clear Brine or plant the charge' : 'Hold the sites';
}

function format(seconds) {
  const safe = Math.max(0, Math.ceil(seconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function drawRadar(pen, world, player) {
  const w = 148;
  const h = 148;
  pen.clearRect(0, 0, w, h);
  pen.fillStyle = 'rgba(20, 16, 13, 0.72)';
  pen.fillRect(0, 0, w, h);
  pen.strokeStyle = 'rgba(198, 161, 90, 0.45)';
  pen.strokeRect(0.5, 0.5, w - 1, h - 1);
  const scale = 3.05;
  const ox = w / 2 - player.x * scale;
  const oy = h / 2 - player.z * scale;
  pen.fillStyle = 'rgba(138, 83, 64, 0.85)';
  for (let i = 0; i < BLOCKS.length; i++) {
    const b = BLOCKS[i];
    if (b[5] < 0.4) continue;
    pen.fillRect(ox + b[0] * scale, oy + b[2] * scale, (b[1] - b[0]) * scale, (b[3] - b[2]) * scale);
  }
  pen.fillStyle = 'rgba(228, 87, 46, 0.85)';
  pen.fillRect(ox + (SITES.A.x - 0.7) * scale, oy + (SITES.A.z - 0.7) * scale, 1.4 * scale, 1.4 * scale);
  pen.fillStyle = 'rgba(46, 196, 182, 0.85)';
  pen.fillRect(ox + (SITES.B.x - 0.7) * scale, oy + (SITES.B.z - 0.7) * scale, 1.4 * scale, 1.4 * scale);
  for (let i = 0; i < world.actors.length; i++) {
    const actor = world.actors[i];
    if (!actor.alive) continue;
    if (actor !== player && actor.team !== player.team && actor.hitFlash <= 0 && !sees(world, player, actor)) continue;
    pen.fillStyle = actor.team === 'cinder' ? '#e4572e' : '#2ec4b6';
    pen.beginPath();
    pen.arc(ox + actor.x * scale, oy + actor.z * scale, actor.id === 0 ? 3.5 : 2.6, 0, Math.PI * 2);
    pen.fill();
  }
}
