class Particle {
  constructor(frame, xzDis) {
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.acc = new THREE.Vector3();

    this.baseScl = new THREE.Vector3(1, 1, 1);
    this.scl = this.baseScl.clone();
    this.mass = 1;
    //this.setMass(); // feel free to use this method; it arbitrarily defines the mass based on the scale.

    this.rot = new THREE.Vector3();
    this.rotVel = new THREE.Vector3();
    this.rotAcc = new THREE.Vector3();

    this.lifespan = 1.0;
    // this.lifeReduction = random(0.001, 0.005);
    this.lifeReduction = 0.0003;
    this.isDone = false;

    this.frame = frame;
    this.xzDis = xzDis;
    // this.ySave = this.pos.y;
    // this.zSave = this.pos.z;
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
      force.multiplyScalar(0.001);
    }
    let finalForce = new THREE.Vector3();
    finalForce.x = force.x / 2;
    finalForce.y = force.y / 2;
    finalForce.z = force.z / 2;
    this.applyForce(finalForce);
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
}