let params = {
  fps: 0,
  houseNumber: 10,
  houseCluster: 1,
  distance: 200,
  spiralRadius: 450,
  spiralAngleStep: 100,
  treeAngle: 45,
  treeLength: 100,
  treeDecay: 0.8,
  treeWeight: 0.5,
  spiralRibbon: true,
  treeLines: true,
  flowCloud: true,
  particleNumber: 1500,
  wireframe: false
};

const MAX_HOUSE_NUMBER = 20;
const MAX_CLUSTER_NUMBER = 6;
const MAX_PARTICLE_NUMBER = 2500;

let hdrTexture;

let houseStack;
let cloudSystem;

let previousHouseNumber = params.houseNumber;
let previousHouseCluster = params.houseCluster;

function setupThree() {
  scene.background = new THREE.Color(0xffffff);
  scene.fog = new THREE.Fog(0xffc8e4, 500, 6000);

  pane.addBinding(params, "houseNumber", {
    min: 1,
    max: MAX_HOUSE_NUMBER,
    step: 1,
    label: "House Number / Cluster",
  });

  pane.addBinding(params, "houseCluster", {
    min: 1,
    max: MAX_CLUSTER_NUMBER,
    step: 1,
    label: "House Cluster",
  });

  pane.addBinding(params, "distance", {
    min: 100,
    max: 1000,
    step: 10,
    label: "Distance",
  });

  pane.addBinding(params, "spiralRadius", {
    min: 0,
    max: 1500,
    step: 10,
    label: "Spiral Radius",
  });

  pane.addBinding(params, "spiralAngleStep", {
    min: 0,
    max: 360,
    step: 1,
    label: "Spiral Angle",
  });

  pane.addBinding(params, "treeAngle", {
    min: 0,
    max: 180,
    step: 1,
    label: "Tree Angle",
  });

  pane.addBinding(params, "treeLength", {
    min: 0,
    max: 800,
    step: 10,
    label: "Tree Length",
  });

  pane.addBinding(params, "treeDecay", {
    min: 0,
    max: 1,
    step: 0.05,
    label: "Tree Decay",
  });

  pane.addBinding(params, "treeWeight", {
    min: 0,
    max: 1.5,
    step: 0.05,
    label: "Tree Weight",
  });

  pane.addBinding(params, "spiralRibbon", {
    label: "Spiral Lines",
  });

  pane.addBinding(params, "treeLines", {
    label: "Tree Lines",
  });

  const cloudFolder = pane.addFolder({
    title: "Flowing Clouds",
    expanded: true,
  });

  cloudFolder.addBinding(params, "flowCloud", {
    label: "Show Clouds",
  });

  cloudFolder.addBinding(params, "particleNumber", {
    min: 0,
    max: MAX_PARTICLE_NUMBER,
    step: 100,
    label: "Particles / Group",
  });
  
  cloudFolder.addBinding(params, "wireframe", {
    label: "Wireframe"
  });

  houseStack = new HouseStack();
  cloudSystem = new CloudSystem(houseStack);
}

function updateThree() {
  if (params.houseNumber !== previousHouseNumber || params.houseCluster !== previousHouseCluster) {
    houseStack.createHouses();
    previousHouseNumber = params.houseNumber;
    previousHouseCluster = params.houseCluster;
  }
  houseStack.update();
  cloudSystem.update();
}

// function loadHDR(filepath) {
//   hdrTexture = new HDRLoader().load(filepath, function() {
//     hdrTexture.mapping = THREE.EquirectangularReflectionMapping;
//   });
// }

function getBox(material) {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const mesh = new THREE.Mesh(geometry, material);
  return mesh;
}

function getSphere(material) {
  const geometry = new THREE.SphereGeometry(1, 32, 16);
  const mesh = new THREE.Mesh(geometry, material);
  return mesh;
}

function getPyramid(material) {
  const geometry = new THREE.ConeGeometry(1, 1, 4);
  const mesh = new THREE.Mesh(geometry, material);
  return mesh;
}

function getCylinder(material) {
  const geometry = new THREE.CylinderGeometry(1, 1, 1, 32);
  const mesh = new THREE.Mesh(geometry, material);
  return mesh;
}

function getArch(material) {
  const shape = new THREE.Shape();
  shape.moveTo(-0.5, -0.5);
  shape.lineTo(0.5, -0.5);
  shape.lineTo(0.5, 0.25);
  shape.lineTo(0, 0.75);
  shape.lineTo(-0.5, 0.25);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 1,
  });
  geometry.translate(0, 0.1, -0.5);
  const mesh = new THREE.Mesh(geometry, material);
  return mesh;
}

function getFrustum(material) {
  const geometry = new THREE.CylinderGeometry(0.4, 1, 0.6, 4);
  const mesh = new THREE.Mesh(geometry, material);
  return mesh;
}

function getTriangularPrism(material) {
  const shape = new THREE.Shape();
  shape.moveTo(-0.5, -0.5);
  shape.lineTo(0.5, -0.5);
  shape.lineTo(-0.5, 0);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 1,
    bevelEnabled: false,
  });
  geometry.translate(0, 0, -0.5);
  const mesh = new THREE.Mesh(geometry, material);
  return mesh;
}

function getWindow(x, y, z, windowMaterial, glassMaterial) {
  const windowGroup = new THREE.Group();

  const frame1 = getBox(windowMaterial);
  frame1.scale.set(56, 8, 4);
  frame1.position.set(0, 30, 0);
  windowGroup.add(frame1);

  const frame2 = getBox(windowMaterial);
  frame2.scale.set(56, 8, 4);
  frame2.position.set(0, -30, 0);
  windowGroup.add(frame2);

  const frame3 = getBox(windowMaterial);
  frame3.scale.set(8, 52, 4);
  frame3.position.set(-24, 0, 0);
  windowGroup.add(frame3);

  const frame4 = getBox(windowMaterial);
  frame4.scale.set(8, 52, 4);
  frame4.position.set(24, 0, 0);
  windowGroup.add(frame4);

  const glass = getBox(glassMaterial);
  glass.scale.set(40, 52, 2);
  windowGroup.add(glass);

  const cross1 = getBox(windowMaterial);
  cross1.scale.set(6, 52, 4);
  windowGroup.add(cross1);

  const cross2 = getBox(windowMaterial);
  cross2.scale.set(40, 6, 4);
  windowGroup.add(cross2);

  windowGroup.position.set(x, y, z);

  return windowGroup;
}

