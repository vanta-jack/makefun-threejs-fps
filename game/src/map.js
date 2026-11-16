// Cinder Wharf: collision blocks, sites, and the bot waypoint graph.
// x east, z south, y up. Doors are gaps between block segments.

export const SITES = {
  A: { id: 'A', name: 'Kiln', x: 2.4, z: -10.8, r: 3.55 },
  B: { id: 'B', name: 'Dock', x: 16.2, z: 11.5, r: 3.35 },
};

export const SPAWNS = {
  cinder: [[-17.4, 0.4], [-15.2, -2.5], [-19.4, 2.7]],
  brine: [[16.8, -12.4], [18.6, -6.2], [14.4, -8.8]],
};

/** [x0, x1, z0, z1, y0, y1, kind] */
export const BLOCKS = [
  [-22.5, 22.5, -16.45, -16.05, 0, 3.35, 'shell'],
  [-22.5, 22.5, 16.05, 16.45, 0, 3.35, 'shell'],
  [-22.5, -22.05, -16.45, 16.45, 0, 3.35, 'shell'],
  [22.05, 22.5, -16.45, 16.45, 0, 3.35, 'shell'],

  [-21.6, -18.0, -5.95, -5.5, 0, 3.15, 'brick'],
  [-14.0, -6.5, -5.95, -5.5, 0, 3.15, 'brick'],
  [-2.5, 10.45, -5.95, -5.5, 0, 3.15, 'brick'],

  [-12.28, -11.82, -5.5, -1.35, 0, 3.15, 'brick'],
  [-12.28, -11.82, 1.35, 5.5, 0, 3.15, 'brick'],

  [-21.6, -19.25, 5.25, 5.7, 0, 3.15, 'brick'],
  [-15.35, -11.9, 5.25, 5.7, 0, 3.15, 'brick'],

  [10.72, 11.18, -15.7, -11.25, 0, 3.15, 'brick'],
  [10.72, 11.18, -8.15, -4.65, 0, 3.15, 'brick'],
  [10.72, 11.18, -2.55, -2.15, 0, 3.15, 'soot'],
  [10.72, 11.18, -2.15, -0.45, 0, 3.15, 'soot'],
  [10.72, 11.18, 2.05, 3.65, 0, 3.15, 'soot'],

  [-11.55, -2.85, 3.9, 4.35, 0, 3.15, 'brick'],
  [0.85, 7.55, 3.9, 4.35, 0, 3.15, 'brick'],

  [7.58, 8.05, 4.35, 8.15, 0, 3.15, 'brine'],
  [7.58, 8.05, 11.45, 15.7, 0, 3.15, 'brine'],

  [-17.9, -16.15, -14.0, -12.35, 0, 1.18, 'crate'],
  [4.7, 6.9, -14.7, -13.15, 0, 1.18, 'crate'],
  [7.45, 8.4, -13.9, -12.95, 0, 3.1, 'soot'],
  [-5.3, -3.35, -2.35, -0.85, 0, 1.22, 'crate'],
  [1.7, 3.25, 1.45, 2.65, 0, 0.72, 'crate'],
  [15.2, 18.3, -15.35, -14.45, 0, 0.95, 'trim'],
  [10.35, 12.15, 6.15, 7.85, 0, 1.16, 'crate'],
  [-13.2, -11.2, 12.1, 13.7, 0, 1.12, 'crate'],
  [-8.7, -7.55, -3.55, -2.35, 0, 3.05, 'soot'],
];

/** Visual only: floors, beams, lamps. Not used for collision. */
export const DECOR = [
  [-22.5, 22.5, -16.45, 16.45, -0.25, 0, 'floor'],
  [-21.6, 10.4, -16.05, -5.95, 0, 0.045, 'floorA'],
  [8.05, 22.05, 4.35, 16.05, 0, 0.045, 'floorB'],
  [11.18, 22.05, -16.05, -2.15, 0, 0.04, 'floorBrine'],
  [-22.05, -12.28, -5.5, 5.25, 0, 0.04, 'floorCinder'],
  [-18.5, -6.2, -11.15, -10.75, 0.05, 0.08, 'trim'],
  [-8.2, 6.4, -0.35, 0.15, 2.72, 3.02, 'beam'],
  [10.9, 18.4, -0.15, 0.25, 2.72, 3.0, 'beam'],
  [-20.9, -20.55, -12.4, -11.9, 2.15, 2.42, 'lamp'],
  [8.85, 9.2, -12.5, -12.05, 2.2, 2.5, 'lampA'],
  [19.6, 20.0, 13.4, 13.85, 2.15, 2.45, 'lampB'],
  [-12.7, -12.35, -1.1, -0.7, 2.15, 2.42, 'lamp'],
  [-0.5, 1.55, -15.35, -14.25, 0, 2.45, 'kiln'],
  [3.5, 4.3, -15.2, -14.5, 0, 1.7, 'kiln'],
  [18.4, 20.6, 13.6, 15.2, 0, 1.35, 'dock'],
];

