import * as THREE from 'three';
import { Particle } from './Particle.js';
import { initThree, PointLayers } from './script-three.js';
import { makePetalSamples, shapeInterior } from './shape.js';
import { Story, BREAK_THRESHOLD, CORE_AUTO_AGE } from './story.js';
import { Nebula } from './nebula.js';
import { UIRupture, setupInterface, text } from './interface.js';
import {
  EnergyStream,
  SurfacePointer,
  TRAVEL,
  tipGap,
  MAX_STREAMS,
  STREAM_LIFETIME,
  CONTACT_DWELL,
  contactPressure,
  contactBend,
  membraneBend,
  surfaceDelay,
  prepareSurfaceFlow,
  updateSurfaceFlow,
} from './interaction.js';

const SHELL_COUNT = 620;
const AMBIENT_COUNT = 26;
const STEP = 1 / 120;
const SEED = 62187;
const TAU = Math.PI * 2;
const clamp = THREE.MathUtils.clamp;
const smooth = THREE.MathUtils.smoothstep;
const query = new URLSearchParams(location.search);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const particles = [];
const impacts = [];
const scars = [];
const light = new THREE.Vector3(-0.55, 0.8, 0.62).normalize();
const opening = new THREE.Vector3(-0.12, 0.17, 1).normalize();
let scene, camera, renderer, pointLayers, stream, nebula, surfacePointer, uiRupture;
const story = new Story();
let released = false;
let dof = !query.has('nofocus');
let simTime = 0,
  accumulator = 0,
  previousTime = null,
  hitCount = 0;
let lastHit = -100,
  nextAuto = 7.5,
  lastPhase = '',
  lastUI = 0;
let paused = reducedMotion || query.has('still');
let auto = !reducedMotion && !query.has('manual');
let dirty = true,
  fps = 60,
  totalLost = 0,
  pointCount = 0;
let lastClickTime = -100,
  currentBreath = 1;
let random;
let caption = {
  phase: 'Suspended',
  thought: 'Still whole. Still breathing.',
  since: 0,
  pending: null,
  at: 0,
};
let lastControls = '';
const vector = new THREE.Vector3();
const temporary = new THREE.Vector3();
const direction = new THREE.Vector3();