function getWindow2(x, y, z, windowMaterial, glassMaterial) {
  const windowGroup = new THREE.Group();

  const frame = getBox(windowMaterial);
  frame.scale.set(50, 50, 4);
  frame.rotation.z = Math.PI / 4;
  windowGroup.add(frame);

  const glass = getBox(glassMaterial);
  glass.scale.set(40, 40, 5);
  glass.rotation.z = Math.PI / 4;
  glass.position.z = 1;
  windowGroup.add(glass);

  const cross1 = getBox(windowMaterial);
  cross1.scale.set(6, 56, 4);
  cross1.position.z = 4;
  windowGroup.add(cross1);

  windowGroup.position.set(x, y, z);
  windowGroup.scale.set(1, 1.2, 1);

  return windowGroup;
}

function getWindow3(x, y, z, windowMaterial, glassMaterial) {
  const windowGroup = new THREE.Group();

  const frame = getArch(windowMaterial);
  frame.scale.set(36, 60, 4);
  windowGroup.add(frame);

  const glass = getArch(glassMaterial);
  glass.scale.set(26, 48, 2);
  glass.position.z = 3;
  windowGroup.add(glass);

  windowGroup.position.set(x, y, z);

  return windowGroup;
}

function getDoor(x, y, z, doorMaterial, knobMaterial) {
  const group = new THREE.Group();

  const door = getBox(doorMaterial);
  door.scale.set(55, 80, 6);
  group.add(door);

  const doorKnob = getSphere(knobMaterial);
  doorKnob.scale.set(3, 3, 3);
  doorKnob.position.set(18, 0, 6);
  group.add(doorKnob);

  group.position.set(x, y, z);

  return group;
}

function getDoor2(x, y, z, doorMaterial, knobMaterial) {
  const group = new THREE.Group();

  const door = getArch(doorMaterial);
  door.scale.set(55, 80, 6);
  group.add(door);

  const doorKnob = getSphere(knobMaterial);
  doorKnob.scale.set(3, 3, 3);
  doorKnob.position.set(18, 0, 6);
  group.add(doorKnob);

  group.position.set(x, y, z);

  return group;
}

function getRoof(x, y, z, roofMaterial, edgeMaterial) {
  const roofGroup = new THREE.Group();

  const roof = getPyramid(roofMaterial);
  roof.scale.set(160, 200, 160);
  roof.position.y = 232;
  roof.rotation.y = Math.PI / 4;
  roofGroup.add(roof);

  const roofEdge = getBox(edgeMaterial);
  roofEdge.scale.set(210, 5, 210);
  roofEdge.position.y = 130;
  roofGroup.add(roofEdge);

  roofGroup.position.set(x, y, z);

  return roofGroup;
}

function getRoof2(x, y, z, roofMaterial, edgeMaterial) {
  const roofGroup = new THREE.Group();

  const roof = getFrustum(roofMaterial);
  roof.scale.set(160, 200, 160);
  roof.position.y = 192;
  roof.rotation.y = Math.PI / 4;
  roofGroup.add(roof);

  const roofEdge = getBox(edgeMaterial);
  roofEdge.scale.set(210, 5, 210);
  roofEdge.position.y = 130;
  roofGroup.add(roofEdge);

  roofGroup.position.set(x, y, z);

  return roofGroup;
}

function getRoof3(x, y, z, roofMaterial, edgeMaterial) {
  const roofGroup = new THREE.Group();

  const roof = getTriangularPrism(roofMaterial);
  roof.scale.set(210, 200, 210);
  roof.position.y = 230;
  roofGroup.add(roof);

  const roofEdge = getBox(edgeMaterial);
  roofEdge.scale.set(210, 5, 210);
  roofEdge.position.y = 130;
  roofGroup.add(roofEdge);

  roofGroup.position.set(x, y, z);

  return roofGroup;
}

const houseMaterials = {
  wall: new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.8,
    side: THREE.DoubleSide,
    depthWrite: false,
  }),
  roof: new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.8,
    side: THREE.DoubleSide,
    depthWrite: false,
  }),
  edge: new THREE.MeshBasicMaterial({
    color: 0xffffff,
  }),
  window: new THREE.MeshBasicMaterial({
    color: 0xffffff,
  }),
  glass: new THREE.MeshBasicMaterial({
    color: 0xffffff,
  }),
  door: new THREE.MeshBasicMaterial({
    color: 0xffffff,
  }),
  knob: new THREE.MeshBasicMaterial({
    color: 0xffffff,
  }),
};

const houseColors = [0x9f080d, 0xe45e87, 0xc91416, 0xd65a86, 0xffd46b];
function getRandomColor() {
  const index = Math.floor(random(houseColors.length));
  return new THREE.Color(houseColors[index]);
}

function getHouse1(x, y, z, windowType = 0, doorType = 0, roofType = 0) {
  const group = new THREE.Group();

  const windowFunctions = [getWindow, getWindow2, getWindow3];
  const doorFunctions = [getDoor, getDoor2];
  const roofFunctions = [getRoof, getRoof2, getRoof3];

  const selectedWindow = windowFunctions[windowType];
  const selectedDoor = doorFunctions[doorType];
  const selectedRoof = roofFunctions[roofType];

  const body = getBox(houseMaterials.wall);
  body.scale.set(200, 260, 200);
  group.add(body);

  const roof = selectedRoof(0, 0, 0, houseMaterials.roof, houseMaterials.edge);
  group.add(roof);

  const window1 = selectedWindow(-55, 45, 100, houseMaterials.window, houseMaterials.glass);
  group.add(window1);

  const window2 = selectedWindow(55, 45, 100, houseMaterials.window, houseMaterials.glass);
  group.add(window2);

  const window3 = selectedWindow(105, 55, 0, houseMaterials.window, houseMaterials.glass);
  window3.rotation.y = Math.PI / 2;
  group.add(window3);

  const window4 = selectedWindow(105, -55, 0, houseMaterials.window, houseMaterials.glass);
  window4.rotation.y = Math.PI / 2;
  group.add(window4);

  const door = selectedDoor(0, -90, 102, houseMaterials.door, houseMaterials.knob);
  group.add(door);

  group.position.set(x, y, z);

  return group;
}

