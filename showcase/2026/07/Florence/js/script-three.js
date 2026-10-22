import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Pane } from 'tweakpane';
import { setupLighting } from './lighting.js';
import { loadCloudLayers } from './cloud-layers.js';
import { createUnderwaterLightEffect } from './underwater.js';
import { createWorldMode } from './world-mode.js';
import { loadSky, updateSky, createDreamBackground } from './atmosphere.js';
import { loadProps, updateSwimmers, setFishCount } from './props.js';
import { setupThree, updateThree, ILLUSION_EYE, VIEW_TARGET } from './main.js';

// 1. Scene / camera / renderer — using the original starter's file structure.
const scene = new THREE.Scene();
scene.fog = new THREE.Fog('#c9bfdc', 75, 170);
// Fallback color behind the procedural dream panorama.
scene.background = new THREE.Color('#c6d4e6');

const camera = new THREE.PerspectiveCamera(39, innerWidth / innerHeight, 0.1, 2000);
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true });
} catch (error) {
  const message = document.getElementById('error-message');
  message.hidden = false;
  message.textContent = 'This scene needs WebGL. Please open it in a browser with hardware acceleration enabled.';
  throw error;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.95;
renderer.domElement.setAttribute('aria-label', 'Third-person orbit controls; first-person movement with WASD and drag to look around.');
document.getElementById('container-three').appendChild(renderer.domElement);

// 2. Third-person orbit controls. Walking temporarily disables these.
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.copy(VIEW_TARGET);
controls.enableDamping = true;
controls.dampingFactor = 0.065;
controls.enablePan = false;
controls.minDistance = 19;
controls.maxDistance = 65;
controls.minPolarAngle = 0.25;
controls.maxPolarAngle = Math.PI * 0.79;
controls.rotateSpeed = 0.65;
controls.zoomSpeed = 0.7;

// 3. Five deliberately placed lights; see lighting.js and LIGHTING.md.
const lights = setupLighting(scene);

// 4. Modular construction lives in main.js and geometry.js.
const world = setupThree(scene);
const atmosphere = createDreamBackground(scene);
const worldMode = createWorldMode(scene, lights, atmosphere);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const params = { stairDistance: 1.27, lightIntensity: 1, eyeSize: 1, eyeAngle: 0, eyeMotion: 8, fishCount: 42, bloodyWorld: false };
const lightBase = lights.map(light => light.intensity);
let assets = { mixers: [], placed: [], failed: [], eyes: [], swimmers: [] };
let underwater = null;
let currentView = 'Overview';
let transition = null;
const overviewEye = new THREE.Vector3(31, 24, 24);
// Widen the lens on portrait screens; keep the exact illusion eye unchanged.
function resize() {
  camera.aspect = innerWidth / innerHeight;
  camera.fov = THREE.MathUtils.radToDeg(
  2 * Math.atan(
    Math.tan(THREE.MathUtils.degToRad(46 / 2)) *
    Math.max(1, 1.5 / camera.aspect)
  )
);
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
}
addEventListener('resize', resize);
resize();

function jumpToView(name, instant = false) {
  const end = name === 'Illusion View' ? ILLUSION_EYE : overviewEye;
  // Drain OrbitControls' residual damping before setting an exact viewpoint.
  controls.enableDamping = false;
  controls.update();
  controls.enableDamping = true;
  currentView = name;
  if (instant || reducedMotion) {
    transition = null;
    camera.position.copy(end);
    controls.target.copy(VIEW_TARGET);
    controls.update();
  } else {
    transition = { start: camera.position.clone(), end: end.clone(), time: performance.now() };
  }
}
controls.addEventListener('start', () => {
  transition = null;
  currentView = 'Free orbit';
});

// View-mode controls stay separate from the four scene sliders.
document.getElementById('illusion-button').addEventListener('click', () => jumpToView('Illusion View'));
function applyLighting() {
  renderer.toneMappingExposure=0.95*Math.pow(params.lightIntensity,0.45);
  lights.forEach((light, i) => { light.intensity = lightBase[i] * params.lightIntensity; });
  scene.environmentIntensity = 0.32 * params.lightIntensity;
}
function applyEyes() { worldMode.update(0, assets, params, reducedMotion); }
// Same simple binding pattern as the supplied classroom Tweakpane example.
const guiHost = document.createElement('aside');
guiHost.className = 'scene-panel';
guiHost.setAttribute('aria-label', 'Scene controls');
document.body.appendChild(guiHost);
const pane = new Pane({ title: 'Scene Controls', container: guiHost, expanded: innerWidth >= 650 });
pane.addBinding(params, 'lightIntensity', { label: 'World brightness', min: 0.15, max: 3, step: 0.05 })
  .on('change', applyLighting);
pane.addBinding(params, 'fishCount', { label: 'Fish count', min: 0, max: 84, step: 1 })
  .on('change', event => setFishCount(assets, event.value));
pane.addBinding(params, 'bloodyWorld', { label: 'Bloody World' })
  .on('change', event => {
    worldMode.setBloodWorldMode(event.value);
    eyeFolder.hidden = !event.value;
    eyeFolder.expanded = event.value;
  });
const eyeFolder = pane.addFolder({ title: 'Eyes', expanded: true });
eyeFolder.hidden = !params.bloodyWorld;
eyeFolder.addBinding(params, 'eyeSize', { label: 'Eye size', min: 0.5, max: 4, step: 0.05 })
  .on('change', applyEyes);
eyeFolder.addBinding(params, 'eyeAngle', { label: 'Eye angle', min: -180, max: 180, step: 1 })
  .on('change', applyEyes);
eyeFolder.addBinding(params, 'eyeMotion', { label: 'Eye motion', min: 0, max: 60, step: 1 });
// A view URL is useful when sharing or returning to the exact illusion angle.
const initialView = new URLSearchParams(location.search).get('view') === 'illusion' ? 'Illusion View' : 'Overview';
jumpToView(initialView, true);

// 6. Time-based animation; reduced motion also makes mode changes immediate.
let previousTime = performance.now();
let motionTime = 0;
let skyTime = 0;
// Loading is silent; failures remain available in the developer console.
function reportLoaded() {}
// Each asset family can fail independently without hiding the architecture.
Promise.allSettled([
  loadSky(scene, renderer).then(value => { applyLighting(); reportLoaded(); return value; }),
  loadProps(scene, world, reportLoaded).then(value => { assets = value; setFishCount(assets,params.fishCount); applyEyes(); return value; }),
  loadCloudLayers(scene, atmosphere, reportLoaded),
  createUnderwaterLightEffect(scene, world.architecture).then(value => { underwater = value; reportLoaded(); return value; })
]).then(results => {
  const failures = [...assets.failed];
  if (results[0].status === 'rejected') failures.push('sunflowers_puresky_4k.exr');
  if (results[1].status === 'rejected') failures.push('GLB model setup');
  if (results[2].status === 'rejected') failures.push('cloud layers');
  else failures.push(...results[2].value.failures);
  if (results[3].status === 'rejected') failures.push('water_ripple.png');
  document.documentElement.dataset.assets = failures.length ? 'incomplete' : 'ready';
  document.documentElement.dataset.propCount = String(assets.placed.length);
  if (failures.length) {
    console.error('Asset loading failed', failures, results);
  }
});
renderer.setAnimationLoop(now => {
  const delta = Math.min((now - previousTime) / 1000, 0.05);
  previousTime = now;
  if (!reducedMotion) motionTime += delta;
  updateThree(world, motionTime);
  if (!reducedMotion) skyTime += delta;
  worldMode.update(delta, assets, params, reducedMotion);
  updateSky(scene, skyTime, atmosphere, camera);
  updateSwimmers(assets, motionTime);
  underwater?.update(motionTime, worldMode.blend, params.lightIntensity);
  if (!reducedMotion) assets.mixers.forEach(mixer => { if(mixer.fishObject?.visible !== false) mixer.update(delta * 0.35); });
  if (transition) {
    const progress = Math.min((now - transition.time) / 1100, 1);
    const eased = progress * progress * (3 - 2 * progress);
    camera.position.lerpVectors(transition.start, transition.end, eased);
    controls.target.copy(VIEW_TARGET);
    if (progress === 1) transition = null;
  }
  controls.update();
  renderer.render(scene, camera);
});

// Small read-only diagnostics for checking the optical construction in DevTools.
// Both endpoints and the full width should overlap in the saved illusion view.
window.stairscape = {
  getDiagnostics() {
    camera.updateMatrixWorld();
    const a = world.seamA.clone().project(camera);
    const b = world.seamB.clone().project(camera);
    return {
      view: currentView,
      physicalGap: world.seamA.distanceTo(world.seamB),
      seamErrorPixels: Math.hypot((a.x - b.x) * innerWidth / 2, (a.y - b.y) * innerHeight / 2),
      mode: "orbit",
      settings: { ...params }, skyRotation: scene.backgroundRotation.y,
      walkSurfaces: world.walkSurfaces.length, props: assets.placed.length,
      eyes: assets.eyes.filter(eye => eye.object.visible).length,
      fish: assets.swimmers.filter(f=>f.object.visible).length,
      eyeClearance: assets.eyes.map(eye => ({position:eye.object.position.toArray(),radius:eye.object.userData.clearanceRadius})),
      bloodBlend: worldMode.blend,
      lights: lights.map(light => ({ name: light.name, type: light.type, position: light.position.toArray(), intensity: light.intensity })),
      floatingMotion: !reducedMotion,
      camera: camera.position.toArray(),
      drawCalls: renderer.info.render.calls
    };
  }
};
