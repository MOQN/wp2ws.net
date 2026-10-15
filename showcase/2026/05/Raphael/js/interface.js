import * as THREE from 'three';
import { FINAL_FADE_END } from './story.js';
const smooth = THREE.MathUtils.smoothstep;
export const RESTART_APPEAR = FINAL_FADE_END + 1;
export const RESTART_READY = RESTART_APPEAR + 1.6;
const hash = (n) => {
  const a = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return a - Math.floor(a);
};
const TEXT_SELECTORS = '.identity h1,.identity p,#invitation,#phase,#thought,#play-icon,.button-label';
export class UIRupture {
  constructor(camera) {
    this.camera = camera;
    this.scene = new THREE.Scene();
    this.cache = new Map();
    this.prepared = [];
    this.preparedLabels = [];
    this.started = false;
    this.count = 0;
    this.nodes = [...document.querySelectorAll('[data-interface]')];
    this.restart = document.querySelector('#restart-center');
    this.geometry = new THREE.BufferGeometry();
    const capacity = 18000;
    this.position = new THREE.BufferAttribute(new Float32Array(capacity * 3), 3).setUsage(
      THREE.DynamicDrawUsage,
    );
    this.color = new THREE.BufferAttribute(new Float32Array(capacity * 4), 4).setUsage(
      THREE.DynamicDrawUsage,
    );
    this.geometry.setAttribute('position', this.position);
    this.geometry.setAttribute('color', this.color);
    this.geometry.setDrawRange(0, 0);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 32;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.35, 'rgba(255,255,255,.9)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 32, 32);
    this.material = new THREE.PointsMaterial({
      map: new THREE.CanvasTexture(canvas),
      size: 0.06,
      vertexColors: true,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    this.scene.add(this.points);
    this.point = new THREE.Vector3();
    this.ray = new THREE.Vector3();
    this.ground = new THREE.Color('#080b10');
    this.reset();
  }
  // Restore the controls when starting again.
  reset() {
    this.started = false;
    this.age = -1;
    this.count = 0;
    this.prepareKey = '';
    this.beginMs = 0;
    this.grains = [];
    this.labels = [];
    this.probes = [];
    this.geometry.setDrawRange(0, 0);
    this.restart.hidden = true;
    this.restart.style.opacity = '0';
    this.focusRestart = false;
    this.blocks = [];
    this.lastShow = -1;
    this.lastAge = -2;
    document.body.classList.remove('interface-dispersed');
    for (const node of this.nodes) {
      node.inert = false;
      node.removeAttribute('aria-hidden');
      node.classList.remove('interface-fractured');
    }
  }
  opacity(element) {
    let opacity = 1;
    for (let node = element; node && node !== document.documentElement; node = node.parentElement) {
      const s = getComputedStyle(node);
      if (s.display === 'none' || s.visibility === 'hidden') return 0;
      opacity *= Number(s.opacity);
    }
    return opacity;
  }
  raster(element) {
    const rect = element.getBoundingClientRect(),
      style = getComputedStyle(element),
      value = element.textContent;
    if (!value.trim() || rect.width === 0 || rect.height === 0) return [];
    const opacity = this.opacity(element);
    if (opacity < 0.005) return [];
    const key = [
      value,
      style.font,
      style.letterSpacing,
      style.lineHeight,
      style.color,
      rect.width,
      rect.height,
    ].join('|');
    let cached = this.cache.get(element);
    if (cached?.key !== key) {
      const ratio = 2,
        pad = 3,
        canvas = document.createElement('canvas');
      canvas.width = Math.ceil((rect.width + pad * 2) * ratio);
      canvas.height = Math.ceil((rect.height + pad * 2) * ratio);
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.scale(ratio, ratio);
      ctx.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      ctx.fillStyle = style.color;
      ctx.textBaseline = 'alphabetic';
      const metrics = ctx.measureText('Mg'),
        line = parseFloat(style.lineHeight) || rect.height;
      let x = pad,
        y =
          pad +
          (line - (metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent)) / 2 +
          metrics.fontBoundingBoxAscent;
      const spacing = parseFloat(style.letterSpacing) || 0;
      for (const char of value) {
        const w = ctx.measureText(char).width;
        if (x + w > rect.width + pad + 0.5 && x > pad) {
          x = pad;
          y += line;
        }
        ctx.fillText(char, x, y);
        x += w + spacing;
      }
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data,
        points = [];
      for (let y = 1; y < canvas.height; y += 2)
        for (let x = 1; x < canvas.width; x += 2) {
          const i = (y * canvas.width + x) * 4;
          if (pixels[i + 3] < 24) continue;
          const color = new THREE.Color().setRGB(
            pixels[i] / 255,
            pixels[i + 1] / 255,
            pixels[i + 2] / 255,
            THREE.SRGBColorSpace,
          );
          points.push({
            x: x / ratio - pad,
            y: y / ratio - pad,
            r: color.r,
            g: color.g,
            b: color.b,
            a: pixels[i + 3] / 255,
          });
        }
      cached = { key, points };
      this.cache.set(element, cached);
    }
    return cached.points.map((p) => ({ ...p, x: p.x + rect.left, y: p.y + rect.top, a: p.a * opacity }));
  }
  // Sample the interface text into points for the final rupture.
  prepare() {
    if (this.started) return;
    const elements = [...document.querySelectorAll(TEXT_SELECTORS)];
    const key = [
      innerWidth,
      innerHeight,
      document.documentElement.lang,
      document.body.classList.contains('hide-ui'),
      document.querySelector('#impact').disabled,
      document.querySelector('#auto').getAttribute('aria-pressed'),
      document.querySelector('#dof').getAttribute('aria-pressed'),
      getComputedStyle(document.querySelector('#invitation')).opacity,
      ...elements.map((e) => e.textContent + getComputedStyle(e).color),
    ].join('|');
    if (key === this.prepareKey) return;
    this.prepareKey = key;
    this.prepared = [];
    this.preparedLabels = [];
    for (const element of elements) {
      const samples = this.raster(element);
      if (samples.length) {
        this.preparedLabels.push(element.textContent);
        const block = this.nodes.indexOf(element.closest('[data-interface]'));
        this.prepared.push(...samples.map((p) => ({ ...p, block })));
      }
    }
    for (const element of document.querySelectorAll('.auto-dot,.control-divider')) {
      const opacity = this.opacity(element);
      if (opacity < 0.005) continue;
      const box = element.getBoundingClientRect(),
        c = new THREE.Color(getComputedStyle(element).backgroundColor);
      for (let x = 0.5; x < box.width; x += 1)
        for (let y = 0.5; y < box.height; y += 1) {
          if (
            element.classList.contains('auto-dot') &&
            Math.hypot(x - box.width / 2, y - box.height / 2) > box.width / 2
          )
            continue;
          this.prepared.push({
            block: this.nodes.indexOf(element.closest('[data-interface]')),
            x: box.left + x,
            y: box.top + y,
            r: c.r,
            g: c.g,
            b: c.b,
            a: opacity,
          });
        }
    }
  }
  warm(renderer) {
    this.geometry.setDrawRange(0, 1);
    this.material.opacity = 0;
    renderer.autoClear = false;
    renderer.render(this.scene, this.camera);
    renderer.autoClear = true;
    this.geometry.setDrawRange(0, 0);
    this.material.opacity = 1;
  }
  screenPoint(x, y, z = 0) {
    this.point.set((x / innerWidth) * 2 - 1, 1 - (y / innerHeight) * 2, 0).unproject(this.camera);
    this.ray.copy(this.point).sub(this.camera.position).normalize();
    return this.point
      .copy(this.camera.position)
      .addScaledVector(this.ray, (z - this.camera.position.z) / this.ray.z);
  }
  begin(groups) {
    if (this.started) return;
    const startedAt = performance.now();
    this.started = true;
    this.age = 0;
    this.labels = [...this.preparedLabels];
    this.focusRestart = !!document.activeElement?.closest('[data-interface]');
    const camera = this.camera;
    camera.updateMatrixWorld();
    this.point.set(0, 0, 0).project(camera);
    this.origin = { x: (this.point.x + 1) * innerWidth * 0.5, y: (1 - this.point.y) * innerHeight * 0.5 };
    const used = new Set();
    this.blocks = this.nodes.map((node, id) => {
      const samples = this.prepared.filter((s) => s.block === id);
      if (!samples.length) return { node, hit: false, empty: true };
      const x = samples.reduce((v, s) => v + s.x, 0) / samples.length,
        y = samples.reduce((v, s) => v + s.y, 0) / samples.length;
      const dx = x - this.origin.x,
        dy = y - this.origin.y,
        r = Math.hypot(dx, dy) || 1;
      const candidates = groups
        .filter((g) => g.active && !used.has(g.id) && g.nz > -0.5)
        .sort((a, b) => {
          const score = (g) =>
            (g.x * dx - g.y * dy) / Math.max(0.01, Math.hypot(g.x, g.y) * r) + g.retention * 0.16;
          return score(b) - score(a);
        });
      const carriers = candidates.slice(0, 3);
      carriers.forEach((g, k) => {
        used.add(g.id);
        const z = camera.position.z * (0.58 + k * 0.035);
        const target = this.screenPoint(x + (k - 1) * 18, y + (k - 1) * 12, z);
        const speed = camera.position.z * (1.85 + g.seed * 0.25);
        g.flyby = true;
        g.ix = ((target.x - g.x) / (z - g.z)) * speed;
        g.iy = ((target.y - g.y) / (z - g.z)) * speed;
        g.iz = speed;
      });
      return { node, hit: false, empty: false, carriers, dx: dx / r, dy: dy / r, front: 0, hitAt: null };
    });
    this.grains = this.prepared.slice(0, this.position.count).map((s, i) => {
      const p = this.screenPoint(s.x, s.y),
        x = p.x,
        y = p.y,
        z = p.z;
      const cluster = Math.floor(s.x / 12) + Math.floor(s.y / 16) * 211,
        seed = hash(cluster),
        grain = hash(i + 53);
      const r = Math.hypot(x, y) || 1,
        speed = 8 + seed * 7;
      return {
        ...s,
        id: i,
        seed,
        x,
        y,
        z,
        radius: Math.hypot(s.x - this.origin.x, s.y - this.origin.y),
        releasedAt: null,
        vx: (x / r) * speed,
        vy: (y / r) * speed,
        vz: 0.15 * (grain - 0.5),
        dx: (grain - 0.5) * 0.42,
        dy: (hash(i + 813) - 0.5) * 0.42,
      };
    });
    this.material.size = (1.85 * camera.position.z) / (innerHeight * 0.5);
    for (const node of this.nodes) {
      node.inert = true;
      node.setAttribute('aria-hidden', 'true');
    }
    this.beginMs = performance.now() - startedAt;
  }
  advanceFront(age) {
    if (!this.started || age > 2) return;
    for (const block of this.blocks) {
      if (block.empty) continue;
      for (const g of block.carriers) {
        this.point.set(g.cx, g.cy, g.cz).project(this.camera);
        const x = (this.point.x + 1) * innerWidth * 0.5,
          y = (1 - this.point.y) * innerHeight * 0.5;
        const radius = (x - this.origin.x) * block.dx + (y - this.origin.y) * block.dy + 12;
        block.front = Math.max(block.front, this.camera.position.z - g.cz < 0.5 ? Infinity : radius);
      }
    }
    for (const q of this.grains) {
      const block = this.blocks[q.block];
      if (q.releasedAt === null && block.front >= q.radius) {
        q.releasedAt = age;
        if (!block.hit) {
          block.hit = true;
          block.hitAt = age;
          block.node.classList.add('interface-fractured');
        }
      }
    }
    if (this.blocks.every((b) => b.empty || b.hit)) document.body.classList.add('interface-dispersed');
  }
  update(age, scene) {
    if (age === this.lastAge) return;
    this.lastAge = age;
    this.age = age;
    const dark = age < 0 ? 0 : smooth(age, 5.4, FINAL_FADE_END);
    scene.background.copy(this.ground).multiplyScalar(1 - dark);
    scene.fog.color.copy(scene.background);
    const show = age < 0 ? 0 : smooth(age, RESTART_APPEAR, RESTART_READY);
    if (show !== this.lastShow) {
      this.lastShow = show;
      this.restart.hidden = show <= 0;
      this.restart.style.opacity = String(show);
      this.restart.style.transform = `translate(-50%,calc(-50% + ${(1 - show) * 7}px))`;
    }
    if (show > 0.15 && this.focusRestart) {
      this.focusRestart = false;
      this.restart.focus({ preventScroll: true });
    }
    if (!this.started) return;
    this.count = 0;
    this.probes = [];
    if (age >= 0 && age < 3.2) {
      for (const q of this.grains) {
        if (!this.blocks[q.block].hit) continue;
        const t = q.releasedAt === null ? 0 : Math.max(0, age - q.releasedAt);
        const flight = (1 - Math.exp(-t * 1.25)) / 1.25,
          fray = t * (1 - Math.exp(-t * 8));
        const x = q.x + q.vx * flight + q.dx * fray,
          y = q.y + q.vy * flight + q.dy * fray,
          z = q.z + q.vz * flight;
        const alpha = q.a * (1 - smooth(t, 0.1 + q.seed * 0.1, 1.15 + q.seed * 0.3));
        if (alpha < 0.001) continue;
        const j = this.count * 3,
          c = this.count++ * 4;
        this.position.array[j] = x;
        this.position.array[j + 1] = y;
        this.position.array[j + 2] = z;
        this.color.array[c] = q.r;
        this.color.array[c + 1] = q.g;
        this.color.array[c + 2] = q.b;
        this.color.array[c + 3] = alpha;
        if (this.probes.length < 4 && t > 0)
          this.probes.push({
            id: q.id,
            position: [x, y, z],
            source: [q.x, q.y, q.z],
            releasedAt: q.releasedAt,
          });
      }
    }
    this.geometry.setDrawRange(0, this.count);
    for (const attribute of [this.position, this.color]) {
      attribute.clearUpdateRanges();
      if (this.count) {
        attribute.addUpdateRange(0, this.count * attribute.itemSize);
        attribute.needsUpdate = true;
      }
    }
  }
  render(renderer) {
    if (!this.count) return;
    renderer.autoClear = false;
    renderer.clearDepth();
    renderer.render(this.scene, this.camera);
    renderer.autoClear = true;
  }
  snapshot() {
    return {
      fronts: this.blocks.map((b) => ({
        hitAt: b.hitAt ?? null,
        carriers: b.carriers?.map((g) => g.id) || [],
      })),
      released: this.grains.filter((q) => q.releasedAt !== null).length,
      beginMs: this.beginMs,
      started: this.started,
      age: this.age,
      count: this.count,
      sourceCount: this.grains.length,
      labels: this.labels,
      probes: this.probes,
      restartVisible: !this.restart.hidden,
      restartOpacity: Number(this.restart.style.opacity),
    };
  }
}

const copy = {
  autoOn: 'Auto on',
  autoOff: 'Auto off',
  autoOnHint: 'Automatic impulses on - click to switch to manual',
  autoOffHint: 'Automatic impulses off - click to resume the sequence',
  pause: 'Pause animation',
  play: 'Play animation',
  pauseHint: 'Space: pause or play',
  impactHint: 'I: one impulse - Shift + I or Shift + click: three',
  resetHint: 'R: begin again',
  focusHint: 'D: depth of field',
  autoHint: 'Play the complete sequence automatically',
  stage: 'A hollow sculpture of white petals. Touch the surface to send an impulse.',
  empty: 'Remains. An empty black field.',
  release: 'The sculpture and its interface disperse into particles.',
  webgl: 'Unable to create the 3D scene. Use a browser with WebGL 2 and a local HTTP server.',
  lost: 'The graphics connection was lost. Refresh to view the work again.',
};
export function text(key) {
  return copy[key];
}
export function setupInterface() {
  for (const [id, key] of [
    ['pause', 'pauseHint'],
    ['impact', 'impactHint'],
    ['reset', 'resetHint'],
    ['dof', 'focusHint'],
    ['auto', 'autoHint'],
  ])
    document.querySelector('#' + id).title = copy[key];
  document.querySelector('#restart-center').title = copy.resetHint;
}
