let params = {
  fps: 0,
  num_of_cubes: 0,
  scene_children: 0,
  newCubes: 6,
  maxCubes: 7000,
  windForce: 0.15,
  flowForce: 0.15,
  noiseFreqPosition: 0.0015,
  noiseFreqTime: 0.002,
  sineFreqPosition: 0.003,
  sineFreqTime: 0.03,
  waveForce: 0.8,
  pull: 0.004,
  friction: 0.96,
  lightIntensity: 6,
  lightDistance: 2800,
  lightAngle: Math.PI / 2.2,
  lightPenumbra: 0.3,
  lightDecay: 0,
  lightHue: 0.08,
  lightSaturation: 0,
  ambientIntensity: 0.25,
  moonIntensity: 1.2,
  wireframe: false,
};

const WORLD_SIZE = 4000;
const WORLD_HALF = WORLD_SIZE / 2;
const SHIP_START_X = -WORLD_HALF - 200;
const CAMERA_START_X = -WORLD_HALF + 900;
const SHIP_LIFT_LAG = 0.03;

let cubes = [];
let ship;
let shipParticles = [];
let shipVel = new THREE.Vector3();
let shipAcc = new THREE.Vector3();
let shipLiftSmooth = 0;
let light;
let ambientLight;
let moonLight;

function setupThree() {
  setupGUI();

  camera.position.set(CAMERA_START_X, 280, 900);
  controls.target.set(CAMERA_START_X, 60, 0);
  controls.update();

  let numOfCubes = 5000;
  for (let i = 0; i < numOfCubes; i++) {
    let tCube = new Cube()
      .setPosition(random(-WORLD_HALF, WORLD_HALF), random(-40, 40), random(-WORLD_HALF, WORLD_HALF))
      .setVelocity(random(1, 4), 0, 0)
      .setRotationVelocity(random(-0.05, 0.05), random(-0.05, 0.05), random(-0.05, 0.05))
      .setScale(random(15, 45));
    cubes.push(tCube);
  }

  ship = getShip();
  ship.position.set(SHIP_START_X, 0, 0);
  scene.add(ship);

  ambientLight = new THREE.AmbientLight(0xffffff, params.ambientIntensity);
  scene.add(ambientLight);

  light = getSpotLight();
  light.intensity = params.lightIntensity;
  light.distance = params.lightDistance;
  light.angle = params.lightAngle;
  light.penumbra = params.lightPenumbra;
  light.decay = params.lightDecay;
  scene.add(light);
  scene.add(light.target);

  let lightMesh = getSphere();
  lightMesh.scale.set(20, 20, 20);
  light.add(lightMesh);

  moonLight = getPointLight();
  moonLight.color.setRGB(0.55, 0.65, 0.9);
  moonLight.intensity = params.moonIntensity;
  moonLight.distance = 0;
  moonLight.decay = 0;
  moonLight.position.set(0, 1600, -2600);
  scene.add(moonLight);
}

