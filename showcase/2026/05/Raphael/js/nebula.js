import { MathUtils } from 'three';
import { RuptureMotion, FINAL_FADE_END, RETURN_START, CORE_SHAPE_END } from './story.js';
const smooth = MathUtils.smoothstep;
export class Nebula {
  constructor(particles) {
    this.particles = particles;
    const count = particles.reduce((n, p) => n + p.samples.length, 0);
    this.source = new Float32Array(count * 3);
    this.color = new Float32Array(count * 3);
    this.alpha = new Float32Array(count);
    this.size = new Float32Array(count);
    this.kind = new Uint8Array(count);
    this.streak = new Float32Array(count);
    this.lift = new Float32Array(count);
    this.body = new Uint8Array(count);
    this.fray = new Uint8Array(count);
    this.fold = new Float32Array(count);
    this.edge = new Float32Array(count);
    this.scatter = new Float32Array(count * 3);
    this.targetColor = new Float32Array(count * 3);
    this.targetAlpha = new Float32Array(count);
    this.targetSize = new Float32Array(count);
    this.groups = [];
    this.captured = false;
    this.scratch = { x: 0, y: 0, z: 0 };
    let offset = 0;
    for (const p of particles) {
      const angle = Math.atan2(p.normal.y, p.normal.x);
      const latitude = p.normal.z;
      const group = {
        id: p.id,
        nx: p.normal.x,
        ny: p.normal.y,
        nz: p.normal.z,
        fracture: 0,
        bands: [[], [], []],
        offset,
        count: p.samples.length,
        active: false,
        depth: 0,
        x: 0,
        y: 0,
        z: 0,
        u: (angle + Math.PI) / (Math.PI * 2),
        angle,
        latitude,
        seed: p.seed,
        flybyCandidate: !p.ambient && latitude > -0.08 && p.seed > 0.59,
        flyby: false,
        loose: false,
        vx: 0,
        vy: 0,
        vz: 0,
        flightScale: 14.6,
        retention: smooth(p.length, 0.46, 0.68),
        recoverable: false,
        corePressure: 0,
        coreContactBend: 0,
        homeNormal: [p.normal.x, p.normal.y, p.normal.z],
        contactIndex:
          offset +
          p.samples.reduce(
            (best, s, i) =>
              Math.abs(s.t - 0.53) + Math.abs(s.across) <
              Math.abs(p.samples[best].t - 0.53) + Math.abs(p.samples[best].across)
                ? i
                : best,
            0,
          ),
      };
      this.groups.push(group);
      group.pickIndices = p.pickSamples.map((s) => group.offset + p.samples.indexOf(s));
      for (const s of p.samples) {
        const i = offset++,
          j = i * 3;
        this.fold[i] = (s.across * s.across - 0.12) * Math.sin(Math.PI * s.t);
        this.edge[i] = s.kind === 0 ? 1 : s.kind === 1 ? 0.45 : s.kind === 2 ? 0.06 : 0.28;
        this.lift[i] = smooth(s.t, 0.04, 0.7);
        const seam = 0.19 + 0.035 * Math.sin(s.across * 5.8 + p.seed * 4);
        this.body[i] = s.t > seam ? 1 : 0;
        this.fray[i] = s.kind === 1 && s.t > seam && s.t < seam + 0.085 ? 1 : 0;
        group.bands[this.fray[i] ? 1 : this.body[i] ? 2 : 0].push(i);
        const loosen = s.dustSeed > 0.78 ? 0.06 + s.dustSeed * 0.16 : 0.007 + s.dustSeed * 0.012;
        this.scatter[j] = (s.driftX * p.cosPhase - s.driftZ * p.sinPhase) * loosen;
        this.scatter[j + 1] = s.driftY * loosen;
        this.scatter[j + 2] = (s.driftX * p.sinPhase + s.driftZ * p.cosPhase) * loosen;
        this.streak[i] = (s.t - 0.45) * (s.kind === 2 ? 0.3 : 1) + s.driftY * 0.18;
        const light =
          (0.36 + 0.64 * Math.abs(Math.sin(angle * 0.7 + latitude * 2.1 + s.across * 0.55))) *
          (0.6 + 0.4 * Math.sin(Math.PI * s.t));
        const warm = Math.max(0, Math.sin(angle + 0.6)) ** 8;
        this.targetColor[j] = 0.73 + 0.19 * warm;
        this.targetColor[j + 1] = 0.82 + 0.06 * warm;
        this.targetColor[j + 2] = 0.92 - 0.18 * warm;
        this.targetAlpha[i] = (s.kind === 2 ? 0.037 : s.kind === 3 ? 0.55 : 0.4) * s.coverage * light;
        this.targetSize[i] = s.kind === 2 ? 0.1 : s.kind === 3 ? 0.038 : 0.027 + s.seed * 0.01;
      }
    }
    this.motion = new RuptureMotion(this.groups, particles);
    this.carrier = (g, time) => this.wind(g, time);
    this.studyIds = null;
    this.count = count;
    this.activeCount = 0;
    this.radius = 0;
  }

