let params = {
  fps: 0,
  drawCount: 0,

  initRate: 60,
  initSpeed: 8.6,
  spread: 5,
  gravity: 0.4,
  curveForce: 0.22,
  vel: 0.02,

  flowStrength: 0.1,
  flowScale: 0.03,
  flowSpeed: 0.02,
};

const WORLD_SIZE = 2000;
const WORLD_HALF = WORLD_SIZE / 2;
const MAX_PARTICLE_NUMBER = 10000;

const SPHERE_RADIUS = 40;
const INIT_RADIUS = 15;

let pointCloud;
let particles = [];

// ======================================================
// SETUP
// ======================================================

function setupThree() {

  // Points
  pointCloud = getPoints();
  scene.add(pointCloud);

  // GUI
  pane.addBinding(params, "drawCount", {
    min: 0,
    max: MAX_PARTICLE_NUMBER,
    step: 1,
    readonly: true,
  });

  pane.addBinding(params, "initRate", {
    min: 1,
    max: 150,
    step: 1,
  });

  pane.addBinding(params, "initSpeed", {
    min: 1,
    max: 15,
    step: 0.1,
  });

  pane.addBinding(params, "spread", {
    min: 0,
    max: 8,
    step: 0.1,
  });

  pane.addBinding(params, "gravity", {
    min: 0,
    max: 0.8,
    step: 0.005,
  });

  pane.addBinding(params, "curveForce", {
    min: 0,
    max: 0.5,
    step: 0.005,
  });

  pane.addBinding(params, "vel", {
    min: 0,
    max: 0.05,
    step: 0.001,
  });

  pane.addBinding(params, "flowStrength", {
    min: 0,
    max: 0.5,
    step: 0.005,
  });

  pane.addBinding(params, "flowScale", {
    min: 0.001,
    max: 0.05,
    step: 0.001,
  });

  pane.addBinding(params, "flowSpeed", {
    min: 0.001,
    max: 0.03,
    step: 0.001,
  });
}


// ======================================================
// UPDATE
// ======================================================

function updateThree() {

  frame++;

  // Generate particles
  for (let i = 0; i < params.initRate; i++) {

    if (particles.length >= MAX_PARTICLE_NUMBER) {
      break;
    }

    let direction = i % 2 === 0 ? 1 : -1;

    let tParticle = new Particle()
      .setInitPosition(direction);

    particles.push(tParticle);
  }

  // Update particles
  for (let i = 0; i < particles.length; i++) {

    let p = particles[i];

    // Outward generation force
    p.initForce();

    // Attraction toward sphere center
    p.attractedTo(0, 0, 0);

    // Curved motion
    p.curveForce();

    // Vertical noise flow
    p.flow();

    // Update movement
    p.updatePosition();
    p.adjustVelocity(-params.vel);

    // Life
    p.updateLifespan();
    p.updateScale();

    // Remove particles when lifespan ends
    if (p.isDone) {
      particles.splice(i, 1);
      i--;
    }
  }

  // Update point positions and colors
  let positionArray =
    pointCloud.geometry.attributes.position.array;

  let colorArray =
    pointCloud.geometry.attributes.color.array;

  for (let i = 0; i < particles.length; i++) {

    let p = particles[i];
    let ptIndex = i * 3;

    // Position
    positionArray[ptIndex + 0] = p.pos.x;
    positionArray[ptIndex + 1] = p.pos.y;
    positionArray[ptIndex + 2] = p.pos.z;

    // Lifespan-based color transition
    let t = 1.0 - p.lifespan;

    // Smooth transition
    t = t * t * (3 - 2 * t);

    let innerColor = new THREE.Color("#c8e839");
    let middleColor = new THREE.Color("#D4B3CA");
    let outerColor = new THREE.Color("#F38B2B");

    let finalColor = new THREE.Color();

    if (t < 0.5) {

      finalColor.copy(innerColor).lerp(
        middleColor,
        t * 2
      );

    } else {

      finalColor.copy(middleColor).lerp(
        outerColor,
        (t - 0.5) * 2
      );
    }

    colorArray[ptIndex + 0] = finalColor.r;
    colorArray[ptIndex + 1] = finalColor.g;
    colorArray[ptIndex + 2] = finalColor.b;
  }

  pointCloud.geometry.setDrawRange(
    0,
    particles.length
  );

  pointCloud.geometry.attributes.position.needsUpdate = true;
  pointCloud.geometry.attributes.color.needsUpdate = true;

  params.drawCount = particles.length;
}


// ======================================================
// POINTS
// ======================================================

function getPoints() {

  const geometry = new THREE.BufferGeometry();

  const vertices = [];
  const colors = [];

  // Initialize particle positions and colors
  for (let i = 0; i < MAX_PARTICLE_NUMBER; i++) {
    vertices.push(0, 0, 0);
    colors.push(1.0, 1.0, 1.0);
  }

  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(vertices, 3)
  );

  geometry.setAttribute(
    "color",
    new THREE.Float32BufferAttribute(colors, 3)
  );

  geometry.getAttribute("position").setUsage(
    THREE.DynamicDrawUsage
  );

  geometry.getAttribute("color").setUsage(
    THREE.DynamicDrawUsage
  );

  geometry.setDrawRange(0, 0);

  const texture = new THREE.TextureLoader().load(
    "assets/particle-texture.jpg"
  );

  const material = new THREE.PointsMaterial({
    vertexColors: true,
    size: 5,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.8,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    map: texture,
  });

  const points = new THREE.Points(
    geometry,
    material
  );

  points.frustumCulled = false;

  return points;
}


