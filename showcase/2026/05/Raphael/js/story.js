import { MathUtils } from 'three';
const smooth = MathUtils.smoothstep;

export const BREAK_THRESHOLD = 1.75;
export const RETURN_START = 1.65;
export const RETURN_BLEND_END = 3.6;
export const CORE_SHAPE_END = 6.8;
export const CORE_READY_AGE = 8;
export const CORE_AUTO_AGE = 16;
export const FINAL_FADE_END = 9;
export class Story {
  constructor() {
    this.reset();
  }
  reset() {
    this.criticalAt = Infinity;
    this.burstAt = Infinity;
    this.finalBurstAt = Infinity;
    this.finalAge = -1;
    this.corePending = false;
    this.phase = 'shell';
    this.visualTime = 0;
    this.instability = 0;
    this.damage = 0;
    this.strain = 0;
    this.gather = 0;
    this.burstAge = -1;
  }
  get acceptsImpact() {
    return !Number.isFinite(this.criticalAt) || (this.phase === 'core' && !this.corePending);
  }
  armCore() {
    this.corePending = true;
  }
  breakCore(time) {
    if (!Number.isFinite(this.finalBurstAt)) this.finalBurstAt = time + 0.035;
  }
  // Damage accumulates until the first rupture.
  wound(time, load, lastArrival = time) {
    this.damage = Math.min(BREAK_THRESHOLD * 1.3, this.damage + load);
    if (this.damage >= BREAK_THRESHOLD && this.acceptsImpact) {
      this.criticalAt = time;
      this.burstAt = Math.max(time + 0.62, lastArrival + 0.12);
    }
  }
  update(dt, time) {
    const age = time - this.criticalAt;
    this.strain += (Math.min(1, this.damage / BREAK_THRESHOLD) - this.strain) * (1 - Math.exp(-dt * 2.8));
    this.finalAge = time >= this.finalBurstAt ? time - this.finalBurstAt : -1;
    this.phase =
      age < 0
        ? this.strain > 0.28
          ? 'unsteady'
          : 'shell'
        : time < this.burstAt
          ? 'rupture'
          : this.finalAge >= FINAL_FADE_END
            ? 'gone'
            : this.finalAge >= 0
              ? this.finalAge < 1.3
                ? 'finalBurst'
                : 'dissolving'
              : Number.isFinite(this.finalBurstAt)
                ? 'coreRupture'
                : time < this.burstAt + 1.25
                  ? 'burst'
                  : time < this.burstAt + RETURN_START
                    ? 'crossing'
                    : time < this.burstAt + CORE_READY_AGE
                      ? 'regather'
                      : 'core';
    this.gather = this.finalAge < 0 ? smooth(time - this.burstAt, RETURN_START, CORE_READY_AGE) : 0;
    this.instability = smooth(this.strain, 0.1, 1);
    this.burstAge = time >= this.burstAt ? time - this.burstAt : -1;
    this.visualTime += dt;
  }
}

