let params = {
  fps: 0,

  // Mushrooms
  single2Scale: 360,
  bellScale: 1200,
  bell2Scale: 850,
  mushroomRotation: 0.01,
  // Mushroom animation
  mushroomMinScale: 0,
  mushroomMaxScale: 700,
  mushroomScaleSpeed: 0.002,

  // Sprites
  spriteSpawnInterval: 60,
  spriteSize: 350,
  spriteOpacity: 0.9,
  spriteSpeed: 1.5,
  spriteLifespan: 500,

  // Ripple
  drawCount: 0,
  speed: 1.5,
  emissionRate: 250,
  waveInterval: 50,
  attraction: 0.02,
  particleSize: 8,
  opacity: 0.6,

  // Waterfall
  waterCount: 0,
  waterEmissionRate: 8,
  waterParticleSize: 4,
  waterOpacity: 0.6,

// Magnetic Flow Field
initRate: 10,
initSpeed: 2,
spread: 2,

flowScale: 0.005,
flowSpeed: 0.005,
flowStrength: 1.2,
flowLerp: 0.04,

// Sprite splitting
spriteSplitChance: 0.7,  // 60% of sprites will split
spriteSplitSize: 0.7,    // Size of each child
spriteSplitSpeed: 0.8,   // Separation speed
};

const MAX_PARTICLE_NUMBER = 6000;
const MAX_WATER_PARTICLES = 3000;
const MAX_MAGNET_PARTICLES = 14000;

const MAX_RADIUS = 850;
const FADE_START = 550;
const SPRITE_BOUNDARY = 1500;

const SOURCE_DISTANCE = 680;
const INIT_RADIUS = 50;
const WORLD_HALF = 2500;

let spriteFrame = 0;
let rippleFrame = 0;

let sprites = [];
let particles = [];
let waterfall = [];
let magnetParticles = [];

let spriteTexture;
let backgroundTexture;
let singleMushroom2, bellMushroom, bellMushroom2;
let palm, palm2;

let pointCloudRipple;
let pointCloudWater;
let pointCloudMagnet;

// ======================================================
// SETUP
// ======================================================

function setupThree() {

  camera.position.set(-100, 700, 1000);
  controls.target.set(0, 150, 0);
  camera.lookAt(controls.target);

  controls.update();

  // Background
  loadBackground("js/assets/mistybg.png");

  // Lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 1);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
  directionalLight.position.set(0, 100, 0);
  scene.add(directionalLight);

  // Sprites
  spriteTexture = new THREE.TextureLoader().load("js/assets/Sprite.png");
  spriteTexture.colorSpace = THREE.SRGBColorSpace;

  // Models
  loadGLTF("js/assets/singleMushroom.glb", "single2");
  loadGLTF("js/assets/BellMushroom.glb", "bell");
  loadGLTF("js/assets/flatMushroom.glb", "bell2");
  loadGLTF("js/assets/newPalm.glb", "palm");
  loadGLTF("js/assets/newPalm.glb", "palm2");

  // Particle systems
  pointCloudRipple = getRipplePoints();
  pointCloudWater = getWaterPoints();
  pointCloudMagnet = getMagnetPoints();

  scene.add(pointCloudRipple, pointCloudWater, pointCloudMagnet);

  // GUI: Sprites
  const spriteFolder = pane.addFolder({
    title: "SPRITES",
    expanded: true
  });

  spriteFolder.addBinding(params, "spriteSpawnInterval", {
    min: 10, max: 300, step: 10
  });
  spriteFolder.addBinding(params, "spriteSize", {
    min: 50, max: 1200, step: 10
  });
  spriteFolder.addBinding(params, "spriteOpacity", {
    min: 0, max: 1, step: 0.05
  });
  spriteFolder.addBinding(params, "spriteSpeed", {
    min: 0, max: 5, step: 0.1
  });
  spriteFolder.addBinding(params, "spriteLifespan", {
    min: 50, max: 1000, step: 10
  });

  // GUI: Mushrooms
  const mushroomFolder = pane.addFolder({
    title: "MUSHROOM",
    expanded: true
  });

  mushroomFolder.addBinding(params, "bellScale", {
    min: 10, max: 1500, step: 10
  });
  mushroomFolder.addBinding(params, "mushroomRotation", {
    min: 0, max: 0.05, step: 0.001
  });

  // GUI: Ripple
  const rippleFolder = pane.addFolder({
    title: "RIPPLE",
    expanded: true
  });

  rippleFolder.addBinding(params, "speed", {
    min: 0.5, max: 6, step: 0.1
  });
  rippleFolder.addBinding(params, "emissionRate", {
    min: 50, max: 300, step: 10
  });
  rippleFolder.addBinding(params, "waveInterval", {
    min: 20, max: 100, step: 1
  });
  rippleFolder.addBinding(params, "opacity", {
    min: 0.1, max: 1, step: 0.05
  });

}

