import * as THREE from 'three';
import { getBox, createPlatform, createStair, createArch, createColumn } from './geometry.js';

export const WORLD_SETTINGS = {
  density: 2,            
  foregroundScale: 1,     
  backgroundScale: 0.72, 
  backgroundDepth: 1,    
  backgroundHaze: 0.38,  
  lowerDepth: 1,     
  lowerCount: 3,         
  backgroundCount: 3    
};

function place(parent, object, position, yaw = 0) {
  object.position.set(...position);
  object.rotation.y = yaw;
  parent.add(object);
  return object;
}

function bridge(parent, from, to, width = 1.5, color = 'mint') {
  const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to);
  const delta = b.clone().sub(a);
  const group = createPlatform(Math.hypot(delta.x, delta.z), width, color);
  return place(parent, group, a.add(b).multiplyScalar(0.5).toArray(), -Math.atan2(delta.z, delta.x));
}

export function createStairSection(parent, from, to, color = 'pink', width = 1.5) {

  let a = from, b = to;
  if (b[1] < a[1]) [a, b] = [b, a];
  const dx = b[0] - a[0], dz = b[2] - a[2];
  const rise = b[1] - a[1];
  if (rise < 0.01) return bridge(parent, a, b, width, color);
  const steps = Math.max(5, Math.ceil(rise / 0.28));
  return place(parent, createStair({ steps, run: Math.hypot(dx, dz) / steps, rise: rise / steps, width, color }), a, -Math.atan2(dz, dx));
}

function batchBoxes(root, castShadow = true) {
  root.updateMatrixWorld(true);
  const inverse = root.matrixWorld.clone().invert();
  const buckets = new Map();
  root.traverse(mesh => {
    if (!mesh.isMesh || mesh.geometry.type !== 'BoxGeometry') return;
    if (!buckets.has(mesh.material)) buckets.set(mesh.material, []);
    buckets.get(mesh.material).push(mesh);
  });
  for (const [material, meshes] of buckets) {
    const batch = new THREE.InstancedMesh(meshes[0].geometry, material, meshes.length);
    batch.name = 'Shared architectural blocks';
    batch.castShadow = castShadow;
    batch.receiveShadow = true;
    meshes.forEach((mesh, index) => {
      const matrix = new THREE.Matrix4().multiplyMatrices(inverse, mesh.matrixWorld);
      batch.setMatrixAt(index, matrix);
      if (mesh.userData.walkable) {
        const surface = new THREE.Mesh(mesh.geometry, material);
        surface.matrix.copy(matrix); surface.matrixAutoUpdate=false;
        surface.visible=false; surface.userData.walkable=true;
        surface.userData.walkProxy=true;
        root.add(surface);
      }
      mesh.removeFromParent();
    });
    batch.computeBoundingSphere();
    root.add(batch);
  }
}

export function createForegroundStructure(parent) {
  const group = new THREE.Group();
  group.name = 'Foreground — approach, right gateway, overhead lintel';
  parent.add(group);

  const approach = new THREE.Group();
  place(group, approach, [-10, 0, 5]);
  approach.scale.setScalar(WORLD_SETTINGS.foregroundScale);
  createStairSection(approach, [0, -8, 13], [0, 0, 0], 'pink', 3.6);
  place(approach, createPlatform(5, 3.2, 'mint', true), [0, 0, -1.6]);
  place(approach, createColumn(9, 'blue'), [-1.8, -0.4, -2.5]);
  createStairSection(group, [-11, 0, 1.8], [-8, -2, 1], 'lavender', 1.5);

  const portal = new THREE.Group();
  place(group, portal, [16, -1, 7.5], -0.2);
  portal.scale.setScalar(WORLD_SETTINGS.foregroundScale);
  place(portal, createArch({ width: 7, height: 14, depth: 1.25, color: 'yellow' }), [0, 0, 0]);
  place(portal, createPlatform(8.1, 3.4, 'lavender', true), [0, 0, 0]);
  place(portal, createColumn(8, 'pink'), [2.8, -0.4, 0]);
  createStairSection(group, [12.5, -1, 7.5], [9.3, 5.6, -5.5], 'blue', 1.7);

  bridge(group, [-10, 13, 5], [16, 13, 7.5], 1.6, 'lavender');
  const pier = createColumn(13, 'mint');
  pier.scale.x = pier.scale.z = 2.4;
  place(group, pier, [-10, 13, 5]);
  batchBoxes(group);
  return group;
}

export function createBackgroundCluster(parent, origin, scale, index) {
  const group = new THREE.Group();
  group.name = `Distant gallery ${index + 1}`;
  place(parent, group, origin);
  group.scale.setScalar(scale);
  place(group, createPlatform(3, 2.4, 'blue'), [0, 0, 0]);
  place(group, createArch({ width: 2.4, height: 3.5, color: 'lavender' }), [0, 0, -0.4]);
  createStairSection(group, [1.5, 0, 0], [6.5, 2.4, 0], 'mint', 1.3);
  place(group, createPlatform(2, 2.4, 'pink'), [7.5, 2.4, 0]);
  bridge(group, [7.5, 2.4, -1.2], [7.5, 2.4, -5], 1.15, 'yellow');
  place(group, createPlatform(3, 2, 'mint'), [7.5, 2.4, -6]);
  place(group, createArch({ width: 2.4, height: 3.5, color: 'pink' }), [7.5, 2.4, -6]);
  place(group, createColumn(5, 'blue'), [7.5, 2, -6]);
  return { group, entry: origin, exit: [origin[0] + 7.5 * scale, origin[1] + 2.4 * scale, origin[2] - 6 * scale] };
}