const hash = (n) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const noise = (t, seed) => {
  const i = Math.floor(t),
    u = t - i,
    f = u * u * u * (u * (u * 6 - 15) + 10);
  return (hash(i + seed) * (1 - f) + hash(i + 1 + seed) * f) * 2 - 1;
};
class BreathClock {
  constructor() {
    this.reset();
  }
  reset() {
    this.events = [];
    this.next = 0;
    this.index = 0;
  }
  update(t) {
    while (this.next < t + 1) {
      const id = this.index++,
        seed = 37 + id * 13;
      const inhale = 0.14 + hash(seed) * 0.28,
        hold = 0.07 + hash(seed + 1) * 0.28;
      const exhale = 0.23 + hash(seed + 2) * 0.38,
        pause = 0.09 + hash(seed + 3) * 0.25 + (hash(seed + 4) > 0.79 ? 0.55 : 0);
      const e = {
        id,
        start: this.next,
        inhale,
        hold,
        exhale,
        pause,
        depth: 0.58 + hash(seed + 5) * 0.64,
        failed: hash(seed + 6) > 0.58,
      };
      this.next += inhale + hold + exhale + pause;
      this.events.push(e);
    }
    while (this.events.length > 2 && this.events[1].start < t - 3) this.events.shift();
  }
  pressure(t) {
    for (let i = this.events.length - 1; i >= 0; i--) {
      const e = this.events[i],
        a = t - e.start;
      if (a < 0) continue;
      const release = e.inhale + e.hold;
      const primary = smooth(a, 0, e.inhale) * (1 - smooth(a, release, release + e.exhale));
      const catchPull = e.failed
        ? 0.34 *
          smooth(a, release + 0.05, release + 0.14) *
          (1 - smooth(a, release + 0.21, release + e.exhale + 0.08))
        : 0;
      return e.depth * (primary + catchPull);
    }
    return 0;
  }
}
// The remaining petals gather and breathe before the final rupture.
export class CoreMotion {
  constructor(groups, particles) {
    this.groups = groups;
    this.particles = particles;
    this.clock = new BreathClock();
    this.reset();
  }
  reset() {
    this.clock.reset();
    this.patches = [];
    this.breath = 1;
    this.pressure = 0;
    this.slips = 0;
    this.lastSlip = -100;
    this.age = 0;
    this.time = 0;
    this.lateIds = [];
    this.wound = [0, 0, 1];
  }

  begin(origin) {
    this.reset();
    const length = Math.hypot(...origin) || 1;
    this.wound = origin.map((n) => n / length);
    const [wx, wy, wz] = this.wound,
      tl = Math.hypot(wx, wz) || 1;
    this.tangent = [wz / tl, 0, -wx / tl];
    const centers = [
      this.wound,
      [-0.67, 0.42, 0.61],
      [0.57, 0.63, 0.52],
      [0.28, -0.77, 0.57],
      [-0.42, -0.35, -0.84],
    ];
    this.patches = centers.map((n, id) => ({
      n,
      seed: 19 + id * 47,
      turn: 0,
      velocity: 0,
      stress: 0,
      slip: 0,
      slipAt: -100,
      threshold: 0.13 + hash(id + 7) * 0.07,
      pressure: 0,
      fold: 0,
      lag: 0.05 + id * 0.055,
    }));
    for (const g of this.groups) {
      const p = this.particles[g.id],
        dot = g.nx * wx + g.ny * wy + g.nz * wz;
      g.coreWound = smooth(dot, 0.42, 0.98);
      g.coreSide = g.nx * this.tangent[0] + g.nz * this.tangent[2] >= 0 ? 1 : -1;
      g.coreDamage = Math.min(1, p.damage * 0.38 + p.fracture * 0.65 + p.scarWeight * 0.35);
      const weights = this.patches.map((p) =>
        Math.exp((g.nx * p.n[0] + g.ny * p.n[1] + g.nz * p.n[2] - 1) * 6.5),
      );
      const sum = weights.reduce((a, b) => a + b, 0);
      g.coreWeights = weights.map((w) => w / sum);
      g.coreLate = 0;
      g.coreTension = 0;
      g.coreFold = 0;
      g.coreTurn = 0;
      g.coreSlip = 0;
      g.coreOpening = 0;
    }
    const candidates = this.groups
      .filter((g) => g.recoverable && g.nz > -0.18 && g.retention > 0.45)
      .sort(
        (a, b) =>
          b.retention +
          b.coreWound * 0.25 +
          b.seed * 0.13 -
          (a.retention + a.coreWound * 0.25 + a.seed * 0.13),
      );
    const selected = [];
    for (const g of candidates) {
      if (selected.some((n) => g.nx * n.nx + g.ny * n.ny + g.nz * n.nz > 0.72)) continue;
      selected.push(g);
      g.coreLate = selected.length;
      if (selected.length === 3) break;
    }
    this.lateIds = selected.map((g) => g.id);
  }

