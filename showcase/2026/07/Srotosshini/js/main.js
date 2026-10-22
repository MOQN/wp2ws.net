let keys = [];
let slots = [];
let music;
let doorMaterial, doorGlow, doorLight;
let journeyActive = false;
let journeyT = 0;   // which key number the camera is at (it can be 12.5, etc.)
let journeyButton;
let chamber;
let megastructure;
let hemiLight;
let doorFrameGroup;
let walkwayVisible = true;
let doorHinge;
let doorOpen = 0;       // 0 = closed, 1 = fully open
let journeyPhase = 0;   // 0 = path, 1 = door opens, 2 = going through, 3 = walking down the spiral
let enterPct = 0;
let walkS = 0;          // which spiral step the camera is at
let enterFrom = new THREE.Vector3();
let enterTo = new THREE.Vector3();
let lookFrom = new THREE.Vector3();
let lookTo = new THREE.Vector3();

const NUM_KEYS = 80;

const KEY_WIDTH = 200;
const KEY_DEPTH = 60;
const KEY_GAP = 4;
const KEY_PITCH = KEY_DEPTH + KEY_GAP;
const PATH_HALF = (NUM_KEYS * KEY_PITCH) / 2; 
const BLACK_WIDTH = 120;
const BLACK_HEIGHT = 20;
const BLACK_DEPTH = 34;
const DOOR_KEYS = 3;  
const DOOR_HEIGHT = 420;  
const CLIMB_KEYS = 24; 
const JOURNEY_END = NUM_KEYS - 9; 
const EYE_HEIGHT = 120;         

const params = {
  fps: 0,
  fogNear: 200,
  fogFar: 3000,
  bgColor: "#05070a",
    curveAmount: 450,
  rise: 120,
  climb: 500,
  doorLight: 2,
  doorColor: "#ffe2a8",
  journeySpeed: 0.05,
  spiralSpeed: 0.003,
     spotIntensity: 3,
  spotAngle: 0.45,
  spotPenumbra: 0.9,
};

function setupThree() {
  renderer.setClearColor(params.bgColor);
  scene.fog = new THREE.Fog(params.bgColor, params.fogNear, params.fogFar);

  // Tweakpane 
  pane.addBinding(params, "fogNear", { min: 1, max: 2000, step: 1 });
  pane.addBinding(params, "fogFar", { min: 500, max: 6000, step: 1 });
  pane.addBinding(params, "curveAmount", { min: 0, max: 800, step: 1 });
  pane.addBinding(params, "rise", { min: 0, max: 400, step: 1 });
  pane.addBinding(params, "climb", { min: 0, max: 1000, step: 1 });
    let folderLight = pane.addFolder({ title: "Chamber light", expanded: true });
  folderLight.addBinding(params, "spotIntensity", { min: 0, max: 6, step: 0.1 });
  folderLight.addBinding(params, "spotAngle", { min: 0.1, max: PI / 2, step: 0.01 });
  folderLight.addBinding(params, "spotPenumbra", { min: 0, max: 1, step: 0.01 });
  // dat.GUI
  const gui = new dat.GUI({ autoPlace: false });
  document.getElementById("container-dat").appendChild(gui.domElement);
  gui.addColor(params, "bgColor");
  gui.addColor(params, "doorColor");
  gui.add(params, "journeySpeed", 0.01, 0.2, 0.01);
  gui.add(params, "spiralSpeed", 0, 0.012, 0.001);

    setOverviewCamera();


  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.rotateSpeed = 0.5;

  journeyButton = document.getElementById("btn-journey");
  journeyButton.addEventListener("click", toggleJourney);
  music = new Audio("assets/bittersweet.mp3");
music.loop = true;
music.volume = 1;

  hemiLight = new THREE.HemisphereLight(0x8899aa, 0x111111, 1);
  scene.add(hemiLight);

  const light = new THREE.PointLight(0xffffff, 1, 1000, 0);
  light.position.set(200, 400, 300);
  scene.add(light);

          for (let i = 0; i < NUM_KEYS; i++) {
 
    let slot = new THREE.Group();
    scene.add(slot);
    slot.position.copy(getPathPoint(i));
    slot.rotation.y = getPathAngle(i);
    slots.push({ group: slot, index: i });


    let tilter = new THREE.Group();
    slot.add(tilter);
    slots[slots.length - 1].tilter = tilter;

    let stand = getStandAmount(i);
    let depth = KEY_DEPTH + (DOOR_HEIGHT - KEY_DEPTH) * stand ** 3;
    tilter.rotation.x = stand * (PI / 2);
    tilter.position.y = (depth / 2) * sin(stand * (PI / 2));

    
    let holder = tilter;
    if (i === NUM_KEYS - 1) {
      doorHinge = new THREE.Group();
      doorHinge.position.x = -KEY_WIDTH / 2;
      tilter.add(doorHinge);
      holder = doorHinge;
    }
    let w = new PianoKey(false, holder).setScale(KEY_WIDTH, 20, depth);
    keys.push(w);

    if (i === NUM_KEYS - 1) {
      w.setPosition(KEY_WIDTH / 2, 0, 0);   
      makeDoor(w, slot);
    }

 
    let n = i % 7;
    let isBlackSpot = n === 0 || n === 1 || n === 3 || n === 4 || n === 5;
    if (stand === 0 && isBlackSpot) {
      let b = new PianoKey(true, tilter)
        .setPosition(-(KEY_WIDTH - BLACK_WIDTH) / 2, 20, -KEY_PITCH / 2)
        .setScale(BLACK_WIDTH, BLACK_HEIGHT, BLACK_DEPTH);
      keys.push(b);
    }
  }
  
  let door = getPathPoint(NUM_KEYS - 1);
  let after = getPathPoint(NUM_KEYS);
  let dir = after.clone().sub(door);
  dir.y = 0;
  dir.normalize();
  chamber = new SpiralChamber(door, dir);
  megastructure = new Wotah(chamber);
  
}