// ======================================================
// UPDATE
// ======================================================

function updateThree() {
  frame++;
  spriteFrame++;

// ---------------- SPRITES ----------------

// Generate new sprites continuously
if (spriteFrame % params.spriteSpawnInterval === 0) {
  const sprite = new MovingSprite();

  sprites.push(sprite);
  scene.add(sprite.mesh);
}

// Update sprites
for (let i = sprites.length - 1; i >= 0; i--) {
  const sprite = sprites[i];

  sprite.move();

  const shouldSplit = sprite.updateLifespan();

  // Split into two sprites
  if (shouldSplit) {
    const children = sprite.split();

    for (const child of children) {
      sprites.push(child);
      scene.add(child.mesh);
    }
  }

  // Remove expired or split parent sprite
  if (sprite.isDone) {
    scene.remove(sprite.mesh);
    sprite.mesh.material.dispose();
    sprites.splice(i, 1);
  }
}

// ---------------- MUSHROOMS ----------------

updateMushroom(bellMushroom, 0);
updateMushroom(bellMushroom2, 2);
updateMushroom(singleMushroom2, 4);

  // ---------------- RIPPLE ----------------

  rippleFrame++;

  if ((rippleFrame - 1) % params.waveInterval === 0) {
    const available = MAX_PARTICLE_NUMBER - particles.length;
    const count = Math.min(params.emissionRate, available);

    for (let i = 0; i < count; i++) {
      const angle =
        TWO_PI * i / params.emissionRate +
        random(-0.015, 0.015);

      const p = new Particle()
        .setPosition(random(-5, 5), 0, random(-5, 5))
        .setVelocity(0, 0, 0);

      p.angle = angle;
      particles.push(p);
    }
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];

    p.ripple();
    p.updatePosition();
    p.adjustVelocity(-0.12);
    p.updateLifespan();

    if (p.isDone) particles.splice(i, 1);
  }

  updatePointCloud(pointCloudRipple, particles);

  pointCloudRipple.material.size = params.particleSize;
  pointCloudRipple.material.opacity = params.opacity;
  params.drawCount = particles.length;

  // ---------------- WATERFALL ----------------

  for (let i = 0; i < params.waterEmissionRate; i++) {
    if (waterfall.length < MAX_WATER_PARTICLES) {
      const p1 = new WaterParticle()
        .setPosition(
          -240 + random(-10, 10),
          600 + random(-5, 5),
          random(-10, 10)
        )
        .setVelocity(
          2.5 + random(-0.3, 0.3),
          0.5 + random(-0.2, 0.2),
          random(0.1, 0.5)
        );

      p1.target = new THREE.Vector3(250, 100, 0);
      waterfall.push(p1);
    }

    if (waterfall.length < MAX_WATER_PARTICLES) {
      const p2 = new WaterParticle()
        .setPosition(
          250 + random(-10, 10),
          250 + random(-5, 5),
          random(35, 45)
        )
        .setVelocity(
          -1.5 + random(-0.3, 0.3),
          1.2 + random(-0.2, 0.2),
          0.5 + random(0.1, 0.5)
        );

      p2.target = new THREE.Vector3(-240, 550, 0);
      waterfall.push(p2);
    }
  }

  for (let i = waterfall.length - 1; i >= 0; i--) {
    const p = waterfall[i];

    p.gravity();
    p.attractedTo(p.target.x, p.target.y, p.target.z);
    p.drag();
    p.updatePosition();
    p.updateLifespan();

    if (p.isDone) waterfall.splice(i, 1);
  }

  updatePointCloud(pointCloudWater, waterfall);

  pointCloudWater.material.size = params.waterParticleSize;
  pointCloudWater.material.opacity = params.waterOpacity;
  params.waterCount = waterfall.length;

  // ---------------- MAGNETIC ----------------