function updateThree() {
  if (cubes.length < params.maxCubes) {
    for (let i = 0; i < params.newCubes; i++) {
      let tCube = new Cube()
        .setPosition(random(-WORLD_HALF + 50, -WORLD_HALF + 250), random(-40, 40), random(-WORLD_HALF, WORLD_HALF))
        .setVelocity(random(1, 4), 0, 0)
        .setRotationVelocity(random(-0.05, 0.05), random(-0.05, 0.05), random(-0.05, 0.05))
        .setScale(random(15, 45));
      cubes.push(tCube);
    }
  }

  for (let c of cubes) {
    let xFreq = c.pos.x * params.noiseFreqPosition + frame * params.noiseFreqTime;
    let yFreq = c.pos.y * params.noiseFreqPosition + frame * params.noiseFreqTime;
    let zFreq = c.pos.z * params.noiseFreqPosition + frame * params.noiseFreqTime;
    let noiseValue = map(noise(xFreq, yFreq, zFreq), 0.0, 1.0, -1.0, 1.0);

    let force = new THREE.Vector3(
      cos(c.pos.x * params.sineFreqPosition + frame * params.sineFreqTime),
      sin(c.pos.y * params.sineFreqPosition + frame * params.sineFreqTime),
      sin(c.pos.z * params.sineFreqPosition + frame * params.sineFreqTime * 0.7)
    );
    force.normalize();
    force.multiplyScalar(noiseValue);
    force.multiplyScalar(params.flowForce);
    c.applyForce(force);

    c.applyForce(new THREE.Vector3(params.windForce, 0, 0));

    let lift = sin(
      c.pos.x * params.sineFreqPosition -
      frame * params.sineFreqTime +
      c.pos.z * params.sineFreqPosition * 0.3
    );
    c.applyForce(new THREE.Vector3(0, lift * (1 + noiseValue) * params.waveForce, 0));

    c.applyForce(new THREE.Vector3(0, -c.pos.y * params.pull, 0));

    c.updatePosition();
    c.vel.multiplyScalar(params.friction);
    c.vel.clampLength(0, 30);
    c.updateRotation();
    c.disappear();

    let t = map(c.pos.y, -300, 300, 0.0, 1.0);
    t = Math.max(0.0, Math.min(1.0, t));
    c.mesh.material.color.r = map(t, 0.0, 1.0, 0.0, 0.9);
    c.mesh.material.color.g = map(t, 0.0, 1.0, 0.2, 0.95);
    c.mesh.material.color.b = map(t, 0.0, 1.0, 0.5, 1.0);

    c.mesh.material.shininess = 110;
    c.mesh.material.specular.setRGB(0.55, 0.75, 0.85);

    c.mesh.material.wireframe = params.wireframe;
  }


  for (let i = cubes.length - 1; i >= 0; i--) {
    let c = cubes[i];

    if (c.isDone) {
      scene.remove(c.mesh);
      c.mesh.geometry.dispose();
      c.mesh.material.dispose();
      cubes.splice(i, 1);
    }
  }

  {
    let p = ship.position;

    let noiseValue = map(noise(
      p.x * params.noiseFreqPosition + frame * params.noiseFreqTime,
      p.y * params.noiseFreqPosition + frame * params.noiseFreqTime,
      p.z * params.noiseFreqPosition + frame * params.noiseFreqTime
    ), 0.0, 1.0, -1.0, 1.0);

    shipAcc.add(new THREE.Vector3(params.windForce, 0, 0));

    let liftNow = sin(p.x * params.sineFreqPosition - frame * params.sineFreqTime + p.z * params.sineFreqPosition * 0.3);
    shipLiftSmooth += (liftNow - shipLiftSmooth) * SHIP_LIFT_LAG;
    shipAcc.add(new THREE.Vector3(0, shipLiftSmooth * (1 + noiseValue) * params.waveForce, 0));

    shipAcc.add(new THREE.Vector3(0, -p.y * params.pull, 0));

    shipVel.add(shipAcc);
    p.add(shipVel);
    shipAcc.set(0, 0, 0);
    shipVel.multiplyScalar(params.friction);
    shipVel.clampLength(0, 30);

    p.z = Math.max(-WORLD_HALF, Math.min(WORLD_HALF, p.z));

    if (p.x > WORLD_HALF + 200) {
      p.x = SHIP_START_X;
      shipVel.set(0, 0, 0);
    }

    ship.rotation.z = Math.max(-0.6, Math.min(0.6, shipVel.y * 0.05));
  }

  for (let sp of shipParticles) {
    let nx = map(noise(sp.seed, frame * 0.02), 0, 1, -1, 1);
    let ny = map(noise(sp.seed + 100, frame * 0.02), 0, 1, -1, 1);
    let nz = map(noise(sp.seed + 200, frame * 0.02), 0, 1, -1, 1);
    sp.mesh.position.set(
      sp.basePos.x + nx * sp.amp,
      sp.basePos.y + ny * sp.amp,
      sp.basePos.z + nz * sp.amp
    );

    sp.mesh.rotation.x = map(noise(sp.rotSeed, frame * 0.015), 0, 1, -1, 1) * sp.rotAmp;
    sp.mesh.rotation.y = map(noise(sp.rotSeed + 300, frame * 0.015), 0, 1, -1, 1) * sp.rotAmp;
    sp.mesh.rotation.z = map(noise(sp.rotSeed + 400, frame * 0.015), 0, 1, -1, 1) * sp.rotAmp;

    sp.mesh.material.wireframe = params.wireframe;
  }

  light.position.set(ship.position.x, ship.position.y + 420, ship.position.z);
  light.target.position.set(ship.position.x, ship.position.y, ship.position.z);
  light.color.setHSL(params.lightHue, params.lightSaturation, 0.7);

  let swing = Math.max(-1, Math.min(1, shipVel.y * 0.2));
  light.intensity = params.lightIntensity * (1 + swing * 0.4);
  light.distance = params.lightDistance;
  light.angle = params.lightAngle;
  light.penumbra = params.lightPenumbra;
  light.decay = params.lightDecay;
  ambientLight.intensity = params.ambientIntensity;
  moonLight.intensity = params.moonIntensity;

  params.num_of_cubes = cubes.length;
  params.scene_children = scene.children.length;
}

