// three.js scene: the wharf, the operatives, the viewmodel, and the shot effects.

import * as THREE from 'three';
import { BLOCKS, DECOR, SITES } from './map.js';
import { eyeHeight } from './arsenal.js';

const PALETTE = {
  shell: { color: 0x4e453c, roughness: 0.9 },
  brick: { color: 0x8a5340, roughness: 0.84 },
  soot: { color: 0x2b2723, roughness: 0.95 },
  brine: { color: 0x2f5c59, roughness: 0.62, metalness: 0.22 },
  crate: { color: 0x8b5a30, roughness: 0.78 },
  trim: { color: 0xc6a15a, roughness: 0.42, metalness: 0.38 },
  floor: { color: 0x2a241f, roughness: 0.96 },
  floorA: { color: 0x6a382e, roughness: 0.88 },
  floorB: { color: 0x1e3c42, roughness: 0.7, metalness: 0.12 },
  floorBrine: { color: 0x243836, roughness: 0.8 },
  floorCinder: { color: 0x4a3328, roughness: 0.9 },
  beam: { color: 0x3c342c, roughness: 0.55, metalness: 0.4 },
  lamp: { color: 0xf0d2a4, emissive: 0xf0d2a4, emissiveIntensity: 0.45 },
  lampA: { color: 0xff8a4a, emissive: 0xff6a2a, emissiveIntensity: 0.55 },
  lampB: { color: 0x7ee0d8, emissive: 0x2ec4b6, emissiveIntensity: 0.5 },
  kiln: { color: 0x5c3328, roughness: 0.8, emissive: 0x4a1c10, emissiveIntensity: 0.25 },
  dock: { color: 0x355e62, roughness: 0.55, metalness: 0.28 },
};

const look = new THREE.Vector3();
const unit = new THREE.BoxGeometry(1, 1, 1);
const headGeo = new THREE.SphereGeometry(0.15, 14, 10);