for (let i = 0; i < params.initRate; i++) {

  if (magnetParticles.length >= MAX_MAGNET_PARTICLES) {
    break;
  }

  magnetParticles.push(new MagnetParticle());

}

  for (let i = magnetParticles.length - 1; i >= 0; i--) {
    const p = magnetParticles[i];

p.flow();
p.updatePosition();
p.updateLifespan();

    if (p.isDone) magnetParticles.splice(i, 1);
  }

updatePointCloud(pointCloudMagnet, magnetParticles);
}

function updateMushroom(mushroom, offset) {
  if (!mushroom) return;

  const t = frame * params.mushroomScaleSpeed + offset;
  const cycle = Math.floor(t / TWO_PI);

  // Initialize
  if (mushroom.lastCycle === undefined) {
    mushroom.lastCycle = cycle;
    mushroom.randomMaxScale = random(800, 1000);
  }

  // New cycle
  if (cycle !== mushroom.lastCycle) {
    mushroom.position.set(
      random(-800, 800),
      0,
      random(-800, 200)
    );

    // Generate a new maximum scale
    mushroom.randomMaxScale = random(800, 1000);

    mushroom.lastCycle = cycle;
  }

  // Growth animation
  const factor = (1 - cos(t)) / 2;

  const scale = THREE.MathUtils.lerp(
    params.mushroomMinScale,
    mushroom.randomMaxScale,
    factor
  );

  mushroom.scale.setScalar(scale);
  mushroom.rotation.y += params.mushroomRotation;
}

// ======================================================
// BACKGROUND
// ======================================================

function loadBackground(filepath) {
  backgroundTexture = new THREE.TextureLoader().load(
    filepath,
    undefined,
    undefined,
    err => console.error("Failed to load background:", err)
  );

  backgroundTexture.colorSpace = THREE.SRGBColorSpace;
  backgroundTexture.mapping = THREE.EquirectangularReflectionMapping;

  scene.background = backgroundTexture;
}

// ======================================================
// LOAD GLTF
// ======================================================

function loadGLTF(filepath, type) {
  const loader = new GLTFLoader();

  loader.load(filepath, function (gltfData) {
    const model = gltfData.scene;

    if (type === "single2") {
      singleMushroom2 = model;
      model.position.set(-600, 0, -300);
      model.scale.setScalar(params.single2Scale);

    } else if (type === "bell") {
      bellMushroom = model;
      model.position.set(400, 0, -600);
      model.scale.setScalar(params.bellScale);

    } else if (type === "bell2") {
      bellMushroom2 = model;
      model.position.set(500, 0, -400);
      model.scale.setScalar(params.bell2Scale);

    } else if (type === "palm") {
      palm = model;
      model.position.set(350, 150, 0);
      model.scale.set(-700, -700, 700);
      model.rotation.x = THREE.MathUtils.degToRad(180);
      model.rotation.y = THREE.MathUtils.degToRad(-20);
      model.rotation.z = THREE.MathUtils.degToRad(-5);

    } else if (type === "palm2") {
      palm2 = model;
      model.position.set(-350, 550, 0);
      model.scale.set(-700, 700, -700);
      model.rotation.y = THREE.MathUtils.degToRad(180);
      model.rotation.z = THREE.MathUtils.degToRad(10);
    }

    scene.add(model);
    console.log("Model loaded:", filepath, type);

  }, undefined, err => {
    console.error("Failed to load GLTF:", filepath, err);
  });
}

// ======================================================
// POINT CLOUDS
// ======================================================