function setupGUI() {
  pane.addBinding(params, "num_of_cubes", {
    step: 1,
  });
  pane.addBinding(params, "scene_children", {
    step: 1,
  });

  const folderNumber = pane.addFolder({ title: "NUMBER", expanded: false });
  folderNumber.addBinding(params, "newCubes", { min: 0, max: 50, step: 1 });
  folderNumber.addBinding(params, "maxCubes", { min: 0, max: 10000, step: 1 });

  const folderWave = pane.addFolder({ title: "WAVE", expanded: false });
  folderWave.addBinding(params, "waveForce", { min: 0, max: 3, step: 0.01 });
  folderWave.addBinding(params, "sineFreqPosition", { min: 0.0005, max: 0.01, step: 0.0001 });
  folderWave.addBinding(params, "sineFreqTime", { min: 0, max: 0.1, step: 0.001 });
  folderWave.addBinding(params, "pull", { min: 0.001, max: 0.02, step: 0.001 });
  folderWave.addBinding(params, "friction", { min: 0.8, max: 0.99, step: 0.01 });

  const folderFlow = pane.addFolder({ title: "FLOW", expanded: false });
  folderFlow.addBinding(params, "windForce", { min: 0, max: 1, step: 0.01 });
  folderFlow.addBinding(params, "flowForce", { min: 0, max: 2, step: 0.01 });

  const folderLight = pane.addFolder({ title: "LIGHT", expanded: false });
  folderLight.addBinding(params, "lightIntensity", { min: 0, max: 20, step: 0.01 });
  folderLight.addBinding(params, "lightDistance", { min: 1, max: 6000, step: 1 });
  folderLight.addBinding(params, "lightAngle", { min: 0, max: PI, step: 0.001 });
  folderLight.addBinding(params, "lightPenumbra", { min: 0, max: 1, step: 0.01 });
  folderLight.addBinding(params, "lightDecay", { min: 0, max: 1, step: 0.0001 });
  folderLight.addBinding(params, "lightHue", { min: 0, max: 1, step: 0.01 });
  folderLight.addBinding(params, "lightSaturation", { min: 0, max: 1, step: 0.01 });
  folderLight.addBinding(params, "ambientIntensity", { min: 0, max: 2, step: 0.01 });
  folderLight.addBinding(params, "moonIntensity", { min: 0, max: 3, step: 0.01 });

  const folderControl = pane.addFolder({ title: "CONTROL", expanded: false });
  folderControl.addBinding(params, "wireframe");
}

