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

    this.type = "petal";
    this.index = 0;
    this.u = 0;
    this.v = 0;
    this.offset = new THREE.Vector3(random(-1, 1), random(-1, 1), random(-1, 1));
    this.scatter = new THREE.Vector3(random(-1, 1), random(-1, 1), random(-1, 1));
    this.scatter.normalize();
    this.scatter.multiplyScalar(random(0, 1));
    this.strength = random(0.04, 0.08);
    this.brightness = random(0.6, 1.0);
    this.glow = 0;
    this.color = { r: 1, g: 1, b: 1 };
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
      this.mass = 1 + (this.baseScl.x * this.baseScl.y * this.baseScl.z) * 0.000001;
    }
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
    let xFreq = this.pos.x * 0.05 + frame * 0.005;
    let yFreq = this.pos.y * 0.05 + frame * 0.005;
    let zFreq = this.pos.z * 0.05 + frame * 0.005;
    let noiseValue = map(noise(xFreq, yFreq, zFreq), 0.0, 1.0, -1.0, 1.0);
    let force = new THREE.Vector3(cos(frame * 0.005), sin(frame * 0.005), sin(frame * 0.002));
    force.normalize();
    force.multiplyScalar(noiseValue * 0.01);
    this.applyForce(force);
  }
  setType(type, index) {
    this.type = type;
    this.index = index;
    return this;
  }
  setColor(r, g, b) {
    this.color.r = r;
    this.color.g = g;
    this.color.b = b;
    return this;
  }
  shake(amount, t) {
    let fx = map(noise(this.pos.x * 0.006, this.pos.y * 0.006, t), 0.0, 1.0, -1.0, 1.0);
    let fy = map(noise(this.pos.y * 0.006, this.pos.z * 0.006, t + 100), 0.0, 1.0, -1.0, 1.0);
    let fz = map(noise(this.pos.z * 0.006, this.pos.x * 0.006, t + 200), 0.0, 1.0, -1.0, 1.0);
    let force = new THREE.Vector3(fx, fy, fz);
    force.multiplyScalar(amount);
    this.applyForce(force);
  }
  moveToward(x, y, z) {
    let target = new THREE.Vector3(x, y, z);
    let force = target.clone().sub(this.pos);
    force.multiplyScalar(this.strength);
    this.applyForce(force);
    this.adjustVelocity(-0.25);
  }
}
