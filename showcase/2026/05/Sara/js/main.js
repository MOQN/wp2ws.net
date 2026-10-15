let params = {
  fps: 0,
  drawCount: 15000,
  ringRadius: 180,
  breathing: 20,
  speed: 1.5,
  innerColor: '#4055ff',
  brightness: 2,
};

const MAX_PARTICLE_NUMBER = 15000;
let pointCloud;
let particles = [];
let ringTime = 0;
let lastTime;
let simulationFrame = 0;
const FLOW_SAMPLE_INTERVAL = 4;

function setupThree() {
  camera.position.set(0, 0, 650);
  for (let i = 0; i < MAX_PARTICLE_NUMBER; i++) {
    let tParticle = new Particle();
    tParticle.flowPhase = i % FLOW_SAMPLE_INTERVAL;
    tParticle.followRing(0);
    tParticle.setPosition(tParticle.target.x, tParticle.target.y, tParticle.target.z)
      .setVelocity(0, 0, 0);
    tParticle.updateColor();
    particles.push(tParticle);
  }
  params.drawCount = particles.length;
  pointCloud = getPoints(particles);
  pointCloud.rotation.set(0, 0, 0);
  scene.add(pointCloud);

  pane.addBinding(params, 'drawCount', { min: 0, max: MAX_PARTICLE_NUMBER, step: 1 });
  pane.addBinding(params, 'ringRadius', { min: 150, max: 220 });
  pane.addBinding(params, 'breathing', { min: 10, max: 30 });
  pane.addBinding(params, 'speed', { min: 0, max: 2 });
  pane.addBinding(params, 'innerColor', { label: 'Inner Color', view: 'color' })
    .on('change', () => {
      for (let p of particles) p.innerColor.set(params.innerColor);
    });
  pane.addBinding(params, 'brightness', { label: 'Brightness', min: 1, max: 3 });
}

function updateThree() {
  let now = performance.now();
  let step = lastTime === undefined ? 0 : Math.min((now - lastTime) / 16.667, 2);
  lastTime = now;
  step *= params.speed;
  ringTime += step / 60;
  simulationFrame++;
  const activeCount = Math.max(0, Math.min(particles.length, Math.floor(params.drawCount)));
  const damping = Math.pow(0.92, step);

  for (let i = 0; i < activeCount; i++) {
    let p = particles[i];
    if (p.isDrifting) {
      p.flow(step);
    } else {
      p.followRing(step);
      p.attractedTo(p.target.x, p.target.y, p.target.z);
    }
    p.vel.multiplyScalar(damping);
    p.move(step);
    p.updateColor();
  }

  let positionArray = pointCloud.geometry.attributes.position.array;
  let colorArray = pointCloud.geometry.attributes.color.array;
  let breathing = Math.sin(ringTime * 1.1) * params.breathing;
  for (let i = 0; i < activeCount; i++) {
    let p = particles[i];
    let ptIndex = i * 3;
    let radius = Math.max(1, Math.hypot(p.pos.x, p.pos.y));
    let breathOffset = breathing * Math.exp(-Math.max(0, radius - params.ringRadius) / 180);
    let breathScale = 1 + breathOffset / radius;
    // x,y, z position
    positionArray[ptIndex + 0] = p.pos.x * breathScale;
    positionArray[ptIndex + 1] = p.pos.y * breathScale;
    positionArray[ptIndex + 2] = p.pos.z;
    // let angle = Math.atan2(p.pos.y, p.pos.x);
    // let swing =
    //   Math.sin(angle * 2 + ringTime * 0.7) * 22 +
    //   Math.sin(angle * 3 - ringTime * 0.4) * 8;
    // positionArray[ptIndex + 2] = p.pos.z + swing;
    colorArray[ptIndex + 0] = p.color.r;
    colorArray[ptIndex + 1] = p.color.g;
    colorArray[ptIndex + 2] = p.color.b;
  }
  pointCloud.geometry.setDrawRange(0, activeCount);
  pointCloud.geometry.attributes.position.needsUpdate = true;
  pointCloud.geometry.attributes.color.needsUpdate = true;
}

