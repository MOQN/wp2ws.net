class Raindrop { 
  constructor() {
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.acc = new THREE.Vector3();

    this.baseScl = new THREE.Vector3(0.08, 0.35, 0.08);
    this.scl = this.baseScl.clone();
    this.mass = 1;

    this.rot = new THREE.Vector3();
    this.rotVel = new THREE.Vector3();
    this.rotAcc = new THREE.Vector3();

    this.lifespan = 1.0;
    this.lifeReduction = random() * (0.005 - 0.001) + 0.001;
    this.isDone = false;

    const geometry = new THREE.SphereGeometry(1, 12, 8);
    const material = new THREE.MeshStandardMaterial({
      color: 0x3399ff,
      roughness: 0.25,
      metalness: 0.1,
    });
    this.mesh = new THREE.Mesh(geometry, material);
  }

  setPosition(x, y, z) {
    this.pos.set(x, y, z);
    this.syncMesh();
    return this;
  }

  setVelocity(x, y, z) {
    this.vel.set(x, y, z);
    return this;
  }

  setRotationAngle(x, y, z) {
    this.rot.set(x, y, z);
    this.syncMesh(); 
    return this;
  }

  setRotationVelocity(x, y, z) {
    this.rotVel.set(x, y, z); 
    return this;
  }

  setScale(w, h = w, d = w) {
    const minScale = 0.01;
    this.baseScl.set(
      Math.max(w, minScale),
      Math.max(h, minScale),
      Math.max(d, minScale)
    );
    this.scl.copy(this.baseScl);
    this.syncMesh();
    return this;
  }

  setMass(mass) {
    if (mass) {
      this.mass = mass;
    } else {
      this.mass =
        1 +
        this.baseScl.x *
          this.baseScl.y *
          this.baseScl.z *
          0.000001;
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
    const force = f.clone();

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
    const target = new THREE.Vector3(x, y, z);
    const force = target.clone().sub(this.pos);

    if (force.length() < 100) {
      force.multiplyScalar(-0.005);
    } else {
      force.multiplyScalar(0.0001);
    }

    this.applyForce(force);
  }

  flow() {
    const xFreq = this.pos.x * 0.05 + frame * 0.005;
    const yFreq = this.pos.y * 0.05 + frame * 0.005;
    const zFreq = this.pos.z * 0.05 + frame * 0.005;
    const noiseValue = map(
      noise(xFreq, yFreq, zFreq),
      0.0,
      1.0,
      -1.0,
      1.0
    );

    const force = new THREE.Vector3(
      Math.cos(frame * 0.005),
      Math.sin(frame * 0.005),
      Math.sin(frame * 0.002)
    );

    force.normalize();
    force.multiplyScalar(noiseValue * 0.01);
    this.applyForce(force);
  }

  syncMesh() {
    this.mesh.position.copy(this.pos);
    this.mesh.rotation.set(this.rot.x, this.rot.y, this.rot.z);
    this.mesh.scale.copy(this.scl);
  }

  update() {
    this.updatePosition();
    this.updateRotation();
    this.updateLifespan();
    this.updateScale();
    this.syncMesh();
  }
}