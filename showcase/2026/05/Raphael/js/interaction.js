import * as THREE from 'three';
const { Vector3, MathUtils } = THREE;
const smooth = MathUtils.smoothstep;

export const CONTACT_DWELL = 0.075;
export function contactPressure(age) {
  return 0.6 * smooth(age, 0, 0.025) * (1 - smooth(age, 0.035, CONTACT_DWELL));
}
// The sheet bends inward briefly before it releases.
export function contactBend(age) {
  const crease = smooth(age, 0, 0.025) * (1 - smooth(age, 0.05, 0.11));
  const open = smooth(age, 0.065, 0.15) * (1 - smooth(age, 0.16, 0.42));
  const recoilAge = Math.max(0, age - 0.18);
  const recoil = -0.085 * Math.sin(recoilAge * 10) * Math.exp(-recoilAge * 4.2) * smooth(age, 0.18, 0.27);
  return -0.16 * crease + 0.24 * open + recoil;
}

export function membraneBend(p, sample) {
  if (!p.contactBend) return 0;
  const dt = (sample.t - p.contactT) * 1.6;
  const du = (sample.across - p.contactU) * 0.65;
  const weight = Math.max(0, 1 - dt * dt - du * du);
  return p.length * p.contactBend * weight * weight * (0.28 + 0.72 * (1 - sample.rootWeight));
}

export const SURFACE_LIFETIME = 0.43;
export function surfaceDelay(fraction, seed = 0) {
  return fraction * 0.28 + 0.025 * seed * smooth(fraction, 0, 0.36);
}

export function prepareSurfaceFlow(event, candidates) {
  const routes = [],
    anchors = new Set();
  const direction = new Vector3();
  for (const a of candidates) {
    direction.copy(a.position).sub(event.center);
    a.heading = Math.atan2(direction.dot(event.bitangent), direction.dot(event.tangent));
  }
  for (let i = 0; i < 7; i++) {
    const heading = (i / 7) * Math.PI * 2 + event.number * 0.47 + 0.16 * Math.sin(i * 2.1);
    const pick = (fraction, limit = 1) => {
      let best = null,
        score = Infinity;
      for (const a of candidates) {
        const cost = (1 - Math.cos(a.heading - heading)) * 0.8 + Math.abs(a.fraction - fraction);
        if (a.fraction > 0.12 && a.fraction <= limit && cost < score) {
          best = a;
          score = cost;
        }
      }
      return best;
    };
    const end = pick(0.78 + 0.1 * Math.sin(i * 1.8));
    if (!end) continue;
    const middle = pick(end.fraction * 0.5, end.fraction * 0.78);
    if (!middle) continue;
    anchors.add(middle);
    anchors.add(end);
    routes.push({ middle, end, duration: end.delay, control: new Vector3() });
  }
  event.surfaceFlow = { routes, anchors: [...anchors] };
}

export function updateSurfaceFlow(event, readPoint) {
  for (const a of event.surfaceFlow.anchors) readPoint(a, a.position);
  for (const r of event.surfaceFlow.routes) {
    const t = MathUtils.clamp(r.middle.delay / r.duration, 0.18, 0.8),
      v = 1 - t;
    r.control
      .copy(r.middle.position)
      .addScaledVector(event.center, -v * v)
      .addScaledVector(r.end.position, -t * t)
      .multiplyScalar(1 / (2 * v * t));
  }
}

// After contact, the incoming grains travel along nearby petals.
export function surfacePoint(event, sample, age, out) {
  const routes = event.surfaceFlow.routes;
  const r = routes[(sample.id * 3 + event.number) % routes.length];
  const u = Math.min(1, age / r.duration),
    v = 1 - u;
  out
    .copy(event.center)
    .multiplyScalar(v * v)
    .addScaledVector(r.control, 2 * v * u)
    .addScaledVector(r.end.position, u * u);
  const escape = Math.max(0, age - r.duration);
  out
    .addScaledVector(r.end.slide, escape * (1.2 + sample.seed * 0.8))
    .addScaledVector(r.end.normal, escape * 1.3);
  const width = Math.sin(Math.PI * u) * (0.012 + sample.radial * 0.032);
  out
    .addScaledVector(event.tangent, Math.cos(sample.phase) * width)
    .addScaledVector(event.bitangent, Math.sin(sample.phase) * width);
  return out;
}