export function createLowerCluster(parent, origin, scale, index) {
  const group = new THREE.Group();
  group.name = `Lower gallery ${index + 1}`;
  place(parent, group, origin); group.scale.setScalar(scale);
  place(group, createPlatform(4, 3, 'lavender', true), [0, 0, 0]);
  place(group, createArch({ width: 2.7, height: 3.6, color: 'mint' }), [0, 0, -0.6]);
  createStairSection(group, [2, 0, 0], [7, -3, 0], 'pink', 1.5);
  place(group, createPlatform(3, 3, 'yellow'), [8.5, -3, 0]);
  bridge(group, [8.5, -3, -1.5], [8.5, -3, -6], 1.4, 'blue');
  place(group, createPlatform(3, 2, 'mint'), [8.5, -3, -7]);
  place(group, createArch({ color: 'pink' }), [8.5, -3, -7]);
  for (const x of [-1.5, 1.5]) place(group, createColumn(6, 'blue'), [x, -0.4, 0]);
  return { entry: origin, exit: [origin[0] + 8.5 * scale, origin[1] - 3 * scale, origin[2] - 7 * scale] };
}

function createLowerWorld(architecture) {
  const lower = new THREE.Group(); lower.name = 'Descending lower world';
  architecture.add(lower);
  const origins = [[-7,-10,4], [2,-17,-12], [-13,-24,-26]];
  const clusters = origins.slice(0, WORLD_SETTINGS.lowerCount).map((p, i) =>
    createLowerCluster(lower, [p[0], p[1] * WORLD_SETTINGS.lowerDepth, p[2]], 1 - i * 0.14, i));
  if (clusters.length) createStairSection(lower, [-3.6,-5.8,5.7], clusters[0].entry, 'blue', 1.5);
  for (let i = 1; i < clusters.length; i++) createStairSection(lower, clusters[i-1].exit, clusters[i].entry, 'lavender', 1.2);
 
  if (clusters.length) {
    const last = clusters.at(-1).exit;
    createStairSection(lower, last, [last[0]+6,last[1]-6,last[2]+5], 'mint', 1.5);
  }

  if (clusters.length) {
    const end = clusters.at(-1).exit;
    for (const side of [-1, 1]) {
      const anchor = [end[0] + side * 7, end[1] - 4, end[2] + 4];
      createStairSection(lower, end, anchor, 'pink', 1.1);
      place(lower, createPlatform(3.2, 2.6, 'blue'), anchor);
      place(lower, createArch({width:2.3,height:3.4,color:'yellow'}), anchor);
      place(lower, createColumn(5,'lavender'), [anchor[0]+1.2,anchor[1]-0.4,anchor[2]]);
    }
  }
  batchBoxes(lower, false);
  return lower;
}

