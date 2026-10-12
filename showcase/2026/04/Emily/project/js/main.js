let params = {
  fps: 0,
  scene_children: 0,

  // animation parameters
  outerFloatSpeed: 0.18,
  outerFloatAmp: 160,
  outerTiltSpeed: 0.3,
  sideRingsSpeed: 0.08,
  topRingsTiltSpeed: 0.04,

  // fog
  near: 1,
  far: 1500,
  fogColor: 0x000000,
  exp2: false,
  density: 0.001,

  // light
  lightColor: 0xFFFFFF,
  lightIntensity: 10,
  lightDistance: 1700,
  lightAngle: Math.PI / 16,
  lightPenumbra: 0.1,
  lightDecay: 0,
};

let outerRingsGroup, sideRingsLeftGroup, sideRingsRightGroup;
let topRingsLeftGroup, topRingsRightGroup, smallRingGroup;

let allObjects = [];

// Material definitions
let sphereMaterial, outerTopMaterial, outerBottomMaterial, smallRingMaterial;
let materialsList = [];

// Side rings opening/closing phase (incremental accumulation)
let sideRingsPhase = 0;

// light
let light;
//let spotLightHelper;
let targetAngleX = 0;
let targetAngleY = 0;
let speedX = 0.03;
let speedY = 0.03;

const FLOOR_POSITION = -150;

function setupThree() {
  scene.background = new THREE.Color("#000000");

  // 1. Initialize materials
  sphereMaterial = createCustomMaterial("#DFE6B0");      // Sphere, Side Rings, Top Rings
  outerTopMaterial = createCustomMaterial("#A091A3");    // Outer Ring upper 
  outerBottomMaterial = createCustomMaterial("#543A55"); // Outer Ring lower 
  smallRingMaterial = createCustomMaterial("#DFEB60");   // Small Rings

  materialsList = [sphereMaterial, outerTopMaterial, outerBottomMaterial, smallRingMaterial];

  // 2. Bind GUI controls
  pane.addBinding(params, "scene_children", { step: 1 });
  //pane.addBinding(params, "fogColor", { view: "color" });
  pane.addBinding(params, "exp2");

  let folderCommon = pane.addFolder({ title: "NORMAL", expanded: true });
  folderCommon.addBinding(params, "near", { min: 1, max: 5000, step: 1 }).on("change", function () {
    params.exp2 = false;
  });
  folderCommon.addBinding(params, "far", { min: 1, max: 5000, step: 1 }).on("change", function () {
    params.exp2 = false;
  });

  let folderExp2 = pane.addFolder({ title: "EXP2", expanded: true });
  folderExp2.addBinding(params, "density", { min: 0.0, max: 0.003, step: 0.0001 }).on("change", function () {
    params.exp2 = true;
  });

  const folderAnimation = pane.addFolder({ title: "ANIMATION", expanded: true });
  folderAnimation.addBinding(params, "outerFloatSpeed", { min: 0, max: 0.3, step: 0.005 });
  folderAnimation.addBinding(params, "outerFloatAmp", { min: 0, max: 300, step: 1 });
  folderAnimation.addBinding(params, "outerTiltSpeed", { min: 0, max: 0.5, step: 0.01 });
  folderAnimation.addBinding(params, "sideRingsSpeed", { min: 0, max: 0.3, step: 0.01 });
  folderAnimation.addBinding(params, "topRingsTiltSpeed", { min: 0, max: 0.1, step: 0.005 });

  // Bind SpotLight parameters to GUI
  let folderLight = pane.addFolder({ title: "SPOTLIGHT", expanded: true });
  folderLight.addBinding(params, "lightIntensity", { min: 0, max: 15, step: 0.1 });
  folderLight.addBinding(params, "lightDistance", { min: 1, max: 3000, step: 10 });
  folderLight.addBinding(params, "lightAngle", { min: 0, max: Math.PI / 10, step: 0.01 });
  folderLight.addBinding(params, "lightPenumbra", { min: 0, max: 1, step: 0.01 });

  // 3. 3D scene groups and entities
  outerRingsGroup = new THREE.Group();
  sideRingsLeftGroup = new THREE.Group();
  sideRingsRightGroup = new THREE.Group();
  topRingsLeftGroup = new THREE.Group();
  topRingsRightGroup = new THREE.Group();
  smallRingGroup = new THREE.Group();

  scene.add(
    outerRingsGroup,
    sideRingsLeftGroup,
    sideRingsRightGroup,
    topRingsLeftGroup,
    topRingsRightGroup,
    smallRingGroup
  );

  allObjects = [];

  initOuterRings();
  initSpheres(scene);
  initSideRings();
  initTopRings();
  initSmallRings();

  // 4. Initialize lighting
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
  dirLight.position.set(50, 100, 50);
  scene.add(dirLight);

  const ambLight = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambLight);

  // Spot Light
  light = getSpotLight();
  light.intensity = params.lightIntensity;
  light.distance = params.lightDistance;
  light.angle = params.lightAngle;
  light.penumbra = params.lightPenumbra;
  light.decay = params.lightDecay;
  light.position.set(0, 500, 0);
  scene.add(light);
  
  // Add spotlight target to scene
  scene.add(light.target);

  //let lightMesh = getSphere();
  //lightMesh.scale.set(2, 2, 2);
  //light.add(lightMesh);

  //spotLightHelper = new THREE.SpotLightHelper(light);
  //scene.add(spotLightHelper);
}

