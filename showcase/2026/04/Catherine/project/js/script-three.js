console.log('three.js Version: ' + THREE.REVISION);

let scene, camera, renderer, container, controls;
let time = 0;
let gui;

let ambientLight, hemisphereLight, keyLight, spotLight, pointLight, subjectLight, muralLight, shadowBackdrop;

const params = {
  animation: true,
  objectSpin: 0.15,
  rotationSpeed: 1,
  ringCount: 4,
  exposure: 1.55,
  background: '#000000',
  fogMode: 'Exponential',
  fogDensity: 0,
  fogNear: 80,
  fogFar: 160,
  ambientIntensity: 0,
  hemisphereIntensity: 0,
  keyIntensity: 0,
  keyColor: '#ff8780',
  spotIntensity: 97,
  spotColor: '#220c00',
  pointIntensity: 0,
  pointColor: '#ff6800',
  shadowsEnabled: true,
  shadowBias: -0.003,
  ambientColor: '#40506c',
  hemisphereSkyColor: '#ff6000',
  hemisphereGroundColor: '#211712',
  subjectLightIntensity: 0,
  subjectLightColor: '#ff6800',
  muralLightIntensity: 241,
  muralLightColor: '#ff6b2b',
};

function initThree() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 10, 46);
  camera.lookAt(0, -0.5, 0);
  camera.layers.enable(1);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.55;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  container = document.getElementById('container-three');
  container.appendChild(renderer.domElement);
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enabled = true;
  controls.enableRotate = true;
  controls.enablePan = false;
  controls.enableZoom = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.target.set(0, 0.2, 0);
  controls.minAzimuthAngle = -0.55;
  controls.maxAzimuthAngle = 0.55;
  controls.minPolarAngle = 0.9;
  controls.maxPolarAngle = 1.85;

  setupLightingAndBackdrop();
  setupDatGui();
  setupThree();
  renderer.setAnimationLoop(animate);
}

function setupDatGui() {
  gui = new dat.GUI({ width: 270 });
  const animationFolder = gui.addFolder('ANIMATION');
  animationFolder.add(params, 'animation').name('Play');
  animationFolder.add(params, 'objectSpin', 0, 2, 0.01).name('Object spin');
  animationFolder.add(params, 'rotationSpeed', 0, 15, 0.01).name('Ring motion');
  const sculptureFolder = gui.addFolder('SCULPTURE');
  sculptureFolder.add(params, 'ringCount', 1, 40, 1).name('Ring count');
  const spotFolder = gui.addFolder('SPOT LIGHT');
  spotFolder.add(params, 'spotIntensity', 0, 220, 1).name('Intensity');
  spotFolder.addColor(params, 'spotColor').name('Color');
  const muralLightFolder = gui.addFolder('MURAL LIGHT');
  muralLightFolder.add(params, 'muralLightIntensity', 0, 500, 1).name('Intensity');
  muralLightFolder.addColor(params, 'muralLightColor').name('Color');
}

function setupLightingAndBackdrop() {
  ambientLight = new THREE.AmbientLight(params.ambientColor, params.ambientIntensity);
  scene.add(ambientLight);

  hemisphereLight = new THREE.HemisphereLight(params.hemisphereSkyColor, params.hemisphereGroundColor, params.hemisphereIntensity);
  scene.add(hemisphereLight);

  keyLight = new THREE.DirectionalLight(params.keyColor, params.keyIntensity);
  keyLight.position.set(-18, 22, 18);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(2048, 2048);
  keyLight.shadow.camera.left = -30;
  keyLight.shadow.camera.right = 30;
  keyLight.shadow.camera.top = 30;
  keyLight.shadow.camera.bottom = -30;
  keyLight.shadow.camera.near = 1;
  keyLight.shadow.camera.far = 70;
  keyLight.layers.enable(1);
  scene.add(keyLight, keyLight.target);
  keyLight.target.position.set(0, 0, 0);

  spotLight = new THREE.SpotLight(params.spotColor, params.spotIntensity, 65, Math.PI / 5, 0.42, 1.3);
  spotLight.position.set(15, 10, 17);
  spotLight.target.position.set(0, -1, 0);
  scene.add(spotLight, spotLight.target);

  pointLight = new THREE.PointLight(params.pointColor, params.pointIntensity, 48, 2);
  pointLight.position.set(-4, 9, 9);
  scene.add(pointLight);

  subjectLight = new THREE.SpotLight(params.subjectLightColor, params.subjectLightIntensity, 45, Math.PI / 7, 0.3, 1.1);
  subjectLight.position.set(0, 8, 16);
  subjectLight.target.position.set(0, -0.5, 0);
  scene.add(subjectLight, subjectLight.target);

  muralLight = new THREE.SpotLight(params.muralLightColor, params.muralLightIntensity, 90, Math.PI / 3, 0.45, 1.1);
  muralLight.position.set(0, 14, 18);
  muralLight.target.position.set(0, 0, -14);
  muralLight.layers.set(1);
  scene.add(muralLight, muralLight.target);

  shadowBackdrop = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 90),
    new THREE.MeshStandardMaterial({ color: 0x34303b, roughness: 0.96, metalness: 0 })
  );
  shadowBackdrop.position.set(0, 0, -14);
  shadowBackdrop.layers.set(1);
  shadowBackdrop.receiveShadow = true;
  scene.add(shadowBackdrop);
  loadMuralTexture();
}

function loadMuralTexture() {
  const textureLoader = new THREE.TextureLoader();
  textureLoader.load(
    'assets/mural-bg.jpg',
    (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
      shadowBackdrop.material.map = texture;
      shadowBackdrop.material.needsUpdate = true;
    },
    undefined,
    (error) => console.error('Unable to load mural background:', error)
  );
}

function syncLightingAndFog() {
  scene.background.set(params.background);
  ambientLight.intensity = params.ambientIntensity;
  ambientLight.color.set(params.ambientColor);
  hemisphereLight.intensity = params.hemisphereIntensity;
  hemisphereLight.color.set(params.hemisphereSkyColor);
  hemisphereLight.groundColor.set(params.hemisphereGroundColor);
  keyLight.intensity = params.keyIntensity;
  keyLight.color.set(params.keyColor);
  keyLight.castShadow = params.shadowsEnabled;
  keyLight.shadow.bias = params.shadowBias;
  spotLight.intensity = params.spotIntensity;
  spotLight.color.set(params.spotColor);
  pointLight.intensity = params.pointIntensity;
  pointLight.color.set(params.pointColor);
  subjectLight.intensity = params.subjectLightIntensity;
  subjectLight.color.set(params.subjectLightColor);
  muralLight.intensity = params.muralLightIntensity;
  muralLight.color.set(params.muralLightColor);
  shadowBackdrop.material.color.set(0x34303b);

  if (params.fogMode === 'Off') {
    scene.fog = null;
  } else if (params.fogMode === 'Linear') {
    if (!scene.fog || !scene.fog.isFog) scene.fog = new THREE.Fog(params.background, params.fogNear, params.fogFar);
    scene.fog.color.set(params.background);
    scene.fog.near = params.fogNear;
    scene.fog.far = params.fogFar;
  } else {
    if (!scene.fog || !scene.fog.isFogExp2) scene.fog = new THREE.FogExp2(params.background, params.fogDensity);
    scene.fog.color.set(params.background);
    scene.fog.density = params.fogDensity;
  }
}

function animate() {
  time = performance.now();
  controls.update();
  renderer.toneMappingExposure = params.exposure;
  syncLightingAndFog();
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