export function addWorldLayers(architecture) {
  const middle = new THREE.Group();
  middle.name = 'Interlocking middle galleries';
  architecture.add(middle);

  createStairSection(middle, [-9.2, 1.95, 0.45], [-7.9, -2, 1], 'mint');
  bridge(middle, [-7.4, 4.2, -6.6], [-7.4, 4.2, -13], 1.6, 'blue');
  place(middle, createPlatform(5, 3, 'yellow', true), [-7.4, 4.2, -14.5]);
  bridge(middle, [-4.9, 4.2, -14.5], [3.5, 4.2, -14.5], 1.7, 'lavender');
  place(middle, createPlatform(4, 3, 'mint', true), [5.5, 4.2, -14.5]);
  createStairSection(middle, [7.5, 4.2, -14.5], [8.2, 5.3, -8.5], 'pink');
  createStairSection(middle, [8.2, 5.3, -6.5], [6.8, 0.2, -4], 'yellow');
  createStairSection(middle, [-3.6, -5.8, 5.7], [-0.6, -4.12, 3.5], 'lavender');


  for (const x of [-7.4, -3, 1.4]) {
    place(middle, createArch({ width: 2.4, height: 3.5, color: 'pink' }), [x, 4.2, -14.5]);
    place(middle, createColumn(7, 'lavender'), [x, 3.8, -14.5]);
  }
  
  place(middle, createPlatform(5, 2.8, 'blue', true), [13, 4, -1]);
  place(middle, createArch({ width: 4, height: 6, depth: 0.8, color: 'mint' }), [13, 4, -1]);
  createStairSection(middle, [13, 4, -2.4], [8.2, 5.3, -6.5], 'lavender', 1.6);
  place(middle, createColumn(8, 'pink'), [14.6, 3.6, -1]);

  if (WORLD_SETTINGS.density >= 2) {
    bridge(middle, [-10, -3.2, -2], [0.7, -3.2, -2], 2, 'mint');
    createStairSection(middle, [-6.6, -2, -0.45], [-10, -3.2, -2], 'pink');
    createStairSection(middle, [0.7, -3.2, -2], [0.7, -4.12, 2.2], 'blue');
    for (const x of [-8.4, -3.6]) {
      place(middle, createArch({ width: 2.4, height: 2.8, color: 'yellow' }), [x, -3.2, -2]);
      place(middle, createColumn(5, 'pink'), [x, -3.6, -2]);
    }
  
    bridge(middle, [-7.4, 8.4, -5.2], [-1.4, 8.4, -8], 1.3, 'yellow');
    createStairSection(middle, [-1.4, 6.8, -8], [-1.4, 8.4, -8.9], 'pink', 1.3);
    createStairSection(middle, [-7.4, 4.2, -6.6], [-7.4, 8.4, -10.7], 'blue', 1.3);
    bridge(middle, [-7.4, 8.4, -10.7], [-7.4, 8.4, -5.2], 1.3, 'yellow');
    place(middle, createArch({ color: 'blue' }), [-1.4, 8.4, -8]);
  }
  if (WORLD_SETTINGS.density >= 3) {
    createStairSection(middle, [5.5, 4.2, -14.5], [5.5, 9, -20], 'yellow');
    place(middle, createPlatform(4, 2.8, 'pink'), [5.5, 9, -21.4]);
    place(middle, createArch({ color: 'mint' }), [5.5, 9, -21.4]);
  }


  place(middle, createPlatform(1.8, 2.2, 'lavender'), [-9.7, 4.2, -5.2]);
  place(middle, createPlatform(2.3, 1.6, 'pink'), [5.5, 4.2, -14]);
  for (const x of [4.4, 6.6]) place(middle, getBox(0.25, 1.8, 1.7, 'mint'), [x, 4.9, -14]);
  place(middle, getBox(2.5, 0.22, 1.7, 'yellow'), [5.5, 5.85, -14]);
  for (const x of [0.05, 1.35]) place(middle, getBox(0.1, 0.7, 0.1, 'lavender'), [x, -4.85, 3.5]);
  batchBoxes(middle);


  const promenade = new THREE.Group();
  promenade.name = 'Walkable rear bridge extension';
  promenade.userData.walkRoute = true;
  architecture.add(promenade);

  place(promenade, createPlatform(1.4, 1.4, 'lavender'), [10.4, 8, 1.4]);
  bridge(promenade, [10.4, 8, 1.4], [10.4, 8, -8.5], 1.2, 'lavender');
  place(promenade, createPlatform(3.2, 2.4, 'mint', true), [10.4, 8, -9.7]);

  const foreground = createForegroundStructure(architecture);
  const background = new THREE.Group();
  background.name = 'Atmospheric distant continuation';
  architecture.add(background);
  const roots = [[-18, 2, -24], [-6, 5, -32], [8, 3, -42], [20, 6, -49]];
  const clusters = roots.slice(0, WORLD_SETTINGS.backgroundCount).map((p, i) => {
    const origin = [p[0], p[1], p[2] * WORLD_SETTINGS.backgroundDepth];
    return createBackgroundCluster(background, origin, WORLD_SETTINGS.backgroundScale * (1 - i * 0.08), i);
  });
  if (clusters.length) createStairSection(background, [-7.4, 4.2, -16], clusters[0].entry, 'blue', 0.9);
  for (let i = 1; i < clusters.length; i++) createStairSection(background, clusters[i - 1].exit, clusters[i].entry, 'lavender', 0.75);
  const muted = new Map();
  background.traverse(mesh => {
    if (!mesh.isMesh) return;
    if (!muted.has(mesh.material)) {
      const material = mesh.material.clone();
      material.color.lerp(new THREE.Color('#c9dce9'), WORLD_SETTINGS.backgroundHaze);
      muted.set(mesh.material, material);
    }
    mesh.material = muted.get(mesh.material);
    mesh.castShadow = false;
  });
  batchBoxes(background, false);

  const lower = createLowerWorld(architecture);
  return {
    foreground, middle, background, promenade, lower,
    tvMounts: [
      { size: 1.25, position: [9, 8, 2.1], yaw: 0.5, anchor: 'bottom' },
      { size: 1.6, position: [-9.7, 4.2, -5.2], yaw: 0.6, anchor: 'bottom' },
      { size: 1.65, position: [5.5, 4.2, -14], yaw: 0, anchor: 'bottom' },
      { size: 1.6, position: [0.7, -5.2, 3.5], yaw: 0.4, anchor: 'top' }
    ],
    eyePlacements: [
      { size: 7.2, position: [26, 12, 8], target: [-1, 0, 5] },
      { size: 4.2, position: [-22, 10, -22 * WORLD_SETTINGS.backgroundDepth], target: [-4, 1, 2] },
      { size: 3.2, position: [5, 13, -38 * WORLD_SETTINGS.backgroundDepth], target: [8, 3, 2] }
    ]
  };
}