function updateThree() {
    scene.fog.near = params.fogNear;
  scene.fog.far = params.fogFar;


  let base = new THREE.Color(params.bgColor);
  let haze = chamber.amount;  
    scene.fog.far = map(haze, 0, 1, params.fogFar, params.fogFar * 0.55);  
  hemiLight.intensity = map(haze, 0, 1, 1, 0.25);                        
  scene.fog.color.setRGB(
    map(haze, 0, 1, base.r, 0.006),
    map(haze, 0, 1, base.g, 0.02),
    map(haze, 0, 1, base.b, 0.032)
  );
  renderer.setClearColor(scene.fog.color);
  for (let s of slots) {
    s.group.position.copy(getPathPoint(s.index));
    s.group.rotation.y = getPathAngle(s.index);
  }
    if (doorLight) {
        doorLight.intensity = walkwayVisible ? params.doorLight : 0;
    doorGlow.material.color.set(params.doorColor);
  }
    chamber.update();
      if (frame === 5) {
    chamber.setVisible(false);  
  }
    if (journeyActive) {
    updateJourney();
  } else {
    controls.update(); 
  }
}

function getBox(color) {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshPhongMaterial({ color: color });
  const mesh = new THREE.Mesh(geometry, material);
  return mesh;
}

class PianoKey {
    constructor(isBlack = false, parent = scene) {
    this.isBlack = isBlack;
    this.mesh = getBox(isBlack ? 0x15171a : 0xe8e4da);
    parent.add(this.mesh);

    this.pos = this.mesh.position;
    this.rot = this.mesh.rotation;
    this.scl = this.mesh.scale;
  }

  setPosition(x, y, z) {
    this.pos.set(x, y, z);
    return this;
  }

  setRotationAngle(x, y, z) {
    this.rot.set(x, y, z);
    return this;
  }

  setScale(w, h, d) {
    this.scl.set(w, h, d);
    return this;
  }
}
function getPathPoint(i) {
  let t = i / NUM_KEYS;  
  let bend = t * t;       
  let x = sin(i * 0.12) * params.curveAmount * bend;
   let y = sin(i * 0.09) * params.rise * bend; 


  let fromEnd = NUM_KEYS - 1 - i;
  let c = 1 - fromEnd / CLIMB_KEYS;  
  c = Math.max(0, c);
  y += c * params.climb;
  let z = PATH_HALF - i * KEY_PITCH;
  return new THREE.Vector3(x, y, z);
}