function createPointCloud(maxCount, material) {
  const geometry = new THREE.BufferGeometry();

  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array(maxCount * 3), 3)
  );

  geometry.setAttribute(
    "color",
    new THREE.BufferAttribute(new Float32Array(maxCount * 3), 3)
  );

  geometry.attributes.position.setUsage(THREE.DynamicDrawUsage);
  geometry.attributes.color.setUsage(THREE.DynamicDrawUsage);
  geometry.setDrawRange(0, 0);

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;

  return points;
}

function getRipplePoints() {
  const texture = new THREE.TextureLoader().load(
    "js/assets/par1.jpeg"
  );

  texture.colorSpace = THREE.SRGBColorSpace;

  const material = new THREE.PointsMaterial({
    map: texture,
    vertexColors: true,
    color: 0xdce6c8,
    size: params.particleSize,
    sizeAttenuation: false,
    transparent: true,
    opacity: params.opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  return createPointCloud(MAX_PARTICLE_NUMBER, material);
}

function getWaterPoints() {
    const texture = new THREE.TextureLoader().load(
    "js/assets/par2.jpeg"
  );
    texture.colorSpace = THREE.SRGBColorSpace;

  const material = new THREE.PointsMaterial({
    map: texture,
    color: 0xdce6c8,
    vertexColors: false,
    size: params.waterParticleSize,
    sizeAttenuation: false,
    transparent: true,
    opacity: params.waterOpacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  return createPointCloud(MAX_WATER_PARTICLES, material);
}

function getMagnetPoints() {

  const texture = new THREE.TextureLoader().load(
    "js/assets/magnet.jpeg"
  );

  texture.colorSpace = THREE.SRGBColorSpace;

  const material = new THREE.PointsMaterial({
    map: texture,
    color: 0xdce6c8,
    size: 6,
    sizeAttenuation: false,
    transparent: true,
    opacity: 0.4,
    depthWrite: false,
    vertexColors: true, // FIX: disable vertex colors
    blending: THREE.AdditiveBlending
  });

  return createPointCloud(MAX_MAGNET_PARTICLES, material);
}

function updatePointCloud(pointCloud, particleArray) {

  const positions = pointCloud.geometry.attributes.position.array;
  const colors = pointCloud.geometry.attributes.color.array;

  for (let i = 0; i < particleArray.length; i++) {

    const p = particleArray[i];
    const index = i * 3;

    // Position
    positions[index] = p.pos.x;
    positions[index + 1] = p.pos.y;
    positions[index + 2] = p.pos.z;

    // Vertex color brightness
    const brightness = THREE.MathUtils.clamp(
      p.lifespan,
      0,
      1
    );

    colors[index] = brightness;
    colors[index + 1] = brightness;
    colors[index + 2] = brightness;
  }

  // Update visible particle count
  pointCloud.geometry.setDrawRange(
    0,
    particleArray.length
  );

  // Update GPU buffers
  pointCloud.geometry.attributes.position.needsUpdate = true;
  pointCloud.geometry.attributes.color.needsUpdate = true;
}

// ======================================================
// RIPPLE PARTICLE
// ======================================================

class Particle {
  constructor() {
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.acc = new THREE.Vector3();

    this.mass = 1;
    this.isDone = false;

    this.angle = random(TWO_PI);
    this.targetRadius = 0;
    this.radiusOffset = random(-10, 10);

    this.lifespan = 1;
    this.lifeReduction = random(0.008, 0.01);
  }

  setPosition(x, y, z) {
    this.pos.set(x, y, z);
    return this;
  }

  setVelocity(x, y, z) {
    this.vel.set(x, y, z);
    return this;
  }

  updatePosition() {
    this.vel.add(this.acc);
    this.pos.add(this.vel);
    this.acc.set(0, 0, 0);
  }

  adjustVelocity(amount) {
    this.vel.multiplyScalar(1 + amount);
  }

  ripple() {
    this.targetRadius += params.speed;

    const radius = this.targetRadius + this.radiusOffset;
    const targetX = cos(this.angle) * radius;
    const targetZ = sin(this.angle) * radius;

    this.acc.x += (targetX - this.pos.x) * params.attraction;
    this.acc.z += (targetZ - this.pos.z) * params.attraction;
  }

  updateLifespan() {
    if (this.targetRadius > FADE_START) {
      this.lifespan = max(
        0,
        this.lifespan - this.lifeReduction
      );
    }

    if (this.lifespan <= 0 || this.targetRadius >= MAX_RADIUS) {
      this.isDone = true;
    }
  }
}

// ======================================================
// WATERFALL PARTICLE
// ======================================================

class WaterParticle {
  constructor() {
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.acc = new THREE.Vector3();

    this.mass = 1;
    this.lifespan = 1;
    this.lifeReduction = random(0.005, 0.006);
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

  applyForce(force) {
    this.acc.addScaledVector(force, 1 / this.mass);
  }

  gravity() {
    this.applyForce(new THREE.Vector3(0, -0.025, 0));
  }

  attractedTo(x, y, z) {
    const direction = new THREE.Vector3(x, y, z).sub(this.pos);
    const distance = direction.length();

    if (distance < 350 && distance > 1) {
      direction.normalize();

      const strength = THREE.MathUtils.mapLinear(
        distance, 0, 350, 0.025, 0.003
      );

      this.applyForce(direction.multiplyScalar(strength));
    }
  }

  drag() {
    this.vel.multiplyScalar(0.999);
  }

  updatePosition() {
    this.vel.add(this.acc);
    this.pos.add(this.vel);
    this.acc.set(0, 0, 0);
  }

  updateLifespan() {
    this.lifespan -= this.lifeReduction;

    if (this.lifespan <= 0) {
      this.lifespan = 0;
      this.isDone = true;
    }
  }
}

// ======================================================
// SPRITES
// ======================================================

function getSprite() {
  const material = new THREE.SpriteMaterial({
    map: spriteTexture,
    color: 0xffffff,
    transparent: true,
    opacity: params.spriteOpacity,
    depthTest: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  return new THREE.Sprite(material);
}

// ======================================================
// SPRITES
// ======================================================

class MovingSprite {
  constructor() {
    this.mesh = getSprite();

    // Split settings
this.age = 0;
this.splitTime = random(180, 300);
this.willSplit = random() < params.spriteSplitChance;
this.hasSplit = false;
this.generation = 0;

    // Initial opacity: invisible
    this.mesh.material.opacity = 0;

    this.pos = new THREE.Vector3(
      random(-1000, 1000),
      random(100, 1200),
      random(-1000, 1000)
    );

    this.vel = new THREE.Vector3(
      random(-1, 1),
      random(-1, 1),
      random(-1, 1)
    ).normalize().multiplyScalar(random(0.5, 1.5));

    this.sizeFactor = random(0.5, 1.0);
    this.phase = random(TWO_PI);

    // Lifespan
    this.lifespan = params.spriteLifespan;
    this.maxLifespan = params.spriteLifespan;

    this.isDone = false;

    this.mesh.position.copy(this.pos);

    const size = params.spriteSize * this.sizeFactor;
    this.mesh.scale.set(size, size, 1);
  }

  // ==================================================
  // MOVEMENT
  // ==================================================

  move() {
    const t = spriteFrame * 0.01 + this.phase;

    this.pos.addScaledVector(this.vel, params.spriteSpeed);

    this.mesh.position.set(
      this.pos.x + sin(t) * 10,
      this.pos.y + cos(t * 0.7) * 10,
      this.pos.z + sin(t * 0.5) * 10
    );

    const size = params.spriteSize * this.sizeFactor;
    this.mesh.scale.set(size, size, 1);
  }

  split() {
  if (this.hasSplit) return [];

  this.hasSplit = true;
  this.isDone = true;

  const children = [];

  const splitDirection = new THREE.Vector3(
    random(-1, 1),
    random(-1, 1),
    random(-1, 1)
  ).normalize();

  for (let i = 0; i < 2; i++) {
    const sign = i === 0 ? -1 : 1;

    const child = new MovingSprite();

    // Inherit parent position
    child.pos.copy(this.pos);

    // Inherit parent velocity + separation
    child.vel.copy(this.vel).add(
      splitDirection.clone().multiplyScalar(
        sign * params.spriteSplitSpeed
      )
    );

    // Smaller children
    child.sizeFactor =
      this.sizeFactor * params.spriteSplitSize;

    // Children won't split again
    child.generation = this.generation + 1;
    child.willSplit = false;

    // Update initial appearance
    child.mesh.position.copy(child.pos);

    const size = params.spriteSize * child.sizeFactor;
    child.mesh.scale.set(size, size, 1);

    children.push(child);
  }

  return children;
}

  // ==================================================
  // FADE IN / FADE OUT
  // ==================================================

updateLifespan() {
  this.lifespan--;
  this.age++;

  // Split at a random moment
  if (
    this.willSplit &&
    !this.hasSplit &&
    this.age >= this.splitTime
  ) {
    return true;
  }

    // Progress: 0 = born, 1 = end of life
    const progress = THREE.MathUtils.clamp(
      1 - this.lifespan / this.maxLifespan,
      0,
      1
    );

    let opacity = 1;

    // Fade in: first 30%
    if (progress < 0.3) {
      opacity = progress / 0.3;
    }

    // Fade out: last 30%
    else if (progress > 0.7) {
      opacity = (1 - progress) / 0.3;
    }

    // Fully visible: middle 40%
    else {
      opacity = 1;
    }

    // Apply opacity
    this.mesh.material.opacity =
      THREE.MathUtils.clamp(opacity, 0, 1) *
      params.spriteOpacity;

    // Remove sprite
    if (
      this.lifespan <= 0 ||
      Math.abs(this.pos.x) > SPRITE_BOUNDARY ||
      Math.abs(this.pos.y) > SPRITE_BOUNDARY ||
      Math.abs(this.pos.z) > SPRITE_BOUNDARY
    ) {
      this.isDone = true;
    }
    return false;
  }
  
}

// ======================================================
// MAGNETIC FLOW FIELD PARTICLE
// ======================================================
class MagnetParticle {

  constructor() {

    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();

    this.isDone = false;

    this.lifespan = 2;
    this.lifeReduction = random(0.0006, 0.0008);

    // Random angle along Ripple outer ring
    this.angle = random(TWO_PI);

    // Spawn at outer edge of Ripple
    const radius = MAX_RADIUS - 80;

    this.pos.set(
      cos(this.angle) * radius,
      0,
      sin(this.angle) * radius
    );

    // Initial velocity: radially outward
    this.vel.set(
      cos(this.angle) * params.initSpeed,
      0,
      sin(this.angle) * params.initSpeed
    );

  }

  // ==================================================
  // FLOW FIELD
  // ==================================================

  flow() {

    const x = this.pos.x;
    const z = this.pos.z;

    // Perlin noise
    const n = noise(
      x * params.flowScale,
      z * params.flowScale,
      frame * params.flowSpeed
    );

    // Noise-driven angular offset
    const offset =
      (n - 0.5) * TWO_PI * params.flowStrength;

    // Current radial direction
    const radialAngle = Math.atan2(z, x);

    // Combine radial direction with noise
    const angle = radialAngle + offset;

    const targetVelocity = new THREE.Vector3(
      cos(angle),
      0,
      sin(angle)
    );

    targetVelocity.multiplyScalar(params.initSpeed);

    // Smooth steering
    this.vel.lerp(
      targetVelocity,
      params.flowLerp
    );

  }

  // ==================================================
  // MOVEMENT
  // ==================================================

  updatePosition() {

    this.pos.add(this.vel);
    this.pos.y = 0;

  }

  // ==================================================
  // LIFESPAN
  // ==================================================

  updateLifespan() {

    this.lifespan -= this.lifeReduction;

    if (
      this.lifespan <= 0 ||
      Math.abs(this.pos.x) > WORLD_HALF ||
      Math.abs(this.pos.z) > WORLD_HALF
    ) {
      this.isDone = true;
    }

  }

}