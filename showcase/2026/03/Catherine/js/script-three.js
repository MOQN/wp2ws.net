console.log('three.js Version: ' + THREE.REVISION);

let scene, camera, renderer, container, controls;
let time = 0;
let pane;

const params = {
  animation: true,
  objectSpin: 0.15,
  rotationSpeed: 1,
  ringCount: 4,
  exposure: 1.55,
  background: '#000000',
};

function initThree() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(8.5, 17, 29);
  camera.lookAt(0, 0.2, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.55;

  container = document.getElementById('container-three');
  container.appendChild(renderer.domElement);
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.minDistance = 12;
  controls.maxDistance = 30;
  controls.target.set(0, 0.15, 0);

  scene.add(new THREE.HemisphereLight(0x9aa6c4, 0x1b1715, 2.25));
  const key = new THREE.DirectionalLight(0xd8e4ff, 2.1);
  key.position.set(-5, 7, 9);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffe8d5, 1.2);
  rim.position.set(8, -2, 5);
  scene.add(rim);

  pane = new Pane({ title: 'ORBITAL RELIC' });
  const folderAnimation = pane.addFolder({ title: 'ANIMATION', expanded: true });
  folderAnimation.addBinding(params, 'animation', { label: 'play' });
  folderAnimation.addBinding(params, 'objectSpin', { label: 'object spin', min: 0, max: 2, step: 0.01 });
  folderAnimation.addBinding(params, 'rotationSpeed', { label: 'rotation', min: 0, max: 15, step: 0.01 });
  const folderSculpture = pane.addFolder({ title: 'SCULPTURE', expanded: true });
  folderSculpture.addBinding(params, 'ringCount', { label: 'rings', min: 1, max: 40, step: 1 });
  const folderScene = pane.addFolder({ title: 'SCENE', expanded: true });
  folderScene.addBinding(params, 'exposure', { min: 0.5, max: 3, step: 0.01 });
  folderScene.addBinding(params, 'background', { picker: 'inline', label: 'background' });
  setupThree();
  renderer.setAnimationLoop(animate);
}

function animate() {
  time = performance.now();
  controls.update();
  renderer.toneMappingExposure = params.exposure;
  updateThree();
  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  if (!camera || !renderer) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

window.addEventListener('DOMContentLoaded', initThree, { once: true });