function getHouse2(x, y, z, windowType = 0, doorType = 0, roofType = 0) {
  const group = new THREE.Group();

  const windowFunctions = [getWindow, getWindow2, getWindow3];
  const doorFunctions = [getDoor, getDoor2];
  const roofFunctions = [getRoof, getRoof2, getRoof3];

  const selectedWindow = windowFunctions[windowType];
  const selectedDoor = doorFunctions[doorType];
  const selectedRoof = roofFunctions[roofType];

  const body = getBox(houseMaterials.wall);
  body.scale.set(200, 260, 200);
  group.add(body);

  const roof = selectedRoof(0, 0, 0, houseMaterials.roof, houseMaterials.edge);
  group.add(roof);

  const window1 = selectedWindow(0, 45, 100, houseMaterials.window, houseMaterials.glass);
  group.add(window1);

  const window2 = selectedWindow(0, 45, -100, houseMaterials.window, houseMaterials.glass);
  window2.rotation.y = Math.PI;
  group.add(window2);

  const window3 = selectedWindow(-100, 45, 0, houseMaterials.window, houseMaterials.glass);
  window3.rotation.y = -Math.PI / 2;
  group.add(window3);

  const window4 = selectedWindow(100, 45, 0, houseMaterials.window, houseMaterials.glass);
  window4.rotation.y = Math.PI / 2;
  group.add(window4);

  const door = selectedDoor(0, -90, 100, houseMaterials.door, houseMaterials.knob);
  group.add(door);

  group.position.set(x, y, z);

  return group;
}