// ======================================================
// PARTICLE CLASS
// ======================================================

class Particle {

  constructor() {

    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.acc = new THREE.Vector3();

    this.baseScl = new THREE.Vector3(1, 1, 1);
    this.scl = this.baseScl.clone();

    this.mass = 1;

    this.rot = new THREE.Vector3();
    this.rotVel = new THREE.Vector3();
    this.rotAcc = new THREE.Vector3();

    this.lifespan = 1.0;
    this.lifeReduction = random(0.0015, 0.003);
    this.isDone = false;

    this.direction = 1;
    this.age = 0;
    this.angle = 0;
  }


  // ==================================================
  // POSITION & VELOCITY
  // ==================================================

  setPosition(x, y, z) {
    this.pos.set(x, y, z);
    return this;
  }

  setVelocity(x, y, z) {
    this.vel.set(x, y, z);
    return this;
  }


  // ==================================================
  // INITIAL POSITION
  // ==================================================

  setInitPosition(direction) {

    this.direction = direction;

    this.angle = random(0, Math.PI * 2);

    let radius =
      Math.sqrt(random()) * INIT_RADIUS;

    let x =
      Math.cos(this.angle) * radius;

    let z =
      Math.sin(this.angle) * radius;

    let y =
      direction * SPHERE_RADIUS;

    this.setPosition(x, y, z);

    // Initial radial expansion
    let radialSpeed =
      random(params.spread * 0.5, params.spread);

    // Initial outward generation
    let verticalSpeed =
      random(
        params.initSpeed * 0.8,
        params.initSpeed * 1.2
      );

    this.setVelocity(
      Math.cos(this.angle) * radialSpeed,
      direction * verticalSpeed,
      Math.sin(this.angle) * radialSpeed
    );

    return this;
  }


  // ==================================================
  // MASS
  // ==================================================

  setMass(mass) {

    if (mass) {
      this.mass = mass;
    } else {
      this.mass = 1 +
        (
          this.baseScl.x *
          this.baseScl.y *
          this.baseScl.z
        ) * 0.000001;
    }

    return this;
  }


  // ==================================================
  // MOVEMENT
  // ==================================================

  updatePosition() {

    this.vel.add(this.acc);
    this.pos.add(this.vel);

    this.acc.set(0, 0, 0);
  }

  adjustVelocity(amount) {
    this.vel.multiplyScalar(1 + amount);
  }

  applyForce(f) {

    if (this.mass > 0) {
      this.acc.addScaledVector(f, 1 / this.mass);
    }
  }


  // ==================================================
  // INIT FORCE
  // ==================================================

  initForce() {

    this.age++;

    // Strong at birth, gradually decreases
    let strength = Math.max(
      0,
      1 - this.age / 100
    );

    let force = new THREE.Vector3(
      Math.cos(this.angle) * 0.02 * strength,
      this.direction * 0.1 * strength,
      Math.sin(this.angle) * 0.02 * strength
    );

    this.applyForce(force);
  }


  // ==================================================
  // GRAVITY
  // ==================================================

  attractedTo(x, y, z) {

    let target = new THREE.Vector3(x, y, z);
    let force = target.clone().sub(this.pos);
    let distance = force.length();
    if (distance < 0.001 || params.gravity <= 0) {
      return;
    }

    force.normalize();

    // Gravity gradually increases with distance
    let gravityStrength = THREE.MathUtils.mapLinear(
      distance,
      SPHERE_RADIUS,
      WORLD_HALF,
      0.01,
      params.gravity
    );

    gravityStrength = THREE.MathUtils.clamp(
      gravityStrength,
      0.01,
      Math.max(0.01, params.gravity)
    );

    force.multiplyScalar(gravityStrength);

    this.applyForce(force);
  }


  // ==================================================
  // CURVE FORCE
  // ==================================================

  curveForce() {

    // Curve direction around Y axis
    let curve = new THREE.Vector3(
      -Math.sin(this.angle),
      0,
      Math.cos(this.angle)
    );

    // Stronger during expansion
    let strength = Math.max(
      0,
      1 - this.age / 300
    );

    curve.multiplyScalar(
      params.curveForce * strength
    );

    this.applyForce(curve);
  }


  // ==================================================
  // VERTICAL NOISE FLOW
  // ==================================================

  flow() {

    let yFreq =
      this.pos.y * params.flowScale
      + frame * params.flowSpeed;

    let noiseValue = map(
      noise(yFreq),
      0, 1, -1, 1
    );

    let force = new THREE.Vector3(
      0,
      noiseValue * params.flowStrength,
      0
    );

    this.applyForce(force);
  }


  // ==================================================
  // LIFESPAN
  // ==================================================

  updateLifespan() {

    this.lifespan -= this.lifeReduction;

    if (this.lifespan <= 0) {
      this.lifespan = 0;
      this.isDone = true;
    }
  }

  updateScale() {

    this.scl.set(
      this.baseScl.x * this.lifespan,
      this.baseScl.y * this.lifespan,
      this.baseScl.z * this.lifespan
    );
  }
}