function getPathAngle(i) {
  let now = getPathPoint(i);
  let next = getPathPoint(i + 1);
  return atan2(-(next.x - now.x), -(next.z - now.z));
}

function getStandAmount(i) {
  let fromEnd = NUM_KEYS - 1 - i;       
  if (fromEnd >= DOOR_KEYS) return 0;   
  let u = (DOOR_KEYS - fromEnd) / DOOR_KEYS; 
  return u * u;                         
}
function makeDoor(doorKey, slot) {
 
  doorMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xf1e6cf,
    metalness: 0,
    roughness: 0.45,
  });
  doorKey.mesh.material = doorMaterial;


  doorHinge.position.x = -90;
  doorKey.setPosition(90, 0, 0);
  doorKey.setScale(180, 20, DOOR_HEIGHT - 12);


  doorGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ color: params.doorColor, transparent: true })
  );
  doorGlow.scale.set(KEY_WIDTH, DOOR_HEIGHT, 1);
  doorGlow.position.set(0, DOOR_HEIGHT / 2, -30);
  slot.add(doorGlow);


  doorLight = new THREE.PointLight(0xffd9a0, params.doorLight, 900, 0);
  doorLight.position.set(0, DOOR_HEIGHT / 2, 120);
  slot.add(doorLight);

  makeDoorFrame(slot);

  pane.addBinding(doorMaterial, "roughness", { min: 0, max: 1 });
  pane.addBinding(doorMaterial, "metalness", { min: 0, max: 1 });
  pane.addBinding(params, "doorLight", { min: 0, max: 6, step: 0.1 });
}

function makeDoorFrame(slot) {
  doorFrameGroup = new THREE.Group();
  slot.add(doorFrameGroup);

  const frameMat = new THREE.MeshPhongMaterial({ color: 0x232830 });
  const wallMat = new THREE.MeshPhongMaterial({ color: 0x12151a });
  const halfW = KEY_WIDTH / 2;

  
  addBlock(doorFrameGroup, frameMat, -(halfW + 15), (DOOR_HEIGHT + 30) / 2, 25, 30, DOOR_HEIGHT + 30, 90);
  addBlock(doorFrameGroup, frameMat, halfW + 15, (DOOR_HEIGHT + 30) / 2, 25, 30, DOOR_HEIGHT + 30, 90);
  addBlock(doorFrameGroup, frameMat, 0, DOOR_HEIGHT + 15, 25, KEY_WIDTH + 60, 30, 90);

  addBlock(doorFrameGroup, wallMat, -(halfW + 30 + 450), -150, 0, 900, 2700, 40);
  addBlock(doorFrameGroup, wallMat, halfW + 30 + 450, -150, 0, 900, 2700, 40);
  addBlock(doorFrameGroup, wallMat, 0, 825, 0, KEY_WIDTH + 60, 750, 40);
  addBlock(doorFrameGroup, wallMat, 0, -750, 0, KEY_WIDTH + 60, 1500, 40);
}

function addBlock(parent, material, x, y, z, w, h, d) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
  mesh.position.set(x, y, z);
  mesh.scale.set(w, h, d);
  parent.add(mesh);
}

function setOverviewCamera() {
  camera.position.set(0, 300, 3100);
  camera.lookAt(0, 0, 0);
}

function toggleJourney() {
  if (journeyActive) {
    stopJourney();
  } else {
    startJourney();
  }
}

function startJourney() {
  journeyActive = true;
  journeyT = 0;
  resetDoor();
  journeyPhase = 0;
  enterPct = 0;
  walkS = 0;
  controls.enabled = false;
  journeyButton.textContent = "back to start";
  music.play();
}

function stopJourney() {
  journeyActive = false;
  controls.enabled = true;
  setOverviewCamera();
  journeyButton.textContent = "jump into my dream";
  music.pause();
  music.currentTime = 0;
    resetDoor();
}

function resetDoor() {
    setWalkwayVisible(true);
  doorOpen = 0;
  doorHinge.rotation.z = 0;
  doorGlow.visible = true;
  doorGlow.material.opacity = 1;
  chamber.setLight(0);
  chamber.setVisible(false);
  chamber.crumble.reset();
}

