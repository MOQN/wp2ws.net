let params = {
  fps: 0,
};

let system1;
let system2;
let system3;
let system4;

const WORLD_SIZE = 2000;
const WORLD_HALF = WORLD_SIZE / 2;
const MAX_PARTICLE_NUMBER = 10000;

let attractors = [];

const ATTRACT_DISTANCE = 1000000;
const REVERSE_DISTANCE = 50;
const ATTRACTION_STRENGTH = 0.008;


let particles = [];
let pointCloud;


function setupThree() {
  system1 = createSystem(1, random(-WORLD_HALF, WORLD_HALF), WORLD_HALF, 0x9da778);
  system2 = createSystem(1, random(-WORLD_HALF, WORLD_HALF), -WORLD_HALF, 0x74a195);
  system3 = createSystem(0, WORLD_HALF, random(-WORLD_HALF, WORLD_HALF), 0xF7C97F);
  system4 = createSystem(0, -WORLD_HALF, random(-WORLD_HALF, WORLD_HALF), 0xE87425);
}


function updateThree() {
  updateSystem(system1);

  updateSystem(system2);
  updateSystem(system3);
  updateSystem(system4);
}
function updateSystem(system) {

  let attractors = system.attractors;
  let particles = system.particles;
  let pointCloud = system.pointCloud;

  for (let i = 0; i < particles.length; i++) {

    let p = particles[i];

    let target = p.targetAttractor;

    let distance = p.pos.distanceTo(target.pos);

    if (distance < REVERSE_DISTANCE) {

      p.isRepelled = true;

    }

    if (p.isRepelled && distance >= REVERSE_DISTANCE) {

      let newTarget = target;

      while (newTarget === target) {

        newTarget = attractors[
          floor(random(0, attractors.length))
        ];

      }

      p.targetAttractor = newTarget;
      p.isRepelled = false;

      target = newTarget;

    }

    p.attractedTo(
      target.pos.x,
      target.pos.y,
      target.pos.z
    );

    p.updatePosition();

  }

  // Update this system's particle positions

  let positionArray =
    pointCloud.geometry.attributes.position.array;

  for (let i = 0; i < particles.length; i++) {

    let p = particles[i];

    let ptIndex = i * 3;

    positionArray[ptIndex] = p.pos.x;
    positionArray[ptIndex + 1] = p.pos.y;
    positionArray[ptIndex + 2] = p.pos.z;

  }

  pointCloud.geometry.attributes.position.needsUpdate = true;

}
function createSystem(vertical, posX, posY, color) {

  let attractors = [];
  let particles = [];
  let pointCloud;

  // Create three attractors

  for (let i = 0; i < 3; i++) {

    let x = random(-WORLD_HALF, WORLD_HALF)
    let y = random(-WORLD_HALF, WORLD_HALF)
    let z = random(-WORLD_HALF, WORLD_HALF)

    let attractor = new Attractor(x, y, z);

    attractors.push(attractor);

  }

  // Create particles

  for (let i = 0; i < MAX_PARTICLE_NUMBER; i++) {

    let p = new Particle();
    if (vertical == 1) {
      p.pos.x = random(-WORLD_HALF, WORLD_HALF)
      p.pos.y = posY;
    } else {
      p.pos.x = posX
      p.pos.y = random(-WORLD_HALF, WORLD_HALF)
    }


    p.pos.z = random(-WORLD_HALF, WORLD_HALF)

    p.radius = random(400, 500);
    p.angle = random(0, TWO_PI);
    p.rotationSpeed = random(0.005, 0.02);

    // Choose one target from this system

    p.targetAttractor = attractors[
      floor(random(0, attractors.length))
    ];

    particles.push(p);

  }

  pointCloud = getPoints(particles);
  pointCloud.material.color.set(color);


  scene.add(pointCloud);

  return {
    attractors: attractors,
    particles: particles,
    pointCloud: pointCloud
  };

}
function getPoints(objects) {
  const vertices = new Float32Array(objects.length * 3);


  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));


  const material = new THREE.PointsMaterial({ color: 0xFFFFFF });


  const points = new THREE.Points(geometry, material);


  return points;
}
function getSphere() {
  const geometry = new THREE.SphereGeometry(1, 32, 16);
  const material = new THREE.MeshBasicMaterial({ color: 0xFF0000 });
  const mesh = new THREE.Mesh(geometry, material);
  return mesh;
}



///// CLASS /////
class Attractor {

  constructor(x, y, z) {

    this.mesh = getSphere();

    this.mesh.scale.set(15, 15, 15);

    this.pos = this.mesh.position;

    this.pos.set(x, y, z);

    // scene.add(this.mesh);

  }

}

class Particle {
  constructor() {
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
    this.lifeReduction = random(0.001, 0.005);
    this.isDone = false;

    this.targetAttractor = null;
    this.isRepelled = false;
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
    // x
    if (this.pos.x > WORLD_HALF) {
      this.pos.x = -WORLD_HALF;
    }
    else if (this.pos.x < -WORLD_HALF) {
      this.pos.x = WORLD_HALF;
    }
    // y
    if (this.pos.y > WORLD_HALF) {
      this.pos.y = -WORLD_HALF;
    }
    else if (this.pos.y < -WORLD_HALF) {
      this.pos.y = WORLD_HALF;
    }
    // z
    if (this.pos.z > WORLD_HALF) {
      this.pos.z = -WORLD_HALF;
    }
    else if (this.pos.z < -WORLD_HALF) {
      this.pos.z = WORLD_HALF;
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

    let distance = force.length();

    // Only apply attraction within distance a

    if (distance < ATTRACT_DISTANCE) {

      // Reverse x force within distance b

      if (distance < REVERSE_DISTANCE) {

        force.x *= -1;

      }

      force.normalize();

      force.multiplyScalar(ATTRACTION_STRENGTH);

      this.applyForce(force);

    }

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
