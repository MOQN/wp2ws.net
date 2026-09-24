let sculpture;
let mainOrbitAssembly;
let darkMetal, silver, dimSilver, warm;
let mainOrbitRings = [];
let accentRings = [];
let displayedRingCount = 0;

const MAIN_RING_LIMIT = 4;
const WIRE_DISK_INTERVAL = 6;
const TORUS_THICKNESS_SCALE = 0.55;

function setupThree() {
  scene.background = new THREE.Color(params.background);
  mainOrbitRings = [];
  accentRings = [];

  const metal = (color, roughness) => new THREE.MeshStandardMaterial({
    color,
    metalness: 0.92,
    roughness,
  });

  darkMetal = metal(0x45464a, 0.31);
  silver = metal(0xa3a09a, 0.22);
  dimSilver = metal(0x747271, 0.28);
  warm = metal(0x8c857a, 0.34);

  sculpture = new THREE.Group();
  sculpture.position.y = -0.35;
  sculpture.rotation.set(0.06, 0, -0.27);
  scene.add(sculpture);

  addCylinder(sculpture, 0.16, 0.16, 22.73, 0, -2.61, 0, darkMetal);
  addMainOrbitAssembly();
  addUpperAssembly();
  addLowerAssembly();

  [-4.7, -2.7, 2.05, 4.65].forEach((y, index) => {
    trackAccentRing(addTorus(sculpture, 0.42 + (index % 2) * 0.06, 0.05, 0, y, 0, dimSilver));
  });

  addPointLight(6, 11, 9, 180, 0xdce3ff);
  addPointLight(-9, -2, 5, 95, 0xffeed9);
}

function addMainOrbitAssembly() {
  const group = new THREE.Group();
  group.scale.set(1.25, 1, 1.25);
  sculpture.add(group);
  mainOrbitAssembly = group;
  rebuildMainOrbitRings();

  addScaledRing(group, 4.18, 0.075, -0.27, silver, 0.7);
  addScaledRing(group, 3.68, 0.065, -0.46, darkMetal, 0.72);

  addSphere(group, 0.77, 0, -0.05, 0, darkMetal, 1.2, 0.85, 1.15);
  addCylinder(group, 0.74, 0.48, 0.4, 0, 0.55, 0, warm);
  addCone(group, 0.48, 0.17, 1.2, 0, 1.27, 0, dimSilver);
  addCone(group, 0.25, 0.07, 0.72, 0, 2.08, 0, silver);
  addSphere(group, 0.17, 0, 2.48, 0, silver);

  trackAccentRing(addScaledRing(group, 1.18, 0.065, 2.1, silver, 0.68));
  trackAccentRing(addScaledRing(group, 0.84, 0.06, 2.64, dimSilver, 0.67));
}

function rebuildMainOrbitRings() {
  mainOrbitRings.forEach(({ mesh }) => {
    mainOrbitAssembly.remove(mesh);
    mesh.geometry.dispose();
  });
  mainOrbitRings = [];

  const count = Math.round(params.ringCount);
  const outerRadius = 3.9;
  const innerRadius = 1.65;
  const extraRingCount = Math.max(0, count - MAIN_RING_LIMIT);
  const levelCount = Math.ceil(extraRingCount / 2);
  const levelStep = levelCount > 1 ? 5.3 / (levelCount - 1) : 0;
  const maxDistance = 2.7 + Math.max(0, levelCount - 1) * levelStep;

  for (let index = 0; index < count; index++) {
    const isCentral = index < MAIN_RING_LIMIT;
    const ringIndex = isCentral ? index : index - MAIN_RING_LIMIT;
    const y = getMainRingY(isCentral, ringIndex, levelStep);
    const radius = outerRadius + (innerRadius - outerRadius) * Math.abs(y) / maxDistance;
    const material = index % 2 === 0 ? silver : dimSilver;
    const isWireDisk = index % WIRE_DISK_INTERVAL === 2 || index % WIRE_DISK_INTERVAL === 5;
    const mesh = isWireDisk
      ? addWireDisk(mainOrbitAssembly, radius, 0, y, 0, material)
      : addTorus(mainOrbitAssembly, radius, index === 0 ? 0.08 : 0.065, 0, y, 0, material);

    mesh.scale.z = isCentral ? (index % 3 === 1 ? 0.78 : 0.69) : 0.74;
    mainOrbitRings.push(createRingMotion(mesh));
  }

  displayedRingCount = count;
}

function getMainRingY(isCentral, ringIndex, levelStep) {
  if (isCentral) {
    const progress = MAIN_RING_LIMIT === 1 ? 0.5 : ringIndex / (MAIN_RING_LIMIT - 1);
    return -0.02 + (progress - 0.5) * 0.4;
  }

  const level = Math.ceil((ringIndex + 1) / 2);
  const direction = ringIndex % 2 === 0 ? 1 : -1;
  return direction * (2.7 + (level - 1) * levelStep);
}