  reset() {
    this.motion.reset();
    this.studyIds = null;
    this.captured = false;
    this.activeCount = 0;
    this.radius = 0;
    this.growth = 0;
    this.foreground = 0;
    this.passed = 0;
    this.nearDepth = 0;
    this.farDepth = 0;
    this.flowProbe = [0, 0, 0];
    for (const g of this.groups) {
      g.active = false;
      g.flyby = false;
      g.loose = false;
      g.recoverable = false;
      g.corePressure = 0;
      g.coreContactBend = 0;
      g.coreTension = 0;
      g.coreTurn = 0;
      g.coreFold = 0;
      g.coreLate = 0;
      g.coreSlip = 0;
      g.finalTension = 0;
      g.pointerGlow = 0;
      [g.nx, g.ny, g.nz] = g.homeNormal;
      g.angle = Math.atan2(g.ny, g.nx);
      g.latitude = g.nz;
    }
  }

  // Keep the last shell positions so rupture starts without a jump.
  capture(i, x, y, z, r, g, b, alpha, size, kind) {
    const j = i * 3;
    this.source[j] = x;
    this.source[j + 1] = y;
    this.source[j + 2] = z;
    this.color[j] = r;
    this.color[j + 1] = g;
    this.color[j + 2] = b;
    this.alpha[i] = alpha;
    this.size[i] = size;
    this.kind[i] = kind;
  }

  wind(g, time) {
    g.wx =
      0.105 + 0.045 * g.nz + 0.022 * Math.sin(g.y * 0.7 + g.z * 0.55) + 0.018 * Math.sin(time * 0.12 + g.y);
    g.wy = -0.085 + 0.028 * g.ny + 0.022 * Math.cos(g.x * 0.6 + g.z * 0.8 + time * 0.09);
    g.wz = 0.025 + g.nz * 0.05 + 0.022 * Math.sin(g.y * 0.7 - g.x * 0.55);
  }

  begin(origin, energy = 1) {
    for (const g of this.groups) {
      const p = this.particles[g.id];
      g.active = !p.isDone;
      g.loose = !p.attached;
      g.flyby = g.flybyCandidate && p.attached;
      g.recoverable = g.active && !g.loose && !g.flyby;
    }
    this.motion.begin(origin, energy);
  }

  pose(g, age) {
    const brokenAge = g.breakAt < 0 ? 0 : Math.max(0, age - g.breakAt);
    const turn = Math.min(brokenAge, 1.4) + Math.log1p(Math.max(0, brokenAge - 1.4)) * 0.45;
    g.compaction = !this.motion.final && g.recoverable ? smooth(age, RETURN_START + 0.25, CORE_SHAPE_END) : 0;
    const compact = g.compaction;
    const spin =
      (g.flyby ? brokenAge * (1.3 + g.seed) : turn * 0.32) * (1 - compact) + compact * g.coreTurn * 1.2;
    const tilt =
      (g.flyby ? brokenAge : turn) * (0.3 + g.latitude * 0.25) * (1 - compact) + compact * g.coreFold * 1.3;
    g.pc = Math.cos(spin);
    g.ps = Math.sin(spin);
    g.ptc = Math.cos(tilt);
    g.pts = Math.sin(tilt);
    g.localScale = 1 - compact * (g.coreLate ? 0.16 : 0.4);
    const shade = g.coreLate
      ? 0.92
      : Math.max(0.5, Math.min(0.85, 0.66 + g.coreFold * 0.2 + g.coreTurn * 0.1));
    g.coreGain = 1 + compact * (shade - 1);
    g.coreEdge = compact * (g.coreTension * 0.72 + g.coreSlip * 0.09) + (g.pointerGlow || 0);
    const fold = compact * (g.coreFold * 0.18 + g.coreContactBend * 1.35);
    g.foldX = g.nx * fold;
    g.foldY = g.ny * fold;
    g.foldZ = g.nz * fold;
  }
  corePoint(g, i, out) {
    const j = i * 3,
      ox = this.source[j] - g.x,
      oy = this.source[j + 1] - g.y,
      oz = this.source[j + 2] - g.z;
    const rotatedZ = oz * g.pc - ox * g.ps,
      body = this.body[i];
    out.x = g.cx + (body ? ox * g.pc + oz * g.ps : ox) * g.localScale + this.fold[i] * g.foldX;
    out.y = g.cy + (body ? oy * g.ptc - rotatedZ * g.pts : oy) * g.localScale + this.fold[i] * g.foldY;
    out.z = g.cz + (body ? oy * g.pts + rotatedZ * g.ptc : oz) * g.localScale + this.fold[i] * g.foldZ;
    return out;
  }