function updateThree() {

  // fog
  if (params.exp2) {
    scene.fog = new THREE.FogExp2(params.fogColor, params.density);
  } else {
    scene.fog = new THREE.Fog(params.fogColor, params.near, params.far);
  }

  // animated spot light
  light.position.set(0, 0, 800);
  let currentSpeedX = 0.02 + Math.sin(frame * 0.05) * 0.03; 
  let currentSpeedY = 0.01 + Math.cos(frame * 0.04) * 0.03;

  targetAngleX += currentSpeedX;
  targetAngleY += currentSpeedY;

  light.target.position.x = Math.sin(targetAngleX) * 400;
  light.target.position.y = Math.cos(targetAngleY) * 200;
  light.target.position.z = 0;

  light.intensity = params.lightIntensity;
  light.distance = params.lightDistance;
  light.angle = params.lightAngle;
  light.penumbra = params.lightPenumbra;
  light.decay = params.lightDecay;

  //spotLightHelper.update();

  if (sideRingsLeftGroup && sideRingsRightGroup) {
    sideRingsPhase += params.sideRingsSpeed * 0.32;
    const sideAngle = Math.sin(sideRingsPhase) * 0.12;
    sideRingsLeftGroup.rotation.z = sideAngle;
    sideRingsRightGroup.rotation.z = -sideAngle;
  }

  for (let e of allObjects) {
    e.updatePosition();
    e.updateRotation();
    e.updateCustom();
  }

  params.scene_children = scene.children.length;
}

function getSpotLight() {
  const spotLight = new THREE.SpotLight(0xffffff);
  return spotLight;
}

function createCustomMaterial(colorHex) {
  return new THREE.MeshPhongMaterial({
    color: colorHex,
    emissive: "#222222",
    specular: "#cf1c1c",
    shininess: 100,
    wireframe: false,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.6
  });
}

function getTorus(radius = 9, tube = 2, radialSegments = 16, tubularSegments = 64, material) {
  const geometry = new THREE.TorusGeometry(radius, tube, radialSegments, tubularSegments);
  return new THREE.Mesh(geometry, material);
}

function getSphere(radius = 20, material) {
  const geometry = new THREE.SphereGeometry(radius, 32, 32);
  return new THREE.Mesh(geometry, material);
}