export const TRAVEL = 0.94;

const TAIL_TIME = 0.28;
const SAMPLE_COUNT = 240;
export const MAX_STREAMS = 4;
export const STREAM_LIFETIME = TRAVEL + TAIL_TIME + SURFACE_LIFETIME;
const samples = Array.from({ length: SAMPLE_COUNT }, (_, i) => {
  const seed = ((i * 733 + 197) % 997) / 997;
  const radial = ((i * 431 + 79) % 991) / 991;
  return {
    id: i,
    surface: i === 0 || (seed < 0.48 && i % 5 !== 0),
    q: i === 0 ? 0 : (i - 1 + seed * 0.85) / (SAMPLE_COUNT - 1),
    phase: ((i % 3) / 3) * Math.PI * 2 + (radial - 0.5) * 1.8,
    seed,
    radial,
    veil: i > 0 && i % 5 === 0,
    bead: i === 0 || i % 6 === 0,
  };
});

const tipScratch = new THREE.Vector3();
const progress = (age, travel) => smooth(age / travel, 0, 1);
function curve(event, u, out) {
  const { center: c, source: s, control: a, normal: n, tangent: t } = event,
    v = 1 - u;
  const b0 = v * v * v,
    b1 = 3 * v * v * u,
    b2 = 3 * v * u * u,
    b3 = u * u * u;
  return out.set(
    b0 * s.x + b1 * a.x + b2 * (c.x + n.x * 0.9 - t.x * 0.1) + b3 * c.x,
    b0 * s.y + b1 * a.y + b2 * (c.y + n.y * 0.9 - t.y * 0.1) + b3 * c.y,
    b0 * s.z + b1 * a.z + b2 * (c.z + n.z * 0.9 - t.z * 0.1) + b3 * c.z,
  );
}
export function tipGap(event, time) {
  return curve(event, progress(time - event.time, event.travel || TRAVEL), tipScratch).distanceTo(
    event.center,
  );
}

