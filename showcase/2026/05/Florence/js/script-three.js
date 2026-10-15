import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Pane } from 'tweakpane';
import { params, setupThree, updateThree } from './main.js';

const scene = new THREE.Scene();
// background
const skyCanvas = document.createElement('canvas');
skyCanvas.width = skyCanvas.height = 1024;
const sky = skyCanvas.getContext('2d');
sky.fillStyle = '#010207';
sky.fillRect(0, 0, 1024, 1024);
function addHaze(x, y, radius, color) {
  const gradient = sky.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  sky.fillStyle = gradient;
  sky.fillRect(0, 0, 1024, 1024);
}
addHaze(230, 620, 650, 'rgba(12,29,48,0.55)');
addHaze(850, 200, 550, 'rgba(28,16,43,0.4)');
const skyTexture = new THREE.CanvasTexture(skyCanvas);
skyTexture.colorSpace = THREE.SRGBColorSpace;
scene.background = skyTexture;

// stars in the background
const starCount = 1400;
const starPositions = new Float32Array(starCount * 3);
const starColors = new Float32Array(starCount * 3);
for (let i = 0; i < starCount; i++) {
  const height = Math.random() * 2 - 1;
  const angle = Math.random() * Math.PI * 2;
  const ring = Math.sqrt(1 - height * height);
  starPositions[i * 3] = 70 * ring * Math.cos(angle);
  starPositions[i * 3 + 1] = 70 * height;
  starPositions[i * 3 + 2] = 70 * ring * Math.sin(angle);
  const color = new THREE.Color(Math.random() < 0.15 ? '#b5b9c9' : '#657d9c');
  color.multiplyScalar(0.35 + Math.random() * 0.65);
  color.toArray(starColors, i * 3);
}
const starGeometry = new THREE.BufferGeometry();
starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
const stars = new THREE.Points(starGeometry, new THREE.PointsMaterial({
  size: 1.3,
  sizeAttenuation: false,
  vertexColors: true,
  depthWrite: false,
}));
stars.name = 'Distant stars';
scene.add(stars);
const camera = new THREE.PerspectiveCamera(43, innerWidth / innerHeight, 0.1, 100);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
document.getElementById('container-three').appendChild(renderer.domElement);

function fittedDistance() {
  return 10.4 * Math.max(1, 1 / camera.aspect);
}
camera.position.set(0.55, 0.58, 1).normalize().multiplyScalar(fittedDistance());
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.045;
controls.enablePan = false;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.14;
controls.minDistance = 6;
controls.maxDistance = 40;
controls.minPolarAngle = 0.15;
controls.maxPolarAngle = Math.PI - 0.15;
controls.update();

// GUI
const pane = new Pane({ title: 'Form your Ocean', container: document.getElementById('controls') });
pane.addBinding(params, 'particleCount', { label: 'Particle Count', min: 4000, max: 6000, step: 100 });
pane.addBinding(params, 'density', { label: 'Density', min: 0.5, max: 2, step: 0.05 });
pane.addBinding(params, 'shape', { label: 'Shape', options: {
  'Mobius Strip': 'mobius', 'Ring': 'ring', 'Wave': 'wave', '8-shaped': 'eight',
} });
pane.addBinding(params, 'deformation', { label: 'Deformation', min: 0, max: 2, step: 0.05 });
pane.addBinding(params, 'size', { label: 'Size', min: 0.7, max: 1.4, step: 0.05 });
pane.addBinding(params, 'flowSpeed', { label: 'Flow Speed', min: 0.2, max: 2, step: 0.05 });
pane.addBinding(params, 'disturbanceStrength', { label: 'Disturbance', min: 0, max: 2, step: 0.05 });

setupThree(scene);
let lastTime = performance.now();
let time = 0;
function animate(now) {
  const delta = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;
  time += delta;
  updateThree(delta, time);
  controls.update(delta);
  stars.position.copy(camera.position);
  renderer.render(scene, camera);
}
renderer.setAnimationLoop(animate);

window.addEventListener('resize', () => {
  const previousFit = fittedDistance();
  camera.aspect = innerWidth / innerHeight;
  camera.position.multiplyScalar(fittedDistance() / previousFit);
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
});
document.addEventListener('visibilitychange', () => { lastTime = performance.now(); });