function openDoor() {
  doorOpen = Math.min(doorOpen + 0.004, 1);           
  let e = doorOpen * doorOpen * (3 - 2 * doorOpen);  
  doorHinge.rotation.z = e * 1.7;                    
  doorLight.intensity = params.doorLight * (1 + 2 * e); 
  chamber.setVisible(true);                          
  chamber.setLight(e);


  if (doorOpen >= 1) {
    let door = getPathPoint(NUM_KEYS - 1);
    let first = chamber.getStairPoint(0);
    let ahead = chamber.getStairPoint(5);
    enterFrom.copy(camera.position);
    enterTo.set(first.x, first.y + EYE_HEIGHT, first.z);
    lookFrom.set(door.x, door.y + DOOR_HEIGHT / 2, door.z);
    lookTo.set(ahead.x, ahead.y + EYE_HEIGHT - 40, ahead.z);
    enterPct = 0;
    journeyPhase = 2;
  }
}

function goThroughDoor() {
  enterPct = Math.min(enterPct + 0.0025, 1);        
  let e = enterPct * enterPct * (3 - 2 * enterPct);  

  camera.position.lerpVectors(enterFrom, enterTo, e);
  let look = new THREE.Vector3().lerpVectors(lookFrom, lookTo, e);
  camera.lookAt(look);

  doorGlow.material.opacity = 1 - e;            

  if (enterPct >= 1) {
    doorGlow.visible = false;
    walkS = 0;
    journeyPhase = 3;
  }
}

function updateJourney() {
  if (journeyPhase === 0) {
    followPath();
  } else if (journeyPhase === 1) {
    openDoor();
  } else if (journeyPhase === 2) {
    goThroughDoor();
  } else {
    walkDown();
  }
}

function followPath() {

  let speed = params.journeySpeed;
  if (journeyT > JOURNEY_END - 12) {
    speed *= map(journeyT, JOURNEY_END - 12, JOURNEY_END, 1, 0.05);
  }
  journeyT = Math.min(journeyT + speed, JOURNEY_END);

 
  let here = getPathPoint(journeyT);
  camera.position.set(here.x, here.y + EYE_HEIGHT, here.z);


  let ahead = getPathPoint(Math.min(journeyT + 8, NUM_KEYS - 1));
  let progress = journeyT / JOURNEY_END;
  let lookUp = EYE_HEIGHT + progress ** 3 * (DOOR_HEIGHT / 2 - EYE_HEIGHT);
  camera.lookAt(ahead.x, ahead.y + lookUp, ahead.z);


  if (journeyT >= JOURNEY_END) {
    doorOpen = 0;
    journeyPhase = 1;
  }
}


function walkDown() {
  walkS = Math.min(walkS + params.journeySpeed, chamber.numSteps - 6);


  if (walkS > 8 && walkwayVisible) {
    setWalkwayVisible(false);
  }


  let here = chamber.getStairPoint(walkS);
  camera.position.set(here.x, here.y + EYE_HEIGHT, here.z);
  let ahead = chamber.getStairPoint(walkS + 5);

  let pct = 0;
  if (walkS >= chamber.numSteps - 6) {
    chamber.crumble.start();
    pct = chamber.crumble.pct;
    let fade = Math.min(1, Math.max(0, (pct - 0.4) / 0.6));
    chamber.setLight(1 - 0.9 * fade);
  }
  camera.lookAt(ahead.x, ahead.y + EYE_HEIGHT - 40 - 120 * pct, ahead.z);
}