function addUpperAssembly() {
  const group = new THREE.Group();
  group.position.y = 5.05;
  sculpture.add(group);

  addSphere(group, 0.56, 0, -0.35, 0, warm, 1, 0.72, 1);
  addCylinder(group, 0.48, 0.64, 0.56, 0, 0.05, 0, dimSilver);
  trackAccentRing(addTorus(group, 0.64, 0.05, 0, 0.23, 0, silver));

  const dish = new THREE.Group();
  dish.position.y = 1.32;
  group.add(dish);
  makeWireframe(addCylinder(dish, 1.68, 1.52, 0.16, 0, 0, 0, warm));
  addConcentricRings(dish, [
    [1.7, 0.065, 0.11, silver, 0.77],
    [1.42, 0.055, 0.2, dimSilver, 0.76],
    [1.07, 0.05, 0.27, warm, 0.75],
  ]);
  addCylinder(dish, 0.63, 0.5, 0.13, 0, 0.29, 0, dimSilver);
  addCylinder(dish, 0.3, 0.3, 0.15, 0, 0.39, 0, new THREE.MeshBasicMaterial({ color: 0x08090b }));
  addCone(dish, 0.48, 0.15, 0.82, 0, 0.73, 0, warm);
  addCylinder(dish, 0.42, 0.31, 0.25, 0, 1.16, 0, silver);
  addSphere(sculpture, 0.22, 0, 8.975, 0, silver);
}

function addLowerAssembly() {
  const group = new THREE.Group();
  group.position.y = -9.5;
  group.scale.set(1.16, 1.16, 1.16);
  sculpture.add(group);

  trackAccentRing(addScaledRing(group, 0.95, 0.06, 0.68, dimSilver, 0.66));
  trackAccentRing(addScaledRing(group, 1.22, 0.065, 0.29, silver, 0.65));
  addCone(group, 0.32, 0.11, 1.05, 0, -0.43, 0, darkMetal);
  addSphere(group, 0.2, 0, -1.04, 0, silver);

  const dish = new THREE.Group();
  dish.position.y = -2.14;
  group.add(dish);
  makeWireframe(addCylinder(dish, 1.32, 1.18, 0.14, 0, 0, 0, warm));
  addConcentricRings(dish, [
    [1.43, 0.065, 0.1, silver, 0.76],
    [1.15, 0.05, 0.2, dimSilver, 0.74],
    [0.8, 0.05, 0.25, warm, 0.72],
  ]);
  addCylinder(dish, 0.31, 0.31, 0.15, 0, 0.28, 0, new THREE.MeshBasicMaterial({ color: 0x070708 }));
  addCone(dish, 0.3, 0.12, 0.55, 0, 0.63, 0, silver);
  addSphere(dish, 0.22, 0, 0.98, 0, silver);
  addCylinder(group, 0.11, 0.11, 0.82, 0, -3.28, 0, darkMetal);
  trackAccentRing(addTorus(group, 0.36, 0.045, 0, -3.63, 0, silver));
  addSphere(group, 0.1, 0, -3.96, 0, silver);
}

function addConcentricRings(parent, definitions) {
  definitions.forEach(([radius, tube, y, material, zScale]) => {
    const ring = addScaledRing(parent, radius, tube, y, material, zScale);
    trackAccentRing(ring);
  });
}

function addScaledRing(parent, radius, tube, y, material, zScale) {
  const ring = addTorus(parent, radius, tube, 0, y, 0, material);
  ring.scale.z = zScale;
  return ring;
}

function addTorus(parent, radius, tube, x, y, z, material) {
  const mesh = new THREE.Mesh(
    new THREE.TorusGeometry(radius, tube * TORUS_THICKNESS_SCALE, 12, 72),
    material.clone()
  );
  mesh.userData.keepSolid = true;
  mesh.position.set(x, y, z);
  mesh.rotation.x = Math.PI / 2;
  parent.add(mesh);
  return mesh;
}

function addWireDisk(parent, radius, x, y, z, material) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, 0.025, 72),
    material.clone()
  );
  mesh.material.wireframe = true;
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

function trackAccentRing(mesh) {
  accentRings.push(createRingMotion(mesh));
}

function createRingMotion(mesh) {
  return {
    mesh,
    baseRotation: mesh.rotation.clone(),
    phase: Math.random() * Math.PI * 2,
    speed: 0.12 + Math.random() * 0.12,
    tilt: THREE.MathUtils.degToRad(4 + Math.random() * 9),
  };
}

function addCylinder(parent, top, bottom, height, x, y, z, material) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(top, bottom, height, 48), material);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

function addCone(parent, top, bottom, height, x, y, z, material) {
  return addCylinder(parent, top, bottom, height, x, y, z, material);
}

function addSphere(parent, radius, x, y, z, material, sx = 1, sy = 1, sz = 1) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 40, 24), material);
  mesh.position.set(x, y, z);
  mesh.scale.set(sx, sy, sz);
  parent.add(mesh);
  return mesh;
}

function makeWireframe(mesh) {
  mesh.material = mesh.material.clone();
  mesh.material.wireframe = true;
  return mesh;
}

function addPointLight(x, y, z, intensity, color) {
  const light = new THREE.PointLight(color, intensity, 30, 2);
  light.position.set(x, y, z);
  scene.add(light);
}

function updateThree() {
  const seconds = time * 0.001;
  if (displayedRingCount !== Math.round(params.ringCount)) rebuildMainOrbitRings();

  scene.background.set(params.background);

  sculpture.traverse((object) => {
    if (!object.isMesh) return;
    object.material.wireframe = !object.userData.keepSolid;
  });

  if (!params.animation) return;

  sculpture.rotation.y = seconds * params.objectSpin;
  updateRingMotion([...mainOrbitRings, ...accentRings], seconds);
}

function updateRingMotion(rings, seconds) {
  rings.forEach(({ mesh, baseRotation, phase, speed, tilt }) => {
    const motion = seconds * speed * params.rotationSpeed + phase;
    mesh.rotation.x = baseRotation.x + Math.sin(motion) * tilt;
    mesh.rotation.y = baseRotation.y;
    mesh.rotation.z = baseRotation.z + Math.cos(motion) * tilt;
  });
}