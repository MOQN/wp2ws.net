import * as THREE from 'three';

export const colors = {
  blue: '#94c9ee', pink: '#efa8c3', mint: '#a5dfbf',
  yellow: '#f6df8e', lavender: '#bbafe6', white: '#fff9ee'
};
const materials = {};
for (const [name, color] of Object.entries(colors)) {
  materials[name] = new THREE.MeshStandardMaterial({ color, roughness: 0.86 });
}
const archCache = new Map();
const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);

export function getBox(width, height, depth, color = 'blue') {
  const mesh = new THREE.Mesh(cubeGeometry, materials[color]);
  mesh.scale.set(width, height, depth);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function createPlatform(width = 3, depth = 2.5, color = 'pink', trim = false) {
  const group = new THREE.Group();
  const slab = getBox(width, 0.4, depth, color);
  slab.position.y = -0.2;
  slab.userData.walkable = true;
  group.add(slab);
  if (trim) {
    ['pink', 'yellow', 'mint', 'lavender'].forEach((tint, i) => {
      const band = getBox(width + 0.045, 0.045, depth + 0.045, tint);
      band.position.y = -0.13 - i * 0.045;
      group.add(band);
    });
  }
  return group;
}

export function createStair({ steps = 10, run = 0.52, rise = 0.28, width = 1.55, color = 'blue', multicolor = false } = {}) {
  const group = new THREE.Group();
  const tints = ['pink', 'yellow', 'mint', 'blue', 'lavender'];
  for (let i = 0; i < steps; i++) {
    const step = getBox(run + 0.006, rise + 0.12, width, color);
    step.position.set((i + 0.5) * run, (i + 1) * rise - (rise + 0.12) / 2, 0);
    step.userData.walkable = true;
    group.add(step);
    const tread = getBox(run + 0.022, 0.035, width + 0.045, multicolor ? tints[i % tints.length] : color);
    tread.position.set((i + 0.5) * run, (i + 1) * rise - 0.0175, 0);
    group.add(tread);
  }
  return group;
}

export function createArch({ width = 2.4, height = 3.5, depth = 0.5, color = 'yellow' } = {}) {
  const group = new THREE.Group();
  const outer = width / 2;
  const inner = outer - 0.36;
  const spring = height - outer;
  const shape = new THREE.Shape();
  shape.moveTo(-outer, 0);
  shape.lineTo(-outer, spring);
  shape.absarc(0, spring, outer, Math.PI, 0, true);
  shape.lineTo(outer, 0);
  shape.lineTo(inner, 0);
  shape.lineTo(inner, spring);
  shape.absarc(0, spring, inner, 0, Math.PI, false);
  shape.lineTo(-inner, 0);
  shape.closePath();
  const key = `${width}/${height}/${depth}`;
  let geometry = archCache.get(key);
  if (!geometry) {
    geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 24 });
    geometry.translate(0, 0, -depth / 2);
    archCache.set(key, geometry);
  }
  const arch = new THREE.Mesh(geometry, materials[color]);
  arch.castShadow = true;
  arch.receiveShadow = true;
  group.add(arch);
  [-1, 1].forEach(side => {
    const foot = getBox(0.52, 0.14, depth + 0.18, color);
    foot.position.set(side * (outer - 0.18), 0.07, 0);
    group.add(foot);
  });
  return group;
}

export function createColumn(height = 3, color = 'lavender') {
  const group = new THREE.Group();
  const shaft = getBox(0.42, height, 0.42, color);
  shaft.position.y = -height / 2;
  group.add(shaft);
  [0, -height].forEach(y => {
    const cap = getBox(0.63, 0.16, 0.63, 'yellow');
    cap.position.y = y;
    group.add(cap);
  });
  return group;
}

