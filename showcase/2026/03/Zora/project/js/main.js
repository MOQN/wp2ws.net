let params = {
  fps: 0,
  num_of_Torus_in_a_row: 0,
  num_of_row: 0,
  velocity: 1,
  color: "#FFFFFF",
  opacity: 0.2,
};

const WORLD_SIZE = 2000;
const WORLD_HALF = WORLD_SIZE / 2;
const Torus_NUM = 80
const Torus_ROW = 4

let cubes = [];
let toruses = []

function setupThree() {
  const folderGeneration = pane.addFolder({ title: "GENERATION", expanded: true });
  folderGeneration.addBinding(params, "velocity", { min: 0.1, max: 8, step: 0.1 });
  const folderControl = pane.addFolder({ title: "CONTROL", expanded: true });
  folderControl.addBinding(params, "color", { picker: "inline" });
  folderControl.addBinding(params, "opacity", { min: 0.0, max: 1.0, step: 0.01 });
  // for (let i = 0; i < 80; i++) {
  //   let tCube = new Cube()
  //     .setPosition(-WORLD_HALF + i * 30, 0, 0)
  //     .setScale(10, 400, 10)
  //     .setRotationAngle(sin(i * 0.01) * 10, 0, 0)
  //     .setRotationVelocity(0.01, 0, 0)
  //     ;

  //   cubes.push(tCube);
  // }
  for (let q = 0; q < Torus_ROW; q++) {
    for (let j = 0; j < Torus_ROW; j++) {
      for (let i = 0; i < Torus_NUM; i++) {
        let torus = new Torus()
          .setPosition(
            -WORLD_HALF + i * WORLD_SIZE / Torus_NUM,
            -WORLD_HALF + j * WORLD_SIZE / Torus_ROW + noise(i * 0.1) * 500 - 500,
            -WORLD_HALF + q * WORLD_SIZE / Torus_ROW)
          .setScale(20, 20, 20)
          .setRotationAngle(-sin(i * 0.01) * 10, Math.PI / 4, 0)
          .setRotationVelocity(0.01, 0, 0)
          .setVelocity(params.velocity, 0, 0);

        toruses.push(torus);
      }
    }
  }
}

function updateThree() {
  // for (let i = 0; i < 80; i++) {
  //   let c = cubes[i]
  //   // c.updatePosition();
  //   c.updateRotation();
  //   c.updateScale(i)
  //   // or, c.update();  // if you want to update all properties
  // }

  for (let i = 0; i < toruses.length; i++) {
    let t = toruses[i]
    t.mesh.material.color.set(params.color);
    t.mesh.material.opacity = params.opacity;
    t.vel.x = params.velocity;
    t.updatePosition();
    // t.updateRotation();

    t.updateScale(i);
    t.reappear()
    // or, c.update();  // if you want to update all properties
  }

}