function getPoints(objects) {
  const vertices = [];
  const colors = [];
  for (let obj of objects) {
    vertices.push(obj.pos.x, obj.pos.y, obj.pos.z);
    colors.push(obj.color.r, obj.color.g, obj.color.b);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.attributes.position.setUsage(THREE.DynamicDrawUsage);
  geometry.attributes.color.setUsage(THREE.DynamicDrawUsage);
  const drawCount = objects.length;
  geometry.setDrawRange(0, drawCount);

  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 32;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(16, 16, 0, 16, 16, 16);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.3, 'rgba(255,255,255,0.85)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 32, 32);

  const material = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 3.0,
    map: new THREE.CanvasTexture(canvas),
    vertexColors: true,
    transparent: true,
    opacity: 1,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  return points;
}

class Particle {
  constructor() {
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.acc = new THREE.Vector3();
    this.mass = random(0.8, 1.4);
    this.target = new THREE.Vector3();
    this.color = new THREE.Color();
    this.innerColor = new THREE.Color(params.innerColor);
    this.white = new THREE.Color(0xffffff);

    this.angle = random(Math.PI * 2);
    this.orbitSpeed = random(0.0006, 0.0013);
    this.offset = random(-9, 14);
    this.depth = random(-20, 20);
    this.phase = random(Math.PI * 2);
    
    this.isDrifting = random() < 0.88;
    this.reach = random(0.65, 1.25);
    this.tintOffset = random(-0.1, 0.1);
    this.flowForce = new THREE.Vector3();
    this.attractionForce = new THREE.Vector3();
    this.flowPhase = 0;
    this.flowValid = false;
    this.cachedBend = 0;
    this.cachedOutward = 0;
    this.cachedDepthFlow = 0;
    this.lifespan = random();
    this.lifeReduction = random(0.0008, 0.0016);
    this.spread = 0;
    this.updateColor();
  }
  setPosition(x, y, z) {
    this.pos.set(x, y, z);
    return this;
  }
  setVelocity(x, y, z) {
    this.vel.set(x, y, z);
    return this;
  }
  followRing(step) {
    let respawned = false;
    this.angle += this.orbitSpeed * step;
    if (this.isDrifting) {
      this.lifespan -= this.lifeReduction * step;
      if (this.lifespan <= 0) {
        this.lifespan = 1;
        this.vel.set(0, 0, 0);
        respawned = true;
      }
    }
    let age = 1 - this.lifespan;
    this.spread = this.isDrifting ? Math.pow(age, 0.8) * 240 * this.reach : 0;
    let wave = Math.sin(this.angle * 3 + ringTime * 0.35) * 10
      + Math.sin(this.angle * 5 - ringTime * 0.25) * 5;
    let radius = params.ringRadius + this.offset
      + wave * (this.spread / 150) + this.spread;
    let angle = this.angle;
    this.target.set(
      Math.cos(angle) * radius,
      Math.sin(angle) * radius,
      this.depth + Math.sin(this.phase + ringTime) * (4 + this.spread * 0.15)
    );
    if (respawned) {
      this.pos.copy(this.target);
    }
  }
  flow(step) {
    this.lifespan -= this.lifeReduction * step;
    if (this.lifespan <= 0) {
      this.lifespan = 1;
      this.angle = random(Math.PI * 2);
      let radius = params.ringRadius + random(-6, 24);
      this.pos.set(Math.cos(this.angle) * radius, Math.sin(this.angle) * radius, this.depth);
      this.vel.set(0, 0, 0);
      this.acc.set(0, 0, 0);
      this.flowValid = false;
    }
    let radius = Math.max(1, Math.hypot(this.pos.x, this.pos.y));
    let nx = this.pos.x / radius;
    let ny = this.pos.y / radius;
    if (!this.flowValid || simulationFrame % FLOW_SAMPLE_INTERVAL === this.flowPhase) {
    let x = this.pos.x * 0.009 + 100;
    let y = this.pos.y * 0.009 + 100;
    let t = ringTime * 0.07;
    this.cachedBend = (noise(x, y, t) - 0.5) * 4.5
      + (noise(x * 2.3 + 20, y * 2.3, t + 40) - 0.5) * 1.2;
    this.cachedOutward = 0.23 + noise(x + 50, y + 30, t) * 0.42;
    this.cachedDepthFlow = (noise(x + 90, y, t + 15) - 0.5) * 0.55;
    this.flowValid = true;
    }
    let bend = this.cachedBend;
    let outward = this.cachedOutward;
    let innerEdge = params.ringRadius - 12;
    outward += Math.max(0, innerEdge - radius) * 0.06;
    this.flowForce.set(
      (nx * outward - ny * bend - this.vel.x) * 0.055,
      (ny * outward + nx * bend + 0.12 - this.vel.y) * 0.055,
      (this.cachedDepthFlow - this.vel.z) * 0.055
    );
    this.applyForce(this.flowForce);
    this.spread = Math.max(0, radius - params.ringRadius);
  }
  attractedTo(x, y, z) {
    let force = this.attractionForce.set(x, y, z).sub(this.pos);
    force.multiplyScalar(0.012);
    this.applyForce(force);
  }
  applyForce(f) {
    this.acc.addScaledVector(f, 1 / this.mass);
  }
  adjustVelocity(amount, step) {
    this.vel.multiplyScalar(Math.pow(1 + amount, step));
  }
  move(step) {
    this.vel.addScaledVector(this.acc, step);
    this.pos.addScaledVector(this.vel, step);
    this.acc.set(0, 0, 0);
  }
  updateColor() {
    let distance = Math.max(0, Math.hypot(this.pos.x, this.pos.y) - params.ringRadius);
    let transitionWidth = 200 + (this.tintOffset + 0.1) * 200;
    let u = Math.max(0, Math.min(1, (distance + this.tintOffset * 35) / transitionWidth));
    let mix = u * u * (3 - 2 * u);
    this.color.copy(this.innerColor).lerp(this.white, mix);
    let brightness = this.isDrifting
      ? Math.min(1, (1 - this.lifespan) / 0.08)
        * Math.min(1, this.lifespan / 0.22) * 1.15
      : 0.9;
    this.color.multiplyScalar(brightness * params.brightness);
  }
}
