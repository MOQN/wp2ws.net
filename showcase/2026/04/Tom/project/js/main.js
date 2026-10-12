let params = {
  fps: 0,
  ring1Count: 36,
  ring2Count: 60,
  ring3Count: 84,
  radius1: 200,
  radius2: 400,
  radius3: 600,
  speed: 4,
  amplitude: 1.2,
  waveCycles: 3,
  rotSpeedY: 0.005,
  near: 1,
  far: 2600,
  Intensity: 1.5,
  Distance: 3000
};

const WORLD_SIZE = 2000;
const WORLD_HALF = WORLD_SIZE / 2;
const FLOOR_POSITION = -200;
const COLOR_BG = 00000000;

let ring1 = [];
let ring2 = [];
let ring3 = [];
let plane;
let light;

function setupThree() {
  renderer.shadowMap.enabled = true;

  let folderAnim = pane.addFolder({ title: "Kinetic Controls", expanded: true });
  folderAnim.addBinding(params, "speed", { label: "Speed 速度", min: 1, max: 4, step: 1 });
  folderAnim.addBinding(params, "amplitude", { label: "Amplitude 振幅", min: 0, max: Math.PI, step: 0.01 });
  folderAnim.addBinding(params, "waveCycles", { label: "Wave-cycle 圈数", min: 1, max: 3, step: 1 });

  let folderFog = pane.addFolder({ title: "Fog", expanded: true });
  folderFog.addBinding(params, "near", { min: 1, max: 5000, step: 1 });
  folderFog.addBinding(params, "far", { min: 1, max: 5000, step: 1 });

  let folderLight = pane.addFolder({ title: "Light", expanded: true });
  folderLight.addBinding(params, "Intensity", { label: "Intensity 光强", min: 0, max: 3, step: 0.01 });
  folderLight.addBinding(params, "Distance", { label: "Distance 距离", min: 1, max: 4000, step: 1 });

  plane = getPlane();
  plane.scale.x = WORLD_SIZE * 4;
  plane.scale.y = WORLD_SIZE * 4;
  plane.rotation.x = -Math.PI / 2;
  plane.position.y = FLOOR_POSITION;
  scene.add(plane);

  const ambiLight = new THREE.AmbientLight(0xffffff, 0.2);
  scene.add(ambiLight);

  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.2);
  scene.add(hemiLight);

  light = getPointLight();
  scene.add(light);
  light.intensity = params.Intensity;
  light.distance = params.Distance;
  light.position.set(0, 0, 0);

  for (let i = 0; i < params.ring1Count; i++) {
    ring1.push(new KineticBlade(i, params.ring1Count, params.radius1, 140, 12, 0, 1));
  }

  for (let i = 0; i < params.ring2Count; i++) {
    ring2.push(new KineticBlade(i, params.ring2Count, params.radius2, 220, 18, Math.PI / 3, -1));
  }

  for (let i = 0; i < params.ring3Count; i++) {
    ring3.push(new KineticBlade(i, params.ring3Count, params.radius3, 300, 24, Math.PI / 1.5, 1));
  }
}

function updateThree() {
  scene.fog = new THREE.Fog(COLOR_BG, params.near, params.far);

  light.intensity = params.Intensity;
  light.distance = params.Distance;

  for (let i = 0; i < ring1.length; i++) {
    ring1[i].update();
  }

  for (let i = 0; i < ring2.length; i++) {
    ring2[i].update();
  }

  for (let i = 0; i < ring3.length; i++) {
    ring3[i].update();
  }
}

function getGradientBox(index, total) {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const boxColor = new THREE.Color();
  let hue = index / total; 
  boxColor.setHSL(hue, 0.8, 0.5);

  const material = new THREE.MeshPhongMaterial({ color: boxColor });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function getPointLight() {
  const pointLight = new THREE.PointLight(0xffffff);
  pointLight.castShadow = true;
  pointLight.decay = 0;
  
  const sphereGeometry = new THREE.SphereGeometry(30, 32, 32);
  const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const lightMesh = new THREE.Mesh(sphereGeometry, sphereMaterial);
  pointLight.add(lightMesh);
  
  return pointLight;
}

function getPlane() {
  const geometry = new THREE.PlaneGeometry(1, 1, 10, 10);
  const material = new THREE.MeshPhongMaterial({
    color: 0xffffff,
    side: THREE.DoubleSide
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;
  return mesh;
}

class KineticBlade {
  constructor(index, total, radius, height, width, phaseShift, direction) {
    this.mesh = getGradientBox(index, total);
    scene.add(this.mesh);

    this.index = index;
    this.total = total;
    this.phaseShift = phaseShift;
    this.direction = direction;
    this.radius = radius;
    this.angle = (index / total) * Math.PI * 2;

    this.mesh.geometry.translate(0, 0.5, 0);
    this.mesh.scale.set(width, height, width * 0.4);

    this.baseY = -50;
    this.mesh.position.x = Math.cos(this.angle) * this.radius;
    this.mesh.position.z = Math.sin(this.angle) * this.radius;
    this.mesh.position.y = this.baseY;

    this.mesh.rotation.y = -this.angle;
    this.baseRotationX = 0;
  }

  update() {
    this.angle += params.rotSpeedY * this.direction;
    this.mesh.position.x = Math.cos(this.angle) * this.radius;
    this.mesh.position.z = Math.sin(this.angle) * this.radius;
    this.mesh.rotation.y = -this.angle;

    let seamlessOffset = (Math.PI * 2 * params.waveCycles) / this.total;
    let offset = this.index * seamlessOffset + this.phaseShift;
    
    let actualSpeed = map(params.speed, 1, 4, 0.003, 0.0125);
    let currentWaveTime = frame * actualSpeed;
    let wave = Math.sin(currentWaveTime + offset);

    this.mesh.rotation.x = this.baseRotationX + wave * params.amplitude * this.direction;
    this.mesh.position.y = this.baseY + Math.cos(currentWaveTime + offset) * 30;
  }
}