class SpiralChamber {
  constructor(door, dir) {
    this.radius = 420;
    this.numSteps = 80;
    this.stepAngle = 0.22;
    this.stepDrop = 18;

    let startX = door.x + dir.x * 160;
    let startZ = door.z + dir.z * 160;
    let centerX = startX + dir.x * this.radius;
    let centerZ = startZ + dir.z * this.radius;
    this.startAngle = atan2(-dir.z, -dir.x);  
    this.dirX = dir.x; 
    this.dirZ = dir.z;
    this.cx = centerX;
    this.cy = door.y;
    this.cz = centerZ;

    this.group = new THREE.Group();
    this.group.position.set(centerX, door.y, centerZ);
    scene.add(this.group);


    for (let k = 0; k < this.numSteps; k++) {
      let angle = this.startAngle + k * this.stepAngle;
      let step = new THREE.Group();
      step.position.set(cos(angle) * this.radius, -k * this.stepDrop, sin(angle) * this.radius);
      step.rotation.y = -angle;  
      this.group.add(step);
          
      if (k === this.numSteps - 1) {
        this.crumble = new Crumble(step);
        continue;
      }

      new PianoKey(false, step).setScale(150, 16, 80);

      let n = k % 7;
      if (n === 0 || n === 1 || n === 3 || n === 4 || n === 5) {
        new PianoKey(true, step)
          .setPosition(-30, 15, 46)
          .setScale(90, 14, 40);
      }
    }

    
    this.orbit = new THREE.Group();
    this.group.add(this.orbit);
    for (let i = 0; i < 40; i++) {
      let a = i * 0.157;
      let r = 180 + sin(i * 1.3) * 100;
      new PianoKey(i % 3 === 2, this.orbit)
        .setPosition(cos(a) * r, -700 + sin(i * 0.7) * 650, sin(a) * r)
        .setRotationAngle(sin(i * 1.1) * 0.3, -a, sin(i * 2.1) * 0.5)
        .setScale(60 + 40 * Math.abs(sin(i)), 12, 50);
    }


    for (let r = 0; r < 4; r++) {
      let ring = getRing();
      ring.scale.set(520, 520, 520);
      ring.position.set(0, -250 - r * 350, 0);
      this.group.add(ring);
    }

 
    this.light = new THREE.PointLight(0xbfd4e0, 0, 1800, 0);
    this.light.position.set(centerX, door.y + 100, centerZ);
    scene.add(this.light);

    this.lightLow = new THREE.PointLight(0x9fb8c8, 0, 1800, 0);
    this.lightLow.position.set(centerX, door.y - 900, centerZ);
    scene.add(this.lightLow);
        this.amount = 0; 


    this.spotHigh = new THREE.SpotLight(0x9fe3f0);
    this.spotHigh.intensity = 0;
    this.spotHigh.distance = 2400;
    this.spotHigh.decay = 0;
    this.spotHigh.position.set(centerX, door.y + 900, centerZ);
        this.targetHigh = getSpotTarget(centerX, door.y - 700, centerZ);
    this.spotHigh.target = this.targetHigh;
    scene.add(this.spotHigh);

    this.spotLow = new THREE.SpotLight(0x3d6fe0);
    this.spotLow.intensity = 0;
    this.spotLow.distance = 2400;
    this.spotLow.decay = 0;
    this.spotLow.position.set(centerX, door.y - 1500, centerZ);
    this.targetLow = getSpotTarget(centerX, door.y - 300, centerZ);
    this.spotLow.target = this.targetLow;
    scene.add(this.spotLow);
  }


  getStairPoint(s) {
    let angle = this.startAngle + s * this.stepAngle;
    let p = this.group.position;
    return new THREE.Vector3(
      p.x + cos(angle) * this.radius,
      p.y - s * this.stepDrop,
      p.z + sin(angle) * this.radius
    );
  }

    setLight(amount) {
    this.amount = amount;
  }

  setVisible(v) {
    this.group.visible = v;
  }

  update() {
        this.crumble.update();
    this.orbit.rotation.y += params.spiralSpeed;

   
    this.light.intensity = 1.5 * this.amount;
    this.lightLow.intensity = 1.2 * this.amount;

   
    this.targetHigh.position.set(
      this.cx + cos(frame * 0.006) * 900,
      this.cy - 500 + sin(frame * 0.004) * 500,
      this.cz + sin(frame * 0.006) * 900
    );
    this.targetLow.position.set(
      this.cx + cos(-frame * 0.004 + 2) * 800,
      this.cy - 400 + sin(frame * 0.005) * 400,
      this.cz + sin(-frame * 0.004 + 2) * 800
    );


    let flicker = 1 + 0.25 * sin(frame * 0.11) * sin(frame * 0.017);

    this.spotHigh.intensity = params.spotIntensity * this.amount * flicker;
    this.spotLow.intensity = params.spotIntensity * 0.6 * this.amount * flicker;
    this.spotHigh.angle = params.spotAngle;
    this.spotHigh.penumbra = params.spotPenumbra;

    this.spotLow.intensity = params.spotIntensity * 0.6 * this.amount;
    this.spotLow.angle = params.spotAngle;
    this.spotLow.penumbra = params.spotPenumbra;
  }
}

