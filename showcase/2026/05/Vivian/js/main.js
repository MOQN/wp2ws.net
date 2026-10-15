let params = {
  fps: 0,
  density: 10000,
  pointSize: 14,
  opacity: 0.22,
  color: "#8aa4d6",
  spread: 0.18,
  gravity: 0,
  spin: 0.22,
  drift: 0.18,
  gather: 0.12,
  turbulence: 0.06,
  breathe: 0.55,
};


const WORLD_SIZE = 2000;
const WORLD_HALF = WORLD_SIZE / 2;
const MAX_PARTICLE_NUMBER = 15000;


let particles = [];
let pointCloud;
let drawCount = params.density;

const color = new THREE.Color();
const hsl = { h: 0, s: 0, l: 0 };


function setupThree() {
  scene.background = new THREE.Color(0x000000);
  renderer.setClearColor(0x000000);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  for (let i = 0; i < MAX_PARTICLE_NUMBER; i++) {
    let p = new Particle();
    placeInSphere(p, WORLD_HALF * 0.58);
    particles.push(p);
  }

  pointCloud = getPoints(particles);
  scene.add(pointCloud);

  camera.position.set(0, 40, 1080);
  controls.target.set(0, 0, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 80;
  controls.maxDistance = 2400;
  controls.update();

  buildGui();
}


function updateThree() {
  controls.update();

  drawCount = Math.floor(params.density);
  if (drawCount < 1) drawCount = 1;
  if (drawCount > particles.length) drawCount = particles.length;

  pointCloud.material.size = params.pointSize;
  pointCloud.material.opacity = params.opacity;

  let positionArray = pointCloud.geometry.attributes.position.array;
  let colorArray = pointCloud.geometry.attributes.color.array;

  for (let i = 0; i < drawCount; i++) {
    let p = particles[i];

    p.vel.multiplyScalar(0.985);
    p.fall(params.gravity);
    p.spinAround(params.spin, params.gather);
    if (params.gather > 0) {
      const ax = p.acc.x;
      const ay = p.acc.y;
      const az = p.acc.z;
      p.attractedTo(0, 0, 0);
      const pull = params.gather * 0.35;
      p.acc.x = ax + (p.acc.x - ax) * pull;
      p.acc.y = ay + (p.acc.y - ay) * pull;
      p.acc.z = az + (p.acc.z - az) * pull;
    }
    p.flow();
    p.pulse(params.breathe);
    if (params.gravity < 0.2) p.contain();
    p.updatePosition();
    if (params.gravity > 0.03) p.recycle();
    p.age += 0.004;

    let ptIndex = i * 3;
    positionArray[ptIndex + 0] = p.pos.x;
    positionArray[ptIndex + 1] = p.pos.y;
    positionArray[ptIndex + 2] = p.pos.z;
    writeColor(p, colorArray, ptIndex);
  }

  pointCloud.geometry.attributes.position.needsUpdate = true;
  pointCloud.geometry.attributes.color.needsUpdate = true;
  pointCloud.geometry.setDrawRange(0, drawCount);
}


function buildGui() {
  const folder = pane.addFolder({ title: "Particles" });

  bindSlider(folder, "gravity", "Gravity", 0, 2);
  bindSlider(folder, "spin", "Spin", 0, 2);
  bindSlider(folder, "drift", "Drift", 0, 1.5);
  bindSlider(folder, "gather", "Gather", 0, 1.5);
  bindSlider(folder, "turbulence", "Turbulence", 0, 1.5);
  bindSlider(folder, "breathe", "Breathe", 0, 1.5);

  folder.addBlade({ view: "separator" });

  folder.addBinding(params, "color", { label: "Color" });
  bindSlider(folder, "spread", "Spread", 0, 1);

  folder.addBlade({ view: "separator" });

  folder.addBinding(params, "density", {
    label: "Density",
    min: 2000,
    max: MAX_PARTICLE_NUMBER,
    step: 100,
  });
  bindSlider(folder, "pointSize", "Size", 5, 25);
  bindSlider(folder, "opacity", "Brightness", 0.05, 1);
}


function bindSlider(folder, key, label, min, max) {
  folder.addBinding(params, key, {
    label: label,
    min: min,
    max: max,
    step: 0.01,
  });
}


function placeInSphere(p, radius) {
  const r = radius * Math.cbrt(random());
  const theta = random(Math.PI * 2);
  const phi = Math.acos(random() * 2 - 1);
  p.pos.x = r * Math.sin(phi) * Math.cos(theta);
  p.pos.y = r * Math.sin(phi) * Math.sin(theta);
  p.pos.z = r * Math.cos(phi);
}


function getPoints(objects) {
  const vertices = new Float32Array(objects.length * 3);
  const colors = new Float32Array(objects.length * 3);

  for (let i = 0; i < objects.length; i++) {
    let p = objects[i];
    vertices[i * 3 + 0] = p.pos.x;
    vertices[i * 3 + 1] = p.pos.y;
    vertices[i * 3 + 2] = p.pos.z;
    colors[i * 3 + 0] = 0.4;
    colors[i * 3 + 1] = 0.5;
    colors[i * 3 + 2] = 0.8;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setDrawRange(0, drawCount);

  const material = new THREE.PointsMaterial({
    size: params.pointSize,
    map: createPointTexture(),
    vertexColors: true,
    transparent: true,
    opacity: params.opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  });

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  return points;
}


function createPointTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, 64, 64);
  ctx.beginPath();
  ctx.arc(32, 32, 24, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}


function writeColor(p, colorArray, ptIndex) {
  color.set(params.color);
  color.getHSL(hsl);

  let hue = hsl.h + (p.hueOffset - 0.5) * params.spread;
  hue = hue - Math.floor(hue);

  const twinkle = 0.82 + 0.18 * Math.sin(frame * 0.05 + p.phase);
  let light = hsl.l * p.shade * twinkle;
  if (light > 0.85) light = 0.85;

  color.setHSL(hue, hsl.s, light);
  colorArray[ptIndex + 0] = color.r;
  colorArray[ptIndex + 1] = color.g;
  colorArray[ptIndex + 2] = color.b;
}




///// CLASS /////


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
    this.lifeReduction = random(0.001, 0.005);
    this.isDone = false;

    this.phase = random(Math.PI * 2);
    this.age = random(1);
    this.homeY = random(-1, 1);
    this.nx = 0;
    this.ny = 0;
    this.nz = 0;
    this.noiseTimer = Math.floor(random(6));

    this.hueOffset = random();
    this.shade = random(0.45, 1);
  }
  setPosition(x, y, z) {
    this.pos = new THREE.Vector3(x, y, z);
    return this;
  }
  setVelocity(x, y, z) {
    this.vel = new THREE.Vector3(x, y, z);
    return this;
  }
  setRotationAngle(x, y, z) {
    this.rot = new THREE.Vector3(x, y, z);
    return this;
  }
  setRotationVelocity(x, y, z) {
    this.rotVel = new THREE.Vector3(x, y, z);
    return this;
  }
  setScale(w, h = w, d = w) {
    const minScale = 0.01;
    if (w < minScale) w = minScale;
    if (h < minScale) h = minScale;
    if (d < minScale) d = minScale;
    this.baseScl.set(w, h, d);
    this.scl.copy(this.baseScl);
    return this;
  }
  setMass(mass) {
    if (mass) {
      this.mass = mass;
    } else {
      this.mass = 1 + (this.baseScl.x * this.baseScl.y * this.baseScl.z) * 0.000001; // arbitrary
    }
    return this;
  }
  addForce(x, y, z) {
    if (this.mass > 0) {
      const invMass = 1 / this.mass;
      this.acc.x += x * invMass;
      this.acc.y += y * invMass;
      this.acc.z += z * invMass;
    } else {
      this.acc.x += x;
      this.acc.y += y;
      this.acc.z += z;
    }
  }
  updatePosition() {
    this.vel.add(this.acc);
    this.pos.add(this.vel);
    this.acc.set(0, 0, 0);
  }
  adjustVelocity(amount) {
    this.vel.multiplyScalar(1 + amount);
  }
  updateRotation() {
    this.rotVel.add(this.rotAcc);
    this.rot.add(this.rotVel);
    this.rotAcc.set(0, 0, 0);
  }
  applyForce(f) {
    let force = f.clone();
    if (this.mass > 0) {
      force.divideScalar(this.mass);
    }
    this.acc.add(force);
  }
  reappear() {
    if (this.pos.z > WORLD_HALF) {
      this.pos.z = -WORLD_HALF;
    }
  }
  disappear() {
    if (this.pos.z > WORLD_HALF) {
      this.isDone = true;
    }
  }
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
  attractedTo(x, y, z) {
    let target = new THREE.Vector3(x, y, z);
    let force = target.clone().sub(this.pos);
    if (force.length() < 100) {
      force.multiplyScalar(-0.005);
    } else {
      force.multiplyScalar(0.0001);
    }
    this.applyForce(force);
  }
  flow() {
    this.noiseTimer--;
    if (this.noiseTimer <= 0) {
      this.noiseTimer = 6;
      const freq = 0.0012 + params.turbulence * 0.005;
      const t = frame * 0.004;
      const noiseValue = map(
        noise(this.pos.x * freq + t, this.pos.y * freq, this.pos.z * freq),
        0.0,
        1.0,
        -1.0,
        1.0
      );
      const strength = noiseValue * params.drift * 0.22 * (1 + params.turbulence);
      const wx = cos(t + this.phase);
      const wy = sin(frame * 0.003 + this.phase);
      const wz = sin(frame * 0.002);
      const mag = Math.hypot(wx, wy, wz) || 1;
      this.nx = wx / mag * strength;
      this.ny = wy / mag * strength;
      this.nz = wz / mag * strength;
    }
    this.addForce(this.nx, this.ny, this.nz);
  }
  fall(gravity) {
    if (gravity <= 0) return;
    this.addForce(0, -gravity * 0.16, 0);

    const depth = (this.pos.y + WORLD_HALF) / WORLD_SIZE;
    const column = gravity * gravity * 0.000055 * Math.min(1, depth * 1.4);
    this.addForce(-this.pos.x * column, 0, -this.pos.z * column);

    if (depth < 0.2) {
      this.addForce(this.pos.x * gravity * 0.0003, gravity * 0.02, this.pos.z * gravity * 0.0003);
    }
  }
  spinAround(spin, gather) {
    if (spin <= 0) return;

    const dist = Math.hypot(this.pos.x, this.pos.z) + 1;
    const tx = -this.pos.z / dist;
    const tz = this.pos.x / dist;
    const spinSpeed = spin * 0.055;
    this.addForce(tx * spinSpeed, Math.sin(this.phase + frame * 0.02) * spin * 0.01, tz * spinSpeed);

    const vortex = Math.min(1, spin * gather);
    if (vortex > 0.15) {
      const targetR = 210 + Math.sin(this.phase * 2) * 70;
      const radial = (targetR - dist) * vortex * 0.0022;
      this.addForce((this.pos.x / dist) * radial, 0, (this.pos.z / dist) * radial);
      const yTarget = this.homeY * 80;
      this.addForce(0, (yTarget - this.pos.y) * vortex * 0.0016, 0);
    }
  }
  pulse(amount) {
    if (amount <= 0) return;
    const wave = Math.sin(frame * 0.008 + this.phase);
    const k = wave * amount * 0.00014;
    this.addForce(this.pos.x * k, this.pos.y * k, this.pos.z * k);
  }
  contain() {
    const r = this.pos.length();
    const limit = WORLD_HALF * 0.7;
    if (r <= limit) return;
    const k = (r - limit) * 0.004;
    this.addForce(-this.pos.x / r * k, -this.pos.y / r * k, -this.pos.z / r * k);
  }
  recycle() {
    if (this.pos.y > -WORLD_HALF * 0.92) return;

    this.pos.y = random(-WORLD_HALF * 0.15, WORLD_HALF * 0.9);
    this.age = 0;
    this.vel.y = random(-0.4, 0);

    if (params.gravity > params.spin) {
      this.pos.x = random(-240, 240);
      this.pos.z = random(-240, 240);
    } else {
      const angle = random(Math.PI * 2);
      const radius = 160 + Math.sin(this.phase) * 50;
      this.pos.x = Math.cos(angle) * radius;
      this.pos.z = Math.sin(angle) * radius;
    }
  }
}