// Use the same shape after each restart.
function seeded(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const petalSamples = makePetalSamples();
const coarseSamples = petalSamples
  .filter((s) => s.kind === 3 || s.index % 2 === 0)
  .map((s) => ({ ...s, coverage: s.kind === 3 ? 1 : 2 }));
const contactSample = petalSamples.reduce((best, s) =>
  Math.abs(s.t - 0.53) + Math.abs(s.across) < Math.abs(best.t - 0.53) + Math.abs(best.across) ? s : best,
);
function petalAngles(p) {
  const time = story.visualTime,
    age = time - p.hitTime;
  let roll, tilt;
  if (!p.attached && p.detachPose) {
    const elapsed = Math.max(0, time - p.detachTime),
      coast = elapsed - 0.28 * (1 - Math.exp(-elapsed / 0.28));
    roll = p.detachPose.roll + coast * (0.19 + p.seed * 0.3);
    tilt = p.detachPose.tilt + 0.24 * Math.sin(coast * 0.95) * Math.exp(-elapsed * 0.09);
  } else if (p.attached) {
    roll =
      p.roll +
      p.peelTurn * p.fracture * smooth(story.strain, 0.24, 0.94) +
      p.splitTurn * p.fracture * (0.4 + story.strain) +
      story.instability * 0.24 * Math.sin(time * 1.15 + p.home.y * 1.8) +
      0.035 * Math.sin(time * 0.45 + p.phase);
    tilt = p.tilt + 0.055 * Math.sin(time * 0.7 + p.phase) + p.scarWeight * 0.35 * smooth(age, 2, 9);
  } else {
    roll = p.roll + (time - p.detachTime) * (0.19 + p.seed * 0.3);
    tilt = p.tilt + 0.9 * Math.sin(time * 0.85 + p.phase);
  }
  return { roll, tilt };
}
function detachPetal(p) {
  p.detachPose = petalAngles(p);
  p.detachRoot
    .copy(p.target)
    .sub(p.pos)
    .multiplyScalar(Math.min(0.82, p.recoveryEffort * 2.8));
  p.attached = false;
  p.detachTime = simTime;
  p.detachOrigin.copy(p.pos);
}
function releaseBlend(p) {
  return p.attached ? 0 : p.ambient ? 1 : smooth(story.visualTime - p.detachTime, 0, 0.32);
}
function petalFrame(p) {
  const angles = petalAngles(p),
    roll = angles.roll;
  const tilt = angles.tilt - p.contactPressure * 0.04 + p.elasticTilt;
  const cr = Math.cos(roll),
    sr = Math.sin(roll),
    ct = Math.cos(tilt),
    st = Math.sin(tilt);
  const ux = p.axisU.x * cr + p.axisV.x * sr,
    uy = p.axisU.y * cr + p.axisV.y * sr,
    uz = p.axisU.z * cr + p.axisV.z * sr;
  const bx = p.axisV.x * cr - p.axisU.x * sr,
    by = p.axisV.y * cr - p.axisU.y * sr,
    bz = p.axisV.z * cr - p.axisU.z * sr;
  return {
    ux,
    uy,
    uz,
    vx: bx * ct - p.normal.x * st,
    vy: by * ct - p.normal.y * st,
    vz: bz * ct - p.normal.z * st,
    nx: p.normal.x * ct + bx * st,
    ny: p.normal.y * ct + by * st,
    nz: p.normal.z * ct + bz * st,
  };
}

function surfaceContact(p, out, sample = p.contactSample || contactSample, frame = null) {
  const f = frame || petalFrame(p),
    s = sample;
  const x = s.x * p.width,
    y = s.y * p.length,
    z = s.z * p.length * p.curl + membraneBend(p, s);
  const pin = recoveryPin(p, s.t);
  const detached = 1 - releaseBlend(p);
  return out.set(
    p.pos.x +
      f.ux * x +
      f.vx * y +
      f.nx * z +
      (p.attached ? (p.target.x - p.pos.x) * pin : p.detachRoot.x * detached * s.rootWeight),
    p.pos.y +
      f.uy * x +
      f.vy * y +
      f.ny * z +
      (p.attached ? (p.target.y - p.pos.y) * pin : p.detachRoot.y * detached * s.rootWeight),
    p.pos.z +
      f.uz * x +
      f.vz * y +
      f.nz * z +
      (p.attached ? (p.target.z - p.pos.z) * pin : p.detachRoot.z * detached * s.rootWeight),
  );
}
function recoveryPin(p, t) {
  return p.attached ? Math.min(0.82, p.recoveryEffort * 2.8) * (1 - smooth(t, 0.045, 0.72)) : 0;
}

// Arrange the petals around a sphere with an opening at the front.
function populate() {
  random = seeded(SEED);
  particles.length = 0;
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const candidates = Math.round(SHELL_COUNT * 1.056);
  for (let i = 0; i < candidates && particles.length < SHELL_COUNT; i++) {
    const y = 1 - (2 * (i + 0.5)) / candidates;
    const radial = Math.sqrt(1 - y * y);
    const theta = goldenAngle * i;
    const normal = new THREE.Vector3(radial * Math.cos(theta), y, radial * Math.sin(theta));
    const aperture = 0.9 + 0.025 * Math.sin(theta * 3) + 0.018 * Math.cos(y * 19);
    if (normal.dot(opening) > aperture) continue;
    const r = 2.28 + 0.095 * Math.sin(theta * 2.3 + y * 6) + 0.05 * (random() - 0.5);
    const home = new THREE.Vector3(normal.x * r, normal.y * r * 1.075, normal.z * r * 0.89);
    home.x += 0.1 * Math.sin(y * 3.3);
    const p = new Particle(particles.length, home, normal, random);
    shapeInterior(p, light);
    p.pos.copy(p.home);
    particles.push(p);
  }
  for (let i = 0; i < AMBIENT_COUNT; i++) {
    const theta = random() * TAU;
    const radius = 2.8 + random() * 1.65;
    const home = new THREE.Vector3(Math.cos(theta) * radius, -1.1 - random() * 2.3, (random() - 0.25) * 3);
    if (i < 4)
      home.set((i % 2 ? 1 : -1) * (2.5 + random() * 0.8), (random() - 0.6) * 4.6, 4.5 + random() * 1.8);
    else if (i < 8) home.z = -3 - random() * 2;
    const normal = new THREE.Vector3(random() - 0.5, random() - 0.5, random()).normalize();
    particles.push(new Particle(particles.length, home, normal, random, true));
  }
  for (const p of particles) {
    p.samples = p.length > 0.72 ? petalSamples : coarseSamples;
    p.hero = smooth(p.length, 0.56, 0.95);
    p.cosPhase = Math.cos(p.phase);
    p.sinPhase = Math.sin(p.phase);
    p.pickSamples = [];
    for (const t of [0.12, 0.3, 0.5, 0.7, 0.88])
      for (const across of [-0.65, 0, 0.65]) {
        const s = p.samples.reduce((best, s) =>
          Math.abs(s.t - t) + Math.abs(s.across - across) * 0.5 <
          Math.abs(best.t - t) + Math.abs(best.across - across) * 0.5
            ? s
            : best,
        );
        p.pickSamples.push(s);
      }
    p.contactSample = p.pickSamples[7];
    p.pointerGlow = 0;
  }
}

function reset() {
  surfacePointer?.reset();
  uiRupture?.reset();
  caption = { phase: 'Suspended', thought: 'Still whole. Still breathing.', since: 0, pending: null, at: 0 };
  document.querySelector('.caption').classList.remove('changing');
  lastPhase = '';
  lastControls = '';
  populate();
  story.reset();
  nebula.reset();
  released = false;
  simTime = 0;
  accumulator = 0;
  impacts.length = 0;
  scars.length = 0;
  hitCount = 0;
  lastHit = -100;
  nextAuto = 7.5;
  totalLost = 0;
  lastClickTime = -100;
  currentBreath = 1;
  dirty = true;
  document.querySelector('#invitation').classList.remove('dismissed');
  renderParticles();
  renderStream();
  updateUI();
}

function setupThree() {
  populate();
  nebula = new Nebula(particles);
  pointLayers = new PointLayers(scene, particles);
  stream = new EnergyStream(scene);
  reset();
  renderer.compile(scene, camera);
  renderer.compile(uiRupture.scene, camera);
  uiRupture.warm(renderer);
}

function targetForImpact() {
  if (story.phase === 'core') {
    let best = null,
      score = -Infinity;
    for (const g of nebula.groups) {
      if (!g.active || !g.recoverable || g.cz < -0.1) continue;
      const d = (g.cx * 0.5 + g.cy * 0.2 + g.cz * 0.9) / Math.max(0.01, Math.hypot(g.cx, g.cy, g.cz));
      if (d > score) {
        best = g;
        score = d;
      }
    }
    return best;
  }
  const normals = [
    [0.65, 0.37, 0.66],
    [-0.64, -0.26, 0.72],
    [0.2, -0.68, 0.71],
    [-0.4, 0.68, 0.65],
    [0.7, -0.24, 0.68],
    [-0.12, 0.42, 0.9],
    [-0.76, 0.08, 0.55],
    [0.15, 0.8, 0.55],
    [0.05, -0.94, 0.33],
  ];
  const n = normals[(hitCount + impacts.filter((e) => !e.applied).length) % normals.length];
  direction.set(...n).normalize();
  let best = null,
    score = -Infinity;
  for (const p of particles) {
    if (!p.attached || p.isDone || impacts.some((e) => !e.applied && e.target === p)) continue;
    const dot = p.normal.dot(direction);
    if (dot > score) {
      score = dot;
      best = p;
    }
  }
  return best;
}

// Nearby petals receive the impulse with a small delay.
function startImpact(particle = targetForImpact(), simultaneous = false, intent = null) {
  if (!story.acceptsImpact || impacts.filter((e) => simTime - e.time < STREAM_LIFETIME).length >= MAX_STREAMS)
    return false;
  if (!particle || impacts.some((e) => !e.applied && e.target === particle)) return false;
  if (story.phase === 'core') return startCoreImpact(particle, intent);
  if (paused) setPaused(false);
  if (!simultaneous && simTime - lastClickTime < 0.1) return false;
  lastClickTime = simTime;
  const normal = particle.normal.clone();
  const tangent = particle.axisU.clone();
  const travel = intent?.manual ? 0.72 : TRAVEL,
    sample = intent?.sample || particle.contactSample;
  const event = {
    time: simTime,
    travel,
    manual: !!intent?.manual,
    sample,
    contactAt: simTime + travel,
    hitAt: simTime + travel + CONTACT_DWELL,
    applied: false,
    target: particle,
    normal,
    tangent,
    bitangent: particle.axisV.clone(),
    center: surfaceContact(particle, new THREE.Vector3(), sample),
    number: hitCount + impacts.filter((e) => !e.applied).length,
    affected: 0,
    detached: 0,
    targets: [],
    cursor: 0,
    fatigue: Math.min(1, story.damage / BREAK_THRESHOLD),
    radius: 0.69 + story.strain * 0.1,
    fractures: [],
    fractureCursor: 0,
  };
  for (const p of particles) {
    if (!p.attached || p.isDone) continue;
    const angle = Math.acos(clamp(p.normal.dot(normal), -1, 1));
    if (angle > event.radius) continue;
    const fraction = angle / event.radius,
      delay = surfaceDelay(fraction, p.seed);
    const position = surfaceContact(p, new THREE.Vector3());
    const slide = position.clone().sub(event.center);
    slide.addScaledVector(p.normal, -slide.dot(p.normal)).normalize();
    event.targets.push({
      p,
      angle,
      fraction,
      position,
      normal: p.normal,
      slide,
      delay,
      at: event.hitAt + delay,
    });
  }
  event.targets.sort((a, b) => a.at - b.at);
  const previousDamage =
    event.targets.reduce((sum, t) => sum + t.p.damage, 0) / Math.max(1, event.targets.length);
  event.load = 0.205 + story.strain * 0.045 + Math.min(0.065, previousDamage * 0.13);
  planFractures(event);
  prepareSurfaceFlow(event, event.targets);
  stream.prepare(event);
  impacts.push(event);
  if (intent?.manual) surfacePointer?.acknowledge(particle);
  nextAuto = simTime + Math.max(4.6, 11.5 - story.strain * 9);
  document.querySelector('#invitation').classList.add('dismissed');
  return true;
}

function startCoreImpact(group, intent = null) {
  if (!group.recoverable) return false;
  if (paused) setPaused(false);
  const sampleIndex = intent?.sampleIndex ?? group.contactIndex;
  const center = nebula.coreContact(group, new THREE.Vector3(), sampleIndex);
  const normal = center.clone().normalize();
  const tangent = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), normal).normalize();
  const bitangent = new THREE.Vector3().crossVectors(normal, tangent).normalize();
  const travel = intent?.manual ? 0.72 : TRAVEL;
  const event = {
    core: true,
    time: simTime,
    travel,
    manual: !!intent?.manual,
    sampleIndex,
    contactAt: simTime + travel,
    hitAt: simTime + travel + CONTACT_DWELL,
    target: group,
    normal,
    tangent,
    bitangent,
    center,
    number: hitCount,
    applied: false,
    affected: 0,
  };
  event.targets = [];
  for (const g of nebula.groups) {
    if (!g.active || !g.recoverable) continue;
    const position = nebula.coreContact(g, new THREE.Vector3(), g === group ? sampleIndex : g.contactIndex);
    const fraction = position.distanceTo(center) / 0.72;
    if (fraction > 1) continue;
    const normal = new THREE.Vector3(g.nx, g.ny, g.nz);
    const slide = position.clone().sub(center);
    slide.addScaledVector(normal, -slide.dot(normal)).normalize();
    event.targets.push({ p: g, fraction, position, normal, slide, delay: surfaceDelay(fraction, g.seed) });
  }
  prepareSurfaceFlow(event, event.targets);
  stream.prepare(event);
  impacts.push(event);
  if (intent?.manual) surfacePointer?.acknowledge(group);
  story.armCore();
  lastClickTime = simTime;
  return true;
}