function getBox() {
  let geometry = new THREE.BoxGeometry(1, 1, 1);
  let material = new THREE.MeshPhongMaterial({
  });
  let mesh = new THREE.Mesh(geometry, material);
  return mesh;
}

function getShipBox() {
  let geometry = new THREE.BoxGeometry(1, 1, 1);
  let material = new THREE.MeshPhysicalMaterial({
    roughness: 0.5,
    metalness: 0,
    clearcoat: 0.8,
    clearcoatRoughness: 0.2,
  });
  let mesh = new THREE.Mesh(geometry, material);
  return mesh;
}

function getSpotLight() {
  const spotLight = new THREE.SpotLight(0xffffff);
  return spotLight;
}

function getPointLight() {
  const light = new THREE.PointLight(0xffffff, 1, 1000, 0);
  return light;
}

function getSphere() {
  const geometry = new THREE.SphereGeometry(1, 32, 16);
  const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const mesh = new THREE.Mesh(geometry, material);
  return mesh;
}

const SHIP_HALF_LENGTH = 380;
const SHIP_MAX_RADIUS = 110;
const SHIP_SLICES = 70;
const SHIP_MAX_PER_SLICE = 18;
const SHIP_CURL_HEIGHT = 90;
const SHIP_FREEBOARD = 85;

function shipProfileAt(x) {
  let u = map(x, -SHIP_HALF_LENGTH, SHIP_HALF_LENGTH, 0, PI);
  let r = SHIP_MAX_RADIUS * sin(u);

  let i = map(x, -SHIP_HALF_LENGTH, SHIP_HALF_LENGTH, 0, SHIP_SLICES);
  let bump = map(noise(i * 0.3), 0, 1, 0.85, 1.2);
  r *= bump;

  let edge = Math.abs(map(x, -SHIP_HALF_LENGTH, SHIP_HALF_LENGTH, -1, 1));
  let curlY = Math.pow(edge, 5) * SHIP_CURL_HEIGHT;

  return { r, curlY };
}

function shipParticleAt(x) {
  let profile = shipProfileAt(x);
  let r = profile.r;
  let curlY = profile.curlY;

  let a = random(0, TWO_PI);
  let rad = r * Math.sqrt(random(0, 1));
  let y = sin(a) * rad * 0.6 + curlY + SHIP_FREEBOARD;
  let z = cos(a) * rad;

  let isOuter = (rad / r) > 0.55;
  let hue = isOuter ? random(0.0, 0.02) : random(0.07, 0.1);
  let sat = isOuter ? random(0.75, 0.95) : random(0.35, 0.55);
  let light = isOuter ? random(0.3, 0.42) : random(0.22, 0.35);

  return { x: x, y: y, z: z, hue: hue, sat: sat, light: light };
}

function getShip() {
  let group = new THREE.Group();

  for (let i = 0; i <= SHIP_SLICES; i++) {
    let x = map(i, 0, SHIP_SLICES, -SHIP_HALF_LENGTH, SHIP_HALF_LENGTH);
    let r = shipProfileAt(x).r;

    let count = Math.round(SHIP_MAX_PER_SLICE * (r / SHIP_MAX_RADIUS));

    for (let j = 0; j < count; j++) {
      let pt = shipParticleAt(x);

      let particle = getShipBox();
      let s = random(8, 18);
      particle.scale.set(s, s, s);
      particle.material.color.setHSL(pt.hue, pt.sat, pt.light);
      particle.position.set(pt.x, pt.y, pt.z);
      group.add(particle);

      shipParticles.push({
        mesh: particle,
        basePos: new THREE.Vector3(pt.x, pt.y, pt.z),
        seed: random(0, 1000),
        amp: random(6, 16),
        rotSeed: random(0, 1000),
        rotAmp: random(0.4, 1.1),
      });
    }
  }

  return group;
}