export const POINTS = [
  [-17.4, 0.4],
  [-10.5, 0.15],
  [-8.1, -0.2],
  [-1.6, 0.25],
  [6.3, 0.45],
  [-16.3, -7.7],
  [-8.6, -10.6],
  [2.4, -10.7],
  [8.15, -9.7],
  [15.7, -9.5],
  [16.7, -4.15],
  [13.5, 0.7],
  [-16.9, 8.7],
  [-4.1, 10.1],
  [5.15, 9.7],
  [16.2, 11.5],
  [-0.7, 2.15],
  [-1.05, 6.5],
];

const LINKS = [
  [0, 1], [1, 2], [2, 3], [3, 4], [4, 11], [3, 16], [16, 17],
  [17, 13], [13, 12], [13, 14], [14, 15], [0, 5], [5, 6], [6, 7],
  [7, 8], [8, 9], [9, 10], [10, 11], [0, 12],
];

const NEXT = buildNext(POINTS.length, LINKS);

function buildNext(n, links) {
  const adj = Array.from({ length: n }, () => []);
  for (let i = 0; i < links.length; i++) {
    adj[links[i][0]].push(links[i][1]);
    adj[links[i][1]].push(links[i][0]);
  }
  const next = Array.from({ length: n }, () => new Int16Array(n).fill(-1));
  const queue = new Int16Array(n);
  const prev = new Int16Array(n);
  for (let target = 0; target < n; target++) {
    prev.fill(-2);
    let head = 0;
    let tail = 0;
    queue[tail++] = target;
    prev[target] = -1;
    while (head < tail) {
      const cur = queue[head++];
      const nbs = adj[cur];
      for (let k = 0; k < nbs.length; k++) {
        const nb = nbs[k];
        if (prev[nb] !== -2) continue;
        prev[nb] = cur;
        queue[tail++] = nb;
      }
    }
    for (let from = 0; from < n; from++) {
      if (prev[from] >= 0) next[from][target] = prev[from];
    }
  }
  return next;
}

export function hop(from, target) {
  if (from < 0 || target < 0) return -1;
  return NEXT[from][target];
}

export function nearest(x, z) {
  let best = 0;
  let bestD = 1e9;
  for (let i = 0; i < POINTS.length; i++) {
    const dx = POINTS[i][0] - x;
    const dz = POINTS[i][1] - z;
    const d = dx * dx + dz * dz;
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

export function siteOf(x, z) {
  const ax = x - SITES.A.x;
  const az = z - SITES.A.z;
  if (ax * ax + az * az <= SITES.A.r * SITES.A.r) return 'A';
  const bx = x - SITES.B.x;
  const bz = z - SITES.B.z;
  if (bx * bx + bz * bz <= SITES.B.r * SITES.B.r) return 'B';
  return '';
}

const span = { tmin: 0, tmax: 0, miss: false };

function axis(origin, dir, min, max) {
  if (Math.abs(dir) < 1e-8) {
    if (origin < min || origin > max) span.miss = true;
    return;
  }
  let t1 = (min - origin) / dir;
  let t2 = (max - origin) / dir;
  if (t1 > t2) {
    const swap = t1;
    t1 = t2;
    t2 = swap;
  }
  if (t1 > span.tmin) span.tmin = t1;
  if (t2 < span.tmax) span.tmax = t2;
  if (span.tmin > span.tmax) span.miss = true;
}

/** Nearest wall hit along a unit ray, or maxT when the ray stays clear. */
export function rayBlocks(ox, oy, oz, dx, dy, dz, maxT) {
  let best = maxT;
  for (let i = 0; i < BLOCKS.length; i++) {
    const b = BLOCKS[i];
    span.tmin = 0;
    span.tmax = maxT;
    span.miss = false;
    axis(ox, dx, b[0], b[1]);
    if (span.miss) continue;
    axis(oy, dy, b[4], b[5]);
    if (span.miss) continue;
    axis(oz, dz, b[2], b[3]);
    if (span.miss) continue;
    const t = span.tmin > 0.02 ? span.tmin : span.tmax > 0.02 ? span.tmax : -1;
    if (t > 0.02 && t < best) best = t;
  }
  return best;
}

export function clearLine(ax, ay, az, bx, by, bz) {
  const dx = bx - ax;
  const dy = by - ay;
  const dz = bz - az;
  const len = Math.hypot(dx, dy, dz);
  if (len < 0.001) return true;
  const hit = rayBlocks(ax, ay, az, dx / len, dy / len, dz / len, len);
  return hit >= len - 0.08;
}

export function bodyBlocked(x, y, z, radius, height) {
  for (let i = 0; i < BLOCKS.length; i++) {
    const b = BLOCKS[i];
    if (b[4] >= 2.35) continue;
    if (y + height <= b[4] || y >= b[5]) continue;
    if (x > b[0] - radius && x < b[1] + radius && z > b[2] - radius && z < b[3] + radius) return true;
  }
  return false;
}