function updateCoreImpacts() {
  for (const g of nebula.groups) {
    g.corePressure = 0;
    g.coreContactBend = 0;
  }
  for (const event of impacts) {
    if (!event.core) continue;
    if (!event.applied) nebula.coreContact(event.target, event.center, event.sampleIndex);
    for (const a of event.targets) {
      const localAge = simTime - event.contactAt - a.delay;
      const influence = 1 - smooth(a.fraction, 0.2, 1);
      a.p.corePressure = contactPressure(localAge) * influence;
      a.p.coreContactBend = contactBend(localAge) * influence;
    }
    if (!event.applied && simTime >= event.hitAt) {
      event.applied = true;
      event.affected = 1;
      lastHit = simTime;
      hitCount++;
      story.breakCore(simTime);
    }
  }
}

function applyImpact(event) {
  event.applied = true;
  lastHit = simTime;
  hitCount++;
  const lastArrival = impacts.reduce(
    (latest, e) => (e.applied ? latest : Math.max(latest, e.hitAt)),
    simTime,
  );
  story.wound(simTime, event.load, lastArrival);
  scars.push({
    home: event.center.clone().divideScalar(currentBreath),
    time: simTime,
    radius: 0.73 + event.fatigue * 0.24,
    number: event.number,
  });
}

function launchVolley(count = 3, intent = null) {
  let sent = 0;
  for (let i = 0; i < Math.min(MAX_STREAMS, count); i++) if (startImpact(undefined, true, intent)) sent++;
  return sent;
}