  update(dt, age) {
    this.age = age;
    const t = Math.max(0, age - RETURN_START) * 0.43;
    this.time = t;
    this.clock.update(t);
    this.pressure = this.clock.pressure(t);
    this.breath = 1.025 - 0.085 * this.pressure;
    this.sagX = 0.018 * noise(t * 0.3, 204);
    this.sagY = 0.024 * noise(t * 0.27, 286);
    let candidate = null,
      largest = 1;
    for (const p of this.patches) {
      p.pressure = this.clock.pressure(t - p.lag);
      const drive =
        0.29 * noise(t * 0.32, p.seed) + 0.055 * noise(t * 0.58, p.seed + 8) + (p.pressure - 0.5) * 0.065;
      p.stress = drive - p.turn;
      const urgency = Math.abs(p.stress) / p.threshold;
      if (age - p.slipAt > 3.6 && urgency > largest) {
        candidate = p;
        largest = urgency;
      }
    }
    if (candidate && age - this.lastSlip > 2.1) {
      candidate.slipAt = age;
      this.lastSlip = age;
      this.slips++;
    }
    for (const p of this.patches) {
      const a = age - p.slipAt;
      p.slip = smooth(a, 0, 0.24) * (1 - smooth(a, 0.62, 1.24));
      p.velocity += (p.stress * (1.4 + p.slip * 12) - p.velocity * (9 - p.slip * 2)) * dt;
      p.turn += p.velocity * dt;
      p.fold = 0.16 * noise(t * 0.4, p.seed + 19) - p.pressure * 0.15 + p.stress * 0.4;
    }
  }

  pull(g, dt, age, blend = 1) {
    const t = this.time,
      settled = smooth(age, 2.8, CORE_SHAPE_END);
    let ox = 0,
      oy = 0,
      oz = 0,
      pressure = 0,
      fold = 0,
      slip = 0,
      stress = 0,
      turn = 0;
    for (let i = 0; i < this.patches.length; i++) {
      const p = this.patches[i],
        w = g.coreWeights[i],
        a = p.turn * w;
      ox += (p.n[1] * g.nz - p.n[2] * g.ny) * a;
      oy += (p.n[2] * g.nx - p.n[0] * g.nz) * a;
      oz += (p.n[0] * g.ny - p.n[1] * g.nx) * a;
      pressure += p.pressure * w;
      fold += p.fold * w;
      slip += p.slip * w;
      stress += Math.abs(p.stress) * w;
      turn += p.turn * w;
    }
    const nx = g.nx + ox,
      ny = g.ny + oy,
      nz = g.nz + oz,
      inv = 1 / (Math.hypot(nx, ny, nz) || 1);
    const late = g.coreLate;
    let radius = 0.98 * (1.035 - 0.105 * pressure) + fold * 0.17;
    if (late) {
      const hesitation = 0.5 + 0.5 * noise(t * 0.25, 107 + late * 17);
      radius += (late === 3 ? 0.65 : 0.24) + hesitation * (late === 3 ? 0.36 : 0.54);
    }
    const woundLoad = g.coreWound * (0.6 + g.coreDamage * 0.4);
    const opening = settled * woundLoad * (0.095 + pressure * 0.07 + stress * 0.16);
    const side = g.coreSide * opening;
    const shrink = 1 - (g.corePressure || 0) * 0.03;
    g.targetX = nx * inv * radius * shrink + this.tangent[0] * side;
    g.targetY = ny * inv * radius * (1 + fold * 0.27) - woundLoad * pressure * 0.06;
    g.targetZ = nz * inv * radius * shrink + this.tangent[2] * side;
    g.targetX += settled * this.sagX;
    g.targetY += settled * this.sagY;
    const grip = 0.2 + 0.8 * smooth(age, RETURN_START, 5.2);
    const stiffness = (late ? 12 : 30) * grip * (1 - 0.18 * slip);
    const damping = ((late ? 5.5 : 8.5) - slip * 0.7) * Math.sqrt(grip);
    for (const prefix of ['r', 'c']) {
      const distance = Math.hypot(
        g.targetX - g[prefix + 'x'],
        g.targetY - g[prefix + 'y'],
        g.targetZ - g[prefix + 'z'],
      );
      const reach = 1 / (1 + distance * 0.6 * (1 - smooth(age, 3.8, CORE_SHAPE_END)));
      for (const axis of ['x', 'y', 'z']) {
        const position = prefix + axis,
          velocity = prefix + 'v' + axis;
        const start = blend < 1 ? g['start' + velocity] : g[velocity];
        const target = g['target' + axis.toUpperCase()];
        const pulled = start + ((target - g[position]) * stiffness * reach - start * damping) * dt;
        g[velocity] = g[velocity] * (1 - blend) + pulled * blend;
        g[position] += g[velocity] * dt;
      }
    }
    const error = Math.hypot(g.targetX - g.cx, g.targetY - g.cy, g.targetZ - g.cz);
    const tension = Math.min(1, error * 2.5 + stress * 2 + pressure * woundLoad * 0.24);
    g.coreTension += (tension - g.coreTension) * (1 - Math.exp(-dt * 3));
    g.coreFold = fold * (0.7 + g.coreDamage * 0.3) + g.coreSide * opening * 0.55;
    g.coreTurn = turn;
    g.coreSlip = slip;
    g.coreOpening = opening;
    g.stretch = Math.hypot(g.cx - g.rx, g.cy - g.ry, g.cz - g.rz);
  }

