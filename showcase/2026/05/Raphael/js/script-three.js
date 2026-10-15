import * as THREE from 'three';
import { text } from './interface.js';

// Set up the scene, camera and renderer.
export function initThree(container) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#080b10');
  scene.fog = new THREE.Fog('#080b10', 12, 22);
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 80);
  camera.position.set(0, 0.18, 14.6);
  camera.lookAt(0, 0, 0);
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor('#080b10');
  renderer.domElement.setAttribute('aria-label', text('stage'));
  container.appendChild(renderer.domElement);
  function resize() {
    const w = window.innerWidth,
      h = window.innerHeight;
    camera.aspect = w / h;
    camera.position.z = camera.aspect < 1 ? 14.6 / Math.max(0.59, camera.aspect) : 14.6;
    scene.fog.near = camera.position.z - 2.6;
    scene.fog.far = camera.position.z + 7.4;
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  resize();
  window.addEventListener('resize', resize);
  renderer.domElement.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    const error = document.querySelector('#error');
    error.hidden = false;
    error.textContent = text('lost');
  });
  return { scene, camera, renderer };
}

export class PointLayers {
  constructor(scene, particles) {
    // Reuse a soft dot texture for the point layers.
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 31);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.3, 'rgba(255,255,255,.76)');
    gradient.addColorStop(0.55, 'rgba(255,255,255,.4)');
    gradient.addColorStop(0.8, 'rgba(255,255,255,.13)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    const texture = new THREE.CanvasTexture(canvas);
    this.layers = [];
    const sizes = [0.025, 0.025, 0.11, 0.04];
    const counts = [0, 0, 0, 0];
    for (const p of particles) for (const s of p.samples) counts[s.kind]++;
    const total = counts.reduce((a, b) => a + b, 0);
    this.active = [];
    for (let kind = 0; kind < 4; kind++) {
      const capacity = kind === 3 ? total : counts[kind];
      for (let depth = 0; depth < 3; depth++) {
        const geometry = new THREE.BufferGeometry();
        const position = new THREE.BufferAttribute(new Float32Array(capacity * 3), 3);
        const color = new THREE.BufferAttribute(new Float32Array(capacity * 4), 4);
        position.setUsage(THREE.DynamicDrawUsage);
        color.setUsage(THREE.DynamicDrawUsage);
        geometry.setAttribute('position', position);
        geometry.setAttribute('color', color);
        geometry.setDrawRange(0, 0);
        // Three dot sizes give a simple depth blur.
        const blurSize = [0, 0.065, 0.18][depth];
        const size = Math.hypot(sizes[kind], blurSize);
        const material = new THREE.PointsMaterial({
          color: 0xffffff,
          size,
          map: texture,
          vertexColors: true,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          sizeAttenuation: true,
          fog: true,
        });
        const points = new THREE.Points(geometry, material);
        points.frustumCulled = false;
        scene.add(points);
        this.layers.push({ geometry, material, position, color, points, count: 0, size });
      }
    }
    this.drawCount = 0;
  }

  begin(camera) {
    const projectedScale = (innerHeight / 1000) * (14.6 / camera.position.length());
    for (const layer of this.layers) {
      layer.count = 0;
      layer.material.opacity = Math.max(0.3, Math.min(1, projectedScale ** 1.35));
    }
  }

  prepare(softness, screenScale) {
    this.scale = screenScale;
    const near = Math.min(2, Math.floor(softness)),
      fraction = softness - near;
    for (let kind = 0; kind < 4; kind++) {
      const a = this.layers[kind * 3 + near];
      const b = fraction > 0.001 && near < 2 ? this.layers[kind * 3 + near + 1] : null;
      a.factor = ((1 - fraction) * 1.9) / Math.max(1, a.size * screenScale) ** 2;
      if (b) b.factor = (fraction * 1.9) / Math.max(1, b.size * screenScale) ** 2;
      this.active[kind] = a;
      this.active[kind + 4] = b;
    }
  }

  add(kind, x, y, z, r, g, b, opacity, pointSize) {
    if (opacity <= 0.0001) return;
    const sharp = Math.max(0.85, pointSize * this.scale);
    const energy = opacity * sharp * sharp;
    this.write(this.active[kind], x, y, z, r, g, b, energy);
    const soft = this.active[kind + 4];
    if (soft) this.write(soft, x, y, z, r, g, b, energy);
  }

  write(layer, x, y, z, r, g, b, energy) {
    const i = layer.count * 3,
      c = layer.count++ * 4;
    layer.position.array[i] = x;
    layer.position.array[i + 1] = y;
    layer.position.array[i + 2] = z;
    layer.color.array[c] = r;
    layer.color.array[c + 1] = g;
    layer.color.array[c + 2] = b;
    layer.color.array[c + 3] = Math.min(1, energy * layer.factor);
  }

  // Upload only the points written this frame.
  finish() {
    this.drawCount = 0;
    for (const layer of this.layers) {
      layer.geometry.setDrawRange(0, layer.count);
      this.drawCount += layer.count;
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