function planFractures(event) {
  const reach = 0.88 + event.fatigue * 1.2;
  for (const p of particles) {
    if (!p.attached || p.isDone) continue;
    const angle = Math.acos(clamp(p.normal.dot(event.normal), -1, 1));
    if (angle < 0.22 || angle > reach) continue;
    const azimuth = Math.atan2(p.normal.dot(event.bitangent), p.normal.dot(event.tangent));
    let best = 0,
      bank = 0,
      axis = 0;
    for (let branch = 0; branch < 3; branch++) {
      const heading = 0.4 + (branch * TAU) / 3 + event.number * 0.57 + 0.24 * Math.sin(angle * 3.1 + branch);
      const difference = azimuth - heading;
      if (Math.cos(difference) < 0) continue;
      const distance = Math.sin(difference) * Math.sin(angle) * 2.3;
      const weight =
        (1 - smooth(Math.abs(distance), 0.025, 0.27)) *
        smooth(angle, 0.22, 0.44) *
        (1 - smooth(angle, reach - 0.22, reach));
      if (weight > best) {
        best = weight;
        bank = Math.sign(distance) || 1;
        axis = heading;
      }
    }
    if (best < 0.025) continue;
    const split = event.tangent
      .clone()
      .multiplyScalar(-Math.sin(axis))
      .addScaledVector(event.bitangent, Math.cos(axis));
    split.addScaledVector(p.normal, -split.dot(p.normal)).normalize().multiplyScalar(bank);
    event.fractures.push({
      p,
      split,
      weight: best,
      bank,
      at: event.hitAt + 0.08 + angle * (0.82 - event.fatigue * 0.42),
    });
  }
  event.fractures.sort((a, b) => a.at - b.at);
}

function releaseFractureFront(event) {
  while (
    event.fractureCursor < event.fractures.length &&
    event.fractures[event.fractureCursor].at <= simTime
  ) {
    const { p, split, weight, bank } = event.fractures[event.fractureCursor++];
    if (!p.attached || p.isDone) continue;
    p.fractureTarget = Math.min(1, p.fractureTarget + weight * (0.34 + event.fatigue * 0.75));
    p.splitOffset.addScaledVector(split, weight * (0.23 + event.fatigue * 0.16)).clampLength(0, 0.52);
    p.splitTurnTarget += bank * weight * 0.24;
    p.damage += weight * (0.13 + event.fatigue * 0.2);
    p.impulse.multiplyScalar(1 - smooth(simTime - p.impulseTime, 0, 0.18));
    p.impulse.addScaledVector(split, weight * (0.18 + event.fatigue * 0.45));
    p.impulseTime = simTime;
    if (p.fractureTarget > 0.7 && weight > 0.64 && p.seed < 0.8) {
      detachPetal(p);
      p.impulse.addScaledVector(p.normal, 0.35 + event.fatigue * 0.4);
      totalLost++;
      event.detached++;
    }
  }
}

function releaseImpactFront(event) {
  while (event.cursor < event.targets.length && event.targets[event.cursor].at <= simTime) {
    const { p, angle, slide } = event.targets[event.cursor++];
    if (!p.attached || p.isDone) continue;
    const influence = 1 - smooth(angle, 0.06, event.radius);
    p.hitTime = simTime;
    p.hitStrength = influence;
    p.damage += influence * 0.67 * (1 + event.fatigue * 0.45);
    event.affected++;
    temporary.copy(slide);
    p.hitDirection.copy(event.normal).addScaledVector(temporary, 0.5).normalize();
    const pending = 1 - smooth(simTime - p.impulseTime, 0, 0.18);
    p.impulse.multiplyScalar(pending);
    p.impulse.addScaledVector(event.normal, influence * (1.1 + p.seed * 0.4) * (1 + event.fatigue * 0.5));
    p.impulse.addScaledVector(temporary, influence * (0.58 + p.seed * 0.62) * (1 + event.fatigue * 0.5));
    p.impulse.y += 0.16 * influence;
    p.impulseTime = simTime;
    const azimuth = Math.atan2(p.normal.dot(event.bitangent), p.normal.dot(event.tangent));
    const tornRadius =
      0.42 +
      event.fatigue * 0.1 +
      0.045 * Math.sin(azimuth * 3 + event.number) +
      0.022 * Math.sin(azimuth * 7);
    if ((angle < tornRadius && p.seed < 0.96) || p.damage > 1.13) {
      detachPetal(p);
      event.detached++;
      totalLost++;
      p.impulse.addScaledVector(event.tangent, (p.seed - 0.5) * 0.5);
    } else {
      p.impulse.multiplyScalar(1.65);
      p.scarOffset.addScaledVector(temporary, 0.2 * influence);
      p.scarOffset.clampLength(0, 0.18);
      p.scarWeight = Math.max(p.scarWeight, influence);
    }
  }
}

function updateThree(dt) {
  simTime += dt;
  story.update(dt, simTime);
  const breathTime = story.visualTime;
  currentBreath =
    (1 + 0.019 * Math.sin((breathTime * TAU) / 7.8) + 0.0035 * Math.sin((breathTime * TAU) / 13)) *
    (1 - story.gather * 0.025);
  if (story.burstAge >= 0) {
    if (!released) {
      if (!nebula.captured) renderParticles(true);
      const origin = impacts.length ? impacts[impacts.length - 1].normal.toArray() : [0, 0, 1];
      nebula.begin(origin, query.get('energy') === 'soft' ? 0.8 : 1);
      released = true;
      for (const p of particles) {
        if (p.attached) {
          p.attached = false;
          if (!nebula.groups[p.id].recoverable) totalLost++;
        }
        p.ionization = nebula.groups[p.id].recoverable ? 0 : 1;
        p.vel.set(0, 0, 0);
      }
    }
    if (story.finalAge >= 0 && !nebula.motion.final) {
      const event = impacts.find((e) => e.core);
      nebula.beginFinal(event ? event.normal.toArray() : [0, 0, 1], camera);
      uiRupture.begin(nebula.groups);
      totalLost = SHELL_COUNT;
    }
    if (!nebula.motion.final) {
      if (auto && story.acceptsImpact && simTime >= Math.max(nextAuto, story.burstAt + CORE_AUTO_AGE))
        startImpact();
      updateCoreImpacts();
    }
    nebula.update(dt, story.finalAge >= 0 ? story.finalAge : story.burstAge);
    if (story.finalAge >= 0) uiRupture.advanceFront(story.finalAge);
    currentBreath = nebula.motion.coreBreath;
    for (let i = impacts.length - 1; i >= 0; i--) if (simTime - impacts[i].time > 8) impacts.splice(i, 1);
    return;
  }
  if (auto && story.acceptsImpact && simTime >= nextAuto) {
    const volley = hitCount === 0 ? 1 : story.strain < 0.48 ? 2 : 3;
    launchVolley(volley);
  }
  for (const p of particles) {
    p.contactPressure = 0;
    p.contactGlow = 0;
    p.contactBend = 0;
    p.contactWeight = 0;
  }
  for (const event of impacts) {
    for (const { p, angle, delay } of event.targets) {
      const localAge = simTime - event.contactAt - delay;
      if (localAge < 0 || localAge > 1.7) continue;
      const influence = 1 - smooth(angle, 0.06, event.radius);
      const load = contactPressure(localAge);
      p.contactBend += influence * contactBend(localAge);
      if (influence > p.contactWeight) {
        p.contactWeight = influence;
        p.contactT = p === event.target ? event.sample.t : 0.53;
        p.contactU = p === event.target ? event.sample.across : 0;
      }
      if (p.attached) p.contactPressure = Math.min(1, p.contactPressure + influence * load);
      const light =
        0.55 * load + 0.52 * smooth(localAge, 0.015, 0.07) * Math.exp(-Math.max(0, localAge - 0.07) * 6);
      p.contactGlow = Math.min(1, p.contactGlow + influence * light);
    }
    if (!event.applied && event.target.attached) surfaceContact(event.target, event.center, event.sample);
    if (!event.applied && simTime >= event.hitAt) applyImpact(event);
    if (event.applied) {
      releaseImpactFront(event);
      releaseFractureFront(event);
    }
  }
  for (const p of particles)
    p.update(dt, simTime, currentBreath, story.visualTime, story.instability, story.gather, story.strain);
  for (let i = impacts.length - 1; i >= 0; i--) {
    if (simTime - impacts[i].time > 8) impacts.splice(i, 1);
  }
}