function getRibbon(points, width, material) {
  const group = new THREE.Group();

  if (points.length < 2) {
    return group;
  }

  const curve = new THREE.CatmullRomCurve3(points, false, "centripetal");
  const segments = Math.max(32, points.length * 16);
  const vertices = [];
  const indices = [];
  const up = new THREE.Vector3(0, 1, 0);
  const reference = new THREE.Vector3(0, 0, 1);

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const position = curve.getPoint(t);
    const tangent = curve.getTangent(t).normalize();
    const side = new THREE.Vector3().crossVectors(tangent, up);
    if (side.lengthSq() < 0.0001) {
      side.crossVectors(tangent, reference);
    }
    side.normalize();

    const twist = t * Math.PI * 4 + frame * 0.008;
    const normal = new THREE.Vector3().crossVectors(tangent, side).normalize();
    const ribbonDirection = side.clone().multiplyScalar(Math.cos(twist)).add(normal.clone().multiplyScalar(Math.sin(twist))).normalize();
    const widthMotion = 1 + Math.sin(t * Math.PI * 6 + frame * 0.015) * 0.2;
    const halfWidth = width * widthMotion * 0.5;
    const left = position.clone().addScaledVector(ribbonDirection, halfWidth);
    const right = position.clone().addScaledVector(ribbonDirection, -halfWidth);

    vertices.push(left.x, left.y, left.z);
    vertices.push(right.x, right.y, right.z);

    if (i < segments) {
      const index = i * 2;
      indices.push(index, index + 1, index + 2);
      indices.push(index + 1, index + 3, index + 2);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const ribbon = new THREE.Mesh(geometry, material);
  group.add(ribbon);
  return group;
}

function getLine(points, radius, material) {
  if (points.length < 2) {
    return new THREE.Group();
  }

  const curve = new THREE.CatmullRomCurve3(points, false, "centripetal");
  const geometry = new THREE.TubeGeometry(curve, points.length * 8, radius, 6, false);
  const line = new THREE.Mesh(geometry, material);

  return line;
}

class House {
  constructor(clusterIndex, houseIndex, index, parent) {
    // this empty object keeps the house animation without drawing another copy.
    this.mesh = new THREE.Object3D();
    parent.add(this.mesh);

    this.pos = this.mesh.position;
    this.clusterIndex = clusterIndex;
    this.houseIndex = houseIndex;
    this.index = index;

    this.houseType = Math.floor(random(2));
    this.windowType = Math.floor(random(3));
    this.doorType = Math.floor(random(3));
    this.roofType = Math.floor(random(3));

    this.colors = {
      wall: new THREE.Color(0xffefd0),
      roof: getRandomColor(),
      edge: getRandomColor(),
      window: getRandomColor(),
      glass: new THREE.Color(0xa9cbd0),
      door: getRandomColor(),
      knob: getRandomColor(),
    };

    this.direction = new THREE.Vector3(0, 1, 0);
    this.treeAngle = 0;
    this.treeLevel = 0;

    this.targetPosition = new THREE.Vector3();
    this.targetRotation = new THREE.Vector3();

    this.spiralAngle = 0;
    this.clusterAngle = 0;

    this.breathingSpeed = 0.5 + (index % 6) * 0.1;
    this.breathingPhase = index;
    this.scale = 0.9 + 0.1 * Math.sin(index * 2);
  }

  setPosition(treeData, dynamicClusterRadius, dynamicSpiralRadius, dynamicClusterAngle) {
    const clusterIndex = this.clusterIndex;
    const localIndex = this.houseIndex;

    const level = Math.floor(localIndex / 3);
    const layerIndex = localIndex % 3;

    this.direction.copy(treeData.directions[localIndex]);
    this.treeAngle = treeData.angles[localIndex];
    this.treeLevel = treeData.levels[localIndex];

    const clusterAngle = clusterIndex * dynamicClusterAngle + Math.sin(frame * 0.003 + clusterIndex * 0.7) * 0.12;
    const clusterRadiusMotion = 1 + Math.cos(frame * 0.006 + clusterIndex * 1.2) * 0.12;
    const clusterRadius = dynamicClusterRadius * (0.65 + Math.sqrt(clusterIndex) * 1.15) * clusterRadiusMotion;
    const clusterX = Math.cos(clusterAngle) * clusterRadius;
    const clusterZ = Math.sin(clusterAngle) * clusterRadius;
    const clusterHeightBase = Math.cos(clusterIndex * 2.4) * 300;
    const clusterHeightMotion = Math.cos(frame * 0.004 + clusterIndex * 1.5) * 250;
    const clusterY = clusterHeightBase + clusterHeightMotion;

    const dynamicAngleStep = params.spiralAngleStep + Math.sin(frame * 0.004 + clusterIndex * 1.3) * 22;
    const angleStep = THREE.MathUtils.degToRad(dynamicAngleStep);
    const angle = localIndex * angleStep + clusterIndex * 1.1;

    const spiralRadius = dynamicSpiralRadius * (0.45 + 0.12 * Math.sin(level * 1.5 + clusterIndex));
    const spiralZ = Math.sin(angle) * spiralRadius;
    const spiralX = Math.cos(angle) * spiralRadius;
    const spiralY = localIndex * params.distance * 0.22 * (1 + Math.sin(frame * 0.006) * 0.12);

    const treeX = treeData.positions[localIndex].x * params.treeWeight;
    const treeY = treeData.positions[localIndex].y * params.treeWeight;
    const treeZ = treeData.positions[localIndex].z * params.treeWeight;

    const stackY = level * params.distance * 0.35 + layerIndex * params.distance * 0.12;

    const clusterFloatX = Math.sin(frame * 0.006 + clusterIndex * 1.5) * 12;
    const clusterFloatY = Math.sin(frame * 0.008 + clusterIndex * 1.2) * 15;
    const clusterFloatZ = Math.cos(frame * 0.006 + clusterIndex * 1.4) * 12;

    const floatX = Math.sin(frame * 0.02 + this.index * 1.4) * 7;
    const floatY = Math.sin(frame * 0.03 + this.index * 0.8) * 9;
    const floatZ = Math.cos(frame * 0.02 + this.index * 1.1) * 7;

    const targetX = clusterX + spiralX + treeX + clusterFloatX + floatX;
    const targetY = clusterY + spiralY + treeY + stackY + clusterFloatY + floatY;
    const targetZ = clusterZ + spiralZ + treeZ + clusterFloatZ + floatZ;
    this.targetPosition.set(targetX, targetY, targetZ);
    this.pos.lerp(this.targetPosition, 0.08);

    this.spiralAngle = angle;
    this.clusterAngle = clusterAngle;
  }

  rotate() {
    const rotationX = Math.sin(frame * 0.02 + this.index * 1.3) * 0.06 + this.direction.z * 0.08;
    const rotationY = this.spiralAngle * 0.5 + this.clusterAngle * 0.4 + Math.sin(frame * 0.01 + this.index) * 0.08;
    const rotationZ = this.treeAngle * params.treeWeight * 0.35 + Math.cos(frame * 0.02 + this.index * 0.9) * 0.05;
    this.targetRotation.set(rotationX, rotationY, rotationZ);

    this.mesh.rotation.x = THREE.MathUtils.lerp(this.mesh.rotation.x, this.targetRotation.x, 0.06);
    this.mesh.rotation.y = THREE.MathUtils.lerp(this.mesh.rotation.y, this.targetRotation.y, 0.06);
    this.mesh.rotation.z = THREE.MathUtils.lerp(this.mesh.rotation.z, this.targetRotation.z, 0.06);
  }

  update() {
    const breathing = 1 + Math.sin(frame * this.breathingSpeed * 0.03 + this.breathingPhase) * 0.15;
    const treeScale = Math.pow(0.94, this.treeLevel);
    const scale = 0.5 * this.scale * treeScale * breathing;
    const smoothScale = THREE.MathUtils.lerp(this.mesh.scale.x, scale, 0.08);

    this.mesh.scale.set(smoothScale, smoothScale, smoothScale);
  }
}

class HouseStack {
  constructor() {
    this.mesh = new THREE.Group();
    scene.add(this.mesh);

    this.houses = [];
    this.houseTemplates = []; // make one template for the instance batches instead of a full house per house
    this.instanceParts = []; 
    this.instanceMatrix = new THREE.Matrix4(); // a reusable matrix for instance transforms
    this.createInstances(); // build instanced batches from the template

    this.treePositions = [];
    this.treeDirections = [];
    this.treeAngles = [];
    this.treeLevels = [];

    this.dynamicClusterRadius = 500;
    this.dynamicSpiralRadius = 0;
    this.dynamicClusterAngle = 0;
    this.dynamicTreeAngle = 0;
    this.dynamicTreeLength = 0;
    this.dynamicTreeDecay = 0;

    this.ribbonGroup = new THREE.Group();
    this.treeLineGroup = new THREE.Group();

    this.mesh.add(this.ribbonGroup);
    this.mesh.add(this.treeLineGroup);

    this.ribbonMaterial = new THREE.MeshBasicMaterial({
      color: 0x90e1f3,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide
    });

    this.treeLineMaterial = new THREE.MeshBasicMaterial({
      color: 0x004dff,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide
    });

    this.updateParameters();
    this.createHouses();
  }

  createInstances() {
    const houseFunctions = [getHouse1, getHouse2];
    const roofFunctions = [getRoof, getRoof2, getRoof3];

    for (let houseType = 0; houseType < houseFunctions.length; houseType++) {
      for (let windowType = 0; windowType < 3; windowType++) {
        const template = houseFunctions[houseType](0, 0, 0, windowType, 0, 0);
        template.updateMatrixWorld(true); // calculate each template part's transform so its placement can be saved for every instance
        this.houseTemplates.push(template);
        if (houseType === 0 && windowType === 0) {
          this.createInstancePart(template.children[0], "body", -1, 0);
        }
        for (let i = 2; i <= 5; i++) {
          this.createInstancePart(template.children[i], "window", houseType, windowType);
        }
        if (windowType === 0) {
          this.createInstancePart(template.children[6], "door", houseType, 0);
        }
      }
      for (let doorType = 1; doorType < 2; doorType++) {
        const template = houseFunctions[houseType](0, 0, 0, 0, doorType, 0);
        template.updateMatrixWorld(true);
        this.houseTemplates.push(template);
        this.createInstancePart(template.children[6], "door", houseType, doorType);
      }
    }
    for (let roofType = 0; roofType < roofFunctions.length; roofType++) {
      const template = roofFunctions[roofType](0, 0, 0, houseMaterials.roof, houseMaterials.edge);
      template.updateMatrixWorld(true);
      this.houseTemplates.push(template);
      this.createInstancePart(template, "roof", -1, roofType);
    }
  }

  createInstancePart(group, category, houseType, variant) {
    // each template part gets a batch that draws the matching part across all houses.
    group.traverse((object) => {
      if (!object.isMesh) return;

      const mesh = new THREE.InstancedMesh(
        object.geometry,
        object.material,
        MAX_HOUSE_NUMBER * MAX_CLUSTER_NUMBER
      ); // make one batch for this part, with room for the maximum number of houses
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); // use a dynamic buffer because the instance transforms change every frame
      mesh.count = 0; // set the actual number of houses in updateInstances()
      // the houses keep moving, so skip culling based on an outdated batch bound.
      mesh.frustumCulled = false;
      this.mesh.add(mesh); // add this part's instanced batch to the house stack

      const materialType = Object.keys(houseMaterials).find((key) => {
        return houseMaterials[key] === object.material;
      });

      this.instanceParts.push({
        mesh: mesh,
        category: category,
        houseType: houseType,
        variant: variant,
        materialType: materialType,
        localMatrix: object.matrixWorld.clone(), // keep the part's placement inside the house to combine with each house transform
      });
    });
  }

  clearGroup(group) {
    for (let i = group.children.length - 1; i >= 0; i--) {
      const child = group.children[i];
      child.traverse(function(object) {
        if (object.isMesh && object.geometry) {
          object.geometry.dispose();
        }
      });
      group.remove(child);
    }
  }

  createHouses() {
    const existingHouses = new Map();
    for (let i = 0; i < this.houses.length; i++) {
      const house = this.houses[i];
      const key = house.clusterIndex + "-" + house.houseIndex;
      existingHouses.set(key, house);
    }
    const nextHouses = [];

    for (let cluster = 0; cluster < params.houseCluster; cluster++) {
      for (let i = 0; i < params.houseNumber; i++) {
        const index = cluster * params.houseNumber + i;
        const key = cluster + "-" + i;
        let house = existingHouses.get(key);

        if (house) {
          existingHouses.delete(key);
          house.index = index;
        } else {
          const clusterAngle = cluster * this.dynamicClusterAngle;
          const initialRadius = this.dynamicClusterRadius * (0.65 + Math.sqrt(cluster) * 1.15) * (1 + Math.cos(frame * 0.006 + cluster * 1.2) * 0.12);
          const initialY = Math.cos(cluster * 2.4) * 300 + Math.cos(frame * 0.004 + cluster * 1.7) * 250;
          house = new House(cluster, i, index, this.mesh); // make a transform object for the instance
          house.pos.set(Math.cos(clusterAngle) * initialRadius, initialY, Math.sin(clusterAngle) * initialRadius);
          house.targetPosition.copy(house.pos);
          house.mesh.scale.set(0.001, 0.001, 0.001);
        }
        nextHouses.push(house);
      }
    }

    for (const house of existingHouses.values()) {
      this.mesh.remove(house.mesh); // remove only the transform object and reuse the instanced batches
    }

    this.houses = nextHouses;
    this.updateInstances(); // write the new houses' initial transforms to the instance matrices
  }

  updateInstances() {
    for (const house of this.houses) {
      house.mesh.updateMatrix(); // turn the transform object's position, rotation, and scale into a matrix
    }

    for (const part of this.instanceParts) {
      let count = 0;
      for (const house of this.houses) {
        if (part.category === "window" && (house.houseType !== part.houseType || house.windowType !== part.variant)) {
          continue;
        }
        if (part.category === "door" && (house.houseType !== part.houseType || house.doorType !== part.variant)) {
          continue;
        }
        if (part.category === "roof" && house.roofType !== part.variant) {
          continue;
        }
        // combine the house motion with the part's original placement inside the house.
        this.instanceMatrix.multiplyMatrices(house.mesh.matrix, part.localMatrix);
        part.mesh.setMatrixAt(count, this.instanceMatrix); // apply the combined house and part transforms to this instance
        if (part.materialType) {
          part.mesh.setColorAt(count, house.colors[part.materialType]);
        }
        count++;
      }

      part.mesh.count = count;
      part.mesh.instanceMatrix.needsUpdate = true; // tell the gpu to use the updated instance matrices
      if (part.mesh.instanceColor) {
        part.mesh.instanceColor.needsUpdate = true;
      }
    }
  }

  updateParameters() {
    this.dynamicClusterRadius = 300 + Math.cos(frame * 0.005) * 200;
    this.dynamicSpiralRadius = params.spiralRadius * (1 + Math.sin(frame * 0.01) * 0.4);
    this.dynamicClusterAngle = THREE.MathUtils.degToRad(120 + Math.sin(frame * 0.003) * 15);
    this.dynamicTreeAngle = params.treeAngle + Math.sin(frame * 0.003) * 7 + Math.sin(frame * 0.002 + 1.2) * 3;
    this.dynamicTreeLength = params.treeLength * (1 + Math.sin(frame * 0.004) * 0.06 + Math.sin(frame * 0.003 + 1.1) * 0.02);
    this.dynamicTreeDecay = THREE.MathUtils.clamp(params.treeDecay + Math.sin(frame * 0.004) * 0.025 + Math.sin(frame * 0.002 + 1.3) * 0.015, 0, 1);
  }

  updateTree() {
    this.treePositions = [];
    this.treeDirections = [];
    this.treeAngles = [];
    this.treeLevels = [];

    const branchAngle = THREE.MathUtils.degToRad(this.dynamicTreeAngle);
    const treeLength = this.dynamicTreeLength;
    const treeDecay = this.dynamicTreeDecay;

    for (let j = 0; j < params.houseNumber; j++) {
      if (j === 0) {
        this.treePositions.push(new THREE.Vector3(0, 0, 0));
        this.treeDirections.push(new THREE.Vector3(0, 1, 0));
        this.treeAngles.push(0);
        this.treeLevels.push(0);
      } else {
        const parent = Math.floor((j - 1) / 3);
        const branchIndex = (j - 1) % 3;
        const level = this.treeLevels[parent] + 1;
        const parentDirection = this.treeDirections[parent];
        const reference = new THREE.Vector3(0, 0, 1);

        if (Math.abs(parentDirection.z) > 0.95) {
          reference.set(1, 0, 0);
        }

        const tangent = new THREE.Vector3().crossVectors(parentDirection, reference).normalize();
        const bitangent = new THREE.Vector3().crossVectors(parentDirection, tangent).normalize();

        const azimuth = branchIndex * Math.PI * 2 / 3 + level * 0.35 + Math.sin(frame * 0.003 + j * 0.6) * 0.1;
        const dynamicBranchAngle = branchAngle + Math.sin(frame * 0.004 + j * 0.7) * 0.06;

        const lateral = tangent.clone().multiplyScalar(Math.cos(azimuth)).add(bitangent.clone().multiplyScalar(Math.sin(azimuth)));
        const direction = parentDirection.clone().multiplyScalar(Math.cos(dynamicBranchAngle)).add(lateral.multiplyScalar(Math.sin(dynamicBranchAngle))).normalize();

        const length = treeLength * Math.pow(treeDecay, level - 1);
        const position = this.treePositions[parent].clone().add(direction.clone().multiplyScalar(length));

        this.treePositions.push(position);
        this.treeDirections.push(direction);
        this.treeAngles.push(Math.atan2(direction.x, direction.y));
        this.treeLevels.push(level);
      }
    }
  }

  updateRibbon() {
    this.clearGroup(this.ribbonGroup);
    this.ribbonGroup.visible = params.spiralRibbon;
    if (!params.spiralRibbon) {
      return;
    }
    for (let cluster = 0; cluster < params.houseCluster; cluster++) {
      const points = [];
      for (let i = 0; i < params.houseNumber; i++) {
        const index = cluster * params.houseNumber + i;
        const house = this.houses[index];
        if (house) {
          points.push(house.pos.clone());
        }
      }
      if (points.length < 2) {
        continue;
      }
      const ribbon = getRibbon(points, 75, this.ribbonMaterial);
      this.ribbonGroup.add(ribbon);
      const centerLine = getLine(points, 0.5, this.treeLineMaterial);
      this.ribbonGroup.add(centerLine);
    }
  }

  updateLines() {
    this.clearGroup(this.treeLineGroup);
    this.treeLineGroup.visible = params.treeLines;
    if (!params.treeLines) {
      return;
    }
    for (let cluster = 0; cluster < params.houseCluster; cluster++) {
      for (let j = 1; j < params.houseNumber; j++) {
        const parentIndex = Math.floor((j - 1) / 3);
        const index = cluster * params.houseNumber + j;
        const parentHouseIndex = cluster * params.houseNumber + parentIndex;
        const house = this.houses[index];
        const parentHouse = this.houses[parentHouseIndex];
        if (!house || !parentHouse) {
          continue;
        }
        const start = parentHouse.pos.clone();
        const end = house.pos.clone();
        const direction = end.clone().sub(start);
        const length = direction.length();
        if (length < 0.001) {
          continue;
        }
        const level = this.treeLevels[j];
        const branchWidth = Math.pow(0.8, level - 1);
        const midpoint = start.clone().lerp(end, 0.5);
        const sideways = new THREE.Vector3().crossVectors(direction, new THREE.Vector3(0, 0, 1));
        if (sideways.lengthSq() < 0.0001) {
          sideways.crossVectors(direction, new THREE.Vector3(1, 0, 0));
        }
        sideways.normalize();
        const bend = Math.sin(frame * 0.012 + j * 0.8 + cluster * 1.5) * Math.min(length * 0.08, 30);
        midpoint.addScaledVector(sideways, bend);
        const points = [start, midpoint, end];
        const branch = getLine(points, Math.max(0.5, branchWidth), this.treeLineMaterial);
        this.treeLineGroup.add(branch);
      }
    }
  }

  updatePosition() {
    if (this.houses.length === 0) {
      return;
    }
    const center = new THREE.Vector3(0, 0, 0);
    for (let i = 0; i < this.houses.length; i++) {
      center.add(this.houses[i].pos);
    }
    center.divideScalar(this.houses.length);
    this.mesh.position.x = THREE.MathUtils.lerp(this.mesh.position.x, -center.x, 0.06);
    this.mesh.position.y = THREE.MathUtils.lerp(this.mesh.position.y, -center.y, 0.06);
    this.mesh.position.z = THREE.MathUtils.lerp(this.mesh.position.z, -center.z, 0.06);
    this.mesh.rotation.y = Math.sin(frame * 0.004) * 0.08;
    this.mesh.rotation.z = Math.sin(frame * 0.006) * 0.025;
  }

  update() {
    this.updateParameters();
    this.updateTree();
    const treeData = {
      positions: this.treePositions,
      directions: this.treeDirections,
      angles: this.treeAngles,
      levels: this.treeLevels,
    };
    for (let i = 0; i < this.houses.length; i++) {
      const house = this.houses[i];
      house.setPosition(treeData, this.dynamicClusterRadius, this.dynamicSpiralRadius, this.dynamicClusterAngle);
      house.rotate();
      house.update();
    }
    this.updateInstances(); // rewrite the instance matrices every frame
    this.updateRibbon();
    this.updateLines();
    this.updatePosition();
  }
}

