let params = {
  fps: 0,
  segments: 18,
  density: 0.65,
  particleCount: 42,

  fog: 2200,
  move: true,
  speed: 1.2,
}; 

// I used sample 01 as base
// Then I change the parameters, create basic structure and combine sample of GUI code
// Then I debug, finish the fog part, fix the details of parameters, and adjust the movement of camera with the help of AI

const CORRIDOR_WIDTH = 420;
const CORRIDOR_HEIGHT = 280;
const CORRIDOR_DEPTH = 2800;

const CLEAR_FORE_Z = 520;

let blocks = [];
let camZ = 0;

function fogNear() {
  return params.fog * 0.1;
}

function applyFog() {
  scene.fog.near = fogNear();
  scene.fog.far = params.fog;
}

function setupThree() {
  scene.background = new THREE.Color(0xffffff);
  scene.fog = new THREE.Fog(0xffffff, fogNear(), params.fog);

  camera.position.set(0, 40, -80);
  camera.lookAt(0, 20, 800);
  controls.target.set(0, 20, 600);
  controls.enableDamping = true;
  controls.update();
  syncCameraMode();

  setupGUI();
  rebuildCorridor();
}

function syncCameraMode() {

  controls.enabled = !params.move;
  if (!params.move) {
    camZ = Math.max(0, camera.position.z + 80);
  }
}

function updateThree() {
  if (params.move) {
    camZ += params.speed;

    if (camZ > CORRIDOR_DEPTH - 400) camZ = 0;
    camera.position.set(0, 40, -80 + camZ);
    controls.target.set(0, 20, 600 + camZ);
  }
  controls.update();

  for (let b of blocks) {
    if (b.drifts) {
      b.updatePosition();
      b.updateRotation();
      b.wrapAlongCorridor();
    }
  }
}

function rebuildCorridor() {
  clearBlocks();
  applyFog();

  const halfW = CORRIDOR_WIDTH / 2;
  const halfH = CORRIDOR_HEIGHT / 2;
  const segDepth = CORRIDOR_DEPTH / params.segments;

  new Block()
    .setColor(0xffffff)
    .setPosition(0, halfH * 0.2, CORRIDOR_DEPTH + 40)
    .setScale(CORRIDOR_WIDTH * 1.4, CORRIDOR_HEIGHT * 1.3, 20);

  new Block()
    .setColor(0xf2f2f2)
    .setPosition(0, -halfH, CORRIDOR_DEPTH / 2)
    .setScale(CORRIDOR_WIDTH * 1.15, 4, CORRIDOR_DEPTH + 200);

  for (let s = 0; s < params.segments; s++) {
    const z = s * segDepth + segDepth * 0.5;
    if (z < CLEAR_FORE_Z) continue;
    if (noise(s * 0.9, 0.2) > 0.35) {
      const side = noise(s * 0.9, 0.4) > 0.5 ? 1 : -1;
      new Block()
        .setPosition(side * halfW * random(0.45, 0.9), halfH + random(4, 18), z)
        .setScale(random(40, 120), random(6, 14), random(segDepth * 0.4, segDepth * 0.9));
    }
  }

  for (let s = 0; s < params.segments; s++) {
    const z = s * segDepth + segDepth * 0.5;
    if (z < CLEAR_FORE_Z) continue;
    const seed = s * 17.13;
    buildSegment(z, segDepth, halfW, halfH, seed);
  }

  for (let i = 0; i < params.particleCount; i++) {
    const size = random(3, 9);
    new Block()
      .setPosition(
        random(-halfW * 0.7, halfW * 0.7),
        random(-halfH * 0.35, halfH * 0.55),
        random(CLEAR_FORE_Z, CORRIDOR_DEPTH * 0.9)
      )
      .setScale(size, size, size)
      .setVelocity(0, random(-0.03, 0.03), random(-0.25, -0.04))
      .setRotationVelocity(
        random(-0.008, 0.008),
        random(-0.008, 0.008),
        random(-0.008, 0.008)
      )
      .enableDrift();
  }
}