// Convert each petal into point positions and colors.
function renderParticles(capture = false) {
  if (story.burstAge >= 0 && !capture) {
    nebula.render(pointLayers, story.finalAge >= 0 ? story.finalAge : story.burstAge, camera, dof);
    pointCount = nebula.activeCount;
    return;
  }
  capture = capture || story.phase === 'rupture';
  let drawCount = 0;
  const time = story.visualTime;
  const matrix = camera.matrixWorldInverse.elements;
  pointLayers.begin(camera);
  const viewScars = scars.map((s) => {
    const center = s.home.clone().multiplyScalar(currentBreath);
    const ndc = center.clone().project(camera);
    return {
      x: ndc.x,
      y: ndc.y,
      z: center.z,
      radius: (s.radius * camera.projectionMatrix.elements[5]) / (camera.position.z - center.z),
      strength: smooth(time - s.time, 1.5, 7),
      number: s.number,
    };
  });
  for (const p of particles) {
    if (capture) nebula.groups[p.id].active = !p.isDone;
    if (p.isDone) continue;
    const attached = p.attached;
    const age = time - p.hitTime;
    const { ux, uy, uz, vx, vy, vz, nx, ny, nz } = petalFrame(p);
    const facing = smooth(p.home.z, -1.7, 1.3);
    const releaseMix = releaseBlend(p);
    const depth = (0.24 + 0.76 * facing) * (1 - releaseMix) + 0.72 * releaseMix;
    const incidence = nx * light.x + ny * light.y + nz * light.z;
    const diffuse = 0.25 + 0.62 * Math.max(0, incidence) + 0.25 * Math.max(0, -incidence);
    const fresnel = Math.pow(1 - Math.abs(nz), 2);
    let scarShade = 1;
    if (releaseMix < 1 && viewScars.length) {
      vector.copy(p.pos).project(camera);
      for (const s of viewScars) {
        if (p.pos.z > s.z - 0.32) continue;
        const dx = (vector.x - s.x) * camera.aspect,
          dy = vector.y - s.y;
        const r = Math.hypot(dx, dy) / s.radius;
        const ragged = 1 + 0.09 * Math.sin(Math.atan2(dy, dx) * 5 + s.number);
        scarShade *= 1 - 0.88 * (1 - smooth(r / ragged, 0.48, 1.25)) * s.strength * (1 - releaseMix);
      }
    }
    const luminosity = depth * (diffuse + fresnel * 0.46) * p.tone * scarShade * (1 - p.fracture * 0.3);
    const breakup =
      (p.hitStrength * 0.13 * smooth(age, 0.04, 0.22) * Math.exp(-Math.max(0, age - 0.5) * 0.37) +
        p.recoverySlip * 0.07 +
        p.fracture * story.strain * 0.07) *
        (1 - releaseMix) +
      0.025 * releaseMix;
    const ionization = attached ? 0 : p.ionization;
    const fadeSize = Math.sqrt(Math.max(0.001, p.lifespan));
    const hero = p.hero;
    const lu = ux * light.x + uy * light.y + uz * light.z;
    const lv = vx * light.x + vy * light.y + vz * light.z;
    const viewDepth = -(matrix[2] * p.pos.x + matrix[6] * p.pos.y + matrix[10] * p.pos.z + matrix[14]);
    const depthError = Math.max(0, Math.abs(viewDepth - (camera.position.length() - 1.25)) - 0.55);
    const softness = dof ? Math.min(2, depthError / 1.45) : 0;
    const screenScale = (innerHeight * 0.5) / Math.max(0.1, viewDepth);
    pointLayers.prepare(softness, screenScale);
    const cosPhase = p.cosPhase,
      sinPhase = p.sinPhase;
    const glintSin = Math.sin(time * 0.45 + p.phase),
      glintCos = Math.cos(time * 0.45 + p.phase);
    const group = nebula.groups[p.id];
    if (capture) {
      group.depth = viewDepth;
      group.weight = p.lifespan;
      group.x = p.pos.x;
      group.y = p.pos.y;
      group.z = p.pos.z;
      group.vx = p.vel.x;
      group.vy = p.vel.y;
      group.vz = p.vel.z;
      group.flyby = group.flybyCandidate && p.attached;
      group.loose = !p.attached;
      group.flightScale = camera.position.z;
      group.fracture = p.fracture;
      group.light = luminosity;
      group.ax = vx;
      group.ay = vy;
      group.az = vz;
    }
    let sampleIndex = group.offset;
    const windX = 0.24 * Math.sin(time * 0.6 + p.phase);
    const windY = 0.24 * Math.cos(time * 0.47 + p.phase);
    const windZ = 0.22 * Math.sin(time * 0.39 + p.phase);
    const rootPull = attached ? Math.min(0.82, p.recoveryEffort * 2.8) : 0;
    const rootX = attached ? (p.target.x - p.pos.x) * rootPull : p.detachRoot.x * (1 - releaseMix);
    const rootY = attached ? (p.target.y - p.pos.y) * rootPull : p.detachRoot.y * (1 - releaseMix);
    const rootZ = attached ? (p.target.z - p.pos.z) * rootPull : p.detachRoot.z * (1 - releaseMix);
    if (attached && !capture) {
      const membraneSize = 0.85 + hero * 0.85,
        membraneOpacity = 0.48 + hero * 2;
      const contact = p.contactGlow,
        hover = p.pointerGlow,
        effort = p.recoveryEffort;
      const liftLight = contact * 0.72 + effort * 0.52;
      const sheetLight = contact * 0.16 + hover * 0.08 + effort * 0.12;
      const centerX = p.pos.x,
        centerY = p.pos.y,
        centerZ = p.pos.z;
      const sx = ux * p.width,
        sy = uy * p.width,
        sz = uz * p.width;
      const tx = vx * p.length,
        ty = vy * p.length,
        tz = vz * p.length;
      const curve = p.length * p.curl,
        bending = p.contactBend !== 0;
      for (const sample of p.samples) {
        const kind = sample.kind,
          membrane = kind === 2;
        const z = sample.z * curve + (bending ? membraneBend(p, sample) : 0);
        const scatter = breakup * (0.2 + sample.seed * 0.8) + (kind === 3 ? 0.025 : 0.0015);
        const dx = sample.driftX * cosPhase - sample.driftZ * sinPhase + windX * sample.driftY;
        const dy = sample.driftY + windY * sample.driftZ;
        const dz = sample.driftX * sinPhase + sample.driftZ * cosPhase + windZ * sample.driftX;
        const px =
          centerX + sx * sample.x + tx * sample.y + nx * z + dx * scatter + rootX * sample.rootWeight;
        const py =
          centerY + sy * sample.x + ty * sample.y + ny * z + dy * scatter + rootY * sample.rootWeight;
        const pz =
          centerZ + sz * sample.x + tz * sample.y + nz * z + dz * scatter + rootZ * sample.rootWeight;
        const fiber =
          kind === 0
            ? 1.38
            : kind === 1
              ? 0.87
              : membrane
                ? (0.38 + 0.62 * Math.abs(sample.nx * lu + sample.ny * lv + sample.nz * incidence)) *
                  (0.65 + hero * 0.65)
                : 1.45;
        const glintBase =
          kind === 3 ? Math.max(0, glintSin * sample.glintCos + glintCos * sample.glintSin) : 0;
        const glint2 = glintBase * glintBase,
          glint4 = glint2 * glint2;
        const contactLight = membrane ? sheetLight : liftLight + hover * (kind === 0 ? 1 : 0.42);
        const intensity =
          luminosity * (fiber + glint4 * glint4 * 0.75 + contactLight) * (0.78 + sample.seed * 0.35);
        const warm = kind === 0 && sample.seed > 0.63 ? 0.18 : 0;
        pointLayers.add(
          kind,
          px,
          py,
          pz,
          intensity * (0.88 + warm),
          intensity * 0.96,
          intensity * (1 - warm * 1.5),
          sample.alpha * sample.coverage * (membrane ? sample.thickness * membraneOpacity : 1),
          sample.size * (membrane ? membraneSize : 1),
        );
      }
      drawCount += p.samples.length;
      continue;
    }
    for (const sample of p.samples) {
      drawCount++;
      const release = ionization === 0 ? 0 : smooth(ionization, sample.threshold, sample.threshold + 0.3);
      const shapeScale = fadeSize * (1 - release * 0.72);
      const x = sample.x * p.width * shapeScale;
      const y = sample.y * p.length * shapeScale;
      const z = (sample.z * p.length * p.curl + membraneBend(p, sample)) * shapeScale;
      const scatter =
        (breakup + release * 0.92) * (0.2 + sample.seed * 0.8) + (sample.kind === 3 ? 0.025 : 0.0015);
      const dx = sample.driftX * cosPhase - sample.driftZ * sinPhase + windX * sample.driftY;
      const dy = sample.driftY + windY * sample.driftZ;
      const dz = sample.driftX * sinPhase + sample.driftZ * cosPhase + windZ * sample.driftX;
      const px = p.pos.x + ux * x + vx * y + nx * z + dx * scatter + rootX * sample.rootWeight;
      const py = p.pos.y + uy * x + vy * y + ny * z + dy * scatter + rootY * sample.rootWeight;
      const pz = p.pos.z + uz * x + vz * y + nz * z + dz * scatter + rootZ * sample.rootWeight;
      const membraneLight = 0.38 + 0.62 * Math.abs(sample.nx * lu + sample.ny * lv + sample.nz * incidence);
      const fiber =
        sample.kind === 0
          ? 1.38
          : sample.kind === 1
            ? 0.87
            : sample.kind === 2
              ? membraneLight * (0.65 + hero * 0.65)
              : 1.45;
      const glintBase =
        sample.kind === 3 ? Math.max(0, glintSin * sample.glintCos + glintCos * sample.glintSin) : 0;
      const glint2 = glintBase * glintBase,
        glint4 = glint2 * glint2;
      const glint = glint4 * glint4;
      const contactLight =
        p.contactGlow * (sample.kind === 2 ? 0.16 : 0.72) +
        p.pointerGlow * (sample.kind === 2 ? 0.08 : sample.kind === 0 ? 1 : 0.42) +
        p.recoveryEffort * (sample.kind === 2 ? 0.12 : 0.52);
      const intensity =
        luminosity * (fiber + glint * 0.75 + release * 0.55 + contactLight) * (0.78 + sample.seed * 0.35);
      const warm = sample.kind === 0 && sample.seed > 0.63 ? 0.18 * (1 - release) : 0;
      const dustOpacity = sample.dustSeed > 0.81 ? 0.78 : 0.008;
      const dustSize = 0.022 + sample.seed * 0.016;
      const baseSize = sample.size * (sample.kind === 2 ? 0.85 + hero * 0.85 : 1);
      const baseAlpha = sample.alpha * (sample.kind === 2 ? sample.thickness * (0.48 + hero * 2.0) : 1);
      const pointSize = baseSize + (dustSize - baseSize) * release;
      const opacity =
        (baseAlpha + (dustOpacity - baseAlpha) * release) *
        p.lifespan *
        (1 + (0.85 * (1 - release * 0.45) - 1) * releaseMix) *
        sample.coverage;
      const kind = release > 0.65 ? 3 : sample.kind;
      pointLayers.add(
        kind,
        px,
        py,
        pz,
        intensity * (0.88 + warm),
        intensity * 0.96,
        intensity * (1 - warm * 1.5),
        opacity,
        pointSize,
      );
      if (capture)
        nebula.capture(
          sampleIndex,
          px,
          py,
          pz,
          intensity * (0.88 + warm),
          intensity * 0.96,
          intensity * (1 - warm * 1.5),
          opacity,
          pointSize,
          kind,
        );
      sampleIndex++;
    }
  }
  pointCount = drawCount;
  pointLayers.finish();
  if (capture) nebula.captured = true;
}