  snapshot() {
    return {
      pressure: this.pressure,
      slips: this.slips,
      wound: this.wound,
      lateIds: this.lateIds,
      breaths: this.clock.events.map((e) => ({
        id: e.id,
        start: e.start / 0.43,
        inhale: e.inhale / 0.43,
        hold: e.hold / 0.43,
        exhale: e.exhale / 0.43,
        pause: e.pause / 0.43,
        depth: e.depth,
        failed: e.failed,
      })),
      patches: this.patches.map((p) => ({
        turn: p.turn,
        velocity: p.velocity,
        stress: p.stress,
        slip: p.slip,
        pressure: p.pressure,
      })),
    };
  }
}

export class RuptureMotion {
  constructor(groups, particles) {
    this.groups = groups;
    this.core = new CoreMotion(groups, particles);
    this.links = particles.map((p, i) =>
      particles
        .map((q, j) => ({ j, d: p.home.distanceToSquared(q.home) }))
        .filter((q) => q.j !== i && q.d < 0.72 && !particles[q.j].ambient)
        .sort((a, b) => a.d - b.d)
        .slice(0, 4)
        .map((q) => q.j),
    );
    this.reset();
  }

  reset() {
    this.core.reset();
    this.started = false;
    this.final = false;
    this.coreBreath = 1;
    this.age = 0;
    this.broken = 0;
    this.tethered = 0;
    this.meanSpeed = 0;
    this.rearSpeed = 0;
    this.finite = true;
  }

  begin(origin, energy = 1, final = false) {
    this.reset();
    this.started = true;
    this.final = final;
    if (!final) this.core.begin(origin);
    const length = Math.hypot(...origin) || 1;
    for (const g of this.groups) {
      g.cx = g.rx = g.x;
      g.cy = g.ry = g.y;
      g.cz = g.rz = g.z;
      g.cvx = g.rvx = g.vx;
      g.cvy = g.rvy = g.vy;
      g.cvz = g.rvz = g.vz;
      g.broken = g.loose || final;
      g.breakAt = final ? 0 : -1;
      g.stretch = 0;
      const dot = (g.nx * origin[0] + g.ny * origin[1] + g.nz * origin[2]) / length;
      g.delay =
        (0.012 + Math.acos(Math.max(-1, Math.min(1, dot))) * 0.036) *
        (1 - (final ? g.finalTension * 0.4 : 0));
      g.limit = (0.43 + g.seed * 0.24) * (1 - 0.38 * g.fracture);
      const curl = Math.sin(g.angle * 1.7 + g.latitude * 2.3);
      const speed = (3.8 + g.seed * 1.9) * energy * (1 + (final ? g.finalTension * 0.12 : 0));
      g.ix = (g.nx - 0.28 * g.ny * curl) * speed;
      g.iy = (g.ny + 0.28 * g.nx * curl) * speed;
      g.iz = (g.nz * 0.8 + 0.38) * speed;
      if (g.flyby) {
        const lensX = Math.sin(g.angle * 2.1) * 0.95,
          lensY = Math.cos(g.angle * 1.6) * 0.68;
        g.ix = (lensX - g.x) * 0.78 * energy;
        g.iy = (lensY - g.y) * 0.78 * energy;
        g.iz = (g.flightScale - g.z) * (1.13 + g.seed * 0.12) * energy;
      }
    }
  }

