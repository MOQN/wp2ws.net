let params = {
  fps: 0,
  num_of_candles: 0,
  scene_children: 0,

  // wave & motion
  waveSpeed: 1.5,
  waveAmplitude: 35,

  // lines control
  lineSpeed: 2.5,
  lineQuantity: 100, 
  lineMaxLength: 700,

  // candles control
  spawnCandles: 20 
};

const RED_COLORS = ["#a7292f", "#770303", "#680c13"];

const LINE_WIDTH = 2;

const WORLD_SIZE = {
  x: 3000,
  y: 700,
  z: 2000
};

let mainGroup;          
let mainCubes = [];      
let subGroups = [];      
let candles = [];        

// __________________________

function setupThree() {

  pane.addBinding(params, "num_of_candles", { step: 1 });
  pane.addBinding(params, "scene_children", { step: 1 });

  // candlesControl
  const folderCandles = pane.addFolder({ title: "CANDLES CONTROL", expanded: true });
  folderCandles.addBinding(params, "spawnCandles", { min: 0, max: 30, step: 1});

  // waveControl
  const folderWave = pane.addFolder({ title: "WAVE MOTION", expanded: true });
  folderWave.addBinding(params, "waveSpeed", { min: 0.1, max: 3, step: 0.1 });
  folderWave.addBinding(params, "waveAmplitude", { min: 0, max: 100, step: 1 });

  // linesControl
  const folderLines = pane.addFolder({ title: "LINES CONTROL", expanded: true });
  folderLines.addBinding(params, "lineSpeed", { min: 1, max: 6, step: 0.1 });
  folderLines.addBinding(params, "lineQuantity", { min: 50, max: 200, step: 5 });
  folderLines.addBinding(params, "lineMaxLength", { min: 400, max: 1000, step: 50 });

  // Light Setting
  const threeAmbientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(threeAmbientLight);

  const threeDirectionalLight = new THREE.DirectionalLight(0xffffff, 5);
  threeDirectionalLight.position.set(0, 100, 500);
  scene.add(threeDirectionalLight);

  // Main Group
  mainGroup = new THREE.Group();
  scene.add(mainGroup);

  adjustMainCubesQuantity();

  // SubGroups
  let clusterCenters = [
    { x: -900, y: -200, z: -100 },
    { x: -300, y: -350, z: -600 },
    { x: 500,  y: -550, z: 50 }
  ];

  for (let center of clusterCenters) {
    let subGroup = new ClusterGroup(center);
    subGroups.push(subGroup);
  }

  // generate new candles
  for (let i = 0; i < params.spawnCandles; i++) {
    createCandle();
  }
}

function createCandle() {
  let candleRadius = random(8, 25); 
  let candleHeight = random(50, 150);

  let tCandle = new Candle()
    .setPosition(
      random(-WORLD_SIZE.x / 2, WORLD_SIZE.x / 2),
      random(-WORLD_SIZE.y / 2, WORLD_SIZE.y / 2),
      random(-WORLD_SIZE.z / 2, 0)
    )
    .setVelocity(0, random(-2, 2), 0)
    .setRotationVelocity(0, random(-0.03, 0.03), 0)
    .setScale(candleRadius, candleHeight, candleRadius); 
  candles.push(tCandle);
}

function adjustMainCubesQuantity() {
  while (mainCubes.length < params.lineQuantity) {
    let mCube = new MainCube(mainGroup);
    mainCubes.push(mCube);
  }
  while (mainCubes.length > params.lineQuantity) {
    let mCube = mainCubes.pop();
    mainGroup.remove(mCube.mesh);
  }
}

function updateThree() {
  let time = millis() * 0.001;

  if (mainCubes.length !== params.lineQuantity) {
    adjustMainCubesQuantity();
  }

  if (mainGroup) {
    mainGroup.position.y = Math.sin(time * 0.5) * 15;

    for (let mc of mainCubes) {
      mc.update(time);
    }
  }

  for (let sg of subGroups) {
    sg.update(time);
  }

  if (candles.length < params.spawnCandles) {
    createCandle();
  }

  for (let c of candles) {
    c.updatePosition();
    c.updateRotation();
    c.updateLifespan();
    c.update(time);
  }

  // remove
  for (let i = 0; i < candles.length; i++) {
    let c = candles[i];
    if (c.isDone) {
      scene.remove(c.mesh);
      candles.splice(i, 1);
      i--;
    }
  }

  // update the GUI
  params.num_of_candles = candles.length;
  params.scene_children = scene.children.length;
}

function getRedBox() {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshBasicMaterial({
    color: random(RED_COLORS),
    transparent: true,
    opacity: random(0.15, 0.8)
  });
  const mesh = new THREE.Mesh(geometry, material);
  return mesh;
}

// Class

class MainCube {
  constructor(parentGroup) {
    this.width = random(60, 100);
    this.height = random(120, 350);
    this.depth = random(60, 100);

    this.basePos = {
      x: random(-900, 900),
      y: random(300, 450) + random(-50, 50),
      z: random(-700, -300)
    };

    this.phaseOffset = random(0, Math.PI * 2);
    this.randomOpacity = random(0.2, 0.8);
    this.cubeColor = random(RED_COLORS); 

    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({
      color: this.cubeColor,
      transparent: true,
      opacity: this.randomOpacity
    });
    this.mesh = new THREE.Mesh(geometry, material);

    this.mesh.scale.set(this.width, this.height, this.depth);
    this.mesh.position.set(this.basePos.x, this.basePos.y, this.basePos.z);

    this.lineProgress = random(0, 300);

    this.initLine();
    parentGroup.add(this.mesh);
  }