function renderStream() {
  for (const event of impacts) {
    if (event.core) {
      if (!event.applied && !nebula.motion.final)
        nebula.coreContact(event.target, event.center, event.sampleIndex);
    } else if (!event.applied && event.target.attached)
      surfaceContact(event.target, event.center, event.sample);
    event.surfaceFade = event.core
      ? 1 - smooth(story.finalAge, 0, 0.14)
      : 1 - smooth(story.burstAge, 0, 0.12);
    if (simTime - event.time < STREAM_LIFETIME && event.surfaceFade > 0) {
      updateSurfaceFlow(event, (a, out) => {
        if (event.core) {
          if (!nebula.motion.final) {
            nebula.coreContact(a.p, out);
            a.lastCenter ??= new THREE.Vector3();
            a.lastCenter.set(a.p.cx, a.p.cy, a.p.cz);
            a.lastPoint ??= new THREE.Vector3();
            a.lastPoint.copy(out);
          } else if (a.lastPoint) {
            out.copy(a.lastPoint).add(temporary.set(a.p.cx, a.p.cy, a.p.cz).sub(a.lastCenter));
          }
        } else if (story.burstAge < 0) surfaceContact(a.p, out);
      });
    }
  }
  stream.render(impacts, simTime, camera);
}

function setPaused(value) {
  paused = value;
  accumulator = 0;
  updateUI();
}