const CLOUD_LENGTH_SEGMENTS = 40;
const CLOUD_WIDTH_SEGMENTS = 8;

class Cloud {
  constructor(index, parent) {
    this.index = index;
    this.mesh = new THREE.Group();
    parent.add(this.mesh);

    this.curvePoints = [];
    this.targetCurvePoints = [];

    for (let i = 0; i < 5; i++) {
      this.curvePoints.push(new THREE.Vector3());
      this.targetCurvePoints.push(new THREE.Vector3());
    }

    this.curve = new THREE.CatmullRomCurve3(this.curvePoints, false, "centripetal", 0.5);

    this.planeGeometry = new THREE.PlaneGeometry(1, 1, CLOUD_LENGTH_SEGMENTS, CLOUD_WIDTH_SEGMENTS);

    this.planeMaterial = new THREE.MeshBasicMaterial({
      color: 0x87cefa,
      wireframe: true,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    this.planeMesh = new THREE.Mesh(this.planeGeometry, this.planeMaterial);
    this.planeMesh.visible = false;
    this.planeMesh.frustumCulled = false;
    this.mesh.add(this.planeMesh);

    this.particles = [];
    this.positions = new Float32Array(MAX_PARTICLE_NUMBER * 3);
    this.colors = new Float32Array(MAX_PARTICLE_NUMBER * 3);

    const colorA = new THREE.Color(0x004dff);
    const colorB = new THREE.Color(0x338ec2);
    const colorC = new THREE.Color(0x90e1f3);
    const color = new THREE.Color();

    for (let i = 0; i < MAX_PARTICLE_NUMBER; i++) {
      const t = Math.random();
      const u = Math.random();
      const speed = 0.5 + Math.random();
      const phase = Math.random() * Math.PI * 2;
      const mix = Math.random();

      this.particles.push({
        t,
        u,
        speed,
        phase,
        direction: Math.random() < 0.5 ? 1 : -1
      });

      if (mix < 0.5) {
        color.lerpColors(colorA, colorB, mix * 2);
      } else {
        color.lerpColors(colorB, colorC, (mix - 0.5) * 2);
      }

      const index3 = i * 3;
      this.colors[index3] = color.r;
      this.colors[index3 + 1] = color.g;
      this.colors[index3 + 2] = color.b;
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute("position", new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute("color", new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setDrawRange(0, params.particleNumber);

    this.material = new THREE.PointsMaterial({
      color: 0xffffff,
      vertexColors: true,
      size: 3,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
      depthTest: true,
      blending: THREE.NormalBlending,
      sizeAttenuation: true,
      fog: true
    });

    this.pointCloud = new THREE.Points(this.geometry, this.material);
    this.pointCloud.frustumCulled = false;
    this.mesh.add(this.pointCloud);

    this.phase = index * 1.73;
    this.driftPhase = index * 2.17;
    this.baseHeight = Math.sin(index * 2.4) * 260;
    this.driftRadiusX = 90 + index % 3 * 35;
    this.driftRadiusY = 55 + index % 4 * 25;
    this.driftRadiusZ = 75 + index % 3 * 30;
    this.targetPosition = new THREE.Vector3();

    this.point = new THREE.Vector3();
    this.tangent = new THREE.Vector3();
    this.side = new THREE.Vector3();
    this.normal = new THREE.Vector3();
    this.ribbonDirection = new THREE.Vector3();
    this.surfaceNormal = new THREE.Vector3();
    this.up = new THREE.Vector3(0, 1, 0);
    this.reference = new THREE.Vector3(0, 0, 1);

    this.curveInitialized = false;
  }

  updateDrift() {
    const driftX = Math.sin(frame * 0.0011 + this.driftPhase) * this.driftRadiusX;
    const driftY = Math.sin(frame * 0.0015 + this.phase) * this.driftRadiusY;
    const driftZ = Math.cos(frame * 0.0009 + this.driftPhase * 1.3) * this.driftRadiusZ;

    this.targetPosition.set(driftX, this.baseHeight + driftY, driftZ);
    this.mesh.position.lerp(this.targetPosition, 0.025);
  }

  updateCurve(centers) {
    if (centers.length === 0) {
      return;
    }

    const start = centers[this.index % centers.length];
    const end = centers[(this.index + 1) % centers.length];

    const angle = this.index * Math.PI * 2 / Math.max(1, params.houseCluster);
    const offsetX = Math.cos(angle) * 350;
    const offsetY = Math.sin(angle * 1.7) * 130;
    const offsetZ = Math.sin(angle) * 350;

    const startPosition = start.clone();
    const endPosition = end.clone();

    if (centers.length === 1) {
      const verticalHeight = 350 + params.distance * 0.2;
      const slantX = 480 + params.spiralRadius * 0.5;
      const slantZ = 280 + params.treeLength * params.treeWeight * 0.4;

      startPosition.add(new THREE.Vector3(-slantX, -verticalHeight, -slantZ));
      endPosition.add(new THREE.Vector3(slantX, verticalHeight, slantZ));
    } else {
      const offset = new THREE.Vector3(offsetX * 0.25, offsetY * 0.4, offsetZ * 0.25);

      startPosition.add(offset);
      endPosition.add(offset);
    }

    const direction = endPosition.clone().sub(startPosition);
    const sideways = new THREE.Vector3().crossVectors(direction, new THREE.Vector3(0, 1, 0));

    if (sideways.lengthSq() < 0.0001) {
      sideways.set(1, 0, 0);
    }

    sideways.normalize();

    const bend = 180 + Math.sin(frame * 0.002 + this.index * 1.3) * 90;
    const height = Math.sin(frame * 0.0025 + this.index * 1.7) * 110;

    this.targetCurvePoints[0].copy(startPosition).lerp(endPosition, -0.15);
    this.targetCurvePoints[1].copy(startPosition).lerp(endPosition, 0.2).addScaledVector(sideways, bend * 0.6);
    this.targetCurvePoints[2].copy(startPosition).lerp(endPosition, 0.5).addScaledVector(sideways, bend);
    this.targetCurvePoints[3].copy(startPosition).lerp(endPosition, 0.8).addScaledVector(sideways, bend * 0.5);
    this.targetCurvePoints[4].copy(startPosition).lerp(endPosition, 1.15);

    this.targetCurvePoints[0].y += height * 0.2;
    this.targetCurvePoints[1].y += height * 0.6;
    this.targetCurvePoints[2].y += height;
    this.targetCurvePoints[3].y += height * 0.5;
    this.targetCurvePoints[4].y -= height * 0.2;

    for (let i = 0; i < this.curvePoints.length; i++) {
      if (this.curveInitialized) {
        this.curvePoints[i].lerp(this.targetCurvePoints[i], 0.025);
      } else {
        this.curvePoints[i].copy(this.targetCurvePoints[i]);
      }
    }

    this.curveInitialized = true;
  }

  updatePlane() {
    const positionAttributes = this.planeGeometry.attributes.position;
    const positions = positionAttributes.array;
    const width = 0.65 * params.spiralRadius + 1.4 * params.treeLength * params.treeWeight;
    const breathing = 1 + Math.sin(frame * 0.003 + this.index * 1.5) * 0.12;
    const rowLength = CLOUD_LENGTH_SEGMENTS + 1;

    for (let i = 0; i <= CLOUD_LENGTH_SEGMENTS; i++) {
      const t = i / CLOUD_LENGTH_SEGMENTS;

      this.curve.getPoint(t, this.point);
      this.curve.getTangent(t, this.tangent);
      this.tangent.normalize();

      this.side.crossVectors(this.tangent, this.up);

      if (this.side.lengthSq() < 0.0001) {
        this.side.crossVectors(this.tangent, this.reference);
      }

      this.side.normalize();
      this.normal.crossVectors(this.tangent, this.side).normalize();

      const twist = t * Math.PI * 3 + frame * 0.003 + this.index * 0.7;
      const twistMotion = Math.sin(t * Math.PI * 4 + frame * 0.002 + this.index) * 0.25;
      const ribbonAngle = twist + twistMotion;

      const widthMotion = 0.8 + Math.sin(t * Math.PI * 4 + frame * 0.004 + this.index) * 0.15;
      const edgeFalloff = 0.85 + Math.sin(t * Math.PI) * 0.15;
      const halfWidth = width * widthMotion * breathing * edgeFalloff * 0.5;

      this.ribbonDirection.copy(this.side).multiplyScalar(Math.cos(ribbonAngle));
      this.ribbonDirection.addScaledVector(this.normal, Math.sin(ribbonAngle));

      this.surfaceNormal.copy(this.normal).multiplyScalar(Math.cos(ribbonAngle));
      this.surfaceNormal.addScaledVector(this.side, -Math.sin(ribbonAngle));

      for (let j = 0; j <= CLOUD_WIDTH_SEGMENTS; j++) {
        const u = j / CLOUD_WIDTH_SEGMENTS * 2 - 1;
        const surfaceWave = Math.sin(t * Math.PI * 10 + u * Math.PI * 3 + frame * 0.008) * 18;
        const surfaceRipple = Math.sin(t * Math.PI * 17 - frame * 0.006 + u * Math.PI * 5) * 10;
        const offset = surfaceWave + surfaceRipple;

        const index3 = (j * rowLength + i) * 3;

        positions[index3 + 0] = this.point.x + this.ribbonDirection.x * u * halfWidth + this.surfaceNormal.x * offset;
        positions[index3 + 1] = this.point.y + this.ribbonDirection.y * u * halfWidth + this.surfaceNormal.y * offset;
        positions[index3 + 2] = this.point.z + this.ribbonDirection.z * u * halfWidth + this.surfaceNormal.z * offset;
      }
    }

    positionAttributes.needsUpdate = true;
  }

  updateParticles() {
    const planePositions = this.planeGeometry.attributes.position.array;
    const positionAttributes = this.geometry.attributes.position;
    const positions = positionAttributes.array;

    const rowLength = CLOUD_LENGTH_SEGMENTS + 1;
    const activeCount = Math.min(MAX_PARTICLE_NUMBER, Math.max(0, Math.floor(params.particleNumber)));

    this.geometry.setDrawRange(0, activeCount);

    for (let i = 0; i < activeCount; i++) {
      const particle = this.particles[i];

      particle.t += 0.001 * particle.speed * particle.direction;

      if (particle.t > 1) {
        particle.t = 2 - particle.t;
        particle.direction = -1;
      }

      if (particle.t < 0) {
        particle.t = -particle.t;
        particle.direction = 1;
      }

      const x = particle.t * CLOUD_LENGTH_SEGMENTS;
      const y = particle.u * CLOUD_WIDTH_SEGMENTS;

      const x0 = Math.min(CLOUD_LENGTH_SEGMENTS - 1, Math.floor(x));
      const y0 = Math.min(CLOUD_WIDTH_SEGMENTS - 1, Math.floor(y));

      const a = x - x0;
      const b = y - y0;

      const index00 = (y0 * rowLength + x0) * 3;
      const index10 = index00 + 3;
      const index01 = index00 + rowLength * 3;
      const index11 = index01 + 3;
      const index3 = i * 3;

      const phase = Math.sin(frame * 0.005 + particle.phase + particle.t * Math.PI * 6);
      const ripple = phase * 4;

      for (let k = 0; k < 3; k++) {
        const p00 = planePositions[index00 + k];
        const p10 = planePositions[index10 + k];
        const p01 = planePositions[index01 + k];
        const p11 = planePositions[index11 + k];

        const low = p00 + (p10 - p00) * a;
        const high = p01 + (p11 - p01) * a;

        positions[index3 + k] = low + (high - low) * b;
      }

      const n = noise(
        positions[index3 + 0] * 0.003 + frame * 0.002,
        positions[index3 + 1] * 0.003,
        positions[index3 + 2] * 0.003
      ) * 2 - 1;

      const motion = ripple + n * 3;

      positions[index3 + 0] += Math.sin(particle.phase) * motion;
      positions[index3 + 1] += Math.cos(particle.phase) * motion;
      positions[index3 + 2] += Math.sin(particle.phase * 1.7) * motion;
    }

    positionAttributes.needsUpdate = true;
  }

  update() {
    this.updatePlane();
    this.updateParticles();
    this.updateDrift();

    this.planeMesh.visible = params.wireframe;
  }

  dispose() {
    this.planeGeometry.dispose();
    this.planeMaterial.dispose();
    this.geometry.dispose();
    this.material.dispose();
    this.mesh.parent.remove(this.mesh);
  }
}

class CloudSystem {
  constructor(houseStack) {
    this.houseStack = houseStack;
    this.mesh = new THREE.Group();
    this.houseStack.mesh.add(this.mesh);
    this.clouds = [];
    this.centers = [];
    this.createClouds();
  }

  createClouds() {
    while (this.clouds.length > params.houseCluster) {
      const cloud = this.clouds.pop();
      cloud.dispose();
    }
    while (this.clouds.length < params.houseCluster) {
      const cloud = new Cloud(this.clouds.length, this.mesh);
      this.clouds.push(cloud);
    }
  }

  updateCenters() {
    this.centers = Array.from({length: params.houseCluster}, () => new THREE.Vector3());
    const counts = new Array(params.houseCluster).fill(0);
    for (let i = 0; i < this.houseStack.houses.length; i++) {
      const house = this.houseStack.houses[i];
      this.centers[house.clusterIndex].add(house.pos);
      counts[house.clusterIndex]++;
    }
    for (let i = 0; i < this.centers.length; i++) {
      if (counts[i] > 0) {
        this.centers[i].divideScalar(counts[i]);
      }
    }
  }

  update() {
    if (this.clouds.length !== params.houseCluster) {
      this.createClouds();
    }
    this.mesh.visible = params.flowCloud;
    if (!params.flowCloud) {
      return;
    }
    this.updateCenters();
    for (let i = 0; i < this.clouds.length; i++) {
      const cloud = this.clouds[i];
      cloud.updateCurve(this.centers);
      cloud.update();
    }
  }
}