// ==========================================
// BaseEntity Class Structure
// ==========================================
class BaseEntity {
  constructor(mesh, group) {
    this.mesh = mesh;
    if (group) group.add(this.mesh);

    this.pos = this.mesh.position;
    this.vel = new THREE.Vector3();
    this.acc = new THREE.Vector3();

    this.rot = this.mesh.rotation;
    this.rotVel = new THREE.Vector3();
    this.rotAcc = new THREE.Vector3();

    this.scale = this.mesh.scale;
    this.baseScale = new THREE.Vector3(1, 1, 1);

    this.basePos = new THREE.Vector3();
    this.baseRot = new THREE.Euler();
  }

  setPosition(x, y, z) {
    this.pos.set(x, y, z);
    this.basePos.set(x, y, z);
    return this;
  }

  setVelocity(x, y, z) {
    this.vel.set(x, y, z);
    return this;
  }

  setRotationAngle(x, y, z) {
    this.rot.set(x, y, z);
    this.baseRot.set(x, y, z);
    return this;
  }

  setRotationVelocity(x, y, z) {
    this.rotVel.set(x, y, z);
    return this;
  }

  setScale(w, h = w, d = w) {
    const minScale = 0.01;
    w = Math.max(w, minScale);
    h = Math.max(h, minScale);
    d = Math.max(d, minScale);
    this.baseScale.set(w, h, d);
    this.scale.set(w, h, d);
    return this;
  }

  updatePosition() {
    this.vel.add(this.acc);
    this.pos.add(this.vel);
    this.acc.set(0, 0, 0);
  }

  updateRotation() {
    this.rotVel.add(this.rotAcc);
    this.rot.x += this.rotVel.x;
    this.rot.y += this.rotVel.y;
    this.rot.z += this.rotVel.z;
    this.rotAcc.set(0, 0, 0);
  }

  updateCustom() {
  }
}

// ==========================================
// Subclasses
// ==========================================
class OuterRing extends BaseEntity {
  constructor(targetGroup, layerSign) {
    const mat = layerSign === 1 ? outerTopMaterial : outerBottomMaterial;
    super(getTorus(9, 2, 16, 64, mat), targetGroup);
    this.rad = 0;
    this.layerSign = layerSign;
    this.floatPhase = 0;
    this.tiltPhase = 0;
  }

  updateCustom() {
    this.floatPhase += params.outerFloatSpeed * 0.16;
    const floatY = Math.sin(this.floatPhase) * params.outerFloatAmp * 0.5 * this.layerSign;
    this.pos.y = this.basePos.y + floatY;

    this.tiltPhase += params.outerTiltSpeed * 0.16;
    const angleOffset = Math.sin(this.tiltPhase + this.rad * 3) * 0.35;
    this.rot.x = this.baseRot.x + angleOffset * this.layerSign;
    this.rot.z = this.baseRot.z + angleOffset * 0.5;
  }
}

class SphereItem extends BaseEntity {
  constructor(targetGroup) {
    super(getSphere(20, sphereMaterial), targetGroup);
  }
}

class SideRing extends BaseEntity {
  constructor(targetGroup) {
    super(getTorus(9, 2, 16, 64, sphereMaterial), targetGroup);
  }
}

class TopRing extends BaseEntity {
  constructor(targetGroup) {
    super(getTorus(9, 2, 16, 64, sphereMaterial), targetGroup);
    this.index = 0;
    this.sideSign = 1;
    this.anglePhase = 0;
  }

  updateCustom() {
    this.anglePhase += params.topRingsTiltSpeed * 0.32;
    const phaseOffset = this.index * 0.5;
    this.rot.x = this.baseRot.x + this.anglePhase + phaseOffset;
  }
}

class SmallRing extends BaseEntity {
  constructor(targetGroup, radius = 6, tube = 3) {
    super(getTorus(radius, tube, 16, 48, smallRingMaterial), targetGroup);

    this.rotSpeedX = THREE.MathUtils.randFloat(-0.06, 0.06);
    this.rotSpeedY = THREE.MathUtils.randFloat(-0.06, 0.06);
    this.rotSpeedZ = THREE.MathUtils.randFloat(-0.06, 0.06);
  }