// Leave each caption visible long enough to read.
function updateUI() {
  let phase = 'Suspended',
    thought = 'Still whole. Still breathing.';
  if (hitCount > 0) {
    phase = 'Reaching back';
    thought = 'Still trying to gather itself.';
  }
  if (story.phase === 'unsteady') {
    phase = 'Unsteady';
    thought = 'Barely held together. Breathing out of time.';
  }
  const passage = {
    rupture: ['Release', 'Every boundary breaks toward you.'],
    burst: ['Release', 'Every boundary breaks toward you.'],
    crossing: ['Release', 'Every boundary breaks toward you.'],
    regather: ['Drawing inward', 'Gathering what remains into one place.'],
    core: ['Held breath', 'The tighter the hold, the harder the stillness.'],
    coreRupture: ['Held breath', 'The tighter the hold, the harder the stillness.'],
  }[story.phase];
  if (passage) [phase, thought] = passage;
  const ending = story.finalAge >= 0,
    now = performance.now();
  const captionNode = document.querySelector('.caption');
  if (!ending) {
    if (phase === caption.phase) {
      caption.pending = null;
      captionNode.classList.remove('changing');
    } else if (simTime - caption.since >= 4.8) {
      if (!caption.pending) {
        caption.pending = { phase, thought };
        caption.at = now;
        captionNode.classList.add('changing');
      } else if (now - caption.at >= 320) {
        caption = { ...caption.pending, since: simTime, pending: null, at: 0 };
        captionNode.classList.remove('changing');
      }
    }
  }
  const key = caption.phase + caption.thought;
  if (key !== lastPhase) {
    document.querySelector('#phase').textContent = caption.phase;
    document.querySelector('#thought').textContent = caption.thought;
    lastPhase = key;
  }
  const controls = [paused, auto, dof, canSend(), ending, story.phase === 'gone'].join('|');
  if (controls !== lastControls) {
    lastControls = controls;
    const description = text(ending ? (story.phase === 'gone' ? 'empty' : 'release') : 'stage');
    renderer.domElement.setAttribute('aria-label', description);
    document.querySelector('#stage').setAttribute('aria-label', description);
    document.querySelector('#impact').disabled = !canSend();
    document.querySelector('#play-icon').textContent = paused ? '▷' : 'Ⅱ';
    document.querySelector('#pause').setAttribute('aria-label', text(paused ? 'play' : 'pause'));
    const autoButton = document.querySelector('#auto');
    autoButton.setAttribute('aria-pressed', String(auto));
    autoButton.title = text(auto ? 'autoOnHint' : 'autoOffHint');
    autoButton.querySelector('.button-label').textContent = text(auto ? 'autoOn' : 'autoOff');
    document.querySelector('#dof').setAttribute('aria-pressed', String(dof));
  }
  if (!caption.pending) uiRupture?.prepare();
}

function canSend() {
  return (
    story.acceptsImpact && impacts.filter((e) => simTime - e.time < STREAM_LIFETIME).length < MAX_STREAMS
  );
}

function sendManual() {
  const aim = surfacePointer?.aim;
  return startImpact(aim?.target, false, {
    manual: true,
    sample: aim?.sample,
    sampleIndex: aim?.sampleIndex,
  });
}

