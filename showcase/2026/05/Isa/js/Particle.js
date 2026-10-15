class Particle {
  constructor() {
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.acc = new THREE.Vector3();

    this.mass = 1;

    // --- grid / layer behaviour ---
    this.gx = 0;         // home position on the grid (the "order")
    this.gy = 0;
    this.layer = 1;      // +1 = red layer, -1 = blue layer
    this.tint = 0;       // 0 = visible mark, 1 = cleared to white (eased)
    this.rnd = random(); // fixed per particle: decides which marks survive in cleared zones
  }

  setPosition(x, y, z) { this.pos.set(x, y, z); return this; }
  setVelocity(x, y, z) { this.vel.set(x, y, z); return this; }
  setHome(gx, gy, layer) {
    this.gx = gx;
    this.gy = gy;
    this.layer = layer;
    return this;
  }

  // spring toward a target (allocation-free)
  seek(tx, ty, k) {
    this.acc.x += (tx - this.pos.x) * k;
    this.acc.y += (ty - this.pos.y) * k;
  }
  damp(amount) {
    this.vel.multiplyScalar(amount);
  }
  updatePosition() {
    this.vel.add(this.acc);
    this.pos.add(this.vel);
    this.acc.set(0, 0, 0);
  }
}
