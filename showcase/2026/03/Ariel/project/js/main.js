let params = {
  fps: 0,
  // environment
  num_of_cubes: 0,
  scene_children: 0,
  newCubes: 6,
  maxCubes: 7000,
  windForce: 0.15,
  flowForce: 0.15,
  noiseFreqPosition: 0.0015,
  noiseFreqTime: 0.002,
  sineFreqPosition: 0.003,
  sineFreqTime: 0.03,
  waveForce: 0.8,
  pull: 0.004,
  friction: 0.96,
  // manual control
  wireframe: false,
  transparent: false,
  opacity: 1.0,
};

const WORLD_SIZE = 4000;
const WORLD_HALF = WORLD_SIZE / 2;

let cubes = [];

function setupThree() {
  setupGUI();

  camera.position.set(0, 250, 900);
  controls.update();

  // create cubes
  let numOfCubes = 5000;
  for (let i = 0; i < numOfCubes; i++) {
    let tCube = new Cube()
      .setPosition(random(-WORLD_HALF, WORLD_HALF), random(-40, 40), random(-WORLD_HALF, WORLD_HALF))
      .setVelocity(random(1, 4), 0, 0)
      .setRotationVelocity(random(-0.05, 0.05), random(-0.05, 0.05), random(-0.05, 0.05))
      .setScale(random(15, 45));
    cubes.push(tCube);
  }
}

function updateThree() {
  // generate cubes in real time
  if (cubes.length < params.maxCubes) {
    for (let i = 0; i < params.newCubes; i++) {
      let tCube = new Cube()
        .setPosition(random(-WORLD_HALF + 50, -WORLD_HALF + 250), random(-40, 40), random(-WORLD_HALF, WORLD_HALF))
        .setVelocity(random(1, 4), 0, 0)
        .setRotationVelocity(random(-0.05, 0.05), random(-0.05, 0.05), random(-0.05, 0.05))
        .setScale(random(15, 45));
      cubes.push(tCube);
    }
  }

  // update the cubes
  for (let c of cubes) {
    // get a vector from 3D noise (like the flow field, but at the cube's own position)
    let xFreq = c.pos.x * params.noiseFreqPosition + frame * params.noiseFreqTime;
    let yFreq = c.pos.y * params.noiseFreqPosition + frame * params.noiseFreqTime;
    let zFreq = c.pos.z * params.noiseFreqPosition + frame * params.noiseFreqTime;
    let noiseValue = map(noise(xFreq, yFreq, zFreq), 0.0, 1.0, -1.0, 1.0);

    // arbitrary angle calculation
    let force = new THREE.Vector3(
      cos(c.pos.x * params.sineFreqPosition + frame * params.sineFreqTime),
      sin(c.pos.y * params.sineFreqPosition + frame * params.sineFreqTime),
      sin(c.pos.z * params.sineFreqPosition + frame * params.sineFreqTime * 0.7)
    );
    force.normalize(); // direction
    force.multiplyScalar(noiseValue); // apply noise to direction
    force.multiplyScalar(params.flowForce);
    c.applyForce(force);

    // wind: push the cubes from the left to the right
    c.applyForce(new THREE.Vector3(params.windForce, 0, 0));

    // big waves: lift the cubes up and down; the wave moves to the right; the noise makes some waves much higher
    let lift = sin(
      c.pos.x * params.sineFreqPosition -
      frame * params.sineFreqTime +
      c.pos.z * params.sineFreqPosition * 0.3
    );
    c.applyForce(new THREE.Vector3(0, lift * (1 + noiseValue) * params.waveForce, 0));

    // pull back to the sea level (like a spring)
    c.applyForce(new THREE.Vector3(0, -c.pos.y * params.pull, 0));

    c.updatePosition();
    c.vel.multiplyScalar(params.friction);
    c.vel.clampLength(0, 30); // limit the velocity
    c.updateRotation();
    c.disappear();

    // color by height: deep blue (low) -> light blue, almost white (high)
    let t = map(c.pos.y, -300, 300, 0.0, 1.0);
    t = Math.max(0.0, Math.min(1.0, t));
    c.mesh.material.color.r = map(t, 0.0, 1.0, 0.0, 0.9);
    c.mesh.material.color.g = map(t, 0.0, 1.0, 0.2, 0.95);
    c.mesh.material.color.b = map(t, 0.0, 1.0, 0.5, 1.0);

    // access each object's mesh and update the properties
    c.mesh.material.wireframe = params.wireframe;
    c.mesh.material.transparent = params.transparent;
    c.mesh.material.opacity = params.opacity;
  }

  // remove cubes that are done
  for (let i = cubes.length - 1; i >= 0; i--) {
    let c = cubes[i];

    if (c.isDone) {
      scene.remove(c.mesh);
      c.mesh.geometry.dispose(); // free the memory too
      c.mesh.material.dispose();
      cubes.splice(i, 1);
    }
  }

  // update the GUI
  params.num_of_cubes = cubes.length;
  params.scene_children = scene.children.length;
}

function setupGUI() {
  pane.addBinding(params, "num_of_cubes", {
    step: 1,
  });
  pane.addBinding(params, "scene_children", {
    step: 1,
  });

  const folderNumber = pane.addFolder({ title: "NUMBER", expanded: true });
  folderNumber.addBinding(params, "newCubes", { min: 0, max: 50, step: 1 });
  folderNumber.addBinding(params, "maxCubes", { min: 0, max: 10000, step: 1 });

  const folderWave = pane.addFolder({ title: "WAVE", expanded: true });
  folderWave.addBinding(params, "waveForce", { min: 0, max: 3, step: 0.01 });
  folderWave.addBinding(params, "sineFreqPosition", { min: 0.0005, max: 0.01, step: 0.0001 });
  folderWave.addBinding(params, "sineFreqTime", { min: 0, max: 0.1, step: 0.001 });
  folderWave.addBinding(params, "pull", { min: 0.001, max: 0.02, step: 0.001 });
  folderWave.addBinding(params, "friction", { min: 0.8, max: 0.99, step: 0.01 });

  const folderFlow = pane.addFolder({ title: "FLOW", expanded: true });
  folderFlow.addBinding(params, "windForce", { min: 0, max: 1, step: 0.01 });
  folderFlow.addBinding(params, "flowForce", { min: 0, max: 2, step: 0.01 });

  const folderControl = pane.addFolder({ title: "CONTROL", expanded: false });
  folderControl.addBinding(params, "wireframe");
  folderControl.addBinding(params, "transparent");
  folderControl.addBinding(params, "opacity", { min: 0.0, max: 1.0, step: 0.01 });
}

function getBox() {
  let geometry = new THREE.BoxGeometry(1, 1, 1);
  let material = new THREE.MeshBasicMaterial({
    // wireframe: true
  });
  let mesh = new THREE.Mesh(geometry, material);
  return mesh;
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
  updateScale() {
    this.scale.set(
      this.baseScale.x * this.lifespan,
      this.baseScale.y * this.lifespan,
      this.baseScale.z * this.lifespan
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
  disappear() {
    if (
      this.pos.x < -WORLD_HALF ||
      this.pos.x > WORLD_HALF ||
      this.pos.y < -WORLD_HALF ||
      this.pos.y > WORLD_HALF ||
      this.pos.z < -WORLD_HALF ||
      this.pos.z > WORLD_HALF
    ) {
      this.isDone = true;
    }
  }
}