function getRing() {
  const geometry = new THREE.TorusGeometry(1, 0.012, 8, 128);
  const material = new THREE.MeshBasicMaterial({ color: 0x35586a });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = PI / 2;
  return mesh;
}

class Wotah {
  constructor(chamber) {
    this.chamber = chamber;
    this.group = new THREE.Group();
    chamber.group.add(this.group);  

   
    this.lensGeo = new THREE.SphereGeometry(1, 32, 12);
    this.ringGeo = new THREE.TorusGeometry(1, 0.01, 6, 96);
    this.dotGeo = new THREE.TorusGeometry(1, 0.0001, 2, 40);
   
    this.hexGeo = new THREE.SphereGeometry(1, 6, 2);
    this.hexRingGeo = new THREE.TorusGeometry(1, 0.01, 6, 6);
    this.hexDotGeo = new THREE.TorusGeometry(1, 0.0001, 2, 6);
    this.boxGeo = new THREE.BoxGeometry(1, 1, 1);

    this.hullDark = new THREE.MeshPhongMaterial({ color: 0x1a242b });
    this.hullMid = new THREE.MeshPhongMaterial({ color: 0x2a3a44 });
    this.hullLight = new THREE.MeshPhongMaterial({ color: 0x3b505c });
    this.hexDark = new THREE.MeshPhongMaterial({ color: 0x1a242b, flatShading: true });
    this.hexMid = new THREE.MeshPhongMaterial({ color: 0x2a3a44, flatShading: true });
    this.hexLight = new THREE.MeshPhongMaterial({ color: 0x3b505c, flatShading: true });
    this.glowMat = new THREE.MeshBasicMaterial({ color: 0x8ff0ff });
    this.glowDim = new THREE.MeshBasicMaterial({ color: 0x2f8fa0 });

  
    this.saucers = [];
    let sizes = [170, 650, 110, 420, 240, 780, 140, 540, 300, 900, 200, 480];
    for (let i = 0; i < sizes.length; i++) {
      let R = sizes[i];
      let angle = chamber.startAngle + i * (PI * 2 / sizes.length) + sin(i * 1.7) * 0.15;
      let dist = R * 1.05 + 650 + (i % 3) * 250;     
      let x = cos(angle) * dist;
      let z = sin(angle) * dist;
      let y = 400 - i * 250 + sin(i * 2.1) * 60;

      let saucer = new Saucer(this, x, y, z, R, i);

      saucer.nearDoor = !this.isSafe(x, z, R);
      saucer.holder.visible = !saucer.nearDoor;
      this.saucers.push(saucer);
    }
  }


  isSafe(x, z, half) {
    let towardDoor = -(x * this.chamber.dirX + z * this.chamber.dirZ);
    return towardDoor + half < 300;
  }

  setDoorSideVisible(v) {
    for (let s of this.saucers) {
      if (s.nearDoor) {
        s.holder.visible = v;
      }
    }
  }
}