function buildSegment(z, segDepth, halfW, halfH, seed) {
  const dens = params.density;

  const thin = () => random(5, 14);

  for (const side of [-1, 1]) {
    const sideBias = side > 0 ? 0.05 : 0;
    const stackCount = floor(map(dens, 0, 1, 2, 5));

    if (noise(seed, side + 0.1) < dens * 0.75 + sideBias) {
      const h = random(halfH * 0.55, halfH * 1.5);
      const d = random(segDepth * 0.35, segDepth * 0.85);
      new Block()
        .setPosition(
          side * (halfW + random(0, 24)),
          -halfH + h / 2,
          z + random(-segDepth * 0.12, segDepth * 0.12)
        )
        .setScale(thin(), h, d);
    }

    for (let i = 0; i < stackCount; i++) {
      if (noise(seed, side * 2 + i * 0.41) > dens + 0.05 + sideBias) continue;
      const h = random(28, halfH * 1.1);
      const d = random(28, segDepth * 0.7);
      const xInset = halfW * random(0.72, 0.98);
      new Block()
        .setPosition(
          side * xInset,
          -halfH + h / 2 + random(0, 30),
          z + random(-segDepth * 0.2, segDepth * 0.2)
        )
        .setScale(thin() + random(0, 10), h, d);
    }

    if (noise(seed, side + 1.2) > 0.62 - sideBias) {
      new Block()
        .setPosition(
          side * halfW * random(0.55, 0.88),
          halfH * random(0.4, 0.9),
          z
        )
        .setScale(random(30, 90), thin(), random(14, 40));
    }

    if (noise(seed, side + 3.3) > 0.5) {
      new Block()
        .setPosition(side * (halfW * random(0.78, 0.96)), 0, z)
        .setScale(random(6, 14), CORRIDOR_HEIGHT * random(0.65, 1.05), random(6, 16));
    }
  }

  if (noise(seed, 5.5) > 0.6) {
    const side = noise(seed, 5.7) > 0.5 ? 1 : -1;
    new Block()
      .setPosition(side * random(halfW * 0.35, halfW * 0.7), -halfH + random(2, 8), z)
      .setScale(random(50, 120), random(3, 8), random(24, segDepth * 0.45));
  }

  if (noise(seed, 6.6) > 0.42) {
    const hang = floor(random(1, 3));
    for (let i = 0; i < hang; i++) {
      const side = noise(seed, 6.8 + i) > 0.5 ? 1 : -1;
      new Block()
        .setPosition(
          side * random(halfW * 0.25, halfW * 0.85),
          halfH - random(15, 70),
          z + random(-20, 20)
        )
        .setScale(random(12, 40), random(14, 50), thin() + random(0, 12));
    }
  }

  if (noise(seed, 7.7) > 0.5) {
    new Block()
      .setPosition(
        random(-halfW * 0.85, halfW * 0.85),
        random(-halfH * 0.15, halfH * 0.75),
        z
      )
      .setScale(random(3, 7), random(3, 7), random(60, 160));
  }
}

function clearBlocks() {
  for (let i = blocks.length - 1; i >= 0; i--) {
    scene.remove(blocks[i].mesh);
  }
  blocks = [];
}

function setupGUI() {
  pane.addBinding(params, "segments", {
    label: "Segments",
    min: 6,
    max: 36,
    step: 1,
  }).on("change", () => rebuildCorridor());

  pane.addBinding(params, "density", {
    label: "Density",
    min: 0.2,
    max: 1,
    step: 0.05,
  }).on("change", () => rebuildCorridor());

  pane.addBinding(params, "particleCount", {
    label: "Particles",
    min: 0,
    max: 120,
    step: 2,
  }).on("change", () => rebuildCorridor());

  pane.addBinding(params, "fog", {
    label: "Fog",
    min: 800,
    max: 4000,
    step: 50,
  }).on("change", () => applyFog());

  pane.addBlade({ view: "separator" });

  pane.addBinding(params, "move", { label: "Move" }).on("change", () => {
    syncCameraMode();
  });
  pane.addBinding(params, "speed", {
    label: "Speed",
    min: 0.2,
    max: 5,
    step: 0.1,
  });
  pane.addButton({ title: "Reset Camera" }).on("click", () => {
    camZ = 0;
    params.move = false;
    syncCameraMode();
    camera.position.set(0, 40, -80);
    controls.target.set(0, 20, 600);
    controls.update();
    pane.refresh();
  });

  pane.addButton({ title: "Rebuild Corridor" }).on("click", () => rebuildCorridor());
}

function getBox(color = 0x000000) {
  const geometry = new THREE.BoxGeometry(1, 1, 1);

  const material = new THREE.MeshBasicMaterial({ color });
  return new THREE.Mesh(geometry, material);
}

class Block {
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
    this.drifts = false;
    blocks.push(this);
  }
  setColor(hex) {
    this.mesh.material.color.setHex(hex);
    return this;
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
  setScale(w, h = w, d = w) {
    const minScale = 0.01;
    w = Math.max(w, minScale);
    h = Math.max(h, minScale);
    d = Math.max(d, minScale);
    this.baseScale.set(w, h, d);
    this.scale.set(w, h, d);
    return this;
  }
  enableDrift() {
    this.drifts = true;
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
  wrapAlongCorridor() {
    if (this.pos.z < 50) this.pos.z = CORRIDOR_DEPTH;
    if (this.pos.z > CORRIDOR_DEPTH) this.pos.z = 50;
  }
}