class Cube {
  constructor() {
    this.mesh = getBox();
    scene.add(this.mesh);
    this.pos = this.mesh.position;
    this.vel = new THREE.Vector3();
    this.acc = new THREE.Vector3();
    this.rot = this.mesh.rotation;
    this.rotVel = new THREE.Vector3();
    this.rotAcc = new THREE.Vector3();
    this.scale = this.mesh.scale;
    this.baseScale = new THREE.Vector3(10, 10, 10);
    this.scale.copy(this.baseScale);
    this.mass = 1;
    this.lifespan = 1;
    this.lifeReduction = random(0.001, 0.01);
    this.isDone = false;
  }
  setPosition(x, y, z) {
    this.pos.set(x, y, z);
    return this;
  }
  setTranslation(x, y, z) {
    this.mesh.geometry.translate(x, y, z);
    return this;
  }
  setVelocity(x, y, z) {
    this.vel.set(x, y, z);
    return this;
  }
  setRotationAngle(x, y, z) {
    this.rot.set(x, y, z);
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
  setMass(mass) {
    if (mass !== undefined) {
      this.mass = mass;
    }
    else {
      this.mass =
        1 +
        this.baseScale.x *
        this.baseScale.y *
        this.baseScale.z *
        0.000001;
    }
    return this;
  }
  applyForce(f) {
    if (this.mass <= 0) return;
    const force = f.clone();
    force.divideScalar(this.mass);
    this.acc.add(force);
  }
  update() {
    this.updateLifespan();
    this.updatePosition();
    this.updateRotation();
    this.updateScale();
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
  updateScale() {
    this.scale.set(
      this.baseScale.x * this.lifespan,
      this.baseScale.y * this.lifespan,
      this.baseScale.z * this.lifespan
    );
  }
  updateLifespan() {
    this.lifespan -= this.lifeReduction;
    if (this.lifespan <= 0) {
      this.lifespan = 0;
      this.isDone = true;
    }
  }
  reappear() {
    if (this.pos.x > WORLD_HALF) {
      this.pos.x = -WORLD_HALF;
    }
    else if (this.pos.x < -WORLD_HALF) {
      this.pos.x = WORLD_HALF;
    }
    if (this.pos.y > WORLD_HALF) {
      this.pos.y = -WORLD_HALF;
    }
    else if (this.pos.y < -WORLD_HALF) {
      this.pos.y = WORLD_HALF;
    }
    if (this.pos.z > WORLD_HALF) {
      this.pos.z = -WORLD_HALF;
    }
    else if (this.pos.z < -WORLD_HALF) {
      this.pos.z = WORLD_HALF;
    }
  }
  bounce() {
    if (this.pos.x > WORLD_HALF) {
      this.pos.x = WORLD_HALF;
      this.vel.x *= -1;
    }
    else if (this.pos.x < -WORLD_HALF) {
      this.pos.x = -WORLD_HALF;
      this.vel.x *= -1;
    }
    if (this.pos.y > WORLD_HALF) {
      this.pos.y = WORLD_HALF;
      this.vel.y *= -1;
    }
    else if (this.pos.y < -WORLD_HALF) {
      this.pos.y = -WORLD_HALF;
      this.vel.y *= -1;
    }
    if (this.pos.z > WORLD_HALF) {
      this.pos.z = WORLD_HALF;
      this.vel.z *= -1;
    }
    else if (this.pos.z < -WORLD_HALF) {
      this.pos.z = -WORLD_HALF;
      this.vel.z *= -1;
    }
  }
  disappear() {
    if (
      this.pos.x < -WORLD_HALF ||
      this.pos.x > WORLD_HALF ||
      this.pos.y < -WORLD_HALF ||
      this.pos.y > WORLD_HALF ||
      this.pos.z < -WORLD_HALF ||
      this.pos.z > WORLD_HALF
    ) {
      this.isDone = true;
    }
  }
}