  coreContact(g, out, index = g.contactIndex) {
    this.pose(g, this.motion.age);
    return this.corePoint(g, index, out);
  }

  coreState() {
    const groups = this.groups.filter((g) => g.active && g.recoverable);
    return {
      count: groups.length,
      ids: groups.map((g) => g.id),
      radius: groups.reduce((n, g) => n + Math.hypot(g.cx, g.cy, g.cz), 0) / Math.max(1, groups.length),
      speed: groups.reduce((n, g) => n + Math.hypot(g.cvx, g.cvy, g.cvz), 0) / Math.max(1, groups.length),
      breath: this.motion.coreBreath,
      tension: groups.reduce((n, g) => n + g.coreTension, 0) / Math.max(1, groups.length),
      opening: Math.max(0, ...groups.map((g) => g.coreOpening || 0)),
      late: groups
        .filter((g) => g.coreLate)
        .map((g) => ({
          id: g.id,
          role: g.coreLate,
          position: [g.cx, g.cy, g.cz],
          radius: Math.hypot(g.cx, g.cy, g.cz),
        })),
      rhythm: this.motion.core.snapshot(),
    };
  }

  beginFinal(origin, camera) {
    for (const g of this.groups) {
      if (!g.active || !g.recoverable) {
        g.active = false;
        continue;
      }
      this.pose(g, this.motion.age);
      for (let i = g.offset, end = i + g.count; i < end; i++) {
        const p = this.corePoint(g, i, this.scratch),
          j = i * 3;
        this.source[j] = p.x;
        this.source[j + 1] = p.y;
        this.source[j + 2] = p.z;
        const gain = g.coreGain * (1 + this.edge[i] * g.coreEdge);
        this.color[j] *= gain;
        this.color[j + 1] *= gain;
        this.color[j + 2] *= gain;
        this.alpha[i] *= 1 + g.corePressure * 0.25;
      }
      g.x = g.cx;
      g.y = g.cy;
      g.z = g.cz;
      g.vx = g.cvx;
      g.vy = g.cvy;
      g.vz = g.cvz;
      g.finalTension = Math.min(1, g.coreTension + g.corePressure * 0.45);
      const radius = Math.hypot(g.x, g.y, g.z) || 1;
      g.nx = g.x / radius;
      g.ny = g.y / radius;
      g.nz = g.z / radius;
      g.angle = Math.atan2(g.ny, g.nx);
      g.latitude = g.nz;
      g.flyby = g.nz > -0.62 && g.seed > 0.22;
      g.loose = false;
      g.recoverable = false;
      g.flightScale = camera.position.z;
      g.corePressure = 0;
    }
    this.motion.begin(origin, 2.15, true);
  }

  update(dt, age) {
    if (!this.motion.final || age < FINAL_FADE_END) this.motion.update(dt, age, this.carrier);
  }