export function createView(parent) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  parent.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x241c18);
  scene.fog = new THREE.FogExp2(0x241c18, 0.03);

  const camera = new THREE.PerspectiveCamera(74, window.innerWidth / window.innerHeight, 0.08, 80);
  scene.add(new THREE.HemisphereLight(0xf0d7b8, 0x2a211c, 0.72));
  scene.add(new THREE.AmbientLight(0x3a2c24, 0.28));
  const sun = new THREE.DirectionalLight(0xffe0c0, 1.85);
  sun.position.set(-14, 24, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -26;
  sun.shadow.camera.right = 26;
  sun.shadow.camera.top = 20;
  sun.shadow.camera.bottom = -20;
  sun.shadow.camera.near = 2;
  sun.shadow.camera.far = 55;
  sun.shadow.bias = -0.00035;
  scene.add(sun);
  addPoint(scene, 2.2, 2.4, -11, 0xff7a3c, 18, 16);
  addPoint(scene, 16, 2.3, 11.4, 0x3ecfc4, 16, 14);
  addPoint(scene, -8, 2.5, -0.2, 0xf0c48a, 8, 10);

  const materials = {};
  for (const kind of Object.keys(PALETTE)) materials[kind] = material(PALETTE[kind]);
  for (let i = 0; i < BLOCKS.length; i++) addBox(scene, BLOCKS[i], materials, true);
  for (let i = 0; i < DECOR.length; i++) addBox(scene, DECOR[i], materials, false);
  addSiteMark(scene, SITES.A, 'A', '#e4572e');
  addSiteMark(scene, SITES.B, 'B', '#2ec4b6');

  const bomb = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.22, 0.48), material({ color: 0x241814, roughness: 0.45, metalness: 0.4, emissive: 0xff4d2e, emissiveIntensity: 0.2 }));
  const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.08), material({ color: 0xffb088, emissive: 0xff5a2a, emissiveIntensity: 1 }));
  lamp.position.set(0, 0.16, 0.16);
  bomb.add(lamp);
  scene.add(bomb);
  const bombLight = new THREE.PointLight(0xff4a2a, 0, 7);
  scene.add(bombLight);

  const actors = [];
  const teams = ['cinder', 'cinder', 'cinder', 'brine', 'brine', 'brine'];
  for (let i = 0; i < teams.length; i++) actors.push(makeOperative(scene, teams[i]));

  const viewmodels = {
    lath: makeViewgun(0.62, 0.07, 0.07, 0xc6a15a),
    chatter: makeViewgun(0.46, 0.08, 0.08, 0xd7d2c8),
    spit: makeViewgun(0.28, 0.07, 0.06, 0xb9a48c),
    frag: makeViewNade(0xc6532c),
    smoke: makeViewNade(0x6e675f),
    flash: makeViewNade(0xf2e2b6),
  };
  for (const key of Object.keys(viewmodels)) camera.add(viewmodels[key]);
  scene.add(camera);

  const smokes = [];
  const smokeGeo = new THREE.SphereGeometry(1, 14, 10);
  const smokeMat = new THREE.MeshStandardMaterial({ color: 0xb7b1a8, transparent: true, opacity: 0.28, roughness: 1, depthWrite: false });
  for (let i = 0; i < 4; i++) {
    const mesh = new THREE.Mesh(smokeGeo, smokeMat);
    mesh.visible = false;
    scene.add(mesh);
    smokes.push(mesh);
  }
  const sparks = [];
  const sparkGeo = new THREE.SphereGeometry(0.07, 8, 6);
  const sparkMat = new THREE.MeshBasicMaterial({ color: 0xffc27a });
  for (let i = 0; i < 4; i++) {
    const mesh = new THREE.Mesh(sparkGeo, sparkMat);
    mesh.visible = false;
    scene.add(mesh);
    sparks.push(mesh);
  }
  const tracers = [];
  for (let i = 0; i < 6; i++) {
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    const line = new THREE.Line(geom, new THREE.LineBasicMaterial({ color: 0xffc27a }));
    line.visible = false;
    line.frustumCulled = false;
    scene.add(line);
    tracers.push(line);
  }
  const nadeMeshes = [];
  const nadeGeo = new THREE.SphereGeometry(0.09, 8, 6);
  for (let i = 0; i < 8; i++) {
    const mesh = new THREE.Mesh(nadeGeo, material({ color: 0xc6532c, roughness: 0.6 }));
    mesh.visible = false;
    scene.add(mesh);
    nadeMeshes.push(mesh);
  }

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  return {
    dom: renderer.domElement,
    render(world, alpha) {
      const player = world.actors[0];
      const x = lerp(player.px, player.x, alpha);
      const y = lerp(player.py, player.y, alpha);
      const z = lerp(player.pz, player.z, alpha);
      const stand = y + (eyeHeight(player) - player.y);
      const pitch = player.pitch + player.recoilP;
      const yaw = player.yaw + player.recoilY;
      const cp = Math.cos(pitch);
      camera.position.set(x, stand, z);
      look.set(x + cp * Math.cos(yaw), stand + Math.sin(pitch), z + cp * Math.sin(yaw));
      camera.lookAt(look);
      syncViewmodel(viewmodels, player);
      for (let i = 0; i < world.actors.length; i++) syncActor(actors[i], world.actors[i], alpha, i === 0);
      syncBomb(bomb, bombLight, world);
      syncPool(world.smokes, smokes, (mesh, item) => {
        mesh.scale.setScalar(item.r);
        mesh.position.set(item.x, item.y, item.z);
      });
      syncPool(world.sparks, sparks, (mesh, item) => mesh.position.set(item.x, item.y, item.z));
      syncPool(world.nades, nadeMeshes, (mesh, item) => mesh.position.set(item.x, item.y, item.z));
      for (let i = 0; i < world.tracers.length; i++) {
        const item = world.tracers[i];
        const line = tracers[i];
        line.visible = item.alive;
        if (!item.alive) continue;
        const attr = line.geometry.attributes.position;
        attr.setXYZ(0, item.x, item.y, item.z);
        attr.setXYZ(1, item.x2, item.y2, item.z2);
        attr.needsUpdate = true;
      }
      renderer.render(scene, camera);
    },
  };
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function material(spec) {
  return new THREE.MeshStandardMaterial({
    color: spec.color,
    roughness: spec.roughness ?? 0.7,
    metalness: spec.metalness ?? 0,
    emissive: spec.emissive ?? 0x000000,
    emissiveIntensity: spec.emissiveIntensity ?? 1,
  });
}

function addPoint(scene, x, y, z, color, intensity, distance) {
  const light = new THREE.PointLight(color, intensity, distance);
  light.position.set(x, y, z);
  scene.add(light);
}

function addBox(scene, block, materials, solid) {
  const kind = block[6];
  const mesh = new THREE.Mesh(unit, materials[kind] || materials.shell);
  const sx = Math.max(0.05, block[1] - block[0]);
  const sy = Math.max(0.02, block[5] - block[4]);
  const sz = Math.max(0.05, block[3] - block[2]);
  mesh.scale.set(sx, sy, sz);
  mesh.position.set((block[0] + block[1]) / 2, (block[4] + block[5]) / 2, (block[2] + block[3]) / 2);
  mesh.castShadow = solid && block[5] > 0.25 && block[4] < 2.3;
  mesh.receiveShadow = true;
  scene.add(mesh);
}

function addSiteMark(scene, site, letter, color) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const g = canvas.getContext('2d');
  g.clearRect(0, 0, 128, 128);
  g.fillStyle = color;
  g.font = '700 92px sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(letter, 64, 70);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(site.x, 0.06, site.z);
  scene.add(mesh);
}

