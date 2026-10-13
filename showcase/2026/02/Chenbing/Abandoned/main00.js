let cubes = []
let boundary = {
  minX: -1000,
  maxX: 1000,
  minY: -1000,
  maxY: 1000,
  minZ: -1000,
  maxZ: 1000,
};
let cube_GRAVITY = 10

function setupThree() {
}

function updateThree() {
  for (let i = 0; i < 1; i++) {
    let c = new Cube()
      .setPosition(random(boundary.minX, boundary.maxX), random(boundary.minY, boundary.maxY), random(boundary.minZ, boundary.maxZ))
      .setScale(random(5,50))
      .setVelocity(random(-10, 10), random(-10, 10), random(-10, 10))
    cubes.push(c);
  }
  for (let c of cubes) {
    c.move();
    c.repelledFrom(cubes);
    c.update();
    c.updateLifespan();
    c.checkBoundaries();
  }
  for (let i = cubes.length - 1; i >= 0; i--) {
    let c = cubes[i];
    if (c.isDone) {
      c.destroy(); // ***
      cubes.splice(i, 1);
    }
  }
  while (cubes.length > 300) {
    cubes[0].destroy(); 
    cubes.splice(0, 1);
  }
}

function getBox() {
  let geometry = new THREE.BoxGeometry(1, 1, 1);
  let material = new THREE.MeshBasicMaterial({
    color: '#d2d2d2',
    transparent: true,
    opacity: 1
    // wireframe: true,
  });
  let mesh = new THREE.Mesh(geometry, material);

  return mesh;
}

class Cube {
  constructor() {
    this.pos = createVector();
    this.vel = createVector();
    this.acc = createVector();

    this.scale = createVector();
    this.mesh = getBox();

    this.lifespan = 1.0;
    this.lifeReduction = 0.001;
    this.isDone = false;

    scene.add(this.mesh);
  }
  setPosition(x, y, z) {
    this.pos = createVector(x, y, z);
    return this;
  }
  setScale(w, h = w, d = w) {
    const minScale = 0.01;
    if (w < minScale) w = minScale;
    if (h < minScale) h = minScale;
    if (d < minScale) d = minScale;
    this.scl = createVector(w, h, d);
    return this;
  }
  setVelocity(x, y, z) {
    this.vel = createVector(x, y, z);
    return this;
  }
  move() {
    this.vel.add(this.acc);
    this.pos.add(this.vel);
    this.acc.mult(0);
  }
  applyForce(f) {
    let force = f.copy();
    if (this.mass > 0) {
      force.div(this.mass);
    }
    this.acc.add(force);
  }
  updateLifespan() {
    if (this.lifespan > 0) {
      this.lifespan -= this.lifeReduction;
    } else {
      this.lifespan = 0;
      this.isDone = true;
    }
  }
  repelledFrom(others) {
    for (let i = 0; i < others.length; i++) {
      let other = others[i];

      if (this != other) {
        let force = p5.Vector.sub(other.pos, this.pos);
        let distance = force.mag();
        distance = max(distance, this.scale.x + other.scale.x);
        force.normalize();
        force.mult(-1);

        let magnitude =
          (cube_GRAVITY) / (distance * distance);
        force.mult(magnitude);
        this.applyForce(force);
      }
    }
  }
  checkBoundaries() {
    if (this.pos.x < boundary.minX) {
      this.pos.x = boundary.minX;
      this.vel.x *= -1;
    }
    if (this.pos.x > boundary.maxX) {
      this.pos.x = boundary.maxX;
      this.vel.x *= -1;
    }
    if (this.pos.y < boundary.minY) {
      this.pos.y = boundary.minY;
      this.vel.y *= -1;
    }
    if (this.pos.y > boundary.maxY) {
      this.pos.y = boundary.maxY;
      this.vel.y *= -1;
    }
    if (this.pos.z < boundary.minZ) {
      this.pos.z = boundary.minZ;
      this.vel.z *= -1;
    }
    if (this.pos.z > boundary.maxZ) {
      this.pos.z = boundary.maxZ;
      this.vel.z *= -1;
    }
  }
  update() {
    this.mesh.position.set(this.pos.x, this.pos.y, this.pos.z);
    this.mesh.scale.set(this.scl.x, this.scl.y, this.scl.z);
    this.mesh.material.opacity = this.lifespan;
  }
  destroy() {
    scene.remove(this.mesh);
  }
}