import { MathUtils } from 'three';
const smooth = MathUtils.smoothstep;

// Sample a curved petal with many small points.
export function makePetalSamples() {
  const samples = [];
  const hash = (n) => {
    const v = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return v - Math.floor(v);
  };
  function add(t, across, kind, id) {
    const breadth = Math.pow(Math.sin(Math.PI * t), 0.74) * (0.77 + 0.25 * t);
    const x = across * breadth * 0.5 + 0.12 * (t - 0.3) ** 2;
    const y = t - 0.43;
    const z = 0.51 * across * across * breadth + 0.48 * (t - 0.33) ** 2 + 0.12 * Math.sin(t * 4.6);
    const nx = -1.02 * across;
    const ny = -(0.96 * (t - 0.33) + 0.552 * Math.cos(t * 4.6));
    const inv = 1 / Math.hypot(nx, ny, 1);
    samples.push({
      x,
      y,
      z,
      t,
      across,
      kind,
      seed: hash(id),
      dustSeed: hash(id + 1489),
      driftX: Math.sin(hash(id) * 667.3),
      driftY: Math.cos(hash(id) * 456.7),
      driftZ: Math.sin(hash(id) * 521.4),
      nx: nx * inv,
      ny: ny * inv,
      nz: inv,
      thickness: 0.35 + 0.65 * Math.sin(Math.PI * t) * (1 - across * across * 0.72),
      size: kind === 3 ? 0.036 + hash(id + 21) * 0.025 : kind === 0 ? 0.02 : kind === 1 ? 0.014 : 0.09,
      alpha: kind === 0 ? 0.74 : kind === 1 ? 0.4 : kind === 2 ? 0.085 : 0.7,
    });
  }
  let id = 0;
  for (let vein = 0; vein < 11; vein++) {
    const across = ((vein / 10) * 2 - 1) * 0.89;
    for (let row = 0; row < 64; row++) {
      const t = 0.035 + ((row + hash(id) * 0.27) / 64) * 0.93;
      if (hash(id + 70) > 0.065) add(t, across + 0.015 * Math.sin(t * 13 + vein), 1, id);
      id++;
    }
  }
  for (let edge = -1; edge <= 1; edge += 2) {
    for (let row = 0; row < 80; row++) add(0.018 + (row / 80) * 0.97, edge, 0, id++);
  }
  for (let j = 0; j < 240; j++) add(0.025 + hash(j + 312) * 0.95, hash(j + 576) * 2 - 1, 2, id++);
  for (let j = 0; j < 30; j++) add(0.018 + hash(j + 856) * 0.96, hash(j + 983) * 2.5 - 1.25, 3, id++);
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    s.index = i;
    s.threshold = 0.04 + 0.43 * (1 - s.t) + 0.15 * s.dustSeed;
    s.glintSin = Math.sin(s.seed * 61);
    s.glintCos = Math.cos(s.seed * 61);
    s.coverage = 1;
    const root = Math.min(1, Math.max(0, (s.t - 0.045) / 0.675));
    s.rootWeight = 1 - root * root * (3 - 2 * root);
  }
  return samples;
}

const hash = (n) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
// Make the inner petals smaller and darker.
export function shapeInterior(p, light) {
  const cavity = 1 - smooth(p.normal.z, -0.45, 0.12);
  p.interior = cavity;
  p.liftedInterior = false;
  if (cavity === 0) return;
  const a = hash(p.id + 62.7),
    b = hash(p.id + 391.2),
    c = hash(p.id + 578.8);
  const lifted = hash(p.id + 911.4) > 0.959 && cavity > 0.78;
  const broad = 0.5 + 0.5 * Math.sin(p.normal.x * 3.7 + p.normal.y * 2.2 + 0.8);
  const length = lifted ? 0.93 + a * 0.39 : 0.17 + Math.pow(a, 2.1) * 0.85;
  const ratio = 0.38 + b * 0.43;
  p.length = MathUtils.lerp(p.length, length, cavity);
  p.width = MathUtils.lerp(p.width, p.length * ratio, cavity);
  p.curl = MathUtils.lerp(p.curl, 0.24 + c * 0.95, cavity);
  p.tone *= MathUtils.lerp(1, lifted ? 1.65 : 0.18 + Math.pow(b, 1.5) * (0.48 + broad * 0.46), cavity);
  p.roll = MathUtils.lerp(p.roll, (c - 0.5) * Math.PI * 2, cavity);
  p.tilt = MathUtils.lerp(p.tilt, (b - 0.44) * 1.7, cavity);
  if (lifted) {
    p.roll = Math.atan2(-light.dot(p.axisU), light.dot(p.axisV));
    p.tilt = 1.16 + c * 0.34;
    p.liftedInterior = true;
  }
  p.home
    .addScaledVector(p.axisU, (a - 0.5) * 0.22 * cavity)
    .addScaledVector(p.axisV, (c - 0.5) * 0.18 * cavity)
    .addScaledVector(p.normal, (b - 0.5) * 0.18 * cavity);
}