// Use the visible petal surface for hover and clicks.
function pickSurface(clientX, clientY, type = 'mouse') {
  if (!canSend()) return null;
  const rect = renderer.domElement.getBoundingClientRect(),
    padding = type === 'touch' ? 15 : 10;
  let best = null,
    bestScore = Infinity;
  const core = story.phase === 'core',
    items = core ? nebula.groups : particles;
  for (const item of items) {
    if (core ? !item.active || !item.recoverable : !item.attached || item.isDone) continue;
    if (impacts.some((e) => !e.applied && e.target === item)) continue;
    const p = core ? particles[item.id] : item;
    vector.set(core ? item.cx : p.pos.x, core ? item.cy : p.pos.y, core ? item.cz : p.pos.z);
    const depth = camera.position.z - vector.z;
    if (depth <= 0.35) continue;
    vector.project(camera);
    const sx = rect.left + (vector.x + 1) * rect.width * 0.5,
      sy = rect.top + (1 - vector.y) * rect.height * 0.5;
    const bound =
      ((p.length + 0.22) * rect.height * camera.projectionMatrix.elements[5] * 0.5) / depth + padding;
    if (Math.hypot(sx - clientX, sy - clientY) > bound) continue;
    const frame = core ? null : petalFrame(p),
      samples = core ? item.pickIndices : p.pickSamples;
    if (core) nebula.pose(item, nebula.motion.age);
    for (const sample of samples) {
      if (core) nebula.corePoint(item, sample, temporary);
      else surfaceContact(p, temporary, sample, frame);
      const pointDepth = camera.position.z - temporary.z;
      if (pointDepth <= 0.35) continue;
      vector.copy(temporary).project(camera);
      const x = rect.left + (vector.x + 1) * rect.width * 0.5,
        y = rect.top + (1 - vector.y) * rect.height * 0.5;
      const miss = Math.hypot(x - clientX, y - clientY),
        score = miss + pointDepth * 0.4;
      if (miss <= padding && score < bestScore) {
        bestScore = score;
        best = {
          target: item,
          sample: core ? undefined : sample,
          sampleIndex: core ? sample : p.samples.indexOf(sample),
          screen: { x, y },
        };
      }
    }
  }
  return best;
}

function attachInteraction() {
  document.querySelector('#pause').addEventListener('click', () => setPaused(!paused));
  document
    .querySelector('#impact')
    .addEventListener('click', (event) =>
      event.shiftKey ? launchVolley(3, { manual: true }) : sendManual(),
    );
  document.querySelector('#reset').addEventListener('click', reset);
  document.querySelector('#restart-center').addEventListener('click', () => {
    reset();
    setPaused(reducedMotion);
  });
  document.querySelector('#dof').addEventListener('click', () => {
    dof = !dof;
    dirty = true;
    updateUI();
  });
  document.querySelector('#auto').addEventListener('click', () => {
    auto = !auto;
    if (auto) {
      nextAuto = simTime + 1.1;
      setPaused(false);
    }
    updateUI();
  });
  surfacePointer = new SurfacePointer(renderer.domElement, {
    pick: pickSurface,
    available: canSend,
    fire: (aim) =>
      startImpact(aim.target, false, { manual: true, sample: aim.sample, sampleIndex: aim.sampleIndex }),
  });
  window.addEventListener('keydown', (event) => {
    if (
      event.repeat ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.target.closest('input,textarea,[contenteditable="true"]')
    )
      return;
    if (story.finalAge >= 0 && !['KeyR'].includes(event.code)) return;
    if (event.code === 'Space' && event.target.closest('button')) return;
    if (event.code === 'Space') {
      event.preventDefault();
      setPaused(!paused);
    }
    if (event.code === 'KeyR') reset();
    if (event.code === 'KeyI') event.shiftKey ? launchVolley(3, { manual: true }) : sendManual();
    if (event.code === 'KeyH') {
      document.body.classList.toggle('hide-ui');
      uiRupture.prepare();
    }
    if (event.code === 'KeyD') {
      dof = !dof;
      dirty = true;
      updateUI();
    }
  });
  document.addEventListener('visibilitychange', () => {
    previousTime = null;
    accumulator = 0;
  });
  window.addEventListener('resize', () => {
    dirty = true;
    uiRupture.prepare();
  });
}

// Fixed physics steps keep the movement timing consistent.
function animate(now) {
  const elapsed = previousTime === null ? 0 : Math.min(0.1, (now - previousTime) / 1000);
  previousTime = now;
  if (elapsed > 0) fps += (1 / elapsed - fps) * 0.035;
  if (!paused && !document.hidden && story.finalAge < 12) {
    accumulator += elapsed;
    while (accumulator >= STEP) {
      updateThree(STEP);
      accumulator -= STEP;
    }
    dirty = true;
  }
  if (surfacePointer?.update(elapsed, now)) dirty = true;
  const redraw = dirty;
  if (dirty) {
    renderParticles();
    renderStream();
    dirty = false;
  }
  if (now - lastUI > 120) {
    updateUI();
    lastUI = now;
  }
  if (redraw) renderArtwork();
}

function renderArtwork() {
  uiRupture.update(story.finalAge, scene);
  renderer.render(scene, camera);
  uiRupture.render(renderer);
}

function audioState() {
  let affectedCount = 0,
    affectedSpeed = 0,
    coreCount = 0,
    coreSpeed = 0,
    tension = 0;
  for (const p of particles)
    if (p.attached && p.hitStrength > 0.12) {
      affectedCount++;
      affectedSpeed += p.vel.length();
    }
  for (const g of nebula.groups)
    if (g.active && g.recoverable) {
      coreCount++;
      coreSpeed += Math.hypot(g.cvx, g.cvy, g.cvz);
      tension += g.coreTension;
    }
  return {
    time: simTime,
    paused,
    breath: currentBreath,
    affectedSpeed: affectedSpeed / Math.max(1, affectedCount),
    impactEvents: impacts.map((e) => ({
      targetId: e.target.id,
      travel: e.travel,
      contactAt: e.contactAt,
      hitAt: e.hitAt,
      center: e.center.toArray(),
    })),
    story: {
      phase: story.phase,
      strain: story.strain,
      burstAge: story.burstAge,
      finalAge: story.finalAge,
      core: {
        speed: coreSpeed / Math.max(1, coreCount),
        tension: tension / Math.max(1, coreCount),
        rhythm: nebula.motion.core.snapshot(),
      },
    },
  };
}


try {
  setupInterface();
  ({ scene, camera, renderer } = initThree(document.querySelector('#stage')));
  uiRupture = new UIRupture(camera);
  setupThree();
  attachInteraction();
  document.fonts.ready.then(() => uiRupture.prepare());
  window.remains = {audioState};
  renderer.setAnimationLoop(animate);
} catch (error) {
  const message = document.querySelector('#error');
  message.hidden = false;
  message.textContent = text('webgl');
  console.error(error);
}