  initLine() {
    let lineGeo = new THREE.CylinderGeometry(1.4, 1.4, 1, 8);
    lineGeo.translate(0, -0.5, 0);

    let lineMat = new THREE.MeshBasicMaterial({
      color: this.cubeColor, 
      transparent: true,
      opacity: this.randomOpacity * 0.6
    });

    this.line = new THREE.Mesh(lineGeo, lineMat);
    this.mesh.add(this.line);
  }

  update(time) {
    let waveX = Math.sin(time * params.waveSpeed + this.basePos.x * 0.003) * params.waveAmplitude;
    let waveZ = Math.cos(time * (params.waveSpeed * 0.8) + this.basePos.z * 0.004) * (params.waveAmplitude * 0.6);
    this.mesh.position.y = this.basePos.y + waveX + waveZ;

    this.lineProgress += params.lineSpeed;
    if (this.lineProgress > params.lineMaxLength) {
      this.lineProgress = 0;
    }

    let scaleX = LINE_WIDTH / this.width;
    let scaleZ = LINE_WIDTH / this.depth;
    let scaleY = this.lineProgress / this.height;

    this.line.scale.set(scaleX, scaleY, scaleZ);
  }
}

class ClusterGroup {
  constructor(center) {
    this.baseY = center.y;
    this.speed = random(0.01, 0.02);
    this.offset = random(0, Math.PI * 2);

    this.group = new THREE.Group();
    this.group.position.set(center.x, center.y, center.z);

    let count = 30;
    for (let i = 0; i < count; i++) {
      let clusterWidth = random(50, 70);
      let clusterHeight = random(100, 220);
      let clusterDepth = random(50, 80);

      let mesh = getRedBox();
      mesh.scale.set(clusterWidth, clusterHeight, clusterDepth);
      mesh.position.set(
        random(-200, 200),
        random(-120, 120),
        random(-100, 100)
      );
      this.group.add(mesh);
    }

    scene.add(this.group);
  }

  update(time) {
    this.group.position.y = this.baseY + Math.sin(time * 1.2 + this.offset) * 25;
  }
}

class Candle {
  constructor() {
    this.mesh = new THREE.Group();

    // body
    let bodyGeo = new THREE.CylinderGeometry(0.6, 0.6, 1, 32);
    this.bodyMat = new THREE.MeshBasicMaterial({ 
      color: "#FFFDEF",
      transparent: true,
      opacity: 0.8 
    });
    this.bodyMesh = new THREE.Mesh(bodyGeo, this.bodyMat);
    this.mesh.add(this.bodyMesh);

    // flame
    let tetraGeo = new THREE.TetrahedronGeometry(2, 1);
    tetraGeo.translate(0, 1, 0);
    this.candleMat = new THREE.MeshBasicMaterial({
      color: "#f7c549",
      transparent: true,
      opacity: 0.8
    });
    this.candleMesh = new THREE.Mesh(tetraGeo, this.candleMat);
    this.mesh.add(this.candleMesh);

    // base
    let plateGeo = new THREE.CylinderGeometry(1, 1, 1, 32);
    this.plateMat = new THREE.MeshBasicMaterial({ 
      color: "#F4F1EA",
      transparent: true,
      opacity: 0.8 
    });
    this.plateMesh = new THREE.Mesh(plateGeo, this.plateMat);
    this.mesh.add(this.plateMesh);

    scene.add(this.mesh);

    this.pos = this.mesh.position;
    this.vel = new THREE.Vector3();
    this.acc = new THREE.Vector3();

    this.rot = this.mesh.rotation;
    this.rotVel = new THREE.Vector3();
    this.rotAcc = new THREE.Vector3();

    this.scl = new THREE.Vector3(1, 1, 1);
    this.mass = 1;

    this.flickerOffset = random(0, 1000);
    this.isDone = false;
  }

  setPosition(x, y, z) {
    this.pos.set(x, y, z);
    return this;
  }

  setVelocity(x, y, z) {
    this.vel.set(x, y, z);
    return this;
  }

  setRotationVelocity(x, y, z) {
    this.rotVel.set(x, y, z);
    return this;
  }

  setScale(r, h = r, r2 = r) {
    const minScale = 0.01;
    r = Math.max(r, minScale);
    h = Math.max(h, minScale);
    r2 = Math.max(r2, minScale);
    this.scl.set(r, h, r2);
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

  updateLifespan() {
    if (Math.abs(this.pos.y) > WORLD_SIZE.y / 2) {
      this.isDone = true;
    }
  }

  update(time = 0) {
    this.bodyMesh.scale.set(this.scl.x, this.scl.y, this.scl.x);

    let candleRadius = this.scl.x * 0.4; 
    this.candleMesh.scale.set(candleRadius, candleRadius * 1.2, candleRadius);
    this.candleMesh.position.y = this.scl.y / 2;

    let plateThickness = 6;
    let plateRadius = this.scl.x * 0.8; 
    this.plateMesh.scale.set(plateRadius, plateThickness, plateRadius);
    this.plateMesh.position.y = -this.scl.y / 2 - plateThickness / 2;

    let flicker = Math.sin(time * 10 + this.flickerOffset) * 0.15 
                + Math.sin(time * 25 + this.flickerOffset) * 0.1 
                + (Math.random() - 0.5) * 0.05;

    this.candleMat.opacity = THREE.MathUtils.clamp(0.8 + flicker, 0.4, 1.0);
  }
}