  updateCustom() {
    this.rot.x += this.rotSpeedX;
    this.rot.y += this.rotSpeedY;
    this.rot.z += this.rotSpeedZ;
  }
}

// ==========================================
// Initializers
// ==========================================
function initOuterRings() {
  const countPerSide = 26;
  const radiusX = 340, radiusZ = 220;
  const centerMargin = 0.08;

  const angleStart = THREE.MathUtils.degToRad(35);
  const angle90 = THREE.MathUtils.degToRad(90);
  const angle45 = THREE.MathUtils.degToRad(45);

  [1, -1].forEach(layerSign => {
    [1, -1].forEach(sideSign => {
      for (let i = 0; i < countPerSide; i++) {
        const t = i / (countPerSide - 1);
        const rad = THREE.MathUtils.lerp(centerMargin, Math.PI - centerMargin, t);

        const sizeWave = Math.sin(rad * 2 - Math.PI / 2) * 0.5 + 0.5;
        const ringScale = THREE.MathUtils.lerp(3.0, 8.0, sizeWave);

        let currentTiltAngle;
        let tiltNormalized = 0;

        if (t < 0.15) {
          const p = Math.sin((t / 0.15) * (Math.PI / 2));
          currentTiltAngle = THREE.MathUtils.lerp(angleStart, angle90, p);
          tiltNormalized = p;
        } else if (t <= 0.75) {
          currentTiltAngle = angle90;
          tiltNormalized = 1.0;
        } else {
          const p = (t - 0.75) / 0.25;
          currentTiltAngle = THREE.MathUtils.lerp(angle90, angle45, p);
          tiltNormalized = 1.0 - p * 0.5;
        }

        // Position and elevation calculations
        const dynamicYOffset = THREE.MathUtils.lerp(12, 38, sizeWave);
        const peakLift = tiltNormalized * 40;
        const initialY = (dynamicYOffset + peakLift + Math.sin(rad * 2) * 6) * layerSign - 50;

        const xPos = Math.sin(rad) * radiusX * sideSign;
        const zPos = -Math.cos(rad) * radiusZ;

        // Orientation angles
        const baseRotX = (Math.PI / 2) * layerSign;
        const baseRotY = (rad - currentTiltAngle) * sideSign;
        const baseRotZ = (-currentTiltAngle * 0.25) * sideSign * layerSign;

        let r = new OuterRing(outerRingsGroup, layerSign)
          .setPosition(xPos, initialY, zPos)
          .setRotationAngle(baseRotX, baseRotY, baseRotZ)
          .setScale(ringScale * 0.8, ringScale * 1.2, 1.5);

        r.rad = rad;
        allObjects.push(r);
      }
    });
  });
}

function initSpheres(parentScene) {
  const sphereCount = 7;
  const sphereSpacingY = 25;
  const startCenterY = -140;
  const sphereStartY = startCenterY + ((sphereCount - 1) * sphereSpacingY) / 2;

  for (let i = 0; i < sphereCount; i++) {
    const yPos = sphereStartY - i * sphereSpacingY;
    const halfSphereCount = (sphereCount - 1) / 2;
    const tCenter = 1 - Math.abs(i - halfSphereCount) / halfSphereCount;

    const scaleX = THREE.MathUtils.lerp(0.7, 2.3, tCenter);
    const scaleY = THREE.MathUtils.lerp(1, 1.3, tCenter);

    let s = new SphereItem(parentScene)
      .setPosition(0, yPos, 0)
      .setScale(scaleX, scaleY, 1.5);

    allObjects.push(s);
  }
}