  // Draw the same fragments as they scatter, gather and release again.
  render(layers, age, camera, focus) {
    layers.begin(camera);
    if (this.motion.final && age >= FINAL_FADE_END) {
      this.activeCount = 0;
      layers.finish();
      this.radius = 0;
      this.foreground = 0;
      return;
    }
    const flow = Math.max(0, age - 2.2);
    const portrait = 1 - smooth(camera.aspect, 0.55, 0.95);
    const expansion = 1 - portrait * 0.14;
    let active = 0,
      maxRadius = 0,
      foreground = 0,
      passed = 0,
      nearDepth = Infinity,
      farDepth = 0,
      probed = false;
    for (const g of this.groups) {
      if (!g.active || (this.studyIds && !this.studyIds.has(g.id))) continue;
      if (!this.motion.final && !g.recoverable && age >= (g.loose ? 11.5 : 10)) continue;
      if (g.loose) {
        const depth = camera.position.z - g.cz;
        if (depth < 0.35) continue;
        const soft = focus
          ? Math.min(1.8, Math.max(0, Math.abs(depth - (camera.position.z - 1.25)) - 0.55) / 2.3)
          : 0;
        layers.prepare(soft, (innerHeight * 0.5) / Math.max(0.75, depth));
        const visible = Math.exp(-age * 0.28) * smooth(depth, 0.35, 1.65) * (1 - smooth(age, 4, 11.5));
        nearDepth = Math.min(nearDepth, depth);
        farDepth = Math.max(farDepth, depth);
        const dx = g.cx - g.x,
          dy = g.cy - g.y,
          dz = g.cz - g.z;
        for (let i = g.offset, end = i + g.count; i < end; i++) {
          const j = i * 3,
            x = this.source[j] + dx,
            y = this.source[j + 1] + dy,
            z = this.source[j + 2] + dz;
          layers.add(
            this.kind[i],
            x,
            y,
            z,
            this.color[j],
            this.color[j + 1],
            this.color[j + 2],
            this.alpha[i] * visible,
            this.size[i],
          );
          maxRadius = Math.max(maxRadius, x * x + y * y);
          active++;
        }
        continue;
      }
      this.pose(g, age);
      const compact = g.compaction;
      if (compact === 1) {
        const depth = camera.position.z - g.cz;
        const softness = focus
          ? Math.min(
              1.8,
              Math.max(0, Math.abs(depth - (camera.position.z - 1.25)) - 0.55) /
                (2.3 + g.retention * (1 - g.fracture * 0.35) * 2),
            )
          : 0;
        layers.prepare(softness, (innerHeight * 0.5) / Math.max(0.75, depth));
        nearDepth = Math.min(nearDepth, depth);
        farDepth = Math.max(farDepth, depth);
        const c = g.pc,
          s = g.ps,
          ct = g.ptc,
          st = g.pts,
          scale = g.localScale,
          pressure = 1 + g.corePressure * 0.25;
        for (let i = g.offset, end = i + g.count; i < end; i++) {
          const j = i * 3,
            ox = this.source[j] - g.x,
            oy = this.source[j + 1] - g.y,
            oz = this.source[j + 2] - g.z;
          const rotatedZ = oz * c - ox * s,
            body = this.body[i],
            fold = this.fold[i];
          const x = g.cx + (body ? ox * c + oz * s : ox) * scale + fold * g.foldX;
          const y = g.cy + (body ? oy * ct - rotatedZ * st : oy) * scale + fold * g.foldY;
          const z = g.cz + (body ? oy * st + rotatedZ * ct : oz) * scale + fold * g.foldZ;
          const gain = g.coreGain * (1 + this.edge[i] * g.coreEdge);
          layers.add(
            this.kind[i],
            x,
            y,
            z,
            this.color[j] * gain,
            this.color[j + 1] * gain,
            this.color[j + 2] * gain,
            this.alpha[i] * pressure * (this.fray[i] ? 1.25 : 1),
            this.size[i],
          );
          maxRadius = Math.max(maxRadius, x * x + y * y);
          active++;
          if (!probed) {
            this.flowProbe[0] = x;
            this.flowProbe[1] = y;
            this.flowProbe[2] = z;
            probed = true;
          }
        }
        continue;
      }
      const retention = g.retention * (1 - g.fracture * 0.35);
      const morph = this.motion.final
        ? smooth(age, 1.4, 6.5)
        : smooth(age, 5 + retention * 7, 20 + retention * 16) * (1 - compact);
      const fade = this.motion.final
        ? 1 - smooth(age, 2.2, FINAL_FADE_END)
        : g.recoverable
          ? 1
          : 1 - smooth(age, 4, 10);
      const localAge = Math.max(0, age - g.delay);
      const brokenAge = g.breakAt < 0 ? 0 : Math.max(0, age - g.breakAt);
      const tear = g.broken ? smooth(brokenAge, 0, 0.19) : 0;
      const flash = smooth(localAge, 0, 0.06) * (1 - smooth(localAge, 0.13, 0.42));
      const surge = smooth(localAge, 0, 0.1) * (1 - smooth(age, 0.65, 2.8));
      const c = g.pc,
        s = g.ps,
        ct = g.ptc,
        st = g.pts;
      const dx = g.cx - g.rx,
        dy = g.cy - g.ry,
        dz = g.cz - g.rz;
      const momentum = Math.hypot(g.ix, g.iy, g.iz) || 1;
      const mx = g.ix / momentum,
        my = g.iy / momentum,
        mz = g.iz / momentum;
      const ca = Math.cos(g.angle),
        sa = Math.sin(g.angle);
      const trailing =
        !g.loose && !g.flyby
          ? Math.min(1.7, g.stretch * 0.58) * smooth(brokenAge, 0.03, 0.25) * (1 - smooth(age, 1.5, 4))
          : 0;
      const flightDepth = camera.position.z - g.cz;
      if (g.flyby && flightDepth < 0.35) passed++;
      else if (g.flyby && flightDepth < camera.position.z * 0.55) foreground++;
      const drift = smooth(age, 3, 22);
      const strand = (0.22 + g.seed * 0.32) * (1 + drift * 0.45) * (1 - retention * 0.45);
      const ax = g.ax * strand + 0.18 * drift,
        ay = g.ay * strand - 0.1 * drift,
        az = g.az * strand;
      const shearX = -sa * (0.14 + drift * 0.13),
        shearY = ca * (0.14 + drift * 0.13);
      const patch =
        (0.3 + 0.85 * smooth(g.light, 0.08, 0.75)) * (1 - smooth(age, 10, 34) * g.fracture * 0.64);
      for (let band = 0; band < 3; band++) {
        const points = g.bands[band];
        const bridge = band === 1;
        const filamentFade = bridge && g.flyby ? 1 - smooth(brokenAge, 0.55, 1.55) : 1;
        if (filamentFade <= 0) continue;
        const bandWeight = band === 0 ? 0 : bridge ? 0.45 : 1;
        const depth = camera.position.z - (g.rz + dz * (bandWeight + (1 - bandWeight) * compact));
        if (depth < 0.35 && !bridge) continue;
        nearDepth = Math.min(nearDepth, Math.max(0.35, depth));
        farDepth = Math.max(farDepth, depth);
        const softness = focus
          ? Math.min(
              1.8,
              Math.max(0, Math.abs(depth - (camera.position.z - 1.25)) - 0.55) /
                (depth < 7 ? 5.5 : 2.3 + retention * 2),
            )
          : 0;
        layers.prepare(softness, (innerHeight * 0.5) / Math.max(0.75, depth));
        const cloud = g.loose || (g.flyby && band > 0) ? 0 : morph;
        const visible = g.loose ? Math.exp(-age * 0.28) : fade * (1 + (patch - 1) * cloud);
        const passLight = this.motion.final
          ? 1 - 0.65 * smooth((camera.position.z - depth) / camera.position.z, 0.2, 0.85)
          : 1;
        const scatterScale =
          g.flyby && band > 0
            ? smooth(brokenAge, 0.3, 1.6) * 1.8
            : cloud * (0.45 + 0.055 * flow) * (1 - retention * 0.45);
        if (cloud === 1) {
          const opacity = visible * g.weight * (bridge ? 1.25 : 1) * passLight;
          for (const i of points) {
            const j = i * 3,
              weight = g.broken ? this.body[i] : this.lift[i];
            const along = this.streak[i],
              bend = along * along;
            const x =
              g.rx +
              dx * weight +
              ((this.source[j] - g.x) * 0.78 + ax * along + shearX * bend) * expansion +
              this.scatter[j] * scatterScale;
            const y =
              g.ry +
              dy * weight +
              ((this.source[j + 1] - g.y) * 0.78 + ay * along + shearY * bend) * expansion +
              this.scatter[j + 1] * scatterScale;
            const z =
              g.rz +
              dz * weight +
              (this.source[j + 2] - g.z) * 0.78 +
              az * along +
              this.scatter[j + 2] * scatterScale;
            layers.add(
              this.kind[i],
              x,
              y,
              z,
              this.targetColor[j],
              this.targetColor[j + 1],
              this.targetColor[j + 2],
              this.targetAlpha[i] * opacity * smooth(camera.position.z - z, 0.35, 1.65),
              this.targetSize[i],
            );
            maxRadius = Math.max(maxRadius, x * x + y * y);
            active++;
            if (!probed && !g.flyby) {
              this.flowProbe[0] = x;
              this.flowProbe[1] = y;
              this.flowProbe[2] = z;
              probed = true;
            }
          }
          continue;
        }
        for (const i of points) {
          const j = i * 3;
          let weight = this.lift[i] + (this.body[i] - this.lift[i]) * tear;
          if (bridge) weight = this.lift[i] + (1 - this.lift[i]) * smooth(brokenAge, 0.4, 1.6);
          weight += (1 - weight) * compact;
          if (g.loose) weight = 1;
          const ox = this.source[j] - g.x,
            oy = this.source[j + 1] - g.y,
            oz = this.source[j + 2] - g.z;
          const spinWeight = band === 0 ? 0 : tear;
          const rotatedX = ox * c + oz * s,
            rotatedZ = oz * c - ox * s;
          let lx = ox + (rotatedX - ox) * spinWeight;
          let ly = oy + (oy * ct - rotatedZ * st - oy) * spinWeight;
          let lz = oz + (oy * st + rotatedZ * ct - oz) * spinWeight;
          const along = this.streak[i],
            bend = along * along;
          lx += ((ox * 0.78 + ax * along + shearX * bend) * expansion - lx) * cloud;
          ly += ((oy * 0.78 + ay * along + shearY * bend) * expansion - ly) * cloud;
          lz += (oz * 0.78 + az * along - lz) * cloud;
          lx *= g.localScale;
          ly *= g.localScale;
          lz *= g.localScale;
          lx += this.fold[i] * g.foldX;
          ly += this.fold[i] * g.foldY;
          lz += this.fold[i] * g.foldZ;
          const bow = bridge
            ? Math.sin(weight * Math.PI) * Math.min(1.3, g.stretch * 0.16) * filamentFade
            : tear < 1
              ? Math.sin(weight * Math.PI) * g.stretch * 0.09 * (1 - tear)
              : 0;
          const bx = -sa * bow,
            by = ca * bow;
          const tail = this.streak[i] * trailing;
          const curl = tail * tail * 0.48;
          const x =
            (g.loose ? g.cx : g.rx + dx * weight) +
            lx +
            bx +
            this.scatter[j] * scatterScale +
            mx * tail -
            sa * curl;
          const y =
            (g.loose ? g.cy : g.ry + dy * weight) +
            ly +
            by +
            this.scatter[j + 1] * scatterScale +
            my * tail +
            ca * curl;
          const z =
            (g.loose ? g.cz : g.rz + dz * weight) + lz + this.scatter[j + 2] * scatterScale + mz * tail;
          const pointDepth = camera.position.z - z;
          if (pointDepth < 0.35) continue;
          const nearFade = smooth(pointDepth, 0.35, 1.65);
          const alpha =
            (this.alpha[i] + (this.targetAlpha[i] * g.weight - this.alpha[i]) * cloud) *
            visible *
            nearFade *
            filamentFade *
            (1 +
              flash * (this.motion.final ? 0.55 : this.kind[i] === 2 ? 0.5 : 1.8) +
              surge * (this.motion.final ? 0.28 : 1.25 + g.fracture * 0.7)) *
            (bridge ? 1.25 : 1) *
            (1 + g.corePressure * 0.25) *
            passLight;
          const edgeGain = g.coreGain * (1 + this.edge[i] * g.coreEdge);
          const r = (this.color[j] + (this.targetColor[j] - this.color[j]) * cloud) * edgeGain;
          const green =
            (this.color[j + 1] + (this.targetColor[j + 1] - this.color[j + 1]) * cloud) * edgeGain;
          const b = (this.color[j + 2] + (this.targetColor[j + 2] - this.color[j + 2]) * cloud) * edgeGain;
          layers.add(
            this.kind[i],
            x,
            y,
            z,
            r,
            green,
            b,
            alpha,
            this.size[i] + (this.targetSize[i] - this.size[i]) * cloud,
          );
          maxRadius = Math.max(maxRadius, x * x + y * y);
          active++;
          if (!probed && !g.flyby && !g.loose) {
            this.flowProbe[0] = x;
            this.flowProbe[1] = y;
            this.flowProbe[2] = z;
            probed = true;
          }
        }
      }
    }
    layers.finish();
    this.activeCount = active;
    this.radius = Math.sqrt(maxRadius);
    this.growth = smooth(age, 5, 36);
    this.foreground = foreground;
    this.passed = passed;
    this.nearDepth = nearDepth;
    this.farDepth = farDepth;
  }
}