class Saucer {
  constructor(city, x, y, z, R, i) {
    let hex = i % 3 === 1;      
    let withPole = i % 3 === 0; 

    let geo = hex ? city.hexGeo : city.lensGeo;
    let dark = hex ? city.hexDark : city.hullDark;
    let mid = hex ? city.hexMid : city.hullMid;
    let light = hex ? city.hexLight : city.hullLight;

    this.nearDoor = false;
    this.holder = new THREE.Group();
    this.holder.position.set(x, y, z);
    this.holder.rotation.x = sin(i * 1.9) * 0.08;  
    this.holder.rotation.z = sin(i * 2.7) * 0.08;
    city.group.add(this.holder);


    this.lens(geo, mid, R, R * 0.07, R, 0);                         
    this.lens(geo, light, R * 0.62, R * 0.06, R * 0.62, R * 0.07);  
    this.lens(geo, mid, R * 0.28, R * 0.1, R * 0.28, R * 0.13);     
    this.lens(geo, dark, R * 0.55, R * 0.1, R * 0.55, -R * 0.06);   
    this.lens(geo, city.glowDim, R * 0.88, R * 0.025, R * 0.88, -R * 0.04);   


    let rim = new THREE.Mesh(hex ? city.hexRingGeo : city.ringGeo, city.glowMat);
    rim.rotation.x = PI / 2;
    rim.scale.set(R * 1.005, R * 1.005, R * 1.005);
    this.holder.add(rim);

 
    let dotMat = new THREE.PointsMaterial({ color: 0xbff7ff, size: Math.max(6, R * (hex ? 0.05 : 0.03)) });
    let dots = new THREE.Points(hex ? city.hexDotGeo : city.dotGeo, dotMat);
    dots.rotation.x = PI / 2;
    dots.position.y = -R * 0.08;
    dots.scale.set(R * 0.8, R * 0.8, R * 0.8);
    this.holder.add(dots);

  
    let mast = new THREE.Mesh(city.boxGeo, light);
    mast.scale.set(Math.max(3, R * 0.012), R * 0.3, Math.max(3, R * 0.012));
    mast.position.y = R * 0.38;
    this.holder.add(mast);

    let tipSize = Math.max(4, R * 0.02);
    let tip = new THREE.Mesh(city.lensGeo, city.glowMat);
    tip.scale.set(tipSize, tipSize, tipSize);
    tip.position.y = R * 0.53;
    this.holder.add(tip);


    if (withPole) {
      let pole = new THREE.Mesh(city.boxGeo, dark);
      pole.scale.set(Math.max(6, R * 0.05), 3600, Math.max(6, R * 0.05));
      this.holder.add(pole);

      for (let k = 0; k < 2; k++) {
        let off = R * 0.6 + 350 + k * 450;
        this.lens(city.hexGeo, city.hexMid, R * 0.45, R * 0.015, R * 0.45, off);
        this.lens(city.hexGeo, city.hexMid, R * 0.45, R * 0.015, R * 0.45, -off);
      }
    }
  }

  lens(geometry, material, w, h, d, y) {
    let mesh = new THREE.Mesh(geometry, material);
    mesh.scale.set(w, h, d);
    mesh.position.y = y;
    this.holder.add(mesh);
  }
}

function setWalkwayVisible(v) {
  walkwayVisible = v;
  for (let s of slots) {
    s.tilter.visible = v;      
  }
  doorFrameGroup.visible = v;    
  megastructure.setDoorSideVisible(!v);
}

function getSpotTarget(x, y, z) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
  mesh.visible = false;
  mesh.position.set(x, y, z);
  scene.add(mesh);
  return mesh;
}
class Crumble {
  constructor(parent) {
    this.group = new THREE.Group();
    parent.add(this.group);

    this.pieces = [];
    this.pct = 0;         
    this.started = false;

    const light = new THREE.MeshPhongMaterial({ color: 0xe8e4da, flatShading: true });
    const dark = new THREE.MeshPhongMaterial({ color: 0x3b4a55, flatShading: true });
    const geometry = new THREE.BoxGeometry(1, 1, 1);

 
    for (let i = 0; i < 40; i++) {
      let y = random(-100, -20);
      let mesh = new THREE.Mesh(geometry, y > -45 ? light : dark);
      mesh.scale.set(random(30, 75), random(20, 50), random(25, 55));
      this.group.add(mesh);

      let startPos = new THREE.Vector3(random(-65, 65), y, random(-30, 30));
      let endPos = new THREE.Vector3(
        startPos.x + random(-300, 120),
        startPos.y - random(150, 700),
        startPos.z + random(-300, 300)
      );
      this.pieces.push({
        mesh: mesh,
        startPos: startPos,
        endPos: endPos,
        spin: new THREE.Vector3(random(-1.5, 1.5), random(-1.5, 1.5), random(-1.5, 1.5)),
        phase: random(TWO_PI),
      });
    }
    this.update();
  }

  start() {
    this.started = true;
  }

  reset() {
    this.started = false;
    this.pct = 0;
    this.update();
  }

  update() {
    if (this.started) {
      this.pct = Math.min(this.pct + 0.0025, 1);   
    }
    let e = 1 - (1 - this.pct) ** 3;             

    for (let p of this.pieces) {
      p.mesh.position.lerpVectors(p.startPos, p.endPos, e);
      p.mesh.position.y += sin(frame * 0.02 + p.phase) * 6 * e;   
      p.mesh.rotation.set(p.spin.x * e, p.spin.y * e, p.spin.z * e);
    }
  }
}