function makeOperative(scene, team) {
  const group = new THREE.Group();
  const cloth = team === 'cinder' ? 0xc6532c : 0x1f7a74;
  const legs = new THREE.Mesh(unit, material({ color: 0x2a2622, roughness: 0.9 }));
  legs.scale.set(0.36, 0.72, 0.22);
  legs.position.y = 0.36;
  legs.castShadow = true;
  const torso = new THREE.Mesh(unit, material({ color: cloth, roughness: 0.72 }));
  torso.scale.set(0.46, 0.62, 0.26);
  torso.position.y = 1.02;
  torso.castShadow = true;
  const head = new THREE.Mesh(headGeo, material({ color: 0xd7b39a, roughness: 0.65 }));
  head.position.y = 1.5;
  head.castShadow = true;
  const visor = new THREE.Mesh(unit, material({ color: 0x1a1614, roughness: 0.3, metalness: 0.4 }));
  visor.scale.set(0.2, 0.08, 0.08);
  visor.position.set(0.08, 1.52, 0);
  const gun = new THREE.Mesh(unit, material({ color: 0x241c16, roughness: 0.4, metalness: 0.5 }));
  gun.scale.set(0.48, 0.07, 0.07);
  gun.position.set(0.32, 1.02, 0);
  group.add(legs, torso, head, visor, gun);
  scene.add(group);
  return group;
}

function makeViewgun(length, height, width, color) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(unit, material({ color, roughness: 0.42, metalness: 0.42 }));
  body.scale.set(width, height, length);
  body.position.set(0, 0, -length * 0.42);
  const barrel = new THREE.Mesh(unit, material({ color: 0x241c18, roughness: 0.35, metalness: 0.62 }));
  barrel.scale.set(width * 0.28, height * 0.28, length * 0.55);
  barrel.position.set(0, height * 0.28, -length * 0.95);
  const grip = new THREE.Mesh(unit, material({ color: 0x3a2a22, roughness: 0.8 }));
  grip.scale.set(width * 0.7, 0.14, 0.08);
  grip.position.set(0, -0.1, -0.06);
  const flash = new THREE.Mesh(unit, new THREE.MeshBasicMaterial({ color: 0xffd29a }));
  flash.scale.set(0.03, 0.03, 0.12);
  flash.position.set(0, height * 0.28, -length * 1.22);
  flash.name = 'flash';
  group.add(body, barrel, grip, flash);
  group.position.set(0.2, -0.2, -0.28);
  return group;
}

function makeViewNade(color) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), material({ color, roughness: 0.55 }));
  mesh.position.set(0.24, -0.2, -0.4);
  return mesh;
}

function syncViewmodel(models, actor) {
  const kick = actor.recoilP;
  for (const key of Object.keys(models)) {
    const mesh = models[key];
    const on = actor.alive && actor.equipped === key;
    mesh.visible = on;
    if (!on) continue;
    mesh.position.y = -0.2 - actor.crouch * 0.05 - kick * 0.08;
    mesh.position.z = -0.28 - kick * 0.12;
    mesh.rotation.x = kick * 0.65;
    const flash = mesh.getObjectByName('flash');
    if (flash) flash.visible = kick > 0.004;
  }
}

function syncActor(group, actor, alpha, hidden) {
  group.visible = !hidden;
  if (hidden) return;
  const x = lerp(actor.px, actor.x, alpha);
  const y = lerp(actor.py, actor.y, alpha);
  const z = lerp(actor.pz, actor.z, alpha);
  group.position.set(x, actor.alive ? y : 0.15, z);
  group.rotation.set(0, 0, 0);
  if (!actor.alive) {
    group.rotation.x = -Math.PI / 2;
    group.rotation.y = -actor.yaw;
    group.position.y = 0.28;
    return;
  }
  group.rotation.y = -actor.yaw;
  const cloth = group.children[1];
  cloth.material.emissive.setHex(actor.hitFlash > 0 ? 0x8a2414 : 0x000000);
  cloth.material.emissiveIntensity = actor.hitFlash > 0 ? 0.4 : 0;
}

function syncBomb(mesh, light, world) {
  const bomb = world.bomb;
  const holder = bomb.state === 'held' ? world.actors[bomb.holder] : null;
  mesh.visible = bomb.state === 'held' || bomb.state === 'dropped' || bomb.state === 'planted';
  if (holder && holder.alive) {
    const yaw = holder.yaw;
    mesh.position.set(holder.x + Math.cos(yaw) * 0.35, 0.7, holder.z + Math.sin(yaw) * 0.35);
  } else {
    mesh.position.set(bomb.x, bomb.state === 'planted' ? 0.12 : 0.16, bomb.z);
  }
  const blink = bomb.state === 'planted' ? 0.45 + Math.abs(Math.sin(world.time * (bomb.fuse < 10 ? 12 : 4))) : 0.15;
  mesh.children[0].material.emissiveIntensity = blink * 2;
  light.intensity = bomb.state === 'planted' ? 6 * blink : 0;
  light.position.copy(mesh.position);
  light.position.y += 0.4;
}

function syncPool(items, meshes, place) {
  for (let i = 0; i < items.length; i++) {
    meshes[i].visible = items[i].alive;
    if (items[i].alive) place(meshes[i], items[i]);
  }
}