  update(dt, age, carrier) {
    if (!this.started) return;
    let broken = 0,
      tethered = 0,
      speed = 0,
      count = 0,
      rearSpeed = 0,
      rearCount = 0,
      finite = true;
    if (!this.final && age >= RETURN_START) this.core.update(dt, age);
    this.coreBreath = this.final ? 1 : this.core.breath;
    const flow = Math.max(0, age - 2.2),
      handoff = smooth(age, 1.4, 4.6);
    const recall = smooth(age, 1.25, 1.95) * (1 - smooth(age, 3.15, 4.35));
    const freed = smooth(age, 0.85, 2.3);
    for (const g of this.groups) {
      if (!g.active) continue;
      const returning = !this.final && g.recoverable;
      const blend = returning
        ? smooth(age, RETURN_START + g.seed * 0.18, RETURN_BLEND_END + g.seed * 0.18)
        : 0;
      if (blend >= 1) {
        this.core.pull(g, dt, age);
        const v = Math.hypot(g.cvx, g.cvy, g.cvz);
        speed += v;
        rearSpeed += v;
        count++;
        rearCount++;
        broken++;
        finite &&= Number.isFinite(g.cx + g.cy + g.cz + g.rx + g.ry + g.rz + v);
        continue;
      }
      if (g.loose) {
        const drag = Math.exp(-dt * 0.35);
        g.cvx *= drag;
        g.cvy *= drag;
        g.cvz *= drag;
        g.cx += g.cvx * dt;
        g.cy += (g.cvy - 0.035) * dt;
        g.cz += (g.cvz + 0.06) * dt;
        finite &&= Number.isFinite(g.cx + g.cy + g.cz + g.cvx + g.cvy + g.cvz);
        continue;
      }
      if (blend > 0) {
        g.startrvx = g.rvx;
        g.startrvy = g.rvy;
        g.startrvz = g.rvz;
        g.startcvx = g.cvx;
        g.startcvy = g.cvy;
        g.startcvz = g.cvz;
      }
      const local = age - g.delay;
      const impulse = smooth(local, 0, 0.18) - smooth(local - dt, 0, 0.18);
      g.cvx += g.ix * impulse;
      g.cvy += g.iy * impulse;
      g.cvz += g.iz * impulse;
      g.rvx += (this.final ? g.ix * 0.7 : g.nx * 0.65) * impulse;
      g.rvy += (this.final ? g.iy * 0.7 : g.ny * 0.65) * impulse;
      g.rvz += (this.final ? g.iz * 0.7 : g.nz * 0.65) * impulse;
      const dx = g.cx - g.rx,
        dy = g.cy - g.ry,
        dz = g.cz - g.rz;
      g.stretch = Math.hypot(dx, dy, dz);
      if (!g.broken && g.stretch > g.limit) {
        g.broken = true;
        g.breakAt = age;
        g.rvx -= dx * 0.75;
        g.rvy -= dy * 0.75;
        g.rvz -= dz * 0.75;
        for (const id of this.links[g.id]) {
          const n = this.groups[id];
          if (!n.active || n.loose) continue;
          n.rvx -= dx * 0.13;
          n.rvy -= dy * 0.13;
          n.rvz -= dz * 0.13;
        }
      }
      if (!g.broken) {
        const k = 9.5;
        g.cvx -= dx * k * dt;
        g.cvy -= dy * k * dt;
        g.cvz -= dz * k * dt;
        g.rvx += dx * k * 0.32 * dt;
        g.rvy += dy * k * 0.32 * dt;
        g.rvz += dz * k * 0.32 * dt;
        tethered++;
      } else broken++;
      carrier(g, flow);
      const memory = this.final || g.flyby ? 0 : recall * (1.05 - g.fracture * 0.42);
      const rootHold = this.final ? 0 : (1 - freed) * 26;
      const air = this.final ? 0 : handoff * 0.6;
      g.rvx += ((g.x - g.rx) * rootHold + dx * memory * 0.12 + (g.wx - g.rvx) * air) * dt;
      g.rvy += ((g.y - g.ry) * rootHold + dy * memory * 0.12 + (g.wy - g.rvy) * air) * dt;
      g.rvz += ((g.z - g.rz) * rootHold + dz * memory * 0.12 + (g.wz - g.rvz) * air) * dt;
      const rootDrag = Math.exp(-dt * (this.final ? 0.14 : 5.6 * (1 - freed) + 0.4 * freed));
      g.rvx *= rootDrag;
      g.rvy *= rootDrag;
      g.rvz *= rootDrag;
      if (!g.flyby) {
        const curl = (0.5 + 0.48 * Math.sin(g.latitude * 2.2 + g.angle * 0.8)) * Math.exp(-age * 0.85);
        const vx = g.cvx,
          vy = g.cvy,
          vz = g.cvz;
        g.cvx += (-vy * 0.7 + vz * 0.32) * curl * dt;
        g.cvy += (vx * 0.7 - vz * 0.2) * curl * dt;
        g.cvz += (-vx * 0.32 + vy * 0.2) * curl * dt;
        g.cvx += (-dx * memory + (g.wx - g.cvx) * air) * dt;
        g.cvy += (-dy * memory + (g.wy - g.cvy) * air) * dt;
        g.cvz += (-dz * memory + (g.wz - g.cvz) * air) * dt;
      }
      const drag = Math.exp(
        -dt * (this.final ? 0.1 : g.flyby ? 0.09 : 1.25 * (1 - handoff) + 0.14 * handoff),
      );
      g.cvx *= drag;
      g.cvy *= drag;
      g.cvz *= drag;
      if (blend > 0) this.core.pull(g, dt, age, blend);
      else {
        g.rx += g.rvx * dt;
        g.ry += g.rvy * dt;
        g.rz += g.rvz * dt;
        g.cx += g.cvx * dt;
        g.cy += g.cvy * dt;
        g.cz += g.cvz * dt;
      }
      speed += Math.hypot(g.cvx, g.cvy, g.cvz);
      count++;
      if (!g.flyby) {
        rearSpeed += Math.hypot(g.cvx, g.cvy, g.cvz);
        rearCount++;
      }
      finite &&= Number.isFinite(g.cx + g.cy + g.cz + g.rx + g.ry + g.rz + g.cvx + g.cvy + g.cvz);
    }
    this.age = age;
    this.broken = broken;
    this.tethered = tethered;
    this.meanSpeed = speed / Math.max(1, count);
    this.finite = finite;
    this.rearSpeed = rearSpeed / Math.max(1, rearCount);
  }

  probes() {
    return this.groups
      .filter((g) => g.active && g.flyby)
      .slice(0, 3)
      .map((g) => ({
        id: g.id,
        source: [g.x, g.y, g.z],
        tip: [g.cx, g.cy, g.cz],
        root: [g.rx, g.ry, g.rz],
        velocity: [g.cvx, g.cvy, g.cvz],
        rootVelocity: [g.rvx, g.rvy, g.rvz],
        stretch: g.stretch,
        limit: g.limit,
        broken: g.broken,
        breakAt: g.breakAt,
      }));
  }

  residue() {
    const groups = this.groups.filter((g) => g.active && !g.flyby && !g.loose);
    const center = [0, 0, 0];
    let separation = 0;
    for (const g of groups) {
      center[0] += g.cx;
      center[1] += g.cy;
      center[2] += g.cz;
      separation += g.stretch;
    }
    return {
      center: center.map((v) => v / Math.max(1, groups.length)),
      separation: separation / Math.max(1, groups.length),
      probes: groups
        .slice(0, 3)
        .map((g) => ({ id: g.id, position: [g.cx, g.cy, g.cz], velocity: [g.cvx, g.cvy, g.cvz] })),
    };
  }
}