function initSideRings() {
  const sideRingCount = 12;
  const sideRingSpacingY = 28;
  const baseOffsetX = 45;
  const inwardOffset = 22;
  const maxTiltAngle = Math.PI / 3;

  const minRotX = THREE.MathUtils.degToRad(65);
  const maxRotX = THREE.MathUtils.degToRad(35);
  const startCenterY = -150;
  const sideStartY = startCenterY + ((sideRingCount - 1) * sideRingSpacingY) / 2 - 16;

  for (let i = 0; i < sideRingCount; i++) {
    const yPos = sideStartY - i * sideRingSpacingY - 30;
    const progress = i / (sideRingCount - 1);

    const tSize = Math.sin(Math.pow(progress, 0.55) * Math.PI);
    const ringScale = THREE.MathUtils.lerp(3, 8, tSize);

    const halfSideCount = (sideRingCount - 1) / 2;
    const borderCurve = Math.abs(i - halfSideCount) / halfSideCount;
    const currentOffsetX = baseOffsetX - (borderCurve * inwardOffset);

    const currentRotX = THREE.MathUtils.lerp(minRotX, maxRotX, progress);
    const tProgress = Math.pow(progress, 2);
    const angle = tProgress * maxTiltAngle;

    let left = new SideRing(sideRingsLeftGroup)
      .setPosition(-currentOffsetX, yPos, 0)
      .setRotationAngle(currentRotX, angle, 0)
      .setScale(ringScale, ringScale, 2.4);

    let right = new SideRing(sideRingsRightGroup)
      .setPosition(currentOffsetX, yPos, 0)
      .setRotationAngle(currentRotX, -angle, 0)
      .setScale(ringScale, ringScale, 2.4);

    allObjects.push(left, right);
  }
}

function initTopRings() {
  const topRingCount = 6;
  const topRingSpacingY = 35;
  const topGroupCenterY = 90;
  const topStartY = topGroupCenterY + ((topRingCount - 1) * topRingSpacingY) / 2;

  const startAngle = THREE.MathUtils.degToRad(35);
  const endAngle = THREE.MathUtils.degToRad(120);

  for (let i = 0; i < topRingCount; i++) {
    const yPos = topStartY - i * topRingSpacingY;
    const progress = i / (topRingCount - 1);

    const currentTopOffsetX = THREE.MathUtils.lerp(60, 40, progress);
    const topScale = THREE.MathUtils.lerp(5.8, 4, progress);
    const tiltAngle = THREE.MathUtils.lerp(startAngle, endAngle, progress);

    let left = new TopRing(topRingsLeftGroup)
      .setPosition(-currentTopOffsetX, yPos, 0)
      .setRotationAngle(Math.PI / 1.4, -tiltAngle, -Math.PI / 2)
      .setScale(topScale * 0.9, topScale * 1.3, 3);
    left.index = i;
    left.sideSign = -1;

    let right = new TopRing(topRingsRightGroup)
      .setPosition(currentTopOffsetX, yPos, 0)
      .setRotationAngle(Math.PI / 1.4, tiltAngle, Math.PI / 2)
      .setScale(topScale * 0.9, topScale * 1.3, 3);
    right.index = i;
    right.sideSign = 1;

    allObjects.push(left, right);
  }
}

function initSmallRings() {
  const smallCount = 12;
  const smallStartX = 25;
  const smallStepX = 22;
  const smallStepY = 26;
  const topGroupCenterY = 90;
  const smallCenterY = topGroupCenterY + 120;
  const smallZ = -70;

  for (let i = 0; i < smallCount; i++) {
    const xPos = smallStartX + i * smallStepX;
    const yPos = smallCenterY - i * smallStepY;

    const scaleL = THREE.MathUtils.randFloat(0.8, 3.8);
    const scaleR = THREE.MathUtils.randFloat(0.8, 3.8);

    let left = new SmallRing(smallRingGroup)
      .setPosition(-xPos, yPos, smallZ)
      .setScale(scaleL, scaleL, scaleL);

    let right = new SmallRing(smallRingGroup)
      .setPosition(xPos, yPos, smallZ)
      .setScale(scaleR, scaleR, scaleR);

    allObjects.push(left, right);
  }

  let center = new SmallRing(smallRingGroup, 6, 4)
    .setPosition(0, smallCenterY + 15, smallZ)
    .setScale(2.5, 3.5, 2.5);

  allObjects.push(center);
}