import * as THREE from 'three';
import { addWorldLayers } from './world-layers.js';
import { createPlatform, createStair, createArch, createColumn } from './geometry.js';

// This is the exact optical center used to construct the illusion.
export const ILLUSION_EYE = new THREE.Vector3(18, 14, 26);
export const VIEW_TARGET = new THREE.Vector3(-1, 2.5, -1);

export function setupThree(scene) {
  const architecture = new THREE.Group();
  architecture.name = 'Floating architecture';
  scene.add(architecture);
  const floating = [];

  function place(parent, object, x, y, z, rotation = 0) {
    object.position.set(x, y, z);
    object.rotation.y = rotation;
    parent.add(object);
    return object;
  }
  function island(x, y, z, width, depth, color, trim = false) {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    group.add(createPlatform(width, depth, color, trim));
    architecture.add(group);
    return group;
  }

  const nearFlight = place(architecture, createStair(), -5.2, -2, 1);
  nearFlight.name = 'Illusion A — near stair';
  nearFlight.userData.walkRoute = true;
  const start = island(-6.6, -2, 1, 2.8, 2.9, 'pink', true);
  start.userData.walkRoute = true;
  place(start, createColumn(2.8, 'pink'), -0.9, -0.4, -0.8);
  place(start, createColumn(1.8, 'blue'), 0.9, -0.4, 0.8);

  const farAssembly = new THREE.Group();
  farAssembly.userData.noWalking = true;
  farAssembly.name = 'Illusion B — distant stair and gate';
  place(farAssembly, createStair(), 0, 0.8, 1);
  place(farAssembly, createPlatform(2.6, 2.7, 'mint', true), 6.5, 3.6, 1);
  place(farAssembly, createArch({ color: 'yellow' }), 6.5, 3.6, 0.65, -0.18);
  place(farAssembly, createColumn(2.6, 'mint'), 7.25, 3.2, 0.1);
  const perspectiveScale = 1.27;
  farAssembly.scale.setScalar(perspectiveScale);
  farAssembly.position.copy(ILLUSION_EYE).multiplyScalar(1 - perspectiveScale);
  architecture.add(farAssembly);

  // Upper-left cluster: a second ascending route, separated from the center.
  const upper = island(-7.4, 4.2, -5.2, 3.3, 2.8, 'lavender', true);
  place(upper, createArch({ height: 3.2, color: 'pink' }), -0.15, 0, -0.35, 0.18);
  place(upper, createColumn(3.5, 'blue'), -1.1, -0.4, -0.8);
  place(upper, createColumn(2.2, 'lavender'), 1.1, -0.4, -0.8);
  place(architecture, createStair({ steps: 9, run: 0.44, rise: 0.25, width: 1.2, color: 'lavender', multicolor: true }), -9.2, 1.95, -1.24, Math.PI / 2);
  island(-9.2, 1.95, -0.4, 2.4, 1.7, 'mint');

  // Right-hand fragments form a small switchback instead of a single building.
  const right = island(6.8, 0.2, -2.6, 3.2, 2.8, 'pink', true);
  place(right, createArch({ width: 2.1, height: 3, color: 'mint' }), 0, 0, -0.35, -0.3);
  place(right, createColumn(3.1, 'lavender'), 1.1, -0.4, -0.8);
  place(architecture, createStair({ steps: 8, run: 0.47, rise: 0.27, width: 1.3, color: 'pink', multicolor: true }), 6.8, -1.96, 2.56, Math.PI / 2);
  island(6.8, -1.96, 3.5, 2.6, 1.9, 'yellow');
  place(architecture, createStair({ steps: 8, run: 0.44, rise: 0.27, width: 1.3, color: 'mint' }), 2.0, -4.12, 3.5);
  const lower = island(0.7, -4.12, 3.5, 2.6, 2.6, 'mint', true);
  place(lower, createColumn(2.3, 'blue'), -0.7, -0.4, 0.7);
  place(lower, createPlatform(1.8, 1.9, 'yellow'), 0, 0.3, -0.1);

  // A few deliberately unfinished paths and detached doorways.
  const lowGate = island(-5.1, -5.8, 5.7, 3, 2.3, 'blue', true);
  place(lowGate, createArch({ width: 2, height: 2.7, color: 'lavender' }), 0, 0, -0.25, 0.15);
  place(lowGate, createStair({ steps: 6, run: 0.4, rise: 0.22, width: 1.1, color: 'pink' }), 1.5, -1.32, 0, Math.PI);
  // Connected galleries stay fixed; only the creatures drift.
  const small = island(8.2, 5.3, -7.5, 1.9, 2, 'yellow');
  place(small, createArch({ width: 1.6, height: 2.7, color: 'blue' }), 0, 0, 0, -0.3);
  place(small, createColumn(1.7, 'pink'), 0.5, -0.4, 0.5);

  const fragment = island(-1.4, 6.8, -8, 1.7, 1.7, 'pink');
  place(fragment, createStair({ steps: 5, run: 0.38, rise: 0.24, width: 0.95, color: 'yellow' }), -2.75, -1.2, 0);


  // A real walkable branch begins at the near flight's upper edge. Unlike the
  // illusion flight, these three extra flights and four landings truly touch.
  // Run behind the blue stair now, keeping its optical seam visible.
  const walkRoute = new THREE.Group();
  walkRoute.name = 'Continuous promenade — 30 additional steps';
  walkRoute.userData.walkRoute = true;
  architecture.add(walkRoute);
  place(walkRoute, createPlatform(1.8, 2.2, 'mint', true), 0.9, 0.8, 1);
  place(walkRoute, createStair({ steps: 10, run: 0.45, rise: 0.24, width: 1.65, color: 'pink', multicolor: true }), 0.9, 0.8, -0.1, Math.PI / 2);
  place(walkRoute, createPlatform(3, 1.8, 'yellow', true), 0.9, 3.2, -5.5);
  place(walkRoute, createStair({ steps: 10, run: 0.45, rise: 0.24, width: 1.65, color: 'mint' }), 2.4, 3.2, -5.5);
  place(walkRoute, createPlatform(2.4, 2.4, 'lavender', true), 8.1, 5.6, -5.5);
  place(walkRoute, createStair({ steps: 10, run: 0.45, rise: 0.24, width: 1.65, color: 'yellow', multicolor: true }), 8.1, 5.6, -4.3, -Math.PI / 2);
  place(walkRoute, createPlatform(3.2, 2.4, 'pink', true), 8.1, 8, 1.4);
  place(walkRoute, createColumn(2.7, 'lavender'), 9.1, 7.6, 2.2);

  const layers = addWorldLayers(architecture);

  const seamA = new THREE.Vector3(0, 0.8, 1);
  const seamB = new THREE.Vector3();
  // Distance remains a perspective scale about the saved eye. The slider
  // changes the physical gap while preserving alignment in Illusion View.
  function setStairDistance(scale) {
    farAssembly.scale.setScalar(scale);
    farAssembly.position.copy(ILLUSION_EYE).multiplyScalar(1 - scale);
    seamB.copy(seamA).sub(ILLUSION_EYE).multiplyScalar(scale).add(ILLUSION_EYE);
    farAssembly.updateMatrixWorld(true);
  }
  setStairDistance(perspectiveScale);
  const walkSurfaces = [];
  architecture.traverse(object => {
    if (!object.userData.walkable) return;
    let parent = object;
    while(parent) {
      if(parent.userData.noWalking) return;
      parent=parent.parent;
    }
    walkSurfaces.push(object);
  });
  architecture.updateMatrixWorld(true);
  return { architecture, layers, floating, seamA, seamB, setStairDistance, walkSurfaces,
    walkSpawn: new THREE.Vector3(-6.6, -2, 1) };
}

export function updateThree(world, motionTime) {
  for (const item of world.floating) {
    item.object.position.y = item.baseY + Math.sin(motionTime * 0.55 + item.phase) * item.amplitude;
  }
}
