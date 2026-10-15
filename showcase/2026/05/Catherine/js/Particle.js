class Particle {
  constructor() {
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.acc = new THREE.Vector3();

    this.lifespan = 1.0;
    this.lifeReduction = random(0.01, 0.02);
    this.isDone = false;

    this.type = "heart";
    this.home = new THREE.Vector3();
    this.target = new THREE.Vector3();
    this.color = new THREE.Color();
  }
  setPosition(x, y, z) {
    this.pos = new THREE.Vector3(x, y, z);
    return this;
  }
  setVelocity(x, y, z) {
    this.vel = new THREE.Vector3(x, y, z);
    return this;
  }
  setType(type) {
    this.type = type;
    return this;
  }
  setHome(x, y, z) {
    this.home = new THREE.Vector3(x, y, z);
    return this;
  }
  setTarget(x, y, z) {
    this.target = new THREE.Vector3(x, y, z);
    return this;
  }
  setColor(color) {
    this.color = color.clone();
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
  applyForce(f) {
    this.acc.add(f);
  }
  seek(strength) {
    let force = this.target.clone().sub(this.pos);
    force.multiplyScalar(strength);
    this.applyForce(force);
  }
  updateLifespan() {
    this.lifespan -= this.lifeReduction;
    if (this.lifespan <= 0) {
      this.lifespan = 0;
      this.isDone = true;
    }
  }
}
