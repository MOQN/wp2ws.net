const color1 = new THREE.Color('hsl(0, 0%, 73%)');
const color2 = new THREE.Color('hsl(145, 48%, 61%)');

let b = {
  minX: -1000,
  maxX: 1000,
  minY: -1000,
  maxY: 1000,
  minZ: -1000,
  maxZ: 1000,
};

let cubes = [];
let cube_GRAVITY = 10;

function setupThree() {
  // const axesHelper = new THREE.AxesHelper(1000);
  // scene.add(axesHelper);
  // scene.background = new THREE.Color('#fdfdfd');

  for (let p = b.minX; p <= b.maxX; p += 200) {
    for (let q = b.minZ; q <= b.maxZ; q += 200) {
      let c = new Cube()
        .setTranslation(0, 0, 0)
        .setPosition(p, random(b.minY, b.maxY), q)
        .setScale(random(20, 180), random(100, 500))
      cubes.push(c);
    }
  }
}

function updateThree() {
  for (let c of cubes) {
    c.update();
    c.move();

    let gravity = createVector(0, random(-5, -1), 0)
    gravity.mult(0.01);
    c.applyForce(gravity);

    c.checkBoundaries();
  }
}

function getGlass() {
  let glassGeometry = new THREE.BoxGeometry(1, 1, 1);
  const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: '#ffffff',
    transmission: 0.95,
    opacity: 1.0,
    transparent: true,

    roughness: 0.35,
    metalness: 0.0,

    ior: 1.5,
    thickness: 1.2,

    clearcoat: 1.0,
    clearcoatRoughness: 0.1,
  });
  let glassMesh = new THREE.Mesh(glassGeometry, glassMaterial.clone());
  return glassMesh;
}

function getInside() {
  let insideGeometry = new THREE.SphereGeometry(0.3, 32, 16);
  const insideMaterial = new THREE.MeshBasicMaterial({
    color: '#3af5ff',
  });
  let insideMesh = new THREE.Mesh(insideGeometry, insideMaterial.clone());
  return insideMesh;
}

class Cube {
  constructor() {
    this.pos = createVector();
    this.vel = createVector();
    this.acc = createVector();
    this.offset = createVector(0, 0, 0);

    this.rot = createVector();
    this.rotVel = createVector();
    this.rotAcc = createVector();

    this.scl = createVector(1, 1, 1);
    this.glassMesh = getGlass();
    this.insideMesh = getInside();

    this.mass = 1;

    scene.add(this.glassMesh);
    scene.add(this.insideMesh);
  }

  setTranslation(x, y, z) {
    this.offset = createVector(x, y, z);
    return this;
  }

  setPosition(x, y, z) {
    this.pos = createVector(x, y, z);
    return this;
  }

  setScale(w, h, d = w) {
    const minScale = 0.01;
    if (w < minScale) w = minScale;
    if (h < minScale) h = minScale;
    if (d < minScale) d = minScale;
    this.scl = createVector(w, h, d);
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

  checkBoundaries() {
    if (this.pos.y < b.minY) {
      this.pos.y = b.minY;
      this.vel.y *= -1;
    }
    if (this.pos.y > b.maxY) {
      this.pos.y = b.maxY;
      this.vel.y *= -1;
    }
  }

  update() {
    this.insideMesh.position.set(this.pos.x + this.offset.x, this.pos.y + this.offset.y, this.pos.z + this.offset.z);
    this.glassMesh.position.set(this.pos.x + this.offset.x, this.pos.y + this.offset.y, this.pos.z + this.offset.z);

    this.insideMesh.scale.set(this.scl.x, this.scl.x, this.scl.x);
    this.glassMesh.scale.set(this.scl.x, this.scl.y, this.scl.z);

    let c = map(abs(this.pos.x) + abs(this.pos.z), 0, b.maxX + b.maxY, 0, 1, true);
    this.insideMesh.material.color.lerpColors(color1, color2, c);
  }
}