export class EnergyStream {
  constructor(scene) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 31);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.34, 'rgba(255,255,255,.95)');
    gradient.addColorStop(0.68, 'rgba(255,255,255,.18)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    const texture = new THREE.CanvasTexture(canvas);
    this.scratch = new THREE.Vector3();
    this.layers = [0.038, 0.072].map((size) => {
      const geometry = new THREE.BufferGeometry();
      const position = new THREE.BufferAttribute(new Float32Array(SAMPLE_COUNT * MAX_STREAMS * 3), 3);
      const color = new THREE.BufferAttribute(new Float32Array(SAMPLE_COUNT * MAX_STREAMS * 4), 4);
      position.setUsage(THREE.DynamicDrawUsage);
      color.setUsage(THREE.DynamicDrawUsage);
      geometry.setAttribute('position', position);
      geometry.setAttribute('color', color);
      geometry.setDrawRange(0, 0);
      const material = new THREE.PointsMaterial({
        size,
        map: texture,
        vertexColors: true,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
      });
      const points = new THREE.Points(geometry, material);
      points.frustumCulled = false;
      scene.add(points);
      return { geometry, position, color, material, count: 0 };
    });
    this.count = 0;
    this.surfaceCount = 0;
    this.probes = [];
  }

  prepare(event) {
    const side = 0.28 + 0.12 * Math.sin(event.number * 1.7);
    event.source = event.center
      .clone()
      .addScaledVector(event.normal, 3.65)
      .addScaledVector(event.tangent, side)
      .addScaledVector(event.bitangent, 0.2);
    event.control = event.source
      .clone()
      .addScaledVector(event.normal, -0.95)
      .addScaledVector(event.tangent, 0.38);
  }

  tip(event, time) {
    return curve(event, progress(time - event.time, event.travel || TRAVEL), this.scratch);
  }

  write(layer, p, alpha, warm) {
    if (alpha < 0.0005 || layer.count >= layer.position.count) return;
    const i = layer.count * 3,
      c = layer.count++ * 4;
    layer.position.array[i] = p.x;
    layer.position.array[i + 1] = p.y;
    layer.position.array[i + 2] = p.z;
    layer.color.array[c] = 0.86 + warm * 0.14;
    layer.color.array[c + 1] = 0.94;
    layer.color.array[c + 2] = 1 - warm * 0.2;
    layer.color.array[c + 3] = alpha;
  }

  render(events, time, camera) {
    this.surfaceCount = 0;
    this.probes.length = 0;
    const density = Math.max(0.48, Math.min(1, ((innerHeight / 1000) * 14.6) / camera.position.length()));
    for (const layer of this.layers) {
      layer.count = 0;
      layer.material.opacity = density;
    }
    for (const e of events) {
      const age = time - e.time;
      if (age < 0 || age > STREAM_LIFETIME || e.surfaceFade === 0) continue;
      const travel = e.travel || TRAVEL;
      for (const s of samples) {
        const emission = s.q * TAIL_TIME,
          local = age - emission;
        if (local < 0) continue;
        const absorbed = local - travel;
        const envelope =
          (s.q === 0 ? 1 : 0.4 + 0.58 * Math.sin(Math.PI * s.q) ** 0.7) * (1 - smooth(s.q, 0.82, 1));
        const strength =
          envelope * (0.7 + s.seed * 0.3) * (s.veil ? 0.4 : s.bead ? 1 : 0.78) * (e.surfaceFade ?? 1);
        if (absorbed >= 0 && s.surface && e.surfaceFlow.routes.length) {
          if (absorbed >= SURFACE_LIFETIME) continue;
          const p = surfacePoint(e, s, absorbed, this.scratch);
          const alpha = strength * (1 - smooth(absorbed, 0.19, SURFACE_LIFETIME));
          this.write(this.layers[s.bead ? 1 : 0], p, alpha, 0.28);
          if (alpha > 0.0005) {
            this.surfaceCount++;
            if (s.id === 0 || (this.probes.length < 6 && s.id % 17 === 0))
              this.probes.push({ event: e.number, id: s.id, age: absorbed, position: p.toArray() });
          }
          continue;
        }
        if (absorbed > 0.055) continue;
        const along = progress(local, travel),
          converge = 1 - smooth(along, 0.9, 1);
        const width =
          s.q === 0
            ? 0
            : (0.028 + 0.105 * Math.sin(Math.PI * s.q)) *
              (0.32 + 0.68 * Math.sin(Math.PI * along)) *
              converge;
        const twist = s.phase + along * 0.85;
        const spread = s.veil ? 1.55 + s.radial * 0.45 : 0.3 + s.radial * 0.85;
        const u = Math.cos(twist) * width * spread,
          v = Math.sin(twist) * width * spread;
        const alpha = smooth(local, 0, 0.045) * strength * (1 - smooth(absorbed, 0, 0.055));
        const warm = smooth(along, 0.88, 1) * 0.28;
        const p = curve(e, along, this.scratch).addScaledVector(e.tangent, u).addScaledVector(e.bitangent, v);
        this.write(this.layers[s.bead ? 1 : 0], p, alpha, warm);
      }
    }
    this.count = 0;
    for (const layer of this.layers) {
      this.count += layer.count;
      layer.geometry.setDrawRange(0, layer.count);
      for (const attribute of [layer.position, layer.color]) {
        attribute.clearUpdateRanges();
        if (layer.count) {
          attribute.addUpdateRange(0, layer.count * attribute.itemSize);
          attribute.needsUpdate = true;
        }
      }
    }
  }
}