function getBox() {
  let geometry = new THREE.BoxGeometry(1, 1, 1);
  let material = new THREE.MeshNormalMaterial({
    // wireframe: true
  });
  let mesh = new THREE.Mesh(geometry, material);
  return mesh;
}
function getTorus() {
  let geometry = new THREE.TorusGeometry(10, 0.2, 30, 8);
  let material = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0.3,
  });
  const mesh = new THREE.Mesh(geometry, material);
  return mesh;
}
class Torus {
  constructor() {
    // mesh
    this.mesh = getTorus();
    scene.add(this.mesh);
    // position
    this.pos = this.mesh.position; // reference to the mesh position
    this.vel = new THREE.Vector3();
    this.acc = new THREE.Vector3();
    // rotation
    this.rot = this.mesh.rotation; // reference to the mesh rotation
    this.rotVel = new THREE.Vector3();
    this.rotAcc = new THREE.Vector3();
    // scale
    this.scale = this.mesh.scale; // reference to the mesh scale
    this.baseScale = new THREE.Vector3(1, 1, 1); // initial base scale for the torus
    this.scale.copy(this.baseScale);
    // mass
    this.mass = 1;
    // lifespan
    this.lifespan = 1;
    this.lifeReduction = random(0.001, 0.01);
    this.isDone = false;
  }
  setPosition(x, y, z) {
    this.pos.set(x, y, z);
    return this;
  }
  setTranslation(x, y, z) {
    this.mesh.geometry.translate(x, y, z);
    return this;
  }
  setVelocity(x, y, z) {
    this.vel.set(x, y, z);
    return this;
  }
  setRotationAngle(x, y, z) {
    this.rot.set(x, y, z);
    return this;
  }
  setRotationVelocity(x, y, z) {
    this.rotVel.set(x, y, z);
    return this;
  }
  setScale(w, h = w, d = w) {
    const minScale = 0.01;
    w = Math.max(w, minScale);
    h = Math.max(h, minScale);
    d = Math.max(d, minScale);
    this.baseScale.set(w, h, d);
    this.scale.set(w, h, d);
    return this;
  }
  setMass(mass) {
    if (mass !== undefined) {
      this.mass = mass;
    }
    else {
      this.mass =
        1 +
        this.baseScale.x *
        this.baseScale.y *
        this.baseScale.z *
        0.000001;
    }
    return this;
  }
  applyForce(f) {
    if (this.mass <= 0) return;
    const force = f.clone();
    force.divideScalar(this.mass);
    this.acc.add(force);
  }
  update(i) {
    this.updateLifespan();
    this.updatePosition();
    this.updateRotation();
    this.updateScale(i);
  }
  updatePosition() {
    this.vel.add(this.acc);
    this.pos.add(this.vel);
    this.acc.set(0, 0, 0);
  }
  updateRotation() {
    this.rotVel.add(this.rotAcc);
    this.rot.x += this.rotVel.x;
    this.rot.y += this.rotVel.y;
    this.rot.z += this.rotVel.z;
    this.rotAcc.set(0, 0, 0);
  }
  updateScale(i = 0) {
    this.scale.set(
      this.baseScale.x * sin((frame) * 0.008 + i * 0.05),
      this.baseScale.y * sin((frame) * 0.008 + i * 0.05),
      this.baseScale.z * sin((frame) * 0.008 + i * 0.05)
    );
  }
  updateLifespan() {
    this.lifespan -= this.lifeReduction;
    if (this.lifespan <= 0) {
      this.lifespan = 0;
      this.isDone = true;
    }
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
    // if (this.pos.y > WORLD_HALF) {
    //   this.pos.y = -WORLD_HALF;
    // }
    // else if (this.pos.y < -WORLD_HALF) {
    //   this.pos.y = WORLD_HALF;
    // }
    // z
    if (this.pos.z > WORLD_HALF) {
      this.pos.z = -WORLD_HALF;
    }
    else if (this.pos.z < -WORLD_HALF) {
      this.pos.z = WORLD_HALF;
    }
  }
  bounce() {
    // x
    if (this.pos.x > WORLD_HALF) {
      this.pos.x = WORLD_HALF;
      this.vel.x *= -1;
    }
    else if (this.pos.x < -WORLD_HALF) {
      this.pos.x = -WORLD_HALF;
      this.vel.x *= -1;
    }
    // y
    if (this.pos.y > WORLD_HALF) {
      this.pos.y = WORLD_HALF;
      this.vel.y *= -1;
    }
    else if (this.pos.y < -WORLD_HALF) {
      this.pos.y = -WORLD_HALF;
      this.vel.y *= -1;
    }
    // z
    if (this.pos.z > WORLD_HALF) {
      this.pos.z = WORLD_HALF;
      this.vel.z *= -1;
    }
    else if (this.pos.z < -WORLD_HALF) {
      this.pos.z = -WORLD_HALF;
      this.vel.z *= -1;
    }
  }
}
class Cube {
  constructor() {
    // mesh
    this.mesh = getBox();
    scene.add(this.mesh);
    // position
    this.pos = this.mesh.position; // reference to the mesh position
    this.vel = new THREE.Vector3();
    this.acc = new THREE.Vector3();
    // rotation
    this.rot = this.mesh.rotation; // reference to the mesh rotation
    this.rotVel = new THREE.Vector3();
    this.rotAcc = new THREE.Vector3();
    // scale
    this.scale = this.mesh.scale; // reference to the mesh scale
    this.baseScale = new THREE.Vector3(10, 10, 10); // initial base scale for the cube
    this.scale.copy(this.baseScale);
    // mass
    this.mass = 1;
    // lifespan
    this.lifespan = 1;
    this.lifeReduction = random(0.001, 0.01);
    this.isDone = false;
  }
  setPosition(x, y, z) {
    this.pos.set(x, y, z);
    return this;
  }
  setTranslation(x, y, z) {
    this.mesh.geometry.translate(x, y, z);
    return this;
  }
  setVelocity(x, y, z) {
    this.vel.set(x, y, z);
    return this;
  }
  setRotationAngle(x, y, z) {
    this.rot.set(x, y, z);
    return this;
  }
  setRotationVelocity(x, y, z) {
    this.rotVel.set(x, y, z);
    return this;
  }
  setScale(w, h = w, d = w) {
    const minScale = 0.01;
    w = Math.max(w, minScale);
    h = Math.max(h, minScale);
    d = Math.max(d, minScale);
    this.baseScale.set(w, h, d);
    this.scale.set(w, h, d);
    return this;
  }
  setMass(mass) {
    if (mass !== undefined) {
      this.mass = mass;
    }
    else {
      this.mass =
        1 +
        this.baseScale.x *
        this.baseScale.y *
        this.baseScale.z *
        0.000001;
    }
    return this;
  }
  applyForce(f) {
    if (this.mass <= 0) return;
    const force = f.clone();
    force.divideScalar(this.mass);
    this.acc.add(force);
  }
  update() {
    this.updateLifespan();
    this.updatePosition();
    this.updateRotation();
    this.updateScale();
  }
  updatePosition() {
    this.vel.add(this.acc);
    this.pos.add(this.vel);
    this.acc.set(0, 0, 0); // or, this.acc.multiplyScalar(0);
  }
  updateRotation() {
    // vector addition for rotation velocity
    this.rotVel.add(this.rotAcc);
    // rotation is by Euler angles, not a vector, so update each component individually
    this.rot.x += this.rotVel.x;
    this.rot.y += this.rotVel.y;
    this.rot.z += this.rotVel.z;
    // reset rotation acceleration
    this.rotAcc.set(0, 0, 0);
  }
  updateScale(i) {
    this.scale.set(
      this.baseScale.x,
      this.baseScale.y * sin((frame + i) * 0.02),
      this.baseScale.z
    );
  }
  updateLifespan() {
    this.lifespan -= this.lifeReduction;
    if (this.lifespan <= 0) {
      this.lifespan = 0;
      this.isDone = true;
    }
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
  bounce() {
    // x
    if (this.pos.x > WORLD_HALF) {
      this.pos.x = WORLD_HALF;
      this.vel.x *= -1;
    }
    else if (this.pos.x < -WORLD_HALF) {
      this.pos.x = -WORLD_HALF;
      this.vel.x *= -1;
    }
    // y
    if (this.pos.y > WORLD_HALF) {
      this.pos.y = WORLD_HALF;
      this.vel.y *= -1;
    }
    else if (this.pos.y < -WORLD_HALF) {
      this.pos.y = -WORLD_HALF;
      this.vel.y *= -1;
    }
    // z
    if (this.pos.z > WORLD_HALF) {
      this.pos.z = WORLD_HALF;
      this.vel.z *= -1;
    }
    else if (this.pos.z < -WORLD_HALF) {
      this.pos.z = -WORLD_HALF;
      this.vel.z *= -1;
    }
  }
}