// A drag cancels the click.
export class SurfacePointer {
  constructor(canvas, { pick, fire, available }) {
    this.canvas = canvas;
    this.pick = pick;
    this.fire = fire;
    this.available = available;
    this.hints = new Set();
    this.echoes = [];
    this.aim = null;
    this.down = null;
    this.inside = false;
    this.lastPick = -100;
    this.x = 0;
    this.y = 0;
    this.type = 'mouse';
    this.accepted = 0;
    const remember = (e) => {
      this.x = e.clientX;
      this.y = e.clientY;
      this.type = e.pointerType || 'mouse';
    };
    canvas.addEventListener('pointermove', (e) => {
      remember(e);
      this.inside = true;
      if (this.down && Math.hypot(e.clientX - this.down.x, e.clientY - this.down.y) > 7)
        this.down.cancelled = true;
    });
    canvas.addEventListener('pointerleave', () => {
      this.inside = false;
      if (!this.down) this.setAim(null);
    });
    canvas.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 && e.pointerType !== 'touch') return;
      remember(e);
      this.inside = true;
      this.resolve();
      if (!this.aim) return;
      this.down = { id: e.pointerId, x: e.clientX, y: e.clientY, aim: this.aim, cancelled: false };
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointerup', (e) => {
      const down = this.down;
      this.down = null;
      if (!down || e.pointerId !== down.id) return;
      if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
      if (!down.cancelled && Math.hypot(e.clientX - down.x, e.clientY - down.y) <= 7 && this.available())
        this.fire(down.aim);
      if (e.pointerType === 'touch') {
        this.inside = false;
        this.setAim(null);
      } else this.resolve();
    });
    canvas.addEventListener('pointercancel', () => {
      this.down = null;
      this.inside = false;
      this.setAim(null);
    });
    window.addEventListener('blur', () => {
      this.down = null;
      this.inside = false;
      this.setAim(null);
    });
  }
  setAim(aim) {
    this.aim = aim;
    if (aim) this.hints.add(aim.target);
    this.canvas.style.cursor = aim ? 'pointer' : '';
  }
  resolve() {
    this.setAim(this.available() && this.inside ? this.pick(this.x, this.y, this.type) : null);
  }
  acknowledge(target) {
    this.echoes.push({ target, at: performance.now() });
    this.hints.add(target);
    this.accepted++;
  }
  reset() {
    for (const p of this.hints) p.pointerGlow = 0;
    this.hints.clear();
    this.echoes.length = 0;
    this.down = null;
    this.inside = false;
    this.accepted = 0;
    this.setAim(null);
  }
  update(dt, now) {
    if (!this.available()) {
      this.down = null;
      this.setAim(null);
    } else if (this.inside && this.type !== 'touch' && now - this.lastPick > 65) {
      this.resolve();
      this.lastPick = now;
    }
    this.echoes = this.echoes.filter((e) => now - e.at < 340);
    let changed = false;
    for (const p of this.hints) {
      let target = this.aim?.target === p ? 0.18 : 0;
      if (this.down?.aim.target === p && !this.down.cancelled) target = 0.34;
      for (const e of this.echoes)
        if (e.target === p) target = Math.max(target, 0.38 * Math.max(0, 1 - (now - e.at) / 340));
      const previous = p.pointerGlow || 0;
      p.pointerGlow = previous + (target - previous) * (1 - Math.exp(-dt * (target > previous ? 24 : 10)));
      if (Math.abs(p.pointerGlow - previous) > 0.0005) changed = true;
      if (!target && p.pointerGlow < 0.001) {
        p.pointerGlow = 0;
        this.hints.delete(p);
        changed = true;
      }
    }
    return changed;
  }
  snapshot() {
    return {
      targetId: this.aim?.target.id ?? null,
      sampleIndex: this.aim?.sampleIndex ?? null,
      screen: this.aim?.screen ?? null,
      glow: this.aim?.target.pointerGlow || 0,
      pressed: !!this.down,
      accepted: this.accepted,
      echoes: this.echoes.length,
    };
  }
}
